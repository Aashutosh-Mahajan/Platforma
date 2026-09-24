from rest_framework import serializers
from eventra.models import (
    Event, Venue, TicketType, Seat, SeatHold, Booking, BookingSeat, Ticket,
    BookingStatusHistory, EventReview, EventAnalytics
)
from eventra.event_types import category_for


class VenueSerializer(serializers.ModelSerializer):
    class Meta:
        model = Venue
        fields = ['id', 'name', 'address', 'area', 'city', 'latitude', 'longitude',
                  'capacity', 'is_indoor']


class TicketTypeSerializer(serializers.ModelSerializer):
    # quantity_available (remaining/unsold count) starts equal to
    # quantity_total and is thereafter maintained by the booking flow, not
    # set by the caller — requiring the organizer to pass a second,
    # redundant "how many are unsold" number at creation time is both
    # pointless and error-prone.
    quantity_available = serializers.IntegerField(read_only=True)

    class Meta:
        model = TicketType
        fields = ['id', 'name', 'price', 'quantity_total', 'quantity_available',
                  'description', 'benefits', 'is_refundable', 'refund_cutoff_hours']


class SeatHoldSerializer(serializers.ModelSerializer):
    class Meta:
        model = SeatHold
        fields = ['id', 'seat', 'customer', 'expires_at', 'created_at']
        read_only_fields = ['id', 'customer', 'expires_at', 'created_at']


class SeatHoldCreateSerializer(serializers.Serializer):
    """Input for POST /seats/hold — hold one or more seats for checkout."""
    seat_ids = serializers.ListField(
        child=serializers.IntegerField(), min_length=1
    )


class SeatSerializer(serializers.ModelSerializer):
    ticket_type_name = serializers.CharField(source='ticket_type.name', read_only=True)
    price = serializers.DecimalField(source='ticket_type.price', max_digits=10,
                                     decimal_places=2, read_only=True)

    class Meta:
        model = Seat
        fields = ['id', 'section', 'row', 'seat_number', 'status',
                  'ticket_type_name', 'price']


class TicketSerializer(serializers.ModelSerializer):
    seat = SeatSerializer(read_only=True)

    class Meta:
        model = Ticket
        fields = ['id', 'booking', 'seat', 'qr_token', 'is_scanned', 'scanned_at', 'scanned_gate', 'created_at']
        read_only_fields = fields


class EventTypeMixin:
    """Keeps category consistent with a chosen event type on write."""

    def get_fields(self):
        fields = super().get_fields()
        # The event type implies the category, so it need not be sent.
        if 'category' in fields:
            fields['category'].required = False
        return fields

    def validate(self, attrs):
        attrs = super().validate(attrs)
        implied = category_for(attrs.get('event_type'))
        if implied:
            attrs['category'] = implied
        elif 'category' not in attrs and not getattr(self, 'instance', None):
            raise serializers.ValidationError({'event_type': 'Choose what kind of event this is.'})
        return attrs


class EventListSerializer(EventTypeMixin, serializers.ModelSerializer):
    """Lightweight event list serializer."""
    venue_detail = VenueSerializer(source='venue', read_only=True)
    event_type_label = serializers.CharField(read_only=True)

    class Meta:
        model = Event
        fields = ['id', 'organizer', 'name', 'description', 'category', 'event_type', 'event_type_label', 'venue_name',
                  'address', 'venue_detail', 'event_date', 'event_end_date', 'image',
                  'rating', 'review_count', 'total_seats', 'available_seats',
                  'is_published', 'is_approved', 'is_cancelled']
        read_only_fields = ['id', 'organizer', 'rating', 'review_count', 'total_seats',
                             'available_seats', 'is_approved', 'is_cancelled']


class EventDetailSerializer(EventTypeMixin, serializers.ModelSerializer):
    """Full event detail with ticket types."""
    ticket_types = TicketTypeSerializer(many=True, read_only=True)
    venue_detail = VenueSerializer(source='venue', read_only=True)
    event_type_label = serializers.CharField(read_only=True)

    class Meta:
        model = Event
        fields = ['id', 'organizer', 'name', 'description', 'category', 'event_type', 'event_type_label', 'venue_name',
                  'address', 'latitude', 'longitude', 'venue_detail', 'event_date',
                  'event_end_date', 'image', 'banner', 'rating', 'review_count',
                  'total_seats', 'available_seats', 'is_published', 'is_approved',
                  'is_cancelled', 'ticket_types']
        read_only_fields = ['is_approved']


class BookingSeatSerializer(serializers.ModelSerializer):
    seat = SeatSerializer(read_only=True)

    class Meta:
        model = BookingSeat
        fields = ['id', 'seat']


class BookingStatusHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = BookingStatusHistory
        fields = ['old_status', 'new_status', 'changed_at']


class BookingSerializer(serializers.ModelSerializer):
    event_name = serializers.CharField(source='event.name', read_only=True)
    booked_seats = BookingSeatSerializer(many=True, read_only=True)
    status_history = BookingStatusHistorySerializer(many=True, read_only=True)

    class Meta:
        model = Booking
        fields = ['id', 'booking_reference', 'event', 'event_name', 'status',
                  'total_tickets', 'subtotal', 'tax', 'total', 'status_history',
                  'booked_seats', 'booking_date', 'confirmation_sent']
        read_only_fields = ['id', 'booking_reference', 'subtotal', 'tax', 'total',
                            'status_history', 'booking_date', 'confirmation_sent']


class CreateBookingSerializer(serializers.Serializer):
    """Serializer for creating bookings."""
    event_id = serializers.IntegerField()
    payment_method = serializers.CharField(default='credit_card')
    tickets = serializers.ListField(
        child=serializers.DictField(),
        min_length=1
    )

    def validate_tickets(self, value):
        for ticket in value:
            if 'ticket_type_id' not in ticket or 'quantity' not in ticket:
                raise serializers.ValidationError(
                    "Each ticket must have 'ticket_type_id' and 'quantity'."
                )
            if ticket['quantity'] < 1:
                raise serializers.ValidationError("Quantity must be at least 1.")
        return value


class EventReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = EventReview
        fields = ['id', 'user_name', 'rating', 'comment', 'created_at']
        read_only_fields = ['id', 'user_name', 'created_at']

    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.email


class EventReviewCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating event reviews with validation."""
    class Meta:
        model = EventReview
        fields = ['rating', 'comment']

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value


class EventAnalyticsSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventAnalytics
        fields = ['views', 'bookings_count', 'revenue', 'updated_at']
