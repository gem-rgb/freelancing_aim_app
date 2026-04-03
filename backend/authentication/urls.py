from django.urls import path
from . import views

app_name = 'authentication'

urlpatterns = [
    path('register/', views.UserRegistrationView.as_view(), name='register'),
    path('login/', views.UserLoginView.as_view(), name='login'),
    path('logout/', views.UserLogoutView.as_view(), name='logout'),
    path('profile/', views.UserProfileView.as_view(), name='profile'),
    path('generate-keys/', views.KeyGenerationView.as_view(), name='generate_keys'),
    path('generate-username/', views.UsernameGenerationView.as_view(), name='generate_username'),
    path('sessions/', views.UserSessionListView.as_view(), name='sessions'),
    path('sessions/<str:session_key>/revoke/', views.revoke_session, name='revoke_session'),
    path('stats/', views.user_stats, name='user_stats'),
]
