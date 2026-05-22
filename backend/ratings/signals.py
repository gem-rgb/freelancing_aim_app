"""Ratings signals — recalculate trust after reviews."""
from django.db.models.signals import post_save
from django.dispatch import receiver
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender='transactions.Review')
def update_trust_on_review(sender, instance, created, **kwargs):
    """Recalculate seller trust profile when a new review is posted."""
    if created:
        try:
            from .services import TrustCalculationService
            TrustCalculationService.recalculate_for_user(instance.reviewed_user)
        except Exception as e:
            logger.error(f"Trust recalculation failed: {e}")
