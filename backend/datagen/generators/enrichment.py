"""Second-pass enrichment of synthetic data (PRD §10) — adds the signals the
first-pass generators never wrote but the warehouse and mining modules
need:

  coordinates   synthetic restaurants/venues placed around their city
                (geo hotspot mining)
  promotions    3-week promos on a share of restaurants, with planted
                order uplift and redemptions (promo-effect mining)
  lifecycles    order status history with planted kitchen + transit times
                (fact_order_lifecycle, delivery-time model)
  attendance    gate scans for past events, with a planted no-show
                function (fact_booking.is_no_show, no-show risk model)
  searches      search-log rows with unmet and trending terms (search mining)

Scope: only synthetic rows — users with an @synthetic.platforma.dev email,
restaurants with data_source='fake', and venues/events owned by synthetic
organizers. Real data is never touched.

Idempotent: every random decision is seeded by the row's own id, and each
step skips rows it has already enriched, so running it twice changes
nothing the second time.
"""
import datetime
import random
import uuid
import zlib
from decimal import Decimal, ROUND_HALF_UP

from django.db.models import Count, OuterRef, Q, Subquery, Sum
from django.utils import timezone

from core.models import SearchLog
from eventra.models import Booking, Event, Ticket, Venue
from zesty.models import MenuItem, Order, OrderItem, OrderStatusHistory, Promotion, Restaurant
from datagen.planted import (
    no_show_probability, prep_minutes, transit_minutes,
    PROMO_RESTAURANT_SHARE, PROMO_ORDER_UPLIFT, PROMO_REDEMPTION_RATE, PROMO_WINDOW_DAYS,
    UNMET_SEARCH_TERMS, TRENDING_SEARCH_TERM,
)
from .common import historical_timestamps, CUISINES, EVENT_CATEGORIES

SYNTHETIC_EMAIL_SUFFIX = '@synthetic.platforma.dev'
SEARCH_SESSION_PREFIX = 'syn-'
BATCH = 5000

CITY_CENTRES = {
    'Mumbai': (19.0760, 72.8777), 'Bengaluru': (12.9716, 77.5946), 'Delhi': (28.6139, 77.2090),
    'Hyderabad': (17.3850, 78.4867), 'Pune': (18.5204, 73.8567), 'Chennai': (13.0827, 80.2707),
    'Kolkata': (22.5726, 88.3639), 'Ahmedabad': (23.0225, 72.5714), 'Jaipur': (26.9124, 75.7873),
}


def _rng(*parts):
    """A random.Random seeded by the given values — the same row always gets
    the same decision, which is what makes every step idempotent.
    """
    return random.Random(zlib.crc32('|'.join(str(p) for p in parts).encode()))


def _q2(value):
    return Decimal(value).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def _synthetic_orders():
    return Order.objects.filter(user__email__endswith=SYNTHETIC_EMAIL_SUFFIX)


def restaurant_distance(restaurant_id):
    """Fixed per-restaurant 'distance' (0-15 min of extra transit)."""
    return _rng('distance', restaurant_id).uniform(0, 15)


# ---------------------------------------------------------------------------
# Coordinates
# ---------------------------------------------------------------------------

def _place(city, area, row_id):
    centre = CITY_CENTRES.get(city)
    if centre is None:
        return None
    area_rng = _rng('area', city, area)
    area_lat = centre[0] + area_rng.uniform(-0.09, 0.09)
    area_lng = centre[1] + area_rng.uniform(-0.09, 0.09)
    row_rng = _rng('row', row_id)
    return round(area_lat + row_rng.gauss(0, 0.012), 6), round(area_lng + row_rng.gauss(0, 0.012), 6)


