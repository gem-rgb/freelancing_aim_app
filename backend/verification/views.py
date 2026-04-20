from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db import models
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import (
    Proof, Verification, ReproducibilityTest, PostSaleReport, 
    VerificationQueue, VerificationConsensus, VerificationScore,
    ListingDemo,
)
from .serializers import (
    ProofSerializer, VerificationSerializer, ReproducibilityTestSerializer,
    PostSaleReportSerializer, VerificationQueueSerializer, 
    VerificationConsensusSerializer, VerificationScoreSerializer,
    ListingVerificationSerializer, VerificationSubmissionSerializer,
    BulkVerificationActionSerializer,
    ListingDemoSerializer, ListingDemoApprovalSerializer,
)
from listings.models import Listing
from transactions.models import Transaction

User = get_user_model()


class ProofViewSet(viewsets.ModelViewSet):
    serializer_class = ProofSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['listing', 'type', 'is_validated']
    search_fields = ['metadata']
    ordering_fields = ['created_at', 'type']
    
    def get_queryset(self):
        queryset = Proof.objects.all()
        listing_id = self.request.query_params.get('listing_id')
        if listing_id:
            queryset = queryset.filter(listing_id=listing_id)
        return queryset.select_related('listing')


class VerificationViewSet(viewsets.ModelViewSet):
    serializer_class = VerificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['listing', 'verdict', 'verifier']
    search_fields = ['notes', 'evidence_reviewed']
    ordering_fields = ['created_at', 'confidence_score']
    
    def get_queryset(self):
        queryset = Verification.objects.all()
        if self.request.user.is_staff:
            return queryset.select_related('listing', 'verifier')
        return queryset.filter(verifier=self.request.user).select_related('listing', 'verifier')
    
    @action(detail=False, methods=['post'])
    def submit_verification(self, request):
        """Submit a verification for a listing"""
        serializer = VerificationSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            verification = serializer.save()
            
            # Update consensus if needed
            self._update_consensus(verification.listing)
            
            return Response(VerificationSerializer(verification).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def _update_consensus(self, listing):
        """Update verification consensus based on all verifications"""
        verifications = Verification.objects.filter(listing=listing)
        
        if verifications.count() >= 3:  # Minimum verifications for consensus
            valid_count = verifications.filter(verdict='valid').count()
            invalid_count = verifications.filter(verdict='invalid').count()
            partial_count = verifications.filter(verdict='partial').count()
            needs_info_count = verifications.filter(verdict='needs_info').count()
            
            total = verifications.count()
            
            # Determine consensus
            if valid_count / total >= 0.6:
                final_verdict = 'valid'
            elif invalid_count / total >= 0.6:
                final_verdict = 'invalid'
            elif partial_count / total >= 0.5:
                final_verdict = 'partial'
            else:
                final_verdict = 'needs_info'
            
            # Calculate average confidence
            avg_confidence = verifications.aggregate(
                avg_confidence=models.Avg('confidence_score')
            )['avg_confidence'] or 0
            
            # Create or update consensus
            consensus, created = VerificationConsensus.objects.update_or_create(
                listing=listing,
                defaults={
                    'final_verdict': final_verdict,
                    'confidence_score': avg_confidence,
                    'total_verifications': total,
                    'valid_votes': valid_count,
                    'invalid_votes': invalid_count,
                    'partial_votes': partial_count,
                    'needs_info_votes': needs_info_count,
                    'consensus_threshold_met': True,
                    'determined_by': request.user if request.user.is_staff else None
                }
            )
            
            # Update listing status
            if final_verdict == 'valid':
                listing.status = 'verified'
                listing.verification_status = 'verified'
                listing.last_verified_at = timezone.now()
            elif final_verdict == 'invalid':
                listing.status = 'rejected'
                listing.verification_status = 'rejected'
            elif final_verdict == 'partial':
                listing.status = 'partial'
                listing.verification_status = 'partial'
            
            listing.save()


class ReproducibilityTestViewSet(viewsets.ModelViewSet):
    serializer_class = ReproducibilityTestSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['listing', 'success', 'tester']
    search_fields = ['notes', 'challenges_faced']
    ordering_fields = ['created_at', 'success']
    
    def get_queryset(self):
        queryset = ReproducibilityTest.objects.all()
        if not self.request.user.is_staff:
            queryset = queryset.filter(tester=self.request.user)
        return queryset.select_related('listing', 'tester')


class PostSaleReportViewSet(viewsets.ModelViewSet):
    serializer_class = PostSaleReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['transaction', 'buyer', 'success']
    search_fields = ['feedback', 'additional_comments']
    ordering_fields = ['created_at', 'success']
    
    def get_queryset(self):
        queryset = PostSaleReport.objects.all()
        if not self.request.user.is_staff:
            queryset = queryset.filter(buyer=self.request.user)
        return queryset.select_related('transaction', 'buyer', 'transaction__listing')
    
    @action(detail=False, methods=['post'])
    def submit_report(self, request):
        """Submit a post-sale report for a transaction"""
        try:
            transaction_id = request.data.get('transaction_id')
            transaction = Transaction.objects.get(id=transaction_id)
            
            # Verify user is the buyer
            if transaction.buyer != request.user:
                return Response(
                    {'error': 'You can only submit reports for your own purchases'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Check if report already exists
            if PostSaleReport.objects.filter(transaction=transaction).exists():
                return Response(
                    {'error': 'A report for this transaction already exists'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            serializer = PostSaleReportSerializer(data=request.data)
            if serializer.is_valid():
                report = serializer.save(buyer=request.user, transaction=transaction)
                
                # Update listing success rate
                self._update_listing_success_rate(transaction.listing)
                
                return Response(PostSaleReportSerializer(report).data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        except Transaction.DoesNotExist:
            return Response(
                {'error': 'Transaction not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def _update_listing_success_rate(self, listing):
        """Update listing success rate based on post-sale reports"""
        reports = PostSaleReport.objects.filter(transaction__listing=listing)
        if reports.exists():
            success_count = reports.filter(success=True).count()
            success_rate = (success_count / reports.count()) * 100
            listing.success_rate = success_rate
            listing.save()


class VerificationQueueViewSet(viewsets.ModelViewSet):
    serializer_class = VerificationQueueSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'priority', 'assigned_verifier']
    search_fields = ['special_instructions', 'escalation_reason']
    ordering_fields = ['created_at', 'priority', 'status']
    
    def get_queryset(self):
        queryset = VerificationQueue.objects.all().select_related('listing', 'listing__seller', 'assigned_verifier')
        
        if not self.request.user.is_staff:
            # Non-staff users can only see their assigned items
            queryset = queryset.filter(assigned_verifier=self.request.user)
        
        return queryset
    
    @action(detail=False, methods=['post'])
    def submit_for_verification(self, request):
        """Submit a listing for verification"""
        serializer = VerificationSubmissionSerializer(data=request.data)
        if serializer.is_valid():
            listing_id = serializer.validated_data['listing_id']
            listing = Listing.objects.get(id=listing_id)
            
            with transaction.atomic():
                # Create verification queue entry
                queue_item = VerificationQueue.objects.create(
                    listing=listing,
                    priority=serializer.validated_data['priority'],
                    special_instructions=serializer.validated_data.get('special_instructions', ''),
                    estimated_complexity=self._estimate_complexity(listing)
                )
                
                # Create proof entries
                proofs_data = serializer.validated_data['proofs']
                for proof_data in proofs_data:
                    Proof.objects.create(listing=listing, **proof_data)
                
                # Update listing status
                listing.status = 'pending_verification'
                listing.verification_status = 'pending'
                listing.save()
                
                # Auto-assign if enabled
                if self._should_auto_assign():
                    self._auto_assign_verifier(queue_item)
                
                return Response(VerificationQueueSerializer(queue_item).data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def bulk_action(self, request):
        """Perform bulk actions on queue items"""
        serializer = BulkVerificationActionSerializer(data=request.data)
        if serializer.is_valid():
            action = serializer.validated_data['action']
            queue_item_ids = serializer.validated_data['queue_items']
            
            with transaction.atomic():
                queue_items = VerificationQueue.objects.filter(id__in=queue_item_ids)
                
                if action == 'assign':
                    verifier_id = serializer.validated_data['assigned_verifier_id']
                    verifier = User.objects.get(id=verifier_id)
                    queue_items.update(assigned_verifier=verifier, status='in_progress')
                
                elif action == 'reject':
                    notes = serializer.validated_data.get('notes', '')
                    for item in queue_items:
                        item.listing.status = 'rejected'
                        item.listing.verification_status = 'rejected'
                        item.listing.save()
                        item.status = 'rejected'
                        item.save()
                
                elif action == 'escalate':
                    notes = serializer.validated_data.get('notes', '')
                    queue_items.update(
                        status='escalated',
                        escalation_reason=notes,
                        priority='urgent'
                    )
                
                return Response({'status': 'success', 'affected_items': queue_items.count()})
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def _estimate_complexity(self, listing):
        """Estimate verification complexity based on listing attributes"""
        complexity = 3  # Base complexity
        
        # Adjust based on price
        if listing.price > 10000:
            complexity += 2
        elif listing.price > 5000:
            complexity += 1
        
        # Adjust based on risk level
        risk_multipliers = {'low': -1, 'medium': 0, 'high': 2, 'extreme': 3}
        complexity += risk_multipliers.get(listing.risk_level, 0)
        
        # Adjust based on estimated difficulty
        if listing.estimated_difficulty:
            complexity += listing.estimated_difficulty - 5
        
        return max(1, min(10, complexity))
    
    def _should_auto_assign(self):
        """Determine if auto-assignment should be used"""
        return True  # Could be based on system settings
    
    def _auto_assign_verifier(self, queue_item):
        """Auto-assign a verifier to the queue item"""
        # Find available verifiers (staff users or high-reputation users)
        available_verifiers = User.objects.filter(
            is_staff=True
        ).exclude(
            id__in=VerificationQueue.objects.filter(
                status='in_progress'
            ).values_list('assigned_verifier', flat=True)
        ).order_by('?')  # Random assignment
        
        if available_verifiers.exists():
            queue_item.assigned_verifier = available_verifiers.first()
            queue_item.auto_assigned = True
            queue_item.status = 'in_progress'
            queue_item.save()


class VerificationConsensusViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = VerificationConsensusSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['final_verdict', 'determined_by']
    search_fields = ['final_notes']
    ordering_fields = ['determined_at', 'created_at']
    
    def get_queryset(self):
        queryset = VerificationConsensus.objects.all().select_related('listing', 'determined_by')
        return queryset


class VerificationScoreViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = VerificationScoreSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = []
    ordering_fields = ['final_score', 'success_rate', 'last_calculated_at']
    
    def get_queryset(self):
        queryset = VerificationScore.objects.all().select_related('listing')
        return queryset
    
    @action(detail=False, methods=['post'])
    def recalculate_scores(self, request):
        """Recalculate verification scores for all or specific listings"""
        if not request.user.is_staff:
            return Response(
                {'error': 'Admin access required'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        listing_ids = request.data.get('listing_ids', [])
        if listing_ids:
            listings = Listing.objects.filter(id__in=listing_ids)
        else:
            listings = Listing.objects.all()
        
        recalc_count = 0
        for listing in listings:
            score, created = VerificationScore.objects.get_or_create(listing=listing)
            score.calculate_final_score()
            recalc_count += 1
        
        return Response({
            'status': 'success',
            'recalculated': recalc_count
        })


class ListingVerificationViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for retrieving listings with full verification details"""
    serializer_class = ListingVerificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'verification_status', 'seller', 'category']
    search_fields = ['title', 'description', 'tags']
    ordering_fields = ['created_at', 'verification_score', 'success_rate', 'price']
    
    def get_queryset(self):
        queryset = Listing.objects.all().select_related(
            'seller', 'category'
        ).prefetch_related(
            'proofs', 'verifications', 'reproducibility_tests'
        )
        return queryset


# ── Demo ViewSet ────────────────────────────────────────────────────────────────────────

class ListingDemoViewSet(viewsets.ModelViewSet):
    """CRUD for the public demonstration material attached to a listing.

    * Sellers can create / update the demo for their own listings.
    * Buyers and anonymous users can READ approved demos.
    * Staff can approve or reject pending demos.
    """
    serializer_class  = ListingDemoSerializer
    filter_backends   = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields  = ['listing', 'is_approved', 'demo_category']
    search_fields     = ['demo_text']
    ordering_fields   = ['created_at', 'is_approved']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = ListingDemo.objects.select_related('listing', 'listing__seller', 'approved_by')
        user = self.request.user

        # Public / buyers see only approved demos
        if not user.is_authenticated:
            return qs.filter(is_approved=True)

        # Staff see everything
        if user.is_staff:
            return qs

        # Sellers see their own demos (regardless of approval) + all approved demos
        return qs.filter(
            models.Q(is_approved=True) |
            models.Q(listing__seller=user)
        )

    def perform_create(self, serializer):
        """Only the listing's seller may create a demo."""
        listing_id = self.request.data.get('listing')
        try:
            listing = Listing.objects.get(id=listing_id, seller=self.request.user)
        except Listing.DoesNotExist:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You may only create a demo for your own listings.')

        if ListingDemo.objects.filter(listing=listing).exists():
            from rest_framework.exceptions import ValidationError
            raise ValidationError('A demo already exists for this listing. Use PATCH to update it.')

        serializer.save(listing=listing)

    def perform_update(self, serializer):
        """Sellers may update their own demos; updates reset approval status."""
        demo = self.get_object()
        user = self.request.user
        if not user.is_staff and demo.listing.seller != user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You may only edit your own demo.')
        # Reset approval whenever content changes
        serializer.save(is_approved=False, approved_by=None, approved_at=None, rejection_reason='')

    # ── Staff actions ───────────────────────────────────────────────────────

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def review(self, request, pk=None):
        """Staff endpoint: approve or reject a listing's demo material."""
        demo       = self.get_object()
        serializer = ListingDemoApprovalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        verdict = serializer.validated_data['verdict']

        if verdict == 'approve':
            demo.is_approved    = True
            demo.approved_by    = request.user
            demo.approved_at    = timezone.now()
            demo.rejection_reason = ''
            demo.save(update_fields=['is_approved', 'approved_by', 'approved_at', 'rejection_reason', 'updated_at'])
            return Response({'status': 'approved', 'demo': ListingDemoSerializer(demo).data})

        elif verdict == 'reject':
            demo.is_approved      = False
            demo.approved_by      = None
            demo.approved_at      = None
            demo.rejection_reason = serializer.validated_data.get('rejection_reason', '')
            demo.save(update_fields=['is_approved', 'approved_by', 'approved_at', 'rejection_reason', 'updated_at'])
            return Response({'status': 'rejected', 'reason': demo.rejection_reason})

    @action(detail=False, methods=['get'])
    def pending_review(self, request):
        """Staff: list all demos awaiting approval review."""
        if not request.user.is_staff:
            return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
        pending = ListingDemo.objects.filter(
            is_approved=False,
            rejection_reason='',
        ).select_related('listing', 'listing__seller')
        return Response(ListingDemoSerializer(pending, many=True).data)
