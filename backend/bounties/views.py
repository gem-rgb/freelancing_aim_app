import logging
from decimal import Decimal
from django.utils import timezone
from django.db import transaction as db_transaction
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .models import Bounty, BountySubmission, BountyTransaction, BountyWatch, BountyDispute
from .serializers import (
    BountySerializer, BountyCreateSerializer,
    BountySubmissionSerializer, BountySubmissionCreateSerializer,
    BountyDisputeSerializer,
)

logger = logging.getLogger(__name__)
PLATFORM_FEE_PERCENT = Decimal("15")


class BountyListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return BountyCreateSerializer
        return BountySerializer

    def get_queryset(self):
        qs = Bounty.objects.all()
        status_filter = self.request.query_params.get("status", "open")
        if status_filter:
            qs = qs.filter(status=status_filter)
        category = self.request.query_params.get("category")
        if category:
            qs = qs.filter(category__icontains=category)
        priority = self.request.query_params.get("priority")
        if priority:
            qs = qs.filter(priority=priority)
        return qs.order_by("-created_at")

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        bounty = serializer.save()
        return Response(
            BountySerializer(bounty, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class BountyDetailView(generics.RetrieveAPIView):
    serializer_class = BountySerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return Bounty.objects.all()

    def retrieve(self, request, *args, **kwargs):
        bounty = self.get_object()
        bounty.view_count += 1
        bounty.save(update_fields=["view_count"])
        return Response(BountySerializer(bounty, context={"request": request}).data)


class BountySubmissionView(generics.GenericAPIView):
    serializer_class = BountySubmissionCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk, *args, **kwargs):
        try:
            bounty = Bounty.objects.get(pk=pk, status="open")
        except Bounty.DoesNotExist:
            return Response({"error": "Bounty not found or not open."}, status=404)

        if bounty.buyer == request.user:
            return Response({"error": "Cannot submit to your own bounty."}, status=400)

        if BountySubmission.objects.filter(bounty=bounty, seller=request.user).exists():
            return Response({"error": "Already submitted to this bounty."}, status=400)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        submission = BountySubmission.objects.create(
            bounty=bounty,
            seller=request.user,
            **serializer.validated_data,
        )
        bounty.submission_count += 1
        bounty.save(update_fields=["submission_count"])

        return Response(BountySubmissionSerializer(submission).data, status=201)


class BountySubmissionListView(generics.ListAPIView):
    serializer_class = BountySubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        bounty_id = self.kwargs["pk"]
        user = self.request.user
        try:
            bounty = Bounty.objects.get(pk=bounty_id)
        except Bounty.DoesNotExist:
            return BountySubmission.objects.none()
        # Buyer sees all; seller sees only their own
        if bounty.buyer == user or user.is_staff:
            return BountySubmission.objects.filter(bounty=bounty)
        return BountySubmission.objects.filter(bounty=bounty, seller=user)


class AcceptSubmissionView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk, *args, **kwargs):
        try:
            submission = BountySubmission.objects.get(pk=pk, bounty__buyer=request.user, status="pending")
        except BountySubmission.DoesNotExist:
            return Response({"error": "Submission not found."}, status=404)

        bounty = submission.bounty
        if bounty.status != "open":
            return Response({"error": "Bounty is not open."}, status=400)

        with db_transaction.atomic():
            submission.status = "accepted"
            submission.reviewed_at = timezone.now()
            submission.save()

            bounty.status = "completed"
            bounty.save(update_fields=["status"])

            # Reject all other pending submissions
            BountySubmission.objects.filter(
                bounty=bounty, status="pending"
            ).exclude(pk=submission.pk).update(status="rejected", reviewed_at=timezone.now())

            # Create BountyTransaction
            fee = (bounty.reward * PLATFORM_FEE_PERCENT / 100).quantize(Decimal("0.01"))
            BountyTransaction.objects.create(
                bounty=bounty,
                submission=submission,
                buyer=request.user,
                seller=submission.seller,
                amount=bounty.reward,
                platform_fee=fee,
                status="pending",
            )

        return Response(BountySubmissionSerializer(submission).data)


class RejectSubmissionView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk, *args, **kwargs):
        try:
            submission = BountySubmission.objects.get(pk=pk, bounty__buyer=request.user, status="pending")
        except BountySubmission.DoesNotExist:
            return Response({"error": "Submission not found."}, status=404)

        rejection_reason = request.data.get("rejection_reason", "")
        submission.status = "rejected"
        submission.rejection_reason = rejection_reason
        submission.reviewed_at = timezone.now()
        submission.save()

        return Response(BountySubmissionSerializer(submission).data)


class WatchBountyView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk, *args, **kwargs):
        bounty = generics.get_object_or_404(Bounty, pk=pk)
        _, created = BountyWatch.objects.get_or_create(user=request.user, bounty=bounty)
        return Response({"watching": True, "created": created})


class UnwatchBountyView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk, *args, **kwargs):
        BountyWatch.objects.filter(user=request.user, bounty_id=pk).delete()
        return Response({"watching": False})


class WatchedBountiesView(generics.ListAPIView):
    serializer_class = BountySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        watched_ids = BountyWatch.objects.filter(
            user=self.request.user
        ).values_list("bounty_id", flat=True)
        return Bounty.objects.filter(id__in=watched_ids)


class MyBountiesView(generics.ListAPIView):
    serializer_class = BountySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Bounty.objects.filter(buyer=self.request.user).order_by("-created_at")


class MySubmissionsView(generics.ListAPIView):
    serializer_class = BountySubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return BountySubmission.objects.filter(seller=self.request.user).order_by("-submitted_at")


class SubmissionDetailView(generics.RetrieveAPIView):
    serializer_class = BountySubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return (
            BountySubmission.objects.filter(seller=user) |
            BountySubmission.objects.filter(bounty__buyer=user)
        )
