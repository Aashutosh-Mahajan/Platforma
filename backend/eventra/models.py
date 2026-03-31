from django.db import models
from django.conf import settings
import uuid


class Event(models.Model):
    """Events for concerts, movies, sports, etc."""

    CATEGORY_CHOICES = [
        ('movie', 'Movie'),
        ('concert', 'Concert'),
        ('sports', 'Sports'),
        ('theater', 'Theater'),
        ('comedy', 'Comedy'),
        ('expo', 'Expo'),
        ('dining', 'Dining Experience'),
    ]

    organizer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='events'
    )
    name = models.CharField(max_length=255)
    description = models.TextField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)

    # Venue
    venue_name = models.CharField(max_length=255)
    address = models.CharField(max_length=255)
    latitude = models.DecimalField(max_digits=10, decimal_places=8, null=True, blank=True)
    longitude = models.DecimalField(max_digits=11, decimal_places=8, null=True, blank=True)

    # Dates
    event_date = models.DateTimeField()
    event_end_date = models.DateTimeField(null=True, blank=True)

    # Media
    image = models.ImageField(upload_to='events/', blank=True, null=True)
    banner = models.ImageField(upload_to='event_banners/', blank=True, null=True)

    # Metrics
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    review_count = models.IntegerField(default=0)

    # Capacity
    total_seats = models.IntegerField(default=0)
    available_seats = models.IntegerField(default=0)

    # Status
    is_published = models.BooleanField(default=False)
    is_cancelled = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'events'
        ordering = ['-event_date']

    def __str__(self):
        return f"{self.name} ({self.get_category_display()})"

    def update_rating(self):
        """Recalculate average rating from reviews."""
        reviews = self.event_reviews.all()
        if reviews.exists():
            avg = reviews.aggregate(models.Avg('rating'))['rating__avg']
            self.rating = round(avg, 2)
            self.review_count = reviews.count()
            self.save(update_fields=['rating', 'review_count'])


class TicketType(models.Model):
    """Ticket tiers for events (Standard, VIP, Premium)."""

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='ticket_types')
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity_total = models.IntegerField()
    quantity_available = models.IntegerField()
    description = models.TextField(blank=True)
    benefits = models.TextField(blank=True)

    class Meta:
        db_table = 'ticket_types'

    def __str__(self):
        return f"{self.event.name} - {self.name} (₹{self.price})"


class Seat(models.Model):
    """Individual seats for events."""

    STATUS_CHOICES = [
        ('available', 'Available'),
        ('booked', 'Booked'),
        ('reserved', 'Reserved'),
        ('blocked', 'Blocked'),
    ]

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='seats')
    section = models.CharField(max_length=50)
    row = models.CharField(max_length=10)
    seat_number = models.CharField(max_length=10)
    ticket_type = models.ForeignKey(TicketType, on_delete=models.PROTECT)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')

    class Meta:
        db_table = 'seats'
        unique_together = ('event', 'section', 'row', 'seat_number')

    def __str__(self):
        return f"{self.section}-{self.row}-{self.seat_number} ({self.status})"


class Booking(models.Model):
    """Event ticket bookings."""

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bookings'
    )
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='bookings')
    booking_reference = models.CharField(max_length=50, unique=True, editable=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    # Amounts
    total_tickets = models.IntegerField(default=0)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Payment
    payment = models.OneToOneField(
        'core.Payment', on_delete=models.SET_NULL, null=True, blank=True
    )

    booking_date = models.DateTimeField(auto_now_add=True)
    confirmation_sent = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'bookings'
        ordering = ['-booking_date']

    def __str__(self):
        return f"Booking {self.booking_reference} - {self.event.name}"

    def save(self, *args, **kwargs):
        if not self.booking_reference:
            self.booking_reference = f"EB-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)


class BookingSeat(models.Model):
    """Links bookings to specific seats."""

    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='booked_seats')
    seat = models.ForeignKey(Seat, on_delete=models.PROTECT)

    class Meta:
        db_table = 'booking_seats'

    def __str__(self):
        return f"{self.booking.booking_reference} → {self.seat}"


class EventReview(models.Model):
    """Reviews for events."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='event_reviews'
    )
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='event_reviews')
    booking = models.OneToOneField(Booking, on_delete=models.SET_NULL, null=True, blank=True)
    rating = models.IntegerField(choices=[(i, i) for i in range(1, 6)])
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'event_reviews'
        unique_together = ('user', 'event')

    def __str__(self):
        return f"{self.event.name} - {self.rating}★"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.event.update_rating()


class EventAnalytics(models.Model):
    """Analytics for events."""

    event = models.OneToOneField(Event, on_delete=models.CASCADE, related_name='analytics')
    views = models.IntegerField(default=0)
    bookings_count = models.IntegerField(default=0)
    revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'event_analytics'
        verbose_name_plural = 'Event analytics'

    def __str__(self):
        return f"Analytics: {self.event.name}"
