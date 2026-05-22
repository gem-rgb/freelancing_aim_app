from django.contrib import admin
from .models import EscrowAccount, StakeEntry, EscrowEvent, ReleaseSchedule

@admin.register(EscrowAccount)
class EscrowAccountAdmin(admin.ModelAdmin):
    list_display = ['user', 'total_locked', 'total_released', 'total_slashed', 'updated_at']
    search_fields = ['user__username']

@admin.register(StakeEntry)
class StakeEntryAdmin(admin.ModelAdmin):
    list_display = ['id', 'escrow_account', 'locked_amount', 'status', 'verification_status', 'locked_at']
    list_filter = ['status', 'verification_status', 'scam_review_status']
    search_fields = ['escrow_account__user__username']

@admin.register(EscrowEvent)
class EscrowEventAdmin(admin.ModelAdmin):
    list_display = ['id', 'stake_entry', 'event_type', 'created_at']
    list_filter = ['event_type']

@admin.register(ReleaseSchedule)
class ReleaseScheduleAdmin(admin.ModelAdmin):
    list_display = ['id', 'stake_entry', 'scheduled_at', 'executed', 'cancelled']
    list_filter = ['executed', 'cancelled']
