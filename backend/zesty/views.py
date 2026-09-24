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
from django.db import transaction, models
from datetime import timedelta
from decimal import Decimal, InvalidOperation
import zlib

from rest_framework.exceptions import NotFound, ValidationError as DRFValidationError

from zesty.landing_content import build_landing_page_content
from zesty.models import Restaurant, MenuItem, Order, OrderItem, Review, DeliveryTracking, Cart, CartItem, Promotion, Payout
from zesty.serializers import (
    RestaurantListSerializer, RestaurantDetailSerializer,
    MenuItemSerializer, OrderSerializer, OrderListSerializer, OrderDetailSerializer,
    OrderCreateSerializer, ReviewSerializer, ReviewCreateSerializer, DeliveryTrackingSerializer,
    CartSerializer, AddCartItemSerializer, UpdateCartItemSerializer, PromotionSerializer, PayoutSerializer
)
from core.models import Payment, Notification
from utils.pagination import StandardPagination
from utils.permissions import ensure_verified


class LandingPageView(APIView):
    """Serve public landing page content for the frontend."""

    permission_classes = [AllowAny]

    def get(self, request):
        return Response(build_landing_page_content(request))


class RestaurantViewSet(viewsets.ModelViewSet):
    """List, retrieve, and manage restaurants."""
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['name', 'cuisine_types']
    ordering_fields = ['rating', 'delivery_fee', 'delivery_time_max', 'review_count']
    ordering = ['-rating']
    lookup_field = 'pk'
    lookup_url_kwarg = 'pk'
    pagination_class = StandardPagination

    def get_permissions(self):
        # Browsing (list/retrieve/menu/combos/reviews-GET/areas) is public,
        # like any food-delivery catalog — only mutating actions and the
        # POST branch of `reviews` (checked internally) need a login.
        if self.action in ('list', 'retrieve', 'menu', 'combos', 'reviews', 'areas'):
            return [AllowAny()]
        return [IsAuthenticated()]

    @action(detail=False, methods=['get'])
    def areas(self, request):
        """Distinct cities/areas across the public catalog, for the filter dropdown."""
        base = Restaurant.objects.filter(is_active=True, is_verified=True)
        cities = base.exclude(city='').values_list('city', flat=True).distinct().order_by('city')
        return Response({'areas': [c for c in cities if c]})

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

        # Owner dashboard: a logged-in restaurant owner always sees their
        # own restaurants here (including unverified/inactive ones), same
        # as before catalog browsing was opened up to guests — the owner
        # dashboard's plain `restaurantAPI.list()` call relies on this.
        if user.is_authenticated and user.role == 'restaurant_owner':
            return Restaurant.objects.filter(owner=user)

        # Guests/customers browsing the public catalog (list/retrieve/menu/
        # combos are AllowAny now) have no `.role` to check.
        if user.is_authenticated and (user.is_staff or user.role == 'admin'):
            queryset = Restaurant.objects.all()
        else:
            # FR-A4: a partner listing isn't public until an admin has
            # verified it, regardless of whether the owner switched it active.
            queryset = Restaurant.objects.filter(is_active=True, is_verified=True)

        if self.action != 'list':
            return queryset

        return self._apply_catalog_filters(queryset)

    def _apply_catalog_filters(self, queryset):
        params = self.request.query_params

        area = params.get('area')
        if area:
            queryset = queryset.filter(
                models.Q(city__iexact=area) | models.Q(area__iexact=area)
            )

        if params.get('veg_only') in ('true', '1'):
            queryset = queryset.filter(veg_only=True)

        cuisine_tag = params.get('cuisine_tag')
        if cuisine_tag:
            queryset = queryset.filter(
                models.Q(cuisine_types__icontains=cuisine_tag)
                | models.Q(cuisine__icontains=cuisine_tag)
                | models.Q(name__icontains=cuisine_tag)
                | models.Q(description__icontains=cuisine_tag)
            )

        min_rating = params.get('min_rating')
        if min_rating:
            try:
                queryset = queryset.filter(rating__gte=Decimal(min_rating))
            except InvalidOperation:
                pass

        max_price_range = params.get('max_price_range')
        if max_price_range:
            try:
                queryset = queryset.filter(price_range__lte=int(max_price_range))
            except ValueError:
                pass

        return queryset

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

        can_see_unavailable = request.user.is_authenticated and (
            restaurant.owner == request.user or request.user.is_staff or request.user.role == 'admin'
        )
        if can_see_unavailable:
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

    @action(detail=True, methods=['get'])
    def combos(self, request, pk=None):
        """GET /restaurants/{id}/combos — mined item-pair suggestions
        (FR-Z8). Reads only the latest successful basket-mining run, so a
        stale run's rules are never served as current (FR-I8).
        """
        from mining.models import MiningBasketRule
        from mining.registry import latest_successful_run

        restaurant = self.get_object()
        run = latest_successful_run('basket')
        if run is None:
            return Response({'combos': [], 'model_version': None})

        rules = MiningBasketRule.objects.filter(
            run=run, restaurant_id=restaurant.id, level='item'
        ).order_by('-lift')[:20]
        combos = [
            {
                'antecedent': r.antecedent, 'consequent': r.consequent,
                'support': round(r.support, 4), 'confidence': round(r.confidence, 4),
                'lift': round(r.lift, 3),
            }
            for r in rules
        ]
        return Response({'combos': combos, 'model_version': run.model_version, 'as_of': run.finished_at})

    @action(detail=True, methods=['get'])
    def earnings(self, request, pk=None):
        """GET /restaurants/{id}/earnings — settled payout history plus a
        live-computed summary of delivered orders not yet in any payout
        (i.e. since the last payout's period_end, or the last 90 days if
        there isn't one yet)."""
        restaurant = self.get_object()
        user = request.user
        is_owner = user.is_authenticated and user.role == 'restaurant_owner' and restaurant.owner_id == user.id
        if not (user.is_staff or user.role == 'admin' or is_owner):
            raise PermissionDenied("You don't have access to this restaurant's earnings.")

        payouts = Payout.objects.filter(restaurant=restaurant).order_by('-period_end')
        last_payout = payouts.first()
        unsettled_since = last_payout.period_end if last_payout else (timezone.now() - timedelta(days=90))

        unsettled_orders = Order.objects.filter(
            restaurant=restaurant, status='delivered', created_at__gte=unsettled_since,
        )
        gross = unsettled_orders.aggregate(total=models.Sum('total'))['total'] or Decimal('0')
        commission = (gross * restaurant.commission_rate / Decimal('100')).quantize(Decimal('0.01'))
        net = gross - commission

        return Response({
            'commission_rate': restaurant.commission_rate,
            'unsettled': {
                'period_start': unsettled_since,
                'period_end': timezone.now(),
                'order_count': unsettled_orders.count(),
                'gross_revenue': gross,
                'commission_amount': commission,
                'net_amount': net,
            },
            'payouts': PayoutSerializer(payouts, many=True).data,
        })

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

        qs = qs.select_related('restaurant').prefetch_related('items__menu_item', 'status_history')

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
        ensure_verified(request.user)
        serializer = OrderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Get restaurant
        restaurant = Restaurant.objects.filter(id=data['restaurant_id'], is_active=True).first()
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

        # Resolve and validate a promo code, if one was supplied — validity
        # depends on the order subtotal, so this can only happen after
        # items exist.
        promo_code = (data.get('promo_code') or '').strip().upper()
        promotion = None
        if promo_code:
            promotion = Promotion.objects.filter(code=promo_code).first()
            if promotion is None:
                order.delete()
                return Response({'error': f"Promo code '{promo_code}' not found."}, status=404)

            provisional_subtotal = sum(item.total for item in order.items.all())
            is_valid, error_message = promotion.check_valid(provisional_subtotal, restaurant.id)
            if not is_valid:
                order.delete()
                return Response({'error': error_message}, status=400)

        # Calculate totals
        order.calculate_totals(promotion=promotion)

        if promotion:
            order.promo_code = promotion.code
            order.save(update_fields=['promo_code'])
            Promotion.objects.filter(pk=promotion.pk).update(times_used=models.F('times_used') + 1)

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