def enrich_coordinates():
    moved = 0
    restaurants = list(Restaurant.objects.filter(data_source='fake').only('id', 'city', 'area', 'latitude', 'longitude'))
    for r in restaurants:
        point = _place(r.city, r.area, f"r{r.id}")
        if point and (r.latitude is None or abs(float(r.latitude) - point[0]) > 1e-5):
            r.latitude, r.longitude = point
            moved += 1
    Restaurant.objects.bulk_update([r for r in restaurants], ['latitude', 'longitude'], batch_size=1000)

    venues = list(
        Venue.objects.filter(events__organizer__email__endswith=SYNTHETIC_EMAIL_SUFFIX).distinct()
        .only('id', 'city', 'area', 'latitude', 'longitude')
    )
    for v in venues:
        point = _place(v.city, v.area, f"v{v.id}")
        if point:
            v.latitude, v.longitude = point
            moved += 1
    Venue.objects.bulk_update(venues, ['latitude', 'longitude'], batch_size=1000)
    return moved


# ---------------------------------------------------------------------------
# Promotions
# ---------------------------------------------------------------------------

def enrich_promotions(seed):
    """One promo per selected restaurant. During its window, existing orders
    redeem the code at PROMO_REDEMPTION_RATE and PROMO_ORDER_UPLIFT more
    orders are created (cloned from the restaurant's own past baskets).
    """
    if Promotion.objects.filter(code__startswith='SYN').exists():
        return {'promotions': 0, 'redeemed': 0, 'extra_orders': 0}

    today = timezone.localdate()
    restaurants = [
        r for r in Restaurant.objects.filter(data_source='fake', is_active=True).order_by('id')
        if _rng(seed, 'promo-pick', r.id).random() < PROMO_RESTAURANT_SHARE
    ]
    promos, redeemed_orders, new_orders, new_items = [], [], [], []
    for r in restaurants:
        rng = _rng(seed, 'promo', r.id)
        start = today - datetime.timedelta(days=rng.randint(30, 180))
        end = start + datetime.timedelta(days=PROMO_WINDOW_DAYS)
        start_dt = timezone.make_aware(datetime.datetime.combine(start, datetime.time()))
        end_dt = timezone.make_aware(datetime.datetime.combine(end, datetime.time()))
        pct = Decimal(rng.choice([10, 15, 20]))
        promo = Promotion(
            restaurant=r, code=f"SYN{r.id}P{pct}", description=f"{pct}% off for three weeks",
            discount_type='percent', discount_value=pct, min_order_value=Decimal('0'),
            max_discount_amount=Decimal('150'), valid_from=start_dt, valid_until=end_dt, is_active=False,
        )
        promos.append(promo)

        def discount_for(subtotal):
            return min(_q2(subtotal * pct / 100), Decimal('150'))

        window_orders = list(
            _synthetic_orders().filter(restaurant=r, created_at__gte=start_dt, created_at__lt=end_dt)
            .exclude(status='cancelled')
        )
        for o in window_orders:
            if _rng(seed, 'redeem', o.id).random() < PROMO_REDEMPTION_RATE:
                o.discount = discount_for(o.subtotal)
                o.promo_code = promo.code
                o.total = o.subtotal + o.delivery_fee + o.tax - o.discount
                o.updated_at = timezone.now()
                redeemed_orders.append(o)

        templates = list(
            _synthetic_orders().filter(restaurant=r).exclude(status='cancelled')
            .order_by('created_at')[:200].prefetch_related('items')
        )
        n_extra = int(round(len(window_orders) * PROMO_ORDER_UPLIFT))
        span = (end_dt - start_dt).total_seconds()
        for i in range(n_extra if templates else 0):
            template = templates[rng.randrange(len(templates))]
            created = start_dt + datetime.timedelta(seconds=rng.uniform(0, span))
            created = created.replace(hour=rng.choice([12, 13, 19, 20, 21]), minute=rng.randint(0, 59))
            order_id = uuid.uuid4()
            subtotal = Decimal('0.00')
            for item in template.items.all():
                new_items.append(OrderItem(order_id=order_id, menu_item_id=item.menu_item_id, quantity=item.quantity,
                                           unit_price=item.unit_price, total=item.total))
                subtotal += item.total
            discount = discount_for(subtotal)
            tax = _q2(subtotal * Decimal('0.05'))
            new_orders.append(Order(
                id=order_id, user_id=template.user_id, restaurant=r, status='delivered',
                delivery_address=template.delivery_address, subtotal=subtotal, delivery_fee=r.delivery_fee,
                tax=tax, discount=discount, promo_code=promo.code,
                total=subtotal + r.delivery_fee + tax - discount,
                payment_method=template.payment_method, payment_status='paid',
                created_at=created, updated_at=timezone.now(),
            ))
        promo.times_used = (
            sum(1 for o in redeemed_orders if o.promo_code == promo.code) + n_extra
        )

    Promotion.objects.bulk_create(promos, batch_size=500)
    Order.objects.bulk_update(redeemed_orders, ['discount', 'promo_code', 'total', 'updated_at'], batch_size=1000)
    with historical_timestamps(Order, 'created_at', 'updated_at'):
        Order.objects.bulk_create(new_orders, batch_size=1000)
    OrderItem.objects.bulk_create(new_items, batch_size=2000)
    return {'promotions': len(promos), 'redeemed': len(redeemed_orders), 'extra_orders': len(new_orders)}


