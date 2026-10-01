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
    FactOrderLifecycle, FactSeatInventorySnapshot, FactSearch, FactPayout,
)
from warehouse.etl.scd import apply_scd2, apply_scd1
from warehouse.etl import transform as tf
from warehouse.etl.audit import bulk_quarantine


def _local(dt):
    """Operational timestamps are stored in UTC. Calendar dates and hours in
    the warehouse are in the platform's own time zone (Asia/Kolkata), so a
    7:30 pm dinner order lands in the evening day part on the right day,
    not at 2 pm UTC.
    """
    return timezone.localtime(dt)


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
    today = timezone.localdate()
    incoming_by_id = {}
    for c in customers:
        signup_date = _local(c.created_at).date()
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
    today = timezone.localdate()
    incoming_by_id = {
        r.id: {
            'name': r.name,
            'cuisine': r.cuisine_types,
            'price_band': tf.price_band(float(r.delivery_fee) if r.delivery_fee else 0) or 'mid',
            'area': tf.restaurant_area(r),
            'rating_band': tf.rating_band(r.rating),
            'city': (r.city or '')[:100],
            'latitude': float(r.latitude) if r.latitude is not None else None,
            'longitude': float(r.longitude) if r.longitude is not None else None,
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
    today = timezone.localdate()
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
    today = timezone.localdate()
    incoming_by_id = {}
    for e in events:
        organiser_name = (e.organizer.get_full_name() or e.organizer.email) if e.organizer_id else ''
        incoming_by_id[e.id] = {
            'title': e.name,
            'category': e.category,
            'genre': e.event_type or e.category,
            'organiser': organiser_name,
            'language': 'en',
            'organizer_id': e.organizer_id,
            'event_date': e.event_date,
            'total_seats': e.total_seats or 0,
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
            'latitude': float(v.latitude) if v.latitude is not None else None,
            'longitude': float(v.longitude) if v.longitude is not None else None,
        }
        row, _ = apply_scd1(DimVenue, 'venue_id', v.id, incoming, current_row=current_by_id.get(v.id))
        key_by_id[v.id] = row.venue_key
    return key_by_id


def load_ticket_types(ticket_types, run_id):
    today = timezone.localdate()
    incoming_by_id = {
        tt.id: {
            'class_name': tt.name,
            'tier': tt.name,
            'base_price': tt.price,
            'is_refundable': tt.is_refundable,
            'capacity': tt.quantity_total or 0,
        }
        for tt in ticket_types
    }
    return _bulk_scd2_load(
        DimTicketType, 'ticket_type_id', 'ticket_type_key', ['base_price', 'is_refundable'],
        [tt.id for tt in ticket_types], incoming_by_id, today,
    )


def load_locations(restaurants):
    """One location per restaurant area, centred on the mean coordinates of
    the restaurants in it and banded by how many restaurants it has.
    Returns {area: location_key}.
    """
    by_area = {}
    for r in restaurants:
        area = tf.restaurant_area(r)
        if not area:
            continue
        entry = by_area.setdefault(area, {'city': '', 'lats': [], 'lngs': [], 'n': 0})
        entry['n'] += 1
        entry['city'] = entry['city'] or (r.city or '')[:100]
        if r.latitude is not None and r.longitude is not None:
            entry['lats'].append(float(r.latitude))
            entry['lngs'].append(float(r.longitude))

    current_by_area = {row.area: row for row in DimLocation.objects.filter(area__in=list(by_area))}
    key_by_area = {}
    for area, entry in by_area.items():
        incoming = {
            'city': entry['city'],
            'latitude': round(sum(entry['lats']) / len(entry['lats']), 6) if entry['lats'] else None,
            'longitude': round(sum(entry['lngs']) / len(entry['lngs']), 6) if entry['lngs'] else None,
            'density_band': tf.density_band(entry['n']),
        }
        existing = current_by_area.get(area)
        if existing is None:
            existing = DimLocation.objects.create(area=area, zone='', region='', **incoming)
        else:
            changed = [f for f, v in incoming.items() if _differs(getattr(existing, f), v)]
            if changed:
                for f in changed:
                    setattr(existing, f, incoming[f])
                existing.save(update_fields=changed)
        key_by_area[area] = existing.location_key
    return key_by_area


def _differs(current, incoming):
    if current is None or incoming is None:
        return current is not incoming
    if isinstance(current, Decimal) or isinstance(incoming, Decimal):
        return abs(float(current) - float(incoming)) > 1e-6
    return current != incoming


def load_promotions(promotions):
    """dim_promotion, SCD 1 keyed on the promo code. Returns {code: promotion_key}."""
    current_by_code = {row.campaign_name: row for row in DimPromotion.objects.all()}
    key_by_code = {}
    for p in promotions:
        incoming = {
            'promo_type': p.discount_type,
            'discount_pct': p.discount_value if p.discount_type == 'percent' else Decimal('0'),
            'channel': 'restaurant' if p.restaurant_id else 'platform',
            'promotion_id': p.id,
            'restaurant_id': p.restaurant_id,
            'valid_from': p.valid_from,
            'valid_until': p.valid_until,
        }
        row, _ = apply_scd1(DimPromotion, 'campaign_name', p.code, incoming,
                             current_row=current_by_code.get(p.code))
        key_by_code[p.code] = row.promotion_key
    return key_by_code


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

# delivery_minutes is deliberately not in fact_order's update list: it's
# owned by the lifecycle load (sync_delivery_minutes), not by the order row.
_FACT_UPDATE_FIELDS = {
    'fact_order': ['date_id', 'time_id', 'customer_id', 'restaurant_id', 'location_id',
                   'payment_id', 'promotion_id', 'order_total', 'item_count', 'delivery_fee',
                   'discount_total', 'failed_payments', 'is_cancelled'],
    'fact_order_item': ['order_id', 'date_id', 'time_id', 'customer_id', 'restaurant_id', 'menu_item_id',
                         'quantity', 'gross_amount', 'discount_amount', 'net_amount'],
    'fact_booking': ['date_id', 'time_id', 'customer_id', 'event_id', 'venue_id', 'payment_id',
                      'booking_total', 'seats_booked', 'lead_time_days', 'is_cancelled', 'is_no_show'],
    'fact_ticket_sale': ['date_id', 'time_id', 'customer_id', 'event_id', 'venue_id',
                          'ticket_type_id', 'payment_id', 'ticket_revenue', 'convenience_fee',
                          'seat_tier_rank', 'is_no_show'],
    'fact_order_lifecycle': ['date_id', 'time_id', 'customer_id', 'restaurant_id', 'placed_at',
                              'confirmed_at', 'preparing_at', 'ready_at', 'dispatched_at',
                              'delivered_at', 'cancelled_at', 'accept_minutes', 'prep_minutes',
                              'handoff_minutes', 'transit_minutes', 'total_minutes', 'item_count',
                              'current_status', 'is_complete'],
    'fact_search': ['date_id', 'time_id', 'query_text', 'normalized_query', 'scope', 'vertical',
                     'has_results', 'clicked'],
    'fact_payout': ['restaurant_id', 'period_start', 'period_end', 'order_count', 'gross_revenue',
                     'commission_rate', 'commission_amount', 'net_amount', 'status', 'created_at',
                     'paid_at', 'days_to_pay'],
}

LOOKUP_CHUNK = 5000


def _chunks(seq, size):
    seq = list(seq)
    for i in range(0, len(seq), size):
        yield seq[i:i + size]


def _bulk_upsert_facts(model, natural_id_field, rows, table_name, chunk_size=2000):
    """rows: list of dicts, each containing natural_id_field plus every
    field in _FACT_UPDATE_FIELDS[table_name]. Returns n_loaded.
    """
    if not rows:
        return 0

    existing_pk_by_natural_id = {}
    for ids in _chunks((r[natural_id_field] for r in rows), LOOKUP_CHUNK):
        existing_pk_by_natural_id.update(
            model.objects.filter(**{f"{natural_id_field}__in": ids}).values_list(natural_id_field, 'fact_key')
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


def load_fact_orders(orders, order_items_by_order, dim_keys, dt_cache, run_id, failed_payments_by_ref=None):
    """dim_keys: dict with 'customer', 'restaurant', 'location', 'payment', 'promotion' sub-dicts.
    failed_payments_by_ref: {Payment.object_id: failed attempts} (see extract.extract_failed_order_payments).
    """
    from datagen.generators.common import payment_object_id
    failed_payments_by_ref = failed_payments_by_ref or {}
    dt_cache.prescan(
        dates=(_local(o.created_at).date() for o in orders),
        times=((_local(o.created_at).hour, _local(o.created_at).minute) for o in orders),
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

        location_key = dim_keys['location'].get(tf.restaurant_area(order.restaurant)) if order.restaurant_id else None
        payment_key = dim_keys['payment'].get(order.payment_method)
        promotion_key = dim_keys['promotion'].get(order.promo_code) if order.promo_code else None
        items = order_items_by_order.get(order.id, [])

        rows.append(dict(
            order_id=order.id,
            date_id=dt_cache.date_key(_local(order.created_at).date()),
            time_id=dt_cache.time_key(_local(order.created_at).hour, _local(order.created_at).minute),
            customer_id=customer_key, restaurant_id=restaurant_key,
            location_id=location_key, payment_id=payment_key, promotion_id=promotion_key,
            order_total=order.total, item_count=sum(i.quantity for i in items),
            delivery_fee=order.delivery_fee, discount_total=order.discount or Decimal('0.00'),
            failed_payments=failed_payments_by_ref.get(payment_object_id(order.id), 0),
            is_cancelled=(order.status == 'cancelled'),
        ))

    bulk_quarantine(run_id, 'fact_order', rejected_entries)
    loaded = _bulk_upsert_facts(FactOrder, 'order_id', rows, 'fact_order')
    return loaded, len(rejected_entries)


def load_fact_order_items(order_items, dim_keys, dt_cache, run_id):
    dt_cache.prescan(
        dates=(_local(oi.order.created_at).date() for oi in order_items),
        times=((_local(oi.order.created_at).hour, _local(oi.order.created_at).minute) for oi in order_items),
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

        # An order-level discount is spread across its lines in proportion
        # to each line's value, so item-level net revenue sums to what the
        # customer actually paid for the food.
        discount = Decimal('0.00')
        if order.discount and order.subtotal and order.subtotal > 0:
            discount = (order.discount * item.total / order.subtotal).quantize(Decimal('0.01'))
            discount = min(discount, item.total)

        rows.append(dict(
            order_item_id=item.id, order_id=order.id,
            date_id=dt_cache.date_key(_local(order.created_at).date()),
            time_id=dt_cache.time_key(_local(order.created_at).hour, _local(order.created_at).minute),
            customer_id=customer_key, restaurant_id=restaurant_key, menu_item_id=item_key,
            quantity=item.quantity, gross_amount=item.total,
            discount_amount=discount, net_amount=item.total - discount,
        ))

    bulk_quarantine(run_id, 'fact_order_item', rejected_entries)
    loaded = _bulk_upsert_facts(FactOrderItem, 'order_item_id', rows, 'fact_order_item')
    return loaded, len(rejected_entries)


def _attended_status(status):
    return status in ('confirmed', 'completed')


def is_no_show(event_date, status, scanned_tickets, scans_in_use, now):
    """A booking is a no-show only once its event is over, it was still
    live (not cancelled), none of its tickets were scanned — and the event
    actually used gate scanning. Without that last condition every booking
    for a venue that never scans tickets would be read as a no-show.
    """
    if event_date is None or event_date > now:
        return False
    return _attended_status(status) and scans_in_use and not scanned_tickets


def _booking_payment_key(booking, dim_keys):
    method = booking.payment.method if booking.payment_id else dim_keys.get('booking_payment', {}).get(booking.id)
    return dim_keys['payment'].get(method) if method else None


def load_fact_bookings(bookings, dim_keys, dt_cache, run_id):
    dt_cache.prescan(
        dates=(_local(b.booking_date).date() for b in bookings),
        times=((_local(b.booking_date).hour, _local(b.booking_date).minute) for b in bookings),
    )
    now = timezone.now()

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
        payment_key = _booking_payment_key(booking, dim_keys)

        rows.append(dict(
            booking_id=booking.id,
            date_id=dt_cache.date_key(_local(booking.booking_date).date()),
            time_id=dt_cache.time_key(_local(booking.booking_date).hour, _local(booking.booking_date).minute),
            customer_id=customer_key, event_id=event_key, venue_id=venue_key,
            payment_id=payment_key,
            booking_total=booking.total, seats_booked=booking.total_tickets,
            lead_time_days=tf.lead_time_days(booking.booking_date, booking.event.event_date),
            is_cancelled=(booking.status == 'cancelled'),
            is_no_show=is_no_show(
                booking.event.event_date, booking.status,
                getattr(booking, 'scanned_tickets', 0), getattr(booking, 'event_scans_in_use', False), now,
            ),
        ))

    bulk_quarantine(run_id, 'fact_booking', rejected_entries)
    loaded = _bulk_upsert_facts(FactBooking, 'booking_id', rows, 'fact_booking')
    return loaded, len(rejected_entries)


def load_fact_ticket_sales(tickets, dim_keys, dt_cache, run_id):
    dt_cache.prescan(
        dates=(_local(t.created_at).date() for t in tickets),
        times=((_local(t.created_at).hour, _local(t.created_at).minute) for t in tickets),
    )
    now = timezone.now()

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
        payment_key = _booking_payment_key(booking, dim_keys)
        tier_rank = {'General': 1, 'Premium': 2, 'VIP': 3}.get(seat.ticket_type.name, 1)

        rows.append(dict(
            ticket_id=ticket.id,
            date_id=dt_cache.date_key(_local(ticket.created_at).date()),
            time_id=dt_cache.time_key(_local(ticket.created_at).hour, _local(ticket.created_at).minute),
            customer_id=customer_key, event_id=event_key, venue_id=venue_key,
            ticket_type_id=ticket_type_key, payment_id=payment_key,
            ticket_revenue=seat.ticket_type.price, convenience_fee=Decimal('0.00'),
            seat_tier_rank=tier_rank,
            is_no_show=is_no_show(
                booking.event.event_date, booking.status, ticket.is_scanned,
                getattr(ticket, 'event_scans_in_use', False), now,
            ),
        ))

    bulk_quarantine(run_id, 'fact_ticket_sale', rejected_entries)
    loaded = _bulk_upsert_facts(FactTicketSale, 'ticket_id', rows, 'fact_ticket_sale')
    return loaded, len(rejected_entries)


def refresh_attendance(bookings, tickets):
    """Re-derive is_no_show for bookings/tickets whose event ended since the
    last run (see extract.extract_attendance_changes). Updates only — rows
    not yet in the warehouse are created by the normal fact load.
    Returns the number of fact rows flagged as no-shows.
    """
    # Every row passed in belongs to an event that has already ended, so
    # `now` stands in for the event date in is_no_show().
    now = timezone.now()
    flagged = {True: [], False: []}
    for b in bookings:
        flagged[is_no_show(now, b['status'], b['scanned_tickets'], b['event_scans_in_use'], now)].append(b['id'])
    ticket_flags = {True: [], False: []}
    for t in tickets:
        ticket_flags[is_no_show(now, t['booking__status'], t['is_scanned'], t['event_scans_in_use'], now)].append(t['id'])

    for value, ids in flagged.items():
        for chunk in _chunks(ids, LOOKUP_CHUNK):
            FactBooking.objects.filter(booking_id__in=chunk).exclude(is_no_show=value).update(is_no_show=value)
    for value, ids in ticket_flags.items():
        for chunk in _chunks(ids, LOOKUP_CHUNK):
            FactTicketSale.objects.filter(ticket_id__in=chunk).exclude(is_no_show=value).update(is_no_show=value)
    return len(flagged[True])


# ---------------------------------------------------------------------------
# Order lifecycle (accumulating snapshot)
# ---------------------------------------------------------------------------

_STAGE_FIELD = {
    'confirmed': 'confirmed_at', 'preparing': 'preparing_at', 'ready': 'ready_at',
    'out_for_delivery': 'dispatched_at', 'delivered': 'delivered_at', 'cancelled': 'cancelled_at',
}


def build_lifecycles(history_rows):
    """Group status-history rows by order. A stage's timestamp is the
    *first* time the order reached it (a status flapping back and forth
    shouldn't stretch the stage). Returns {order_id: {'order', 'stamps'}}.
    """
    by_order = {}
    for h in history_rows:
        entry = by_order.setdefault(h.order_id, {'order': h.order, 'stamps': {}})
        field = _STAGE_FIELD.get(h.new_status)
        if field and field not in entry['stamps']:
            entry['stamps'][field] = h.changed_at
    return by_order


def _minutes(start, end):
    if start is None or end is None or end < start:
        return None
    return round((end - start).total_seconds() / 60, 2)


def load_fact_order_lifecycle(lifecycles, item_count_by_order, dim_keys, dt_cache, run_id):
    orders = [entry['order'] for entry in lifecycles.values()]
    dt_cache.prescan(
        dates=(_local(o.created_at).date() for o in orders),
        times=((_local(o.created_at).hour, _local(o.created_at).minute) for o in orders),
    )

    rejected_entries = []
    rows = []
    for order_id, entry in lifecycles.items():
        order, st = entry['order'], entry['stamps']
        customer_key = dim_keys['customer'].get(order.user_id)
        restaurant_key = dim_keys['restaurant'].get(order.restaurant_id)
        if customer_key is None or restaurant_key is None:
            rejected_entries.append((order_id, 'missing_dimension_key', None))
            continue

        placed = order.created_at
        stamps = {f: st.get(f) for f in _STAGE_FIELD.values()}
        prep_start = stamps['confirmed_at'] or stamps['preparing_at']
        rows.append(dict(
            order_id=order_id,
            date_id=dt_cache.date_key(_local(placed).date()),
            time_id=dt_cache.time_key(_local(placed).hour, _local(placed).minute),
            customer_id=customer_key, restaurant_id=restaurant_key,
            placed_at=placed, **stamps,
            accept_minutes=_minutes(placed, stamps['confirmed_at']),
            prep_minutes=_minutes(prep_start, stamps['ready_at']),
            handoff_minutes=_minutes(stamps['ready_at'], stamps['dispatched_at']),
            transit_minutes=_minutes(stamps['dispatched_at'], stamps['delivered_at']),
            total_minutes=_minutes(placed, stamps['delivered_at']),
            item_count=item_count_by_order.get(order_id, 0),
            current_status=order.status,
            is_complete=order.status in ('delivered', 'cancelled'),
        ))

    bulk_quarantine(run_id, 'fact_order_lifecycle', rejected_entries)
    loaded = _bulk_upsert_facts(FactOrderLifecycle, 'order_id', rows, 'fact_order_lifecycle')
    return loaded, len(rejected_entries)


def item_counts_from_warehouse(order_ids):
    """item_count for orders whose lifecycle changed but whose order row
    wasn't re-extracted this run — read back from fact_order.
    """
    counts = {}
    for chunk in _chunks(order_ids, LOOKUP_CHUNK):
        counts.update(FactOrder.objects.filter(order_id__in=chunk).values_list('order_id', 'item_count'))
    return counts


def sync_delivery_minutes():
    """fact_order.delivery_minutes <- fact_order_lifecycle.total_minutes,
    in one set-based UPDATE inside the warehouse. Returns rows changed.
    """
    from django.db import connections
    from config.db_routers import warehouse_db

    with connections[warehouse_db()].cursor() as cursor:
        cursor.execute("""
            UPDATE fact_order AS f
               SET delivery_minutes = ROUND(l.total_minutes)::integer
              FROM fact_order_lifecycle AS l
             WHERE l.order_id = f.order_id
               AND l.total_minutes IS NOT NULL
               AND f.delivery_minutes IS DISTINCT FROM ROUND(l.total_minutes)::integer
        """)
        return cursor.rowcount


# ---------------------------------------------------------------------------
# Search, payouts, seat inventory
# ---------------------------------------------------------------------------

def load_fact_search(logs, dt_cache, run_id):
    dt_cache.prescan(
        dates=(_local(log.created_at).date() for log in logs),
        times=((_local(log.created_at).hour, _local(log.created_at).minute) for log in logs),
    )
    rows = []
    rejected_entries = []
    for log in logs:
        normalized = tf.normalize_query(log.query_text)
        if not normalized:
            rejected_entries.append((log.id, 'empty_query', None))
            continue
        rows.append(dict(
            search_log_id=log.id,
            date_id=dt_cache.date_key(_local(log.created_at).date()),
            time_id=dt_cache.time_key(_local(log.created_at).hour, _local(log.created_at).minute),
            query_text=log.query_text[:255], normalized_query=normalized[:255],
            scope=(log.result_type or '')[:20],
            vertical=tf.search_vertical(log.result_type, log.result_id),
            has_results=tf.search_has_results(log.result_id),
            clicked=log.clicked,
        ))
    bulk_quarantine(run_id, 'fact_search', rejected_entries)
    loaded = _bulk_upsert_facts(FactSearch, 'search_log_id', rows, 'fact_search')
    return loaded, len(rejected_entries)


def load_fact_payouts(payouts, dim_keys, run_id):
    rows = []
    rejected_entries = []
    for p in payouts:
        restaurant_key = dim_keys['restaurant'].get(p.restaurant_id)
        if restaurant_key is None:
            rejected_entries.append((p.id, 'missing_dimension_key', None))
            continue
        days_to_pay = None
        if p.paid_at:
            days_to_pay = round((p.paid_at - p.created_at).total_seconds() / 86400, 2)
        rows.append(dict(
            payout_id=p.id, restaurant_id=restaurant_key,
            period_start=p.period_start.date(), period_end=p.period_end.date(),
            order_count=p.order_count, gross_revenue=p.gross_revenue,
            commission_rate=p.commission_rate, commission_amount=p.commission_amount,
            net_amount=p.net_amount, status=p.status, created_at=p.created_at,
            paid_at=p.paid_at, days_to_pay=days_to_pay,
        ))
    bulk_quarantine(run_id, 'fact_payout', rejected_entries)
    loaded = _bulk_upsert_facts(FactPayout, 'payout_id', rows, 'fact_payout')
    return loaded, len(rejected_entries)


def load_seat_snapshots(rows, dim_keys, dt_cache, run_id):
    """Today's periodic snapshot. Re-running on the same day replaces that
    day's rows rather than duplicating them.
    """
    today = timezone.localdate()
    dt_cache.prescan(dates=[today])
    date_key = dt_cache.date_key(today)

    objs = []
    rejected_entries = []
    for r in rows:
        event_key = dim_keys['event'].get(r['event_id'])
        tier_key = dim_keys['ticket_type'].get(r['ticket_type_id'])
        if event_key is None or tier_key is None:
            rejected_entries.append((r['ticket_type_id'], 'missing_dimension_key', None))
            continue
        objs.append(FactSeatInventorySnapshot(
            snapshot_date_id=date_key, event_id=event_key, ticket_type_id=tier_key,
            natural_event_id=r['event_id'], natural_ticket_type_id=r['ticket_type_id'],
            capacity=r['capacity'], sold=r['sold'], held=r['held'], available=r['available'],
            days_to_event=max(0, (timezone.localtime(r['event_date']).date() - today).days),
        ))
    FactSeatInventorySnapshot.objects.filter(snapshot_date_id=date_key).delete()
    FactSeatInventorySnapshot.objects.bulk_create(objs, batch_size=2000)
    bulk_quarantine(run_id, 'fact_seat_inventory_snapshot', rejected_entries)
    return len(objs), len(rejected_entries)
