from rest_framework import serializers
from .models import EscrowAccount, StakeEntry, EscrowEvent


class EscrowAccountSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = EscrowAccount
        fields = ['id', 'username', 'total_locked', 'total_released', 'total_slashed', 'available_balance', 'created_at']


class StakeEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = StakeEntry
        fields = '__all__'
        read_only_fields = ['id', 'locked_at', 'released_at']


class EscrowEventSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source='actor.username', read_only=True, default=None)

    class Meta:
        model = EscrowEvent
        fields = ['id', 'event_type', 'description', 'actor_username', 'metadata', 'created_at']
