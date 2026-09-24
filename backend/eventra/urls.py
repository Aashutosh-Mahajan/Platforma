from django.urls import path, include
from rest_framework.routers import DefaultRouter
from eventra.views import (
    EventViewSet, BookingViewSet, TicketTypeViewSet, SeatViewSet,
    SeatHoldCreateView, SeatHoldDeleteView, TicketVerifyView, EventTypesView,
)

router = DefaultRouter()
router.register(r'events', EventViewSet, basename='event')
router.register(r'bookings', BookingViewSet, basename='booking')
router.register(r'ticket-types', TicketTypeViewSet, basename='ticket-type')
router.register(r'seats', SeatViewSet, basename='seat')

urlpatterns = [
    # Must come before the router's `seats/<pk>/` include so 'hold' isn't
    # swallowed as a seat pk.
    path('event-types', EventTypesView.as_view(), name='event-types'),
    path('seats/hold', SeatHoldCreateView.as_view(), name='seat-hold-create'),
    path('seats/hold/<int:pk>', SeatHoldDeleteView.as_view(), name='seat-hold-delete'),
    path('tickets/<str:token>/verify', TicketVerifyView.as_view(), name='ticket-verify'),
    path('', include(router.urls)),
]
