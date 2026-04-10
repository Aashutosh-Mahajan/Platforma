from django.urls import path

from orders.views import OrderCreateAPIView, OrderDetailAPIView, OrderStatusUpdateAPIView

urlpatterns = [
    path('', OrderCreateAPIView.as_view(), name='order-create'),
    path('<int:order_id>/', OrderDetailAPIView.as_view(), name='order-detail'),
    path('<int:order_id>/status/', OrderStatusUpdateAPIView.as_view(), name='order-status-update'),
]