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
from .emails import create_and_send_otp, send_welcome_email
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
            self.create_user_session(request, user)
            refresh = RefreshToken.for_user(user)
            logger.info(f"New user registered: {user.username}")

            # ── Optional email OTP ──
            email = request.data.get('email', '').strip()
            if email:
                user.email = email
                user.is_verified = False
                user.save(update_fields=['email', 'is_verified'])
                try:
                    create_and_send_otp(user, email)
                    return Response({
                        'user': UserProfileSerializer(user).data,
                        'tokens': {
                            'refresh': str(refresh),
                            'access':  str(refresh.access_token),
                        },
                        'requires_otp': True,
                        'message': f'Verification code sent to {email}',
                    }, status=status.HTTP_201_CREATED)
                except Exception as exc:
                    logger.warning(f"OTP send failed for {user.username}: {exc}")
                    # OTP failed but account still created — just skip verification

            return Response({
                'user': UserProfileSerializer(user).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access':  str(refresh.access_token),
                },
                'requires_otp': False,
            }, status=status.HTTP_201_CREATED)
    
    def create_user_session(self, request, user):
        """Create user session for tracking"""
        ip_address = self.get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        try:
            if not request.session.session_key:
                request.session.create()
            session_key = request.session.session_key or ''
        except Exception:
            session_key = ''
        try:
            UserSession.objects.create(
                user=user,
                session_key=session_key,
                ip_address=ip_address,
                user_agent=user_agent
            )
        except Exception:
            pass
    
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
        
        # Block staff from regular login — they must use /admin/login/
        if user.is_staff:
            return Response(
                {'detail': 'Staff accounts must log in via the Staff Portal.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
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


class StaffLoginView(generics.GenericAPIView):
    """POST /api/auth/admin/login/ — staff-only login endpoint"""
    serializer_class = UserLoginSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data['user']

        if not user.is_staff:
            return Response(
                {'detail': 'Access denied. This portal is for authorized staff only.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Create/update session
        UserLoginView.create_or_update_session(UserLoginView(), request, user)

        refresh = RefreshToken.for_user(user)
        logger.info(f"Staff logged in: {user.username}")

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
        try:
            if not request.session.session_key:
                request.session.create()
            session_key = request.session.session_key or ''
        except Exception:
            session_key = ''
        try:
            UserSession.objects.filter(user=user, is_active=True).update(is_active=False)
            UserSession.objects.create(
                user=user,
                session_key=session_key,
                ip_address=ip_address,
                user_agent=user_agent
            )
        except Exception:
            pass
    
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


# ─── Email OTP ────────────────────────────────────────────────────────────────

class RequestOTPView(generics.GenericAPIView):
    """
    POST /api/auth/otp/request/
    Body: { "email": "user@example.com" }  (optional if already stored)
    Re-generates and sends a fresh OTP. Requires auth.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        email = request.data.get('email', '').strip()
        if not email:
            try:
                email = request.user.email_otp.email
            except Exception:
                pass
        if not email:
            return Response({'error': 'Email address required.'}, status=400)

        try:
            create_and_send_otp(request.user, email)
            return Response({'message': f'Verification code sent to {email}.'})
        except Exception as exc:
            logger.error(f"OTP resend failed: {exc}")
            return Response({'error': 'Failed to send OTP. Check server email config.'}, status=500)


class VerifyOTPView(generics.GenericAPIView):
    """
    POST /api/auth/otp/verify/
    Body: { "otp": "123456" }
    Marks user.is_verified = True on success.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        from .models import EmailOTP
        code = request.data.get('otp', '').strip()
        if not code:
            return Response({'error': 'OTP is required.'}, status=400)

        try:
            otp_obj = EmailOTP.objects.get(user=request.user)
        except EmailOTP.DoesNotExist:
            return Response({'error': 'No pending OTP found. Request a new one.'}, status=404)

        if otp_obj.is_used:
            return Response({'error': 'This OTP has already been used.'}, status=400)

        if not otp_obj.is_valid():
            return Response({'error': 'OTP has expired. Request a new one.'}, status=400)

        if otp_obj.otp != code:
            return Response({'error': 'Invalid OTP. Please try again.'}, status=400)

        otp_obj.is_used = True
        otp_obj.save(update_fields=['is_used'])

        request.user.is_verified = True
        request.user.save(update_fields=['is_verified'])

        try:
            send_welcome_email(request.user)
        except Exception:
            pass

        return Response({
            'message': 'Email verified successfully.',
            'user':    UserProfileSerializer(request.user).data,
        })


# ── Seller Public Profile ─────────────────────────────────────────────────────

class SellerProfileView(generics.RetrieveAPIView):
    """
    GET /api/auth/sellers/<username>/
    Returns public seller profile: bio, avatar, listings, ratings, reviews.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, username, *args, **kwargs):
        from .serializers import SellerPublicProfileSerializer
        try:
            seller = User.objects.get(username=username, user_type='seller')
        except User.DoesNotExist:
            return Response({'error': 'Seller not found.'}, status=404)

        data = SellerPublicProfileSerializer(seller, context={'request': request}).data
        return Response(data)


# ── Admin-Only APIs ───────────────────────────────────────────────────────────

def _require_staff(request):
    if not request.user.is_authenticated or not request.user.is_staff:
        return Response({'error': 'Admin access required.'}, status=403)
    return None


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def admin_list_users(request):
    """GET /api/auth/admin/users/ — full user list for admin"""
    err = _require_staff(request)
    if err: return err
    from .serializers import UserProfileSerializer
    from django.db.models import Count, Q
    users = (
        User.objects.all()
        .select_related('wallet')
        .annotate(
            _total_listings=Count('listings', distinct=True),
            _total_sales=Count('sales', distinct=True),
        )
        .order_by('-date_joined')
    )
    data = []
    for u in users:
        d = UserProfileSerializer(u).data
        try:
            d['wallet_balance'] = float(u.wallet.balance)
        except Exception:
            d['wallet_balance'] = 0
        d['total_listings'] = u._total_listings
        d['total_sales'] = u._total_sales
        d['date_joined'] = u.date_joined.isoformat()
        data.append(d)
    return Response(data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def admin_suspend_user(request, user_id):
    """POST /api/auth/admin/users/<id>/suspend/"""
    err = _require_staff(request)
    if err: return err
    from datetime import timedelta
    from django.utils.timezone import now
    
    reason = request.data.get('reason', 'Suspended for platform violations.')
    days = int(request.data.get('duration_days', 7))
    
    try:
        target = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found.'}, status=404)
        
    if target.is_superuser:
        return Response({'error': 'Cannot suspend superuser.'}, status=400)
        
    target.is_suspended = True
    target.suspension_reason = reason
    target.suspended_until = now() + timedelta(days=days)
    target.save(update_fields=['is_suspended', 'suspension_reason', 'suspended_until'])
    
    # Auto-draft message alert
    from chat.models import ChatRoom, Message
    existing = ChatRoom.objects.filter(type='support', participants=request.user).filter(participants=target).first()
    room = existing or ChatRoom.objects.create(type='support', name=f'Admin ↔ {target.username}')
    if not existing:
        room.participants.add(request.user, target)
        
    alert_text = f"🚨 YOUR ACCOUNT HAS BEEN SUSPENDED 🚨\n\nReason: {reason}\nDuration: {days} days.\nYour suspension will lift on {target.suspended_until.strftime('%Y-%m-%d %H:%M UTC')}."
    msg = Message.objects.create(room=room, sender=request.user, encrypted_message=alert_text, message_type='text')
    
    logger.info(f"Admin {request.user.username} suspended {target.username} for {days} days: {reason}")
    return Response({
        'suspended': True, 
        'username': target.username, 
        'reason': reason, 
        'until': target.suspended_until.isoformat(),
        'alert_dispatched': str(msg.id)
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def admin_unsuspend_user(request, user_id):
    """POST /api/auth/admin/users/<id>/unsuspend/"""
    err = _require_staff(request)
    if err: return err
    try:
        target = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found.'}, status=404)
    target.is_suspended = False
    target.save(update_fields=['is_suspended'])
    logger.info(f"Admin {request.user.username} unsuspended {target.username}")
    return Response({'suspended': False, 'username': target.username})


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def admin_terminate_user(request, user_id):
    """DELETE /api/auth/admin/users/<id>/terminate/"""
    err = _require_staff(request)
    if err: return err
    reason = request.data.get('reason', 'Permanent ban initiated by Security Command.')
    try:
        target = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found.'}, status=404)
    if target.is_superuser:
        return Response({'error': 'Cannot terminate superuser.'}, status=400)
    username = target.username
    target.is_active = False
    target.termination_reason = reason
    target.save(update_fields=['is_active', 'termination_reason'])
    logger.info(f"Admin {request.user.username} terminated account: {username} - {reason}")
    return Response({'terminated': True, 'username': username, 'reason': reason})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def admin_platform_stats(request):
    """GET /api/auth/admin/stats/ — extended platform-wide stats"""
    err = _require_staff(request)
    if err: return err
    from transactions.models import Transaction, Dispute
    from listings.models import Listing
    from django.db.models import Sum, F
    from decimal import Decimal
    total_users     = User.objects.count()
    buyers          = User.objects.filter(user_type='buyer').count()
    sellers         = User.objects.filter(user_type='seller').count()
    managers        = User.objects.filter(user_type='manager').count()
    suspended       = User.objects.filter(is_suspended=True).count()
    total_listings  = Listing.objects.count()
    active_listings = Listing.objects.filter(status='active').count()
    flagged_listings = Listing.objects.filter(status='flagged').count()
    total_txns      = Transaction.objects.count()
    escrow_txns     = Transaction.objects.filter(status='escrow').count()
    released_txns   = Transaction.objects.filter(status='released').count()
    disputed_txns   = Transaction.objects.filter(status='disputed').count()
    open_disputes   = Dispute.objects.filter(status__in=['open', 'investigating']).count()
    # Use DB aggregation instead of Python loop
    revenue_sum = Transaction.objects.filter(status='released').aggregate(
        total=Sum('amount')
    )['total'] or Decimal('0')
    platform_revenue = float(revenue_sum) * 0.15
    return Response({
        'users': {'total': total_users, 'buyers': buyers, 'sellers': sellers, 'managers': managers, 'suspended': suspended},
        'listings': {'total': total_listings, 'active': active_listings, 'flagged': flagged_listings},
        'transactions': {'total': total_txns, 'escrow': escrow_txns, 'released': released_txns, 'disputed': disputed_txns},
        'disputes': {'open': open_disputes},
        'platform_revenue': round(platform_revenue, 2),
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def admin_edit_listing(request, listing_id):
    """POST /api/auth/admin/listings/<id>/edit/ — admin override edit"""
    err = _require_staff(request)
    if err: return err
    from listings.models import Listing
    try:
        listing = Listing.objects.get(id=listing_id)
    except Listing.DoesNotExist:
        return Response({'error': 'Listing not found.'}, status=404)
    allowed = ['title', 'description', 'price', 'status', 'preview_content']
    for field in allowed:
        if field in request.data:
            setattr(listing, field, request.data[field])
    listing.save()
    logger.info(f"Admin {request.user.username} edited listing {listing_id}")
    return Response({'updated': True, 'listing_id': str(listing_id)})


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def admin_terminate_listing(request, listing_id):
    """DELETE /api/auth/admin/listings/<id>/terminate/"""
    err = _require_staff(request)
    if err: return err
    from listings.models import Listing
    try:
        listing = Listing.objects.get(id=listing_id)
    except Listing.DoesNotExist:
        return Response({'error': 'Listing not found.'}, status=404)
    title = listing.title
    listing.status = 'removed'
    listing.save(update_fields=['status'])
    logger.info(f"Admin {request.user.username} terminated listing: {title}")
    return Response({'terminated': True, 'title': title})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def admin_refund_transaction(request, txn_id):
    """POST /api/auth/admin/transactions/<id>/refund/"""
    err = _require_staff(request)
    if err: return err
    from transactions.models import Transaction
    try:
        txn = Transaction.objects.get(id=txn_id)
    except Transaction.DoesNotExist:
        return Response({'error': 'Transaction not found.'}, status=404)
    if txn.status == 'refunded':
        return Response({'error': 'Already refunded.'}, status=400)
    reason = request.data.get('reason', 'Admin refund')
    txn.status = 'refunded'
    txn.save(update_fields=['status'])
    # Return funds to buyer wallet
    try:
        buyer_wallet = txn.buyer.wallet
        buyer_wallet.balance += txn.amount
        buyer_wallet.frozen_balance = max(0, buyer_wallet.frozen_balance - txn.amount)
        buyer_wallet.save(update_fields=['balance', 'frozen_balance'])
    except Exception as e:
        logger.warning(f"Wallet credit failed on refund: {e}")
    logger.info(f"Admin {request.user.username} refunded txn {txn_id}: {reason}")
    return Response({'refunded': True, 'amount': float(txn.amount), 'reason': reason})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def admin_get_support_rooms(request):
    """GET /api/auth/admin/support-rooms/ — all support chat rooms"""
    err = _require_staff(request)
    if err: return err
    from chat.models import ChatRoom
    from chat.serializers import ChatRoomSerializer
    rooms = ChatRoom.objects.filter(type='support').order_by('-updated_at')
    data = ChatRoomSerializer(rooms, many=True, context={'request': request}).data
    return Response(data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def admin_send_message(request):
    """
    POST /api/auth/admin/message/send/
    Body: { target_username, message, room_id? }
    Admin sends a message to any user. Creates a support room if needed.
    """
    err = _require_staff(request)
    if err: return err
    from chat.models import ChatRoom, Message

    room_id       = request.data.get('room_id')
    target_username = request.data.get('target_username', '').strip()
    message_text  = request.data.get('message', '').strip()

    if not message_text:
        return Response({'error': 'Message cannot be empty.'}, status=400)

    # Resolve room
    if room_id:
        try:
            room = ChatRoom.objects.get(id=room_id)
        except ChatRoom.DoesNotExist:
            return Response({'error': 'Room not found.'}, status=404)
    else:
        if not target_username:
            return Response({'error': 'Provide room_id or target_username.'}, status=400)
        try:
            target_user = User.objects.get(username=target_username)
        except User.DoesNotExist:
            return Response({'error': f'User "{target_username}" not found.'}, status=404)

        # Find existing direct/support room between admin and target
        existing = ChatRoom.objects.filter(
            type='support',
            participants=request.user
        ).filter(participants=target_user).first()

        if existing:
            room = existing
        else:
            room = ChatRoom.objects.create(type='support', name=f'Admin ↔ {target_username}')
            room.participants.add(request.user, target_user)

    # Insert message
    msg = Message.objects.create(
        room=room,
        sender=request.user,
        encrypted_message=message_text,
        message_type='text',
    )
    logger.info(f"Admin {request.user.username} sent message to room {room.id}")
    return Response({
        'sent': True,
        'room_id': str(room.id),
        'message_id': str(msg.id),
        'timestamp': msg.created_at.isoformat(),
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def admin_get_all_support_rooms(request):
    """
    GET /api/auth/admin/all-conversations/
    Returns support + direct rooms the admin is part of, for the messaging panel.
    """
    err = _require_staff(request)
    if err: return err
    from chat.models import ChatRoom
    from chat.serializers import ChatRoomSerializer
    rooms = ChatRoom.objects.filter(
        participants=request.user
    ).order_by('-updated_at')
    data = ChatRoomSerializer(rooms, many=True, context={'request': request}).data
    return Response(data)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def admin_stake_logs(request):
    """GET /api/auth/admin/logs/stakes/ - Proceedings for Stake locks and releases"""
    err = _require_staff(request)
    if err: return err
    from transactions.models import Stake
    stakes = Stake.objects.select_related('user', 'transaction').all().order_by('-created_at')
    data = []
    for s in stakes:
        data.append({
            'id': s.id,
            'user': s.user.username,
            'amount': float(s.amount),
            'is_locked': s.is_locked,
            'lock_reason': s.lock_reason,
            'created_at': s.created_at.isoformat(),
            'released_at': s.released_at.isoformat() if s.released_at else None,
            'transaction_id': str(s.transaction.id) if s.transaction else None
        })
    return Response(data)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def admin_escrow_logs(request):
    """GET /api/auth/admin/logs/escrow/ - Proceedings for Escrow Releases"""
    err = _require_staff(request)
    if err: return err
    from transactions.models import EscrowRelease
    releases = EscrowRelease.objects.select_related('transaction', 'released_by').all().order_by('-released_at')
    data = []
    for r in releases:
        data.append({
            'id': r.id,
            'transaction_id': str(r.transaction.id),
            'released_by': r.released_by.username,
            'release_type': r.release_type,
            'released_at': r.released_at.isoformat(),
            'ip_address': r.ip_address
        })
    return Response(data)

