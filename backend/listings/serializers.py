from rest_framework import serializers
from .models import Listing, Category, ListingImage, EncryptedContent, SavedListing


class CategorySerializer(serializers.ModelSerializer):
    listing_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ("id", "name", "description", "listing_count", "created_at")

    def get_listing_count(self, obj):
        return obj.listing_set.filter(status="active").count()


class EncryptedContentSerializer(serializers.ModelSerializer):
    class Meta:
        model = EncryptedContent
        fields = ("content_hash", "file_size", "encryption_algorithm", "created_at")
        read_only_fields = fields


class ListingSerializer(serializers.ModelSerializer):
    seller_username = serializers.CharField(source="seller.username", read_only=True)
    seller_reputation = serializers.FloatField(source="seller.reputation_score", read_only=True)
    seller_public_key = serializers.CharField(source="seller.public_key", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    encrypted_data = EncryptedContentSerializer(read_only=True)
    is_saved = serializers.SerializerMethodField()
    tags_list = serializers.SerializerMethodField()

    class Meta:
        model = Listing
        fields = (
            "id", "title", "description", "preview_content",
            "encrypted_content_url", "price", "status",
            "seller_username", "seller_reputation", "seller_public_key",
            "category", "category_name", "tags", "tags_list",
            "view_count", "purchase_count", "is_featured",
            "encrypted_data", "is_saved",
            "created_at", "updated_at",
        )
        read_only_fields = (
            "id", "seller_username", "seller_reputation", "seller_public_key",
            "category_name", "view_count", "purchase_count",
            "encrypted_data", "is_saved", "created_at", "updated_at",
        )

    def get_is_saved(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return SavedListing.objects.filter(user=request.user, listing=obj).exists()
        return False

    def get_tags_list(self, obj):
        if obj.tags:
            return [t.strip() for t in obj.tags.split(",") if t.strip()]
        return []


class ListingCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Listing
        fields = (
            "title", "description", "preview_content",
            "price", "category", "tags",
        )

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price must be positive.")
        return value

    def create(self, validated_data):
        validated_data["seller"] = self.context["request"].user
        validated_data["status"] = "draft"
        return super().create(validated_data)


class ListingUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Listing
        fields = (
            "title", "description", "preview_content",
            "price", "category", "tags", "status",
            "encrypted_content_url",
        )

    def validate_status(self, value):
        allowed = ["active", "draft", "archived"]
        if value not in allowed:
            raise serializers.ValidationError(f"Status must be one of: {allowed}")
        return value


class PresignedUrlSerializer(serializers.Serializer):
    filename = serializers.CharField(max_length=255)
    content_type = serializers.CharField(default="application/octet-stream")
    file_size = serializers.IntegerField(min_value=1)
    content_hash = serializers.CharField(max_length=64, help_text="SHA-256 of encrypted content")
