from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from .models import User, UserWallet, UserSession
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
import secrets
import string


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True)
    encrypted_private_key = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = User
        fields = ('username', 'password', 'confirm_password', 'public_key', 'encrypted_private_key')
    
    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already exists.")
        return value
    
    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError("Passwords don't match.")
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('confirm_password')
        
        # Generate username if not provided
        if 'username' not in validated_data:
            validated_data['username'] = User.generate_username()
        
        # Generate keypair if not provided
        if 'public_key' not in validated_data:
            public_key, private_key = User.generate_keypair()
            validated_data['public_key'] = public_key
            validated_data['encrypted_private_key'] = private_key
        
        user = User.objects.create_user(**validated_data)
        
        # Create wallet for user
        UserWallet.objects.create(
            user=user,
            wallet_address=self.generate_wallet_address()
        )
        
        return user
    
    def generate_wallet_address(self):
        """Generate a unique wallet address"""
        while True:
            address = f"AIM_{secrets.token_urlsafe(20)}"
            if not UserWallet.objects.filter(wallet_address=address).exists():
                return address


class UserLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()
    
    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')
        
        if username and password:
            user = authenticate(username=username, password=password)
            if not user:
                raise serializers.ValidationError('Invalid credentials')
            if not user.is_active:
                raise serializers.ValidationError('User account is disabled')
            attrs['user'] = user
        else:
            raise serializers.ValidationError('Must include username and password')
        
        return attrs


class UserProfileSerializer(serializers.ModelSerializer):
    wallet_balance = serializers.DecimalField(source='wallet.balance', max_digits=10, decimal_places=2, read_only=True)
    frozen_balance = serializers.DecimalField(source='wallet.frozen_balance', max_digits=10, decimal_places=2, read_only=True)
    wallet_address = serializers.CharField(source='wallet.wallet_address', read_only=True)
    
    class Meta:
        model = User
        fields = (
            'id', 'username', 'public_key', 'reputation_score',
            'stake_balance', 'is_verified', 'is_staff', 'created_at', 'updated_at',
            'wallet_balance', 'frozen_balance', 'wallet_address'
        )
        read_only_fields = ('id', 'reputation_score', 'stake_balance', 'is_verified', 'is_staff', 'created_at', 'updated_at')


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('public_key', 'encrypted_private_key')
    
    def update(self, instance, validated_data):
        # Log key changes for security
        if 'public_key' in validated_data:
            # In production, this should trigger security alerts
            pass
        
        return super().update(instance, validated_data)


class KeyGenerationSerializer(serializers.Serializer):
    """Generate new RSA keypair for user"""
    class Meta:
        fields = ()
    
    def create(self, validated_data):
        public_key, private_key = User.generate_keypair()
        return {
            'public_key': public_key,
            'private_key': private_key
        }


class UsernameGenerationSerializer(serializers.Serializer):
    """Generate anonymous username"""
    class Meta:
        fields = ()
    
    def create(self, validated_data):
        return {
            'username': User.generate_username()
        }


class UserSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSession
        fields = ('session_key', 'ip_address', 'user_agent', 'is_active', 'created_at', 'last_activity')
        read_only_fields = ('session_key', 'created_at', 'last_activity')