class PromotionViewSet(viewsets.ModelViewSet):
    """CRUD for promo codes. Owners manage codes scoped to their own
    restaurant; admins can also create platform-wide codes (restaurant=null)."""
    serializer_class = PromotionSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.role == 'admin':
            return Promotion.objects.all().order_by('-created_at')
        if user.role == 'restaurant_owner':
            return Promotion.objects.filter(restaurant__owner=user).order_by('-created_at')
        return Promotion.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        if not (user.is_staff or user.role in ('restaurant_owner', 'admin')):
            raise PermissionDenied('Only restaurant owners or admins can create promo codes.')

        restaurant = serializer.validated_data.get('restaurant')
        if restaurant is not None and not (user.is_staff or user.role == 'admin'):
            if restaurant.owner_id != user.id:
                raise PermissionDenied("You can only create promo codes for your own restaurant.")
        serializer.save()


class PromoValidateView(APIView):
    """POST /promotions/validate — dry-run a code against a restaurant +
    subtotal so the checkout page can show the discount before the order
    is actually placed, without duplicating Promotion's validity rules."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        code = str(request.data.get('code', '')).strip().upper()
        restaurant_id = request.data.get('restaurant_id')
        try:
            subtotal = Decimal(str(request.data.get('subtotal', '0')))
        except (InvalidOperation, TypeError, ValueError):
            return Response({'error': 'Invalid subtotal.'}, status=400)

        if not code or not restaurant_id:
            return Response({'error': 'code and restaurant_id are required.'}, status=400)

        promotion = Promotion.objects.filter(code=code).first()
        if promotion is None:
            return Response({'error': f"Promo code '{code}' not found."}, status=404)

        is_valid, error_message = promotion.check_valid(subtotal, int(restaurant_id))
        if not is_valid:
            return Response({'error': error_message}, status=400)

        discount = promotion.compute_discount(subtotal)
        return Response({
            'code': promotion.code,
            'discount': discount,
            'description': promotion.description,
        })


class PayoutViewSet(viewsets.ModelViewSet):
    """Admin-only payout settlement. Owners read their own restaurant's
    payouts through RestaurantViewSet.earnings instead — this viewset is
    where a payout actually gets created and marked paid."""
    serializer_class = PayoutSerializer
    permission_classes = [IsAuthenticated]

    def _is_admin(self, user):
        return user.is_staff or user.role == 'admin'

    def get_queryset(self):
        if not self._is_admin(self.request.user):
            return Payout.objects.none()
        qs = Payout.objects.select_related('restaurant').all()
        restaurant_id = self.request.query_params.get('restaurant')
        if restaurant_id:
            qs = qs.filter(restaurant_id=restaurant_id)
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    def create(self, request, *args, **kwargs):
        if not self._is_admin(request.user):
            raise PermissionDenied('Only admins can create payouts.')

        restaurant_id = request.data.get('restaurant')
        period_start = request.data.get('period_start')
        period_end = request.data.get('period_end')
        if not (restaurant_id and period_start and period_end):
            return Response({'error': 'restaurant, period_start and period_end are required.'}, status=400)

        restaurant = Restaurant.objects.filter(id=restaurant_id).first()
        if restaurant is None:
            return Response({'error': 'Restaurant not found.'}, status=404)

        # A period can't overlap one already settled for this restaurant —
        # that would double-pay (or double-skip) the same orders.
        overlapping = Payout.objects.filter(
            restaurant=restaurant, period_start__lt=period_end, period_end__gt=period_start,
        ).exists()
        if overlapping:
            return Response({'error': 'This period overlaps an existing payout for this restaurant.'}, status=400)

        orders = Order.objects.filter(
            restaurant=restaurant, status='delivered',
            created_at__gte=period_start, created_at__lt=period_end,
        )
        gross = orders.aggregate(total=models.Sum('total'))['total'] or Decimal('0')
        commission = (gross * restaurant.commission_rate / Decimal('100')).quantize(Decimal('0.01'))
        net = gross - commission

        payout = Payout.objects.create(
            restaurant=restaurant,
            period_start=period_start,
            period_end=period_end,
            order_count=orders.count(),
            gross_revenue=gross,
            commission_rate=restaurant.commission_rate,
            commission_amount=commission,
            net_amount=net,
            notes=request.data.get('notes', ''),
        )
        return Response(PayoutSerializer(payout).data, status=201)

    @action(detail=True, methods=['patch'])
    def mark_paid(self, request, pk=None):
        if not self._is_admin(request.user):
            raise PermissionDenied('Only admins can mark payouts paid.')

        payout = self.get_queryset().filter(pk=pk).first()
        if payout is None:
            raise NotFound('Payout not found.')
        if payout.status == 'paid':
            return Response({'error': 'This payout is already marked paid.'}, status=400)

        payout.status = 'paid'
        payout.paid_at = timezone.now()
        payout.save(update_fields=['status', 'paid_at'])
        return Response(PayoutSerializer(payout).data)


class CartView(APIView):
    """GET /cart — the current customer's active cart (auto-created empty)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cart, _ = Cart.objects.get_or_create(customer=request.user)
        return Response(CartSerializer(cart).data)


