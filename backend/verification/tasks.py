from celery import shared_task
from django.utils import timezone
from django.db import transaction
from django.contrib.auth import get_user_model
from .models import VerificationQueue, Verification, VerificationConsensus, VerificationScore
from .services import VerificationWorkflowService, VerificationScoringService
from listings.models import Listing

User = get_user_model()


@shared_task(bind=True, max_retries=3)
def process_verification_queue(self):
    """Process verification queue and assign items to verifiers"""
    try:
        workflow_service = VerificationWorkflowService()
        
        # Get pending items
        pending_items = VerificationQueue.objects.filter(status='pending').order_by('priority', 'created_at')
        
        processed_count = 0
        for queue_item in pending_items:
            try:
                if workflow_service._should_auto_assign():
                    success = workflow_service._auto_assign_verifier(queue_item)
                    if success:
                        processed_count += 1
                        
                        # Send notification to assigned verifier
                        send_verification_assignment_notification.delay(queue_item.id)
                        
            except Exception as e:
                print(f"Failed to process queue item {queue_item.id}: {str(e)}")
                continue
        
        return f"Processed {processed_count} verification items"
        
    except Exception as e:
        self.retry(exc=e, countdown=60)


@shared_task(bind=True, max_retries=2)
def validate_proofs(self, proof_ids):
    """Validate proof files asynchronously"""
    try:
        from .services import ProofValidationService
        
        validator = ProofValidationService()
        validated_count = 0
        
        for proof_id in proof_ids:
            try:
                from .models import Proof
                proof = Proof.objects.get(id=proof_id)
                
                is_valid, message, validation_data = validator.validate_proof(proof)
                
                # Update proof with validation results
                proof.is_validated = is_valid
                proof.validation_notes = message
                proof.save()
                
                validated_count += 1
                
            except Proof.DoesNotExist:
                continue
            except Exception as e:
                print(f"Failed to validate proof {proof_id}: {str(e)}")
                continue
        
        return f"Validated {validated_count} proofs"
        
    except Exception as e:
        self.retry(exc=e, countdown=30)


@shared_task(bind=True, max_retries=2)
def calculate_verification_scores(self, listing_ids=None):
    """Calculate verification scores for listings"""
    try:
        scoring_service = VerificationScoringService()
        
        if listing_ids:
            listings = Listing.objects.filter(id__in=listing_ids)
        else:
            # Calculate for all listings that need scoring
            listings = Listing.objects.filter(
                verification_status__in=['verified', 'partial']
            )
        
        calculated_count = 0
        for listing in listings:
            try:
                scoring_service.calculate_listing_score(listing)
                calculated_count += 1
            except Exception as e:
                print(f"Failed to calculate score for listing {listing.id}: {str(e)}")
                continue
        
        return f"Calculated scores for {calculated_count} listings"
        
    except Exception as e:
        self.retry(exc=e, countdown=60)


@shared_task(bind=True, max_retries=1)
def update_consensus_scores(self, listing_id):
    """Update consensus and score for a specific listing"""
    try:
        listing = Listing.objects.get(id=listing_id)
        
        # Update consensus
        workflow_service = VerificationWorkflowService()
        workflow_service._update_consensus(listing)
        
        # Calculate score
        scoring_service = VerificationScoringService()
        score_data = scoring_service.calculate_listing_score(listing)
        
        return f"Updated consensus and score for listing {listing_id}: {score_data['final_score']}"
        
    except Listing.DoesNotExist:
        return f"Listing {listing_id} not found"
    except Exception as e:
        self.retry(exc=e, countdown=30)


@shared_task(bind=True, max_retries=2)
def check_verification_expiry(self):
    """Check for expired verifications and flag for re-verification"""
    try:
        expired_listings = Listing.objects.filter(
            verification_status='verified',
            verification_expires_at__lt=timezone.now()
        )
        
        expired_count = 0
        for listing in expired_listings:
            try:
                listing.requires_reverification = True
                listing.verification_status = 'pending'
                listing.save()
                
                # Create new verification queue item
                VerificationQueue.objects.create(
                    listing=listing,
                    priority='medium',
                    special_instructions='Re-verification required - previous verification expired'
                )
                
                expired_count += 1
                
                # Notify seller
                send_reverification_notification.delay(listing.id)
                
            except Exception as e:
                print(f"Failed to process expired listing {listing.id}: {str(e)}")
                continue
        
        return f"Flagged {expired_count} listings for re-verification"
        
    except Exception as e:
        self.retry(exc=e, countdown=3600)  # Retry in 1 hour


