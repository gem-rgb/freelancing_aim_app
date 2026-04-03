import logging
import json
import hmac
import hashlib
import uuid
from decimal import Decimal
from django.utils import timezone
from django.conf import settings
from django.db import transaction as db_transaction
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .models import Transaction, Payment, Review, Stake, Dispute, EscrowRelease, TransactionLog
from .serializers import (
    TransactionSerializer, TransactionInitiateSerializer, ReleaseKeySerializer,
    ReviewCreateSerializer, StakeCreateSerializer,
    DisputeCreateSerializer, DisputeResolveSerializer,
    DisputeSerializer, StakeSerializer, ReviewSerializer,
)
from . import paystack as paystack_api
from listings.models import Listing

logger = logging.getLogger(__name__)

PLATFORM_FEE_PERCENT = Decimal(str(getattr(settings, "PLATFORM_FEE_PERCENT", 15)))
ESCROW_HOURS = int(getattr(settings, "ESCROW_AUTO_RELEASE_HOURS", 72))
MIN_STAKE = Decimal(str(getattr(settings, "MINIMUM_SELLER_STAKE", 500)))


def _log(transaction, action, description="", user=None, request=None, extra=None):
    TransactionLog.objects.create(
        transaction=transaction,
        action=action,
        description=description,
        user=user,
        ip_address=(request.META.get("REMOTE_ADDR") if request else None),
        metadata=extra,
    )


# ── Transactions ──────────────────────────────────────────────────────────────

class TransactionListView(generics.ListAPIView):
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        role = self.request.query_params.get("role", "all")
        if role == "buyer":
            return Transaction.objects.filter(buyer=user)
        elif role == "seller":
            return Transaction.objects.filter(seller=user)
        return Transaction.objects.filter(buyer=user) | Transaction.objects.filter(seller=user)


class TransactionDetailView(generics.RetrieveAPIView):
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return (
            Transaction.objects.filter(buyer=user) |
            Transaction.objects.filter(seller=user)
        )


