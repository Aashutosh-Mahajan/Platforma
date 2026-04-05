from django.urls import path, include
from rest_framework.routers import DefaultRouter
from eventra.views import EventViewSet, BookingViewSet, TicketTypeViewSet, SeatViewSet

router = DefaultRouter()
router.register(r'events', EventViewSet, basename='event')
router.register(r'bookings', BookingViewSet, basename='booking')
router.register(r'ticket-types', TicketTypeViewSet, basename='ticket-type')
router.register(r'seats', SeatViewSet, basename='seat')

urlpatterns = [
    path('', include(router.urls)),
]
