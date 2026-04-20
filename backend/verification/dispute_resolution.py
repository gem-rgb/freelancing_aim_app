from django.utils import timezone
from django.db import transaction
from django.contrib.auth import get_user_model
from typing import Dict, List, Optional, Tuple
from enum import Enum
import json

from transactions.models import Dispute, Transaction
from listings.models import Listing
from .models import Verification, PostSaleReport, ReproducibilityTest

User = get_user_model()


class DisputeCategory(Enum):
    """Categories for dispute classification"""
    METHOD_NOT_WORKING = "method_not_working"
    MISREPRESENTATION = "misrepresentation"
    CONTENT_MISSING = "content_missing"
    QUALITY_ISSUES = "quality_issues"
    TECHNICAL_ISSUES = "technical_issues"
    SUPPORT_ISSUES = "support_issues"
    FRAUD_SUSPECTED = "fraud_suspected"
    OTHER = "other"


class DisputeSeverity(Enum):
    """Severity levels for disputes"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class DisputeResolutionService:
    """Service for handling enhanced dispute resolution"""
    
    def __init__(self):
        self.escalation_threshold = 3  # Number of disputes before escalation
        self.resolution_timeouts = {
            'low': 7,      # days
            'medium': 5,   # days
            'high': 3,     # days
            'critical': 1  # days
        }
    
    def analyze_dispute(self, dispute: Dispute) -> Dict:
        """Analyze a dispute and provide recommendations"""
        try:
            analysis = {
                'category': self._categorize_dispute(dispute),
                'severity': self._assess_severity(dispute),
                'risk_factors': self._identify_risk_factors(dispute),
                'evidence_score': self._calculate_evidence_score(dispute),
                'recommendations': [],
                'auto_resolution_possible': False,
                'escalation_required': False
            }
            
            # Get transaction and listing data
            transaction = dispute.transaction
            listing = transaction.listing
            
            # Check for similar disputes
            similar_disputes = Dispute.objects.filter(
                transaction__listing=listing
            ).exclude(id=dispute.id)
            
            analysis['similar_disputes_count'] = similar_disputes.count()
            
            # Check listing verification status
            verification_consensus = listing.verification_consensus
            if verification_consensus:
                analysis['verification_status'] = verification_consensus.final_verdict
                analysis['verification_confidence'] = verification_consensus.confidence_score
            else:
                analysis['verification_status'] = 'not_verified'
                analysis['verification_confidence'] = 0
            
            # Check post-sale reports
            post_sale_reports = PostSaleReport.objects.filter(
                transaction__listing=listing
            )
            analysis['post_sale_reports_count'] = post_sale_reports.count()
            
            if post_sale_reports.exists():
                success_rate = post_sale_reports.filter(success=True).count() / post_sale_reports.count()
                analysis['post_sale_success_rate'] = success_rate
            
            # Check reproducibility tests
            repro_tests = ReproducibilityTest.objects.filter(listing=listing)
            analysis['reproducibility_tests_count'] = repro_tests.count()
            
            if repro_tests.exists():
                test_success_rate = repro_tests.filter(success=True).count() / repro_tests.count()
                analysis['reproducibility_success_rate'] = test_success_rate
            
            # Generate recommendations
            analysis['recommendations'] = self._generate_recommendations(analysis)
            
            # Check for auto-resolution
            analysis['auto_resolution_possible'] = self._can_auto_resolve(dispute, analysis)
            
            # Check for escalation
            analysis['escalation_required'] = self._requires_escalation(dispute, analysis)
            
            return analysis
            
        except Exception as e:
            raise Exception(f"Failed to analyze dispute: {str(e)}")
    
    def _categorize_dispute(self, dispute: Dispute) -> DisputeCategory:
        """Categorize the dispute based on content"""
        claim_text = dispute.buyer_claim.lower()
        response_text = dispute.seller_response.lower() if dispute.seller_response else ""
        
        # Keyword-based categorization
        category_keywords = {
            DisputeCategory.METHOD_NOT_WORKING: [
                'not working', 'doesn\'t work', 'failed', 'broken', 'method failed'
            ],
            DisputeCategory.MISREPRESENTATION: [
                'misleading', 'wrong', 'different', 'not as described', 'false'
            ],
            DisputeCategory.CONTENT_MISSING: [
                'missing', 'not included', 'incomplete', 'no content', 'empty'
            ],
            DisputeCategory.QUALITY_ISSUES: [
                'quality', 'poor', 'bad', 'low quality', 'substandard'
            ],
            DisputeCategory.TECHNICAL_ISSUES: [
                'technical', 'error', 'bug', 'glitch', 'crash', 'issue'
            ],
            DisputeCategory.SUPPORT_ISSUES: [
                'support', 'help', 'response', 'communication', 'contact'
            ],
            DisputeCategory.FRAUD_SUSPECTED: [
                'fraud', 'scam', 'fake', 'dishonest', 'deceptive'
            ]
        }
        
        # Check keywords in claim and response
        for category, keywords in category_keywords.items():
            for keyword in keywords:
                if keyword in claim_text or keyword in response_text:
                    return category
        
        return DisputeCategory.OTHER
    
    def _assess_severity(self, dispute: Dispute) -> DisputeSeverity:
        """Assess the severity of the dispute"""
        # Base severity on transaction amount
        amount = dispute.transaction.amount
        
        if amount >= 10000:
            base_severity = DisputeSeverity.HIGH
        elif amount >= 5000:
            base_severity = DisputeSeverity.MEDIUM
        elif amount >= 1000:
            base_severity = DisputeSeverity.LOW
        else:
            base_severity = DisputeSeverity.LOW
        
        # Upgrade severity based on category
        category = self._categorize_dispute(dispute)
        if category == DisputeCategory.FRAUD_SUSPECTED:
            return DisputeSeverity.CRITICAL
        elif category == DisputeCategory.METHOD_NOT_WORKING:
            return DisputeSeverity.HIGH
        elif category == DisputeCategory.MISREPRESENTATION:
            return DisputeSeverity.MEDIUM
        
        return base_severity
    
    def _identify_risk_factors(self, dispute: Dispute) -> List[Dict]:
        """Identify risk factors in the dispute"""
        risk_factors = []
        
        # Check seller's dispute history
        seller_disputes = Dispute.objects.filter(
            transaction__seller=dispute.transaction.seller
        )
        
        if seller_disputes.count() >= 5:
            risk_factors.append({
                'type': 'high_dispute_rate',
                'severity': 'high',
                'description': f'Seller has {seller_disputes.count()} disputes'
            })
        
        # Check seller's reputation
        seller_rep = dispute.transaction.seller.reputation_score
        if seller_rep < 3.0:
            risk_factors.append({
                'type': 'low_reputation',
                'severity': 'medium',
                'description': f'Seller reputation: {seller_rep}'
            })
        
        # Check listing verification
        listing = dispute.transaction.listing
        if listing.verification_status != 'verified':
            risk_factors.append({
                'type': 'unverified_listing',
                'severity': 'high',
                'description': 'Listing is not verified'
            })
        
        # Check for multiple disputes on same listing
        listing_disputes = Dispute.objects.filter(
            transaction__listing=listing
        )
        
        if listing_disputes.count() >= 3:
            risk_factors.append({
                'type': 'problematic_listing',
                'severity': 'critical',
                'description': f'Listing has {listing_disputes.count()} disputes'
            })
        
        return risk_factors
    
    def _calculate_evidence_score(self, dispute: Dispute) -> float:
        """Calculate evidence quality score (0-100)"""
        score = 0.0
        
        # Buyer claim length and detail
        claim_length = len(dispute.buyer_claim)
        if claim_length > 500:
            score += 20
        elif claim_length > 200:
            score += 10
        elif claim_length > 50:
            score += 5
        
        # Seller response presence and detail
        if dispute.seller_response:
            response_length = len(dispute.seller_response)
            if response_length > 500:
                score += 20
            elif response_length > 200:
                score += 10
            elif response_length > 50:
                score += 5
        else:
            score -= 10  # Penalty for no response
        
        # Post-sale report if available
        try:
            post_sale_report = PostSaleReport.objects.get(transaction=dispute.transaction)
            if post_sale_report.feedback and len(post_sale_report.feedback) > 100:
                score += 15
        except PostSaleReport.DoesNotExist:
            pass
        
        # Screenshots or evidence mentioned
        claim_text = dispute.buyer_claim.lower()
        evidence_keywords = ['screenshot', 'proof', 'evidence', 'image', 'photo', 'video']
        evidence_count = sum(1 for keyword in evidence_keywords if keyword in claim_text)
        score += min(evidence_count * 5, 15)
        
        return min(max(score, 0), 100)
    
    def _generate_recommendations(self, analysis: Dict) -> List[str]:
        """Generate resolution recommendations"""
        recommendations = []
        
        category = analysis['category']
        severity = analysis['severity']
        evidence_score = analysis['evidence_score']
        
        # Evidence-based recommendations
        if evidence_score < 30:
            recommendations.append("Request more evidence from both parties")
        
        if evidence_score < 50:
            recommendations.append("Schedule a video call with both parties")
        
        # Category-based recommendations
        if category == DisputeCategory.METHOD_NOT_WORKING:
            recommendations.append("Request step-by-step reproduction attempt")
            recommendations.append("Check for technical requirements or missing dependencies")
        
        elif category == DisputeCategory.MISREPRESENTATION:
            recommendations.append("Review listing content against actual delivery")
            recommendations.append("Check for false advertising claims")
        
        elif category == DisputeCategory.CONTENT_MISSING:
            recommendations.append("Verify file delivery and access")
            recommendations.append("Check for incomplete package delivery")
        
        # Severity-based recommendations
        if severity == DisputeSeverity.CRITICAL:
            recommendations.append("Immediate escalation to senior admin")
            recommendations.append("Consider temporary suspension of seller")
        
        elif severity == DisputeSeverity.HIGH:
            recommendations.append("Priority handling required")
            recommendations.append("Consider partial refund option")
        
        # Verification-based recommendations
        if analysis.get('verification_status') == 'not_verified':
            recommendations.append("Require listing verification before resolution")
        
        if analysis.get('post_sale_success_rate', 1.0) < 0.5:
            recommendations.append("Investigate pattern of issues with this listing")
        
        return recommendations
    
    def _can_auto_resolve(self, dispute: Dispute, analysis: Dict) -> bool:
        """Check if dispute can be auto-resolved"""
        # Auto-resolution conditions
        conditions = []
        
        # Low severity and high evidence score
        if (analysis['severity'] == DisputeSeverity.LOW and 
            analysis['evidence_score'] > 80):
            conditions.append('low_severity_high_evidence')
        
        # Clear seller admission of fault
        if (dispute.seller_response and 
            any(keyword in dispute.seller_response.lower() 
                for keyword in ['mistake', 'error', 'wrong', 'apologize'])):
            conditions.append('seller_admission')
        
        # High verification score and low dispute history
        if (analysis.get('verification_confidence', 0) > 90 and 
            analysis.get('similar_disputes_count', 0) == 0):
            conditions.append('high_verification_no_history')
        
        return len(conditions) >= 2
    
    def _requires_escalation(self, dispute: Dispute, analysis: Dict) -> bool:
        """Check if dispute requires escalation"""
        escalation_factors = []
        
        # Critical severity
        if analysis['severity'] == DisputeSeverity.CRITICAL:
            escalation_factors.append('critical_severity')
        
        # High dispute count for seller
        if analysis.get('similar_disputes_count', 0) >= 3:
            escalation_factors.append('high_dispute_count')
        
        # Fraud suspected
        if analysis['category'] == DisputeCategory.FRAUD_SUSPECTED:
            escalation_factors.append('fraud_suspected')
        
        # Low evidence score for high-value transaction
        if (dispute.transaction.amount >= 5000 and 
            analysis['evidence_score'] < 30):
            escalation_factors.append('high_value_low_evidence')
        
        return len(escalation_factors) >= 1
    
    def resolve_dispute(self, dispute: Dispute, resolution: Dict, admin_user: User) -> bool:
        """Resolve a dispute with the given resolution"""
        try:
            with transaction.atomic():
                # Update dispute
                dispute.resolution = resolution.get('resolution_type')
                dispute.resolution_details = resolution.get('details', '')
                dispute.admin_notes = resolution.get('admin_notes', '')
                dispute.status = 'resolved'
                dispute.resolved_at = timezone.now()
                dispute.resolved_by = admin_user
                dispute.save()
                
                # Apply resolution actions
                self._apply_resolution_actions(dispute, resolution)
                
                # Update seller reputation
                self._update_seller_reputation(dispute, resolution)
                
                # Update listing verification status if needed
                self._update_listing_status(dispute, resolution)
                
                # Log resolution for analytics
                self._log_dispute_resolution(dispute, resolution)
                
                return True
                
        except Exception as e:
            raise Exception(f"Failed to resolve dispute: {str(e)}")
    
    def _apply_resolution_actions(self, dispute: Dispute, resolution: Dict):
        """Apply actions based on resolution"""
        resolution_type = resolution.get('resolution_type')
        transaction = dispute.transaction
        
        if resolution_type == 'full_refund':
            # Process full refund
            self._process_refund(transaction, transaction.amount)
            
        elif resolution_type == 'partial_refund':
            # Process partial refund
            refund_amount = resolution.get('refund_amount', 0)
            self._process_refund(transaction, refund_amount)
            
        elif resolution_type == 'buyer_favor':
            # Favor buyer - typically full refund
            self._process_refund(transaction, transaction.amount)
            
        elif resolution_type == 'seller_favor':
            # Favor seller - no refund
            pass
            
        elif resolution_type == 'no_action':
            # No action required
            pass
    
    def _process_refund(self, transaction: Transaction, amount: float):
        """Process refund for transaction"""
        # In production, this would integrate with payment gateway
        # For now, we'll just log the action
        print(f"Processing refund of ₦{amount} for transaction {transaction.id}")
        
        # Update transaction status
        transaction.status = 'refunded'
        transaction.save()
    
    def _update_seller_reputation(self, dispute: Dispute, resolution: Dict):
        """Update seller reputation based on dispute resolution"""
        seller = dispute.transaction.seller
        resolution_type = resolution.get('resolution_type')
        
        # Reputation adjustments
        if resolution_type in ['full_refund', 'buyer_favor']:
            seller.reputation_score = max(0.0, seller.reputation_score - 0.5)
        elif resolution_type == 'partial_refund':
            seller.reputation_score = max(0.0, seller.reputation_score - 0.2)
        elif resolution_type == 'seller_favor':
            seller.reputation_score = min(5.0, seller.reputation_score + 0.1)
        
        seller.save()
    
    def _update_listing_status(self, dispute: Dispute, resolution: Dict):
        """Update listing status based on dispute resolution"""
        listing = dispute.transaction.listing
        resolution_type = resolution.get('resolution_type')
        
        if resolution_type in ['full_refund', 'buyer_favor']:
            # Flag listing for review
            listing.requires_reverification = True
            listing.verification_status = 'pending'
            listing.save()
    
    def _log_dispute_resolution(self, dispute: Dispute, resolution: Dict):
        """Log dispute resolution for analytics"""
        # In production, this would store in analytics database
        log_data = {
            'dispute_id': dispute.id,
            'resolution_type': resolution.get('resolution_type'),
            'resolution_time': timezone.now().isoformat(),
            'admin_id': dispute.resolved_by.id,
            'transaction_amount': dispute.transaction.amount,
            'category': self._categorize_dispute(dispute).value,
            'severity': self._assess_severity(dispute).value
        }
        
        print(f"Dispute resolution logged: {json.dumps(log_data)}")


class DisputeAnalyticsService:
    """Service for dispute analytics and reporting"""
    
    def get_dispute_statistics(self, start_date=None, end_date=None) -> Dict:
        """Get comprehensive dispute statistics"""
        try:
            queryset = Dispute.objects.all()
            
            if start_date:
                queryset = queryset.filter(created_at__gte=start_date)
            if end_date:
                queryset = queryset.filter(created_at__lte=end_date)
            
            stats = {
                'total_disputes': queryset.count(),
                'resolved_disputes': queryset.filter(status='resolved').count(),
                'pending_disputes': queryset.filter(status='open').count(),
                'resolution_rate': 0,
                'average_resolution_time': 0,
                'total_disputed_amount': 0,
                'total_refunded_amount': 0,
                'disputes_by_category': {},
                'disputes_by_severity': {},
                'disputes_by_resolution': {},
                'top_disputed_sellers': [],
                'top_disputed_listings': []
            }
            
            # Calculate resolution rate
            if stats['total_disputes'] > 0:
                stats['resolution_rate'] = (stats['resolved_disputes'] / stats['total_disputes']) * 100
            
            # Calculate average resolution time
            resolved_disputes = queryset.filter(status='resolved', resolved_at__isnull=False)
            if resolved_disputes.exists():
                total_time = sum(
                    (d.resolved_at - d.created_at).total_seconds() 
                    for d in resolved_disputes
                )
                stats['average_resolution_time'] = total_time / resolved_disputes.count() / 86400  # Convert to days
            
            # Calculate financial impact
            stats['total_disputed_amount'] = sum(
                d.transaction.amount for d in queryset
            )
            
            # Category breakdown
            resolution_service = DisputeResolutionService()
            for dispute in queryset:
                category = resolution_service._categorize_dispute(dispute).value
                stats['disputes_by_category'][category] = stats['disputes_by_category'].get(category, 0) + 1
                
                severity = resolution_service._assess_severity(dispute).value
                stats['disputes_by_severity'][severity] = stats['disputes_by_severity'].get(severity, 0) + 1
                
                if dispute.resolution:
                    stats['disputes_by_resolution'][dispute.resolution] = stats['disputes_by_resolution'].get(dispute.resolution, 0) + 1
            
            # Top disputed sellers
            seller_disputes = {}
            for dispute in queryset:
                seller_id = dispute.transaction.seller.id
                seller_disputes[seller_id] = seller_disputes.get(seller_id, 0) + 1
            
            stats['top_disputed_sellers'] = [
                {'seller_id': k, 'dispute_count': v}
                for k, v in sorted(seller_disputes.items(), key=lambda x: x[1], reverse=True)[:10]
            ]
            
            # Top disputed listings
            listing_disputes = {}
            for dispute in queryset:
                listing_id = dispute.transaction.listing.id
                listing_disputes[listing_id] = listing_disputes.get(listing_id, 0) + 1
            
            stats['top_disputed_listings'] = [
                {'listing_id': k, 'dispute_count': v}
                for k, v in sorted(listing_disputes.items(), key=lambda x: x[1], reverse=True)[:10]
            ]
            
            return stats
            
        except Exception as e:
            raise Exception(f"Failed to generate dispute statistics: {str(e)}")
    
    def generate_dispute_report(self, start_date, end_date) -> Dict:
        """Generate detailed dispute report"""
        try:
            stats = self.get_dispute_statistics(start_date, end_date)
            
            # Add insights and recommendations
            insights = []
            
            if stats['resolution_rate'] < 70:
                insights.append("Low resolution rate indicates need for better dispute handling process")
            
            if stats['average_resolution_time'] > 5:
                insights.append("High average resolution time suggests process inefficiencies")
            
            # Find problematic patterns
            if 'fraud_suspected' in stats['disputes_by_category']:
                fraud_count = stats['disputes_by_category']['fraud_suspected']
                if fraud_count > stats['total_disputes'] * 0.1:  # More than 10%
                    insights.append("High number of fraud disputes suggests need for better verification")
            
            return {
                'period': f"{start_date.date()} to {end_date.date()}",
                'statistics': stats,
                'insights': insights,
                'generated_at': timezone.now().isoformat()
            }
            
        except Exception as e:
            raise Exception(f"Failed to generate dispute report: {str(e)}")
