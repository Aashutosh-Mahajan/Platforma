"""Load stage (PRD §8.2 stage 5): dimensions before facts, SCD applied,
surrogate keys assigned, facts appended idempotently within a delta window.

Idempotency: every fact table has a `unique=True` natural-id column
(order_id / order_item_id / booking_id / ticket_id). Loading uses
`update_or_create` keyed on that column, so re-running a failed or
overlapping window updates the existing fact row instead of duplicating it
— this is what makes a re-run of a failed load safe (PRD §8.2, M6 DoD).

Performance note: every loader here pre-fetches its "current" dimension
rows with ONE query per dimension and looks them up from an in-memory dict
rather than issuing a SELECT per incoming row — against a remote DB,
one-query-per-row across ~10k+ rows is the difference between seconds and
tens of minutes. date_key/time_key lookups go through a small in-memory
cache for the same reason (the universe of dates/times is tiny and gets
hit by every single fact row).
"""
import datetime
from decimal import Decimal

from django.utils import timezone

from warehouse.models import (
    DimCustomer, DimLocation, DimPayment, DimRestaurant, DimMenuItem,
    DimPromotion, DimEvent, DimVenue, DimTicketType, DimDate, DimTime,
    FactOrder, FactOrderItem, FactBooking, FactTicketSale,
)
from warehouse.etl.scd import apply_scd2, apply_scd1
from warehouse.etl import transform as tf
from warehouse.etl.audit import bulk_quarantine


class DateTimeKeyCache:
    """In-memory cache over DimDate/DimTime for the duration of one ETL
    run. Loaded once from the DB, topped up in-memory for any date/time
    combination created mid-run, and flushed to the DB in batches instead
    of one INSERT per miss.
    """

    def __init__(self):
        self.date_keys = {d.full_date: d.date_key for d in DimDate.objects.all()}
        self.time_keys = {(t.hour, t.minute_band): t.time_key for t in DimTime.objects.all()}
        self._new_dates = {}
        self._new_times = {}

    def date_key(self, d: datetime.date):
        key = self.date_keys.get(d)
        if key is not None:
            return key
        if d in self._new_dates:
            return None  # will be resolved by flush()
        self._new_dates[d] = DimDate(
            full_date=d, day_of_week=d.weekday(), day_name=d.strftime('%A'),
            month=d.month, month_name=d.strftime('%B'),
            quarter=(d.month - 1) // 3 + 1, year=d.year,
            is_weekend=tf.is_weekend(d), festival_flag=tf.festival_flag(d),
        )
        return None

    def time_key(self, hour: int, minute: int):
        band = tf.minute_band(minute)
        k = (hour, band)
        key = self.time_keys.get(k)
        if key is not None:
            return key
        if k in self._new_times:
            return None
        self._new_times[k] = DimTime(
            hour=hour, minute_band=band,
            day_part=tf.day_part(hour), is_peak_hour=tf.is_peak_hour(hour),
        )
        return None

    def flush(self):
        """Bulk-insert anything the cache didn't already have, then merge
        the new keys back in so subsequent date_key()/time_key() calls for
        the same values return real keys (used for a second pass, or by
        callers that pre-scan dates before loading facts).
        """
        if self._new_dates:
            created = DimDate.objects.bulk_create(list(self._new_dates.values()), batch_size=1000)
            # Postgres supports RETURNING on bulk_create, so `created` comes
            # back with real pks in the same order — no re-query needed.
            for d, row in zip(self._new_dates.keys(), created):
                self.date_keys[d] = row.date_key
            self._new_dates = {}
        if self._new_times:
            created = DimTime.objects.bulk_create(list(self._new_times.values()), batch_size=200)
            for k, row in zip(self._new_times.keys(), created):
                self.time_keys[k] = row.time_key
            self._new_times = {}

    def prescan(self, dates=(), times=()):
        """Register every (date) and (hour, minute) this load will need
        before any get_or_create calls, so a single flush() covers them
        all instead of flushing repeatedly mid-load.
        """
        for d in dates:
            self.date_key(d)
        for hour, minute in times:
            self.time_key(hour, minute)
        self.flush()


