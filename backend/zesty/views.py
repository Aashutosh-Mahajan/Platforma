from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone
from datetime import timedelta

from zesty.models import Restaurant, MenuItem, Order, OrderItem, Review, DeliveryTracking
from zesty.serializers import (
    RestaurantListSerializer, RestaurantDetailSerializer,
    MenuItemSerializer, OrderSerializer, CreateOrderSerializer,
    ReviewSerializer, DeliveryTrackingSerializer
)
from core.models import Payment


class RestaurantViewSet(viewsets.ReadOnlyModelViewSet):
    """List and retrieve restaurants."""
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['name', 'cuisine_types']
    ordering_fields = ['rating', 'delivery_fee', 'delivery_time_max', 'review_count']
    ordering = ['-rating']

    def get_queryset(self):
        return Restaurant.objects.filter(is_active=True)

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return RestaurantDetailSerializer
        return RestaurantListSerializer

    @action(detail=True, methods=['get'])
    def menu(self, request, pk=None):
        """Get menu items for a restaurant."""
        restaurant = self.get_object()
        items = restaurant.menu_items.filter(is_available=True)

        category = request.query_params.get('category')
        if category:
            items = items.filter(category__iexact=category)

        search = request.query_params.get('search')
        if search:
            items = items.filter(name__icontains=search)

        serializer = MenuItemSerializer(items, many=True)
        return Response({'count': items.count(), 'results': serializer.data})

    @action(detail=True, methods=['get', 'post'])
    def reviews(self, request, pk=None):
        """Get or create reviews for a restaurant."""
        restaurant = self.get_object()

        if request.method == 'GET':
            reviews = restaurant.reviews.all().order_by('-created_at')
            serializer = ReviewSerializer(reviews, many=True)
            return Response({'count': reviews.count(), 'results': serializer.data})

        # POST - create review
        if not request.user.is_authenticated:
            return Response({'error': 'Authentication required.'}, status=401)

        serializer = ReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user, restaurant=restaurant)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class OrderViewSet(viewsets.ModelViewSet):
    """Manage food orders."""
    permission_classes = [IsAuthenticated]
    serializer_class = OrderSerializer

    def get_queryset(self):
        qs = Order.objects.filter(user=self.request.user).select_related(
            'restaurant', 'payment'
        ).prefetch_related('items__menu_item')

        order_status = self.request.query_params.get('status')
        if order_status:
            qs = qs.filter(status=order_status)
        return qs

    def create(self, request, *args, **kwargs):
        """Create a new order with items."""
        serializer = CreateOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Get restaurant
        try:
            restaurant = Restaurant.objects.get(id=data['restaurant_id'], is_active=True)
        except Restaurant.DoesNotExist:
            return Response({'error': 'Restaurant not found.'}, status=404)

        # Create order
        order = Order.objects.create(
            user=request.user,
            restaurant=restaurant,
            delivery_address_id=data.get('delivery_address_id'),
            special_instructions=data.get('special_instructions', ''),
            estimated_delivery=timezone.now() + timedelta(minutes=restaurant.delivery_time_max),
        )

        # Create order items
        for item_data in data['items']:
            try:
                menu_item = MenuItem.objects.get(
                    id=item_data['menu_item_id'],
                    restaurant=restaurant,
                    is_available=True
                )
            except MenuItem.DoesNotExist:
                order.delete()
                return Response({'error': f"Menu item {item_data['menu_item_id']} not found."}, status=404)

            OrderItem.objects.create(
                order=order,
                menu_item=menu_item,
                quantity=item_data['quantity'],
                unit_price=menu_item.price,
                total=menu_item.price * item_data['quantity'],
            )

        # Calculate totals
        order.calculate_totals()

        # Simulate payment
        payment = Payment.objects.create(
            user=request.user,
            amount=order.total,
            method=data.get('payment_method', 'credit_card'),
            content_type='order',
            object_id=order.id,
        )
        payment.simulate_payment()
        order.payment = payment
        order.status = 'confirmed'
        order.save()

        # Create delivery tracking
        DeliveryTracking.objects.create(
            order=order,
            eta=order.estimated_delivery,
        )

        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'])
    def cancel(self, request, pk=None):
        """Cancel an order."""
        order = self.get_object()
        if order.status in ('pending', 'confirmed'):
            order.status = 'cancelled'
            order.save()
            if order.payment:
                order.payment.status = 'refunded'
                order.payment.save()
            return Response(OrderSerializer(order).data)
        return Response(
            {'error': 'Order cannot be cancelled at this stage.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    @action(detail=True, methods=['get'])
    def tracking(self, request, pk=None):
        """Get delivery tracking for an order."""
        order = self.get_object()
        try:
            tracking = order.tracking
            return Response(DeliveryTrackingSerializer(tracking).data)
        except DeliveryTracking.DoesNotExist:
            return Response({'error': 'No tracking info available.'}, status=404)

    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        """Update order status (for simulation/admin)."""
        order = self.get_object()
        new_status = request.data.get('status')
        valid_statuses = [s[0] for s in Order.STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response({'error': f'Invalid status. Choose from: {valid_statuses}'}, status=400)
        order.status = new_status
        if new_status == 'delivered':
            order.actual_delivery = timezone.now()
        order.save()
        return Response(OrderSerializer(order).data)
