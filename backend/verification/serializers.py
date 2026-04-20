from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import (
    Proof, Verification, ReproducibilityTest, PostSaleReport,
    VerificationQueue, VerificationConsensus, VerificationScore,
    ListingDemo,
)
from listings.models import Listing

User = get_user_model()


class ProofSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proof
        fields = [
            'id', 'listing', 'type', 'file_url', 'file_hash', 'file_size', 
            'metadata', 'is_validated', 'validation_notes', 'created_at'
        ]
        read_only_fields = ['id', 'file_hash', 'is_validated', 'validation_notes', 'created_at']
    
    def validate_file_url(self, value):
        """Validate that the file URL is accessible and properly formatted"""
        if not value.startswith(('http://', 'https://')):
            raise serializers.ValidationError("File URL must be a valid HTTP/HTTPS URL.")
        return value
    
    def validate(self, attrs):
        """Check for duplicate file hashes across the platform"""
        file_url = attrs.get('file_url')
        if file_url:
            # In production, this would check actual file hash
            # For now, we'll use URL hash as a proxy
            import hashlib
            url_hash = hashlib.sha256(file_url.encode()).hexdigest()
            
            # Check if this hash already exists (prevent proof reuse)
            existing_proof = Proof.objects.filter(file_hash=url_hash).first()
            if existing_proof and existing_proof.listing_id != self.instance.listing_id if self.instance else None:
                raise serializers.ValidationError(
                    "This proof file has already been used for another listing. "
                    "Each proof must be unique to prevent fraud."
                )
        
        return attrs


