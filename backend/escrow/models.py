"""
Escrow & Staking ledger models.

Business rules:
- 40% of seller earnings from each sale are automatically staked.
- Funds remain locked until distributed verification completes.
- Release requires fraud checks to pass.
- Disputes can freeze / slash stakes.
"""

from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid


class EscrowAccount(models.Model):
    """Per-user escrow ledger — tracks total locked, released, and slashed funds."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='escrow_account',
    )
    total_locked = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_released = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_slashed = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=['user'])]

    def __str__(self):
        return f"Escrow account for {self.user.username}"

    @property
    def available_balance(self):
        return self.total_released - self.total_slashed


class StakeEntry(models.Model):
    """Individual stake lock tied to a specific transaction."""

    STATUS_CHOICES = [
        ('locked', 'Locked'),
        ('pending_release', 'Pending Release'),
        ('released', 'Released'),
        ('slashed', 'Slashed'),
        ('disputed', 'Disputed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    escrow_account = models.ForeignKey(
        EscrowAccount,
        on_delete=models.CASCADE,
        related_name='stake_entries',
    )
    transaction = models.ForeignKey(
        'transactions.Transaction',
        on_delete=models.CASCADE,
        related_name='escrow_stakes',
        null=True,
        blank=True,
    )
    gross_sale_amount = models.DecimalField(max_digits=12, decimal_places=2)
    stake_rate = models.DecimalField(
        max_digits=4, decimal_places=2, default=0.40,
        help_text='Fraction of gross sale locked (default 0.40 = 40%)',
    )
    locked_amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='locked')
    verification_status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('in_review', 'In Review'),
            ('passed', 'Passed'),
            ('failed', 'Failed'),
        ],
        default='pending',
    )
    scam_review_status = models.CharField(
        max_length=20,
        choices=[
            ('not_flagged', 'Not Flagged'),
            ('queued', 'Queued'),
            ('cleared', 'Cleared'),
            ('escalated', 'Escalated'),
        ],
        default='not_flagged',
    )
    locked_at = models.DateTimeField(auto_now_add=True)
    estimated_release_at = models.DateTimeField(null=True, blank=True)
    released_at = models.DateTimeField(null=True, blank=True)
    release_reason = models.CharField(max_length=100, blank=True)
    released_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='released_stakes',
    )
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-locked_at']
        indexes = [
            models.Index(fields=['status', 'locked_at']),
            models.Index(fields=['escrow_account', 'status']),
            models.Index(fields=['verification_status']),
        ]

    def __str__(self):
        return f"Stake {self.id} — {self.locked_amount} ({self.status})"


class EscrowEvent(models.Model):
    """Immutable audit log for every escrow state change."""

    EVENT_TYPES = [
        ('stake_created', 'Stake Created'),
        ('verification_started', 'Verification Started'),
        ('verification_passed', 'Verification Passed'),
        ('verification_failed', 'Verification Failed'),
        ('release_scheduled', 'Release Scheduled'),
        ('released', 'Released'),
        ('slashed', 'Slashed'),
        ('dispute_frozen', 'Dispute Frozen'),
        ('dispute_resolved', 'Dispute Resolved'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    stake_entry = models.ForeignKey(
        StakeEntry,
        on_delete=models.CASCADE,
        related_name='events',
    )
    event_type = models.CharField(max_length=30, choices=EVENT_TYPES)
    description = models.TextField(blank=True)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['stake_entry', 'event_type'])]

    def __str__(self):
        return f"{self.event_type} on {self.stake_entry_id}"


class ReleaseSchedule(models.Model):
    """Scheduled automatic release after verification + cooling period."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    stake_entry = models.OneToOneField(
        StakeEntry,
        on_delete=models.CASCADE,
        related_name='release_schedule',
    )
    scheduled_at = models.DateTimeField(help_text='When the release should execute')
    executed = models.BooleanField(default=False)
    executed_at = models.DateTimeField(null=True, blank=True)
    cancelled = models.BooleanField(default=False)
    cancellation_reason = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['scheduled_at', 'executed']),
        ]

    def __str__(self):
        return f"Release schedule for stake {self.stake_entry_id}"
