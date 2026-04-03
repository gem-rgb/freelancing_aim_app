from django.urls import path
from . import views

app_name = "bounties"

urlpatterns = [
    path("", views.BountyListCreateView.as_view(), name="bounty_list_create"),
    path("my/", views.MyBountiesView.as_view(), name="my_bounties"),
    path("watched/", views.WatchedBountiesView.as_view(), name="watched_bounties"),
    path("my-submissions/", views.MySubmissionsView.as_view(), name="my_submissions"),
    path("<uuid:pk>/", views.BountyDetailView.as_view(), name="bounty_detail"),
    path("<uuid:pk>/submit/", views.BountySubmissionView.as_view(), name="bounty_submit"),
    path("<uuid:pk>/submissions/", views.BountySubmissionListView.as_view(), name="bounty_submissions"),
    path("<uuid:pk>/watch/", views.WatchBountyView.as_view(), name="watch_bounty"),
    path("<uuid:pk>/unwatch/", views.UnwatchBountyView.as_view(), name="unwatch_bounty"),
    path("submissions/<uuid:pk>/", views.SubmissionDetailView.as_view(), name="submission_detail"),
    path("submissions/<uuid:pk>/accept/", views.AcceptSubmissionView.as_view(), name="accept_submission"),
    path("submissions/<uuid:pk>/reject/", views.RejectSubmissionView.as_view(), name="reject_submission"),
]
