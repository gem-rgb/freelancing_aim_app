from django.urls import path
from . import views

app_name = "listings"

urlpatterns = [
    path("",                                         views.ListingListCreateView.as_view(),     name="listing_list_create"),
    path("categories/",                              views.CategoryListView.as_view(),           name="category_list"),
    path("my/",                                      views.MyListingsView.as_view(),             name="my_listings"),
    path("saved/",                                   views.SavedListView.as_view(),              name="saved_listings"),
    path("<uuid:pk>/",                               views.ListingDetailView.as_view(),          name="listing_detail"),
    path("<uuid:pk>/save/",                          views.save_listing,                         name="save_listing"),
    path("<uuid:pk>/unsave/",                        views.unsave_listing,                       name="unsave_listing"),
    path("<uuid:pk>/upload-url/",                    views.get_upload_url,                       name="upload_url"),
    # Preview media
    path("<uuid:pk>/preview-media/",                 views.PreviewMediaListCreateView.as_view(), name="preview_media_list"),
    path("<uuid:pk>/preview-media/upload-url/",      views.preview_media_upload_url,             name="preview_media_upload_url"),
    path("<uuid:pk>/preview-media/<uuid:media_pk>/", views.PreviewMediaDetailView.as_view(),     name="preview_media_detail"),
]
