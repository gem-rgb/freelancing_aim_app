from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import ProductFingerprint, DuplicateDetectionResult, OwnershipLineage, ReuploadAlert, FraudReport
from .serializers import (
    ProductFingerprintSerializer, DuplicateDetectionResultSerializer,
    OwnershipLineageSerializer, ReuploadAlertSerializer, FraudReportSerializer,
)


class ProductFingerprintView(generics.RetrieveAPIView):
    """GET /api/fraud/fingerprint/<listing_id>/"""
    serializer_class = ProductFingerprintSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return ProductFingerprint.objects.filter(listing_id=self.kwargs['listing_id']).first()


class DuplicateScanResultsView(generics.ListAPIView):
    """GET /api/fraud/duplicates/<listing_id>/"""
    serializer_class = DuplicateDetectionResultSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        fp = ProductFingerprint.objects.filter(listing_id=self.kwargs['listing_id']).first()
        if not fp:
            return DuplicateDetectionResult.objects.none()
        return DuplicateDetectionResult.objects.filter(source_fingerprint=fp)


class OwnershipLineageView(generics.ListAPIView):
    """GET /api/fraud/lineage/<listing_id>/"""
    serializer_class = OwnershipLineageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        fp = ProductFingerprint.objects.filter(listing_id=self.kwargs['listing_id']).first()
        if not fp:
            return OwnershipLineage.objects.none()
        return OwnershipLineage.objects.filter(fingerprint=fp)


class ReuploadAlertsView(generics.ListAPIView):
    """GET /api/fraud/alerts/ — alerts for current user's listings."""
    serializer_class = ReuploadAlertSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ReuploadAlert.objects.filter(
            flagged_listing__seller=self.request.user
        ).select_related('flagged_listing')


class SubmitFraudReportView(generics.CreateAPIView):
    """POST /api/fraud/reports/"""
    serializer_class = FraudReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(reporter=self.request.user)


class MyFraudReportsView(generics.ListAPIView):
    """GET /api/fraud/reports/mine/"""
    serializer_class = FraudReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return FraudReport.objects.filter(reporter=self.request.user)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def fraud_dashboard_stats(request):
    """GET /api/fraud/stats/ — fraud overview stats (admin or seller)."""
    user = request.user
    if user.is_staff:
        alerts = ReuploadAlert.objects.filter(status='open').count()
        reports = FraudReport.objects.filter(status='submitted').count()
        confirmed = FraudReport.objects.filter(status='confirmed').count()
    else:
        alerts = ReuploadAlert.objects.filter(flagged_listing__seller=user, status='open').count()
        reports = FraudReport.objects.filter(reported_user=user).count()
        confirmed = FraudReport.objects.filter(reported_user=user, status='confirmed').count()
    return Response({
        'open_alerts': alerts,
        'pending_reports': reports,
        'confirmed_fraud': confirmed,
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def analyze_listing_risk(request):
    """POST /api/fraud/analyze-risk/ — ML-powered listing risk scoring."""
    title = request.data.get('title', '')
    description = request.data.get('description', '')
    price = request.data.get('price', 0)

    if not title or not description:
        return Response({'error': 'Title and description are required.'}, status=400)

    from aim_marketplace.ml_client import ml_client

    # Gather seller context
    seller = request.user
    from django.utils import timezone
    account_age = (timezone.now() - seller.date_joined).days if hasattr(seller, 'date_joined') else 0

    trust_score = 50.0
    try:
        from ratings.models import SellerTrustProfile
        profile = SellerTrustProfile.objects.filter(seller=seller).first()
        if profile:
            trust_score = float(profile.composite_trust_score)
    except Exception:
        pass

    result = ml_client.analyze_listing_risk(
        title=title,
        description=description,
        price=float(price),
        seller_account_age_days=account_age,
        seller_trust_score=trust_score,
    )

    if result is None:
        return Response({'error': 'ML service unavailable.'}, status=503)

    return Response(result)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def generate_fingerprint(request, listing_id):
    """POST /api/fraud/fingerprint/<listing_id>/generate/ — ML-powered content fingerprinting."""
    from aim_marketplace.ml_client import ml_client
    from listings.models import Listing

    try:
        listing = Listing.objects.get(id=listing_id)
    except Listing.DoesNotExist:
        return Response({'error': 'Listing not found.'}, status=404)

    content = request.data.get('content_text', listing.description or '')
    result = ml_client.create_fingerprint(
        content_text=content,
        title=listing.title,
        description=listing.description or '',
    )

    if result is None:
        return Response({'error': 'ML service unavailable.'}, status=503)

    # Save fingerprint to database
    from .services import FingerprintService
    fp = FingerprintService.create_fingerprint(
        listing=listing,
        content_hash=result.get('content_hash', ''),
        file_size=len(content.encode('utf-8')),
        metadata_hash=result.get('metadata_hash', ''),
    )

    return Response({
        'fingerprint_id': str(fp.id),
        'content_hash': result.get('content_hash'),
        'metadata_hash': result.get('metadata_hash'),
        'text_stats': result.get('text_stats'),
        'has_embedding': bool(result.get('embedding')),
    })
