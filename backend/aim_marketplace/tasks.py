"""
Celery background tasks for escrow, ratings, and task engine.
"""
from celery import shared_task
import logging

logger = logging.getLogger(__name__)


@shared_task(name='escrow.process_scheduled_releases')
def process_scheduled_releases():
    """Release all due escrow stakes."""
    from escrow.services import EscrowService
    count = EscrowService.process_scheduled_releases()
    logger.info(f"Processed {count} scheduled releases")
    return count


@shared_task(name='ratings.take_daily_snapshot')
def take_daily_trust_snapshot():
    """Daily trust score snapshot for historical tracking."""
    from ratings.services import TrustCalculationService
    count = TrustCalculationService.take_daily_snapshot()
    logger.info(f"Created {count} trust snapshots")
    return count


@shared_task(name='ratings.recalculate_all_trust')
def recalculate_all_trust_scores():
    """Periodic recalculation of all seller trust scores."""
    from ratings.services import TrustCalculationService
    from ratings.models import SellerTrustProfile
    profiles = SellerTrustProfile.objects.all()
    count = 0
    for profile in profiles:
        try:
            TrustCalculationService.recalculate_for_user(profile.seller)
            count += 1
        except Exception as e:
            logger.error(f"Failed to recalculate trust for {profile.seller.username}: {e}")
    logger.info(f"Recalculated {count} trust scores")
    return count


@shared_task(name='task_engine.recalculate_rankings')
def recalculate_manager_rankings():
    """Periodic recalculation of manager composite ranking scores."""
    from task_engine.services import TaskAssignmentEngine
    from task_engine.models import ManagerProfile
    weights = TaskAssignmentEngine.get_active_weights()
    profiles = ManagerProfile.objects.all()
    count = 0
    for p in profiles:
        try:
            p.composite_rank_score = TaskAssignmentEngine.calculate_composite_score(p, weights)
            p.save(update_fields=['composite_rank_score', 'updated_at'])
            count += 1
        except Exception as e:
            logger.error(f"Failed to recalculate ranking for {p.manager.username}: {e}")
    logger.info(f"Recalculated {count} manager rankings")
    return count


@shared_task(name='task_engine.expire_overdue_tasks')
def expire_overdue_tasks():
    """Mark overdue tasks as expired and free up manager slots."""
    from django.utils import timezone
    from task_engine.models import VerificationTask, ManagerProfile
    overdue = VerificationTask.objects.filter(
        status__in=['assigned', 'in_progress'],
        due_at__lt=timezone.now(),
    )
    count = 0
    for task in overdue:
        task.status = 'expired'
        task.save(update_fields=['status', 'updated_at'])
        if task.assigned_manager:
            try:
                profile = task.assigned_manager.manager_profile
                profile.active_assignments = max(0, profile.active_assignments - 1)
                profile.save(update_fields=['active_assignments'])
            except ManagerProfile.DoesNotExist:
                pass
        count += 1
    logger.info(f"Expired {count} overdue tasks")
    return count