class TransactionInitiateView(generics.GenericAPIView):
    serializer_class = TransactionInitiateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        listing = serializer.context["listing"]
        buyer = request.user

        if listing.seller == buyer:
            return Response({"error": "Cannot purchase your own listing."}, status=400)

        # Calculate fees
        amount = listing.price
        fee = (amount * PLATFORM_FEE_PERCENT / 100).quantize(Decimal("0.01"))

        reference = f"AIM-{uuid.uuid4().hex[:16].upper()}"

        with db_transaction.atomic():
            txn = Transaction.objects.create(
                buyer=buyer,
                seller=listing.seller,
                listing=listing,
                amount=amount,
                platform_fee=fee,
                status="pending",
                encrypted_key="",  # will be set when seller releases
                paystack_reference=reference,
            )
            txn.expires_at = timezone.now() + timezone.timedelta(hours=ESCROW_HOURS)
            txn.save(update_fields=["expires_at"])

            _log(txn, "payment_initiated", f"Paystack ref: {reference}", buyer, request)

        # Initialize Paystack
        try:
            ps_data = paystack_api.initialize_payment(
                email=f"{buyer.username}@aim.market",
                amount_ngn=float(amount),
                reference=reference,
                metadata={
                    "transaction_id": str(txn.id),
                    "listing_id": str(listing.id),
                    "buyer_public_key": serializer.validated_data.get("buyer_public_key", ""),
                    "seller_public_key": listing.seller.public_key,
                },
            )
            return Response({
                "transaction_id": str(txn.id),
                "reference": reference,
                "authorization_url": ps_data["authorization_url"],
                "access_code": ps_data["access_code"],
                "amount": float(amount),
                "platform_fee": float(fee),
                "seller_public_key": listing.seller.public_key,
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            txn.status = "cancelled"
            txn.save(update_fields=["status"])
            logger.error(f"Paystack init failed: {e}")
            return Response({"error": "Payment initialization failed. Try again."}, status=502)


class PaystackWebhookView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        # Verify signature
        signature = request.headers.get("X-Paystack-Signature", "")
        raw_body = request.body
        secret = settings.PAYSTACK_SECRET_KEY.encode("utf-8")
        computed = hmac.new(secret, raw_body, hashlib.sha512).hexdigest()

        if not hmac.compare_digest(computed, signature):
            logger.warning("Invalid Paystack webhook signature")
            return Response({"error": "Invalid signature"}, status=400)

        payload = json.loads(raw_body)
        event = payload.get("event")
        data = payload.get("data", {})

        if event == "charge.success":
            reference = data.get("reference")
            try:
                txn = Transaction.objects.get(paystack_reference=reference)
                if txn.status == "pending":
                    with db_transaction.atomic():
                        txn.status = "escrow"
                        txn.save(update_fields=["status"])

                        # Record payment
                        Payment.objects.update_or_create(
                            transaction=txn,
                            defaults={
                                "gateway_reference": reference,
                                "gateway_transaction_id": str(data.get("id", "")),
                                "amount": Decimal(str(data.get("amount", 0))) / 100,
                                "currency": data.get("currency", "NGN"),
                                "status": "completed",
                                "gateway_response": data,
                                "processed_at": timezone.now(),
                            },
                        )
                        # Increment purchase count
                        listing = txn.listing
                        listing.purchase_count += 1
                        listing.save(update_fields=["purchase_count"])

                        _log(txn, "escrow_entered", "Payment confirmed by Paystack")
                        logger.info(f"Transaction {txn.id} moved to escrow")
            except Transaction.DoesNotExist:
                logger.warning(f"Webhook: unknown reference {reference}")

        return Response({"status": "ok"})


class TransactionReleaseView(generics.GenericAPIView):
    serializer_class = ReleaseKeySerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk, *args, **kwargs):
        """
        Seller releases the re-encrypted AES key to buyer.
        Body: { encrypted_key_for_buyer: "<ciphertext>" }
        """
        try:
            txn = Transaction.objects.get(pk=pk, seller=request.user, status="escrow")
        except Transaction.DoesNotExist:
            return Response({"error": "Transaction not found or not in escrow."}, status=404)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        txn.encrypted_key = serializer.validated_data["encrypted_key_for_buyer"]
        txn.status = "released"
        txn.released_at = timezone.now()
        txn.save(update_fields=["encrypted_key", "status", "released_at"])

        EscrowRelease.objects.create(
            transaction=txn,
            released_by=request.user,
            release_type="manual",
            ip_address=request.META.get("REMOTE_ADDR"),
        )
        _log(txn, "key_released", "Seller released encrypted key", request.user, request)

        return Response({"status": "released", "transaction_id": str(txn.id)})


class TransactionConfirmView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk, *args, **kwargs):
        """Buyer confirms receipt — marks transaction complete."""
        try:
            txn = Transaction.objects.get(pk=pk, buyer=request.user, status="released")
        except Transaction.DoesNotExist:
            return Response({"error": "Transaction not found or not yet released."}, status=404)

        txn.status = "released"  # remains released; reputation update happens on review
        txn.save(update_fields=["status"])
        _log(txn, "key_released", "Buyer confirmed receipt", request.user, request)
        return Response({"status": "confirmed"})


# ── Disputes ──────────────────────────────────────────────────────────────────

class DisputeCreateView(generics.GenericAPIView):
    serializer_class = DisputeCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk, *args, **kwargs):
        try:
            txn = Transaction.objects.get(pk=pk, buyer=request.user)
            if txn.status not in ("escrow", "released"):
                return Response({"error": "Can only dispute escrow or released transactions."}, status=400)
            if hasattr(txn, "dispute"):
                return Response({"error": "Dispute already exists."}, status=400)
        except Transaction.DoesNotExist:
            return Response({"error": "Transaction not found."}, status=404)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with db_transaction.atomic():
            dispute = Dispute.objects.create(
                transaction=txn,
                initiated_by=request.user,
                buyer_claim=serializer.validated_data["buyer_claim"],
            )
            txn.status = "disputed"
            txn.save(update_fields=["status"])
            _log(txn, "dispute_opened", "Buyer opened dispute", request.user, request)

        return Response(DisputeSerializer(dispute).data, status=201)


class DisputeListView(generics.ListAPIView):
    serializer_class = DisputeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Dispute.objects.all().order_by("-created_at")
        return Dispute.objects.filter(
            transaction__buyer=user
        ) | Dispute.objects.filter(
            transaction__seller=user
        )