# ---------------------------------------------------------------------------
# Dimension loaders
#
# _bulk_scd2_load batches the common case — a dimension row that's brand
# new to the warehouse — into one bulk_create per call instead of one
# INSERT per row. On a first full bootstrap (every row is new) this is the
# difference between an hour and under a minute for a several-thousand-row
# dimension. Rows that already exist and changed still version one at a
# time via apply_scd2 (change volume per run is normally small); rows that
# exist and didn't change cost zero DB writes.
# ---------------------------------------------------------------------------

def _bulk_scd2_load(model, natural_id_field, key_field, tracked_fields, natural_ids, incoming_by_id, today):
    current_by_id = {
        getattr(row, natural_id_field): row
        for row in model.objects.filter(**{f"{natural_id_field}__in": natural_ids, 'is_current': True})
    }

    key_by_id = {}
    new_rows = []  # (natural_id, model instance) for genuinely new rows
    for nid in natural_ids:
        incoming = incoming_by_id[nid]
        current_row = current_by_id.get(nid)
        if current_row is None:
            new_rows.append((nid, model(
                **{natural_id_field: nid}, valid_from=today, valid_to='9999-12-31', is_current=True,
                **incoming,
            )))
            continue
        row, _ = apply_scd2(model, natural_id_field, nid, tracked_fields, incoming, today, current_row=current_row)
        key_by_id[nid] = getattr(row, key_field)

    if new_rows:
        created = model.objects.bulk_create([r for _, r in new_rows], batch_size=2000)
        for (nid, _), row in zip(new_rows, created):
            key_by_id[nid] = getattr(row, key_field)

    return key_by_id


def load_customers(customers, run_id):
    """dim_customer, SCD-2. tenure_band/rfm_segment are tracked attributes."""
    today = timezone.now().date()
    incoming_by_id = {}
    for c in customers:
        signup_date = c.created_at.date()
        days_since = (today - signup_date).days
        incoming_by_id[c.id] = {
            'signup_cohort': signup_date.strftime('%Y-%m'),
            'tenure_band': tf.tenure_band(days_since),
            'rfm_segment': '',  # populated later by the mining segmentation module (§8.4)
        }
    return _bulk_scd2_load(
        DimCustomer, 'customer_id', 'customer_key', ['tenure_band', 'rfm_segment'],
        [c.id for c in customers], incoming_by_id, today,
    )


def load_restaurants(restaurants, run_id):
    today = timezone.now().date()
    incoming_by_id = {
        r.id: {
            'name': r.name,
            'cuisine': r.cuisine_types,
            'price_band': tf.price_band(float(r.delivery_fee) if r.delivery_fee else 0) or 'mid',
            'area': (r.address or '').split(',')[0][:100],
            'rating_band': tf.rating_band(r.rating),
        }
        for r in restaurants
    }
    return _bulk_scd2_load(
        DimRestaurant, 'restaurant_id', 'restaurant_key', ['price_band', 'rating_band'],
        [r.id for r in restaurants], incoming_by_id, today,
    )


def load_menu_items(menu_items, run_id):
    """Tracked attribute is list_price — a MenuItemPriceHistory-triggering
    change is exactly what should version this dimension.
    """
    today = timezone.now().date()
    incoming_by_id = {
        item.id: {
            'item_name': item.name,
            'category': item.category,
            'list_price': item.price,
            'veg_flag': item.is_vegetarian,
        }
        for item in menu_items
    }
    return _bulk_scd2_load(
        DimMenuItem, 'item_id', 'item_key', ['list_price'],
        [item.id for item in menu_items], incoming_by_id, today,
    )


def load_events(events, run_id):
    today = timezone.now().date()
    incoming_by_id = {}
    for e in events:
        organiser_name = (e.organizer.get_full_name() or e.organizer.email) if e.organizer_id else ''
        incoming_by_id[e.id] = {
            'title': e.name,
            'category': e.category,
            'genre': e.category,  # operational Event has no separate genre field
            'organiser': organiser_name,
            'language': 'en',
        }
    return _bulk_scd2_load(
        DimEvent, 'event_id', 'event_key', ['title', 'category'],
        [e.id for e in events], incoming_by_id, today,
    )


