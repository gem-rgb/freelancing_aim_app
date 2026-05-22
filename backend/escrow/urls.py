from django.urls import path
from . import views

urlpatterns = [
    path('account/', views.MyEscrowAccountView.as_view(), name='escrow-account'),
    path('stakes/', views.MyStakeEntriesView.as_view(), name='escrow-stakes'),
    path('stakes/<uuid:id>/', views.StakeDetailView.as_view(), name='escrow-stake-detail'),
    path('stakes/<uuid:stake_id>/events/', views.StakeEventsView.as_view(), name='escrow-stake-events'),
    path('summary/', views.escrow_summary, name='escrow-summary'),
]
