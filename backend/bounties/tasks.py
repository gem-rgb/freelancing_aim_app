"""
Celery tasks for bounties app.
"""
import logging
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(name="bounties.tasks.expire_bounties")
def expire_bounties():
    """Expire bounties that have passed their deadline."""
    from .models import Bounty

    expired = Bounty.objects.filter(
        status="open",
        expires_at__lte=timezone.now(),
    )
    count = expired.update(status="expired")
    logger.info(f"Expired {count} bounties.")

    # Also close those past deadline
    deadline_passed = Bounty.objects.filter(
        status="open",
        deadline__lte=timezone.now(),
    )
    count2 = deadline_passed.update(status="expired")
    logger.info(f"Expired {count2} bounties past deadline.")

    return count + count2
