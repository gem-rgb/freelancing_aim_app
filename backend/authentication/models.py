from django.db import models
from django.contrib.auth.models import AbstractUser
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
import secrets
import string


class User(AbstractUser):
    USER_TYPE_CHOICES = [
        ('buyer', 'Buyer'),
        ('seller', 'Seller'),
    ]
    
    username = models.CharField(max_length=50, unique=True)
    email = models.EmailField(null=True, blank=True)
    user_type = models.CharField(max_length=10, choices=USER_TYPE_CHOICES, default='buyer')
    public_key = models.TextField(blank=True, default='')
    encrypted_private_key = models.TextField(null=True, blank=True)
    reputation_score = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    stake_balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    is_verified = models.BooleanField(default=False)
    is_suspended = models.BooleanField(default=False)
    suspended_until = models.DateTimeField(null=True, blank=True)
    suspension_reason = models.TextField(blank=True, default='')
    termination_reason = models.TextField(blank=True, default='')
    bio = models.TextField(blank=True, default='', help_text='Short seller bio shown on profile')
    avatar_url = models.URLField(blank=True, default='', help_text='Profile picture URL')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = []
    
    def __str__(self):
        return self.username
    
    @classmethod
    def generate_username(cls):
        """Generate a random anonymous username"""
        adjectives = ['silent', 'shadow', 'phantom', 'ghost', 'mystic', 'hidden', 'secret', 'covert']
        nouns = ['trader', 'seller', 'buyer', 'dealer', 'merchant', 'vendor', 'broker', 'agent']
        number = ''.join(secrets.choice(string.digits) for _ in range(3))
        return f"{secrets.choice(adjectives)}_{secrets.choice(nouns)}_{number}"
    
    @classmethod
    def generate_keypair(cls):
        """Generate RSA key pair for the user"""
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
        )
        
        # Serialize public key
        public_pem = private_key.public_key().public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )
        
        # Serialize private key (would be encrypted client-side)
        private_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        )
        
        return public_pem.decode('utf-8'), private_pem.decode('utf-8')


class UserWallet(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='wallet')
    wallet_address = models.CharField(max_length=255, unique=True)
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    frozen_balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.username} - {self.wallet_address}"


class UserSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sessions')
    session_key = models.CharField(max_length=255)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.username} - {self.session_key[:20]}..."


class EmailOTP(models.Model):
    """
    Time-limited 6-digit OTP for optional email verification during signup.
    One OTP per user at a time (upserted on each request).
    """
    user       = models.OneToOneField(User, on_delete=models.CASCADE, related_name='email_otp')
    email      = models.EmailField()
    otp        = models.CharField(max_length=6)
    is_used    = models.BooleanField(default=False)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    def is_valid(self):
        from django.utils import timezone
        return not self.is_used and self.expires_at > timezone.now()

    def __str__(self):
        return f"OTP for {self.user.username} ({'used' if self.is_used else 'active'})"
