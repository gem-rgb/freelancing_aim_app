from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid
import hashlib


class Proof(models.Model):
    TYPE_CHOICES = [
        ('screenshot', 'Screenshot'),
        ('video', 'Video'),
        ('log', 'Log File'),
        ('receipt', 'Receipt'),
        ('document', 'Document'),
        ('other', 'Other'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    listing = models.ForeignKey('listings.Listing', on_delete=models.CASCADE, related_name='proofs')
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    file_url = models.URLField(help_text="S3 URL to the proof file")
    file_hash = models.CharField(max_length=64, help_text="SHA-256 hash of the file")
    file_size = models.PositiveIntegerField(help_text="Size in bytes")
    metadata = models.JSONField(default=dict, help_text="Timestamps, notes, and other metadata")
    is_validated = models.BooleanField(default=False)
    validation_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['listing', 'type']),
            models.Index(fields=['file_hash']),
            models.Index(fields=['is_validated']),
        ]
    
    def __str__(self):
        return f"{self.type} proof for {self.listing.title}"
    
    def save(self, *args, **kwargs):
        if self.file_url and not self.file_hash:
            # Generate hash from URL (in production, this would be done during upload)
            self.file_hash = hashlib.sha256(self.file_url.encode()).hexdigest()
        super().save(*args, **kwargs)


class Verification(models.Model):
    VERDICT_CHOICES = [
        ('valid', 'Valid'),
        ('invalid', 'Invalid'),
        ('partial', 'Partial'),
        ('needs_info', 'Needs More Information'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    listing = models.ForeignKey('listings.Listing', on_delete=models.CASCADE, related_name='verifications')
    verifier = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    verdict = models.CharField(max_length=20, choices=VERDICT_CHOICES)
    confidence_score = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Confidence in verdict (0-100)"
    )
    notes = models.TextField(help_text="Detailed verification notes")
    evidence_reviewed = models.TextField(help_text="List of evidence and proofs reviewed")
    testing_methodology = models.TextField(blank=True, help_text="How the verification was conducted")
    identified_risks = models.JSONField(default=list, help_text="List of identified risks")
    recommendations = models.JSONField(default=list, help_text="Recommendations for improvement")
    time_spent_minutes = models.PositiveIntegerField(default=0, help_text="Time spent on verification")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['listing', 'verdict']),
            models.Index(fields=['verifier', 'created_at']),
            models.Index(fields=['created_at']),
        ]
        unique_together = ['listing', 'verifier']
    
    def __str__(self):
        return f"Verification by {self.verifier.username}: {self.verdict}"


class ReproducibilityTest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    listing = models.ForeignKey('listings.Listing', on_delete=models.CASCADE, related_name='reproducibility_tests')
    tester = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    success = models.BooleanField(help_text="Whether the method was successfully reproduced")
    earnings_reported = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        validators=[MinValueValidator(0)],
        help_text="Earnings achieved from reproduction test"
    )
    roi_percentage = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        null=True, 
        blank=True,
        validators=[MinValueValidator(0)],
        help_text="Return on investment percentage"
    )
    time_to_results = models.DurationField(null=True, blank=True, help_text="Time taken to see results")
    notes = models.TextField(help_text="Detailed test notes and observations")
    challenges_faced = models.TextField(blank=True, help_text="Challenges during reproduction")
    environment_details = models.JSONField(default=dict, help_text="Test environment specifications")
    supporting_evidence = models.JSONField(default=list, help_text="Links to screenshots, logs, etc.")
    would_recommend = models.BooleanField(null=True, blank=True, help_text="Would recommend to others")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['listing', 'success']),
            models.Index(fields=['tester', 'created_at']),
        ]
    
    def __str__(self):
        return f"Test by {self.tester.username}: {'✅' if self.success else '❌'}"


class PostSaleReport(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    transaction = models.OneToOneField('transactions.Transaction', on_delete=models.CASCADE, related_name='post_sale_report')
    buyer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    success = models.BooleanField(help_text="Whether the method worked for the buyer")
    earnings = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        validators=[MinValueValidator(0)],
        help_text="Actual earnings achieved"
    )
    roi_percentage = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        null=True, 
        blank=True,
        validators=[MinValueValidator(0)],
        help_text="Actual ROI achieved"
    )
    time_to_results = models.DurationField(null=True, blank=True, help_text="Time taken to achieve results")
    feedback = models.TextField(help_text="Detailed feedback on the method")
    satisfaction_score = models.IntegerField(
        null=True, 
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        help_text="Satisfaction score (1-10)"
    )
    difficulties_faced = models.TextField(blank=True, help_text="Difficulties encountered")
    support_quality = models.IntegerField(
        null=True, 
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        help_text="Support quality rating (1-10)"
    )
    would_purchase_again = models.BooleanField(null=True, blank=True)
    would_recommend = models.BooleanField(null=True, blank=True)
    additional_comments = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Post-sale report for {self.transaction.id}"


