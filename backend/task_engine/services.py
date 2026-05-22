"""
Task assignment engine — weighted randomized distribution.
"""
import random
from datetime import timedelta
from decimal import Decimal
from django.db import models as db_models
from django.utils import timezone
from django.db import transaction as db_transaction
from .models import ManagerProfile, VerificationTask, TaskConsensus, AssignmentWeightConfig
import logging

logger = logging.getLogger(__name__)


class TaskAssignmentEngine:
    """Intelligent distributed task assignment with weighted randomization."""

    @classmethod
    def get_active_weights(cls):
        config = AssignmentWeightConfig.objects.filter(is_active=True).first()
        if not config:
            config = AssignmentWeightConfig.objects.create(name='default')
        return config

    @classmethod
    def calculate_composite_score(cls, profile, weights):
        """Calculate composite ranking score for a manager."""
        score = Decimal('0')
        score += weights.qualification_weight * profile.qualification_score
        score += weights.experience_weight * profile.experience_score
        score += weights.verification_accuracy_weight * profile.verification_accuracy
        score += weights.scam_detection_weight * profile.scam_detection_accuracy
        score += weights.seller_rating_weight * (profile.seller_rating_avg * Decimal('20'))
        score += weights.buyer_rating_weight * (profile.buyer_rating_avg * Decimal('20'))
        score += weights.activity_weight * min(profile.platform_activity_hours / Decimal('100'), Decimal('100'))
        score += weights.consistency_weight * profile.task_completion_consistency
        speed_score = max(Decimal('0'), Decimal('100') - profile.avg_response_speed_minutes / Decimal('10'))
        score += weights.speed_weight * speed_score
        score += weights.trust_weight * profile.trust_score
        return score.quantize(Decimal('0.0001'))

    @classmethod
    def rank_available_managers(cls):
        """Return managers sorted by composite score with randomization."""
        weights = cls.get_active_weights()
        managers = ManagerProfile.objects.filter(
            is_available=True,
        ).select_related('manager')

        scored = []
        for m in managers:
            if m.active_assignments >= m.max_concurrent_assignments:
                continue
            base_score = cls.calculate_composite_score(m, weights)
            noise = Decimal(str(random.uniform(0, float(weights.randomization_factor) * 100)))
            final = base_score + noise
            scored.append((m, final))

        scored.sort(key=lambda x: x[1], reverse=True)
        return scored

    @classmethod
    def create_chunk_tasks(cls, listing, num_chunks=3):
        """Split a listing into randomized verification chunks."""
        tasks = []
        batch_label = f"batch_{listing.id}_{timezone.now().strftime('%Y%m%d%H%M')}"
        chunk_indices = list(range(num_chunks))
        random.shuffle(chunk_indices)

        for i, idx in enumerate(chunk_indices):
            task = VerificationTask.objects.create(
                listing=listing,
                chunk_index=idx,
                total_chunks=num_chunks,
                randomized_batch_label=batch_label,
                chunk_data_ref=f"chunk:{listing.id}:{idx}",
            )
            tasks.append(task)
        return tasks

    @classmethod
    def assign_tasks(cls, tasks):
        """Assign a list of tasks to ranked managers. No manager sees all chunks."""
        ranked = cls.rank_available_managers()
        if not ranked:
            logger.warning("No available managers for task assignment")
            return []

        assignments = []
        used_managers = set()

        for task in tasks:
            for profile, score in ranked:
                if profile.manager_id in used_managers:
                    continue
                with db_transaction.atomic():
                    task.assigned_manager = profile.manager
                    task.status = 'assigned'
                    task.assignment_weight = score
                    task.assigned_at = timezone.now()
                    task.due_at = timezone.now() + timedelta(hours=48)
                    task.save()

                    profile.active_assignments += 1
                    profile.total_tasks_assigned += 1
                    profile.last_assignment_at = timezone.now()
                    profile.save(update_fields=['active_assignments', 'total_tasks_assigned', 'last_assignment_at'])

                    used_managers.add(profile.manager_id)
                    assignments.append((task, profile))
                break

        logger.info(f"Assigned {len(assignments)} tasks across {len(used_managers)} managers")
        return assignments

    @classmethod
    def complete_task(cls, task, decision, score, notes='', duration_minutes=None):
        """Record a manager's review of a chunk task."""
        with db_transaction.atomic():
            task.decision = decision
            task.review_score = Decimal(str(score))
            task.review_notes = notes
            task.review_duration_minutes = duration_minutes
            task.status = 'completed'
            task.completed_at = timezone.now()
            task.save()

            profile = task.assigned_manager.manager_profile
            profile.active_assignments = max(0, profile.active_assignments - 1)
            profile.total_tasks_completed += 1
            profile.save(update_fields=['active_assignments', 'total_tasks_completed'])

            cls._update_consensus(task.listing)

    @classmethod
    def _update_consensus(cls, listing):
        """Update listing consensus based on completed chunk reviews."""
        tasks = VerificationTask.objects.filter(listing=listing, status='completed')
        total = tasks.count()
        if total == 0:
            return

        clean = tasks.filter(decision='clean').count()
        suspicious = tasks.filter(decision='suspicious').count()
        fraud = tasks.filter(decision='fraud_signal').count()
        escalated = tasks.filter(decision='escalate').count()

        consensus, _ = TaskConsensus.objects.get_or_create(listing=listing)
        consensus.total_reviews = total
        consensus.clean_count = clean
        consensus.suspicious_count = suspicious
        consensus.fraud_count = fraud
        consensus.escalated_count = escalated

        if total >= listing.verification_tasks.count():
            if fraud > 0 or escalated > 0:
                consensus.consensus_status = 'escalated'
                consensus.final_decision = 'escalate'
            elif suspicious > clean:
                consensus.consensus_status = 'split_verdict'
                consensus.final_decision = 'suspicious'
            else:
                consensus.consensus_status = 'consensus_reached'
                consensus.final_decision = 'clean'
            consensus.determined_at = timezone.now()

        avg_score = tasks.aggregate(avg=db_models.Avg('review_score'))['avg'] or 0
        consensus.aggregate_score = Decimal(str(avg_score))
        consensus.save()