def load_venues(venues, run_id):
    ids = [v.id for v in venues]
    current_by_id = {row.venue_id: row for row in DimVenue.objects.filter(venue_id__in=ids)}

    key_by_id = {}
    for v in venues:
        incoming = {
            'venue_name': v.name,
            'capacity_band': tf.capacity_band(v.capacity),
            'zone': v.area,
            'city': v.city,
        }
        row, _ = apply_scd1(DimVenue, 'venue_id', v.id, incoming, current_row=current_by_id.get(v.id))
        key_by_id[v.id] = row.venue_key
    return key_by_id


def load_ticket_types(ticket_types, run_id):
    today = timezone.now().date()
    incoming_by_id = {
        tt.id: {
            'class_name': tt.name,
            'tier': tt.name,
            'base_price': tt.price,
            'is_refundable': tt.is_refundable,
        }
        for tt in ticket_types
    }
    return _bulk_scd2_load(
        DimTicketType, 'ticket_type_id', 'ticket_type_key', ['base_price', 'is_refundable'],
        [tt.id for tt in ticket_types], incoming_by_id, today,
    )


def load_locations(area_city_pairs):
    """area_city_pairs: iterable of (area, city) tuples. Returns {(area, city): location_key}."""
    pairs = {p for p in area_city_pairs if p[0]}
    areas = [p[0] for p in pairs]
    current_by_area = {row.area: row for row in DimLocation.objects.filter(area__in=areas)}

    key_by_pair = {}
    for area, city in pairs:
        incoming = {'city': city, 'zone': '', 'region': '', 'density_band': ''}
        existing = current_by_area.get(area)
        if existing is not None:
            key_by_pair[(area, city)] = existing.location_key
            continue
        row = DimLocation.objects.create(area=area, **incoming)
        current_by_area[area] = row
        key_by_pair[(area, city)] = row.location_key
    return key_by_pair


def load_payment_methods(methods):
    # Deduplicated defensively — a caller-side distinct() that turns out
    # not to be effective (e.g. because of a model's default `ordering`
    # leaking into the query) must not turn into a duplicate-key crash here.
    valid_methods = list(dict.fromkeys(m for m in methods if m))
    current_by_method = {row.method: row for row in DimPayment.objects.filter(method__in=valid_methods)}

    key_by_method = {}
    for m in valid_methods:
        existing = current_by_method.get(m)
        if existing is not None:
            key_by_method[m] = existing.payment_key
            continue
        row = DimPayment.objects.create(
            method=m, provider='', is_prepaid=(m != 'cash_on_delivery'), settlement_band='',
        )
        current_by_method[m] = row
        key_by_method[m] = row.payment_key
    return key_by_method


# ---------------------------------------------------------------------------
# Fact loaders
#
# All of these bulk-upsert: one SELECT to find which natural ids already
# have a fact row, then one bulk_create for the new ones and one
# bulk_update for the changed ones — never one query per input row. At
# tens of thousands of fact rows against a remote DB, per-row
# update_or_create (itself 2 queries) turns a multi-second load into a
# multi-hour one, which would blow PRD NFR-P4's "inside off-peak window".
# ---------------------------------------------------------------------------

_FACT_UPDATE_FIELDS = {
    'fact_order': ['date_id', 'time_id', 'customer_id', 'restaurant_id', 'location_id',
                   'payment_id', 'order_total', 'item_count', 'delivery_fee',
                   'discount_total', 'delivery_minutes', 'is_cancelled'],
    'fact_order_item': ['order_id', 'date_id', 'time_id', 'customer_id', 'restaurant_id', 'menu_item_id',
                         'quantity', 'gross_amount', 'discount_amount', 'net_amount'],
    'fact_booking': ['date_id', 'time_id', 'customer_id', 'event_id', 'venue_id', 'payment_id',
                      'booking_total', 'seats_booked', 'lead_time_days', 'is_cancelled', 'is_no_show'],
    'fact_ticket_sale': ['date_id', 'time_id', 'customer_id', 'event_id', 'venue_id',
                          'ticket_type_id', 'payment_id', 'ticket_revenue', 'convenience_fee',
                          'seat_tier_rank', 'is_no_show'],
}


