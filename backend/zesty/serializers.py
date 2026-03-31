from rest_framework import serializers
from zesty.models import Restaurant, MenuItem, Order, OrderItem, Review, DeliveryTracking


class MenuItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MenuItem
        fields = ['id', 'name', 'description', 'price', 'category', 'image',
                  'is_vegetarian', 'is_vegan', 'is_available']


class RestaurantListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list view."""
    class Meta:
        model = Restaurant
        fields = ['id', 'name', 'description', 'cuisine_types', 'address',
                  'delivery_fee', 'delivery_time_min', 'delivery_time_max',
                  'image', 'rating', 'review_count', 'is_active']


class RestaurantDetailSerializer(serializers.ModelSerializer):
    """Full detail serializer with menu items."""
    menu_items = MenuItemSerializer(many=True, read_only=True)

    class Meta:
        model = Restaurant
        fields = ['id', 'name', 'description', 'cuisine_types', 'address',
                  'latitude', 'longitude', 'delivery_fee', 'delivery_time_min',
                  'delivery_time_max', 'image', 'banner', 'phone',
                  'rating', 'review_count', 'is_active', 'menu_items']


class OrderItemSerializer(serializers.ModelSerializer):
    menu_item = MenuItemSerializer(read_only=True)
    menu_item_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = OrderItem
        fields = ['id', 'menu_item', 'menu_item_id', 'quantity', 'unit_price', 'total']
        read_only_fields = ['unit_price', 'total']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    restaurant_name = serializers.CharField(source='restaurant.name', read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'restaurant', 'restaurant_name', 'status', 'items',
                  'subtotal', 'delivery_fee', 'tax', 'total',
                  'delivery_address', 'estimated_delivery', 'actual_delivery',
                  'special_instructions', 'created_at', 'updated_at']
        read_only_fields = ['id', 'subtotal', 'delivery_fee', 'tax', 'total',
                            'actual_delivery', 'created_at', 'updated_at']


class CreateOrderSerializer(serializers.Serializer):
    """Serializer for creating orders with items."""
    restaurant_id = serializers.IntegerField()
    delivery_address_id = serializers.IntegerField(required=False)
    special_instructions = serializers.CharField(required=False, allow_blank=True, default='')
    payment_method = serializers.CharField(default='credit_card')
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


class DeliveryTrackingSerializer(serializers.ModelSerializer):
    order_status = serializers.CharField(source='order.status', read_only=True)

    class Meta:
        model = DeliveryTracking
        fields = ['order_status', 'delivery_partner_name', 'delivery_partner_phone',
                  'latitude', 'longitude', 'eta', 'updated_at']