@shared_task(bind=True, max_retries=1)
def send_verification_assignment_notification(self, queue_item_id):
    """Send notification to assigned verifier"""
    try:
        queue_item = VerificationQueue.objects.get(id=queue_item_id)
        
        if queue_item.assigned_verifier:
            # In production, send email/push notification
            print(f"Notification sent to verifier {queue_item.assigned_verifier.username} for listing {queue_item.listing.title}")
            
        return f"Sent notification for queue item {queue_item_id}"
        
    except VerificationQueue.DoesNotExist:
        return f"Queue item {queue_item_id} not found"
    except Exception as e:
        self.retry(exc=e, countdown=30)


@shared_task(bind=True, max_retries=1)
def send_reverification_notification(self, listing_id):
    """Send notification to seller about re-verification requirement"""
    try:
        listing = Listing.objects.get(id=listing_id)
        
        # In production, send email to seller
        print(f"Re-verification notification sent to seller {listing.seller.username} for listing {listing.title}")
        
        return f"Sent re-verification notification for listing {listing_id}"
        
    except Listing.DoesNotExist:
        return f"Listing {listing_id} not found"
    except Exception as e:
        self.retry(exc=e, countdown=30)


@shared_task(bind=True, max_retries=2)
def generate_verification_report(self, date_range=None):
    """Generate daily/weekly verification reports"""
    try:
        from datetime import timedelta
        
        if date_range:
            start_date, end_date = date_range
        else:
            # Default to last 24 hours
            end_date = timezone.now()
            start_date = end_date - timedelta(days=1)
        
        # Gather statistics
        total_verifications = Verification.objects.filter(
            created_at__range=[start_date, end_date]
        ).count()
        
        completed_queue_items = VerificationQueue.objects.filter(
            completed_at__range=[start_date, end_date]
        ).count()
        
        new_consensus = VerificationConsensus.objects.filter(
            created_at__range=[start_date, end_date]
        ).count()
        
        report_data = {
            'period': f"{start_date.date()} to {end_date.date()}",
            'total_verifications': total_verifications,
            'completed_queue_items': completed_queue_items,
            'new_consensus': new_consensus,
            'generated_at': timezone.now().isoformat()
        }
        
        # In production, send report to admins
        print(f"Verification report generated: {report_data}")
        
        return report_data
        
    except Exception as e:
        self.retry(exc=e, countdown=60)


@shared_task(bind=True, max_retries=1)
def cleanup_old_verification_data(self):
    """Clean up old verification data"""
    try:
        from datetime import timedelta
        
        # Delete old verification queue items that were completed more than 90 days ago
        cutoff_date = timezone.now() - timedelta(days=90)
        
        deleted_count = VerificationQueue.objects.filter(
            status='completed',
            completed_at__lt=cutoff_date
        ).delete()[0]
        
        return f"Cleaned up {deleted_count} old verification queue items"
        
    except Exception as e:
        self.retry(exc=e, countdown=3600)


# Periodic tasks
@shared_task
def periodic_verification_tasks():
    """Run all periodic verification tasks"""
    try:
        results = []
        
        # Check for expired verifications
        result1 = check_verification_expiry.delay()
        results.append(f"Expiry check: {result1.id}")
        
        # Generate daily report
        result2 = generate_verification_report.delay()
        results.append(f"Report generation: {result2.id}")
        
        # Process verification queue
        result3 = process_verification_queue.delay()
        results.append(f"Queue processing: {result3.id}")
        
        return f"Scheduled periodic tasks: {', '.join(results)}"
        
    except Exception as e:
        return f"Failed to schedule periodic tasks: {str(e)}"
