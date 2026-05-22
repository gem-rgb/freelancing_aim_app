"""
Distributed Task Assignment Engine models.
Weighted, randomized, qualification-aware task distribution for manager verification.
"""
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid


class ManagerProfile(models.Model):
    """Extended profile for managers with scoring and assignment metrics."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    manager = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='manager_profile')

    # ── Weighted ranking factors (10 factors from spec) ──
    qualification_score = models.DecimalField(max_digits=5, decimal_places=2, default=50.00, validators=[MinValueValidator(0), MaxValueValidator(100)])
    experience_score = models.DecimalField(max_digits=5, decimal_places=2, default=0.00, validators=[MinValueValidator(0), MaxValueValidator(100)])
    verification_accuracy = models.DecimalField(max_digits=5, decimal_places=2, default=0.00, validators=[MinValueValidator(0), MaxValueValidator(100)])
    scam_detection_accuracy = models.DecimalField(max_digits=5, decimal_places=2, default=0.00, validators=[MinValueValidator(0), MaxValueValidator(100)])
    seller_rating_avg = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    buyer_rating_avg = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    platform_activity_hours = models.DecimalField(max_digits=8, decimal_places=2, default=0.00)
    task_completion_consistency = models.DecimalField(max_digits=5, decimal_places=2, default=0.00, validators=[MinValueValidator(0), MaxValueValidator(100)])
    avg_response_speed_minutes = models.DecimalField(max_digits=8, decimal_places=2, default=0.00)
    trust_score = models.DecimalField(max_digits=5, decimal_places=2, default=50.00, validators=[MinValueValidator(0), MaxValueValidator(100)])

    # ── Composite ──
    composite_rank_score = models.DecimalField(max_digits=7, decimal_places=4, default=0.0000, help_text='Weighted composite used for assignment priority')
    total_tasks_completed = models.PositiveIntegerField(default=0)
    total_tasks_assigned = models.PositiveIntegerField(default=0)
    active_assignments = models.PositiveIntegerField(default=0)
    max_concurrent_assignments = models.PositiveIntegerField(default=5)
    specializations = models.JSONField(default=list, blank=True)
    is_available = models.BooleanField(default=True)

    last_assignment_at = models.DateTimeField(null=True, blank=True)
    last_recalculated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['-composite_rank_score']),
            models.Index(fields=['is_available', '-composite_rank_score']),
        ]

    def __str__(self):
        return f"Manager {self.manager.username} (rank: {self.composite_rank_score})"


class VerificationTask(models.Model):
    """A single chunk-verification task assigned to a manager."""

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('assigned', 'Assigned'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('escalated', 'Escalated'),
        ('reassigned', 'Reassigned'),
        ('expired', 'Expired'),
    ]

    PRIORITY_CHOICES = [('low','Low'),('medium','Medium'),('high','High'),('urgent','Urgent')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    listing = models.ForeignKey('listings.Listing', on_delete=models.CASCADE, related_name='verification_tasks')
    assigned_manager = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tasks')
    chunk_index = models.PositiveIntegerField(default=0)
    total_chunks = models.PositiveIntegerField(default=1)
    chunk_data_ref = models.CharField(max_length=255, blank=True, help_text='Reference to encrypted chunk (no plaintext)')
    randomized_batch_label = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='pending')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    assignment_weight = models.DecimalField(max_digits=7, decimal_places=4, default=1.0000, help_text='Weight used during assignment')

    # ── Review result ──
    decision = models.CharField(max_length=20, choices=[('clean','Clean'),('suspicious','Suspicious'),('fraud_signal','Fraud Signal'),('escalate','Escalate')], blank=True)
    review_score = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    review_notes = models.TextField(blank=True)
    review_duration_minutes = models.PositiveIntegerField(null=True, blank=True)

    assigned_at = models.DateTimeField(null=True, blank=True)
    due_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'priority']),
            models.Index(fields=['assigned_manager', 'status']),
            models.Index(fields=['listing', 'chunk_index']),
        ]

    def __str__(self):
        return f"Task {self.id} — chunk {self.chunk_index}/{self.total_chunks}"


class TaskConsensus(models.Model):
    """Aggregated consensus from multiple manager reviews of a listing."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    listing = models.OneToOneField('listings.Listing', on_delete=models.CASCADE, related_name='task_consensus')
    total_reviews = models.PositiveIntegerField(default=0)
    clean_count = models.PositiveIntegerField(default=0)
    suspicious_count = models.PositiveIntegerField(default=0)
    fraud_count = models.PositiveIntegerField(default=0)
    escalated_count = models.PositiveIntegerField(default=0)
    aggregate_score = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    consensus_status = models.CharField(max_length=25, choices=[
        ('open','Open'),('consensus_reached','Consensus Reached'),('split_verdict','Split Verdict'),('escalated','Escalated'),
    ], default='open')
    final_decision = models.CharField(max_length=20, blank=True)
    determined_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=['consensus_status'])]

    def __str__(self):
        return f"Consensus for {self.listing.title}: {self.consensus_status}"


class AssignmentWeightConfig(models.Model):
    """Configurable weights for the ranking algorithm — admin-tunable."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True, default='default')
    qualification_weight = models.DecimalField(max_digits=4, decimal_places=2, default=0.15)
    experience_weight = models.DecimalField(max_digits=4, decimal_places=2, default=0.10)
    verification_accuracy_weight = models.DecimalField(max_digits=4, decimal_places=2, default=0.20)
    scam_detection_weight = models.DecimalField(max_digits=4, decimal_places=2, default=0.15)
    seller_rating_weight = models.DecimalField(max_digits=4, decimal_places=2, default=0.05)
    buyer_rating_weight = models.DecimalField(max_digits=4, decimal_places=2, default=0.05)
    activity_weight = models.DecimalField(max_digits=4, decimal_places=2, default=0.05)
    consistency_weight = models.DecimalField(max_digits=4, decimal_places=2, default=0.10)
    speed_weight = models.DecimalField(max_digits=4, decimal_places=2, default=0.05)
    trust_weight = models.DecimalField(max_digits=4, decimal_places=2, default=0.10)
    randomization_factor = models.DecimalField(max_digits=4, decimal_places=2, default=0.15, help_text='Amount of randomization injected for fairness')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Weight config: {self.name}"
