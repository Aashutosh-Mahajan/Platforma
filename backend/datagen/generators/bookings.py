"""Booking + ticket-sale generation: bimodal lead time, controlled no-show
rate, and the planted genre->cuisine cross-domain pattern (PRD §10).
"""
import datetime
import random
import uuid
from decimal import Decimal, ROUND_HALF_UP

from django.utils import timezone

from core.models import Payment
from eventra.models import Booking, BookingSeat, Seat, Ticket, TicketType
from zesty.models import Order, OrderItem, Restaurant
from .common import bulk_create_with_timestamps
from datagen.planted import (
    PLANTED_CROSS_DOMAIN_GENRE, PLANTED_CROSS_DOMAIN_CUISINE,
    PLANTED_CROSS_DOMAIN_WINDOW_HOURS, PLANTED_CROSS_DOMAIN_LIFT_BOOST,
    cancellation_probability,
)


def _q2(value):
    return Decimal(value).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def _bimodal_lead_days(np_rng):
    """Bimodal: an early-announcement burst (30-90 days out) and a
    near-date burst (0-5 days out) — PRD §10.
    """
    if np_rng.random() < 0.45:
        return float(np_rng.uniform(30, 90))
    return float(np_rng.uniform(0, 5))


def generate_bookings(n_bookings, events, customers, np_rng, run_tag):
    """Bulk-create bookings, booking-seats, tickets, and their payments.

    Also plants the cross-domain pattern: a customer who books a
    `PLANTED_CROSS_DOMAIN_GENRE` event has an elevated chance of placing a
    food order at a `PLANTED_CROSS_DOMAIN_CUISINE` restaurant within
    `PLANTED_CROSS_DOMAIN_WINDOW_HOURS` of the event.
    """
    cuisine_restaurants = list(
        Restaurant.objects.filter(cuisine_types=PLANTED_CROSS_DOMAIN_CUISINE, is_active=True)
    )

    # Pre-fetch everything needed into memory ONCE — with up to 20k
    # bookings, per-iteration queries against a remote DB would mean tens
    # of thousands of extra round-trips. Seats are consumed in-memory
    # (popped from each event/ticket-type pool) and only written back in
    # the periodic bulk flush below.
    ticket_types_by_event = {}
    for tt in TicketType.objects.filter(event__in=events):
        ticket_types_by_event.setdefault(tt.event_id, []).append(tt)
    seat_pool = {}  # (event_id, ticket_type_id) -> list[Seat], consumed via pop()
    for seat in Seat.objects.filter(event__in=events, status='available'):
        seat_pool.setdefault((seat.event_id, seat.ticket_type_id), []).append(seat)

    batch_bookings, batch_seats, batch_payments = [], [], []
    batch_orders, batch_order_items = [], []
    BATCH = 1000
    created = 0
    consumed_by_tt = {}  # ticket_type_id -> count of seats sold on confirmed bookings

    for _ in range(n_bookings):
        event = random.choice(events)
        candidate_tts = [tt for tt in ticket_types_by_event.get(event.id, [])
                          if seat_pool.get((event.id, tt.id))]
        if not candidate_tts:
            continue
        tt = random.choice(candidate_tts)
        pool = seat_pool[(event.id, tt.id)]

        n_seats = min(len(pool), random.choice([1, 1, 2, 2, 3]))
        if n_seats == 0:
            continue
        seats = [pool.pop() for _ in range(n_seats)]
        customer = random.choice(customers)

        lead_days = _bimodal_lead_days(np_rng)
        booked_at = event.event_date - datetime.timedelta(days=lead_days)

        payment_method = random.choice(['upi', 'credit_card', 'debit_card', 'wallet', 'cash_on_delivery'])
        cancel_prob = cancellation_probability(lead_days, payment_method)
        is_cancelled = np_rng.random() < cancel_prob
        # No-show only applies to bookings that weren't cancelled and whose
        # event has already happened relative to generation time.
        is_no_show = (not is_cancelled) and np_rng.random() < 0.08

        subtotal = _q2(Decimal(str(tt.price)) * n_seats)
        tax = _q2(subtotal * Decimal('0.18'))
        total = subtotal + tax

        booking = Booking(
            user=customer, event=event,
            booking_reference=f"EB-{uuid.uuid4().hex[:8].upper()}",
            status='cancelled' if is_cancelled else 'confirmed',
            total_tickets=n_seats, subtotal=subtotal, tax=tax, total=total,
            confirmation_sent=None if is_cancelled else booked_at,
        )
        booking.booking_date = booked_at
        batch_bookings.append(booking)
        batch_seats.append((booking, seats, tt))
        if not is_cancelled:
            consumed_by_tt[tt.id] = consumed_by_tt.get(tt.id, 0) + n_seats

        payment = Payment(
            user=customer, amount=total, method=payment_method,
            status='refunded' if is_cancelled else 'completed',
            transaction_id=f"SIM-{uuid.uuid4().hex[:12].upper()}",
            content_type='booking',
        )
        payment.created_at = booked_at
        batch_payments.append((payment, booking))

        # ---- Plant the cross-domain genre -> cuisine pattern ----
        if (
            not is_cancelled and event.category == PLANTED_CROSS_DOMAIN_GENRE
            and cuisine_restaurants
            and np_rng.random() < PLANTED_CROSS_DOMAIN_LIFT_BOOST
        ):
            restaurant = random.choice(cuisine_restaurants)
            menu = list(restaurant.menu_items.filter(is_available=True)[:5])
            if menu:
                order_dt = event.event_date - datetime.timedelta(
                    hours=float(np_rng.uniform(0, PLANTED_CROSS_DOMAIN_WINDOW_HOURS))
                )
                order_id = uuid.uuid4()
                item = random.choice(menu)
                qty = random.randint(1, 2)
                o_total = _q2(item.price * qty)
                order_subtotal = o_total
                order_tax = _q2(order_subtotal * Decimal('0.05'))
                order = Order(
                    id=order_id, user=customer, restaurant=restaurant, status='delivered',
                    delivery_address={'street': 'Synthetic cross-domain order', 'is_synthetic': True},
                    subtotal=order_subtotal, delivery_fee=restaurant.delivery_fee, tax=order_tax,
                    total=order_subtotal + restaurant.delivery_fee + order_tax,
                    payment_method='upi', payment_status='paid',
                )
                order.created_at = order_dt
                order.updated_at = order_dt
                batch_orders.append(order)
                batch_order_items.append(OrderItem(
                    order_id=order_id, menu_item=item, quantity=qty,
                    unit_price=item.price, total=o_total,
                ))

        if len(batch_bookings) >= BATCH:
            created += _flush(batch_bookings, batch_seats, batch_payments, batch_orders, batch_order_items)
            batch_bookings, batch_seats, batch_payments = [], [], []
            batch_orders, batch_order_items = [], []

    if batch_bookings:
        created += _flush(batch_bookings, batch_seats, batch_payments, batch_orders, batch_order_items)

    # Reconcile inventory counters against what was actually sold.
    tts_to_update = []
    for tt in TicketType.objects.filter(id__in=consumed_by_tt.keys()):
        tt.quantity_available = max(0, tt.quantity_total - consumed_by_tt[tt.id])
        tts_to_update.append(tt)
    TicketType.objects.bulk_update(tts_to_update, ['quantity_available'], batch_size=1000)

    seats_sold_by_event = {}
    for tt in tts_to_update:
        seats_sold_by_event[tt.event_id] = seats_sold_by_event.get(tt.event_id, 0) + consumed_by_tt[tt.id]
    events_to_update = []
    for event in events:
        sold = seats_sold_by_event.get(event.id, 0)
        if sold:
            event.available_seats = max(0, event.total_seats - sold)
            events_to_update.append(event)
    from eventra.models import Event
    Event.objects.bulk_update(events_to_update, ['available_seats'], batch_size=1000)

    return created


