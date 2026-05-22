from rest_framework import serializers
from .models import ManagerApplication, InterviewSession, InterviewQuestion, InterviewAnswer


class ManagerApplicationSerializer(serializers.ModelSerializer):
    applicant_username = serializers.CharField(source='applicant.username', read_only=True)

    class Meta:
        model = ManagerApplication
        fields = '__all__'
        read_only_fields = ['id', 'applicant', 'status', 'extracted_skills', 'extracted_education',
                           'extracted_experience', 'extracted_certifications', 'qualification_score',
                           'experience_score', 'risk_score', 'overall_score', 'candidate_vector',
                           'reviewed_by', 'admin_notes', 'kyc_verified', 'kyc_verified_at', 'created_at', 'updated_at']


class InterviewQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = InterviewQuestion
        fields = ['id', 'question_type', 'difficulty', 'question_text', 'context', 'order', 'is_followup']


class InterviewAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = InterviewAnswer
        fields = ['id', 'question', 'answer_text', 'submitted_at', 'overall_score', 'ai_generated_probability']
        read_only_fields = ['id', 'submitted_at', 'overall_score', 'ai_generated_probability']


class InterviewSessionSerializer(serializers.ModelSerializer):
    questions = InterviewQuestionSerializer(many=True, read_only=True)

    class Meta:
        model = InterviewSession
        fields = ['id', 'status', 'started_at', 'completed_at', 'total_questions',
                  'answered_questions', 'overall_interview_score', 'cheat_risk_score', 'questions']
