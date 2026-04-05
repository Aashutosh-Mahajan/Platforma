from rest_framework import viewsets, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.views import APIView
from django.utils import timezone
from django.db import transaction
from datetime import timedelta

from zesty.landing_content import build_landing_page_content
from zesty.models import Restaurant, MenuItem, Order, OrderItem, Review, DeliveryTracking
from zesty.serializers import (
    RestaurantListSerializer, RestaurantDetailSerializer,
    MenuItemSerializer, OrderSerializer, OrderListSerializer, OrderDetailSerializer,
    OrderCreateSerializer, ReviewSerializer, ReviewCreateSerializer, DeliveryTrackingSerializer
)
from core.models import Payment, Notification
from utils.pagination import StandardPagination


class LandingPageView(APIView):
    """Serve public landing page content for the frontend."""

    permission_classes = [AllowAny]

    def get(self, request):
        return Response(build_landing_page_content(request))


class RestaurantViewSet(viewsets.ModelViewSet):
    """List, retrieve, and manage restaurants."""
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['name', 'cuisine_types']
    ordering_fields = ['rating', 'delivery_fee', 'delivery_time_max', 'review_count']
    ordering = ['-rating']
    lookup_field = 'pk'
    lookup_url_kwarg = 'pk'
    pagination_class = StandardPagination

    def get_queryset(self):
        # For owners, show their own restaurants
        if self.action in ['update', 'partial_update', 'destroy', 'toggle_active']:
            return Restaurant.objects.filter(owner=self.request.user)
        
        # For list/retrieve, show only active restaurants
        return Restaurant.objects.filter(is_active=True)

    def get_object(self):
        # Override to avoid filter_queryset() which applies search/ordering filters
        queryset = self.get_queryset()
        
        # Perform the lookup
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        assert lookup_url_kwarg in self.kwargs, (
            'Expected view %s to be called with a URL keyword argument '
            'named "%s". Fix your URL conf, or set the `.lookup_field` '
            'attribute on the view correctly.' %
            (self.__class__.__name__, lookup_url_kwarg)
        )
        
        filter_kwargs = {self.lookup_field: self.kwargs[lookup_url_kwarg]}
        obj = queryset.get(**filter_kwargs)
        
        # May raise a permission denied
        self.check_object_permissions(self.request, obj)
        
        return obj

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return RestaurantDetailSerializer
        return RestaurantListSerializer

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

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

        # Validate user has a delivered order from this restaurant
        delivered_order = Order.objects.filter(
            user=request.user,
            restaurant=restaurant,
            status='delivered'
        ).exists()

        if not delivered_order:
            return Response(
                {'error': 'You can only review restaurants after your order has been delivered.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if user already reviewed this restaurant
        existing_review = Review.objects.filter(
            user=request.user,
            restaurant=restaurant
        ).exists()

        if existing_review:
            return Response(
                {'error': 'You have already reviewed this restaurant.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = ReviewCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Create review and update restaurant rating
        review = serializer.save(user=request.user, restaurant=restaurant)
        
        return Response(ReviewSerializer(review).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'])
    def toggle_active(self, request, pk=None):
        """Toggle restaurant active status."""
        restaurant = self.get_object()
        if restaurant.owner != request.user:
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        
        restaurant.is_active = not restaurant.is_active
        restaurant.save()
        return Response(RestaurantDetailSerializer(restaurant).data)


class MenuItemViewSet(viewsets.ModelViewSet):
    """CRUD for menu items."""
    permission_classes = [IsAuthenticated]
    serializer_class = MenuItemSerializer
    pagination_class = StandardPagination

    def get_queryset(self):
        # For owners, show their own restaurant's menu items
        if self.action in ['update', 'partial_update', 'destroy', 'toggle_available']:
            return MenuItem.objects.filter(restaurant__owner=self.request.user)
        
        # For list/retrieve, show only available items
        return MenuItem.objects.filter(is_available=True)

    def perform_create(self, serializer):
        # Ensure the restaurant belongs to the user
        restaurant_id = self.request.data.get('restaurant')
        try:
            restaurant = Restaurant.objects.get(id=restaurant_id, owner=self.request.user)
            serializer.save(restaurant=restaurant)
        except Restaurant.DoesNotExist:
            raise serializers.ValidationError({'error': 'Restaurant not found.'})

    @action(detail=True, methods=['patch'])
    def toggle_available(self, request, pk=None):
        """Toggle menu item availability."""
        menu_item = self.get_object()
        if menu_item.restaurant.owner != request.user:
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        
        menu_item.is_available = not menu_item.is_available
        menu_item.save()
        return Response(MenuItemSerializer(menu_item).data)


class OrderViewSet(viewsets.ModelViewSet):
    """Manage food orders."""
    permission_classes = [IsAuthenticated]
    serializer_class = OrderSerializer

    def get_queryset(self):
        qs = Order.objects.filter(user=self.request.user).select_related(
            'restaurant', 'payment', 'delivery_address'
        ).prefetch_related('items__menu_item')

        order_status = self.request.query_params.get('status')
        if order_status:
            qs = qs.filter(status=order_status)
        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return OrderListSerializer
        elif self.action == 'retrieve':
            return OrderDetailSerializer
        elif self.action == 'create':
            return OrderCreateSerializer
        return OrderSerializer

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Create a new order with items and process payment."""
        serializer = OrderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Get restaurant
        try:
            restaurant = Restaurant.objects.get(id=data['restaurant_id'], is_active=True)
        except Restaurant.DoesNotExist:
            return Response({'error': 'Restaurant not found.'}, status=404)

        # Validate delivery address if provided
        delivery_address = None
        if data.get('delivery_address_id'):
            try:
                delivery_address = request.user.addresses.get(id=data['delivery_address_id'])
            except Exception:
                return Response({'error': 'Delivery address not found.'}, status=404)

        # Create order
        order = Order.objects.create(
            user=request.user,
            restaurant=restaurant,
            delivery_address=delivery_address,
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

        # Handle payment for non-COD orders
        payment_method = data.get('payment_method', 'credit_card')
        if payment_method != 'cash_on_delivery':
            # Create payment record
            payment = Payment.objects.create(
                user=request.user,
                amount=order.total,
                method=payment_method,
                content_type='order',
                object_id=order.id,
            )
            
            # Simulate payment
            payment.simulate_payment()
            
            # Check if payment was successful
            if payment.status != 'completed':
                order.delete()
                return Response(
                    {'error': 'Payment processing failed. Order not created.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            order.payment = payment
            order.status = 'confirmed'
            order.save()
        else:
            # For COD, order starts as pending
            order.status = 'pending'
            order.save()

        # Create delivery tracking
        DeliveryTracking.objects.create(
            order=order,
            eta=order.estimated_delivery,
        )

        # Create notification for order confirmation
        Notification.objects.create(
            user=request.user,
            type='order_status',
            title='Order Confirmed',
            message=f'Your order from {restaurant.name} has been confirmed.',
            related_id=order.id,
            related_type='order',
        )

        return Response(OrderDetailSerializer(order).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'])
    def cancel(self, request, pk=None):
        """Cancel an order."""
        order = self.get_object()
        if order.status not in ('pending', 'confirmed'):
            return Response(
                {'error': 'Order cannot be cancelled at this stage.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        order.status = 'cancelled'
        order.save()
        
        # Process refund if payment exists
        if order.payment:
            order.payment.status = 'refunded'
            order.payment.save()
        
        # Create cancellation notification
        Notification.objects.create(
            user=request.user,
            type='order_status',
            title='Order Cancelled',
            message=f'Your order from {order.restaurant.name} has been cancelled.',
            related_id=order.id,
            related_type='order',
        )
        
        return Response(OrderDetailSerializer(order).data)

    @action(detail=True, methods=['get'])
    def tracking(self, request, pk=None):
        """Get delivery tracking for an order."""
        order = self.get_object()
        try:
            tracking = order.tracking
            return Response(DeliveryTrackingSerializer(tracking).data)
        except DeliveryTracking.DoesNotExist:
            # Create placeholder tracking if it doesn't exist
            tracking = DeliveryTracking.objects.create(
                order=order,
                eta=order.estimated_delivery,
            )
            return Response(DeliveryTrackingSerializer(tracking).data)

    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        """Update order status (for restaurant owners/admin)."""
        order = self.get_object()
        
        # Check if user is the restaurant owner or admin
        if order.restaurant.owner != request.user and not request.user.is_staff:
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        
        new_status = request.data.get('status')
        valid_statuses = [s[0] for s in Order.STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response({'error': f'Invalid status. Choose from: {valid_statuses}'}, status=400)
        
        order.status = new_status
        if new_status == 'delivered':
            order.actual_delivery = timezone.now()
        order.save()
        
        # Create notification for status change
        Notification.objects.create(
            user=order.user,
            type='order_status',
            title=f'Order {new_status.replace("_", " ").title()}',
            message=f'Your order from {order.restaurant.name} is now {new_status.replace("_", " ")}.',
            related_id=order.id,
            related_type='order',
        )
        
        return Response(OrderDetailSerializer(order).data)
