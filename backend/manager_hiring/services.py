"""
Manager Hiring Services — ML-integrated recruitment pipeline.

Bridges Django models with the FastAPI ML microservice for:
- Resume parsing + qualification scoring
- Interview question generation
- Answer evaluation + cheat detection
- Session-wide risk analysis
"""
import logging
from decimal import Decimal
from django.utils import timezone
from django.db import transaction as db_transaction
from aim_marketplace.ml_client import ml_client
from .models import ManagerApplication, InterviewSession, InterviewQuestion, InterviewAnswer

logger = logging.getLogger(__name__)


class RecruitmentPipeline:
    """End-to-end recruitment automation."""

    @classmethod
    def process_resume(cls, application: ManagerApplication, raw_text: str) -> dict | None:
        """
        Step 1: Send resume text to ML service for NLP extraction + scoring.
        Updates the application with extracted scores.
        """
        result = ml_client.parse_resume_text(raw_text, target_role="manager")
        if not result:
            logger.warning(f"ML service unavailable for resume parsing (app={application.id})")
            return None

        scoring = result.get("scoring", {})
        extraction = result.get("extraction", {})

        with db_transaction.atomic():
            application.overall_score = Decimal(str(scoring.get("overall_score", 0)))
            application.qualification_score = Decimal(str(scoring.get("qualification_score", 0)))
            application.parsed_skills = extraction.get("skills", [])
            application.parsed_education = extraction.get("education", [])
            application.parsed_experience = extraction.get("experience", [])
            application.candidate_vector = scoring.get("candidate_vector", [])
            application.risk_score = Decimal(str(scoring.get("risk_score", 0)))
            application.status = 'qualification_review'
            application.save()

        logger.info(
            f"Resume processed for {application.applicant.username}: "
            f"score={scoring.get('overall_score')}, skills={len(extraction.get('skills', []))}"
        )
        return result

    @classmethod
    def generate_interview_for_application(cls, application: ManagerApplication) -> InterviewSession | None:
        """
        Step 2: Generate adaptive interview questions via ML service.
        Creates InterviewSession with questions persisted in Django.
        """
        result = ml_client.generate_interview(
            candidate_skills=application.parsed_skills or [],
            missing_skills=getattr(application, 'missing_skills', []),
            overall_score=float(application.overall_score or 50),
            num_questions=8,
            difficulty=5 if float(application.overall_score or 50) < 70 else 7,
        )
        if not result:
            logger.warning(f"ML service unavailable for interview generation (app={application.id})")
            return None

        questions_data = result.get("questions", [])
        if not questions_data:
            logger.error(f"No questions generated for app={application.id}")
            return None

        with db_transaction.atomic():
            session = InterviewSession.objects.create(
                application=application,
                total_questions=len(questions_data),
                status='pending',
            )

            for i, q in enumerate(questions_data):
                InterviewQuestion.objects.create(
                    session=session,
                    question_text=q.get("question_text", ""),
                    question_type=q.get("question_type", "technical"),
                    difficulty=q.get("difficulty", 5),
                    expected_topics=q.get("expected_topics", []),
                    order=i + 1,
                )

            application.status = 'interview_scheduled'
            application.save(update_fields=['status', 'updated_at'])

        logger.info(f"Interview generated: {session.id} with {len(questions_data)} questions")
        return session

    @classmethod
    def evaluate_answer(cls, answer: InterviewAnswer) -> dict | None:
        """
        Step 3: Send individual answer to ML service for cheat/AI detection.
        Updates answer record with risk scores.
        """
        result = ml_client.analyze_answer(
            answer_text=answer.answer_text,
            question_text=answer.question.question_text,
            typing_speed_wpm=float(answer.typing_speed_wpm) if answer.typing_speed_wpm else None,
            time_to_answer_seconds=answer.time_to_answer_seconds,
        )
        if not result:
            logger.warning(f"ML service unavailable for answer analysis (answer={answer.id})")
            return None

        with db_transaction.atomic():
            answer.ai_generated_probability = Decimal(str(result.get("ai_generated_probability", 0)))
            answer.cheat_risk_score = Decimal(str(result.get("overall_risk_score", 0)))
            answer.perplexity_score = result.get("perplexity_score")
            answer.stylometric_flags = result.get("stylometric_flags", [])
            answer.risk_level = result.get("risk_level", "low")
            answer.save()

        logger.info(
            f"Answer evaluated: AI prob={result.get('ai_generated_probability')}%, "
            f"risk={result.get('risk_level')}"
        )
        return result

    @classmethod
    def evaluate_full_session(cls, session: InterviewSession) -> dict | None:
        """
        Step 4: Evaluate the complete interview session for cross-answer consistency.
        Updates session with overall cheat risk.
        """
        answers = InterviewAnswer.objects.filter(
            question__session=session
        ).select_related('question')

        if not answers.exists():
            return None

        answer_payloads = [
            {
                "answer_text": a.answer_text,
                "question_text": a.question.question_text,
                "question_type": a.question.question_type,
                "typing_speed_wpm": float(a.typing_speed_wpm) if a.typing_speed_wpm else None,
                "time_to_answer_seconds": a.time_to_answer_seconds,
            }
            for a in answers
        ]

        result = ml_client.analyze_session(answer_payloads)
        if not result:
            logger.warning(f"ML service unavailable for session analysis (session={session.id})")
            return None

        with db_transaction.atomic():
            session.overall_cheat_risk = Decimal(str(result.get("overall_cheat_risk", 0)))
            session.cross_answer_consistency = Decimal(str(result.get("cross_answer_consistency", 100)))
            session.cheat_flags = result.get("flags", [])

            overall_risk = result.get("overall_cheat_risk", 0)
            if overall_risk >= 70:
                session.status = 'flagged'
            elif session.answered_questions >= session.total_questions:
                session.status = 'completed'

            session.save()

        logger.info(
            f"Session evaluated: cheat_risk={result.get('overall_cheat_risk')}%, "
            f"consistency={result.get('cross_answer_consistency')}%"
        )
        return result

    @classmethod
    def compute_final_score(cls, application: ManagerApplication) -> Decimal:
        """
        Step 5: Compute final composite score from qualification + interview + risk.
        """
        sessions = InterviewSession.objects.filter(application=application)
        if not sessions.exists():
            return application.overall_score or Decimal('0')

        best_session = sessions.order_by('-overall_interview_score').first()
        interview_score = float(best_session.overall_interview_score or 0)
        cheat_penalty = float(best_session.overall_cheat_risk or 0)

        qual_score = float(application.qualification_score or 0)
        risk_score = float(application.risk_score or 0)

        # Weighted composite:
        # 40% qualification, 35% interview, -15% cheat risk, -10% resume risk
        final = (
            (qual_score * 0.40)
            + (interview_score * 0.35)
            - (cheat_penalty * 0.15)
            - (risk_score * 0.10)
        )
        final = max(0, min(100, final))

        application.overall_score = Decimal(str(round(final, 2)))
        application.save(update_fields=['overall_score', 'updated_at'])

        return application.overall_score
