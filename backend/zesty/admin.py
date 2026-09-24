from django.contrib import admin
from zesty.models import (
    Restaurant, MenuItem, Order, OrderItem, Review, DeliveryTracking, Cart, CartItem,
    MenuItemPriceHistory, OrderStatusHistory
)


class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ['customer', 'restaurant', 'updated_at']
    inlines = [CartItemInline]


@admin.register(Restaurant)
class RestaurantAdmin(admin.ModelAdmin):
    list_display = ['name', 'cuisine_types', 'rating', 'review_count', 'is_active', 'is_verified']
    list_filter = ['is_active', 'is_verified', 'cuisine_types']
    search_fields = ['name', 'cuisine_types', 'address']


@admin.register(MenuItem)
class MenuItemAdmin(admin.ModelAdmin):
    list_display = ['name', 'restaurant', 'price', 'category', 'is_available', 'is_vegetarian']
    list_filter = ['category', 'is_available', 'is_vegetarian', 'is_vegan']
    search_fields = ['name', 'restaurant__name']


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ['total']


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'restaurant', 'status', 'total', 'created_at']
    list_filter = ['status']
    search_fields = ['user__email', 'restaurant__name']
    inlines = [OrderItemInline]


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ['restaurant', 'user', 'rating', 'created_at']
    list_filter = ['rating']


@admin.register(DeliveryTracking)
class DeliveryTrackingAdmin(admin.ModelAdmin):
    list_display = ['order', 'delivery_partner_name', 'delivery_partner_phone', 'updated_at']


@admin.register(MenuItemPriceHistory)
class MenuItemPriceHistoryAdmin(admin.ModelAdmin):
    list_display = ['menu_item', 'old_price', 'new_price', 'changed_at']
    search_fields = ['menu_item__name']


@admin.register(OrderStatusHistory)
class OrderStatusHistoryAdmin(admin.ModelAdmin):
    list_display = ['order', 'old_status', 'new_status', 'changed_at']
    search_fields = ['order__id']