# ---------------------------------------------------------------------------
# Order lifecycles
# ---------------------------------------------------------------------------

FULL_PATH = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered']


def _lifecycle_rows(order, now):
    rng = _rng('lifecycle', order['id'])
    created = order['created_at']
    local = timezone.localtime(created)
    hour, weekend = local.hour, local.weekday() >= 5
    items = order['n_items'] or 1

    if order['status'] == 'cancelled':
        path = ['pending', 'cancelled'] if rng.random() < 0.6 else ['pending', 'confirmed', 'cancelled']
    else:
        path = FULL_PATH[:FULL_PATH.index(order['status']) + 1] if order['status'] in FULL_PATH else ['pending']

    gaps = {
        'confirmed': rng.uniform(1, 6) + (2 if hour in (12, 13, 19, 20) else 0),
        'preparing': rng.uniform(0.5, 3),
        'ready': max(4.0, prep_minutes(items, hour) + rng.gauss(0, 3)),
        'out_for_delivery': rng.uniform(2, 8),
        'delivered': max(5.0, transit_minutes(restaurant_distance(order['restaurant_id']), hour, weekend) + rng.gauss(0, 3)),
        'cancelled': rng.uniform(2, 25),
    }
    rows, at = [], created
    for old, new in zip(path, path[1:]):
        at = min(now, at + datetime.timedelta(minutes=gaps[new]))
        rows.append(OrderStatusHistory(order_id=order['id'], old_status=old, new_status=new, changed_at=at))
    return rows


def enrich_order_lifecycles():
    now = timezone.now()
    orders = (
        _synthetic_orders().filter(status_history__isnull=True)
        .annotate(n_items=Sum('items__quantity'))
        .values('id', 'created_at', 'status', 'restaurant_id', 'n_items')
    )
    created = 0
    batch = []
    with historical_timestamps(OrderStatusHistory, 'changed_at'):
        for order in orders.iterator(chunk_size=BATCH):
            batch.extend(_lifecycle_rows(order, now))
            if len(batch) >= BATCH:
                OrderStatusHistory.objects.bulk_create(batch, batch_size=BATCH)
                created += len(batch)
                batch = []
        if batch:
            OrderStatusHistory.objects.bulk_create(batch, batch_size=BATCH)
            created += len(batch)
    return created


# ---------------------------------------------------------------------------
# Attendance (gate scans -> no-shows)
# ---------------------------------------------------------------------------

