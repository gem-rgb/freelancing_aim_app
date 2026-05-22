from django.urls import path
from . import views

urlpatterns = [
    path('profile/', views.MyManagerProfileView.as_view(), name='task-profile'),
    path('assigned/', views.MyAssignedTasksView.as_view(), name='task-assigned'),
    path('queue/', views.VerificationQueueView.as_view(), name='task-queue'),
    path('stats/', views.manager_dashboard_stats, name='task-stats'),
    path('dashboard-stats/', views.manager_dashboard_stats, name='task-dashboard-stats'),
    path('<uuid:id>/', views.TaskDetailView.as_view(), name='task-detail'),
    path('<uuid:task_id>/review/', views.submit_task_review, name='task-review'),
    path('consensus/<uuid:listing_id>/', views.ConsensusView.as_view(), name='task-consensus'),
]

