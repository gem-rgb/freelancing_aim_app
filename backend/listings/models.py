from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name
    
    class Meta:
        verbose_name_plural = "Categories"


class Listing(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('pending_verification', 'Pending Verification'),
        ('verified', 'Verified'),
        ('rejected', 'Rejected'),
        ('partial', 'Partially Verified'),
        ('active', 'Active'),
        ('sold', 'Sold'),
        ('flagged', 'Flagged'),
        ('archived', 'Archived'),
    ]
    
    VERIFICATION_STATUS_CHOICES = [
        ('not_submitted', 'Not Submitted'),
        ('pending', 'Pending'),
        ('in_review', 'In Review'),
        ('verified', 'Verified'),
        ('rejected', 'Rejected'),
        ('partial', 'Partial'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField()
    preview_content = models.TextField(help_text="Unencrypted teaser content")
    encrypted_content_url = models.URLField(blank=True, null=True, help_text="S3 URL to encrypted content")
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0.01)])
    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='listings')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='draft')
    verification_status = models.CharField(max_length=20, choices=VERIFICATION_STATUS_CHOICES, default='not_submitted')
    verification_score = models.DecimalField(max_digits=5, decimal_places=2, default=0.00, help_text="Overall verification score (0-100)")
    success_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00, help_text="Success rate based on post-sale reports")
    last_verified_at = models.DateTimeField(null=True, blank=True)
    verification_expires_at = models.DateTimeField(null=True, blank=True, help_text="When verification expires")
    requires_reverification = models.BooleanField(default=False, help_text="Whether listing needs re-verification")
    view_count = models.PositiveIntegerField(default=0)
    purchase_count = models.PositiveIntegerField(default=0)
    is_featured = models.BooleanField(default=False)
    tags = models.CharField(max_length=500, blank=True, help_text="Comma-separated tags")
    estimated_difficulty = models.IntegerField(
        null=True, 
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        help_text="Estimated difficulty (1-10)"
    )
    time_investment = models.DurationField(null=True, blank=True, help_text="Estimated time investment")
    required_skills = models.TextField(blank=True, help_text="Required skills and tools")
    risk_level = models.CharField(
        max_length=20,
        choices=[
            ('low', 'Low'),
            ('medium', 'Medium'),
            ('high', 'High'),
            ('extreme', 'Extreme'),
        ],
        default='medium'
    )
    potential_earnings = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        validators=[MinValueValidator(0)],
        help_text="Estimated potential earnings"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.title} by {self.seller.username}"
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['seller', 'status']),
            models.Index(fields=['category', 'status']),
            models.Index(fields=['verification_status', 'verification_score']),
            models.Index(fields=['-verification_score']),
            models.Index(fields=['-success_rate']),
        ]


class ListingImage(models.Model):
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='listing_images/')
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Image for {self.listing.title}"


class ListingPreviewMedia(models.Model):
    """
    Public teaser media attached to a listing (shown before purchase).
    Files are stored in MinIO; the URL is returned after a presigned upload.
    """
    MEDIA_TYPE_CHOICES = [
        ('image',    'Image'),
        ('video',    'Video'),
        ('document', 'Document'),
        ('audio',    'Audio'),
        ('other',    'Other'),
    ]

    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    listing     = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name='preview_media')
    media_type  = models.CharField(max_length=20, choices=MEDIA_TYPE_CHOICES, default='image')
    file_url    = models.URLField(max_length=1024, help_text='MinIO/S3 public or presigned URL')
    filename    = models.CharField(max_length=255)
    file_size   = models.PositiveBigIntegerField(default=0, help_text='Bytes')
    mime_type   = models.CharField(max_length=127, blank=True)
    caption     = models.CharField(max_length=300, blank=True)
    sort_order  = models.PositiveSmallIntegerField(default=0)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['sort_order', 'created_at']

    def __str__(self):
        return f"{self.media_type} preview for {self.listing.title}"


class EncryptedContent(models.Model):
    listing = models.OneToOneField(Listing, on_delete=models.CASCADE, related_name='encrypted_data')
    content_hash = models.CharField(max_length=64, help_text="SHA-256 hash of the encrypted content")
    file_size = models.PositiveIntegerField(help_text="Size in bytes")
    encryption_algorithm = models.CharField(max_length=50, default="AES-256-GCM")
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Encrypted content for {self.listing.title}"


class ListingView(models.Model):
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name='views')
    viewer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    viewed_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"View of {self.listing.title}"


class SavedListing(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='saved_listings')
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name='saved_by')
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user.username} saved {self.listing.title}"
    
    class Meta:
        unique_together = ['user', 'listing']
