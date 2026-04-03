from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
import uuid


class Transaction(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('escrow', 'In Escrow'),
        ('released', 'Released'),
        ('disputed', 'Disputed'),
        ('refunded', 'Refunded'),
        ('cancelled', 'Cancelled'),
        ('expired', 'Expired'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    buyer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='purchases')
    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sales')
    listing = models.ForeignKey('listings.Listing', on_delete=models.CASCADE, related_name='transactions')
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0.01)])
    platform_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    encrypted_key = models.TextField(help_text="AES key encrypted with buyer's public key")
    paystack_reference = models.CharField(max_length=100, unique=True, null=True, blank=True)
    paystack_transaction_id = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    released_at = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"Transaction {self.id} - {self.buyer.username} → {self.seller.username}"
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['buyer', 'status']),
            models.Index(fields=['seller', 'status']),
        ]


class Payment(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('reversed', 'Reversed'),
    ]
    
    transaction = models.OneToOneField(Transaction, on_delete=models.CASCADE, related_name='payment')
    gateway = models.CharField(max_length=50, default='paystack')
    gateway_reference = models.CharField(max_length=100, unique=True)
    gateway_transaction_id = models.CharField(max_length=100, null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='NGN')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    gateway_response = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"Payment {self.gateway_reference} - {self.status}"


class Review(models.Model):
    RATING_CHOICES = [(i, str(i)) for i in range(1, 6)]
    
    transaction = models.OneToOneField(Transaction, on_delete=models.CASCADE, related_name='review')
    reviewer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    reviewed_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reviews_received')
    rating = models.IntegerField(choices=RATING_CHOICES)
    comment = models.TextField(blank=True)
    is_public = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Review by {self.reviewer.username} - {self.rating}/5"


class Stake(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='stakes')
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0.01)])
    is_locked = models.BooleanField(default=True)
    lock_reason = models.CharField(max_length=100, default='seller_stake')
    transaction = models.ForeignKey(Transaction, on_delete=models.CASCADE, null=True, blank=True, related_name='stakes')
    created_at = models.DateTimeField(auto_now_add=True)
    released_at = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"Stake: {self.user.username} - {self.amount}"


class Dispute(models.Model):
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
    
    transaction = models.OneToOneField(Transaction, on_delete=models.CASCADE, related_name='dispute')
    initiated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    buyer_claim = models.TextField()
    seller_response = models.TextField(blank=True)
    resolution = models.CharField(max_length=20, choices=RESOLUTION_CHOICES, null=True, blank=True)
    resolution_details = models.TextField(blank=True)
    admin_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='resolved_disputes')
    
    def __str__(self):
        return f"Dispute for transaction {self.transaction.id}"


class EscrowRelease(models.Model):
    transaction = models.OneToOneField(Transaction, on_delete=models.CASCADE, related_name='escrow_release')
    released_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    release_type = models.CharField(max_length=20, choices=[
        ('auto', 'Automatic'),
        ('manual', 'Manual'),
        ('admin', 'Admin'),
    ])
    released_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    
    def __str__(self):
        return f"Escrow release for {self.transaction.id}"


class TransactionLog(models.Model):
    ACTION_CHOICES = [
        ('created', 'Created'),
        ('payment_initiated', 'Payment Initiated'),
        ('payment_confirmed', 'Payment Confirmed'),
        ('escrow_entered', 'Escrow Entered'),
        ('key_released', 'Key Released'),
        ('dispute_opened', 'Dispute Opened'),
        ('dispute_resolved', 'Dispute Resolved'),
        ('refunded', 'Refunded'),
        ('cancelled', 'Cancelled'),
    ]
    
    transaction = models.ForeignKey(Transaction, on_delete=models.CASCADE, related_name='logs')
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    description = models.TextField(blank=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    metadata = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.action} for {self.transaction.id}"
