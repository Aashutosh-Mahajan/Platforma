from django.db import models
from django.conf import settings
from django.utils import timezone
import uuid

from eventra.event_types import EVENT_TYPE_CHOICES, category_for, label_for


class Venue(models.Model):
    """A physical venue, reusable across events (PRD §5.3)."""

    name = models.CharField(max_length=255)
    address = models.CharField(max_length=255)
    area = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True, db_index=True)
    state = models.CharField(max_length=100, blank=True, db_index=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=8, null=True, blank=True)
    longitude = models.DecimalField(max_digits=11, decimal_places=8, null=True, blank=True)
    capacity = models.IntegerField(null=True, blank=True)
    is_indoor = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'venues'
        unique_together = ('name', 'address')

    def __str__(self):
        return f"{self.name}, {self.city or self.address}"


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
    # The specific kind of event within the category (cricket match,
    # stand-up comedy, food festival...). Optional for older events; when
    # set it decides the category, see eventra.event_types.
    event_type = models.CharField(max_length=40, choices=EVENT_TYPE_CHOICES, blank=True, default='', db_index=True)

    # Venue — denormalized fields are kept so existing API responses don't
    # change shape; `venue` is the PRD §5.3 normalized entity, kept in sync
    # automatically in save() so venues are reusable across events without
    # requiring every caller to be rewritten at once.
    venue = models.ForeignKey(
        Venue, on_delete=models.PROTECT, null=True, blank=True, related_name='events'
    )
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
    is_published = models.BooleanField(default=False, help_text='Organizer-controlled draft/publish toggle.')
    is_approved = models.BooleanField(default=False, help_text='Admin approval gate (FR-A4) — separate from is_published.')
    is_cancelled = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'events'
        ordering = ['-event_date']

    def __str__(self):
        return f"{self.name} ({self.get_category_display()})"

    @property
    def event_type_label(self):
        return label_for(self.event_type)

    def save(self, *args, **kwargs):
        # A specific event type always implies its category, so the two can
        # never disagree (the category drives the seat-map layout).
        implied = category_for(self.event_type)
        if implied:
            self.category = implied
        if self.venue_name and self.address and self.venue_id is None:
            self.venue, _ = Venue.objects.get_or_create(
                name=self.venue_name,
                address=self.address,
                defaults={'latitude': self.latitude, 'longitude': self.longitude},
            )
        super().save(*args, **kwargs)

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

    # PRD §5.3 Zone fields: refundability and cutoff window (per-tier, not per-event).
    is_refundable = models.BooleanField(default=True)
    refund_cutoff_hours = models.IntegerField(
        default=24, help_text='Cancellation is refused within this many hours of the event.'
    )

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


class SeatHold(models.Model):
    """Temporary hold on a seat while a customer is checking out (PRD FR-E4).

    Holds are advisory: they do not change Seat.status. Availability checks
    must treat a seat as unavailable to other customers while a non-expired
    hold exists, and must ignore expired holds without needing a background
    job to have run first.
    """

    seat = models.ForeignKey(Seat, on_delete=models.CASCADE, related_name='holds')
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='seat_holds'
    )
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'seat_holds'
        indexes = [models.Index(fields=['expires_at'])]

    def __str__(self):
        return f"Hold({self.seat_id} by {self.customer_id} until {self.expires_at})"

    @property
    def is_expired(self):
        return timezone.now() >= self.expires_at


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

        status_changed = False
        old_status = None
        if self.pk is not None:
            old_status = type(self).objects.filter(pk=self.pk).values_list('status', flat=True).first()
            status_changed = old_status is not None and old_status != self.status

        super().save(*args, **kwargs)

        if status_changed:
            BookingStatusHistory.objects.create(booking=self, old_status=old_status, new_status=self.status)


class BookingStatusHistory(models.Model):
    """Every status transition a booking has gone through (FR-D2)."""

    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='status_history')
    old_status = models.CharField(max_length=20)
    new_status = models.CharField(max_length=20)
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'booking_status_history'
        ordering = ['-changed_at']

    def __str__(self):
        return f"Booking #{self.booking_id}: {self.old_status} -> {self.new_status}"


class BookingSeat(models.Model):
    """Links bookings to specific seats."""

    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='booked_seats')
    seat = models.ForeignKey(Seat, on_delete=models.PROTECT)

    class Meta:
        db_table = 'booking_seats'

    def __str__(self):
        return f"{self.booking.booking_reference} → {self.seat}"


class Ticket(models.Model):
    """One QR-verifiable ticket per booked seat (PRD FR-E5/FR-E6).

    A ticket verifies exactly once: `is_scanned` flips true on first
    successful scan and every later scan attempt is rejected. `scanned_at`/
    `scanned_gate` record only the original, authoritative scan.
    """

    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='tickets')
    seat = models.OneToOneField(Seat, on_delete=models.PROTECT, related_name='ticket')
    qr_token = models.CharField(max_length=64, unique=True, editable=False)
    is_scanned = models.BooleanField(default=False)
    scanned_at = models.DateTimeField(null=True, blank=True)
    scanned_gate = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tickets'

    def __str__(self):
        return f"Ticket {self.qr_token[:8]} - {self.booking.booking_reference}"

    def save(self, *args, **kwargs):
        if not self.qr_token:
            self.qr_token = uuid.uuid4().hex
        super().save(*args, **kwargs)


class TicketScanAttempt(models.Model):
    """Log of every verify attempt against a ticket, successful or not."""

    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='scan_attempts')
    was_accepted = models.BooleanField()
    gate = models.CharField(max_length=50, blank=True)
    attempted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ticket_scan_attempts'
        ordering = ['-attempted_at']

    def __str__(self):
        outcome = 'accepted' if self.was_accepted else 'rejected'
        return f"{self.ticket.qr_token[:8]} {outcome} @ {self.attempted_at}"


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
