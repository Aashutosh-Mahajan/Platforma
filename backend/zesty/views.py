from rest_framework import viewsets, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied
from django.http import Http404
from django.utils import timezone
from django.db import transaction, connection
from datetime import timedelta
from decimal import Decimal, InvalidOperation
import zlib

from zesty.landing_content import build_landing_page_content
from zesty.models import Restaurant, MenuItem, Order, OrderItem, Review, DeliveryTracking
from restaurants.models import Restaurant as PublicRestaurant
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

    def _can_manage_restaurants(self):
        user = self.request.user
        return user.is_staff or user.role in ('restaurant_owner', 'admin')

    def get_queryset(self):
        user = self.request.user

        # Write operations are restricted to owners/admins.
        if self.action in ['update', 'partial_update', 'destroy', 'toggle_active']:
            if user.is_staff or user.role == 'admin':
                return Restaurant.objects.all()
            if user.role == 'restaurant_owner':
                return Restaurant.objects.filter(owner=user)
            return Restaurant.objects.none()

        # Owner dashboard should see owned restaurants regardless of active state.
        if user.role == 'restaurant_owner':
            return Restaurant.objects.filter(owner=user)

        # Admins can browse all restaurants.
        if user.is_staff or user.role == 'admin':
            return Restaurant.objects.all()

        # Customer browsing only sees active restaurants.
        return Restaurant.objects.filter(is_active=True)

    def _resolve_restaurant_from_source(self, source_id):
        """Resolve a zesty restaurant from legacy source mapping or public catalog."""
        try:
            source_id_int = int(source_id)
        except (TypeError, ValueError):
            return None

        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT id FROM restaurants WHERE source_record_id = %s AND is_active = TRUE LIMIT 1",
                [source_id_int],
            )
            matched_row = cursor.fetchone()

        if matched_row:
            return Restaurant.objects.filter(id=matched_row[0], is_active=True).first()

        try:
            public_restaurant = PublicRestaurant.objects.get(id=source_id_int, is_active=True)
        except PublicRestaurant.DoesNotExist:
            return None

        restaurant = Restaurant.objects.filter(
            name__iexact=public_restaurant.name,
            is_active=True,
        ).first()
        if restaurant is not None:
            return restaurant

        now = timezone.now()
        synced_slug = f"synced-{public_restaurant.id}-{now.strftime('%Y%m%d%H%M%S%f')}"

        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO restaurants (
                    name,
                    description,
                    cuisine_types,
                    address,
                    latitude,
                    longitude,
                    delivery_fee,
                    delivery_time_min,
                    delivery_time_max,
                    image,
                    banner,
                    rating,
                    review_count,
                    phone,
                    is_active,
                    is_verified,
                    created_at,
                    updated_at,
                    owner_id,
                    area,
                    city,
                    cuisine,
                    data_source,
                    hours,
                    image_url,
                    is_open,
                    price_range,
                    slug,
                    source_record_id,
                    veg_only
                )
                VALUES (
                    %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s
                )
                RETURNING id
                """,
                [
                    public_restaurant.name,
                    public_restaurant.description or '',
                    public_restaurant.cuisine_types or public_restaurant.cuisine or 'Mixed',
                    public_restaurant.address or public_restaurant.area or 'Address unavailable',
                    public_restaurant.latitude,
                    public_restaurant.longitude,
                    Decimal('30.00'),
                    10,
                    15,
                    None,
                    None,
                    public_restaurant.rating or Decimal('4.00'),
                    0,
                    public_restaurant.phone or '',
                    bool(public_restaurant.is_active),
                    True,
                    now,
                    now,
                    self.request.user.id,
                    public_restaurant.area or 'Bandra',
                    public_restaurant.city or 'Mumbai',
                    public_restaurant.cuisine or 'Indian',
                    public_restaurant.data_source or 'real',
                    public_restaurant.hours or '',
                    public_restaurant.image_url or public_restaurant.photo_url or '',
                    bool(public_restaurant.is_open),
                    public_restaurant.price_range or 2,
                    synced_slug,
                    public_restaurant.id,
                    bool(public_restaurant.veg_only),
                ],
            )
            created_row = cursor.fetchone()

        if not created_row:
            return None

        return Restaurant.objects.filter(id=created_row[0], is_active=True).first()

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

        try:
            obj = queryset.get(**filter_kwargs)
        except Restaurant.DoesNotExist:
            can_bridge_missing = self.request.method == 'GET' and self.action in {'retrieve', 'menu', 'reviews'}
            if not can_bridge_missing:
                raise Http404('Restaurant matching query does not exist.')

            obj = self._resolve_restaurant_from_source(self.kwargs[lookup_url_kwarg])
            if obj is None or not queryset.filter(pk=obj.pk).exists():
                raise Http404('Restaurant matching query does not exist.')
        
        # May raise a permission denied
        self.check_object_permissions(self.request, obj)
        
        return obj

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return RestaurantDetailSerializer
        return RestaurantListSerializer

    def perform_create(self, serializer):
        if not self._can_manage_restaurants():
            raise PermissionDenied('Only restaurant owners can create restaurants.')
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['get'])
    def menu(self, request, pk=None):
        """Get menu items for a restaurant."""
        restaurant = self.get_object()

        if restaurant.owner == request.user or request.user.is_staff or request.user.role == 'admin':
            items = restaurant.menu_items.all()
        else:
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
        if restaurant.owner != request.user and not request.user.is_staff and request.user.role != 'admin':
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        
        restaurant.is_active = not restaurant.is_active
        restaurant.save()
        return Response(RestaurantDetailSerializer(restaurant).data)


class MenuItemViewSet(viewsets.ModelViewSet):
    """CRUD for menu items."""
    permission_classes = [IsAuthenticated]
    serializer_class = MenuItemSerializer
    pagination_class = StandardPagination

    def _can_manage_menu(self):
        user = self.request.user
        return user.is_staff or user.role in ('restaurant_owner', 'admin')

    def get_queryset(self):
        user = self.request.user

        # Owner/admin write operations.
        if self.action in ['update', 'partial_update', 'destroy', 'toggle_available']:
            if user.is_staff or user.role == 'admin':
                return MenuItem.objects.all()
            if user.role == 'restaurant_owner':
                return MenuItem.objects.filter(restaurant__owner=user)
            return MenuItem.objects.none()

        if user.is_staff or user.role == 'admin':
            return MenuItem.objects.all()

        # Owners should be able to see unavailable items in their own restaurants.
        if user.role == 'restaurant_owner':
            return MenuItem.objects.filter(restaurant__owner=user)

        # Customers only see available items.
        return MenuItem.objects.filter(is_available=True)

    def perform_create(self, serializer):
        if not self._can_manage_menu():
            raise PermissionDenied('Only restaurant owners can create menu items.')

        # Ensure the restaurant belongs to the user
        restaurant_id = self.request.data.get('restaurant')
        try:
            if self.request.user.is_staff or self.request.user.role == 'admin':
                restaurant = Restaurant.objects.get(id=restaurant_id)
            else:
                restaurant = Restaurant.objects.get(id=restaurant_id, owner=self.request.user)
            serializer.save(restaurant=restaurant)
        except Restaurant.DoesNotExist:
            raise serializers.ValidationError({'error': 'Restaurant not found.'})

    @action(detail=True, methods=['patch'])
    def toggle_available(self, request, pk=None):
        """Toggle menu item availability."""
        menu_item = self.get_object()
        if menu_item.restaurant.owner != request.user and not request.user.is_staff and request.user.role != 'admin':
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        
        menu_item.is_available = not menu_item.is_available
        menu_item.save()
        return Response(MenuItemSerializer(menu_item).data)


class OrderViewSet(viewsets.ModelViewSet):
    """Manage food orders."""
    permission_classes = [IsAuthenticated]
    serializer_class = OrderSerializer
    STANDARD_DELIVERY_MINUTES = 15
    STATUS_SEQUENCE = [
        'pending',
        'confirmed',
        'preparing',
        'ready',
        'out_for_delivery',
        'delivered',
    ]
    MAX_PAYMENT_OBJECT_ID = 2_147_483_647

    def _payment_object_id(self, order_id):
        """Generate a deterministic 32-bit-safe object id for legacy payment schema."""
        try:
            value = int(order_id)
        except (TypeError, ValueError, OverflowError):
            value = zlib.crc32(str(order_id).encode('utf-8'))

        if value < 0:
            value = -value

        if value == 0:
            value = 1

        if value > self.MAX_PAYMENT_OBJECT_ID:
            value = (value % self.MAX_PAYMENT_OBJECT_ID) or self.MAX_PAYMENT_OBJECT_ID

        return value

    def _status_rank(self, status_key):
        try:
            return self.STATUS_SEQUENCE.index(status_key)
        except ValueError:
            return -1

    def _target_status_for_elapsed_minutes(self, elapsed_minutes):
        if elapsed_minutes < 2:
            return 'pending'
        if elapsed_minutes < 5:
            return 'confirmed'
        if elapsed_minutes < 9:
            return 'preparing'
        if elapsed_minutes < 12:
            return 'ready'
        if elapsed_minutes < self.STANDARD_DELIVERY_MINUTES:
            return 'out_for_delivery'
        return 'delivered'

    def _sync_standard_tracking(self, order):
        if order.status == 'cancelled':
            return order

        now = timezone.now()
        elapsed_minutes = (now - order.created_at).total_seconds() / 60
        target_status = self._target_status_for_elapsed_minutes(elapsed_minutes)

        # Never regress an order status if it is already further ahead.
        current_rank = self._status_rank(order.status)
        target_rank = self._status_rank(target_status)
        next_status = order.status if current_rank > target_rank else target_status

        update_fields = []

        if order.estimated_delivery is None:
            order.estimated_delivery = order.created_at + timedelta(minutes=self.STANDARD_DELIVERY_MINUTES)
            update_fields.append('estimated_delivery')

        if next_status != order.status:
            order.status = next_status
            update_fields.append('status')

            status_titles = {
                'confirmed': 'Order Confirmed',
                'preparing': 'Order is Being Prepared',
                'ready': 'Order is Ready',
                'out_for_delivery': 'Order Out for Delivery',
                'delivered': 'Order Arrived',
            }
            status_messages = {
                'confirmed': f'Your order from {order.restaurant.name} has been confirmed.',
                'preparing': f'Your order from {order.restaurant.name} is being prepared.',
                'ready': f'Your order from {order.restaurant.name} is packed and ready.',
                'out_for_delivery': f'Your order from {order.restaurant.name} is out for delivery.',
                'delivered': f'Your order from {order.restaurant.name} has arrived.',
            }

            if next_status in status_titles:
                Notification.objects.create(
                    user=order.user,
                    type='order_status',
                    title=status_titles[next_status],
                    message=status_messages[next_status],
                    related_id=None,
                    related_type='order',
                )

        if update_fields:
            order.save(update_fields=update_fields)

        tracking, _created = DeliveryTracking.objects.get_or_create(
            order=order,
            defaults={'status_timeline': []},
        )

        timeline = list(tracking.status_timeline or [])
        seen_statuses = {
            item.get('status')
            for item in timeline
            if isinstance(item, dict)
        }

        if next_status not in seen_statuses:
            timeline.append(
                {
                    'status': next_status,
                    'at': now.isoformat(),
                }
            )
            tracking.status_timeline = timeline
            tracking.save(update_fields=['status_timeline', 'updated_at'])

        return order

    def get_queryset(self):
        user = self.request.user

        if user.is_staff or user.role == 'admin':
            qs = Order.objects.all()
        elif user.role == 'restaurant_owner':
            qs = Order.objects.filter(restaurant__owner=user)
        else:
            qs = Order.objects.filter(user=user)

        qs = qs.select_related('restaurant').prefetch_related('items__menu_item')

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

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())

        page = self.paginate_queryset(queryset)
        if page is not None:
            page_orders = list(page)
            for order in page_orders:
                self._sync_standard_tracking(order)

            serializer = self.get_serializer(page_orders, many=True)
            return self.get_paginated_response(serializer.data)

        orders = list(queryset)
        for order in orders:
            self._sync_standard_tracking(order)

        serializer = self.get_serializer(orders, many=True)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        order = self.get_object()
        self._sync_standard_tracking(order)
        serializer = self.get_serializer(order)
        return Response(serializer.data)

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Create a new order with items and process payment."""
        serializer = OrderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Get restaurant
        restaurant = Restaurant.objects.filter(id=data['restaurant_id'], is_active=True).first()

        # Try matching previously synced rows by source_record_id in legacy schema.
        if restaurant is None:
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT id FROM restaurants WHERE source_record_id = %s AND is_active = TRUE LIMIT 1",
                    [data['restaurant_id']],
                )
                matched_row = cursor.fetchone()

            if matched_row:
                restaurant = Restaurant.objects.filter(id=matched_row[0], is_active=True).first()

        # Bridge public restaurant listing data into zesty ordering if needed.
        if restaurant is None:
            try:
                public_restaurant = PublicRestaurant.objects.get(
                    id=data['restaurant_id'],
                    is_active=True,
                )
            except PublicRestaurant.DoesNotExist:
                return Response({'error': 'Restaurant not found.'}, status=404)

            restaurant = Restaurant.objects.filter(
                name__iexact=public_restaurant.name,
                is_active=True,
            ).first()

            if restaurant is None:
                now = timezone.now()
                synced_slug = f"synced-{public_restaurant.id}-{now.strftime('%Y%m%d%H%M%S%f')}"

                with connection.cursor() as cursor:
                    cursor.execute(
                        """
                        INSERT INTO restaurants (
                            name,
                            description,
                            cuisine_types,
                            address,
                            latitude,
                            longitude,
                            delivery_fee,
                            delivery_time_min,
                            delivery_time_max,
                            image,
                            banner,
                            rating,
                            review_count,
                            phone,
                            is_active,
                            is_verified,
                            created_at,
                            updated_at,
                            owner_id,
                            area,
                            city,
                            cuisine,
                            data_source,
                            hours,
                            image_url,
                            is_open,
                            price_range,
                            slug,
                            source_record_id,
                            veg_only
                        )
                        VALUES (
                            %s, %s, %s, %s, %s, %s,
                            %s, %s, %s, %s, %s, %s,
                            %s, %s, %s, %s, %s, %s,
                            %s, %s, %s, %s, %s, %s,
                            %s, %s, %s, %s, %s, %s
                        )
                        RETURNING id
                        """,
                        [
                            public_restaurant.name,
                            public_restaurant.description or '',
                            public_restaurant.cuisine_types or public_restaurant.cuisine or 'Mixed',
                            public_restaurant.address or public_restaurant.area or 'Address unavailable',
                            public_restaurant.latitude,
                            public_restaurant.longitude,
                            Decimal('30.00'),
                            10,
                            self.STANDARD_DELIVERY_MINUTES,
                            None,
                            None,
                            public_restaurant.rating or Decimal('4.00'),
                            0,
                            public_restaurant.phone or '',
                            bool(public_restaurant.is_active),
                            True,
                            now,
                            now,
                            request.user.id,
                            public_restaurant.area or 'Bandra',
                            public_restaurant.city or 'Mumbai',
                            public_restaurant.cuisine or 'Indian',
                            public_restaurant.data_source or 'real',
                            public_restaurant.hours or '',
                            public_restaurant.image_url or public_restaurant.photo_url or '',
                            bool(public_restaurant.is_open),
                            public_restaurant.price_range or 2,
                            synced_slug,
                            public_restaurant.id,
                            bool(public_restaurant.veg_only),
                        ],
                    )
                    created_row = cursor.fetchone()

                if not created_row:
                    return Response({'error': 'Unable to map restaurant for ordering.'}, status=500)

                restaurant = Restaurant.objects.filter(id=created_row[0], is_active=True).first()

        if restaurant is None:
            return Response({'error': 'Restaurant not found for ordering.'}, status=404)

        # Validate required delivery address
        if not data.get('delivery_address_id'):
            return Response({'error': 'Delivery address is required.'}, status=400)

        try:
            selected_address = request.user.addresses.get(id=data['delivery_address_id'])
        except Exception:
            return Response({'error': 'Delivery address not found.'}, status=404)

        delivery_address_snapshot = {
            'id': selected_address.id,
            'label': selected_address.label,
            'street': selected_address.street,
            'city': selected_address.city,
            'state': selected_address.state,
            'postal_code': selected_address.postal_code,
            'is_default': bool(selected_address.is_default),
            'created_at': selected_address.created_at.isoformat(),
        }

        payment_method = data.get('payment_method', 'credit_card')
        payment_method_code_map = {
            'cash_on_delivery': 'cod',
            'credit_card': 'card',
            'debit_card': 'card',
            'net_banking': 'netbank',
            'upi': 'upi',
            'wallet': 'wallet',
        }
        payment_method_code = payment_method_code_map.get(payment_method, str(payment_method)[:10])

        # Create order
        order = Order.objects.create(
            user=request.user,
            restaurant=restaurant,
            delivery_address=delivery_address_snapshot,
            special_instructions=data.get('special_instructions', ''),
            payment_method=payment_method_code,
            payment_status='pending',
            estimated_delivery=timezone.now() + timedelta(minutes=self.STANDARD_DELIVERY_MINUTES),
            status='pending',
        )

        # Create order items
        for item_data in data['items']:
            menu_item = MenuItem.objects.filter(
                id=item_data['menu_item_id'],
                restaurant=restaurant,
                is_available=True,
            ).first()

            if menu_item is None:
                fallback_name = (
                    item_data.get('menu_item_name')
                    or item_data.get('name')
                    or f"Item {item_data['menu_item_id']}"
                )
                fallback_price = item_data.get('unit_price') or item_data.get('price')

                try:
                    normalized_price = Decimal(str(fallback_price))
                except (InvalidOperation, TypeError, ValueError):
                    order.delete()
                    return Response(
                        {
                            'error': (
                                f"Menu item {item_data['menu_item_id']} not found and "
                                'fallback price is invalid.'
                            )
                        },
                        status=404,
                    )

                if normalized_price <= 0:
                    order.delete()
                    return Response(
                        {
                            'error': (
                                f"Menu item {item_data['menu_item_id']} not found and "
                                'fallback price must be greater than zero.'
                            )
                        },
                        status=404,
                    )

                menu_item = MenuItem.objects.create(
                    restaurant=restaurant,
                    name=fallback_name,
                    description='Auto-created menu item for synced order.',
                    price=normalized_price,
                    category='Recommended',
                    is_available=True,
                    is_vegetarian=False,
                    is_vegan=False,
                )

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
        if payment_method != 'cash_on_delivery':
            # Create payment record
            payment = Payment.objects.create(
                user=request.user,
                amount=order.total,
                method=payment_method,
                content_type='order',
                object_id=self._payment_object_id(order.id),
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

            order.payment_status = 'completed'
            order.save(update_fields=['payment_status'])
        else:
            order.payment_status = 'pending'
            order.save(update_fields=['payment_status'])

        # Create delivery tracking
        DeliveryTracking.objects.create(
            order=order,
            status_timeline=[
                {
                    'status': 'pending',
                    'at': timezone.now().isoformat(),
                }
            ],
        )

        # Create notification for order confirmation
        Notification.objects.create(
            user=request.user,
            type='order_status',
            title='Order Placed',
            message=f'Your order from {restaurant.name} has been placed successfully.',
            related_id=None,
            related_type='order',
        )

        if restaurant.owner_id != request.user.id:
            customer_name = request.user.get_full_name() or request.user.email
            Notification.objects.create(
                user=restaurant.owner,
                type='order_status',
                title='New Order Received',
                message=f'New order #{order.id} placed by {customer_name}.',
                related_id=None,
                related_type='order',
            )

        return Response(OrderDetailSerializer(order).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'])
    def cancel(self, request, pk=None):
        """Cancel an order."""
        order = self.get_object()
        self._sync_standard_tracking(order)

        if order.user != request.user:
            return Response(
                {'error': 'Only the customer can cancel this order.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if order.status != 'pending':
            return Response(
                {'error': 'Order can only be cancelled before confirmation.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        order.status = 'cancelled'
        order.payment_status = 'refunded' if order.payment_status == 'completed' else order.payment_status
        order.save(update_fields=['status', 'payment_status'])
        
        # Process refund in payment records if completed.
        Payment.objects.filter(
            user=request.user,
            content_type='order',
            object_id=self._payment_object_id(order.id),
            status='completed',
        ).update(status='refunded')
        
        # Create cancellation notification
        Notification.objects.create(
            user=request.user,
            type='order_status',
            title='Order Cancelled',
            message=f'Your order from {order.restaurant.name} has been cancelled.',
            related_id=None,
            related_type='order',
        )

        if order.restaurant.owner_id != request.user.id:
            customer_name = request.user.get_full_name() or request.user.email
            Notification.objects.create(
                user=order.restaurant.owner,
                type='order_status',
                title='Order Cancelled by Customer',
                message=f'Order #{order.id} was cancelled by {customer_name}.',
                related_id=None,
                related_type='order',
            )
        
        return Response(OrderDetailSerializer(order).data)

    @action(detail=True, methods=['get'])
    def tracking(self, request, pk=None):
        """Get delivery tracking for an order."""
        order = self.get_object()
        self._sync_standard_tracking(order)
        try:
            tracking = order.tracking
            return Response(DeliveryTrackingSerializer(tracking).data)
        except DeliveryTracking.DoesNotExist:
            # Create placeholder tracking if it doesn't exist
            tracking = DeliveryTracking.objects.create(
                order=order,
                status_timeline=[
                    {
                        'status': order.status,
                        'at': timezone.now().isoformat(),
                    }
                ],
            )
            return Response(DeliveryTrackingSerializer(tracking).data)

    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        """Update order status (for restaurant owners/admin)."""
        order = self.get_object()
        
        # Check if user is the restaurant owner or admin
        if order.restaurant.owner != request.user and not request.user.is_staff and request.user.role != 'admin':
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        
        new_status = request.data.get('status')
        valid_statuses = [s[0] for s in Order.STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response({'error': f'Invalid status. Choose from: {valid_statuses}'}, status=400)
        
        order.status = new_status
        order.save(update_fields=['status'])
        
        # Create notification for status change
        Notification.objects.create(
            user=order.user,
            type='order_status',
            title=f'Order {new_status.replace("_", " ").title()}',
            message=f'Your order from {order.restaurant.name} is now {new_status.replace("_", " ")}.',
            related_id=None,
            related_type='order',
        )
        
        return Response(OrderDetailSerializer(order).data)
