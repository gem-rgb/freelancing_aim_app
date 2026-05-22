from rest_framework import serializers
from .models import ManagerProfile, VerificationTask, TaskConsensus, AssignmentWeightConfig


class ManagerProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='manager.username', read_only=True)

    class Meta:
        model = ManagerProfile
        fields = [
            'id', 'username', 'qualification_score', 'experience_score',
            'verification_accuracy', 'scam_detection_accuracy',
            'trust_score', 'composite_rank_score',
            'total_tasks_completed', 'total_tasks_assigned', 'active_assignments',
            'is_available', 'specializations', 'last_assignment_at',
        ]


class VerificationTaskSerializer(serializers.ModelSerializer):
    listing_title = serializers.CharField(source='listing.title', read_only=True)
    assigned_manager_username = serializers.CharField(source='assigned_manager.username', read_only=True, default=None)

    class Meta:
        model = VerificationTask
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class TaskConsensusSerializer(serializers.ModelSerializer):
    listing_title = serializers.CharField(source='listing.title', read_only=True)

    class Meta:
        model = TaskConsensus
        fields = '__all__'


class AssignmentWeightConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssignmentWeightConfig
        fields = '__all__'
