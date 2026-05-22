"""
Trust calculation service — weighted scoring for seller reputation.
"""
from decimal import Decimal
from django.utils import timezone
from django.db.models import Avg, Count, Q
from .models import SellerTrustProfile, ReputationBadge, RatingSnapshot
import logging

logger = logging.getLogger(__name__)

# ── Weight configuration ──
WEIGHTS = {
    'successful_txns': Decimal('0.20'),
    'buyer_satisfaction': Decimal('0.20'),
    'verification_success': Decimal('0.15'),
    'escrow_completion': Decimal('0.15'),
    'dispute_penalty': Decimal('0.10'),
    'scam_penalty': Decimal('0.10'),
    'reupload_penalty': Decimal('0.05'),
    'communication': Decimal('0.05'),
}

TIER_THRESHOLDS = [
    ('diamond', 90), ('platinum', 75), ('gold', 60),
    ('silver', 45), ('bronze', 25), ('new', 0),
]


class TrustCalculationService:
    """Recalculates composite trust score for sellers."""

    @classmethod
    def recalculate_for_user(cls, user):
        from transactions.models import Transaction, Review, Dispute
        from fraud_detection.models import FraudReport

        profile, _ = SellerTrustProfile.objects.get_or_create(seller=user)

        total_txns = Transaction.objects.filter(seller=user).count()
        successful = Transaction.objects.filter(seller=user, status='released').count()
        profile.total_transactions = total_txns
        profile.successful_transactions = successful

        # Buyer satisfaction
        reviews = Review.objects.filter(reviewed_user=user)
        avg_rating = reviews.aggregate(avg=Avg('rating'))['avg'] or Decimal('0')
        profile.buyer_satisfaction_avg = Decimal(str(avg_rating)).quantize(Decimal('0.01'))

        # Disputes
        disputes = Dispute.objects.filter(transaction__seller=user).count()
        profile.dispute_frequency = Decimal(str(disputes / max(total_txns, 1) * 100)).quantize(Decimal('0.01'))

        # Scam reports
        scam_reports = FraudReport.objects.filter(reported_user=user, status='confirmed').count()
        profile.scam_reports_received = scam_reports

        # Communication quality from reviews
        profile.communication_quality = profile.buyer_satisfaction_avg

        # Escrow completion
        escrow_completed = Transaction.objects.filter(seller=user, status='released').count()
        profile.escrow_completion_rate = Decimal(str(escrow_completed / max(total_txns, 1) * 100)).quantize(Decimal('0.01'))

        # ── Composite score ──
        score = Decimal('0')
        if total_txns > 0:
            score += WEIGHTS['successful_txns'] * Decimal(str(successful / total_txns * 100))
        score += WEIGHTS['buyer_satisfaction'] * (profile.buyer_satisfaction_avg / Decimal('5') * Decimal('100'))
        score += WEIGHTS['escrow_completion'] * profile.escrow_completion_rate
        score += WEIGHTS['communication'] * (profile.communication_quality / Decimal('5') * Decimal('100'))
        score -= WEIGHTS['dispute_penalty'] * min(profile.dispute_frequency, Decimal('100'))
        score -= WEIGHTS['scam_penalty'] * min(Decimal(str(scam_reports * 20)), Decimal('100'))
        score -= WEIGHTS['reupload_penalty'] * min(Decimal(str(profile.reupload_violations * 25)), Decimal('100'))

        profile.trust_score = max(Decimal('0'), min(Decimal('100'), score.quantize(Decimal('0.01'))))

        # Tier
        for tier_name, threshold in TIER_THRESHOLDS:
            if profile.trust_score >= threshold:
                profile.tier = tier_name
                break

        profile.last_recalculated_at = timezone.now()
        profile.save()

        # Award badges
        cls._check_badges(profile)
        logger.info(f"Trust recalculated for {user.username}: {profile.trust_score} ({profile.tier})")
        return profile

    @classmethod
    def _check_badges(cls, profile):
        badge_rules = {
            'verified_seller': profile.trust_score >= 30,
            'top_rated': profile.buyer_satisfaction_avg >= Decimal('4.5'),
            'dispute_free': profile.dispute_frequency == 0 and profile.total_transactions >= 5,
            'escrow_reliable': profile.escrow_completion_rate >= 95,
            'high_volume': profile.total_transactions >= 50,
        }
        for badge_type, earned in badge_rules.items():
            if earned:
                ReputationBadge.objects.get_or_create(
                    trust_profile=profile, badge_type=badge_type,
                )
            else:
                ReputationBadge.objects.filter(
                    trust_profile=profile, badge_type=badge_type,
                ).delete()

    @classmethod
    def take_daily_snapshot(cls):
        """Background task: snapshot all active seller trust scores."""
        today = timezone.now().date()
        profiles = SellerTrustProfile.objects.all()
        created = 0
        for p in profiles:
            _, was_created = RatingSnapshot.objects.get_or_create(
                trust_profile=p, snapshot_date=today,
                defaults={'trust_score': p.trust_score, 'tier': p.tier},
            )
            if was_created:
                created += 1
        return created
