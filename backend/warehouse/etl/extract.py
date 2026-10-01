"""Extract stage (PRD §8.2 stage 1).

Fact-source tables (Order, OrderItem, Booking, Ticket) are extracted
incrementally on their timestamp column, `> high_water_mark - overlap`.
Dimension-source "reference" tables (Restaurant, MenuItem, Event, Venue,
TicketType, User) are small enough to full-reload every run — the SCD
logic in load.py is what decides whether a re-extracted row actually
represents a change worth versioning, so a full reload here is cheap and
never produces duplicate dimension history.

OVERLAP guards against a fact landing exactly at the high-water-mark
boundary between two runs and being skipped by one of them; downstream
loads must stay idempotent within this window (enforced via each fact
table's unique natural-id column) so re-processing an overlapped row never
duplicates it.

Some changes don't move the timestamp a fact table is extracted on: a
booking cancelled weeks after it was made keeps its `booking_date`, and an
order's status history grows without a new order row. Those sources also
carry an *id* watermark (the highest status-history / search-log id seen),
so anything that changed since the last run is re-extracted regardless of
how old the underlying order or booking is.

Every query here runs against the operational ('default') database — the
router sends these models there, never to the warehouse.
"""
import datetime

from django.db.models import Count, Exists, OuterRef, Q
from django.utils import timezone

from core.models import User, Payment, SearchLog
from zesty.models import Restaurant, MenuItem, Order, OrderItem, OrderStatusHistory, Promotion, Payout
from eventra.models import (
    Event, Venue, TicketType, Booking, BookingStatusHistory, Ticket, Seat, SeatHold,
)

OVERLAP = datetime.timedelta(hours=1)
CHUNK_SIZE = 2000


def _since(high_water_mark):
    if high_water_mark is None:
        return None
    return high_water_mark - OVERLAP


def _fetch_all(qs):
    """list(queryset) buffers the entire result set through Django's
    normal fetch path in one round trip; against this DB, a ~50k-row
    select_related query measured as hanging indefinitely that way (a
    15k-row slice of the same query took ~9s, so it isn't raw data volume).
    .iterator() uses a server-side cursor and fetches in bounded pages —
    safe here because every caller uses select_related (a SQL JOIN), never
    prefetch_related (which .iterator() can't chunk).
    """
    return list(qs.iterator(chunk_size=CHUNK_SIZE))


def max_id(model):
    """Current highest id of a source table, taken before extracting so the
    next run's id watermark never skips a row inserted mid-run. An empty
    table is 0, not None: None means "no watermark yet", which would make
    the next run ignore changes in that table entirely.
    """
    return model.objects.order_by('-id').values_list('id', flat=True).first() or 0


def extract_restaurants():
    return list(Restaurant.objects.select_related('owner').all())


def extract_menu_items():
    return _fetch_all(MenuItem.objects.select_related('restaurant').all())


def extract_events():
    return list(Event.objects.select_related('organizer', 'venue').all())


def extract_venues():
    return list(Venue.objects.all())


def extract_ticket_types():
    return list(TicketType.objects.select_related('event').all())


def extract_promotions():
    return list(Promotion.objects.all())


def extract_customers(customer_ids=None):
    """dim_customer covers any user who has actually transacted — not just
    role='customer' accounts. PRD FR-A2 makes this one account across both
    domains, and nothing stops an event_organizer or restaurant_owner from
    also placing an order; excluding them here would silently drop real
    orders/bookings from the warehouse (their fact rows would be rejected
    for a missing dimension key even though the order itself is entirely
    legitimate).
    """
    qs = User.objects.all()
    if customer_ids is not None:
        qs = qs.filter(id__in=customer_ids)
    else:
        qs = qs.filter(role='customer')
    return list(qs)


def extract_orders(high_water_mark=None):
    qs = Order.objects.select_related('user', 'restaurant').all()
    since = _since(high_water_mark)
    if since is not None:
        qs = qs.filter(updated_at__gt=since)
    return _fetch_all(qs.order_by('updated_at'))


