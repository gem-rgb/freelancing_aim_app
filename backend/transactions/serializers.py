from rest_framework import serializers
from django.utils import timezone
from .models import Transaction, Payment, Review, Stake, Dispute, EscrowRelease, TransactionLog
from authentication.serializers import UserProfileSerializer


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = (
            "id", "gateway", "gateway_reference", "amount", "currency",
            "status", "created_at", "processed_at",
        )
        read_only_fields = fields


class ReviewSerializer(serializers.ModelSerializer):
    reviewer_username = serializers.CharField(source="reviewer.username", read_only=True)
    reviewed_username = serializers.CharField(source="reviewed_user.username", read_only=True)

    class Meta:
        model = Review
        fields = (
            "id", "transaction", "reviewer_username", "reviewed_username",
            "rating", "comment", "is_public", "created_at",
        )
        read_only_fields = ("id", "reviewer_username", "reviewed_username", "created_at")

    def validate_rating(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value


class ReviewCreateSerializer(serializers.Serializer):
    rating = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(max_length=2000, allow_blank=True, default="")
    is_public = serializers.BooleanField(default=True)


class StakeSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = Stake
        fields = (
            "id", "username", "amount", "is_locked", "lock_reason",
            "transaction", "created_at", "released_at",
        )
        read_only_fields = ("id", "username", "is_locked", "created_at", "released_at")


class StakeCreateSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0.01)

    def validate_amount(self, value):
        from django.conf import settings
        min_stake = getattr(settings, "MINIMUM_SELLER_STAKE", 500)
        if value < min_stake:
            raise serializers.ValidationError(
                f"Minimum stake is {min_stake} NGN."
            )
        return value


class DisputeSerializer(serializers.ModelSerializer):
    initiated_by_username = serializers.CharField(source="initiated_by.username", read_only=True)
    resolved_by_username = serializers.CharField(source="resolved_by.username", read_only=True)

    class Meta:
        model = Dispute
        fields = (
            "id", "transaction", "initiated_by_username", "status",
            "buyer_claim", "seller_response", "resolution", "resolution_details",
            "admin_notes", "created_at", "updated_at", "resolved_at", "resolved_by_username",
        )
        read_only_fields = (
            "id", "initiated_by_username", "status", "seller_response",
            "resolution", "resolution_details", "admin_notes",
            "created_at", "updated_at", "resolved_at", "resolved_by_username",
        )


class DisputeCreateSerializer(serializers.Serializer):
    buyer_claim = serializers.CharField(max_length=5000)


class DisputeResolveSerializer(serializers.Serializer):
    RESOLUTION_CHOICES = [
        "buyer_favor", "seller_favor", "partial_refund", "full_refund", "no_action"
    ]
    resolution = serializers.ChoiceField(choices=RESOLUTION_CHOICES)
    resolution_details = serializers.CharField(max_length=5000, allow_blank=True, default="")
    admin_notes = serializers.CharField(max_length=5000, allow_blank=True, default="")
    slash_stake = serializers.BooleanField(default=False)


class TransactionLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = TransactionLog
        fields = ("id", "action", "description", "created_at")
        read_only_fields = fields


class TransactionSerializer(serializers.ModelSerializer):
    buyer_username = serializers.CharField(source="buyer.username", read_only=True)
    seller_username = serializers.CharField(source="seller.username", read_only=True)
    listing_title = serializers.CharField(source="listing.title", read_only=True)
    payment = PaymentSerializer(read_only=True)
    review = ReviewSerializer(read_only=True)
    dispute = DisputeSerializer(read_only=True)
    logs = TransactionLogSerializer(many=True, read_only=True)

    class Meta:
        model = Transaction
        fields = (
            "id", "buyer_username", "seller_username", "listing", "listing_title",
            "amount", "platform_fee", "status", "encrypted_key",
            "paystack_reference", "created_at", "updated_at",
            "expires_at", "released_at",
            "payment", "review", "dispute", "logs",
        )
        read_only_fields = (
            "id", "buyer_username", "seller_username", "listing_title",
            "platform_fee", "status", "paystack_reference",
            "created_at", "updated_at", "expires_at", "released_at",
        )


class TransactionInitiateSerializer(serializers.Serializer):
    listing_id = serializers.UUIDField()
    buyer_public_key = serializers.CharField(help_text="Buyer RSA public key PEM (used by seller to re-encrypt AES key)")

    def validate_listing_id(self, value):
        from listings.models import Listing
        try:
            listing = Listing.objects.get(id=value, status="active")
        except Listing.DoesNotExist:
            raise serializers.ValidationError("Listing not found or not active.")
        self.context["listing"] = listing
        return value


class ReleaseKeySerializer(serializers.Serializer):
    encrypted_key_for_buyer = serializers.CharField(
        help_text="AES key re-encrypted with buyer's RSA public key"
    )