class CartItemListCreateView(APIView):
    """POST /cart/items — add an item, restricting the cart to one restaurant (FR-Z3/FR-Z4)."""
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        serializer = AddCartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        menu_item_id = serializer.validated_data['menu_item_id']
        quantity = serializer.validated_data['quantity']

        try:
            menu_item = MenuItem.objects.select_related('restaurant').get(
                id=menu_item_id, is_available=True
            )
        except MenuItem.DoesNotExist:
            raise NotFound('Menu item not found or unavailable.')

        cart, _ = Cart.objects.select_for_update().get_or_create(customer=request.user)

        switched_restaurant = False
        if cart.restaurant_id is not None and cart.restaurant_id != menu_item.restaurant_id:
            # Cart is restricted to one restaurant. Callers that want to
            # confirm with the customer first should check `restaurant` on
            # GET /cart before calling this with `confirm_switch`.
            if not request.data.get('confirm_switch'):
                raise DRFValidationError({
                    'error': 'Cart contains items from another restaurant.',
                    'current_restaurant': cart.restaurant_id,
                    'requested_restaurant': menu_item.restaurant_id,
                    'resolution': 'Retry with confirm_switch=true to clear the cart and add this item.',
                })
            cart.clear()
            switched_restaurant = True

        if cart.restaurant_id is None:
            cart.restaurant = menu_item.restaurant
            cart.save(update_fields=['restaurant', 'updated_at'])

        item, created = CartItem.objects.get_or_create(
            cart=cart, menu_item=menu_item, defaults={'quantity': quantity}
        )
        if not created:
            item.quantity += quantity
            item.save(update_fields=['quantity', 'updated_at'])

        cart.refresh_from_db()
        return Response(
            {**CartSerializer(cart).data, 'cart_was_cleared': switched_restaurant},
            status=status.HTTP_201_CREATED,
        )


class CartItemDetailView(APIView):
    """PATCH/DELETE /cart/items/{id}."""
    permission_classes = [IsAuthenticated]

    def _get_item(self, request, item_id):
        try:
            return CartItem.objects.select_related('cart').get(id=item_id, cart__customer=request.user)
        except CartItem.DoesNotExist:
            raise NotFound('Cart item not found.')

    def patch(self, request, item_id):
        item = self._get_item(request, item_id)
        serializer = UpdateCartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item.quantity = serializer.validated_data['quantity']
        item.save(update_fields=['quantity', 'updated_at'])
        return Response(CartSerializer(item.cart).data)

    def delete(self, request, item_id):
        item = self._get_item(request, item_id)
        cart = item.cart
        item.delete()
        if not cart.items.exists():
            cart.restaurant = None
            cart.save(update_fields=['restaurant', 'updated_at'])
        return Response(status=status.HTTP_204_NO_CONTENT)
