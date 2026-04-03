from django.db import models
from django.conf import settings
import uuid


class ChatRoom(models.Model):
    ROOM_TYPES = [
        ('direct', 'Direct Message'),
        ('transaction', 'Transaction Chat'),
        ('support', 'Support Chat'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, blank=True)
    type = models.CharField(max_length=20, choices=ROOM_TYPES, default='direct')
    participants = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='chat_rooms')
    transaction = models.OneToOneField('transactions.Transaction', on_delete=models.CASCADE, null=True, blank=True, related_name='chat_room')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        if self.transaction:
            return f"Chat for transaction {self.transaction.id}"
        return f"Room {self.id}"
    
    def get_other_participant(self, user):
        """Get the other participant in a direct message room"""
        if self.type != 'direct':
            return None
        return self.participants.exclude(id=user.id).first()


class Message(models.Model):
    MESSAGE_TYPES = [
        ('text', 'Text'),
        ('file', 'File'),
        ('image', 'Image'),
        ('system', 'System'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_messages')
    encrypted_message = models.TextField()
    message_type = models.CharField(max_length=10, choices=MESSAGE_TYPES, default='text')
    file_url = models.URLField(blank=True, null=True)
    file_name = models.CharField(max_length=255, blank=True, null=True)
    file_size = models.PositiveIntegerField(null=True, blank=True)
    is_deleted = models.BooleanField(default=False)
    is_edited = models.BooleanField(default=False)
    edit_timestamp = models.DateTimeField(null=True, blank=True)
    read_by = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='read_messages', through='MessageRead')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Message by {self.sender.username} in {self.room.id}"


class MessageRead(models.Model):
    message = models.ForeignKey(Message, on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    read_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['message', 'user']
        indexes = [
            models.Index(fields=['user', 'read_at']),
        ]


class ChatKeyExchange(models.Model):
    """Store encrypted keys for message encryption between users"""
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='key_exchanges')
    from_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_keys')
    to_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='received_keys')
    encrypted_key = models.TextField(help_text="Room encryption key encrypted with recipient's public key")
    key_version = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['room', 'from_user', 'to_user', 'key_version']


class ChatBlock(models.Model):
    """User blocking other users from messaging"""
    blocker = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='blocked_users')
    blocked = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='blocked_by')
    reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['blocker', 'blocked']
    
    def __str__(self):
        return f"{self.blocker.username} blocked {self.blocked.username}"


class MessageReaction(models.Model):
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='reactions')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    emoji = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['message', 'user', 'emoji']
