"""
Fraud detection service — fingerprinting, duplicate detection, ownership tracking.
"""
import hashlib
from decimal import Decimal
from django.utils import timezone
from .models import ProductFingerprint, DuplicateDetectionResult, OwnershipLineage, ReuploadAlert
import logging

logger = logging.getLogger(__name__)

SIMILARITY_THRESHOLD = Decimal('0.85')


class FingerprintService:
    """Product content fingerprinting and duplicate detection."""

    @classmethod
    def create_fingerprint(cls, listing, content_hash, file_size, mime_type='', metadata_hash=''):
        """Create a fingerprint for a listing's content."""
        fp, created = ProductFingerprint.objects.get_or_create(
            listing=listing,
            defaults={
                'content_hash_sha256': content_hash,
                'metadata_hash': metadata_hash or hashlib.sha256(listing.title.encode()).hexdigest(),
                'file_size_bytes': file_size,
                'mime_type': mime_type,
            },
        )
        if created:
            # Create original ownership entry
            OwnershipLineage.objects.create(
                fingerprint=fp,
                owner=listing.seller,
                acquisition_type='original',
            )
            # Run duplicate scan
            cls.scan_for_duplicates(fp)
        return fp

    @classmethod
    def scan_for_duplicates(cls, fingerprint):
        """Scan existing fingerprints for potential duplicates."""
        exact_matches = ProductFingerprint.objects.filter(
            content_hash_sha256=fingerprint.content_hash_sha256,
        ).exclude(id=fingerprint.id)

        results = []
        for match in exact_matches:
            result = DuplicateDetectionResult.objects.create(
                source_fingerprint=fingerprint,
                matched_fingerprint=match,
                similarity_score=Decimal('1.0000'),
                hash_match=True,
                status='confirmed_duplicate',
            )
            results.append(result)

            # Create reupload alert
            ReuploadAlert.objects.create(
                duplicate_result=result,
                flagged_listing=fingerprint.listing,
                original_listing=match.listing,
                severity='critical' if match.listing.seller != fingerprint.listing.seller else 'high',
                description=f'Exact hash match with listing "{match.listing.title}"',
            )
            logger.warning(f"Duplicate detected: {fingerprint.listing.title} matches {match.listing.title}")

        # Metadata similarity check
        meta_matches = ProductFingerprint.objects.filter(
            metadata_hash=fingerprint.metadata_hash,
        ).exclude(id=fingerprint.id).exclude(id__in=[m.id for m in exact_matches])

        for match in meta_matches:
            result = DuplicateDetectionResult.objects.create(
                source_fingerprint=fingerprint,
                matched_fingerprint=match,
                similarity_score=Decimal('0.7500'),
                metadata_match=True,
                status='possible_duplicate',
            )
            results.append(result)

        return results

    @classmethod
    def record_purchase_ownership(cls, listing, buyer, transaction):
        """Record ownership transfer after purchase."""
        fp = ProductFingerprint.objects.filter(listing=listing).first()
        if not fp:
            return None
        return OwnershipLineage.objects.create(
            fingerprint=fp,
            owner=buyer,
            acquisition_type='purchase',
            transaction=transaction,
        )

    @classmethod
    def get_ownership_chain(cls, listing):
        """Get full ownership chain for a listing."""
        fp = ProductFingerprint.objects.filter(listing=listing).first()
        if not fp:
            return []
        return list(OwnershipLineage.objects.filter(fingerprint=fp).select_related('owner'))