def enrich_attendance():
    """Confirmed synthetic bookings for past events with no scanned ticket:
    each one either turns up (all its tickets scanned) or is a no-show, by
    no_show_probability(). A no-show stays unscanned, and re-running makes
    the same seeded decision, so the no-show rate never drifts.
    """
    now = timezone.now()
    candidates = (
        Booking.objects.filter(
            user__email__endswith=SYNTHETIC_EMAIL_SUFFIX, status='confirmed', event__event_date__lt=now,
        )
        .annotate(scanned=Count('tickets', filter=Q(tickets__is_scanned=True)))
        .filter(scanned=0)
        .values('id', 'booking_date', 'subtotal', 'total_tickets', 'event__event_date', 'payment__method')
    )
    attended, no_shows = [], 0
    for b in candidates.iterator(chunk_size=BATCH):
        lead = max(0.0, (b['event__event_date'] - b['booking_date']).total_seconds() / 86400)
        price = float(b['subtotal'] or 0) / max(1, b['total_tickets'] or 1)
        weekday = timezone.localtime(b['event__event_date']).weekday()
        p = no_show_probability(lead, b['payment__method'] or 'upi', price, weekday)
        if _rng('no-show', b['id']).random() < p:
            no_shows += 1
        else:
            attended.append(b['id'])

    event_start = Subquery(Booking.objects.filter(id=OuterRef('booking_id')).values('event__event_date')[:1])
    scanned = 0
    for i in range(0, len(attended), BATCH):
        scanned += Ticket.objects.filter(booking_id__in=attended[i:i + BATCH]).update(
            is_scanned=True, scanned_at=event_start, scanned_gate='Gate A',
        )
    return {'attended_bookings': len(attended), 'no_shows': no_shows, 'tickets_scanned': scanned}


# ---------------------------------------------------------------------------
# Search logs
# ---------------------------------------------------------------------------

def enrich_search_logs(seed, volume):
    if SearchLog.objects.filter(session_id__startswith=SEARCH_SESSION_PREFIX).exists():
        return 0
    rng = _rng(seed, 'search')
    now = timezone.now()

    restaurants = list(Restaurant.objects.filter(is_active=True).values_list('id', 'name')[:400])
    items = list(MenuItem.objects.values_list('id', 'name').distinct()[:400])
    events = list(Event.objects.values_list('id', 'name')[:200])
    item_names = sorted({name for _, name in items})
    hits = (
        [('menu', name.lower(), f"menu_items:{iid}") for iid, name in items[:200]]
        + [('cuisine', c.lower(), f"restaurants:{rid}") for c, (rid, _) in zip(CUISINES * 40, restaurants)]
        + [('event', f"{c} tickets", f"events:{eid}") for c, (eid, _) in zip(EVENT_CATEGORIES * 30, events)]
    )
    if not hits:
        return 0

    def typo(text):
        if len(text) < 5:
            return text
        i = rng.randrange(1, len(text) - 1)
        return text[:i] + text[i + 1:]

    logs = []
    for n in range(volume):
        days_ago = int(rng.triangular(0, 180, 0))
        created = now - datetime.timedelta(days=days_ago, minutes=rng.randint(0, 1439))
        roll = rng.random()
        if roll < 0.08:
            query, result_id = rng.choice(UNMET_SEARCH_TERMS), 'none'
        elif roll < 0.11:
            query, result_id = typo(rng.choice(item_names).lower()) if item_names else 'biryani', 'none'
        else:
            _, query, result_id = rng.choice(hits)
        clicked = result_id != 'none' and rng.random() < 0.45
        logs.append(SearchLog(
            session_id=f"{SEARCH_SESSION_PREFIX}{rng.getrandbits(48):012x}", query_text=query[:255],
            result_type='all', result_id=result_id[:64], clicked=clicked, created_at=created,
        ))

    # The trending term: a spike over the last ten days.
    for n in range(max(30, volume // 25)):
        created = now - datetime.timedelta(days=rng.uniform(0, 10))
        logs.append(SearchLog(
            session_id=f"{SEARCH_SESSION_PREFIX}{rng.getrandbits(48):012x}", query_text=TRENDING_SEARCH_TERM,
            result_type='all', result_id='none', clicked=False, created_at=created,
        ))

    with historical_timestamps(SearchLog, 'created_at'):
        SearchLog.objects.bulk_create(logs, batch_size=BATCH)
    return len(logs)


def enrich_all(seed=42, scale=1.0, log=print):
    summary = {}
    log("  coordinates...")
    summary['coordinates_moved'] = enrich_coordinates()
    log("  promotions...")
    summary.update(enrich_promotions(seed))
    log("  order lifecycles...")
    summary['status_history_rows'] = enrich_order_lifecycles()
    log("  attendance...")
    summary.update(enrich_attendance())
    log("  search logs...")
    summary['search_logs'] = enrich_search_logs(seed, max(500, int(20_000 * scale)))
    return summary
