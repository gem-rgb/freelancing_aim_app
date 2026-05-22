from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import EscrowAccount, StakeEntry, EscrowEvent
from .serializers import EscrowAccountSerializer, StakeEntrySerializer, EscrowEventSerializer
from .services import EscrowService


class MyEscrowAccountView(generics.RetrieveAPIView):
    """GET /api/escrow/account/ — current user's escrow account."""
    serializer_class = EscrowAccountSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return EscrowService.get_or_create_account(self.request.user)


class MyStakeEntriesView(generics.ListAPIView):
    """GET /api/escrow/stakes/ — current user's stake entries."""
    serializer_class = StakeEntrySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        account = EscrowService.get_or_create_account(self.request.user)
        return StakeEntry.objects.filter(escrow_account=account)


class StakeDetailView(generics.RetrieveAPIView):
    """GET /api/escrow/stakes/<id>/ — single stake detail."""
    serializer_class = StakeEntrySerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'

    def get_queryset(self):
        account = EscrowService.get_or_create_account(self.request.user)
        return StakeEntry.objects.filter(escrow_account=account)


class StakeEventsView(generics.ListAPIView):
    """GET /api/escrow/stakes/<stake_id>/events/ — audit log for a stake."""
    serializer_class = EscrowEventSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return EscrowEvent.objects.filter(stake_entry_id=self.kwargs['stake_id'])


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def escrow_summary(request):
    """GET /api/escrow/summary/ — aggregated escrow stats for current user."""
    account = EscrowService.get_or_create_account(request.user)
    stakes = StakeEntry.objects.filter(escrow_account=account)
    return Response({
        'total_locked': float(account.total_locked),
        'total_released': float(account.total_released),
        'total_slashed': float(account.total_slashed),
        'active_stakes': stakes.filter(status='locked').count(),
        'pending_release': stakes.filter(status='pending_release').count(),
        'stakes_by_status': {
            s: stakes.filter(status=s).count()
            for s in ['locked', 'pending_release', 'released', 'slashed', 'disputed']
        },
    })
