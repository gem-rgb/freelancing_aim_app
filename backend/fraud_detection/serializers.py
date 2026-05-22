from rest_framework import serializers
from .models import ProductFingerprint, DuplicateDetectionResult, OwnershipLineage, ReuploadAlert, FraudReport


class ProductFingerprintSerializer(serializers.ModelSerializer):
    listing_title = serializers.CharField(source='listing.title', read_only=True)

    class Meta:
        model = ProductFingerprint
        fields = ['id', 'listing', 'listing_title', 'content_hash_sha256', 'metadata_hash',
                  'file_size_bytes', 'mime_type', 'fingerprint_version', 'created_at']
        read_only_fields = ['id', 'created_at']


class DuplicateDetectionResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = DuplicateDetectionResult
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class OwnershipLineageSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source='owner.username', read_only=True)

    class Meta:
        model = OwnershipLineage
        fields = ['id', 'fingerprint', 'owner', 'owner_username', 'parent_entry',
                  'acquisition_type', 'transaction', 'acquired_at']


class ReuploadAlertSerializer(serializers.ModelSerializer):
    flagged_listing_title = serializers.CharField(source='flagged_listing.title', read_only=True)

    class Meta:
        model = ReuploadAlert
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class FraudReportSerializer(serializers.ModelSerializer):
    reporter_username = serializers.CharField(source='reporter.username', read_only=True)

    class Meta:
        model = FraudReport
        fields = '__all__'
        read_only_fields = ['id', 'reporter', 'reporter_username', 'risk_score', 'status', 'created_at', 'updated_at']
