from django.urls import path, include
from rest_framework.routers import DefaultRouter
from eventra.views import EventViewSet, BookingViewSet

router = DefaultRouter()
router.register(r'events', EventViewSet, basename='event')
router.register(r'bookings', BookingViewSet, basename='booking')

urlpatterns = [
    path('', include(router.urls)),
]