def extract_order_items(high_water_mark=None):
    # Filtered via the same window as extract_orders, through the FK join,
    # rather than an `id__in=<tens of thousands of UUIDs>` clause — a
    # single enormous IN clause measured as taking 15+ minutes against
    # Neon (vs. a few seconds for the join-filtered equivalent).
    qs = OrderItem.objects.select_related('menu_item', 'order').all()
    since = _since(high_water_mark)
    if since is not None:
        qs = qs.filter(order__updated_at__gt=since)
    return _fetch_all(qs)


def _booking_window(high_water_mark, history_high_water_id, prefix=''):
    """Bookings made since the last run, plus any older booking whose status
    changed since then (a status-history row newer than the id watermark).
    Expressed as a subquery so it never becomes a giant IN list.
    """
    since = _since(high_water_mark)
    if since is None:
        return None
    # No id watermark yet (first run after upgrading an existing warehouse)
    # means every status change is new, not that none are.
    changed = BookingStatusHistory.objects.filter(id__gt=history_high_water_id or 0).values('booking_id')
    return Q(**{f'{prefix}booking_date__gt': since}) | Q(**{f'{prefix}id__in': changed})


def _event_scans_in_use(event_ref):
    """True when at least one ticket for the event was scanned at the gate —
    only then does an unscanned ticket mean the holder didn't turn up.
    """
    return Exists(Ticket.objects.filter(booking__event_id=OuterRef(event_ref), is_scanned=True))


def _with_attendance(qs):
    # Scanned-ticket count drives is_no_show in the load stage.
    return qs.annotate(
        scanned_tickets=Count('tickets', filter=Q(tickets__is_scanned=True)),
        event_scans_in_use=_event_scans_in_use('event_id'),
    )


def extract_bookings(high_water_mark=None, history_high_water_id=None):
    qs = _with_attendance(
        Booking.objects.select_related('user', 'event', 'event__venue', 'payment')
    )
    window = _booking_window(high_water_mark, history_high_water_id)
    if window is not None:
        qs = qs.filter(window)
    return _fetch_all(qs.order_by('booking_date'))


def extract_tickets(high_water_mark=None, history_high_water_id=None):
    # 'booking__event' and 'booking__event__venue' must be included — the
    # load stage reads booking.event.venue_id for every row, and without
    # these in the select_related chain that's a fresh query per ticket
    # (an N+1 that made a 12k-row load take 10+ minutes instead of seconds).
    #
    # Filtered via the booking's own window through the FK join rather than
    # an `id__in=<...>` clause — see extract_order_items for why.
    qs = Ticket.objects.select_related(
        'booking', 'booking__event', 'booking__event__venue', 'booking__payment',
        'seat', 'seat__ticket_type',
    ).all()
    qs = qs.annotate(event_scans_in_use=_event_scans_in_use('booking__event_id'))
    window = _booking_window(high_water_mark, history_high_water_id, prefix='booking__')
    if window is not None:
        qs = qs.filter(window)
    return _fetch_all(qs)


def extract_order_status_history(high_water_mark=None, history_high_water_id=None):
    """Every status-history row for each order whose lifecycle may have
    changed since the last run: orders updated in the window, plus orders
    with a history row newer than the id watermark. The *full* history of
    those orders is returned, since stage durations need both ends.
    """
    qs = OrderStatusHistory.objects.select_related('order').order_by('order_id', 'changed_at', 'id')
    since = _since(high_water_mark)
    if since is not None:
        changed = OrderStatusHistory.objects.filter(id__gt=history_high_water_id or 0).values('order_id')
        qs = qs.filter(Q(order__updated_at__gt=since) | Q(order_id__in=changed))
    return _fetch_all(qs)


def extract_attendance_changes(since):
    """Bookings whose event has ended since `since` (or ever, on a first
    run): their no-show flag can only be decided once the event is over,
    which is usually long after the booking itself was extracted.
    Returns (booking rows with scanned_tickets, ticket rows).
    """
    now = timezone.now()
    event_filter = Q(event__event_date__lte=now)
    if since is not None:
        event_filter &= Q(event__event_date__gt=since - OVERLAP)
    bookings = list(
        _with_attendance(Booking.objects.filter(event_filter))
        .values('id', 'status', 'scanned_tickets', 'event_scans_in_use')
    )
    ticket_filter = Q(booking__event__event_date__lte=now)
    if since is not None:
        ticket_filter &= Q(booking__event__event_date__gt=since - OVERLAP)
    tickets = list(
        Ticket.objects.filter(ticket_filter)
        .annotate(event_scans_in_use=_event_scans_in_use('booking__event_id'))
        .values('id', 'is_scanned', 'booking__status', 'event_scans_in_use')
    )
    return bookings, tickets