def _bulk_upsert_facts(model, natural_id_field, rows, table_name, chunk_size=2000):
    """rows: list of dicts, each containing natural_id_field plus every
    field in _FACT_UPDATE_FIELDS[table_name]. Returns n_loaded.
    """
    if not rows:
        return 0

    all_natural_ids = [r[natural_id_field] for r in rows]
    existing_pk_by_natural_id = dict(
        model.objects.filter(**{f"{natural_id_field}__in": all_natural_ids})
        .values_list(natural_id_field, 'fact_key')
    )

    to_create, to_update = [], []
    for r in rows:
        nid = r[natural_id_field]
        pk = existing_pk_by_natural_id.get(nid)
        if pk is not None:
            to_update.append(model(fact_key=pk, **r))
        else:
            to_create.append(model(**r))

    for i in range(0, len(to_create), chunk_size):
        model.objects.bulk_create(to_create[i:i + chunk_size], batch_size=chunk_size)
    for i in range(0, len(to_update), chunk_size):
        model.objects.bulk_update(
            to_update[i:i + chunk_size], _FACT_UPDATE_FIELDS[table_name], batch_size=chunk_size
        )
    return len(to_create) + len(to_update)


def load_fact_orders(orders, order_items_by_order, dim_keys, dt_cache, run_id):
    """dim_keys: dict with 'customer', 'restaurant', 'location', 'payment' sub-dicts of natural_id -> key."""
    dt_cache.prescan(
        dates=(o.created_at.date() for o in orders),
        times=((o.created_at.hour, o.created_at.minute) for o in orders),
    )

    rejected_entries = []
    rows = []
    for order in orders:
        if order.total is not None and order.total < 0:
            rejected_entries.append((order.id, 'non_positive_amount', {'total': str(order.total)}))
            continue

        customer_key = dim_keys['customer'].get(order.user_id)
        restaurant_key = dim_keys['restaurant'].get(order.restaurant_id)
        if customer_key is None or restaurant_key is None:
            rejected_entries.append((order.id, 'missing_dimension_key', None))
            continue

        area = (order.restaurant.address or '').split(',')[0][:100] if order.restaurant_id else ''
        location_key = dim_keys['location'].get((area, ''))
        payment_key = dim_keys['payment'].get(order.payment_method)
        items = order_items_by_order.get(order.id, [])

        rows.append(dict(
            order_id=order.id,
            date_id=dt_cache.date_key(order.created_at.date()),
            time_id=dt_cache.time_key(order.created_at.hour, order.created_at.minute),
            customer_id=customer_key, restaurant_id=restaurant_key,
            location_id=location_key, payment_id=payment_key,
            order_total=order.total, item_count=sum(i.quantity for i in items),
            delivery_fee=order.delivery_fee, discount_total=Decimal('0.00'),
            delivery_minutes=None,
            is_cancelled=(order.status == 'cancelled'),
        ))

    bulk_quarantine(run_id, 'fact_order', rejected_entries)
    loaded = _bulk_upsert_facts(FactOrder, 'order_id', rows, 'fact_order')
    return loaded, len(rejected_entries)


def load_fact_order_items(order_items, dim_keys, dt_cache, run_id):
    dt_cache.prescan(
        dates=(oi.order.created_at.date() for oi in order_items),
        times=((oi.order.created_at.hour, oi.order.created_at.minute) for oi in order_items),
    )

    rejected_entries = []
    rows = []
    for item in order_items:
        if item.quantity <= 0 or item.total < 0:
            rejected_entries.append((item.id, 'non_positive_amount', None))
            continue

        order = item.order
        customer_key = dim_keys['customer'].get(order.user_id)
        restaurant_key = dim_keys['restaurant'].get(order.restaurant_id)
        item_key = dim_keys['menu_item'].get(item.menu_item_id)
        if not all([customer_key, restaurant_key, item_key]):
            rejected_entries.append((item.id, 'missing_dimension_key', None))
            continue

        rows.append(dict(
            order_item_id=item.id, order_id=order.id,
            date_id=dt_cache.date_key(order.created_at.date()),
            time_id=dt_cache.time_key(order.created_at.hour, order.created_at.minute),
            customer_id=customer_key, restaurant_id=restaurant_key, menu_item_id=item_key,
            quantity=item.quantity, gross_amount=item.total,
            discount_amount=Decimal('0.00'), net_amount=item.total,
        ))

    bulk_quarantine(run_id, 'fact_order_item', rejected_entries)
    loaded = _bulk_upsert_facts(FactOrderItem, 'order_item_id', rows, 'fact_order_item')
    return loaded, len(rejected_entries)


