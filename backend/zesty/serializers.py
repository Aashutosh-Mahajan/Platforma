from rest_framework import serializers
from zesty.models import (
    Restaurant, MenuItem, Order, OrderItem, Review, DeliveryTracking, Cart, CartItem,
    OrderStatusHistory, Promotion, Payout
)
from core.models import Address


class MenuItemSerializer(serializers.ModelSerializer):
    # See RestaurantListSerializer's docstring: multipart create/update
    # (menu items support an image upload) needs explicit defaults or an
    # absent boolean silently becomes False regardless of the model default.
    is_vegetarian = serializers.BooleanField(default=False)
    is_vegan = serializers.BooleanField(default=False)
    is_available = serializers.BooleanField(default=True)

    class Meta:
        model = MenuItem
        fields = ['id', 'name', 'description', 'price', 'category', 'image',
                  'is_vegetarian', 'is_vegan', 'is_available']


class RestaurantListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list view.

    is_active/is_open/veg_only are BooleanFields written via multipart
    form-data (restaurant create/update support an image upload). DRF's
    BooleanField treats multipart/QueryDict input as an HTML form, where a
    field absent from the payload means "unchecked" (False) rather than
    "use the model default" — so a create that doesn't explicitly send
    these would silently create an inactive/closed restaurant. Declaring
    them explicitly with the same default as the model avoids that.
    """
    is_active = serializers.BooleanField(default=True)
    is_open = serializers.BooleanField(default=True)
    veg_only = serializers.BooleanField(default=False)

    class Meta:
        model = Restaurant
        fields = ['id', 'name', 'slug', 'description', 'cuisine_types', 'cuisine',
                  'address', 'area', 'city', 'state', 'price_range', 'veg_only',
                  'hours', 'is_open', 'image_url',
                  'delivery_fee', 'delivery_time_min', 'delivery_time_max',
                  'image', 'rating', 'review_count', 'is_active', 'is_verified', 'commission_rate']
        read_only_fields = ['id', 'slug', 'rating', 'review_count', 'is_verified', 'commission_rate']


class CartItemSerializer(serializers.ModelSerializer):
    menu_item_name = serializers.CharField(source='menu_item.name', read_only=True)
    unit_price = serializers.DecimalField(source='menu_item.price', max_digits=8, decimal_places=2, read_only=True)
    line_total = serializers.SerializerMethodField()
    # Full nested item so the frontend can render a cart row (image,
    # category, veg flag, etc.) without a second round-trip per item —
    # menu_item_name/unit_price above are kept for existing API consumers.
    menu_item_detail = MenuItemSerializer(source='menu_item', read_only=True)

    class Meta:
        model = CartItem
        fields = ['id', 'menu_item', 'menu_item_name', 'menu_item_detail', 'unit_price', 'quantity', 'line_total']
        read_only_fields = ['id', 'menu_item_name', 'menu_item_detail', 'unit_price', 'line_total']

    def get_line_total(self, obj):
        return obj.menu_item.price * obj.quantity


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    restaurant_detail = RestaurantListSerializer(source='restaurant', read_only=True)
    restaurant_name = serializers.CharField(source='restaurant.name', read_only=True, default=None)
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ['id', 'restaurant', 'restaurant_name', 'restaurant_detail', 'items', 'subtotal', 'updated_at']
        read_only_fields = fields

    def get_subtotal(self, obj):
        return sum((item.menu_item.price * item.quantity for item in obj.items.all()), start=0)


class AddCartItemSerializer(serializers.Serializer):
    """Input for POST /cart/items."""
    menu_item_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1, default=1)


class UpdateCartItemSerializer(serializers.Serializer):
    """Input for PATCH /cart/items/{id}."""
    quantity = serializers.IntegerField(min_value=1)


class PromotionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Promotion
        fields = ['id', 'restaurant', 'code', 'description', 'discount_type', 'discount_value',
                  'min_order_value', 'max_discount_amount', 'usage_limit', 'times_used',
                  'valid_from', 'valid_until', 'is_active', 'created_at']
        read_only_fields = ['id', 'times_used', 'created_at']

    def validate_code(self, value):
        return value.strip().upper()


class PayoutSerializer(serializers.ModelSerializer):
    restaurant_name = serializers.CharField(source='restaurant.name', read_only=True)

    class Meta:
        model = Payout
        fields = ['id', 'restaurant', 'restaurant_name', 'period_start', 'period_end',
                  'order_count', 'gross_revenue', 'commission_rate', 'commission_amount',
                  'net_amount', 'status', 'paid_at', 'notes', 'created_at']
        read_only_fields = ['id', 'order_count', 'gross_revenue', 'commission_rate',
                             'commission_amount', 'net_amount', 'status', 'paid_at', 'created_at']


class RestaurantDetailSerializer(serializers.ModelSerializer):
    """Full detail serializer with menu items."""
    menu_items = MenuItemSerializer(many=True, read_only=True)

    class Meta:
        model = Restaurant
        fields = ['id', 'name', 'slug', 'description', 'cuisine_types', 'cuisine',
                  'address', 'area', 'city', 'state', 'price_range', 'veg_only',
                  'hours', 'is_open', 'image_url',
                  'latitude', 'longitude', 'delivery_fee', 'delivery_time_min',
                  'delivery_time_max', 'image', 'banner', 'phone',
                  'rating', 'review_count', 'is_active', 'is_verified', 'commission_rate', 'menu_items']
        read_only_fields = ['id', 'slug', 'rating', 'review_count', 'is_verified', 'commission_rate']


class OrderItemSerializer(serializers.ModelSerializer):
    menu_item = MenuItemSerializer(read_only=True)
    menu_item_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = OrderItem
        fields = ['id', 'menu_item', 'menu_item_id', 'quantity', 'unit_price', 'total']
        read_only_fields = ['unit_price', 'total']


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = ['id', 'label', 'street', 'city', 'state', 'postal_code', 'is_default']


class OrderListSerializer(serializers.ModelSerializer):
    """Summary view for order listings."""
    items = OrderItemSerializer(many=True, read_only=True)
    restaurant_name = serializers.CharField(source='restaurant.name', read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'restaurant', 'restaurant_name', 'status', 'items',
                  'subtotal', 'delivery_fee', 'tax', 'discount', 'promo_code', 'total',
                  'estimated_delivery', 'payment_status', 'created_at']
        read_only_fields = ['id', 'subtotal', 'delivery_fee', 'tax', 'discount', 'total',
                            'created_at']


class OrderStatusHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderStatusHistory
        fields = ['old_status', 'new_status', 'changed_at']


class OrderDetailSerializer(serializers.ModelSerializer):
    """Full detail serializer with items and tracking."""
    items = OrderItemSerializer(many=True, read_only=True)
    restaurant_name = serializers.CharField(source='restaurant.name', read_only=True)
    delivery_address = serializers.JSONField(read_only=True)
    actual_delivery = serializers.SerializerMethodField()
    status_history = OrderStatusHistorySerializer(many=True, read_only=True)

    def get_actual_delivery(self, obj):
        return obj.updated_at if obj.status == 'delivered' else None

    class Meta:
        model = Order
        fields = ['id', 'restaurant', 'restaurant_name', 'status', 'items',
                  'subtotal', 'delivery_fee', 'tax', 'discount', 'promo_code', 'total',
                  'delivery_address', 'estimated_delivery', 'actual_delivery',
                  'payment_method', 'payment_status', 'status_history',
                  'special_instructions', 'created_at', 'updated_at']
        read_only_fields = ['id', 'subtotal', 'delivery_fee', 'tax', 'discount', 'total',
                            'actual_delivery', 'status_history', 'created_at', 'updated_at']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    restaurant_name = serializers.CharField(source='restaurant.name', read_only=True)
    delivery_address = serializers.JSONField(read_only=True)
    actual_delivery = serializers.SerializerMethodField()

    def get_actual_delivery(self, obj):
        return obj.updated_at if obj.status == 'delivered' else None

    class Meta:
        model = Order
        fields = ['id', 'restaurant', 'restaurant_name', 'status', 'items',
                  'subtotal', 'delivery_fee', 'tax', 'discount', 'promo_code', 'total',
                  'delivery_address', 'estimated_delivery', 'actual_delivery',
                  'payment_method', 'payment_status',
                  'special_instructions', 'created_at', 'updated_at']
        read_only_fields = ['id', 'subtotal', 'delivery_fee', 'tax', 'discount', 'total',
                            'actual_delivery', 'created_at', 'updated_at']


class OrderCreateSerializer(serializers.Serializer):
    """Serializer for creating orders with items."""
    restaurant_id = serializers.IntegerField()
    delivery_address_id = serializers.IntegerField(required=True)
    special_instructions = serializers.CharField(required=False, allow_blank=True, default='')
    payment_method = serializers.CharField(default='credit_card')
    promo_code = serializers.CharField(required=False, allow_blank=True, default='')
    items = serializers.ListField(
        child=serializers.DictField(),
        min_length=1
    )

    def validate_items(self, value):
        for item in value:
            if 'menu_item_id' not in item or 'quantity' not in item:
                raise serializers.ValidationError(
                    "Each item must have 'menu_item_id' and 'quantity'."
                )
            if item['quantity'] < 1:
                raise serializers.ValidationError("Quantity must be at least 1.")
        return value


class ReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = ['id', 'user_name', 'rating', 'comment', 'created_at']
        read_only_fields = ['id', 'user_name', 'created_at']

    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.email


class ReviewCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating reviews with validation."""
    class Meta:
        model = Review
        fields = ['rating', 'comment']

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value


class DeliveryTrackingSerializer(serializers.ModelSerializer):
    order_status = serializers.CharField(source='order.status', read_only=True)
    eta = serializers.DateTimeField(source='order.estimated_delivery', read_only=True)

    class Meta:
        model = DeliveryTracking
        fields = ['order_status', 'delivery_partner_name', 'delivery_partner_phone',
                  'delivery_partner_avatar_url', 'latitude', 'longitude',
                  'status_timeline', 'eta', 'updated_at']
