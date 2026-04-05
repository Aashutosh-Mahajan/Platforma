from django.urls import path, include
from rest_framework.routers import DefaultRouter
from zesty.views import LandingPageView, RestaurantViewSet, OrderViewSet

router = DefaultRouter()
router.register(r'restaurants', RestaurantViewSet, basename='restaurant')
router.register(r'orders', OrderViewSet, basename='order')

urlpatterns = [
    path('landing-page/', LandingPageView.as_view(), name='landing-page'),
    path('', include(router.urls)),
]