class DisputeDetailView(generics.RetrieveAPIView):
    serializer_class = DisputeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Dispute.objects.all()
        return (
            Dispute.objects.filter(transaction__buyer=user) |
            Dispute.objects.filter(transaction__seller=user)
        )


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def seller_respond_dispute(request, pk):
    """Seller submits their side of the dispute."""
    try:
        dispute = Dispute.objects.get(pk=pk, transaction__seller=request.user, status="open")
    except Dispute.DoesNotExist:
        return Response({"error": "Dispute not found."}, status=404)

    response_text = request.data.get("seller_response", "").strip()
    if not response_text:
        return Response({"error": "Response cannot be empty."}, status=400)

    dispute.seller_response = response_text
    dispute.status = "investigating"
    dispute.save(update_fields=["seller_response", "status"])
    return Response(DisputeSerializer(dispute).data)


@api_view(["POST"])
@permission_classes([permissions.IsAdminUser])
def resolve_dispute(request, pk):
    """Admin resolves a dispute."""
    try:
        dispute = Dispute.objects.get(pk=pk)
    except Dispute.DoesNotExist:
        return Response({"error": "Dispute not found."}, status=404)

    serializer = DisputeResolveSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    d = serializer.validated_data

    with db_transaction.atomic():
        dispute.resolution = d["resolution"]
        dispute.resolution_details = d["resolution_details"]
        dispute.admin_notes = d["admin_notes"]
        dispute.status = "resolved"
        dispute.resolved_at = timezone.now()
        dispute.resolved_by = request.user
        dispute.save()

        txn = dispute.transaction
        if d["resolution"] in ("buyer_favor", "full_refund"):
            txn.status = "refunded"
        elif d["resolution"] == "seller_favor":
            txn.status = "released"
        txn.save(update_fields=["status"])

        # Slash seller stake if requested
        if d.get("slash_stake"):
            Stake.objects.filter(
                user=txn.seller,
                transaction=txn,
                is_locked=True,
            ).update(is_locked=False, released_at=timezone.now())
            txn.seller.stake_balance = max(Decimal("0"), txn.seller.stake_balance - txn.amount)
            txn.seller.save(update_fields=["stake_balance"])

        _log(txn, "dispute_resolved", f"Admin resolution: {d['resolution']}", request.user, request)

    return Response(DisputeSerializer(dispute).data)


# ── Reviews ───────────────────────────────────────────────────────────────────

class ReviewCreateView(generics.GenericAPIView):
    serializer_class = ReviewCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk, *args, **kwargs):
        try:
            txn = Transaction.objects.get(pk=pk, buyer=request.user, status="released")
        except Transaction.DoesNotExist:
            return Response({"error": "Transaction not found or not completed."}, status=404)

        if hasattr(txn, "review"):
            return Response({"error": "Review already submitted."}, status=400)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with db_transaction.atomic():
            review = Review.objects.create(
                transaction=txn,
                reviewer=request.user,
                reviewed_user=txn.seller,
                **serializer.validated_data,
            )
            # Update seller reputation (weighted by transaction amount)
            _update_reputation(txn.seller)

        return Response(ReviewSerializer(review).data, status=201)


def _update_reputation(user):
    """Recompute weighted reputation score for a user."""
    reviews = Review.objects.filter(reviewed_user=user, is_public=True).select_related("transaction")
    if not reviews.exists():
        return
    total_weight = Decimal("0")
    weighted_sum = Decimal("0")
    for rev in reviews:
        weight = rev.transaction.amount
        weighted_sum += Decimal(str(rev.rating)) * weight
        total_weight += weight
    if total_weight > 0:
        user.reputation_score = (weighted_sum / total_weight).quantize(Decimal("0.01"))
        user.save(update_fields=["reputation_score"])


class ReviewListView(generics.ListAPIView):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user_id = self.kwargs.get("user_id")
        return Review.objects.filter(reviewed_user_id=user_id, is_public=True).order_by("-created_at")


# ── Stakes ────────────────────────────────────────────────────────────────────

class StakeCreateView(generics.GenericAPIView):
    serializer_class = StakeCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        amount = serializer.validated_data["amount"]

        with db_transaction.atomic():
            stake = Stake.objects.create(
                user=request.user,
                amount=amount,
                is_locked=True,
                lock_reason="seller_stake",
            )
            request.user.stake_balance += amount
            request.user.save(update_fields=["stake_balance"])

        return Response(StakeSerializer(stake).data, status=201)


class StakeListView(generics.ListAPIView):
    serializer_class = StakeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Stake.objects.filter(user=self.request.user).order_by("-created_at")
