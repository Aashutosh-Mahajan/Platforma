from rest_framework import serializers
from eventra.models import Event, TicketType, Seat, Booking, BookingSeat, EventReview, EventAnalytics


class TicketTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = TicketType
        fields = ['id', 'name', 'price', 'quantity_total', 'quantity_available',
                  'description', 'benefits']


class SeatSerializer(serializers.ModelSerializer):
    ticket_type_name = serializers.CharField(source='ticket_type.name', read_only=True)
    price = serializers.DecimalField(source='ticket_type.price', max_digits=10,
                                     decimal_places=2, read_only=True)

    class Meta:
        model = Seat
        fields = ['id', 'section', 'row', 'seat_number', 'status',
                  'ticket_type_name', 'price']


class EventListSerializer(serializers.ModelSerializer):
    """Lightweight event list serializer."""
    class Meta:
        model = Event
        fields = ['id', 'organizer', 'name', 'description', 'category', 'venue_name',
                  'address', 'event_date', 'event_end_date', 'image',
                  'rating', 'review_count', 'total_seats', 'available_seats',
                  'is_published', 'is_cancelled']
        read_only_fields = ['id', 'organizer', 'rating', 'review_count', 'total_seats', 'available_seats', 'is_cancelled']


class EventDetailSerializer(serializers.ModelSerializer):
    """Full event detail with ticket types."""
    ticket_types = TicketTypeSerializer(many=True, read_only=True)

    class Meta:
        model = Event
        fields = ['id', 'organizer', 'name', 'description', 'category', 'venue_name',
                  'address', 'latitude', 'longitude', 'event_date',
                  'event_end_date', 'image', 'banner', 'rating', 'review_count',
                  'total_seats', 'available_seats', 'is_published', 'is_cancelled',
                  'ticket_types']


class BookingSeatSerializer(serializers.ModelSerializer):
    seat = SeatSerializer(read_only=True)

    class Meta:
        model = BookingSeat
        fields = ['id', 'seat']


class BookingSerializer(serializers.ModelSerializer):
    event_name = serializers.CharField(source='event.name', read_only=True)
    booked_seats = BookingSeatSerializer(many=True, read_only=True)

    class Meta:
        model = Booking
        fields = ['id', 'booking_reference', 'event', 'event_name', 'status',
                  'total_tickets', 'subtotal', 'tax', 'total',
                  'booked_seats', 'booking_date', 'confirmation_sent']
        read_only_fields = ['id', 'booking_reference', 'subtotal', 'tax', 'total',
                            'booking_date', 'confirmation_sent']


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
