from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.utils import timezone
from django.db.models import Avg, Count
from .models import Verification, VerificationConsensus, PostSaleReport, ReproducibilityTest
from .services import VerificationWorkflowService, VerificationScoringService
from listings.models import Listing
from transactions.models import Transaction


@receiver(post_save, sender=Verification)
def verification_created(sender, instance, created, **kwargs):
    """Handle verification creation and update consensus"""
    if created:
        # Schedule consensus update task
        from .tasks import update_consensus_scores
        update_consensus_scores.delay(str(instance.listing.id))
        
        # Update listing status to in_review
        listing = instance.listing
        if listing.verification_status == 'pending':
            listing.verification_status = 'in_review'
            listing.save()


@receiver(post_save, sender=PostSaleReport)
def post_sale_report_created(sender, instance, created, **kwargs):
    """Handle post-sale report creation and update listing success rate"""
    if created:
        # Update listing success rate
        listing = instance.transaction.listing
        reports = PostSaleReport.objects.filter(transaction__listing=listing)
        
        if reports.exists():
            success_count = reports.filter(success=True).count()
            success_rate = (success_count / reports.count()) * 100
            listing.success_rate = success_rate
            listing.save()
        
        # Recalculate verification score
        from .tasks import calculate_verification_scores
        calculate_verification_scores.delay([listing.id])
        
        # Update seller reputation based on report
        if instance.success:
            seller = listing.seller
            seller.reputation_score = min(5.0, seller.reputation_score + 0.1)
        else:
            seller = listing.seller
            seller.reputation_score = max(0.0, seller.reputation_score - 0.2)
        seller.save()


@receiver(post_save, sender=ReproducibilityTest)
def reproducibility_test_created(sender, instance, created, **kwargs):
    """Handle reproducibility test creation and update listing score"""
    if created:
        # Recalculate verification score
        from .tasks import calculate_verification_scores
        calculate_verification_scores.delay([instance.listing.id])
        
        # Update listing risk based on test results
        listing = instance.listing
        all_tests = ReproducibilityTest.objects.filter(listing=listing)
        
        if all_tests.count() >= 3:  # Minimum tests for risk assessment
            success_rate = all_tests.filter(success=True).count() / all_tests.count()
            
            if success_rate >= 0.8:
                listing.risk_level = 'low'
            elif success_rate >= 0.6:
                listing.risk_level = 'medium'
            elif success_rate >= 0.4:
                listing.risk_level = 'high'
            else:
                listing.risk_level = 'extreme'
            
            listing.save()


@receiver(post_save, sender=VerificationConsensus)
def consensus_created(sender, instance, created, **kwargs):
    """Handle consensus creation and update listing status"""
    if created:
        listing = instance.listing
        
        # Update listing status based on consensus
        if instance.final_verdict == 'valid':
            listing.status = 'verified'
            listing.verification_status = 'verified'
            listing.last_verified_at = timezone.now()
            
            # Set verification expiry (e.g., 90 days from now)
            from datetime import timedelta
            listing.verification_expires_at = timezone.now() + timedelta(days=90)
            
        elif instance.final_verdict == 'invalid':
            listing.status = 'rejected'
            listing.verification_status = 'rejected'
            
        elif instance.final_verdict == 'partial':
            listing.status = 'partial'
            listing.verification_status = 'partial'
            listing.last_verified_at = timezone.now()
            listing.verification_expires_at = timezone.now() + timedelta(days=60)
        
        listing.save()
        
        # Calculate verification score
        from .tasks import calculate_verification_scores
        calculate_verification_scores.delay([listing.id])


@receiver(post_save, sender=Transaction)
def transaction_completed(sender, instance, created, **kwargs):
    """Handle transaction completion and trigger post-sale report reminders"""
    if not created and instance.status == 'released':
        # Schedule post-sale report reminder (e.g., 7 days after release)
        from .tasks import send_post_sale_report_reminder
        send_post_sale_report_reminder.delay(str(instance.id))


# Custom signal handlers
def handle_listing_submission(listing):
    """Handle listing submission for verification"""
    workflow_service = VerificationWorkflowService()
    
    # Check if listing has required proofs for verification
    proofs = listing.proofs.all()
    if proofs.exists():
        # Submit for verification
        proofs_data = [{
            'type': proof.type,
            'file_url': proof.file_url,
            'file_size': proof.file_size,
            'metadata': proof.metadata
        } for proof in proofs]
        
        queue_item = workflow_service.submit_for_verification(
            listing, 
            proofs_data,
            priority='medium'
        )
        
        return queue_item
    
    return None


def handle_verification_timeout(queue_item):
    """Handle verification timeout and reassignment"""
    from datetime import timedelta
    
    # Check if verification is taking too long (e.g., 7 days)
    timeout_threshold = timezone.now() - timedelta(days=7)
    
    if queue_item.created_at < timeout_threshold and queue_item.status == 'in_progress':
        # Reassign to different verifier
        workflow_service = VerificationWorkflowService()
        
        # Mark current assignment as failed
        queue_item.assigned_verifier = None
        queue_item.status = 'pending'
        queue_item.save()
        
        # Try to auto-assign to new verifier
        if workflow_service._auto_assign_verifier(queue_item):
            return True
    
    return False


