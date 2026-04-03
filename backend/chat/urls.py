from django.urls import path
from . import views

app_name = "chat"

urlpatterns = [
    path("rooms/", views.ChatRoomListView.as_view(), name="room_list"),
    path("rooms/create/", views.CreateChatRoomView.as_view(), name="room_create"),
    path("rooms/<uuid:room_id>/messages/", views.MessageListView.as_view(), name="message_list"),
    path("rooms/<uuid:room_id>/key/", views.get_my_key, name="get_my_key"),
    path("messages/<uuid:message_id>/read/", views.mark_message_read, name="mark_read"),
    path("keys/", views.store_key_exchange, name="key_exchange"),
    path("block/", views.block_user, name="block_user"),
    path("unblock/<str:username>/", views.unblock_user, name="unblock_user"),
]
