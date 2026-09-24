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
"""
import datetime

from core.models import User, Payment
from zesty.models import Restaurant, MenuItem, Order, OrderItem
from eventra.models import Event, Venue, TicketType, Booking, Ticket

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


def extract_bookings(high_water_mark=None):
    qs = Booking.objects.select_related('user', 'event', 'event__venue').all()
    since = _since(high_water_mark)
    if since is not None:
        qs = qs.filter(booking_date__gt=since)
    return _fetch_all(qs.order_by('booking_date'))


def extract_tickets(high_water_mark=None):
    # 'booking__event' and 'booking__event__venue' must be included — the
    # load stage reads booking.event.venue_id for every row, and without
    # these in the select_related chain that's a fresh query per ticket
    # (an N+1 that made a 12k-row load take 10+ minutes instead of seconds).
    #
    # Filtered via the booking's own window through the FK join rather than
    # an `id__in=<...>` clause — see extract_order_items for why.
    qs = Ticket.objects.select_related(
        'booking', 'booking__event', 'booking__event__venue', 'seat', 'seat__ticket_type'
    ).all()
    since = _since(high_water_mark)
    if since is not None:
        qs = qs.filter(booking__booking_date__gt=since)
    return _fetch_all(qs)


def extract_payment_methods():
    """Distinct payment methods actually in use, for dim_payment.

    `.order_by()` clears Payment's default `ordering = ['-created_at']`
    Meta option — left in place, Django pulls created_at into the query
    to satisfy DISTINCT+ORDER BY, which makes distinct() silently return
    one row per Payment instead of one row per unique method.
    """
    return list(Payment.objects.order_by().values_list('method', flat=True).distinct())
