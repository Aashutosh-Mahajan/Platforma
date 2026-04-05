from django.db import models
from django.conf import settings


class Restaurant(models.Model):
    """Restaurant listing for food delivery."""

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='restaurants'
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    cuisine_types = models.CharField(max_length=255, help_text='Comma-separated cuisines')

    # Location
    address = models.CharField(max_length=255)
    latitude = models.DecimalField(max_digits=10, decimal_places=8, null=True, blank=True)
    longitude = models.DecimalField(max_digits=11, decimal_places=8, null=True, blank=True)

    # Delivery
    delivery_fee = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    delivery_time_min = models.IntegerField(default=20, help_text='Minutes')
    delivery_time_max = models.IntegerField(default=40, help_text='Minutes')

    # Media
    image = models.ImageField(upload_to='restaurants/', blank=True, null=True)
    banner = models.ImageField(upload_to='restaurant_banners/', blank=True, null=True)

    # Metrics
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    review_count = models.IntegerField(default=0)

    # Phone
    phone = models.CharField(max_length=20, blank=True)

    # Status
    is_active = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)

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

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='orders'
    )
    restaurant = models.ForeignKey(
        Restaurant, on_delete=models.PROTECT, related_name='orders'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    # Address
    delivery_address = models.ForeignKey(
        'core.Address', on_delete=models.SET_NULL, null=True, blank=True
    )

    # Amounts
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    delivery_fee = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tax = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Timeline
    estimated_delivery = models.DateTimeField(null=True, blank=True)
    actual_delivery = models.DateTimeField(null=True, blank=True)

    # Extra
    special_instructions = models.TextField(blank=True)
    payment = models.OneToOneField(
        'core.Payment', on_delete=models.SET_NULL, null=True, blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'orders'
        ordering = ['-created_at']

    def __str__(self):
        return f"Order #{self.id} - {self.restaurant.name}"

    def calculate_totals(self):
        """Calculate order totals from items."""
        from decimal import Decimal
        self.subtotal = sum(item.total for item in self.items.all())
        self.delivery_fee = self.restaurant.delivery_fee
        self.tax = self.subtotal * Decimal('0.05')  # 5% GST
        self.total = self.subtotal + self.delivery_fee + self.tax
        self.save(update_fields=['subtotal', 'delivery_fee', 'tax', 'total'])


class OrderItem(models.Model):
    """Individual items within an order."""

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    menu_item = models.ForeignKey(MenuItem, on_delete=models.PROTECT)
    quantity = models.IntegerField(default=1)
    unit_price = models.DecimalField(max_digits=8, decimal_places=2)
    total = models.DecimalField(max_digits=10, decimal_places=2)

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
    latitude = models.DecimalField(max_digits=10, decimal_places=8, null=True, blank=True)
    longitude = models.DecimalField(max_digits=11, decimal_places=8, null=True, blank=True)
    eta = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'delivery_tracking'

    def __str__(self):
        return f"Tracking for Order #{self.order.id}"
