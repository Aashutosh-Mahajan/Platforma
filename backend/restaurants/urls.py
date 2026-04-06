from django.urls import path

from restaurants.views import (
    AreasAPIView,
    CuisinesAPIView,
    RestaurantDetailAPIView,
    RestaurantListAPIView,
)

urlpatterns = [
    path("restaurants/", RestaurantListAPIView.as_view(), name="restaurant-list"),
    path("restaurants/<int:id>/", RestaurantDetailAPIView.as_view(), name="restaurant-detail"),
    path("areas/", AreasAPIView.as_view(), name="areas-list"),
    path("cuisines/", CuisinesAPIView.as_view(), name="cuisines-list"),
]
