from django.urls import path, include
from rest_framework.routers import DefaultRouter
from zesty.views import (
    LandingPageView, RestaurantViewSet, MenuItemViewSet, OrderViewSet, PromotionViewSet,
    CartView, CartItemListCreateView, CartItemDetailView, PromoValidateView, PayoutViewSet
)

router = DefaultRouter()
router.register(r'restaurants', RestaurantViewSet, basename='restaurant')
router.register(r'menu-items', MenuItemViewSet, basename='menu-item')
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'promotions', PromotionViewSet, basename='promotion')
router.register(r'payouts', PayoutViewSet, basename='payout')

urlpatterns = [
    path('landing-page/', LandingPageView.as_view(), name='landing-page'),
    path('cart', CartView.as_view(), name='cart'),
    path('cart/items', CartItemListCreateView.as_view(), name='cart-item-create'),
    path('cart/items/<int:item_id>', CartItemDetailView.as_view(), name='cart-item-detail'),
    path('promotions/validate', PromoValidateView.as_view(), name='promotion-validate'),
    path('', include(router.urls)),
]
