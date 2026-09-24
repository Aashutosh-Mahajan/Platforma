from decimal import Decimal

from django.db import models
from django.conf import settings
from django.utils import timezone
from django.utils.text import slugify
import uuid


class Restaurant(models.Model):
    """Restaurant listing for food delivery."""

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='restaurants'
    )
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    cuisine_types = models.CharField(max_length=255, help_text='Comma-separated cuisines')
    cuisine = models.CharField(max_length=100, blank=True, help_text='Primary cuisine, for catalog filtering')

    # Location
    address = models.CharField(max_length=255)
    area = models.CharField(max_length=100, blank=True, db_index=True)
    city = models.CharField(max_length=100, blank=True, db_index=True)
    state = models.CharField(max_length=100, blank=True, db_index=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=8, null=True, blank=True)
    longitude = models.DecimalField(max_digits=11, decimal_places=8, null=True, blank=True)

    # Catalog filtering
    price_range = models.IntegerField(default=2, help_text='1 (budget) - 4 (premium)')
    veg_only = models.BooleanField(default=False)
    hours = models.CharField(max_length=255, blank=True)
    is_open = models.BooleanField(default=True)
    data_source = models.CharField(
        max_length=10, default='real',
        help_text="'real' for owner-onboarded restaurants; 'fake' is reserved for seed/demo data.",
    )

    # Delivery
    delivery_fee = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    delivery_time_min = models.IntegerField(default=20, help_text='Minutes')
    delivery_time_max = models.IntegerField(default=40, help_text='Minutes')

    # Media
    image = models.ImageField(upload_to='restaurants/', blank=True, null=True)
    banner = models.ImageField(upload_to='restaurant_banners/', blank=True, null=True)
    image_url = models.URLField(max_length=1000, blank=True, help_text='External image URL fallback')

    # Metrics
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    review_count = models.IntegerField(default=0)

    # Phone
    phone = models.CharField(max_length=20, blank=True)

    # Status
    is_active = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)

    # Payouts — platform's cut of each delivered order, admin-controlled
    # (not exposed as owner-writable in the serializer).
    commission_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('15.00'),
        help_text='Platform commission, percent of gross revenue',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'restaurants'
        indexes = [
            models.Index(fields=['rating']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name) or 'restaurant'
        if not self.cuisine and self.cuisine_types:
            self.cuisine = self.cuisine_types.split(',')[0].strip()
        super().save(*args, **kwargs)

    def update_rating(self):
        """Recalculate average rating from reviews."""
        reviews = self.reviews.all()
        if reviews.exists():
            avg = reviews.aggregate(models.Avg('rating'))['rating__avg']
            self.rating = round(avg, 2)
            self.review_count = reviews.count()
            self.save(update_fields=['rating', 'review_count'])


class MenuItem(models.Model):
    """Menu items for a restaurant."""

    restaurant = models.ForeignKey(
        Restaurant, on_delete=models.CASCADE, related_name='menu_items'
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=8, decimal_places=2)

    category = models.CharField(max_length=100)
    image = models.ImageField(upload_to='menu_items/', blank=True, null=True)

    is_vegetarian = models.BooleanField(default=False)
    is_vegan = models.BooleanField(default=False)
    is_available = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'menu_items'

    def __str__(self):
        return f"{self.name} - ₹{self.price}"

    def save(self, *args, **kwargs):
        price_changed = False
        old_price = None
        if self.pk is not None:
            old_price = type(self).objects.filter(pk=self.pk).values_list('price', flat=True).first()
            price_changed = old_price is not None and old_price != self.price
        super().save(*args, **kwargs)
        if price_changed:
            MenuItemPriceHistory.objects.create(
                menu_item=self, old_price=old_price, new_price=self.price
            )


class MenuItemPriceHistory(models.Model):
    """Every price change for a menu item (FR-P1: 'price history preserved').

    Written automatically from MenuItem.save() — never created directly by
    a view — so no update path can silently skip logging a price change.
    """

    menu_item = models.ForeignKey(MenuItem, on_delete=models.CASCADE, related_name='price_history')
    old_price = models.DecimalField(max_digits=8, decimal_places=2)
    new_price = models.DecimalField(max_digits=8, decimal_places=2)
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'menu_item_price_history'
        ordering = ['-changed_at']

    def __str__(self):
        return f"{self.menu_item.name}: {self.old_price} -> {self.new_price}"


class Cart(models.Model):
    """A customer's active cart. At most one per customer (PRD FR-Z3/FR-Z4)."""

    customer = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='cart'
    )
    restaurant = models.ForeignKey(
        Restaurant, on_delete=models.CASCADE, related_name='+', null=True, blank=True,
        help_text='Set on first item added; cart is restricted to a single restaurant.'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'carts'

    def __str__(self):
        return f"Cart(customer={self.customer_id}, restaurant={self.restaurant_id})"

    def clear(self):
        self.items.all().delete()
        self.restaurant = None
        self.save(update_fields=['restaurant', 'updated_at'])


class CartItem(models.Model):
    """A single menu item line within a cart."""

    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    menu_item = models.ForeignKey(MenuItem, on_delete=models.CASCADE, related_name='+')
    quantity = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cart_items'
        unique_together = ('cart', 'menu_item')

    def __str__(self):
        return f"{self.menu_item.name} x{self.quantity}"


class Promotion(models.Model):
    """Discount codes (FR-Z? / warehouse DimPromotion's operational source).

    `restaurant=None` means a platform-wide code (admin-managed); set means
    an owner-scoped code that only applies to orders from that restaurant.
    """

    DISCOUNT_TYPE_CHOICES = [
        ('percent', 'Percentage off'),
        ('fixed', 'Fixed amount off'),
    ]

    restaurant = models.ForeignKey(
        Restaurant, on_delete=models.CASCADE, related_name='promotions', null=True, blank=True
    )
    code = models.CharField(max_length=30, unique=True)
    description = models.CharField(max_length=255, blank=True)
    discount_type = models.CharField(max_length=10, choices=DISCOUNT_TYPE_CHOICES, default='percent')
    discount_value = models.DecimalField(max_digits=8, decimal_places=2)
    min_order_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    max_discount_amount = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    usage_limit = models.IntegerField(null=True, blank=True, help_text='Blank = unlimited')
    times_used = models.IntegerField(default=0)
    valid_from = models.DateTimeField(null=True, blank=True)
    valid_until = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'promotions'

    def __str__(self):
        return self.code

    def check_valid(self, subtotal, restaurant_id):
        """Returns (is_valid, error_message)."""
        now = timezone.now()
        if not self.is_active:
            return False, 'This promo code is no longer active.'
        if self.restaurant_id and self.restaurant_id != restaurant_id:
            return False, 'This promo code is not valid for this restaurant.'
        if self.valid_from and now < self.valid_from:
            return False, 'This promo code is not active yet.'
        if self.valid_until and now > self.valid_until:
            return False, 'This promo code has expired.'
        if self.usage_limit is not None and self.times_used >= self.usage_limit:
            return False, 'This promo code has reached its usage limit.'
        if subtotal < self.min_order_value:
            return False, f'Minimum order value for this code is ₹{self.min_order_value}.'
        return True, ''

    def compute_discount(self, subtotal):
        if self.discount_type == 'percent':
            amount = subtotal * (self.discount_value / Decimal('100'))
        else:
            amount = self.discount_value
        if self.max_discount_amount is not None:
            amount = min(amount, self.max_discount_amount)
        return min(amount, subtotal)


class Order(models.Model):
    """Food delivery orders."""

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('preparing', 'Preparing'),
        ('ready', 'Ready'),
        ('out_for_delivery', 'Out for Delivery'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='orders'
    )
    restaurant = models.ForeignKey(
        Restaurant, on_delete=models.PROTECT, related_name='orders'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    # Address snapshot JSON at order time.
    delivery_address = models.JSONField(default=dict, blank=True)

    # Amounts
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    delivery_fee = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tax = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    promo_code = models.CharField(max_length=30, blank=True)
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0, db_column='total_amount')

    # Timeline
    estimated_delivery = models.DateTimeField(null=True, blank=True, db_column='estimated_delivery_time')

    # Extra
    special_instructions = models.TextField(blank=True)
    payment_method = models.CharField(max_length=10, default='cod')
    payment_status = models.CharField(max_length=10, default='pending')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'orders'
        ordering = ['-created_at']

    def __str__(self):
        return f"Order #{self.id} - {self.restaurant.name}"

    def save(self, *args, **kwargs):
        status_changed = False
        old_status = None
        if self._state.adding is False and self.pk is not None:
            old_status = type(self).objects.filter(pk=self.pk).values_list('status', flat=True).first()
            status_changed = old_status is not None and old_status != self.status
        super().save(*args, **kwargs)
        if status_changed:
            OrderStatusHistory.objects.create(order=self, old_status=old_status, new_status=self.status)

    def calculate_totals(self, promotion=None):
        """Calculate order totals from items, applying `promotion` if given.

        Tax is charged on the post-discount amount — the discount is a
        price reduction, not separate consideration, so GST should apply
        to what the customer actually pays for the food.
        """
        self.subtotal = sum(item.total for item in self.items.all())
        self.delivery_fee = self.restaurant.delivery_fee
        self.discount = promotion.compute_discount(self.subtotal) if promotion else Decimal('0')
        taxable_amount = self.subtotal - self.discount
        self.tax = taxable_amount * Decimal('0.05')  # 5% GST
        self.total = taxable_amount + self.delivery_fee + self.tax
        self.save(update_fields=['subtotal', 'delivery_fee', 'discount', 'tax', 'total'])


class OrderStatusHistory(models.Model):
    """Every status transition an order has gone through (FR-D2).

    Written automatically from Order.save() whenever `status` actually
    changes — never created directly by a view.
    """

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='status_history')
    old_status = models.CharField(max_length=20)
    new_status = models.CharField(max_length=20)
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'order_status_history'
        ordering = ['-changed_at']

    def __str__(self):
        return f"Order #{self.order_id}: {self.old_status} -> {self.new_status}"