class VerificationQueue(models.Model):
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('rejected', 'Rejected'),
        ('escalated', 'Escalated'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    listing = models.OneToOneField('listings.Listing', on_delete=models.CASCADE, related_name='verification_queue')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    assigned_verifier = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='assigned_verifications'
    )
    auto_assigned = models.BooleanField(default=False, help_text="Whether auto-assignment was used")
    estimated_complexity = models.IntegerField(
        default=3,
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        help_text="Estimated complexity (1-10)"
    )
    special_instructions = models.TextField(blank=True, help_text="Special instructions for verifiers")
    escalation_reason = models.TextField(blank=True, help_text="Reason for escalation")
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['status', 'priority', 'created_at']),
            models.Index(fields=['assigned_verifier', 'status']),
        ]
    
    def __str__(self):
        return f"Verification queue for {self.listing.title}"


class VerificationConsensus(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    listing = models.OneToOneField('listings.Listing', on_delete=models.CASCADE, related_name='verification_consensus')
    final_verdict = models.CharField(max_length=20, choices=Verification.VERDICT_CHOICES)
    confidence_score = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    total_verifications = models.PositiveIntegerField(default=0)
    valid_votes = models.PositiveIntegerField(default=0)
    invalid_votes = models.PositiveIntegerField(default=0)
    partial_votes = models.PositiveIntegerField(default=0)
    needs_info_votes = models.PositiveIntegerField(default=0)
    consensus_threshold_met = models.BooleanField(default=False)
    final_notes = models.TextField(help_text="Summary of all verifications and consensus reasoning")
    risk_assessment = models.JSONField(default=dict, help_text="Final risk assessment")
    recommendations = models.JSONField(default=list, help_text="Final recommendations")
    determined_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        help_text="Admin who determined the final consensus"
    )
    determined_at = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['listing', 'final_verdict']),
            models.Index(fields=['determined_at']),
        ]
    
    def __str__(self):
        return f"Consensus for {self.listing.title}: {self.final_verdict}"


class VerificationScore(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    listing = models.OneToOneField('listings.Listing', on_delete=models.CASCADE, related_name='verification_score_record')
    base_score = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        default=0
    )
    reproducibility_bonus = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        default=0
    )
    post_sale_bonus = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        default=0
    )
    seniority_bonus = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        default=0
    )
    penalty_factors = models.JSONField(default=list, help_text="List of penalty factors and their values")
    final_score = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        default=0
    )
    success_rate = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        default=0,
        help_text="Success rate based on post-sale reports"
    )
    last_calculated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['-final_score']),
            models.Index(fields=['success_rate']),
        ]
    
    def __str__(self):
        return f"Score for {self.listing.title}: {self.final_score}"
    
    def calculate_final_score(self):
        """Calculate the final verification score"""
        base = float(self.base_score)
        repro_bonus = float(self.reproducibility_bonus)
        post_sale_bonus = float(self.post_sale_bonus)
        seniority_bonus = float(self.seniority_bonus)
        
        # Calculate total penalties
        total_penalties = sum(float(penalty.get('amount', 0)) for penalty in self.penalty_factors)
        
        # Final score calculation
        self.final_score = max(0, min(100, base + repro_bonus + post_sale_bonus + seniority_bonus - total_penalties))
        self.save()
        
        return self.final_score


class ListingDemo(models.Model):
    """Public demonstration material attached to a listing for pre-sale credibility.

    Sellers upload redacted/partial proof here (blurred screenshots, partial logs,
    censored receipts) so buyers can verify legitimacy without seeing the full
    encrypted content.
    """

    DEMO_CATEGORY_CHOICES = [
        ('fullz',         'Fullz / Data Dumps'),
        ('proxies',       'Proxies & Anonymity'),
        ('bypass',        'Account Bypass'),
        ('bank',          'Bank / Payment Withdrawals'),
        ('freelancing',   'Freelancing Sites'),
        ('general',       'General'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    listing = models.OneToOneField(
        'listings.Listing',
        on_delete=models.CASCADE,
        related_name='demo',
    )
    demo_category = models.CharField(
        max_length=20,
        choices=DEMO_CATEGORY_CHOICES,
        default='general',
        help_text='The type of information being demonstrated',
    )
    demo_text = models.TextField(
        blank=True,
        max_length=800,
        help_text='Short public excerpt / redacted teaser (max 800 chars)',
    )
    # List of dicts: [{"url": str, "type": str, "caption": str, "file_hash": str}]
    demo_files = models.JSONField(
        default=list,
        help_text='Redacted proof files (screenshots, logs, receipts) — stored as [{url, type, caption, file_hash}]',
    )
    guidance_acknowledged = models.BooleanField(
        default=False,
        help_text='Seller confirmed they understand redaction requirements',
    )
    is_approved = models.BooleanField(
        default=False,
        help_text='Admin has reviewed and approved the demo material',
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_demos',
        help_text='Staff member who approved this demo',
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(
        blank=True,
        help_text='Reason demo was rejected (if applicable)',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['listing', 'is_approved']),
            models.Index(fields=['demo_category']),
        ]

    def __str__(self):
        status = '✅ approved' if self.is_approved else '⏳ pending'
        return f'Demo for "{self.listing.title}" [{status}]'

    @property
    def has_files(self):
        return bool(self.demo_files)

    @property
    def file_count(self):
        return len(self.demo_files) if self.demo_files else 0
