from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import ManagerProfile, VerificationTask, TaskConsensus
from .serializers import ManagerProfileSerializer, VerificationTaskSerializer, TaskConsensusSerializer
from .services import TaskAssignmentEngine


class MyManagerProfileView(generics.RetrieveAPIView):
    """GET /api/tasks/profile/ — current manager's profile and ranking."""
    serializer_class = ManagerProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        profile, _ = ManagerProfile.objects.get_or_create(manager=self.request.user)
        return profile


class MyAssignedTasksView(generics.ListAPIView):
    """GET /api/tasks/assigned/ — tasks assigned to current manager."""
    serializer_class = VerificationTaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return VerificationTask.objects.filter(
            assigned_manager=self.request.user
        ).select_related('listing')


class TaskDetailView(generics.RetrieveAPIView):
    """GET /api/tasks/<id>/ — single task detail."""
    serializer_class = VerificationTaskSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'
    queryset = VerificationTask.objects.all()


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def submit_task_review(request, task_id):
    """POST /api/tasks/<id>/review/ — manager submits chunk review."""
    try:
        task = VerificationTask.objects.get(id=task_id, assigned_manager=request.user)
    except VerificationTask.DoesNotExist:
        return Response({'error': 'Task not found or not assigned to you.'}, status=404)

    if task.status == 'completed':
        return Response({'error': 'Task already completed.'}, status=400)

    decision = request.data.get('decision')
    score = request.data.get('score', 0)
    notes = request.data.get('notes', '')
    duration = request.data.get('duration_minutes')

    if decision not in ['clean', 'suspicious', 'fraud_signal', 'escalate']:
        return Response({'error': 'Invalid decision.'}, status=400)

    TaskAssignmentEngine.complete_task(task, decision, score, notes, duration)
    return Response({'status': 'completed', 'task_id': str(task_id)})


class VerificationQueueView(generics.ListAPIView):
    """GET /api/tasks/queue/ — pending verification tasks (admin/manager)."""
    serializer_class = VerificationTaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = VerificationTask.objects.select_related('listing', 'assigned_manager')
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs


class ConsensusView(generics.RetrieveAPIView):
    """GET /api/tasks/consensus/<listing_id>/ — consensus for a listing."""
    serializer_class = TaskConsensusSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return TaskConsensus.objects.filter(listing_id=self.kwargs['listing_id']).first()


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def manager_dashboard_stats(request):
    """GET /api/tasks/stats/ — manager-specific dashboard stats."""
    user = request.user
    profile, _ = ManagerProfile.objects.get_or_create(manager=user)
    tasks = VerificationTask.objects.filter(assigned_manager=user)
    return Response({
        'composite_rank': float(profile.composite_rank_score),
        'trust_score': float(profile.trust_score),
        'total_completed': profile.total_tasks_completed,
        'active_assignments': profile.active_assignments,
        'pending_tasks': tasks.filter(status='assigned').count(),
        'in_progress_tasks': tasks.filter(status='in_progress').count(),
        'completed_tasks': tasks.filter(status='completed').count(),
        'verification_accuracy': float(profile.verification_accuracy),
    })