class OrderItem(models.Model):
    """Individual items within an order."""

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    menu_item = models.ForeignKey(MenuItem, on_delete=models.PROTECT)
    quantity = models.IntegerField(default=1)
    unit_price = models.DecimalField(max_digits=8, decimal_places=2)
    total = models.DecimalField(max_digits=10, decimal_places=2, db_column='total_price')
    customizations = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'order_items'

    def __str__(self):
        return f"{self.menu_item.name} x{self.quantity}"

    def save(self, *args, **kwargs):
        self.total = self.unit_price * self.quantity
        super().save(*args, **kwargs)


class Review(models.Model):
    """Restaurant reviews."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='restaurant_reviews'
    )
    restaurant = models.ForeignKey(
        Restaurant, on_delete=models.CASCADE, related_name='reviews'
    )
    order = models.OneToOneField(Order, on_delete=models.SET_NULL, null=True, blank=True)
    rating = models.IntegerField(choices=[(i, i) for i in range(1, 6)])
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'reviews'
        unique_together = ('user', 'restaurant')

    def __str__(self):
        return f"{self.restaurant.name} - {self.rating}★"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.restaurant.update_rating()


class DeliveryTracking(models.Model):
    """Simulated delivery tracking."""

    order = models.OneToOneField(
        Order, on_delete=models.CASCADE, related_name='tracking'
    )
    delivery_partner_name = models.CharField(max_length=100, default='Delivery Partner')
    delivery_partner_phone = models.CharField(max_length=20, default='+910000000000')
    latitude = models.DecimalField(max_digits=10, decimal_places=8, null=True, blank=True, db_column='current_lat')
    longitude = models.DecimalField(max_digits=11, decimal_places=8, null=True, blank=True, db_column='current_lng')
    delivery_partner_avatar_url = models.CharField(max_length=1000, blank=True, default='')
    status_timeline = models.JSONField(default=list, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'delivery_tracking'

    def __str__(self):
        return f"Tracking for Order #{self.order.id}"


class Payout(models.Model):
    """A settlement batch: gross revenue from delivered orders in
    [period_start, period_end) for one restaurant, minus platform
    commission, marked paid once the transfer actually happens.

    Amounts are a snapshot taken at creation time (not recomputed live) —
    a payout record is a statement of what was actually settled, so it
    must not silently change if commission_rate or order data changes
    later.
    """

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
    ]

    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name='payouts')
    period_start = models.DateTimeField()
    period_end = models.DateTimeField()
    order_count = models.IntegerField(default=0)
    gross_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2)
    commission_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    net_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    paid_at = models.DateTimeField(null=True, blank=True)
    notes = models.CharField(max_length=255, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'payouts'
        ordering = ['-period_end']

    def __str__(self):
        return f"Payout #{self.id} - {self.restaurant.name} ({self.period_start.date()} to {self.period_end.date()})"
