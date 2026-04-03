from rest_framework import serializers
from .models import ChatRoom, Message, MessageRead, ChatKeyExchange, ChatBlock, MessageReaction


class MessageReadSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = MessageRead
        fields = ("username", "read_at")


class MessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source="sender.username", read_only=True)
    read_by_users = serializers.SerializerMethodField()
    reactions = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = (
            "id", "room", "sender_username",
            "encrypted_message", "message_type",
            "file_url", "file_name", "file_size",
            "is_deleted", "is_edited", "edit_timestamp",
            "read_by_users", "reactions", "created_at",
        )
        read_only_fields = (
            "id", "sender_username", "is_deleted", "is_edited",
            "edit_timestamp", "read_by_users", "reactions", "created_at",
        )

    def get_read_by_users(self, obj):
        return list(obj.messageread_set.values_list("user__username", flat=True))

    def get_reactions(self, obj):
        result = {}
        for r in obj.reactions.all():
            result.setdefault(r.emoji, []).append(r.user.username)
        return result


class ChatKeyExchangeSerializer(serializers.ModelSerializer):
    from_username = serializers.CharField(source="from_user.username", read_only=True)
    to_username = serializers.CharField(source="to_user.username", read_only=True)

    class Meta:
        model = ChatKeyExchange
        fields = (
            "id", "room", "from_username", "to_username",
            "encrypted_key", "key_version", "created_at",
        )
        read_only_fields = ("id", "from_username", "to_username", "key_version", "created_at")


class ChatRoomSerializer(serializers.ModelSerializer):
    participants = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    other_user = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = (
            "id", "name", "type", "participants",
            "transaction", "is_active",
            "last_message", "unread_count", "other_user",
            "created_at", "updated_at",
        )
        read_only_fields = fields

    def get_participants(self, obj):
        return list(obj.participants.values_list("username", flat=True))

    def get_last_message(self, obj):
        last = obj.messages.filter(is_deleted=False).order_by("-created_at").first()
        if last:
            return {
                "id": str(last.id),
                "sender": last.sender.username,
                "encrypted_message": last.encrypted_message,
                "created_at": last.created_at.isoformat(),
            }
        return None

    def get_unread_count(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            read_ids = MessageRead.objects.filter(
                user=request.user, message__room=obj
            ).values_list("message_id", flat=True)
            return obj.messages.filter(is_deleted=False).exclude(id__in=read_ids).exclude(
                sender=request.user
            ).count()
        return 0

    def get_other_user(self, obj):
        request = self.context.get("request")
        if request and obj.type == "direct":
            other = obj.participants.exclude(id=request.user.id).first()
            if other:
                return {"id": str(other.id), "username": other.username, "public_key": other.public_key}
        return None


class CreateChatRoomSerializer(serializers.Serializer):
    participant_id = serializers.UUIDField()
    room_type = serializers.ChoiceField(choices=["direct", "transaction", "support"], default="direct")


class KeyExchangeCreateSerializer(serializers.Serializer):
    room_id = serializers.UUIDField()
    to_user_id = serializers.UUIDField()
    encrypted_key = serializers.CharField()
