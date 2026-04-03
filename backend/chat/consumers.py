import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model
from .models import ChatRoom, Message, MessageRead

logger = logging.getLogger(__name__)
User = get_user_model()


class ChatConsumer(AsyncWebsocketConsumer):
    """
    E2EE Chat WebSocket Consumer.
    Auth: JWT passed as query param ?token=<access_token>
    Messages are stored as ciphertext — server never sees plaintext.
    """

    async def connect(self):
        # Authenticate via JWT token in query string
        query_string = self.scope.get("query_string", b"").decode()
        params = dict(p.split("=") for p in query_string.split("&") if "=" in p)
        token_str = params.get("token", "")

        self.user = await self.get_user_from_token(token_str)
        if not self.user:
            await self.close(code=4001)
            return

        self.room_id = self.scope["url_route"]["kwargs"]["room_id"]
        self.room_group_name = f"chat_{self.room_id}"

        # Verify user is a participant
        is_participant = await self.verify_participant()
        if not is_participant:
            await self.close(code=4003)
            return

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()
        logger.info(f"WS connect: {self.user.username} → room {self.room_id}")

    async def disconnect(self, close_code):
        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        logger.info(f"WS disconnect: room {getattr(self, 'room_id', '?')} code={close_code}")

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            await self.send(json.dumps({"error": "Invalid JSON"}))
            return

        msg_type = data.get("type", "text")

        if msg_type == "message":
            encrypted_message = data.get("encrypted_message", "")
            if not encrypted_message:
                return
            # Persist ciphertext to DB
            msg = await self.save_message(encrypted_message, data.get("message_type", "text"))
            # Broadcast to room group
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "chat_message",
                    "message_id": str(msg.id),
                    "sender": self.user.username,
                    "encrypted_message": encrypted_message,
                    "message_type": data.get("message_type", "text"),
                    "timestamp": msg.created_at.isoformat(),
                },
            )

        elif msg_type == "read":
            message_id = data.get("message_id")
            if message_id:
                await self.mark_read(message_id)

        elif msg_type == "typing":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "typing_indicator",
                    "sender": self.user.username,
                    "is_typing": data.get("is_typing", False),
                },
            )

    # ── Group event handlers ──────────────────────────────────────────────────

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            "type": "message",
            "message_id": event["message_id"],
            "sender": event["sender"],
            "encrypted_message": event["encrypted_message"],
            "message_type": event["message_type"],
            "timestamp": event["timestamp"],
        }))

    async def typing_indicator(self, event):
        await self.send(text_data=json.dumps({
            "type": "typing",
            "sender": event["sender"],
            "is_typing": event["is_typing"],
        }))

    # ── DB helpers ────────────────────────────────────────────────────────────

    @database_sync_to_async
    def get_user_from_token(self, token_str):
        try:
            token = AccessToken(token_str)
            return User.objects.get(id=token["user_id"])
        except Exception:
            return None

    @database_sync_to_async
    def verify_participant(self):
        try:
            room = ChatRoom.objects.get(id=self.room_id)
            return room.participants.filter(id=self.user.id).exists()
        except ChatRoom.DoesNotExist:
            return False

    @database_sync_to_async
    def save_message(self, encrypted_message, message_type="text"):
        room = ChatRoom.objects.get(id=self.room_id)
        return Message.objects.create(
            room=room,
            sender=self.user,
            encrypted_message=encrypted_message,
            message_type=message_type,
        )

    @database_sync_to_async
    def mark_read(self, message_id):
        try:
            msg = Message.objects.get(id=message_id)
            MessageRead.objects.get_or_create(message=msg, user=self.user)
        except Message.DoesNotExist:
            pass
