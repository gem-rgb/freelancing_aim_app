from django.contrib import admin
from .models import ManagerProfile, VerificationTask, TaskConsensus, AssignmentWeightConfig

@admin.register(ManagerProfile)
class ManagerProfileAdmin(admin.ModelAdmin):
    list_display = ['manager', 'composite_rank_score', 'trust_score', 'total_tasks_completed', 'active_assignments', 'is_available']
    list_filter = ['is_available']
    search_fields = ['manager__username']

@admin.register(VerificationTask)
class VerificationTaskAdmin(admin.ModelAdmin):
    list_display = ['id', 'listing', 'assigned_manager', 'chunk_index', 'status', 'priority', 'decision', 'created_at']
    list_filter = ['status', 'priority', 'decision']
    search_fields = ['listing__title', 'assigned_manager__username']

@admin.register(TaskConsensus)
class TaskConsensusAdmin(admin.ModelAdmin):
    list_display = ['listing', 'consensus_status', 'total_reviews', 'aggregate_score', 'final_decision']
    list_filter = ['consensus_status']

@admin.register(AssignmentWeightConfig)
class AssignmentWeightConfigAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active', 'randomization_factor', 'created_at']
    list_filter = ['is_active']
