import logging
import uuid
from django.utils import timezone
from django.db import transaction
from rest_framework import generics, permissions, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
import boto3
from botocore.config import Config
from django.conf import settings

from .models import Listing, Category, EncryptedContent, SavedListing, ListingView
from .serializers import (
    ListingSerializer, ListingCreateSerializer, ListingUpdateSerializer,
    CategorySerializer, PresignedUrlSerializer,
)

logger = logging.getLogger(__name__)


def get_s3_client():
    return boto3.client(
        "s3",
        endpoint_url=getattr(settings, "AWS_S3_ENDPOINT_URL", None),
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION_NAME,
        config=Config(signature_version="s3v4"),
    )


class CategoryListView(generics.ListAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]


class ListingListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["category", "status"]
    search_fields = ["title", "description", "tags"]
    ordering_fields = ["price", "created_at", "view_count", "purchase_count"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ListingCreateSerializer
        return ListingSerializer

    def get_queryset(self):
        qs = Listing.objects.filter(status="active")
        min_price = self.request.query_params.get("min_price")
        max_price = self.request.query_params.get("max_price")
        featured = self.request.query_params.get("featured")
        if min_price:
            qs = qs.filter(price__gte=min_price)
        if max_price:
            qs = qs.filter(price__lte=max_price)
        if featured == "true":
            qs = qs.filter(is_featured=True)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        listing = serializer.save()
        return Response(
            ListingSerializer(listing, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class ListingDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    lookup_field = "pk"

    def get_serializer_class(self):
        if self.request.method in ["PUT", "PATCH"]:
            return ListingUpdateSerializer
        return ListingSerializer

    def get_queryset(self):
        return Listing.objects.all()

    def retrieve(self, request, *args, **kwargs):
        listing = self.get_object()
        # Track view
        ip = request.META.get("REMOTE_ADDR", "")
        ListingView.objects.create(
            listing=listing,
            viewer=request.user if request.user.is_authenticated else None,
            ip_address=ip or "0.0.0.0",
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )
        listing.view_count += 1
        listing.save(update_fields=["view_count"])
        return Response(ListingSerializer(listing, context={"request": request}).data)

    def update(self, request, *args, **kwargs):
        listing = self.get_object()
        if listing.seller != request.user:
            return Response({"error": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        listing = self.get_object()
        if listing.seller != request.user:
            return Response({"error": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        listing.status = "archived"
        listing.save(update_fields=["status"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class MyListingsView(generics.ListAPIView):
    serializer_class = ListingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Listing.objects.filter(seller=self.request.user)


class SavedListView(generics.ListAPIView):
    serializer_class = ListingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        saved_ids = SavedListing.objects.filter(
            user=self.request.user
        ).values_list("listing_id", flat=True)
        return Listing.objects.filter(id__in=saved_ids)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def save_listing(request, pk):
    listing = generics.get_object_or_404(Listing, pk=pk)
    _, created = SavedListing.objects.get_or_create(user=request.user, listing=listing)
    return Response({"saved": True, "created": created})


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def unsave_listing(request, pk):
    SavedListing.objects.filter(user=request.user, listing_id=pk).delete()
    return Response({"saved": False})


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def get_upload_url(request, pk):
    """
    Generate a presigned PUT URL for uploading encrypted content to MinIO/S3.
    After uploading, client should PATCH the listing with encrypted_content_url.
    """
    listing = generics.get_object_or_404(Listing, pk=pk, seller=request.user)
    serializer = PresignedUrlSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    filename = serializer.validated_data["filename"]
    content_type = serializer.validated_data["content_type"]
    file_size = serializer.validated_data["file_size"]
    content_hash = serializer.validated_data["content_hash"]

    # Generate a unique object key
    key = f"listings/{listing.id}/{uuid.uuid4()}_{filename}"

    try:
        s3 = get_s3_client()
        presigned_url = s3.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": settings.AWS_STORAGE_BUCKET_NAME,
                "Key": key,
                "ContentType": content_type,
            },
            ExpiresIn=900,  # 15 min
        )

        # Build the public object URL
        endpoint = getattr(settings, "AWS_S3_ENDPOINT_URL", "")
        bucket = settings.AWS_STORAGE_BUCKET_NAME
        content_url = f"{endpoint}/{bucket}/{key}"

        # Save/update EncryptedContent meta
        EncryptedContent.objects.update_or_create(
            listing=listing,
            defaults={
                "content_hash": content_hash,
                "file_size": file_size,
            },
        )

        # Update listing with the object URL and activate it
        listing.encrypted_content_url = content_url
        listing.status = "active"
        listing.save(update_fields=["encrypted_content_url", "status"])

        return Response({
            "upload_url": presigned_url,
            "object_key": key,
            "content_url": content_url,
        })
    except Exception as e:
        logger.error(f"Presigned URL error: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
