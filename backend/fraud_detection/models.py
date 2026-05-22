"""
Fraud Detection & Anti-Reupload models.
Product fingerprinting, semantic similarity, ownership lineage, reupload detection.
"""
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid


class ProductFingerprint(models.Model):
    """Content fingerprint for duplicate/reupload detection."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    listing = models.OneToOneField('listings.Listing', on_delete=models.CASCADE, related_name='fingerprint')
    content_hash_sha256 = models.CharField(max_length=64, db_index=True)
    metadata_hash = models.CharField(max_length=64, blank=True)
    embedding_vector = models.JSONField(default=list, blank=True, help_text='Semantic embedding for similarity search')
    file_size_bytes = models.PositiveBigIntegerField(default=0)
    mime_type = models.CharField(max_length=127, blank=True)
    fingerprint_version = models.CharField(max_length=20, default='v1')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['content_hash_sha256']),
            models.Index(fields=['metadata_hash']),
        ]

    def __str__(self):
        return f"Fingerprint for {self.listing.title}"


class DuplicateDetectionResult(models.Model):
    """Result of a duplicate scan comparing two product fingerprints."""

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('no_match', 'No Match'),
        ('possible_duplicate', 'Possible Duplicate'),
        ('confirmed_duplicate', 'Confirmed Duplicate'),
        ('false_positive', 'False Positive'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    source_fingerprint = models.ForeignKey(ProductFingerprint, on_delete=models.CASCADE, related_name='duplicate_scans')
    matched_fingerprint = models.ForeignKey(ProductFingerprint, on_delete=models.CASCADE, related_name='matched_by', null=True, blank=True)
    similarity_score = models.DecimalField(max_digits=5, decimal_places=4, default=0.0000, validators=[MinValueValidator(0), MaxValueValidator(1)])
    hash_match = models.BooleanField(default=False)
    semantic_match = models.BooleanField(default=False)
    metadata_match = models.BooleanField(default=False)
    status = models.CharField(max_length=25, choices=STATUS_CHOICES, default='pending')
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    review_notes = models.TextField(blank=True)
    scan_metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-similarity_score']
        indexes = [models.Index(fields=['status', 'similarity_score'])]

    def __str__(self):
        return f"Duplicate scan {self.id} — {self.status}"


class OwnershipLineage(models.Model):
    """Tracks product ownership chain to prevent middleman reselling."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    fingerprint = models.ForeignKey(ProductFingerprint, on_delete=models.CASCADE, related_name='lineage_entries')
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='owned_products')
    parent_entry = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='children')
    acquisition_type = models.CharField(max_length=20, choices=[('original','Original Upload'),('purchase','Purchase'),('transfer','Transfer')], default='original')
    transaction = models.ForeignKey('transactions.Transaction', on_delete=models.SET_NULL, null=True, blank=True)
    acquired_at = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['acquired_at']
        indexes = [models.Index(fields=['fingerprint', 'owner'])]

    def __str__(self):
        return f"{self.owner.username} owns {self.fingerprint.listing.title}"


class ReuploadAlert(models.Model):
    """Alert raised when reupload/middleman activity is detected."""

    SEVERITY_CHOICES = [('low','Low'),('medium','Medium'),('high','High'),('critical','Critical')]
    STATUS_CHOICES = [('open','Open'),('investigating','Investigating'),('resolved','Resolved'),('dismissed','Dismissed')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    duplicate_result = models.ForeignKey(DuplicateDetectionResult, on_delete=models.CASCADE, related_name='alerts', null=True, blank=True)
    flagged_listing = models.ForeignKey('listings.Listing', on_delete=models.CASCADE, related_name='reupload_alerts')
    original_listing = models.ForeignKey('listings.Listing', on_delete=models.CASCADE, related_name='reupload_claims', null=True, blank=True)
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default='medium')
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='open')
    description = models.TextField(blank=True)
    resolved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    resolution_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['status', 'severity'])]

    def __str__(self):
        return f"Reupload alert: {self.flagged_listing.title} ({self.severity})"


class FraudReport(models.Model):
    """User-submitted fraud/scam report."""

    REPORT_TYPES = [('scam','Scam'),('reupload','Reupload'),('fake_proof','Fake Proof'),('identity','Identity Fraud'),('other','Other')]
    STATUS_CHOICES = [('submitted','Submitted'),('investigating','Investigating'),('confirmed','Confirmed'),('dismissed','Dismissed')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='fraud_reports_filed')
    reported_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='fraud_reports_received', null=True, blank=True)
    reported_listing = models.ForeignKey('listings.Listing', on_delete=models.CASCADE, related_name='fraud_reports', null=True, blank=True)
    report_type = models.CharField(max_length=15, choices=REPORT_TYPES)
    description = models.TextField()
    evidence = models.JSONField(default=list, blank=True)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='submitted')
    risk_score = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_fraud_reports')
    resolution_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['status', 'report_type']), models.Index(fields=['reported_user'])]

    def __str__(self):
        return f"Fraud report {self.id} ({self.report_type})"
