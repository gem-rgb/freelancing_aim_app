from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    ProofViewSet, VerificationViewSet, ReproducibilityTestViewSet,
    PostSaleReportViewSet, VerificationQueueViewSet, VerificationConsensusViewSet,
    VerificationScoreViewSet, ListingVerificationViewSet,
    ListingDemoViewSet,
)

router = DefaultRouter()
router.register(r'proofs',                ProofViewSet,                basename='proof')
router.register(r'verifications',         VerificationViewSet,         basename='verification')
router.register(r'reproducibility-tests', ReproducibilityTestViewSet,  basename='reproducibility-test')
router.register(r'post-sale-reports',     PostSaleReportViewSet,       basename='post-sale-report')
router.register(r'queue',                 VerificationQueueViewSet,    basename='queue')
router.register(r'consensus',             VerificationConsensusViewSet,basename='consensus')
router.register(r'scores',                VerificationScoreViewSet,    basename='score')
router.register(r'listings',              ListingVerificationViewSet,  basename='listing-verification')
router.register(r'demos',                 ListingDemoViewSet,          basename='listing-demo')

urlpatterns = [
    path('api/v1/verification/', include(router.urls)),
]
