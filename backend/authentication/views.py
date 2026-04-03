from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import login, logout
from django.utils import timezone
from django.db import transaction
from .models import User, UserWallet, UserSession
from .serializers import (
    UserRegistrationSerializer, UserLoginSerializer, UserProfileSerializer,
    UserUpdateSerializer, KeyGenerationSerializer, UsernameGenerationSerializer,
    UserSessionSerializer
)
import logging

logger = logging.getLogger(__name__)


class UserRegistrationView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            user = serializer.save()
            
            # Create session
            self.create_user_session(request, user)
            
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            
            logger.info(f"New user registered: {user.username}")
            
            return Response({
                'user': UserProfileSerializer(user).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
            }, status=status.HTTP_201_CREATED)
    
    def create_user_session(self, request, user):
        """Create user session for tracking"""
        ip_address = self.get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        UserSession.objects.create(
            user=user,
            session_key=request.session.session_key or '',
            ip_address=ip_address,
            user_agent=user_agent
        )
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class UserLoginView(generics.GenericAPIView):
    serializer_class = UserLoginSerializer
    permission_classes = [permissions.AllowAny]
    
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.validated_data['user']
        
        # Create/update session
        self.create_or_update_session(request, user)
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        logger.info(f"User logged in: {user.username}")
        
        return Response({
            'user': UserProfileSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        })
    
    def create_or_update_session(self, request, user):
        """Create or update user session"""
        ip_address = self.get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        # Deactivate old sessions for this user
        UserSession.objects.filter(user=user, is_active=True).update(is_active=False)
        
        # Create new session
        UserSession.objects.create(
            user=user,
            session_key=request.session.session_key or '',
            ip_address=ip_address,
            user_agent=user_agent
        )
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        return self.request.user
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return UserUpdateSerializer
        return UserProfileSerializer


class UserLogoutView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            
            # Deactivate user sessions
            UserSession.objects.filter(
                user=request.user, 
                is_active=True
            ).update(is_active=False)
            
            logger.info(f"User logged out: {request.user.username}")
            
            return Response({'message': 'Successfully logged out'}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Logout error: {str(e)}")
            return Response({'error': 'Logout failed'}, status=status.HTTP_400_BAD_REQUEST)


class KeyGenerationView(generics.GenericAPIView):
    serializer_class = KeyGenerationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer()
        keys = serializer.create({})
        
        logger.info(f"Keys generated for user: {request.user.username}")
        
        return Response(keys, status=status.HTTP_200_OK)


class UsernameGenerationView(generics.GenericAPIView):
    serializer_class = UsernameGenerationSerializer
    permission_classes = [permissions.AllowAny]
    
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer()
        username = serializer.create({})
        
        return Response(username, status=status.HTTP_200_OK)


class UserSessionListView(generics.ListAPIView):
    serializer_class = UserSessionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return UserSession.objects.filter(
            user=self.request.user,
            is_active=True
        ).order_by('-last_activity')


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def revoke_session(request, session_key):
    """Revoke a specific session"""
    try:
        session = UserSession.objects.get(
            user=request.user,
            session_key=session_key,
            is_active=True
        )
        session.is_active = False
        session.save()
        
        logger.info(f"Session revoked for user: {request.user.username}")
        
        return Response({'message': 'Session revoked successfully'})
    except UserSession.DoesNotExist:
        return Response(
            {'error': 'Session not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_stats(request):
    """Get user statistics"""
    user = request.user
    
    stats = {
        'total_listings': user.listings.count(),
        'active_listings': user.listings.filter(status='active').count(),
        'total_purchases': user.purchases.count(),
        'total_sales': user.sales.count(),
        'reputation_score': float(user.reputation_score),
        'stake_balance': float(user.stake_balance),
        'wallet_balance': float(user.wallet.balance),
        'completed_transactions': user.purchases.filter(status='released').count() + \
                               user.sales.filter(status='released').count(),
    }
    
    return Response(stats)
