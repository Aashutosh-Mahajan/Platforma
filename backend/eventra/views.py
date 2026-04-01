from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone

from eventra.models import (
    Event, TicketType, Seat, Booking, BookingSeat, EventReview, EventAnalytics
)
from eventra.serializers import (
    EventListSerializer, EventDetailSerializer, SeatSerializer,
    BookingSerializer, CreateBookingSerializer, EventReviewSerializer,
    EventAnalyticsSerializer, TicketTypeSerializer
)
from core.models import Payment


class EventViewSet(viewsets.ReadOnlyModelViewSet):
    """List and retrieve events."""
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['name', 'venue_name', 'category']
    ordering_fields = ['event_date', 'rating', '-event_date']
    ordering = ['-event_date']
    filterset_fields = ['category']

    def get_queryset(self):
        qs = Event.objects.filter(is_published=True, is_cancelled=False)

        # Date filtering
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        if date_from:
            qs = qs.filter(event_date__gte=date_from)
        if date_to:
            qs = qs.filter(event_date__lte=date_to)

        # Price filtering
        min_price = self.request.query_params.get('min_price')
        max_price = self.request.query_params.get('max_price')
        if min_price or max_price:
            ticket_filter = {}
            if min_price:
                ticket_filter['ticket_types__price__gte'] = min_price
            if max_price:
                ticket_filter['ticket_types__price__lte'] = max_price
            qs = qs.filter(**ticket_filter).distinct()

        # City
        city = self.request.query_params.get('city')
        if city:
            qs = qs.filter(address__icontains=city)

        return qs

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return EventDetailSerializer
        return EventListSerializer

    def retrieve(self, request, *args, **kwargs):
        """Also increment view count."""
        instance = self.get_object()
        analytics, _ = EventAnalytics.objects.get_or_create(event=instance)
        analytics.views += 1
        analytics.save(update_fields=['views'])
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def seats(self, request, pk=None):
        """Get seat map for an event."""
        event = self.get_object()
        seats = event.seats.all()

        ticket_type_id = request.query_params.get('ticket_type_id')
        if ticket_type_id:
            seats = seats.filter(ticket_type_id=ticket_type_id)

        section = request.query_params.get('section')
        if section:
            seats = seats.filter(section=section)

        seat_status = request.query_params.get('status')
        if seat_status:
            seats = seats.filter(status=seat_status)

        # Group by section
        sections = {}
        for seat in seats.select_related('ticket_type'):
            sec = seat.section
            if sec not in sections:
                sections[sec] = []
            sections[sec].append(SeatSerializer(seat).data)

        return Response({
            'event_id': event.id,
            'sections': [
                {'name': name, 'seats': seat_list}
                for name, seat_list in sections.items()
            ]
        })

    @action(detail=True, methods=['get', 'post'])
    def reviews(self, request, pk=None):
        """Get or create event reviews."""
        event = self.get_object()

        if request.method == 'GET':
            reviews = event.event_reviews.all().order_by('-created_at')
            serializer = EventReviewSerializer(reviews, many=True)
            return Response({'count': reviews.count(), 'results': serializer.data})

        if not request.user.is_authenticated:
            return Response({'error': 'Authentication required.'}, status=401)

        serializer = EventReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user, event=event)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class BookingViewSet(viewsets.ModelViewSet):
    """Manage event bookings."""
    permission_classes = [IsAuthenticated]
    serializer_class = BookingSerializer

    def get_queryset(self):
        qs = Booking.objects.filter(user=self.request.user).select_related(
            'event', 'payment'
        ).prefetch_related('booked_seats__seat')

        booking_status = self.request.query_params.get('status')
        if booking_status:
            qs = qs.filter(status=booking_status)
        return qs

    def create(self, request, *args, **kwargs):
        """Create a booking with tickets."""
        serializer = CreateBookingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Get event
        try:
            event = Event.objects.get(id=data['event_id'], is_published=True, is_cancelled=False)
        except Event.DoesNotExist:
            return Response({'error': 'Event not found.'}, status=404)

        # Create booking
        booking = Booking.objects.create(
            user=request.user,
            event=event,
        )

        total_tickets = 0
        subtotal = 0

        for ticket_data in data['tickets']:
            try:
                ticket_type = TicketType.objects.get(
                    id=ticket_data['ticket_type_id'], event=event
                )
            except TicketType.DoesNotExist:
                booking.delete()
                return Response({'error': f"Ticket type {ticket_data['ticket_type_id']} not found."}, status=404)

            quantity = ticket_data['quantity']

            if ticket_type.quantity_available < quantity:
                booking.delete()
                return Response({
                    'error': f"Only {ticket_type.quantity_available} '{ticket_type.name}' tickets available."
                }, status=400)

            # Allocate seats if specified
            seat_ids = ticket_data.get('seats', [])
            if seat_ids:
                seats = Seat.objects.filter(
                    id__in=seat_ids, event=event,
                    ticket_type=ticket_type, status='available'
                )
                if seats.count() != len(seat_ids):
                    booking.delete()
                    return Response({'error': 'Some seats are not available.'}, status=400)

                for seat in seats:
                    BookingSeat.objects.create(booking=booking, seat=seat)
                    seat.status = 'booked'
                    seat.save()
            else:
                # Auto-allocate seats
                available_seats = Seat.objects.filter(
                    event=event, ticket_type=ticket_type, status='available'
                )[:quantity]

                for seat in available_seats:
                    BookingSeat.objects.create(booking=booking, seat=seat)
                    seat.status = 'booked'
                    seat.save()

            # Update availability
            ticket_type.quantity_available -= quantity
            ticket_type.save()

            total_tickets += quantity
            subtotal += ticket_type.price * quantity

        # Calculate totals
        tax = subtotal * 0.18  # 18% GST
        total = subtotal + tax

        booking.total_tickets = total_tickets
        booking.subtotal = subtotal
        booking.tax = tax
        booking.total = total

        # Simulate payment
        payment = Payment.objects.create(
            user=request.user,
            amount=total,
            method=data.get('payment_method', 'credit_card'),
            content_type='booking',
            object_id=booking.id,
        )
        payment.simulate_payment()

        booking.payment = payment
        booking.status = 'confirmed'
        booking.confirmation_sent = timezone.now()
        booking.save()

        # Update event available seats
        event.available_seats -= total_tickets
        event.save(update_fields=['available_seats'])

        # Update analytics
        analytics, _ = EventAnalytics.objects.get_or_create(event=event)
        analytics.bookings_count += 1
        analytics.revenue += total
        analytics.save()

        return Response(BookingSerializer(booking).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'])
    def cancel(self, request, pk=None):
        """Cancel a booking."""
        booking = self.get_object()
        if booking.status in ('pending', 'confirmed'):
            # Release seats
            for booked_seat in booking.booked_seats.all():
                booked_seat.seat.status = 'available'
                booked_seat.seat.save()

            # Restore ticket availability
            booking.event.available_seats += booking.total_tickets
            booking.event.save(update_fields=['available_seats'])

            # Refund payment
            if booking.payment:
                booking.payment.status = 'refunded'
                booking.payment.save()

            booking.status = 'cancelled'
            booking.save()

            return Response({
                'booking': BookingSerializer(booking).data,
                'message': 'Booking cancelled. Refund will be processed.',
                'refund_amount': float(booking.total),
            })

        return Response(
            {'error': 'Booking cannot be cancelled at this stage.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    @action(detail=True, methods=['post'])
    def review(self, request, pk=None):
        """Add a review for the booked event."""
        booking = self.get_object()
        serializer = EventReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(
            user=request.user,
            event=booking.event,
            booking=booking
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)
