from django.urls import path
from . import views

app_name = 'authentication'

urlpatterns = [
    path('register/',                                    views.UserRegistrationView.as_view(),   name='register'),
    path('login/',                                       views.UserLoginView.as_view(),          name='login'),
    path('logout/',                                      views.UserLogoutView.as_view(),         name='logout'),
    path('profile/',                                     views.UserProfileView.as_view(),        name='profile'),
    path('generate-keys/',                               views.KeyGenerationView.as_view(),      name='generate_keys'),
    path('generate-username/',                           views.UsernameGenerationView.as_view(), name='generate_username'),
    path('sessions/',                                    views.UserSessionListView.as_view(),    name='sessions'),
    path('sessions/<str:session_key>/revoke/',           views.revoke_session,                   name='revoke_session'),
    path('stats/',                                       views.user_stats,                       name='user_stats'),
    # OTP email verification
    path('otp/request/',                                 views.RequestOTPView.as_view(),         name='otp_request'),
    path('otp/verify/',                                  views.VerifyOTPView.as_view(),          name='otp_verify'),
    # Public seller profiles
    path('sellers/<str:username>/',                      views.SellerProfileView.as_view(),      name='seller_profile'),
    # ── Admin endpoints ───────────────────────────────────────────────────────
    path('admin/login/',                                 views.StaffLoginView.as_view(),         name='staff_login'),
    path('admin/users/',                                 views.admin_list_users,                 name='admin_user_list'),
    path('admin/users/<int:user_id>/suspend/',           views.admin_suspend_user,               name='admin_suspend'),
    path('admin/users/<int:user_id>/unsuspend/',         views.admin_unsuspend_user,             name='admin_unsuspend'),
    path('admin/users/<int:user_id>/terminate/',         views.admin_terminate_user,             name='admin_terminate'),
    path('admin/stats/',                                 views.admin_platform_stats,             name='admin_stats'),
    path('admin/listings/<uuid:listing_id>/edit/',       views.admin_edit_listing,               name='admin_listing_edit'),
    path('admin/listings/<uuid:listing_id>/terminate/',  views.admin_terminate_listing,          name='admin_listing_terminate'),
    path('admin/transactions/<uuid:txn_id>/refund/',     views.admin_refund_transaction,         name='admin_refund'),
    path('admin/support-rooms/',                         views.admin_get_support_rooms,          name='admin_support_rooms'),
    path('admin/message/send/',                          views.admin_send_message,               name='admin_send_message'),
    path('admin/all-conversations/',                     views.admin_get_all_support_rooms,      name='admin_all_conversations'),
    path('admin/logs/stakes/',                           views.admin_stake_logs,                 name='admin_stake_logs'),
    path('admin/logs/escrow/',                           views.admin_escrow_logs,                name='admin_escrow_logs'),
]