def load_fact_bookings(bookings, dim_keys, dt_cache, run_id):
    dt_cache.prescan(
        dates=(b.booking_date.date() for b in bookings),
        times=((b.booking_date.hour, b.booking_date.minute) for b in bookings),
    )

    rejected_entries = []
    rows = []
    for booking in bookings:
        if booking.total is not None and booking.total < 0:
            rejected_entries.append((booking.id, 'non_positive_amount', None))
            continue
        if booking.event.event_date is not None and booking.booking_date > booking.event.event_date:
            rejected_entries.append((booking.id, 'out_of_order_timestamp', {
                'booking_date': str(booking.booking_date), 'event_date': str(booking.event.event_date),
            }))
            continue

        customer_key = dim_keys['customer'].get(booking.user_id)
        event_key = dim_keys['event'].get(booking.event_id)
        if customer_key is None or event_key is None:
            rejected_entries.append((booking.id, 'missing_dimension_key', None))
            continue

        venue_key = dim_keys['venue'].get(booking.event.venue_id) if booking.event.venue_id else None

        rows.append(dict(
            booking_id=booking.id,
            date_id=dt_cache.date_key(booking.booking_date.date()),
            time_id=dt_cache.time_key(booking.booking_date.hour, booking.booking_date.minute),
            customer_id=customer_key, event_id=event_key, venue_id=venue_key,
            payment_id=None,
            booking_total=booking.total, seats_booked=booking.total_tickets,
            lead_time_days=tf.lead_time_days(booking.booking_date, booking.event.event_date),
            is_cancelled=(booking.status == 'cancelled'),
            is_no_show=False,
        ))

    bulk_quarantine(run_id, 'fact_booking', rejected_entries)
    loaded = _bulk_upsert_facts(FactBooking, 'booking_id', rows, 'fact_booking')
    return loaded, len(rejected_entries)


def load_fact_ticket_sales(tickets, dim_keys, dt_cache, run_id):
    dt_cache.prescan(
        dates=(t.created_at.date() for t in tickets),
        times=((t.created_at.hour, t.created_at.minute) for t in tickets),
    )

    rejected_entries = []
    rows = []
    for ticket in tickets:
        booking = ticket.booking
        seat = ticket.seat
        customer_key = dim_keys['customer'].get(booking.user_id)
        event_key = dim_keys['event'].get(booking.event_id)
        ticket_type_key = dim_keys['ticket_type'].get(seat.ticket_type_id)
        if not all([customer_key, event_key, ticket_type_key]):
            rejected_entries.append((ticket.id, 'missing_dimension_key', None))
            continue

        venue_key = dim_keys['venue'].get(booking.event.venue_id) if booking.event.venue_id else None
        tier_rank = {'General': 1, 'Premium': 2, 'VIP': 3}.get(seat.ticket_type.name, 1)

        rows.append(dict(
            ticket_id=ticket.id,
            date_id=dt_cache.date_key(ticket.created_at.date()),
            time_id=dt_cache.time_key(ticket.created_at.hour, ticket.created_at.minute),
            customer_id=customer_key, event_id=event_key, venue_id=venue_key,
            ticket_type_id=ticket_type_key, payment_id=None,
            ticket_revenue=seat.ticket_type.price, convenience_fee=Decimal('0.00'),
            seat_tier_rank=tier_rank, is_no_show=False,
        ))

    bulk_quarantine(run_id, 'fact_ticket_sale', rejected_entries)
    loaded = _bulk_upsert_facts(FactTicketSale, 'ticket_id', rows, 'fact_ticket_sale')
    return loaded, len(rejected_entries)
