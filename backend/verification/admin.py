from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Avg, Count, F
from django.urls import reverse
from django.utils.safestring import mark_safe
from django.http import HttpResponseRedirect
from .models import (
    Proof, Verification, ReproducibilityTest, PostSaleReport,
    VerificationQueue, VerificationConsensus, VerificationScore,
    ListingDemo,
)
from listings.models import Listing


@admin.register(Proof)
class ProofAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'listing_link', 'type', 'file_size', 'is_validated', 
        'validation_status', 'created_at'
    ]
    list_filter = ['type', 'is_validated', 'created_at']
    search_fields = ['listing__title', 'file_hash']
    readonly_fields = ['file_hash', 'created_at', 'updated_at']
    raw_id_fields = ['listing']
    
    def listing_link(self, obj):
        if obj.listing:
            url = reverse('admin:listings_listing_change', args=[obj.listing.id])
            return format_html('<a href="{}">{}</a>', url, obj.listing.title)
        return '-'
    listing_link.short_description = 'Listing'
    
    def validation_status(self, obj):
        if obj.is_validated:
            return format_html(
                '<span style="color: green;">✅ Validated</span><br><small>{}</small>',
                obj.validation_notes[:50]
            )
        else:
            return format_html(
                '<span style="color: orange;">⏳ Pending</span>'
            )
    validation_status.short_description = 'Validation Status'
    
    actions = ['validate_selected_proofs', 'invalidate_selected_proofs']
    
    def validate_selected_proofs(self, request, queryset):
        updated = queryset.update(is_validated=True, validation_notes="Validated by admin")
        self.message_user(request, f'{updated} proofs validated successfully.')
    validate_selected_proofs.short_description = 'Validate selected proofs'
    
    def invalidate_selected_proofs(self, request, queryset):
        updated = queryset.update(is_validated=False, validation_notes="Invalidated by admin")
        self.message_user(request, f'{updated} proofs invalidated successfully.')
    invalidate_selected_proofs.short_description = 'Invalidate selected proofs'


