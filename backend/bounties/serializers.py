from rest_framework import serializers
from .models import Bounty, BountySubmission, BountyTransaction, BountyWatch, BountyDispute


class BountySubmissionSerializer(serializers.ModelSerializer):
    seller_username = serializers.CharField(source="seller.username", read_only=True)
    seller_reputation = serializers.FloatField(source="seller.reputation_score", read_only=True)

    class Meta:
        model = BountySubmission
        fields = (
            "id", "bounty", "seller_username", "seller_reputation",
            "encrypted_solution", "solution_hash",
            "file_url", "file_name", "file_size",
            "status", "submission_notes", "rejection_reason",
            "submitted_at", "reviewed_at",
        )
        read_only_fields = (
            "id", "seller_username", "seller_reputation",
            "status", "rejection_reason", "submitted_at", "reviewed_at",
        )


class BountySubmissionCreateSerializer(serializers.Serializer):
    encrypted_solution = serializers.CharField()
    solution_hash = serializers.CharField(max_length=64)
    submission_notes = serializers.CharField(max_length=3000, allow_blank=True, default="")
    file_url = serializers.URLField(required=False, allow_blank=True)
    file_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    file_size = serializers.IntegerField(required=False, allow_null=True)


class BountySerializer(serializers.ModelSerializer):
    buyer_username = serializers.CharField(source="buyer.username", read_only=True)
    buyer_reputation = serializers.FloatField(source="buyer.reputation_score", read_only=True)
    tags_list = serializers.SerializerMethodField()
    is_watching = serializers.SerializerMethodField()

    class Meta:
        model = Bounty
        fields = (
            "id", "title", "description", "requirements", "reward",
            "buyer_username", "buyer_reputation",
            "status", "priority", "category", "tags", "tags_list",
            "deadline", "max_submissions", "view_count", "submission_count",
            "is_watching", "created_at", "updated_at", "expires_at",
        )
        read_only_fields = (
            "id", "buyer_username", "buyer_reputation",
            "view_count", "submission_count", "is_watching",
            "created_at", "updated_at",
        )

    def get_tags_list(self, obj):
        if obj.tags:
            return [t.strip() for t in obj.tags.split(",") if t.strip()]
        return []

    def get_is_watching(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return BountyWatch.objects.filter(user=request.user, bounty=obj).exists()
        return False


class BountyCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bounty
        fields = (
            "title", "description", "requirements", "reward",
            "priority", "category", "tags", "deadline", "max_submissions",
        )

    def create(self, validated_data):
        validated_data["buyer"] = self.context["request"].user
        return super().create(validated_data)


class BountyDisputeSerializer(serializers.ModelSerializer):
    initiated_by_username = serializers.CharField(source="initiated_by.username", read_only=True)

    class Meta:
        model = BountyDispute
        fields = (
            "id", "bounty_transaction", "initiated_by_username",
            "status", "claim_description", "response_description",
            "resolution", "resolution_details", "admin_notes",
            "created_at", "updated_at", "resolved_at",
        )
        read_only_fields = (
            "id", "initiated_by_username", "status",
            "response_description", "resolution", "resolution_details",
            "admin_notes", "created_at", "updated_at", "resolved_at",
        )
