from django.urls import path
from . import views

urlpatterns = [
    path('fingerprint/<uuid:listing_id>/', views.ProductFingerprintView.as_view(), name='fraud-fingerprint'),
    path('fingerprint/<uuid:listing_id>/generate/', views.generate_fingerprint, name='fraud-fingerprint-generate'),
    path('duplicates/<uuid:listing_id>/', views.DuplicateScanResultsView.as_view(), name='fraud-duplicates'),
    path('lineage/<uuid:listing_id>/', views.OwnershipLineageView.as_view(), name='fraud-lineage'),
    path('alerts/', views.ReuploadAlertsView.as_view(), name='fraud-alerts'),
    path('reports/', views.SubmitFraudReportView.as_view(), name='fraud-report-create'),
    path('reports/mine/', views.MyFraudReportsView.as_view(), name='fraud-reports-mine'),
    path('stats/', views.fraud_dashboard_stats, name='fraud-stats'),
    path('analyze-risk/', views.analyze_listing_risk, name='fraud-analyze-risk'),
]

