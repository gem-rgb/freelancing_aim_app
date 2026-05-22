"""
Escrow service layer — business logic for stake management.
"""
from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from django.db import transaction as db_transaction
from .models import EscrowAccount, StakeEntry, EscrowEvent, ReleaseSchedule
import logging

logger = logging.getLogger(__name__)

SELLER_SALE_STAKE_RATE = Decimal('0.40')
DEFAULT_RELEASE_DELAY_HOURS = 72


class EscrowService:
    """Core escrow business logic."""

    @staticmethod
    def get_or_create_account(user):
        account, _ = EscrowAccount.objects.get_or_create(user=user)
        return account

    @classmethod
    def create_stake_from_sale(cls, seller, transaction_obj, gross_amount):
        """Lock 40% of a sale into escrow. Called after payment confirmation."""
        gross = Decimal(str(gross_amount))
        locked = (gross * SELLER_SALE_STAKE_RATE).quantize(Decimal('0.01'))

        with db_transaction.atomic():
            account = cls.get_or_create_account(seller)
            entry = StakeEntry.objects.create(
                escrow_account=account,
                transaction=transaction_obj,
                gross_sale_amount=gross,
                stake_rate=SELLER_SALE_STAKE_RATE,
                locked_amount=locked,
                estimated_release_at=timezone.now() + timedelta(hours=DEFAULT_RELEASE_DELAY_HOURS),
            )
            account.total_locked += locked
            account.save(update_fields=['total_locked', 'updated_at'])

            EscrowEvent.objects.create(
                stake_entry=entry,
                event_type='stake_created',
                description=f'Locked {locked} from sale of {gross}',
                metadata={'gross': str(gross), 'rate': str(SELLER_SALE_STAKE_RATE)},
            )
            logger.info(f"Stake created: {entry.id} — {locked} locked for {seller.username}")
        return entry

    @classmethod
    def start_verification(cls, stake_entry, actor=None):
        """Mark a stake as undergoing verification."""
        stake_entry.verification_status = 'in_review'
        stake_entry.save(update_fields=['verification_status', 'updated_at'])
        EscrowEvent.objects.create(
            stake_entry=stake_entry, event_type='verification_started',
            actor=actor, description='Verification process initiated',
        )

    @classmethod
    def pass_verification(cls, stake_entry, actor=None):
        """Mark verification as passed and schedule release."""
        with db_transaction.atomic():
            stake_entry.verification_status = 'passed'
            stake_entry.status = 'pending_release'
            stake_entry.save(update_fields=['verification_status', 'status', 'updated_at'])

            release_at = timezone.now() + timedelta(hours=24)
            ReleaseSchedule.objects.create(stake_entry=stake_entry, scheduled_at=release_at)

            EscrowEvent.objects.create(
                stake_entry=stake_entry, event_type='release_scheduled',
                actor=actor, description=f'Release scheduled for {release_at.isoformat()}',
            )

    @classmethod
    def release_stake(cls, stake_entry, actor=None, reason='verification_complete'):
        """Release locked funds to seller."""
        with db_transaction.atomic():
            stake_entry.status = 'released'
            stake_entry.released_at = timezone.now()
            stake_entry.release_reason = reason
            stake_entry.released_by = actor
            stake_entry.save()

            account = stake_entry.escrow_account
            account.total_locked -= stake_entry.locked_amount
            account.total_released += stake_entry.locked_amount
            account.save(update_fields=['total_locked', 'total_released', 'updated_at'])

            EscrowEvent.objects.create(
                stake_entry=stake_entry, event_type='released',
                actor=actor, description=f'Released {stake_entry.locked_amount}',
            )
            logger.info(f"Stake released: {stake_entry.id}")

    @classmethod
    def slash_stake(cls, stake_entry, actor=None, reason='fraud_confirmed'):
        """Slash (confiscate) a stake due to fraud."""
        with db_transaction.atomic():
            stake_entry.status = 'slashed'
            stake_entry.released_at = timezone.now()
            stake_entry.release_reason = reason
            stake_entry.save()

            account = stake_entry.escrow_account
            account.total_locked -= stake_entry.locked_amount
            account.total_slashed += stake_entry.locked_amount
            account.save(update_fields=['total_locked', 'total_slashed', 'updated_at'])

            EscrowEvent.objects.create(
                stake_entry=stake_entry, event_type='slashed',
                actor=actor, description=f'Slashed {stake_entry.locked_amount}: {reason}',
            )
            logger.info(f"Stake slashed: {stake_entry.id} — {reason}")

    @classmethod
    def process_scheduled_releases(cls):
        """Background task: release all due stakes."""
        due = ReleaseSchedule.objects.filter(
            executed=False, cancelled=False, scheduled_at__lte=timezone.now()
        ).select_related('stake_entry')
        count = 0
        for schedule in due:
            entry = schedule.stake_entry
            if entry.status == 'pending_release' and entry.scam_review_status != 'escalated':
                cls.release_stake(entry, reason='scheduled_auto_release')
                schedule.executed = True
                schedule.executed_at = timezone.now()
                schedule.save(update_fields=['executed', 'executed_at'])
                count += 1
        logger.info(f"Processed {count} scheduled releases")
        return count