def _flush(batch_bookings, batch_seats, batch_payments, batch_orders, batch_order_items):
    bulk_create_with_timestamps(
        Booking, batch_bookings, ['booking_date'],
        create_batch_size=len(batch_bookings), update_batch_size=len(batch_bookings),
    )

    booking_seat_rows = []
    seat_ids_to_mark = []
    for booking, seats, tt in batch_seats:
        for seat in seats:
            booking_seat_rows.append(BookingSeat(booking=booking, seat=seat))
            seat_ids_to_mark.append(seat.id)
    BookingSeat.objects.bulk_create(booking_seat_rows, batch_size=2000)

    cancelled_booking_ids = {b.id for b in batch_bookings if b.status == 'cancelled'}
    confirmed_seat_ids = [
        seat.id for booking, seats, tt in batch_seats
        for seat in seats if booking.id not in cancelled_booking_ids
    ]
    if confirmed_seat_ids:
        Seat.objects.filter(id__in=confirmed_seat_ids).update(status='booked')

    tickets = []
    booking_date_by_id = {b.id: b.booking_date for b in batch_bookings}
    for booking, seats, tt in batch_seats:
        if booking.id in cancelled_booking_ids:
            continue
        for seat in seats:
            ticket = Ticket(booking=booking, seat=seat, qr_token=uuid.uuid4().hex)
            ticket.created_at = booking_date_by_id[booking.id]
            tickets.append(ticket)
    bulk_create_with_timestamps(Ticket, tickets, ['created_at'], create_batch_size=2000, update_batch_size=2000)

    payments = [p for p, booking in batch_payments]
    bulk_create_with_timestamps(
        Payment, payments, ['created_at'],
        create_batch_size=len(payments) or 1, update_batch_size=len(payments) or 1,
    )
    # object_id needs the now-known booking pk — set post-insert.
    for payment, booking in batch_payments:
        payment.object_id = booking.id
    Payment.objects.bulk_update(payments, ['object_id'], batch_size=len(payments) or 1)

    bookings_to_link = []
    for payment, booking in batch_payments:
        if payment.status == 'completed':
            booking.payment_id = payment.id
            bookings_to_link.append(booking)
    if bookings_to_link:
        Booking.objects.bulk_update(bookings_to_link, ['payment_id'], batch_size=len(bookings_to_link))

    if batch_orders:
        bulk_create_with_timestamps(
            Order, batch_orders, ['created_at', 'updated_at'],
            create_batch_size=len(batch_orders), update_batch_size=len(batch_orders),
        )
        OrderItem.objects.bulk_create(batch_order_items, batch_size=len(batch_order_items) or 1)

    return len(batch_bookings)
