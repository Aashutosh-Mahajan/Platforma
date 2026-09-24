from rest_framework import viewsets, status, serializers, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from rest_framework.exceptions import NotFound, ValidationError
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.exceptions import PermissionDenied
from django.utils import timezone
from django.db import transaction, models
from datetime import timedelta
from decimal import Decimal

from eventra.models import (
    Event, TicketType, Seat, SeatHold, Booking, BookingSeat, Ticket,
    TicketScanAttempt, EventReview, EventAnalytics
)
from eventra.serializers import (
    EventListSerializer, EventDetailSerializer, SeatSerializer,
    BookingSerializer, CreateBookingSerializer, EventReviewSerializer,
    EventAnalyticsSerializer, TicketTypeSerializer, EventReviewCreateSerializer,
    SeatHoldSerializer, SeatHoldCreateSerializer, TicketSerializer
)
from core.models import Payment, Notification
from utils.pagination import StandardPagination
from utils.permissions import ensure_verified

SEAT_HOLD_WINDOW_MINUTES = 10


class EventViewSet(viewsets.ModelViewSet):
    """List, retrieve, and manage events."""
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['name', 'venue_name', 'category', 'event_type']
    ordering_fields = ['event_date', 'rating', '-event_date']
    ordering = ['-event_date']
    filterset_fields = ['category', 'event_type']
    pagination_class = StandardPagination

    def _can_manage_events(self, user):
        return user.is_staff or user.role in ('event_organizer', 'admin')

    def _wants_organizer_scope(self):
        organizer_only = self.request.query_params.get('organizer_only')
        if organizer_only is None:
            return False
        return organizer_only.strip().lower() in {'1', 'true', 'yes', 'on'}

    def get_permissions(self):
        # Public browsing endpoints for frontend discovery flows.
        if self.action in {'list', 'retrieve', 'seats'}:
            return [AllowAny()]

        if self.action == 'reviews' and self.request.method == 'GET':
            return [AllowAny()]

        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user

        # Organizers can opt into organizer-scoped browsing for dashboards.
        if user.is_authenticated and self._can_manage_events(user):
            if user.is_staff or user.role == 'admin':
                organizer_qs = Event.objects.all()
            else:
                organizer_qs = Event.objects.filter(organizer=user)

            # Mutating actions must always stay organizer-scoped.
            if self.action in ['update', 'partial_update', 'destroy', 'toggle_published', 'cancel_event']:
                return organizer_qs

            # Dashboards can request organizer-only data, including drafts.
            if self.action in ['list', 'retrieve', 'seats'] and self._wants_organizer_scope():
                return organizer_qs

        # Public browsing requires both the organizer's own publish toggle
        # AND admin approval (FR-A4) — one without the other stays hidden.
        qs = Event.objects.filter(is_published=True, is_approved=True, is_cancelled=False)

        # Date filtering. The public discover list (FR-E1: "browse events")
        # defaults to upcoming-only — without this, every past event ever
        # published stays visible forever with no way to tell it's already
        # happened, since nothing else in the UI filters this. Direct
        # detail lookups (`retrieve`) are exempt so a customer can still
        # open a past event they attended/booked via a direct link.
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        include_past = self.request.query_params.get('include_past', '').lower() in ('1', 'true', 'yes')
        if date_from:
            qs = qs.filter(event_date__gte=date_from)
        elif self.action == 'list' and not include_past:
            qs = qs.filter(event_date__gte=timezone.now())
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

        # Active (non-expired) holds, keyed by seat id, so the map reflects
        # FR-E4 live without needing a background expiry job to have run.
        now = timezone.now()
        active_hold_seat_ids = set(
            SeatHold.objects.filter(seat__in=seats, expires_at__gt=now)
            .values_list('seat_id', flat=True)
        )

        # Group by section
        sections = {}
        for seat in seats.select_related('ticket_type'):
            sec = seat.section
            if sec not in sections:
                sections[sec] = []
            seat_data = SeatSerializer(seat).data
            if seat.status == 'available' and seat.id in active_hold_seat_ids:
                seat_data['status'] = 'held'
            sections[sec].append(seat_data)

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
        acting_as_admin = event.organizer != request.user
        if acting_as_admin and not request.user.is_staff and request.user.role != 'admin':
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        event.is_published = not event.is_published
        event.save()

        if acting_as_admin:
            from core.models import AuditLog
            AuditLog.record(
                actor=request.user,
                action='event.publish' if event.is_published else 'event.unpublish',
                target_type='event', target_id=event.id, event_name=event.name,
            )
        return Response(EventDetailSerializer(event).data)

    @action(detail=True, methods=['patch'])
    def cancel_event(self, request, pk=None):
        """Cancel an event."""
        event = self.get_object()
        acting_as_admin = event.organizer != request.user
        if acting_as_admin and not request.user.is_staff and request.user.role != 'admin':
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        event.is_cancelled = True
        event.save()

        if acting_as_admin:
            from core.models import AuditLog
            AuditLog.record(
                actor=request.user, action='event.cancel',
                target_type='event', target_id=event.id, event_name=event.name,
            )
        
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
            serializer.save(event=event, quantity_available=serializer.validated_data['quantity_total'])
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
        ).prefetch_related('booked_seats__seat', 'status_history')

        booking_status = self.request.query_params.get('status')
        if booking_status:
            qs = qs.filter(status=booking_status)
        return qs

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Create a booking with tickets.

        Runs inside a single atomic block; every failure path below raises
        a DRF exception instead of manually deleting rows and returning a
        Response, so a mid-loop failure rolls back everything that already
        happened in this request (earlier ticket types included) rather
        than leaving orphaned 'reserved' seats or short inventory counts.
        """
        if request.user.role != 'customer':
            return Response(
                {'error': 'Only customers can create bookings.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        ensure_verified(request.user)

        serializer = CreateBookingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            event = Event.objects.get(
                id=data['event_id'], is_published=True, is_approved=True, is_cancelled=False
            )
        except Event.DoesNotExist:
            raise NotFound('Event not found.')

        if event.available_seats <= 0:
            raise ValidationError('Event is sold out.')

        booking = Booking.objects.create(user=request.user, event=event)

        total_tickets = 0
        subtotal = Decimal('0.00')
        now = timezone.now()

        for ticket_data in data['tickets']:
            # Lock the ticket-type row for the rest of this transaction so a
            # concurrent booking can't read the same quantity_available.
            try:
                ticket_type = TicketType.objects.select_for_update().get(
                    id=ticket_data['ticket_type_id'], event=event
                )
            except TicketType.DoesNotExist:
                raise NotFound(f"Ticket type {ticket_data['ticket_type_id']} not found.")

            quantity = ticket_data['quantity']

            if ticket_type.quantity_available < quantity:
                raise ValidationError(
                    f"Only {ticket_type.quantity_available} '{ticket_type.name}' tickets available."
                )

            seat_ids = ticket_data.get('seats', [])
            if seat_ids:
                # Lock the specific seats so two concurrent requests can't
                # both pass the availability check for the same seat.
                seats = list(
                    Seat.objects.select_for_update()
                    .filter(id__in=seat_ids, event=event, ticket_type=ticket_type, status='available')
                )
                if len(seats) != len(seat_ids):
                    raise ValidationError('Some seats are not available.')

                # A seat actively held by a different customer is not
                # bookable by this request; a hold owned by this customer
                # (from POST /seats/hold) is honoured and consumed.
                held = {
                    h.seat_id: h.customer_id
                    for h in SeatHold.objects.select_for_update().filter(
                        seat_id__in=seat_ids, expires_at__gt=now
                    )
                }
                for seat in seats:
                    holder = held.get(seat.id)
                    if holder is not None and holder != request.user.id:
                        raise ValidationError(f"Seat {seat} is currently held by another customer.")

                SeatHold.objects.filter(seat_id__in=seat_ids, customer=request.user).delete()

                for seat in seats:
                    BookingSeat.objects.create(booking=booking, seat=seat)
                    seat.status = 'reserved'
                    seat.save(update_fields=['status'])
            else:
                # Auto-allocate seats, excluding any currently held by someone else.
                unavailable_held = set(
                    SeatHold.objects.filter(
                        seat__event=event, seat__ticket_type=ticket_type, expires_at__gt=now
                    ).exclude(customer=request.user).values_list('seat_id', flat=True)
                )
                candidate_seats = list(
                    Seat.objects.select_for_update()
                    .filter(event=event, ticket_type=ticket_type, status='available')
                    .exclude(id__in=unavailable_held)[:quantity]
                )
                if len(candidate_seats) < quantity:
                    raise ValidationError(
                        f"Only {len(candidate_seats)} '{ticket_type.name}' seats available."
                    )

                for seat in candidate_seats:
                    BookingSeat.objects.create(booking=booking, seat=seat)
                    seat.status = 'reserved'
                    seat.save(update_fields=['status'])

            ticket_type.quantity_available -= quantity
            ticket_type.save(update_fields=['quantity_available'])

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

        if payment.status != 'completed':
            # Seat holds/reservations for this request roll back automatically
            # when this ValidationError propagates out of the atomic block.
            raise ValidationError('Payment processing failed. Booking not created.')

        booking.payment = payment
        booking.status = 'confirmed'
        booking.confirmation_sent = timezone.now()
        booking.save()

        # Mark seats as booked and issue one QR ticket per seat (FR-E5).
        for booked_seat in booking.booked_seats.select_related('seat'):
            booked_seat.seat.status = 'booked'
            booked_seat.seat.save(update_fields=['status'])
            Ticket.objects.create(booking=booking, seat=booked_seat.seat)

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
    @transaction.atomic
    def cancel(self, request, pk=None):
        """Cancel a booking.

        Per-tier refund policy (PRD §5.3 Zone.is_refundable/refund_cutoff_hours):
        a booking spanning multiple ticket types is refused if any of them is
        non-refundable, or if the current time is inside the widest cutoff
        window among its ticket types.
        """
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

        ticket_type_ids = booking.booked_seats.values_list('seat__ticket_type_id', flat=True).distinct()
        ticket_types = TicketType.objects.filter(id__in=ticket_type_ids)

        if ticket_types.filter(is_refundable=False).exists():
            return Response(
                {'error': 'This booking includes a non-refundable ticket type and cannot be cancelled.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        cutoff_hours = ticket_types.aggregate(models.Max('refund_cutoff_hours'))['refund_cutoff_hours__max'] or 24
        hours_until_event = (booking.event.event_date - timezone.now()).total_seconds() / 3600
        if hours_until_event < cutoff_hours:
            return Response(
                {'error': f'Bookings can only be cancelled at least {cutoff_hours} hours before the event.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Release seats and any tickets issued for them.
        for booked_seat in booking.booked_seats.select_related('seat'):
            booked_seat.seat.status = 'available'
            booked_seat.seat.save(update_fields=['status'])
        Ticket.objects.filter(booking=booking).delete()

        # Restore ticket-type availability
        for booked_seat in booking.booked_seats.select_related('seat__ticket_type'):
            tt = booked_seat.seat.ticket_type
            TicketType.objects.filter(pk=tt.pk).update(
                quantity_available=models.F('quantity_available') + 1
            )

        # Restore event availability
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


class SeatHoldCreateView(APIView):
    """POST /seats/hold — hold one or more seats for a bounded checkout window (FR-E4)."""
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        serializer = SeatHoldCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        seat_ids = serializer.validated_data['seat_ids']

        now = timezone.now()
        seats = list(Seat.objects.select_for_update().filter(id__in=seat_ids))
        if len(seats) != len(seat_ids):
            raise NotFound('One or more seats not found.')

        conflicting = SeatHold.objects.select_for_update().filter(
            seat_id__in=seat_ids, expires_at__gt=now
        ).exclude(customer=request.user)
        if conflicting.exists():
            raise ValidationError('One or more seats are already held by another customer.')

        unavailable = [s for s in seats if s.status != 'available']
        if unavailable:
            raise ValidationError('One or more seats are not available.')

        # Replace any of this customer's existing holds on these seats so
        # re-holding refreshes the expiry rather than stacking rows.
        SeatHold.objects.filter(seat_id__in=seat_ids, customer=request.user).delete()

        expires_at = now + timedelta(minutes=SEAT_HOLD_WINDOW_MINUTES)
        holds = SeatHold.objects.bulk_create([
            SeatHold(seat=seat, customer=request.user, expires_at=expires_at)
            for seat in seats
        ])
        return Response(SeatHoldSerializer(holds, many=True).data, status=status.HTTP_201_CREATED)


class SeatHoldDeleteView(APIView):
    """DELETE /seats/hold/{id} — release a hold before it expires."""
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            hold = SeatHold.objects.get(pk=pk, customer=request.user)
        except SeatHold.DoesNotExist:
            raise NotFound('Hold not found.')
        hold.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class TicketVerifyView(APIView):
    """POST /tickets/{token}/verify — verify a ticket exactly once (FR-E6).

    Every attempt is logged, accepted or not, so a rejected re-scan is
    still auditable against the original, authoritative scan.
    """
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, token):
        gate = request.data.get('gate', '')
        try:
            ticket = Ticket.objects.select_for_update().get(qr_token=token)
        except Ticket.DoesNotExist:
            raise NotFound('Ticket not found.')

        if not (request.user.is_staff or request.user.role in ('event_organizer', 'admin')):
            raise PermissionDenied('Only organizers or admins can verify tickets.')

        if ticket.is_scanned:
            TicketScanAttempt.objects.create(ticket=ticket, was_accepted=False, gate=gate)
            return Response(
                {
                    'valid': False,
                    'error': 'Ticket already scanned.',
                    'original_scanned_at': ticket.scanned_at,
                    'original_scanned_gate': ticket.scanned_gate,
                },
                status=status.HTTP_409_CONFLICT,
            )

        ticket.is_scanned = True
        ticket.scanned_at = timezone.now()
        ticket.scanned_gate = gate
        ticket.save(update_fields=['is_scanned', 'scanned_at', 'scanned_gate'])
        TicketScanAttempt.objects.create(ticket=ticket, was_accepted=True, gate=gate)

        return Response({'valid': True, 'ticket': TicketSerializer(ticket).data})


class EventTypesView(APIView):
    """GET /api/v1/eventra/event-types - every kind of event, grouped by category."""
    permission_classes = [AllowAny]

    def get(self, request):
        from eventra.event_types import as_api_payload
        return Response(as_api_payload())
