import logging
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import ChatRoom, Message, MessageRead, ChatKeyExchange, ChatBlock
from .serializers import (
    ChatRoomSerializer, MessageSerializer,
    CreateChatRoomSerializer, KeyExchangeCreateSerializer,
)
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)
User = get_user_model()


class ChatRoomListView(generics.ListAPIView):
    serializer_class = ChatRoomSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ChatRoom.objects.filter(
            participants=self.request.user,
            is_active=True,
        ).order_by("-updated_at")


class CreateChatRoomView(generics.GenericAPIView):
    serializer_class = CreateChatRoomSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            other_user = User.objects.get(id=serializer.validated_data["participant_id"])
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=404)

        if other_user == request.user:
            return Response({"error": "Cannot chat with yourself."}, status=400)

        # Check if blocked
        if ChatBlock.objects.filter(blocker=other_user, blocked=request.user).exists():
            return Response({"error": "Cannot send messages to this user."}, status=403)

        # Find or create direct room
        room_type = serializer.validated_data.get("room_type", "direct")
        if room_type == "direct":
            existing = ChatRoom.objects.filter(
                type="direct",
                participants=request.user,
            ).filter(participants=other_user).first()
            if existing:
                return Response(ChatRoomSerializer(existing, context={"request": request}).data)

        room = ChatRoom.objects.create(type=room_type)
        room.participants.add(request.user, other_user)

        return Response(
            ChatRoomSerializer(room, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class MessageListView(generics.ListAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        room_id = self.kwargs["room_id"]
        # Verify participant
        if not ChatRoom.objects.filter(id=room_id, participants=self.request.user).exists():
            return Message.objects.none()
        return Message.objects.filter(
            room_id=room_id, is_deleted=False
        ).order_by("created_at")


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def mark_message_read(request, message_id):
    try:
        msg = Message.objects.get(id=message_id)
        if not msg.room.participants.filter(id=request.user.id).exists():
            return Response({"error": "Forbidden"}, status=403)
        MessageRead.objects.get_or_create(message=msg, user=request.user)
        return Response({"read": True})
    except Message.DoesNotExist:
        return Response({"error": "Message not found."}, status=404)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def block_user(request):
    username = request.data.get("username", "")
    try:
        target = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response({"error": "User not found."}, status=404)
    ChatBlock.objects.get_or_create(blocker=request.user, blocked=target)
    return Response({"blocked": username})


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def unblock_user(request, username):
    ChatBlock.objects.filter(blocker=request.user, blocked__username=username).delete()
    return Response({"unblocked": username})


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def store_key_exchange(request):
    """Store an encrypted room key for a recipient."""
    serializer = KeyExchangeCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    try:
        room = ChatRoom.objects.get(id=serializer.validated_data["room_id"])
        to_user = User.objects.get(id=serializer.validated_data["to_user_id"])
    except (ChatRoom.DoesNotExist, User.DoesNotExist):
        return Response({"error": "Room or user not found."}, status=404)

    if not room.participants.filter(id=request.user.id).exists():
        return Response({"error": "Forbidden"}, status=403)

    last_version = ChatKeyExchange.objects.filter(
        room=room, from_user=request.user, to_user=to_user
    ).order_by("-key_version").values_list("key_version", flat=True).first() or 0

    kx = ChatKeyExchange.objects.create(
        room=room,
        from_user=request.user,
        to_user=to_user,
        encrypted_key=serializer.validated_data["encrypted_key"],
        key_version=last_version + 1,
    )
    return Response({"key_version": kx.key_version}, status=201)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def get_my_key(request, room_id):
    """Retrieve the latest room key encrypted for the requesting user."""
    kx = ChatKeyExchange.objects.filter(
        room_id=room_id, to_user=request.user
    ).order_by("-key_version").first()
    if not kx:
        return Response({"encrypted_key": None})
    return Response({
        "encrypted_key": kx.encrypted_key,
        "from_user": kx.from_user.username,
        "key_version": kx.key_version,
    })
