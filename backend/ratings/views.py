from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import SellerTrustProfile, RatingSnapshot, CommunityTrustVote
from .serializers import SellerTrustProfileSerializer, RatingSnapshotSerializer, CommunityTrustVoteSerializer
from .services import TrustCalculationService


class SellerTrustView(generics.RetrieveAPIView):
    """GET /api/ratings/seller/<username>/ — public trust profile."""
    serializer_class = SellerTrustProfileSerializer
    permission_classes = [permissions.AllowAny]

    def get_object(self):
        from authentication.models import User
        user = User.objects.get(username=self.kwargs['username'])
        profile, _ = SellerTrustProfile.objects.get_or_create(seller=user)
        return profile


class MyTrustView(generics.RetrieveAPIView):
    """GET /api/ratings/me/ — current user's trust profile."""
    serializer_class = SellerTrustProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        profile, _ = SellerTrustProfile.objects.get_or_create(seller=self.request.user)
        return profile


class TrustHistoryView(generics.ListAPIView):
    """GET /api/ratings/seller/<username>/history/ — trust score over time."""
    serializer_class = RatingSnapshotSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        from authentication.models import User
        user = User.objects.get(username=self.kwargs['username'])
        profile, _ = SellerTrustProfile.objects.get_or_create(seller=user)
        return RatingSnapshot.objects.filter(trust_profile=profile)[:90]


class CommunityVoteView(generics.CreateAPIView):
    """POST /api/ratings/vote/ — submit a community trust vote."""
    serializer_class = CommunityTrustVoteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        from authentication.models import User
        seller = User.objects.get(username=self.request.data.get('seller_username'))
        serializer.save(voter=self.request.user, seller=seller)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def recalculate_my_trust(request):
    """POST /api/ratings/recalculate/ — trigger recalculation."""
    profile = TrustCalculationService.recalculate_for_user(request.user)
    return Response(SellerTrustProfileSerializer(profile).data)
