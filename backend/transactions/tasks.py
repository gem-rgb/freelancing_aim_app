"""
Celery tasks for transactions app.
"""
import logging
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(name="transactions.tasks.auto_release_escrow")
def auto_release_escrow():
    """
    Auto-release transactions that have been in escrow past their expires_at time.
    This simulates buyer confirmation after 72 hours of no dispute.
    """
    from .models import Transaction, EscrowRelease, TransactionLog

    expired = Transaction.objects.filter(
        status="escrow",
        expires_at__lte=timezone.now(),
    )
    count = 0
    for txn in expired:
        try:
            txn.status = "released"
            txn.released_at = timezone.now()
            txn.save(update_fields=["status", "released_at"])

            EscrowRelease.objects.get_or_create(
                transaction=txn,
                defaults={
                    "released_by_id": txn.seller_id,
                    "release_type": "auto",
                },
            )
            TransactionLog.objects.create(
                transaction=txn,
                action="key_released",
                description="Auto-released by system after escrow timeout.",
            )
            count += 1
            logger.info(f"Auto-released transaction {txn.id}")
        except Exception as e:
            logger.error(f"Auto-release error for {txn.id}: {e}")

    logger.info(f"Auto-release complete. {count} transactions released.")
    return count
