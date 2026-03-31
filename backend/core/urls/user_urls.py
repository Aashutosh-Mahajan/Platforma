from django.urls import path, include
from rest_framework.routers import DefaultRouter
from core.views import UserProfileView, AddressViewSet

router = DefaultRouter()
router.register(r'addresses', AddressViewSet, basename='address')

urlpatterns = [
    path('profile/', UserProfileView.as_view(), name='user-profile'),
    path('', include(router.urls)),
]