def extract_search_logs(high_water_id=None):
    qs = SearchLog.objects.all()
    if high_water_id is not None:
        qs = qs.filter(id__gt=high_water_id)
    return _fetch_all(qs.order_by('id'))


def extract_payouts(high_water_mark=None):
    qs = Payout.objects.all()
    since = _since(high_water_mark)
    if since is not None:
        qs = qs.filter(updated_at__gt=since)
    return list(qs)


def extract_seat_inventory():
    """Per ticket tier of every upcoming event: capacity, seats sold, seats
    currently held. Aggregated in Postgres — one row per tier, not per seat.
    """
    now = timezone.now()
    tiers = list(
        TicketType.objects.filter(event__event_date__gte=now, event__is_cancelled=False)
        .select_related('event')
    )
    if not tiers:
        return []
    tier_ids = [t.id for t in tiers]
    sold = dict(
        Seat.objects.filter(ticket_type_id__in=tier_ids, status='booked')
        .values('ticket_type_id').annotate(n=Count('id')).values_list('ticket_type_id', 'n')
    )
    held = dict(
        SeatHold.objects.filter(seat__ticket_type_id__in=tier_ids, expires_at__gt=now)
        .values('seat__ticket_type_id').annotate(n=Count('id')).values_list('seat__ticket_type_id', 'n')
    )
    seat_total = dict(
        Seat.objects.filter(ticket_type_id__in=tier_ids)
        .values('ticket_type_id').annotate(n=Count('id')).values_list('ticket_type_id', 'n')
    )
    rows = []
    for t in tiers:
        capacity = seat_total.get(t.id) or t.quantity_total or 0
        n_sold = sold.get(t.id)
        if n_sold is None:  # tiers without a seat map track inventory on the tier itself
            n_sold = max(0, (t.quantity_total or 0) - (t.quantity_available or 0))
        n_held = held.get(t.id, 0)
        rows.append({
            'event_id': t.event_id, 'ticket_type_id': t.id, 'event_date': t.event.event_date,
            'capacity': capacity, 'sold': n_sold, 'held': n_held,
            'available': max(0, capacity - n_sold - n_held),
        })
    return rows


def extract_failed_order_payments():
    """{Payment.object_id: failed attempts} for order payments. Order
    payments reference their order through a 32-bit hash of its UUID
    (zesty.views / datagen payment_object_id), not a foreign key, so the
    load stage maps each order to this dict by the same hash.
    """
    return dict(
        Payment.objects.filter(content_type='order', status='failed').order_by()
        .values('object_id').annotate(n=Count('id')).values_list('object_id', 'n')
    )


def extract_booking_payment_methods():
    """{booking id: payment method} from booking payments, refunded ones
    included. Booking.payment only links a *completed* payment, so without
    this a cancelled (refunded) booking would look like it had no payment
    method at all, which turns "method unknown" into a perfect cancellation
    predictor.
    """
    rows = (
        Payment.objects.filter(content_type='booking', object_id__isnull=False)
        .order_by('object_id', 'created_at').values_list('object_id', 'method')
    )
    return dict(rows)  # later rows (the most recent payment) win


def extract_payment_methods():
    """Distinct payment methods actually in use, for dim_payment.

    `.order_by()` clears Payment's default `ordering = ['-created_at']`
    Meta option — left in place, Django pulls created_at into the query
    to satisfy DISTINCT+ORDER BY, which makes distinct() silently return
    one row per Payment instead of one row per unique method. Order-level
    methods (Order.payment_method) are merged in too, since COD orders
    never create a Payment row.
    """
    methods = set(Payment.objects.order_by().values_list('method', flat=True).distinct())
    methods |= set(Order.objects.order_by().values_list('payment_method', flat=True).distinct())
    return sorted(m for m in methods if m)
