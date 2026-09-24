from django.urls import path
from core.admin_views import (
    AdminRestaurantVerifyView, AdminEventApproveView, AdminUserSuspendView, AdminAuditLogListView,
    AdminPendingRestaurantsView, AdminPendingEventsView, AdminUserListView, AdminAnalyticsOverviewView,
    AdminRestaurantCommissionView,
)

urlpatterns = [
    path('restaurants/pending', AdminPendingRestaurantsView.as_view(), name='admin-restaurants-pending'),
    path('restaurants/<int:pk>/verify', AdminRestaurantVerifyView.as_view(), name='admin-restaurant-verify'),
    path('restaurants/<int:pk>/commission', AdminRestaurantCommissionView.as_view(), name='admin-restaurant-commission'),
    path('events/pending', AdminPendingEventsView.as_view(), name='admin-events-pending'),
    path('events/<int:pk>/approve', AdminEventApproveView.as_view(), name='admin-event-approve'),
    path('users', AdminUserListView.as_view(), name='admin-users'),
    path('users/<int:pk>/suspend', AdminUserSuspendView.as_view(), name='admin-user-suspend'),
    path('audit-log', AdminAuditLogListView.as_view(), name='admin-audit-log'),
    path('analytics/overview', AdminAnalyticsOverviewView.as_view(), name='admin-analytics-overview'),
]
