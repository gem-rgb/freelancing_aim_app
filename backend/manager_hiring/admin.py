from django.contrib import admin
from .models import ManagerApplication, InterviewSession, InterviewQuestion, InterviewAnswer

@admin.register(ManagerApplication)
class ManagerApplicationAdmin(admin.ModelAdmin):
    list_display = ['applicant', 'status', 'overall_score', 'qualification_score', 'kyc_verified', 'created_at']
    list_filter = ['status', 'kyc_verified']
    search_fields = ['applicant__username']

@admin.register(InterviewSession)
class InterviewSessionAdmin(admin.ModelAdmin):
    list_display = ['application', 'status', 'total_questions', 'answered_questions', 'overall_interview_score', 'cheat_risk_score']
    list_filter = ['status']

@admin.register(InterviewQuestion)
class InterviewQuestionAdmin(admin.ModelAdmin):
    list_display = ['session', 'question_type', 'difficulty', 'order', 'generated_by']
    list_filter = ['question_type', 'difficulty']

@admin.register(InterviewAnswer)
class InterviewAnswerAdmin(admin.ModelAdmin):
    list_display = ['question', 'overall_score', 'ai_generated_probability', 'submitted_at']
