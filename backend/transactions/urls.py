from django.urls import path
from . import views

app_name = "transactions"

urlpatterns = [
    # Transactions
    path("", views.TransactionListView.as_view(), name="transaction_list"),
    path("<uuid:pk>/", views.TransactionDetailView.as_view(), name="transaction_detail"),
    path("initiate/", views.TransactionInitiateView.as_view(), name="transaction_initiate"),
    path("<uuid:pk>/release/", views.TransactionReleaseView.as_view(), name="transaction_release"),
    path("<uuid:pk>/confirm/", views.TransactionConfirmView.as_view(), name="transaction_confirm"),

    # Paystack
    path("paystack/webhook/", views.PaystackWebhookView.as_view(), name="paystack_webhook"),

    # Disputes
    path("<uuid:pk>/dispute/", views.DisputeCreateView.as_view(), name="dispute_create"),
    path("disputes/", views.DisputeListView.as_view(), name="dispute_list"),
    path("disputes/<uuid:pk>/", views.DisputeDetailView.as_view(), name="dispute_detail"),
    path("disputes/<uuid:pk>/respond/", views.seller_respond_dispute, name="dispute_respond"),
    path("disputes/<uuid:pk>/resolve/", views.resolve_dispute, name="dispute_resolve"),

    # Reviews
    path("<uuid:pk>/review/", views.ReviewCreateView.as_view(), name="review_create"),
    path("reviews/<uuid:user_id>/", views.ReviewListView.as_view(), name="user_reviews"),

    # Stakes
    path("stake/", views.StakeCreateView.as_view(), name="stake_create"),
    path("stakes/", views.StakeListView.as_view(), name="stake_list"),
]
