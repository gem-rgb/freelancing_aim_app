"""
Management command: release_escrow
Finds transactions in escrow that have passed their 12-hour window
and automatically releases them (transitions to 'released').

Run via:  python manage.py release_escrow
Cron:     */15 * * * * python manage.py release_escrow
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction as db_transaction
from transactions.models import Transaction, EscrowRelease, TransactionLog
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Auto-release escrow transactions whose 12-hour window has elapsed.'

    def handle(self, *args, **options):
        now = timezone.now()
        due = Transaction.objects.filter(
            status='escrow',
            expires_at__lte=now,
            released_at__isnull=True,
        ).select_related('buyer', 'seller', 'listing')

        count = 0
        for txn in due:
            try:
                with db_transaction.atomic():
                    txn.status      = 'released'
                    txn.released_at = now
                    txn.save(update_fields=['status', 'released_at', 'updated_at'])

                    EscrowRelease.objects.get_or_create(
                        transaction=txn,
                        defaults={
                            'released_by': txn.seller,
                            'release_type': 'auto',
                        },
                    )

                    TransactionLog.objects.create(
                        transaction=txn,
                        action='key_released',
                        description='Auto-released after 12-hour escrow window.',
                    )

                count += 1
                self.stdout.write(self.style.SUCCESS(
                    f'Released: {txn.id} ({txn.buyer.username} → {txn.seller.username})'
                ))
            except Exception as e:
                logger.error(f'Failed to auto-release {txn.id}: {e}')
                self.stderr.write(str(e))

        self.stdout.write(self.style.SUCCESS(f'Done — {count} transaction(s) released.'))
