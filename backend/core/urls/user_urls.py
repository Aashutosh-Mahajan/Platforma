from django.urls import path, include
from rest_framework.routers import DefaultRouter
from core.views import ProfileView, AddressViewSet

router = DefaultRouter()
router.register(r'addresses', AddressViewSet, basename='address')

urlpatterns = [
    path('profile/', ProfileView.as_view(), name='user-profile'),
    path('', include(router.urls)),
]