class VerificationSerializer(serializers.ModelSerializer):
    verifier_username = serializers.CharField(source='verifier.username', read_only=True)
    listing_title = serializers.CharField(source='listing.title', read_only=True)
    
    class Meta:
        model = Verification
        fields = [
            'id', 'listing', 'verifier', 'verifier_username', 'listing_title',
            'verdict', 'confidence_score', 'notes', 'evidence_reviewed',
            'testing_methodology', 'identified_risks', 'recommendations',
            'time_spent_minutes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_confidence_score(self, value):
        if not 0 <= value <= 100:
            raise serializers.ValidationError("Confidence score must be between 0 and 100.")
        return value
    
    def validate(self, attrs):
        """Ensure user hasn't already verified this listing"""
        request = self.context.get('request')
        if request and request.user:
            listing = attrs.get('listing')
            if listing:
                existing_verification = Verification.objects.filter(
                    listing=listing, 
                    verifier=request.user
                ).first()
                if existing_verification and (not self.instance or self.instance.id != existing_verification.id):
                    raise serializers.ValidationError(
                        "You have already submitted a verification for this listing."
                    )
        return attrs


class ReproducibilityTestSerializer(serializers.ModelSerializer):
    tester_username = serializers.CharField(source='tester.username', read_only=True)
    listing_title = serializers.CharField(source='listing.title', read_only=True)
    
    class Meta:
        model = ReproducibilityTest
        fields = [
            'id', 'listing', 'tester', 'tester_username', 'listing_title',
            'success', 'earnings_reported', 'roi_percentage', 'time_to_results',
            'notes', 'challenges_faced', 'environment_details', 'supporting_evidence',
            'would_recommend', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_roi_percentage(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("ROI percentage cannot be negative.")
        return value


class PostSaleReportSerializer(serializers.ModelSerializer):
    buyer_username = serializers.CharField(source='buyer.username', read_only=True)
    transaction_id = serializers.CharField(source='transaction.id', read_only=True)
    listing_title = serializers.CharField(source='transaction.listing.title', read_only=True)
    
    class Meta:
        model = PostSaleReport
        fields = [
            'id', 'transaction', 'buyer', 'buyer_username', 'transaction_id', 
            'listing_title', 'success', 'earnings', 'roi_percentage', 'time_to_results',
            'feedback', 'satisfaction_score', 'difficulties_faced', 'support_quality',
            'would_purchase_again', 'would_recommend', 'additional_comments',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_satisfaction_score(self, value):
        if value is not None and not 1 <= value <= 10:
            raise serializers.ValidationError("Satisfaction score must be between 1 and 10.")
        return value
    
    def validate_support_quality(self, value):
        if value is not None and not 1 <= value <= 10:
            raise serializers.ValidationError("Support quality must be between 1 and 10.")
        return value


class VerificationQueueSerializer(serializers.ModelSerializer):
    listing_title = serializers.CharField(source='listing.title', read_only=True)
    listing_seller = serializers.CharField(source='listing.seller.username', read_only=True)
    assigned_verifier_username = serializers.CharField(source='assigned_verifier.username', read_only=True)
    
    class Meta:
        model = VerificationQueue
        fields = [
            'id', 'listing', 'listing_title', 'listing_seller', 'priority', 'status',
            'assigned_verifier', 'assigned_verifier_username', 'auto_assigned',
            'estimated_complexity', 'special_instructions', 'escalation_reason',
            'completed_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'completed_at']


class VerificationConsensusSerializer(serializers.ModelSerializer):
    listing_title = serializers.CharField(source='listing.title', read_only=True)
    determined_by_username = serializers.CharField(source='determined_by.username', read_only=True)
    
    class Meta:
        model = VerificationConsensus
        fields = [
            'id', 'listing', 'listing_title', 'final_verdict', 'confidence_score',
            'total_verifications', 'valid_votes', 'invalid_votes', 'partial_votes',
            'needs_info_votes', 'consensus_threshold_met', 'final_notes',
            'risk_assessment', 'recommendations', 'determined_by',
            'determined_by_username', 'determined_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'determined_at', 'created_at', 'updated_at']


class VerificationScoreSerializer(serializers.ModelSerializer):
    listing_title = serializers.CharField(source='listing.title', read_only=True)
    
    class Meta:
        model = VerificationScore
        fields = [
            'id', 'listing', 'listing_title', 'base_score', 'reproducibility_bonus',
            'post_sale_bonus', 'seniority_bonus', 'penalty_factors', 'final_score',
            'success_rate', 'last_calculated_at', 'created_at'
        ]
        read_only_fields = ['id', 'last_calculated_at', 'created_at']


class ListingVerificationSerializer(serializers.ModelSerializer):
    """Extended listing serializer with verification details"""
    proofs = ProofSerializer(many=True, read_only=True)
    verifications = VerificationSerializer(many=True, read_only=True)
    reproducibility_tests = ReproducibilityTestSerializer(many=True, read_only=True)
    verification_score_details = VerificationScoreSerializer(source='verification_score_record', read_only=True)
    verification_consensus = VerificationConsensusSerializer(source='verification_consensus', read_only=True)
    verification_queue = VerificationQueueSerializer(source='verification_queue', read_only=True)
    
    class Meta:
        model = Listing
        fields = [
            'id', 'title', 'description', 'price', 'status', 'verification_status',
            'verification_score', 'success_rate', 'last_verified_at',
            'verification_expires_at', 'requires_reverification', 'estimated_difficulty',
            'time_investment', 'required_skills', 'risk_level', 'potential_earnings',
            'proofs', 'verifications', 'reproducibility_tests', 'verification_score_details',
            'verification_consensus', 'verification_queue', 'created_at', 'updated_at'
        ]


class VerificationSubmissionSerializer(serializers.Serializer):
    """Serializer for submitting a listing for verification"""
    listing_id = serializers.UUIDField()
    proofs = ProofSerializer(many=True)
    special_instructions = serializers.CharField(required=False, allow_blank=True)
    priority = serializers.ChoiceField(
        choices=VerificationQueue.PRIORITY_CHOICES,
        default='medium'
    )
    
    def validate_listing_id(self, value):
        try:
            listing = Listing.objects.get(id=value)
            if listing.verification_status != 'not_submitted':
                raise serializers.ValidationError(
                    "This listing has already been submitted for verification."
                )
            return value
        except Listing.DoesNotExist:
            raise serializers.ValidationError("Listing not found.")
    
    def validate_proofs(self, value):
        if len(value) < 1:
            raise serializers.ValidationError("At least one proof file is required.")
        return value


class BulkVerificationActionSerializer(serializers.Serializer):
    """Serializer for bulk actions on verification queue"""
    action = serializers.ChoiceField(choices=['assign', 'reject', 'escalate'])
    queue_items = serializers.ListField(child=serializers.UUIDField())
    assigned_verifier_id = serializers.IntegerField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, attrs):
        action = attrs.get('action')
        if action == 'assign' and not attrs.get('assigned_verifier_id'):
            raise serializers.ValidationError(
                "assigned_verifier_id is required when action is 'assign'"
            )
        return attrs


# ── Demo Serializers ──────────────────────────────────────────────────────────

class DemoFileSerializer(serializers.Serializer):
    """Single redacted proof file entry inside a demo."""
    url        = serializers.URLField()
    type       = serializers.ChoiceField(choices=['screenshot', 'video', 'log', 'receipt', 'other'])
    caption    = serializers.CharField(max_length=200, allow_blank=True, default='')
    file_hash  = serializers.CharField(max_length=64, allow_blank=True, default='')


class ListingDemoSerializer(serializers.ModelSerializer):
    """Serializer for the public demonstration material on a listing."""
    listing_title       = serializers.CharField(source='listing.title', read_only=True)
    approved_by_username = serializers.CharField(source='approved_by.username', read_only=True, default=None)
    file_count          = serializers.IntegerField(read_only=True)
    has_files           = serializers.BooleanField(read_only=True)

    class Meta:
        model  = ListingDemo
        fields = [
            'id', 'listing', 'listing_title',
            'demo_category', 'demo_text', 'demo_files',
            'guidance_acknowledged',
            'is_approved', 'approved_by', 'approved_by_username', 'approved_at',
            'rejection_reason',
            'file_count', 'has_files',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'is_approved', 'approved_by', 'approved_by_username',
            'approved_at', 'rejection_reason',
            'file_count', 'has_files',
            'created_at', 'updated_at',
        ]

    def validate_demo_text(self, value):
        if len(value) > 800:
            raise serializers.ValidationError('Demo text may not exceed 800 characters.')
        return value

    def validate_demo_files(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError('demo_files must be a list.')
        if len(value) > 5:
            raise serializers.ValidationError('A maximum of 5 demo files are allowed.')
        for item in value:
            s = DemoFileSerializer(data=item)
            if not s.is_valid():
                raise serializers.ValidationError(f'Invalid demo file entry: {s.errors}')
        return value

    def validate(self, attrs):
        demo_text  = attrs.get('demo_text', '')
        demo_files = attrs.get('demo_files', [])
        guidance   = attrs.get('guidance_acknowledged', False)
        if not demo_text and not demo_files:
            raise serializers.ValidationError(
                'Provide at least a demo text excerpt or one demo file.'
            )
        if not guidance:
            raise serializers.ValidationError(
                'You must acknowledge the redaction / no-spoiler guidance before submitting.'
            )
        return attrs


class ListingDemoApprovalSerializer(serializers.Serializer):
    """Used by staff to approve or reject a demo."""
    verdict          = serializers.ChoiceField(choices=['approve', 'reject'])
    rejection_reason = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        if attrs['verdict'] == 'reject' and not attrs.get('rejection_reason', '').strip():
            raise serializers.ValidationError(
                'A rejection_reason is required when rejecting a demo.'
            )
        return attrs
