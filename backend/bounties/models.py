from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
import uuid


class Bounty(models.Model):
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('in_progress', 'In Progress'),
        ('reviewing', 'Reviewing'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('expired', 'Expired'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField()
    requirements = models.TextField(help_text="Detailed requirements for the solution")
    reward = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0.01)])
    buyer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='posted_bounties')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    category = models.CharField(max_length=100, blank=True)
    tags = models.CharField(max_length=500, blank=True, help_text="Comma-separated tags")
    deadline = models.DateTimeField(null=True, blank=True)
    max_submissions = models.PositiveIntegerField(null=True, blank=True, help_text="Maximum number of submissions to accept")
    view_count = models.PositiveIntegerField(default=0)
    submission_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"Bounty: {self.title} - {self.reward}"
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['buyer', 'status']),
            models.Index(fields=['priority', 'status']),
        ]


class BountySubmission(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('withdrawn', 'Withdrawn'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    bounty = models.ForeignKey(Bounty, on_delete=models.CASCADE, related_name='submissions')
    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bounty_submissions')
    encrypted_solution = models.TextField(help_text="Solution encrypted with buyer's public key")
    solution_hash = models.CharField(max_length=64, help_text="SHA-256 hash of the solution")
    file_url = models.URLField(blank=True, null=True, help_text="URL to encrypted solution file")
    file_name = models.CharField(max_length=255, blank=True, null=True)
    file_size = models.PositiveIntegerField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    submission_notes = models.TextField(blank=True, help_text="Notes about the solution")
    rejection_reason = models.TextField(blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"Submission by {self.seller.username} for {self.bounty.title}"
    
    class Meta:
        unique_together = ['bounty', 'seller']
        ordering = ['-submitted_at']


class BountyTransaction(models.Model):
    """Transaction created when a bounty submission is accepted"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('disputed', 'Disputed'),
        ('refunded', 'Refunded'),
    ]
    
    bounty = models.OneToOneField(Bounty, on_delete=models.CASCADE, related_name='transaction')
    submission = models.OneToOneField(BountySubmission, on_delete=models.CASCADE, related_name='transaction')
    buyer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bounty_payments')
    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bounty_earnings')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    platform_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    paystack_reference = models.CharField(max_length=100, unique=True, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"Bounty payment: {self.bounty.title} - {self.amount}"


class BountyMessage(models.Model):
    """Messages related to bounty submissions"""
    bounty = models.ForeignKey(Bounty, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='received_bounty_messages')
    message = models.TextField()
    is_public = models.BooleanField(default=False, help_text="Public messages are visible to all submitters")
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Message for {self.bounty.title} from {self.sender.username}"


class BountyView(models.Model):
    bounty = models.ForeignKey(Bounty, on_delete=models.CASCADE, related_name='views')
    viewer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    viewed_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"View of bounty {self.bounty.title}"


class BountyWatch(models.Model):
    """Users watching bounties for updates"""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='watched_bounties')
    bounty = models.ForeignKey(Bounty, on_delete=models.CASCADE, related_name='watchers')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['user', 'bounty']
    
    def __str__(self):
        return f"{self.user.username} watching {self.bounty.title}"


class BountyDispute(models.Model):
    """Disputes for bounty payments"""
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('investigating', 'Investigating'),
        ('resolved', 'Resolved'),
        ('rejected', 'Rejected'),
    ]
    
    RESOLUTION_CHOICES = [
        ('buyer_favor', 'Buyer Favor'),
        ('seller_favor', 'Seller Favor'),
        ('partial_refund', 'Partial Refund'),
        ('full_refund', 'Full Refund'),
        ('no_action', 'No Action'),
    ]
    
    bounty_transaction = models.OneToOneField(BountyTransaction, on_delete=models.CASCADE, related_name='dispute')
    initiated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    claim_description = models.TextField()
    response_description = models.TextField(blank=True)
    resolution = models.CharField(max_length=20, choices=RESOLUTION_CHOICES, null=True, blank=True)
    resolution_details = models.TextField(blank=True)
    admin_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='resolved_bounty_disputes')
    
    def __str__(self):
        return f"Dispute for bounty {self.bounty_transaction.bounty.title}"
