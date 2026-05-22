from django.contrib import admin
from .models import ProductFingerprint, DuplicateDetectionResult, OwnershipLineage, ReuploadAlert, FraudReport

@admin.register(ProductFingerprint)
class ProductFingerprintAdmin(admin.ModelAdmin):
    list_display = ['listing', 'content_hash_sha256', 'file_size_bytes', 'fingerprint_version', 'created_at']
    search_fields = ['listing__title', 'content_hash_sha256']

@admin.register(DuplicateDetectionResult)
class DuplicateDetectionResultAdmin(admin.ModelAdmin):
    list_display = ['id', 'source_fingerprint', 'similarity_score', 'status', 'created_at']
    list_filter = ['status']

@admin.register(OwnershipLineage)
class OwnershipLineageAdmin(admin.ModelAdmin):
    list_display = ['owner', 'fingerprint', 'acquisition_type', 'acquired_at']
    list_filter = ['acquisition_type']

@admin.register(ReuploadAlert)
class ReuploadAlertAdmin(admin.ModelAdmin):
    list_display = ['flagged_listing', 'severity', 'status', 'created_at']
    list_filter = ['severity', 'status']

@admin.register(FraudReport)
class FraudReportAdmin(admin.ModelAdmin):
    list_display = ['reporter', 'report_type', 'status', 'risk_score', 'created_at']
    list_filter = ['report_type', 'status']
    search_fields = ['reporter__username', 'reported_user__username']