@admin.register(Verification)
class VerificationAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'listing_link', 'verifier_link', 'verdict', 'confidence_score',
        'time_spent_minutes', 'created_at'
    ]
    list_filter = ['verdict', 'confidence_score', 'created_at']
    search_fields = ['listing__title', 'verifier__username', 'notes']
    readonly_fields = ['created_at', 'updated_at']
    raw_id_fields = ['listing', 'verifier']
    
    def listing_link(self, obj):
        if obj.listing:
            url = reverse('admin:listings_listing_change', args=[obj.listing.id])
            return format_html('<a href="{}">{}</a>', url, obj.listing.title)
        return '-'
    listing_link.short_description = 'Listing'
    
    def verifier_link(self, obj):
        if obj.verifier:
            url = reverse('admin:auth_user_change', args=[obj.verifier.id])
            return format_html('<a href="{}">{}</a>', url, obj.verifier.username)
        return '-'
    verifier_link.short_description = 'Verifier'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('listing', 'verifier', 'verdict', 'confidence_score')
        }),
        ('Verification Details', {
            'fields': ('notes', 'evidence_reviewed', 'testing_methodology')
        }),
        ('Risk Assessment', {
            'fields': ('identified_risks', 'recommendations', 'time_spent_minutes')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(VerificationQueue)
class VerificationQueueAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'listing_link', 'priority', 'status', 'assigned_verifier',
        'estimated_complexity', 'created_at', 'queue_age'
    ]
    list_filter = ['priority', 'status', 'estimated_complexity', 'created_at']
    search_fields = ['listing__title', 'special_instructions']
    readonly_fields = ['created_at', 'updated_at', 'completed_at']
    raw_id_fields = ['listing', 'assigned_verifier']
    
    def listing_link(self, obj):
        if obj.listing:
            url = reverse('admin:listings_listing_change', args=[obj.listing.id])
            return format_html('<a href="{}">{}</a>', url, obj.listing.title)
        return '-'
    listing_link.short_description = 'Listing'
    
    def queue_age(self, obj):
        from django.utils import timezone
        age = timezone.now() - obj.created_at
        if age.days > 0:
            return f"{age.days}d {age.seconds // 3600}h"
        else:
            return f"{age.seconds // 3600}h {(age.seconds % 3600) // 60}m"
    queue_age.short_description = 'Age in Queue'
    
    actions = ['assign_to_me', 'mark_completed', 'escalate_items']
    
    def assign_to_me(self, request, queryset):
        updated = queryset.update(assigned_verifier=request.user, status='in_progress')
        self.message_user(request, f'{updated} items assigned to you.')
    assign_to_me.short_description = 'Assign selected to me'
    
    def mark_completed(self, request, queryset):
        from django.utils import timezone
        updated = queryset.update(status='completed', completed_at=timezone.now())
        self.message_user(request, f'{updated} items marked as completed.')
    mark_completed.short_description = 'Mark selected as completed'
    
    def escalate_items(self, request, queryset):
        updated = queryset.update(status='escalated', priority='urgent')
        self.message_user(request, f'{updated} items escalated.')
    escalate_items.short_description = 'Escalate selected items'


@admin.register(VerificationConsensus)
class VerificationConsensusAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'listing_link', 'final_verdict', 'confidence_score',
        'total_verifications', 'consensus_met', 'determined_at'
    ]
    list_filter = ['final_verdict', 'consensus_threshold_met', 'determined_at']
    search_fields = ['listing__title', 'final_notes']
    readonly_fields = ['created_at', 'updated_at', 'determined_at']
    raw_id_fields = ['listing', 'determined_by']
    
    def listing_link(self, obj):
        if obj.listing:
            url = reverse('admin:listings_listing_change', args=[obj.listing.id])
            return format_html('<a href="{}">{}</a>', url, obj.listing.title)
        return '-'
    listing_link.short_description = 'Listing'
    
    def consensus_met(self, obj):
        if obj.consensus_threshold_met:
            return format_html('<span style="color: green;">✅ Yes</span>')
        else:
            return format_html('<span style="color: red;">❌ No</span>')
    consensus_met.short_description = 'Consensus Met'
    
    fieldsets = (
        ('Consensus Results', {
            'fields': ('listing', 'final_verdict', 'confidence_score', 'consensus_threshold_met')
        }),
        ('Vote Breakdown', {
            'fields': ('total_verifications', 'valid_votes', 'invalid_votes', 'partial_votes', 'needs_info_votes')
        }),
        ('Details', {
            'fields': ('final_notes', 'risk_assessment', 'recommendations', 'determined_by')
        }),
        ('Timestamps', {
            'fields': ('determined_at', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(VerificationScore)
class VerificationScoreAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'listing_link', 'final_score', 'success_rate', 'base_score',
        'reproducibility_bonus', 'post_sale_bonus', 'last_calculated_at'
    ]
    list_filter = ['last_calculated_at']
    search_fields = ['listing__title']
    readonly_fields = ['created_at', 'last_calculated_at']
    raw_id_fields = ['listing']
    
    def listing_link(self, obj):
        if obj.listing:
            url = reverse('admin:listings_listing_change', args=[obj.listing.id])
            return format_html('<a href="{}">{}</a>', url, obj.listing.title)
        return '-'
    listing_link.short_description = 'Listing'
    
    fieldsets = (
        ('Score Breakdown', {
            'fields': ('listing', 'final_score', 'success_rate')
        }),
        ('Score Components', {
            'fields': ('base_score', 'reproducibility_bonus', 'post_sale_bonus', 'seniority_bonus')
        }),
        ('Penalties', {
            'fields': ('penalty_factors',)
        }),
        ('Timestamps', {
            'fields': ('last_calculated_at', 'created_at'),
            'classes': ('collapse',)
        })
    )
    
    actions = ['recalculate_selected_scores']
    
    def recalculate_selected_scores(self, request, queryset):
        from .services import VerificationScoringService
        scoring_service = VerificationScoringService()
        
        recalc_count = 0
        for score_obj in queryset:
            try:
                scoring_service.calculate_listing_score(score_obj.listing)
                recalc_count += 1
            except Exception as e:
                self.message_user(request, f'Error recalculating score for {score_obj.listing.title}: {str(e)}')
        
        self.message_user(request, f'Recalculated {recalc_count} scores successfully.')
    recalculate_selected_scores.short_description = 'Recalculate selected scores'


@admin.register(ReproducibilityTest)
class ReproducibilityTestAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'listing_link', 'tester_link', 'success', 'earnings_reported',
        'roi_percentage', 'would_recommend', 'created_at'
    ]
    list_filter = ['success', 'would_recommend', 'created_at']
    search_fields = ['listing__title', 'tester__username', 'notes']
    readonly_fields = ['created_at', 'updated_at']
    raw_id_fields = ['listing', 'tester']
    
    def listing_link(self, obj):
        if obj.listing:
            url = reverse('admin:listings_listing_change', args=[obj.listing.id])
            return format_html('<a href="{}">{}</a>', url, obj.listing.title)
        return '-'
    listing_link.short_description = 'Listing'
    
    def tester_link(self, obj):
        if obj.tester:
            url = reverse('admin:auth_user_change', args=[obj.tester.id])
            return format_html('<a href="{}">{}</a>', url, obj.tester.username)
        return '-'
    tester_link.short_description = 'Tester'


@admin.register(PostSaleReport)
class PostSaleReportAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'transaction_link', 'buyer_link', 'success', 'earnings',
        'satisfaction_score', 'would_recommend', 'created_at'
    ]
    list_filter = ['success', 'would_recommend', 'would_purchase_again', 'created_at']
    search_fields = ['transaction__listing__title', 'buyer__username', 'feedback']
    readonly_fields = ['created_at', 'updated_at']
    raw_id_fields = ['transaction', 'buyer']
    
    def transaction_link(self, obj):
        if obj.transaction:
            url = reverse('admin:transactions_transaction_change', args=[obj.transaction.id])
            return format_html('<a href="{}">{}</a>', url, f"Transaction {obj.transaction.id}")
        return '-'
    transaction_link.short_description = 'Transaction'
    
    def buyer_link(self, obj):
        if obj.buyer:
            url = reverse('admin:auth_user_change', args=[obj.buyer.id])
            return format_html('<a href="{}">{}</a>', url, obj.buyer.username)
        return '-'
    buyer_link.short_description = 'Buyer'


# Custom admin site for verification management
class VerificationAdminSite(admin.AdminSite):
    site_header = 'AIM Verification System'
    site_title = 'Verification Admin'
    index_template = 'admin/verification_index.html'
    
    def get_urls(self):
        from django.urls import path
        urls = super().get_urls()
        custom_urls = [
            path('verification-dashboard/', self.admin_view(self.verification_dashboard), name='verification-dashboard'),
            path('queue-stats/', self.admin_view(self.queue_stats), name='queue-stats'),
        ]
        return custom_urls + urls
    
    def verification_dashboard(self, request):
        """Custom verification dashboard"""
        from django.template.response import TemplateResponse
        from django.db.models import Count, Avg
        from django.utils import timezone
        from datetime import timedelta
        
        # Get statistics
        stats = {
            'total_queue_items': VerificationQueue.objects.count(),
            'pending_items': VerificationQueue.objects.filter(status='pending').count(),
            'in_progress_items': VerificationQueue.objects.filter(status='in_progress').count(),
            'completed_today': VerificationQueue.objects.filter(
                completed_at__date=timezone.now().date()
            ).count(),
            'total_verifications': Verification.objects.count(),
            'avg_confidence': Verification.objects.aggregate(
                avg_conf=Avg('confidence_score')
            )['avg_conf'] or 0,
            'verified_listings': Listing.objects.filter(verification_status='verified').count(),
            'rejected_listings': Listing.objects.filter(verification_status='rejected').count(),
        }
        
        # Get recent activity
        recent_verifications = Verification.objects.order_by('-created_at')[:10]
        recent_queue_items = VerificationQueue.objects.order_by('-created_at')[:10]
        
        context = {
            **self.each_context(request),
            'stats': stats,
            'recent_verifications': recent_verifications,
            'recent_queue_items': recent_queue_items,
            'title': 'Verification Dashboard',
        }
        
        return TemplateResponse(request, 'admin/verification_dashboard.html', context)
    
    def queue_stats(self, request):
        """Queue statistics"""
        from django.http import JsonResponse
        from django.db.models import Count
        
        stats = VerificationQueue.objects.values('status').annotate(count=Count('id'))
        priority_stats = VerificationQueue.objects.values('priority').annotate(count=Count('id'))
        
        return JsonResponse({
            'status_stats': list(stats),
            'priority_stats': list(priority_stats)
        })


# Create custom admin site instance
verification_admin = VerificationAdminSite(name='verification_admin')

# Register models with custom admin site
verification_admin.register(Proof, ProofAdmin)
verification_admin.register(Verification, VerificationAdmin)
verification_admin.register(VerificationQueue, VerificationQueueAdmin)
verification_admin.register(VerificationConsensus, VerificationConsensusAdmin)
verification_admin.register(VerificationScore, VerificationScoreAdmin)
verification_admin.register(ReproducibilityTest, ReproducibilityTestAdmin)
verification_admin.register(PostSaleReport, PostSaleReportAdmin)


@admin.register(ListingDemo)
class ListingDemoAdmin(admin.ModelAdmin):
    list_display  = ['id', 'listing_title', 'demo_category', 'file_count_display', 'is_approved', 'approved_by', 'created_at']
    list_filter   = ['is_approved', 'demo_category', 'created_at']
    search_fields = ['listing__title', 'demo_text']
    readonly_fields = ['created_at', 'updated_at', 'approved_at']
    raw_id_fields   = ['listing', 'approved_by']
    actions         = ['approve_demos', 'reject_demos']

    def listing_title(self, obj):
        return obj.listing.title if obj.listing else '-'
    listing_title.short_description = 'Listing'

    def file_count_display(self, obj):
        return obj.file_count
    file_count_display.short_description = '# Files'

    def approve_demos(self, request, queryset):
        from django.utils import timezone
        updated = queryset.update(is_approved=True, approved_by=request.user, approved_at=timezone.now(), rejection_reason='')
        self.message_user(request, f'{updated} demo(s) approved.')
    approve_demos.short_description = 'Approve selected demos'

    def reject_demos(self, request, queryset):
        updated = queryset.update(is_approved=False, rejection_reason='Rejected by admin')
        self.message_user(request, f'{updated} demo(s) rejected.')
    reject_demos.short_description = 'Reject selected demos'

verification_admin.register(ListingDemo, ListingDemoAdmin)