def verify_proof_uniqueness(proof):
    """Verify that proof is unique across the platform"""
    from .models import Proof
    
    # Check for duplicate file hashes
    duplicates = Proof.objects.filter(
        file_hash=proof.file_hash
    ).exclude(id=proof.id)
    
    if duplicates.exists():
        return False, f"Duplicate proof found in {duplicates.count()} other listings"
    
    # Check for similar content (in production, this would use content analysis)
    return True, "Proof is unique"


def calculate_seller_verification_stats(seller):
    """Calculate verification statistics for a seller"""
    listings = Listing.objects.filter(seller=seller)
    
    stats = {
        'total_listings': listings.count(),
        'verified_listings': listings.filter(verification_status='verified').count(),
        'rejected_listings': listings.filter(verification_status='rejected').count(),
        'partial_listings': listings.filter(verification_status='partial').count(),
        'average_verification_score': 0,
        'average_success_rate': 0
    }
    
    if listings.exists():
        verified_listings = listings.filter(verification_status__in=['verified', 'partial'])
        if verified_listings.exists():
            avg_score = verified_listings.aggregate(
                avg_score=Avg('verification_score')
            )['avg_score'] or 0
            stats['average_verification_score'] = avg_score
        
        if listings.filter(success_rate__gt=0).exists():
            avg_success = listings.aggregate(
                avg_success=Avg('success_rate')
            )['avg_success'] or 0
            stats['average_success_rate'] = avg_success
    
    return stats


def detect_verification_anomalies(listing):
    """Detect potential anomalies in verification data"""
    anomalies = []
    
    # Check for unusually high confidence scores
    verifications = listing.verifications.all()
    if verifications.exists():
        avg_confidence = verifications.aggregate(
            avg_conf=Avg('confidence_score')
        )['avg_conf'] or 0
        
        if avg_confidence > 95:
            anomalies.append({
                'type': 'unusually_high_confidence',
                'value': avg_confidence,
                'description': 'Average confidence score is unusually high'
            })
    
    # Check for all verifiers giving identical verdicts
    if verifications.count() >= 3:
        verdicts = list(verifications.values_list('verdict', flat=True))
        if len(set(verdicts)) == 1:
            anomalies.append({
                'type': 'identical_verdicts',
                'value': verdicts[0],
                'description': 'All verifiers gave identical verdicts'
            })
    
    # Check for rapid verification (potential fraud)
    if verifications.exists():
        time_diff = verifications.latest('created_at').created_at - verifications.earliest('created_at').created_at
        if time_diff.total_seconds() < 3600:  # Less than 1 hour
            anomalies.append({
                'type': 'rapid_verification',
                'value': time_diff.total_seconds(),
                'description': 'Verification completed unusually quickly'
            })
    
    return anomalies


def flag_suspicious_activity(listing, anomaly_type, description):
    """Flag suspicious activity for admin review"""
    from .models import SuspiciousActivity
    
    SuspiciousActivity.objects.create(
        listing=listing,
        anomaly_type=anomaly_type,
        description=description,
        status='flagged',
        flagged_at=timezone.now()
    )
    
    # In production, send notification to admins
    print(f"Suspicious activity flagged for listing {listing.id}: {anomaly_type}")


# Connect custom signal handlers
@receiver(post_save, sender=Listing)
def listing_updated(sender, instance, **kwargs):
    """Handle listing updates"""
    # Check if listing was submitted for verification
    if instance.verification_status == 'pending' and not hasattr(instance, '_verification_submitted'):
        instance._verification_submitted = True
        handle_listing_submission(instance)


# Periodic tasks signal
from celery import shared_task

@shared_task
def periodic_verification_health_check():
    """Perform health checks on verification system"""
    issues = []
    
    # Check for stuck verification items
    from datetime import timedelta
    stuck_threshold = timezone.now() - timedelta(days=7)
    stuck_items = VerificationQueue.objects.filter(
        status='in_progress',
        created_at__lt=stuck_threshold
    )
    
    if stuck_items.exists():
        issues.append(f"Found {stuck_items.count()} stuck verification items")
        
        # Try to reassign stuck items
        for item in stuck_items:
            handle_verification_timeout(item)
    
    # Check for listings with expired verifications
    expired_listings = Listing.objects.filter(
        verification_status='verified',
        verification_expires_at__lt=timezone.now(),
        requires_reverification=False
    )
    
    if expired_listings.exists():
        issues.append(f"Found {expired_listings.count()} listings with expired verifications")
        
        # Flag for re-verification
        for listing in expired_listings:
            listing.requires_reverification = True
            listing.save()
    
    # Check for verification consensus anomalies
    verified_listings = Listing.objects.filter(verification_status='verified')
    for listing in verified_listings:
        anomalies = detect_verification_anomalies(listing)
        for anomaly in anomalies:
            issues.append(f"Anomaly detected for listing {listing.id}: {anomaly['type']}")
            flag_suspicious_activity(listing, anomaly['type'], anomaly['description'])
    
    return issues
