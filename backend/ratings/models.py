"""
Seller rating, trust scoring, and reputation badge models.

Ratings affect:
- Product visibility and marketplace ranking
- Escrow requirements and verification strictness
- Buyer trust indicators
"""

from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid


class SellerTrustProfile(models.Model):
    """Aggregated trust profile for a seller — recalculated by background tasks."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    seller = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='trust_profile',
    )

    # ── Aggregate metrics ──
    trust_score = models.DecimalField(
        max_digits=5, decimal_places=2, default=0.00,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text='Composite trust score 0-100',
    )
    successful_transactions = models.PositiveIntegerField(default=0)
    total_transactions = models.PositiveIntegerField(default=0)
    scam_reports_received = models.PositiveIntegerField(default=0)
    verification_success_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=0.00,
    )
    buyer_satisfaction_avg = models.DecimalField(
        max_digits=3, decimal_places=2, default=0.00,
        validators=[MinValueValidator(0), MaxValueValidator(5)],
    )
    escrow_completion_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=0.00,
    )
    product_authenticity_score = models.DecimalField(
        max_digits=5, decimal_places=2, default=0.00,
    )
    reupload_violations = models.PositiveIntegerField(default=0)
    dispute_frequency = models.DecimalField(
        max_digits=5, decimal_places=2, default=0.00,
        help_text='Disputes per 100 transactions',
    )
    communication_quality = models.DecimalField(
        max_digits=3, decimal_places=2, default=0.00,
        validators=[MinValueValidator(0), MaxValueValidator(5)],
    )

    # ── Tier / Badge ──
    TIER_CHOICES = [
        ('new', 'New Seller'),
        ('bronze', 'Bronze'),
        ('silver', 'Silver'),
        ('gold', 'Gold'),
        ('platinum', 'Platinum'),
        ('diamond', 'Diamond'),
    ]
    tier = models.CharField(max_length=10, choices=TIER_CHOICES, default='new')

    last_recalculated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['-trust_score']),
            models.Index(fields=['tier']),
            models.Index(fields=['seller']),
        ]

    def __str__(self):
        return f"{self.seller.username} — {self.tier} ({self.trust_score})"


class ReputationBadge(models.Model):
    """Earned badges displayed on seller profile."""

    BADGE_TYPES = [
        ('verified_seller', 'Verified Seller'),
        ('top_rated', 'Top Rated'),
        ('fast_delivery', 'Fast Delivery'),
        ('dispute_free', 'Dispute Free'),
        ('escrow_reliable', 'Escrow Reliable'),
        ('community_trusted', 'Community Trusted'),
        ('high_volume', 'High Volume'),
        ('long_standing', 'Long Standing'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    trust_profile = models.ForeignKey(
        SellerTrustProfile,
        on_delete=models.CASCADE,
        related_name='badges',
    )
    badge_type = models.CharField(max_length=30, choices=BADGE_TYPES)
    awarded_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        unique_together = ['trust_profile', 'badge_type']
        ordering = ['-awarded_at']

    def __str__(self):
        return f"{self.badge_type} for {self.trust_profile.seller.username}"


class RatingSnapshot(models.Model):
    """Periodic snapshot of seller rating for historical tracking."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    trust_profile = models.ForeignKey(
        SellerTrustProfile,
        on_delete=models.CASCADE,
        related_name='snapshots',
    )
    trust_score = models.DecimalField(max_digits=5, decimal_places=2)
    tier = models.CharField(max_length=10)
    snapshot_date = models.DateField()
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        unique_together = ['trust_profile', 'snapshot_date']
        ordering = ['-snapshot_date']
        indexes = [models.Index(fields=['trust_profile', 'snapshot_date'])]

    def __str__(self):
        return f"{self.trust_profile.seller.username} — {self.snapshot_date}"


class CommunityTrustVote(models.Model):
    """Community-sourced trust votes on sellers."""

    VOTE_CHOICES = [
        ('trusted', 'Trusted'),
        ('suspicious', 'Suspicious'),
        ('neutral', 'Neutral'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    voter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='trust_votes_cast',
    )
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='trust_votes_received',
    )
    vote = models.CharField(max_length=12, choices=VOTE_CHOICES)
    reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['voter', 'seller']
        indexes = [models.Index(fields=['seller', 'vote'])]

    def __str__(self):
        return f"{self.voter.username} → {self.seller.username}: {self.vote}"
