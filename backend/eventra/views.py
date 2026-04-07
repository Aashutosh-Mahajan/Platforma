from rest_framework import viewsets, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.exceptions import PermissionDenied
from django.utils import timezone
from django.db import transaction
from datetime import timedelta
from decimal import Decimal

from eventra.models import (
    Event, TicketType, Seat, Booking, BookingSeat, EventReview, EventAnalytics
)
from eventra.serializers import (
    EventListSerializer, EventDetailSerializer, SeatSerializer,
    BookingSerializer, CreateBookingSerializer, EventReviewSerializer,
    EventAnalyticsSerializer, TicketTypeSerializer, EventReviewCreateSerializer
)
from core.models import Payment, Notification
from utils.pagination import StandardPagination


class EventViewSet(viewsets.ModelViewSet):
    """List, retrieve, and manage events."""
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['name', 'venue_name', 'category']
    ordering_fields = ['event_date', 'rating', '-event_date']
    ordering = ['-event_date']
    filterset_fields = ['category']
    pagination_class = StandardPagination

    def _can_manage_events(self, user):
        return user.is_staff or user.role in ('event_organizer', 'admin')

    def get_permissions(self):
        # Public browsing endpoints for frontend discovery flows.
        if self.action in {'list', 'retrieve', 'seats'}:
            return [AllowAny()]

        if self.action == 'reviews' and self.request.method == 'GET':
            return [AllowAny()]

        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user

        # Organizers should see their own events for dashboards and management.
        if user.is_authenticated and self._can_manage_events(user):
            if user.is_staff or user.role == 'admin':
                organizer_qs = Event.objects.all()
            else:
                organizer_qs = Event.objects.filter(organizer=user)

            if self.action in ['list', 'retrieve', 'seats', 'update', 'partial_update', 'destroy', 'toggle_published', 'cancel_event']:
                return organizer_qs

        # Public browsing sees only published and active events.
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

    def perform_create(self, serializer):
        if not self._can_manage_events(self.request.user):
            raise PermissionDenied('Only event organizers can create events.')

        raw_publish_value = self.request.data.get('is_published', True)
        if isinstance(raw_publish_value, str):
            is_published = raw_publish_value.strip().lower() not in ('false', '0', 'no', 'off')
        else:
            is_published = bool(raw_publish_value)

        serializer.save(organizer=self.request.user, is_published=is_published)

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return EventDetailSerializer
        elif self.action == 'create_review':
            return EventReviewCreateSerializer
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

        # Validate user has a confirmed booking for this event
        confirmed_booking = Booking.objects.filter(
            user=request.user,
            event=event,
            status='confirmed'
        ).exists()

        if not confirmed_booking:
            return Response(
                {'error': 'You can only review events after booking confirmation.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if user already reviewed this event
        existing_review = EventReview.objects.filter(
            user=request.user,
            event=event
        ).exists()

        if existing_review:
            return Response(
                {'error': 'You have already reviewed this event.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = EventReviewCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Create review and update event rating
        review = serializer.save(user=request.user, event=event)
        
        return Response(EventReviewSerializer(review).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'])
    def toggle_published(self, request, pk=None):
        """Toggle event published status."""
        event = self.get_object()
        if event.organizer != request.user and not request.user.is_staff and request.user.role != 'admin':
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        
        event.is_published = not event.is_published
        event.save()
        return Response(EventDetailSerializer(event).data)

    @action(detail=True, methods=['patch'])
    def cancel_event(self, request, pk=None):
        """Cancel an event."""
        event = self.get_object()
        if event.organizer != request.user and not request.user.is_staff and request.user.role != 'admin':
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        
        event.is_cancelled = True
        event.save()
        
        # Notify all bookers
        bookings = Booking.objects.filter(event=event, status='confirmed')
        for booking in bookings:
            Notification.objects.create(
                user=booking.user,
                type='booking_confirmation',
                title='Event Cancelled',
                message=f'The event "{event.name}" has been cancelled. Refund will be processed.',
                related_id=event.id,
                related_type='event',
            )
        
        return Response(EventDetailSerializer(event).data)


class TicketTypeViewSet(viewsets.ModelViewSet):
    """CRUD for ticket types."""
    permission_classes = [IsAuthenticated]
    serializer_class = TicketTypeSerializer
    pagination_class = StandardPagination

    def _can_manage_ticket_types(self, user):
        return user.is_staff or user.role in ('event_organizer', 'admin')

    def get_queryset(self):
        user = self.request.user

        if user.is_staff or user.role == 'admin':
            return TicketType.objects.all()

        if user.role == 'event_organizer':
            return TicketType.objects.filter(event__organizer=user)

        return TicketType.objects.none()

    def perform_create(self, serializer):
        if not self._can_manage_ticket_types(self.request.user):
            raise PermissionDenied('Only event organizers can create ticket types.')

        # Ensure the event belongs to the user
        event_id = self.request.data.get('event')
        try:
            if self.request.user.is_staff or self.request.user.role == 'admin':
                event = Event.objects.get(id=event_id)
            else:
                event = Event.objects.get(id=event_id, organizer=self.request.user)
            serializer.save(event=event)
        except Event.DoesNotExist:
            raise serializers.ValidationError({'error': 'Event not found.'})


class SeatViewSet(viewsets.ModelViewSet):
    """CRUD for seats."""
    permission_classes = [IsAuthenticated]
    serializer_class = SeatSerializer
    pagination_class = StandardPagination

    def _can_manage_seats(self, user):
        return user.is_staff or user.role in ('event_organizer', 'admin')

    def get_queryset(self):
        user = self.request.user

        if user.is_staff or user.role == 'admin':
            return Seat.objects.all()

        if user.role == 'event_organizer':
            return Seat.objects.filter(event__organizer=user)

        return Seat.objects.none()

    def perform_create(self, serializer):
        if not self._can_manage_seats(self.request.user):
            raise PermissionDenied('Only event organizers can create seats.')

        # Ensure the event belongs to the user
        event_id = self.request.data.get('event')
        try:
            if self.request.user.is_staff or self.request.user.role == 'admin':
                event = Event.objects.get(id=event_id)
            else:
                event = Event.objects.get(id=event_id, organizer=self.request.user)
            serializer.save(event=event)
        except Event.DoesNotExist:
            raise serializers.ValidationError({'error': 'Event not found.'})

    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """Bulk create seats for an event."""
        if not self._can_manage_seats(request.user):
            return Response(
                {'error': 'Only event organizers can create seats.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        event_id = request.data.get('event_id')
        seats_data = request.data.get('seats', [])
        
        try:
            if request.user.is_staff or request.user.role == 'admin':
                event = Event.objects.get(id=event_id)
            else:
                event = Event.objects.get(id=event_id, organizer=request.user)
        except Event.DoesNotExist:
            return Response({'error': 'Event not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        created_seats = []
        for seat_data in seats_data:
            try:
                ticket_type = TicketType.objects.get(
                    id=seat_data['ticket_type_id'], event=event
                )
                seat = Seat.objects.create(
                    event=event,
                    section=seat_data['section'],
                    row=seat_data['row'],
                    seat_number=seat_data['seat_number'],
                    ticket_type=ticket_type,
                    status='available'
                )
                created_seats.append(seat)
            except (TicketType.DoesNotExist, KeyError) as e:
                return Response({'error': f'Invalid seat data: {str(e)}'}, status=400)
        
        # Update event total and available seats
        event.total_seats = event.seats.count()
        event.available_seats = event.seats.filter(status='available').count()
        event.save()
        
        return Response({
            'count': len(created_seats),
            'seats': SeatSerializer(created_seats, many=True).data
        }, status=status.HTTP_201_CREATED)


class BookingViewSet(viewsets.ModelViewSet):
    """Manage event bookings."""
    permission_classes = [IsAuthenticated]
    serializer_class = BookingSerializer
    pagination_class = StandardPagination

    def get_queryset(self):
        user = self.request.user

        if user.is_staff or user.role == 'admin':
            qs = Booking.objects.all()
        elif user.role == 'event_organizer':
            qs = Booking.objects.filter(event__organizer=user)
        else:
            qs = Booking.objects.filter(user=user)

        qs = qs.select_related(
            'event', 'payment'
        ).prefetch_related('booked_seats__seat')

        booking_status = self.request.query_params.get('status')
        if booking_status:
            qs = qs.filter(status=booking_status)
        return qs

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Create a booking with tickets."""
        if request.user.role != 'customer':
            return Response(
                {'error': 'Only customers can create bookings.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = CreateBookingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Get event
        try:
            event = Event.objects.get(id=data['event_id'], is_published=True, is_cancelled=False)
        except Event.DoesNotExist:
            return Response({'error': 'Event not found.'}, status=404)

        # Check if event is sold out
        if event.available_seats <= 0:
            return Response({'error': 'Event is sold out.'}, status=status.HTTP_400_BAD_REQUEST)

        # Create booking
        booking = Booking.objects.create(
            user=request.user,
            event=event,
        )

        total_tickets = 0
        subtotal = Decimal('0.00')

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
                    seat.status = 'reserved'
                    seat.save()
            else:
                # Auto-allocate seats
                available_seats = Seat.objects.filter(
                    event=event, ticket_type=ticket_type, status='available'
                )[:quantity]

                for seat in available_seats:
                    BookingSeat.objects.create(booking=booking, seat=seat)
                    seat.status = 'reserved'
                    seat.save()

            # Update availability
            ticket_type.quantity_available -= quantity
            ticket_type.save()

            total_tickets += quantity
            subtotal += ticket_type.price * quantity

        # Calculate totals
        tax = subtotal * Decimal('0.18')  # 18% GST
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

        # Check if payment was successful
        if payment.status != 'completed':
            # Rollback: delete booking and restore seats
            for booked_seat in booking.booked_seats.all():
                booked_seat.seat.status = 'available'
                booked_seat.seat.save()
            booking.delete()
            return Response(
                {'error': 'Payment processing failed. Booking not created.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        booking.payment = payment
        booking.status = 'confirmed'
        booking.confirmation_sent = timezone.now()
        booking.save()

        # Mark seats as booked
        for booked_seat in booking.booked_seats.all():
            booked_seat.seat.status = 'booked'
            booked_seat.seat.save()

        # Update event available seats
        event.available_seats -= total_tickets
        event.save(update_fields=['available_seats'])

        # Update analytics
        analytics, _ = EventAnalytics.objects.get_or_create(event=event)
        analytics.bookings_count += 1
        analytics.revenue += total
        analytics.save()

        # Create notification
        Notification.objects.create(
            user=request.user,
            type='booking_confirmation',
            title='Booking Confirmed',
            message=f'Your booking for {event.name} has been confirmed.',
            related_id=booking.id,
            related_type='booking',
        )

        if event.organizer_id != request.user.id:
            customer_name = request.user.get_full_name() or request.user.email
            Notification.objects.create(
                user=event.organizer,
                type='booking_confirmation',
                title='New Booking Received',
                message=f'New booking {booking.booking_reference} by {customer_name}.',
                related_id=booking.id,
                related_type='booking',
            )

        return Response(BookingSerializer(booking).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'])
    def cancel(self, request, pk=None):
        """Cancel a booking."""
        booking = self.get_object()

        if booking.user != request.user:
            return Response(
                {'error': 'Only the customer can cancel this booking.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        
        # Validate booking can be cancelled
        if booking.status not in ('pending', 'confirmed'):
            return Response(
                {'error': 'Booking cannot be cancelled at this stage.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate event is at least 24 hours in future
        hours_until_event = (booking.event.event_date - timezone.now()).total_seconds() / 3600
        if hours_until_event < 24:
            return Response(
                {'error': 'Bookings can only be cancelled at least 24 hours before the event.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
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

        # Create cancellation notification
        Notification.objects.create(
            user=request.user,
            type='booking_confirmation',
            title='Booking Cancelled',
            message=f'Your booking for {booking.event.name} has been cancelled. Refund will be processed.',
            related_id=booking.id,
            related_type='booking',
        )

        if booking.event.organizer_id != request.user.id:
            customer_name = request.user.get_full_name() or request.user.email
            Notification.objects.create(
                user=booking.event.organizer,
                type='booking_confirmation',
                title='Booking Cancelled by Customer',
                message=f'Booking {booking.booking_reference} was cancelled by {customer_name}.',
                related_id=booking.id,
                related_type='booking',
            )

        return Response({
            'booking': BookingSerializer(booking).data,
            'message': 'Booking cancelled. Refund will be processed.',
            'refund_amount': float(booking.total),
        })

    @action(detail=True, methods=['post'])
    def review(self, request, pk=None):
        """Add a review for the booked event."""
        booking = self.get_object()

        if booking.user != request.user:
            return Response(
                {'error': 'Only the customer can review this booking.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = EventReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(
            user=request.user,
            event=booking.event,
            booking=booking
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)
