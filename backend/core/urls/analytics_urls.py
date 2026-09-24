from django.urls import path

from core.analytics import (
    EventraAnalyticsView, OrganizerAnalyticsView, PlatformAnalyticsView,
    RestaurantAnalyticsView, ZestyAnalyticsView,
)

urlpatterns = [
    path('platform', PlatformAnalyticsView.as_view(), name='analytics-platform'),
    path('zesty', ZestyAnalyticsView.as_view(), name='analytics-zesty'),
    path('eventra', EventraAnalyticsView.as_view(), name='analytics-eventra'),
    path('restaurants/<int:pk>', RestaurantAnalyticsView.as_view(), name='analytics-restaurant'),
    path('organizer', OrganizerAnalyticsView.as_view(), name='analytics-organizer'),
]
