from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import ManagerApplication, InterviewSession, InterviewQuestion, InterviewAnswer
from .serializers import (
    ManagerApplicationSerializer, InterviewSessionSerializer,
    InterviewQuestionSerializer, InterviewAnswerSerializer,
)
from .services import RecruitmentPipeline
import logging

logger = logging.getLogger(__name__)


class SubmitApplicationView(generics.CreateAPIView):
    """POST /api/hiring/apply/ — submit a manager application."""
    serializer_class = ManagerApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(applicant=self.request.user)


class MyApplicationsView(generics.ListAPIView):
    """GET /api/hiring/applications/ — current user's applications."""
    serializer_class = ManagerApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ManagerApplication.objects.filter(applicant=self.request.user)


class ApplicationDetailView(generics.RetrieveAPIView):
    """GET /api/hiring/applications/<id>/ — application detail."""
    serializer_class = ManagerApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'
    queryset = ManagerApplication.objects.all()


class MyInterviewsView(generics.ListAPIView):
    """GET /api/hiring/interviews/ — current user's interview sessions."""
    serializer_class = InterviewSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return InterviewSession.objects.filter(
            application__applicant=self.request.user
        ).prefetch_related('questions')


class InterviewDetailView(generics.RetrieveAPIView):
    """GET /api/hiring/interviews/<id>/ — interview with questions."""
    serializer_class = InterviewSessionSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'
    queryset = InterviewSession.objects.all()


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def submit_answer(request, question_id):
    """POST /api/hiring/questions/<id>/answer/ — submit answer with ML cheat detection."""
    try:
        question = InterviewQuestion.objects.get(id=question_id)
    except InterviewQuestion.DoesNotExist:
        return Response({'error': 'Question not found.'}, status=404)

    if hasattr(question, 'answer'):
        return Response({'error': 'Already answered.'}, status=400)

    answer_text = request.data.get('answer_text', '').strip()
    if not answer_text:
        return Response({'error': 'Answer text is required.'}, status=400)

    typing_speed = request.data.get('typing_speed_wpm')
    time_taken = request.data.get('time_to_answer_seconds')

    answer = InterviewAnswer.objects.create(
        question=question,
        answer_text=answer_text,
        typing_speed_wpm=typing_speed,
        time_to_answer_seconds=time_taken,
    )

    # Update session progress
    session = question.session
    session.answered_questions += 1
    session.save(update_fields=['answered_questions', 'updated_at'])

    # ── ML cheat detection (async-safe, non-blocking fallback) ──
    try:
        RecruitmentPipeline.evaluate_answer(answer)
    except Exception as e:
        logger.warning(f"Cheat detection failed for answer {answer.id}: {e}")

    # If all questions answered, evaluate full session
    if session.answered_questions >= session.total_questions:
        try:
            RecruitmentPipeline.evaluate_full_session(session)
        except Exception as e:
            logger.warning(f"Session evaluation failed for {session.id}: {e}")

    return Response(InterviewAnswerSerializer(answer).data, status=201)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def process_resume(request, application_id):
    """POST /api/hiring/applications/<id>/process-resume/ — trigger ML resume parsing."""
    try:
        application = ManagerApplication.objects.get(id=application_id)
    except ManagerApplication.DoesNotExist:
        return Response({'error': 'Application not found.'}, status=404)

    # Extract resume text from uploaded file or request body
    raw_text = request.data.get('resume_text', '')
    if not raw_text and application.resume_text:
        raw_text = application.resume_text

    if not raw_text:
        return Response({'error': 'No resume text available for processing.'}, status=400)

    result = RecruitmentPipeline.process_resume(application, raw_text)
    if result is None:
        return Response(
            {'error': 'ML service is currently unavailable. Resume queued for processing.'},
            status=503,
        )

    application.refresh_from_db()
    return Response({
        'status': 'processed',
        'overall_score': float(application.overall_score),
        'qualification_score': float(application.qualification_score),
        'extraction': result.get('extraction'),
        'scoring': result.get('scoring'),
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def generate_interview(request, application_id):
    """POST /api/hiring/applications/<id>/generate-interview/ — trigger ML interview generation."""
    try:
        application = ManagerApplication.objects.get(id=application_id)
    except ManagerApplication.DoesNotExist:
        return Response({'error': 'Application not found.'}, status=404)

    if application.status not in ('qualification_review', 'submitted'):
        existing_sessions = InterviewSession.objects.filter(application=application)
        if existing_sessions.exists():
            return Response({
                'error': 'Interview already exists.',
                'session_id': str(existing_sessions.first().id),
            }, status=400)

    session = RecruitmentPipeline.generate_interview_for_application(application)
    if session is None:
        return Response(
            {'error': 'ML service unavailable. Interview generation queued.'},
            status=503,
        )

    return Response({
        'status': 'generated',
        'session_id': str(session.id),
        'total_questions': session.total_questions,
    }, status=201)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def hiring_stats(request):
    """GET /api/hiring/stats/ — admin hiring pipeline stats."""
    if not request.user.is_staff:
        return Response({'error': 'Admin only.'}, status=403)

    apps = ManagerApplication.objects.all()
    return Response({
        'total_applications': apps.count(),
        'by_status': {
            s[0]: apps.filter(status=s[0]).count()
            for s in ManagerApplication.STATUS_CHOICES
        },
        'avg_qualification_score': float(
            apps.exclude(qualification_score=0).values_list('qualification_score', flat=True).first() or 0
        ),
        'pending_interviews': InterviewSession.objects.filter(status='pending').count(),
        'flagged_interviews': InterviewSession.objects.filter(status='flagged').count(),
    })
