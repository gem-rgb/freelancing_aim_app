from django.contrib import admin
from .models import SellerTrustProfile, ReputationBadge, RatingSnapshot, CommunityTrustVote

@admin.register(SellerTrustProfile)
class SellerTrustProfileAdmin(admin.ModelAdmin):
    list_display = ['seller', 'trust_score', 'tier', 'successful_transactions', 'scam_reports_received', 'last_recalculated_at']
    list_filter = ['tier']
    search_fields = ['seller__username']

@admin.register(ReputationBadge)
class ReputationBadgeAdmin(admin.ModelAdmin):
    list_display = ['trust_profile', 'badge_type', 'awarded_at']
    list_filter = ['badge_type']

@admin.register(RatingSnapshot)
class RatingSnapshotAdmin(admin.ModelAdmin):
    list_display = ['trust_profile', 'trust_score', 'tier', 'snapshot_date']

@admin.register(CommunityTrustVote)
class CommunityTrustVoteAdmin(admin.ModelAdmin):
    list_display = ['voter', 'seller', 'vote', 'created_at']
    list_filter = ['vote']
