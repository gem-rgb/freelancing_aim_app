from django.urls import path
from . import views

urlpatterns = [
    path('me/', views.MyTrustView.as_view(), name='ratings-me'),
    path('recalculate/', views.recalculate_my_trust, name='ratings-recalculate'),
    path('vote/', views.CommunityVoteView.as_view(), name='ratings-vote'),
    path('seller/<str:username>/', views.SellerTrustView.as_view(), name='ratings-seller'),
    path('seller/<str:username>/history/', views.TrustHistoryView.as_view(), name='ratings-seller-history'),
]
