from django.contrib import admin
from core.models import User, Address, Payment, Notification


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['email', 'first_name', 'last_name', 'role', 'is_active', 'created_at']
    list_filter = ['role', 'is_active', 'is_email_verified']
    search_fields = ['email', 'first_name', 'last_name', 'phone']
    ordering = ['-created_at']


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ['user', 'label', 'city', 'state', 'is_default']
    list_filter = ['label', 'city']


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'amount', 'method', 'status', 'transaction_id', 'created_at']
    list_filter = ['status', 'method']
    search_fields = ['transaction_id', 'user__email']


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'type', 'is_read', 'created_at']
    list_filter = ['type', 'is_read']
