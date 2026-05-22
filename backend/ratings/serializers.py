from rest_framework import serializers
from .models import SellerTrustProfile, ReputationBadge, RatingSnapshot, CommunityTrustVote


class ReputationBadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReputationBadge
        fields = ['badge_type', 'awarded_at', 'expires_at']


class SellerTrustProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='seller.username', read_only=True)
    badges = ReputationBadgeSerializer(many=True, read_only=True)

    class Meta:
        model = SellerTrustProfile
        fields = [
            'id', 'username', 'trust_score', 'tier',
            'successful_transactions', 'total_transactions',
            'scam_reports_received', 'verification_success_rate',
            'buyer_satisfaction_avg', 'escrow_completion_rate',
            'product_authenticity_score', 'reupload_violations',
            'dispute_frequency', 'communication_quality',
            'badges', 'last_recalculated_at',
        ]


class RatingSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = RatingSnapshot
        fields = ['trust_score', 'tier', 'snapshot_date']


class CommunityTrustVoteSerializer(serializers.ModelSerializer):
    voter_username = serializers.CharField(source='voter.username', read_only=True)

    class Meta:
        model = CommunityTrustVote
        fields = ['id', 'voter_username', 'vote', 'reason', 'created_at']
        read_only_fields = ['id', 'voter_username', 'created_at']
