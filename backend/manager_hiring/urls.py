from django.urls import path
from . import views

urlpatterns = [
    path('apply/', views.SubmitApplicationView.as_view(), name='hiring-apply'),
    path('applications/', views.MyApplicationsView.as_view(), name='hiring-applications'),
    path('applications/<uuid:id>/', views.ApplicationDetailView.as_view(), name='hiring-application-detail'),
    path('applications/<uuid:application_id>/process-resume/', views.process_resume, name='hiring-process-resume'),
    path('applications/<uuid:application_id>/generate-interview/', views.generate_interview, name='hiring-generate-interview'),
    path('interviews/', views.MyInterviewsView.as_view(), name='hiring-interviews'),
    path('interviews/<uuid:id>/', views.InterviewDetailView.as_view(), name='hiring-interview-detail'),
    path('questions/<uuid:question_id>/answer/', views.submit_answer, name='hiring-submit-answer'),
    path('stats/', views.hiring_stats, name='hiring-stats'),
]
