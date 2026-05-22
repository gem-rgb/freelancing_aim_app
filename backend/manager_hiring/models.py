"""
Manager Hiring & AI-Assisted Recruitment models.
"""
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid


class ManagerApplication(models.Model):
    STATUS_CHOICES = [
        ('submitted', 'Submitted'),
        ('resume_parsing', 'Resume Parsing'),
        ('qualification_review', 'Qualification Review'),
        ('interview_scheduled', 'Interview Scheduled'),
        ('interview_in_progress', 'Interview In Progress'),
        ('interview_completed', 'Interview Completed'),
        ('under_review', 'Under Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('waitlisted', 'Waitlisted'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    applicant = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='manager_applications')
    status = models.CharField(max_length=25, choices=STATUS_CHOICES, default='submitted')
    resume_file_url = models.URLField(blank=True)
    resume_format = models.CharField(max_length=10, choices=[('pdf','PDF'),('docx','DOCX'),('txt','TXT')], default='pdf')
    resume_text_extracted = models.TextField(blank=True)
    cover_letter = models.TextField(blank=True)
    extracted_skills = models.JSONField(default=list, blank=True)
    extracted_education = models.JSONField(default=list, blank=True)
    extracted_experience = models.JSONField(default=list, blank=True)
    extracted_certifications = models.JSONField(default=list, blank=True)
    qualification_score = models.DecimalField(max_digits=5, decimal_places=2, default=0.00, validators=[MinValueValidator(0), MaxValueValidator(100)])
    experience_score = models.DecimalField(max_digits=5, decimal_places=2, default=0.00, validators=[MinValueValidator(0), MaxValueValidator(100)])
    risk_score = models.DecimalField(max_digits=5, decimal_places=2, default=0.00, validators=[MinValueValidator(0), MaxValueValidator(100)])
    overall_score = models.DecimalField(max_digits=5, decimal_places=2, default=0.00, validators=[MinValueValidator(0), MaxValueValidator(100)])
    candidate_vector = models.JSONField(default=list, blank=True)
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_applications')
    admin_notes = models.TextField(blank=True)
    kyc_verified = models.BooleanField(default=False)
    kyc_verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['status','created_at']), models.Index(fields=['-overall_score'])]

    def __str__(self):
        return f"Application by {self.applicant.username} ({self.status})"


class InterviewSession(models.Model):
    STATUS_CHOICES = [('pending','Pending'),('in_progress','In Progress'),('completed','Completed'),('expired','Expired'),('flagged','Flagged')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.ForeignKey(ManagerApplication, on_delete=models.CASCADE, related_name='interviews')
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='pending')
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    total_questions = models.PositiveIntegerField(default=0)
    answered_questions = models.PositiveIntegerField(default=0)
    overall_interview_score = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    cheat_risk_score = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    cheat_flags = models.JSONField(default=list, blank=True)
    session_metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Interview for {self.application.applicant.username} ({self.status})"


class InterviewQuestion(models.Model):
    QUESTION_TYPES = [('technical','Technical'),('behavioral','Behavioral'),('ethical','Ethical'),('scam_detection','Scam Detection'),('security_reasoning','Security Reasoning'),('moderation_sim','Moderation Simulation')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(InterviewSession, on_delete=models.CASCADE, related_name='questions')
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPES)
    difficulty = models.IntegerField(default=5, validators=[MinValueValidator(1), MaxValueValidator(10)])
    question_text = models.TextField()
    context = models.TextField(blank=True)
    expected_topics = models.JSONField(default=list, blank=True)
    order = models.PositiveIntegerField(default=0)
    is_followup = models.BooleanField(default=False)
    parent_question = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='followups')
    generated_by = models.CharField(max_length=50, default='manual')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"Q{self.order}: {self.question_text[:60]}..."


class InterviewAnswer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question = models.OneToOneField(InterviewQuestion, on_delete=models.CASCADE, related_name='answer')
    answer_text = models.TextField()
    submitted_at = models.DateTimeField(auto_now_add=True)
    relevance_score = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    completeness_score = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    accuracy_score = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    overall_score = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    ai_generated_probability = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    typing_speed_wpm = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    time_to_answer_seconds = models.PositiveIntegerField(null=True, blank=True)
    stylometric_flags = models.JSONField(default=list, blank=True)
    perplexity_score = models.DecimalField(max_digits=8, decimal_places=4, null=True, blank=True)
    semantic_consistency_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    evaluation_metadata = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"Answer for Q{self.question.order} — score: {self.overall_score}"
