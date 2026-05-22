"""
Escrow signals — auto-create stakes when transactions enter escrow.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender='transactions.Transaction')
def auto_stake_on_escrow(sender, instance, **kwargs):
    """When a transaction enters escrow status, auto-create a seller stake."""
    if instance.status == 'escrow':
        from .services import EscrowService
        from .models import StakeEntry
        existing = StakeEntry.objects.filter(transaction=instance).exists()
        if not existing:
            try:
                EscrowService.create_stake_from_sale(
                    seller=instance.seller,
                    transaction_obj=instance,
                    gross_amount=instance.amount,
                )
            except Exception as e:
                logger.error(f"Auto-stake failed for txn {instance.id}: {e}")
