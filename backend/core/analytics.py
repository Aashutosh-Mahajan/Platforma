"""Business analytics API.

Every endpoint here reads the operational tables directly (like
AdminAnalyticsOverviewView) so the numbers are right from day one, without
waiting for a warehouse ETL run.

All endpoints accept `?range=7d|30d|90d|12m|all` (default 12m). For bounded
ranges each headline metric also carries the value for the preceding window
of the same length, so the UI can show period-over-period change.

Conventions:
  * Revenue excludes cancelled orders/bookings.
  * Rates are percentages (0-100). Any ratio whose denominator is zero is
    returned as null — "no data" is different from "0%".
  * Money is returned as float rupees.
"""
from collections import Counter, defaultdict
from datetime import datetime, timedelta

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db.models import Avg, Count, DecimalField, ExpressionWrapper, F, Min, Q, Sum
from django.db.models.functions import ExtractHour, ExtractIsoWeekDay, TruncDay, TruncMonth, TruncWeek
from django.utils import timezone
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.admin_views import IsPlatformAdmin
from core.models import SearchLog
from eventra.models import Booking, BookingSeat, Event, EventReview, Ticket
from zesty.models import MenuItem, Order, OrderItem, Payout, Restaurant, Review

User = get_user_model()

RANGES = {'7d': 7, '30d': 30, '90d': 90, '12m': 365, 'all': None}
WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
DAYPARTS = [
    ('Breakfast', range(6, 11)),
    ('Lunch', range(11, 15)),
    ('Snacks', range(15, 19)),
    ('Dinner', range(19, 23)),
    ('Late night', [23, 0, 1, 2, 3, 4, 5]),
]
TRUNC = {'day': TruncDay, 'week': TruncWeek, 'month': TruncMonth}
PAYMENT_LABELS = {
    'card': 'card', 'credit_card': 'card', 'debit_card': 'card',
    'cod': 'cash_on_delivery', 'cash': 'cash_on_delivery',
    'upi': 'upi', 'wallet': 'wallet', 'net_banking': 'net_banking', 'netbanking': 'net_banking',
}
NO_CITY = 'City not set'


def payment_label(method):
    method = (method or '').strip().lower()
    return PAYMENT_LABELS.get(method, method or 'unknown')


# --------------------------------------------------------------------------
# Small helpers
# --------------------------------------------------------------------------

def _f(value):
    return float(value or 0)


def _ratio(num, den, scale=1.0, digits=2):
    return round(num / den * scale, digits) if den else None


def _pct(num, den):
    return _ratio(num, den, 100, 1)


def _tz():
    return timezone.get_current_timezone()


class Window:
    """The requested reporting period, plus the equal-length period before it."""

    def __init__(self, key, start, end, prev_start, granularity):
        self.key = key
        self.start = start
        self.end = end
        self.prev_start = prev_start
        self.granularity = granularity

    @property
    def comparable(self):
        return self.start is not None

    def current(self, qs, field):
        if self.start:
            qs = qs.filter(**{f'{field}__gte': self.start})
        return qs.filter(**{f'{field}__lte': self.end})

    def previous(self, qs, field):
        if not self.start:
            return None
        return qs.filter(**{f'{field}__gte': self.prev_start, f'{field}__lt': self.start})

    def as_dict(self):
        return {
            'range': self.key,
            'granularity': self.granularity,
            'start': self.start,
            'end': self.end,
            'previous_start': self.prev_start,
        }


def get_window(request):
    key = request.query_params.get('range', '12m')
    if key not in RANGES:
        key = '12m'
    days = RANGES[key]
    now = timezone.now()
    if days is None:
        return Window(key, None, now, None, 'month')
    start = now - timedelta(days=days)
    return Window(key, start, now, start - timedelta(days=days), 'day' if days <= 90 else 'week')


def build_kpis(current, previous, kinds, snapshot=()):
    """Pair each current value with its previous-period value.

    `snapshot` metrics describe current state (e.g. seats sold right now),
    so they get no comparison.
    """
    out = {}
    for key, kind in kinds.items():
        prev = None if (previous is None or key in snapshot) else previous.get(key)
        out[key] = {'value': current.get(key), 'previous': prev, 'kind': kind}
    return out


def _bucket_start(day, granularity):
    if granularity == 'week':
        return day - timedelta(days=day.weekday())
    if granularity == 'month':
        return day.replace(day=1)
    return day


def _next_bucket(day, granularity):
    if granularity == 'day':
        return day + timedelta(days=1)
    if granularity == 'week':
        return day + timedelta(days=7)
    return (day.replace(day=28) + timedelta(days=4)).replace(day=1)


def _bucket_label(day, granularity):
    if granularity == 'month':
        return day.strftime('%b %Y')
    return f'{day.day} {day.strftime("%b")}'


def bucket_keys(window, earliest):
    end = timezone.localtime(window.end, _tz()).date()
    if window.start:
        start = timezone.localtime(window.start, _tz()).date()
    elif earliest:
        start = timezone.localtime(earliest, _tz()).date()
    else:
        start = end
    key = _bucket_start(start, window.granularity)
    keys = []
    while key <= end:
        keys.append(key)
        key = _next_bucket(key, window.granularity)
    return keys


def grouped_by_bucket(qs, field, granularity, value_field, extra=None):
    """{bucket_date: {'value': sum(value_field), 'count': n, **extra sums}}"""
    annotations = {'v': Sum(value_field), 'n': Count('id', distinct=True)}
    for name, expr in (extra or {}).items():
        annotations[name] = expr
    rows = (
        qs.order_by()
        .annotate(b=TRUNC[granularity](field, tzinfo=_tz()))
        .values('b')
        .annotate(**annotations)
    )
    out = {}
    for row in rows:
        bucket = row['b']
        day = bucket.date() if isinstance(bucket, datetime) else bucket
        out[day] = {'value': _f(row['v']), 'count': row['n'], **{k: _f(row[k]) for k in (extra or {})}}
    return out


def hour_weekday_rows(qs, field, value_field):
    return (
        qs.order_by()
        .annotate(wd=ExtractIsoWeekDay(field, tzinfo=_tz()), h=ExtractHour(field, tzinfo=_tz()))
        .values('wd', 'h')
        .annotate(n=Count('id'), v=Sum(value_field))
    )


def time_profile(rows):
    """Turn weekday×hour rows into a heatmap, weekday totals and daypart totals."""
    heatmap = [[0] * 24 for _ in range(7)]
    weekdays = [{'label': d, 'count': 0, 'value': 0.0} for d in WEEKDAYS]
    dayparts = {name: {'label': name, 'count': 0, 'value': 0.0} for name, _ in DAYPARTS}
    for row in rows:
        wd, hour, n, value = row['wd'] - 1, row['h'], row['n'], _f(row['v'])
        heatmap[wd][hour] += n
        weekdays[wd]['count'] += n
        weekdays[wd]['value'] += value
        for name, hours in DAYPARTS:
            if hour in hours:
                dayparts[name]['count'] += n
                dayparts[name]['value'] += value
                break
    return {'heatmap': heatmap, 'weekdays': weekdays, 'dayparts': list(dayparts.values())}


def status_mix(qs):
    return {row['status']: row['n'] for row in qs.order_by().values('status').annotate(n=Count('id'))}


# --------------------------------------------------------------------------
# Zesty
# --------------------------------------------------------------------------

ZESTY_KINDS = {
    'gmv': 'money',
    'orders': 'count',
    'aov': 'money',
    'items_per_order': 'number',
    'customers': 'count',
    'repeat_rate': 'rate',
    'cancellation_rate': 'rate_inverse',
    'completion_rate': 'rate',
    'discount_spend': 'money_inverse',
    'promo_share': 'rate',
    'commission': 'money',
    'cod_share': 'rate',
    'active_restaurants': 'count',
}

COMMISSION_EXPR = ExpressionWrapper(
    F('subtotal') * F('restaurant__commission_rate') / 100,
    output_field=DecimalField(max_digits=16, decimal_places=4),
)


def zesty_numbers(orders):
    """Headline order metrics in three queries (the DB is remote, so round
    trips dominate): one conditional aggregate, one item count, one list of
    customer ids."""
    orders = orders.order_by()
    live_q = ~Q(status='cancelled')
    agg = orders.aggregate(
        all_n=Count('id'),
        n=Count('id', filter=live_q),
        cancelled=Count('id', filter=Q(status='cancelled')),
        delivered=Count('id', filter=Q(status='delivered')),
        gmv=Sum('total', filter=live_q),
        discount=Sum('discount', filter=live_q),
        commission=Sum(COMMISSION_EXPR, filter=live_q),
        promo=Count('id', filter=live_q & ~Q(promo_code='')),
        cod=Count('id', filter=live_q & Q(payment_method='cod')),
        restaurants=Count('restaurant', distinct=True, filter=live_q),
    )
    live = orders.filter(live_q)
    n = agg['n'] or 0
    gmv = _f(agg['gmv'])
    items = OrderItem.objects.filter(order__in=live).aggregate(q=Sum('quantity'))['q'] or 0
    per_user = Counter(live.values_list('user_id', flat=True))
    customers = len(per_user)
    return {
        'gmv': gmv,
        'orders': n,
        'aov': _ratio(gmv, n),
        'items_per_order': _ratio(items, n),
        'customers': customers,
        'repeat_rate': _pct(sum(1 for c in per_user.values() if c >= 2), customers),
        'cancellation_rate': _pct(agg['cancelled'], agg['all_n']),
        'completion_rate': _pct(agg['delivered'], agg['delivered'] + agg['cancelled']),
        'discount_spend': _f(agg['discount']),
        'promo_share': _pct(agg['promo'], n),
        'commission': round(_f(agg['commission']), 2),
        'cod_share': _pct(agg['cod'], n),
        'active_restaurants': agg['restaurants'],
        '_users': per_user,
        '_cancelled': agg['cancelled'],
    }


def _merge_payment_rows(rows, field, into=None):
    merged = into if into is not None else defaultdict(lambda: {'count': 0, 'value': 0.0})
    for r in rows:
        key = payment_label(r[field])
        merged[key]['count'] += r['n']
        merged[key]['value'] += _f(r['v'])
    if into is not None:
        return merged
    return sorted([{'label': k, **v} for k, v in merged.items()], key=lambda r: r['count'], reverse=True)


def _primary_cuisine(cuisine, cuisine_types):
    if cuisine:
        return cuisine.strip()
    first = (cuisine_types or '').split(',')[0].strip()
    return first or 'Other'


def zesty_sections(orders, window, *, include_restaurants=True):
    orders = orders.order_by()
    live = orders.exclude(status='cancelled')
    earliest = orders.aggregate(m=Min('created_at'))['m']

    by_bucket = grouped_by_bucket(live, 'created_at', window.granularity, 'total', {'discount': Sum('discount')})
    series = []
    for key in bucket_keys(window, earliest):
        row = by_bucket.get(key, {})
        series.append({
            'date': key,
            'label': _bucket_label(key, window.granularity),
            'gmv': row.get('value', 0.0),
            'orders': row.get('count', 0),
            'discount': row.get('discount', 0.0),
        })

    items = OrderItem.objects.filter(order__in=live).order_by()
    top_dishes = [
        {
            'id': r['menu_item__id'],
            'name': r['menu_item__name'],
            'restaurant': r['menu_item__restaurant__name'],
            'category': r['menu_item__category'],
            'is_vegetarian': r['menu_item__is_vegetarian'],
            'quantity': r['qty'] or 0,
            'revenue': _f(r['revenue']),
            'orders': r['orders'],
        }
        for r in items.values(
            'menu_item__id', 'menu_item__name', 'menu_item__restaurant__name',
            'menu_item__category', 'menu_item__is_vegetarian',
        ).annotate(qty=Sum('quantity'), revenue=Sum('total'), orders=Count('order', distinct=True)).order_by('-revenue')[:10]
    ]
    categories = [
        {'label': r['menu_item__category'] or 'Uncategorised', 'value': _f(r['revenue']), 'count': r['qty'] or 0}
        for r in items.values('menu_item__category').annotate(revenue=Sum('total'), qty=Sum('quantity')).order_by('-revenue')[:8]
    ]
    veg = {True: 0, False: 0}
    for r in items.values('menu_item__is_vegetarian').annotate(q=Sum('quantity')):
        veg[bool(r['menu_item__is_vegetarian'])] += r['q'] or 0

    basket = Counter()
    for q in live.annotate(q=Sum('items__quantity')).values_list('q', flat=True):
        q = q or 0
        basket['1 item' if q <= 1 else '2 items' if q == 2 else '3–4 items' if q <= 4 else '5+ items'] += 1

    # New vs returning: an order is "new" when it is the customer's first
    # non-cancelled order ever.
    firsts = dict(
        Order.objects.exclude(status='cancelled')
        .filter(user_id__in=live.values('user_id'))
        .order_by().values('user_id').annotate(f=Min('created_at')).values_list('user_id', 'f')
    )
    new_orders = returning_orders = 0
    new_value = returning_value = 0.0
    for user_id, created, total in live.values_list('user_id', 'created_at', 'total'):
        if firsts.get(user_id) == created:
            new_orders += 1
            new_value += _f(total)
        else:
            returning_orders += 1
            returning_value += _f(total)

    cuisines = defaultdict(lambda: {'value': 0.0, 'count': 0})
    for r in live.values('restaurant__cuisine', 'restaurant__cuisine_types').annotate(v=Sum('total'), n=Count('id')):
        key = _primary_cuisine(r['restaurant__cuisine'], r['restaurant__cuisine_types'])
        cuisines[key]['value'] += _f(r['v'])
        cuisines[key]['count'] += r['n']

    data = {
        'series': series,
        'status_mix': status_mix(orders),
        'top_dishes': top_dishes,
        'categories': categories,
        'veg_split': {'veg': veg[True], 'non_veg': veg[False]},
        'basket_sizes': [{'label': k, 'count': basket.get(k, 0)} for k in ('1 item', '2 items', '3–4 items', '5+ items')],
        'customer_mix': {
            'new_orders': new_orders, 'returning_orders': returning_orders,
            'new_value': round(new_value, 2), 'returning_value': round(returning_value, 2),
        },
        'cuisines': sorted(
            [{'label': k, **v} for k, v in cuisines.items()], key=lambda r: r['value'], reverse=True
        )[:8],
        'payment_methods': _merge_payment_rows(live.values('payment_method').annotate(n=Count('id'), v=Sum('total')), 'payment_method'),
        'promo_codes': [
            {'code': r['promo_code'], 'orders': r['n'], 'discount': _f(r['d']), 'revenue': _f(r['v'])}
            for r in live.exclude(promo_code='').values('promo_code')
            .annotate(n=Count('id'), d=Sum('discount'), v=Sum('total')).order_by('-n')[:8]
        ],
        **time_profile(hour_weekday_rows(live, 'created_at', 'total')),
    }

    if include_restaurants:
        data['top_restaurants'] = [
            {
                'id': r['restaurant_id'],
                'name': r['restaurant__name'],
                'city': r['restaurant__city'],
                'rating': _f(r['restaurant__rating']),
                'revenue': _f(r['revenue']),
                'orders': r['n'],
                'aov': _ratio(_f(r['revenue']), r['n']),
                'cancellation_rate': _pct(r['cancelled'], r['all']),
            }
            for r in orders.values('restaurant_id', 'restaurant__name', 'restaurant__city', 'restaurant__rating')
            .annotate(
                revenue=Sum('total', filter=~Q(status='cancelled')),
                n=Count('id', filter=~Q(status='cancelled')),
                cancelled=Count('id', filter=Q(status='cancelled')),
                all=Count('id'),
            ).order_by(F('revenue').desc(nulls_last=True))[:10]
        ]
        data['cities'] = [
            {'label': r['restaurant__city'] or NO_CITY, 'value': _f(r['v']), 'count': r['n']}
            for r in live.values('restaurant__city').annotate(v=Sum('total'), n=Count('id')).order_by('-v')[:8]
        ]
        data['price_tiers'] = [
            {'label': '₹' * (r['restaurant__price_range'] or 1), 'value': _f(r['v']), 'count': r['n']}
            for r in live.values('restaurant__price_range').annotate(v=Sum('total'), n=Count('id')).order_by('restaurant__price_range')
        ]
    return data


def zesty_catalog(window, live_orders):
    restaurants = Restaurant.objects.order_by()
    active = restaurants.filter(is_active=True)
    ordered_ids = live_orders.values('restaurant_id')
    items = MenuItem.objects.order_by()
    item_count = items.count()
    return {
        'restaurants': restaurants.count(),
        'active': active.count(),
        'verified': restaurants.filter(is_verified=True).count(),
        'pending_verification': restaurants.filter(is_verified=False).count(),
        'open_now': active.filter(is_open=True).count(),
        'without_orders': active.exclude(id__in=ordered_ids).count(),
        'menu_items': item_count,
        'menu_available_rate': _pct(items.filter(is_available=True).count(), item_count),
        'avg_rating': round(_f(active.filter(review_count__gt=0).aggregate(a=Avg('rating'))['a']), 2) or None,
    }


# --------------------------------------------------------------------------
# Eventra
# --------------------------------------------------------------------------

EVENTRA_KINDS = {
    'revenue': 'money',
    'bookings': 'count',
    'tickets': 'count',
    'avg_ticket_price': 'money',
    'avg_booking_value': 'money',
    'customers': 'count',
    'repeat_rate': 'rate',
    'cancellation_rate': 'rate_inverse',
    'avg_lead_days': 'days',
    'checkin_rate': 'rate',
    'sell_through': 'rate',
}
EVENTRA_SNAPSHOT = ('sell_through',)


def eventra_numbers(bookings, events, *, with_snapshot=True):
    bookings = bookings.order_by()
    live_q = ~Q(status='cancelled')
    agg = bookings.aggregate(
        all_n=Count('id'),
        n=Count('id', filter=live_q),
        cancelled=Count('id', filter=Q(status='cancelled')),
        rev=Sum('total', filter=live_q),
        tickets=Sum('total_tickets', filter=live_q),
    )
    n = agg['n'] or 0
    revenue = _f(agg['rev'])
    tickets = agg['tickets'] or 0
    rows = list(bookings.filter(live_q).values_list('user_id', 'booking_date', 'event__event_date'))
    per_user = Counter(r[0] for r in rows)
    leads = [
        (event_date - booked).total_seconds() / 86400
        for _, booked, event_date in rows
        if event_date and booked and event_date >= booked
    ]
    checkin = Ticket.objects.filter(
        booking__in=bookings.filter(live_q), booking__event__event_date__lt=timezone.now()
    ).aggregate(issued=Count('id'), scanned=Count('id', filter=Q(is_scanned=True)))
    sell_through = None
    if with_snapshot:
        seats = events.filter(is_cancelled=False, total_seats__gt=0).aggregate(t=Sum('total_seats'), a=Sum('available_seats'))
        seat_total = seats['t'] or 0
        sell_through = _pct(seat_total - (seats['a'] or 0), seat_total)
    return {
        'revenue': revenue,
        'bookings': n,
        'tickets': tickets,
        'avg_ticket_price': _ratio(revenue, tickets),
        'avg_booking_value': _ratio(revenue, n),
        'customers': len(per_user),
        'repeat_rate': _pct(sum(1 for c in per_user.values() if c >= 2), len(per_user)),
        'cancellation_rate': _pct(agg['cancelled'], agg['all_n']),
        'avg_lead_days': round(sum(leads) / len(leads), 1) if leads else None,
        'checkin_rate': _pct(checkin['scanned'], checkin['issued']),
        'sell_through': sell_through,
        '_users': per_user,
        '_cancelled': agg['cancelled'],
    }


def eventra_sections(bookings, events, window, *, include_organizers=True):
    bookings = bookings.order_by()
    live = bookings.exclude(status='cancelled')
    earliest = bookings.aggregate(m=Min('booking_date'))['m']
    now = timezone.now()

    by_bucket = grouped_by_bucket(live, 'booking_date', window.granularity, 'total', {'tickets': Sum('total_tickets')})
    series = []
    for key in bucket_keys(window, earliest):
        row = by_bucket.get(key, {})
        series.append({
            'date': key,
            'label': _bucket_label(key, window.granularity),
            'revenue': row.get('value', 0.0),
            'bookings': row.get('count', 0),
            'tickets': int(row.get('tickets', 0)),
        })

    event_counts = dict(events.order_by().values('category').annotate(n=Count('id')).values_list('category', 'n'))
    categories = [
        {
            'label': r['event__category'],
            'value': _f(r['v']),
            'count': r['n'],
            'tickets': r['t'] or 0,
            'events': event_counts.get(r['event__category'], 0),
        }
        for r in live.values('event__category').annotate(v=Sum('total'), n=Count('id'), t=Sum('total_tickets')).order_by('-v')
    ]

    top_events = []
    for r in (
        bookings.values(
            'event_id', 'event__name', 'event__category', 'event__event_date', 'event__venue_name',
            'event__venue__city', 'event__total_seats', 'event__available_seats', 'event__rating', 'event__review_count',
        )
        .annotate(
            revenue=Sum('total', filter=~Q(status='cancelled')),
            n=Count('id', filter=~Q(status='cancelled')),
            tickets=Sum('total_tickets', filter=~Q(status='cancelled')),
            cancelled=Count('id', filter=Q(status='cancelled')),
            all=Count('id'),
        ).order_by(F('revenue').desc(nulls_last=True))[:10]
    ):
        total = r['event__total_seats'] or 0
        top_events.append({
            'id': r['event_id'],
            'name': r['event__name'],
            'category': r['event__category'],
            'date': r['event__event_date'],
            'venue': r['event__venue_name'],
            'city': r['event__venue__city'],
            'revenue': _f(r['revenue']),
            'bookings': r['n'],
            'tickets': r['tickets'] or 0,
            'sell_through': _pct(total - (r['event__available_seats'] or 0), total),
            'cancellation_rate': _pct(r['cancelled'], r['all']),
            'rating': _f(r['event__rating']) if r['event__review_count'] else None,
        })

    tiers = [
        {'label': r['seat__ticket_type__name'], 'count': r['n'], 'value': _f(r['v'])}
        for r in BookingSeat.objects.filter(booking__in=live).order_by()
        .values('seat__ticket_type__name').annotate(n=Count('id'), v=Sum('seat__ticket_type__price')).order_by('-n')[:8]
    ]

    lead = Counter()
    for booked, event_date in live.values_list('booking_date', 'event__event_date'):
        if not (booked and event_date):
            continue
        days = (event_date - booked).total_seconds() / 86400
        lead['Same day' if days < 1 else '1–3 days' if days < 4 else '4–7 days' if days < 8 else '1–4 weeks' if days < 31 else '1 month+'] += 1

    event_weekdays = [{'label': d, 'count': 0, 'value': 0.0} for d in WEEKDAYS]
    for r in live.annotate(wd=ExtractIsoWeekDay('event__event_date', tzinfo=_tz())).values('wd').annotate(n=Count('id'), v=Sum('total')):
        event_weekdays[r['wd'] - 1]['count'] += r['n']
        event_weekdays[r['wd'] - 1]['value'] += _f(r['v'])

    upcoming = []
    for e in (
        events.filter(event_date__gte=now, event_date__lte=now + timedelta(days=60), is_cancelled=False)
        .annotate(
            n=Count('bookings', filter=~Q(bookings__status='cancelled')),
            v=Sum('bookings__total', filter=~Q(bookings__status='cancelled')),
        )
        .order_by('event_date')[:8]
    ):
        upcoming.append({
            'id': e.id,
            'name': e.name,
            'category': e.category,
            'date': e.event_date,
            'days_out': (e.event_date - now).days,
            'bookings': e.n,
            'revenue': _f(e.v),
            'total_seats': e.total_seats,
            'sell_through': _pct(e.total_seats - e.available_seats, e.total_seats),
            'is_published': e.is_published,
            'is_approved': e.is_approved,
        })

    ratings = dict(
        EventReview.objects.filter(event__in=events).order_by().values('rating').annotate(n=Count('id')).values_list('rating', 'n')
    )

    data = {
        'series': series,
        'status_mix': status_mix(bookings),
        'categories': categories,
        'top_events': top_events,
        'tiers': tiers,
        'lead_times': [{'label': k, 'count': lead.get(k, 0)} for k in ('Same day', '1–3 days', '4–7 days', '1–4 weeks', '1 month+')],
        'event_weekdays': event_weekdays,
        'upcoming': upcoming,
        'rating_distribution': [{'label': f'{s}★', 'count': ratings.get(s, 0)} for s in (5, 4, 3, 2, 1)],
        **time_profile(hour_weekday_rows(live, 'booking_date', 'total')),
    }
    if include_organizers:
        data['organizers'] = [
            {
                'id': r['event__organizer_id'],
                'name': (r['event__organizer__company_name']
                         or f"{r['event__organizer__first_name']} {r['event__organizer__last_name']}".strip()
                         or r['event__organizer__email']),
                'revenue': _f(r['v']),
                'bookings': r['n'],
                'events': r['e'],
            }
            for r in live.values(
                'event__organizer_id', 'event__organizer__company_name', 'event__organizer__first_name',
                'event__organizer__last_name', 'event__organizer__email',
            ).annotate(v=Sum('total'), n=Count('id'), e=Count('event', distinct=True)).order_by('-v')[:8]
        ]
        data['cities'] = [
            {'label': r['event__venue__city'] or NO_CITY, 'value': _f(r['v']), 'count': r['n']}
            for r in live.values('event__venue__city').annotate(v=Sum('total'), n=Count('id')).order_by('-v')[:8]
        ]
    return data


def eventra_inventory(events):
    now = timezone.now()
    events = events.order_by()
    live = events.filter(is_cancelled=False)
    return {
        'events': events.count(),
        'upcoming': live.filter(event_date__gte=now).count(),
        'next_30_days': live.filter(event_date__gte=now, event_date__lte=now + timedelta(days=30)).count(),
        'on_sale': live.filter(event_date__gte=now, is_published=True, is_approved=True, total_seats__gt=0).count(),
        'drafts': live.filter(is_published=False).count(),
        'pending_approval': live.filter(is_approved=False).count(),
        'without_seats': live.filter(event_date__gte=now, total_seats=0).count(),
        'cancelled': events.filter(is_cancelled=True).count(),
        'past': live.filter(event_date__lt=now).count(),
    }


# --------------------------------------------------------------------------
# Admin endpoints
# --------------------------------------------------------------------------

PLATFORM_KINDS = {
    'gmv': 'money',
    'zesty_gmv': 'money',
    'eventra_gmv': 'money',
    'commission': 'money',
    'transactions': 'count',
    'aov': 'money',
    'active_customers': 'count',
    'new_signups': 'count',
    'repeat_rate': 'rate',
    'cross_vertical_rate': 'rate',
    'cancellation_rate': 'rate_inverse',
    'discount_spend': 'money_inverse',
}


def platform_numbers(orders, bookings, users):
    z = zesty_numbers(orders)
    e = eventra_numbers(bookings, None, with_snapshot=False)
    per_user = z['_users'] + e['_users']
    active = len(per_user)
    both = set(z['_users']) & set(e['_users'])
    gmv = z['gmv'] + e['revenue']
    transactions = z['orders'] + e['bookings']
    cancelled = z['_cancelled'] + e['_cancelled']
    tx_all = transactions + cancelled
    return {
        'gmv': gmv,
        'zesty_gmv': z['gmv'],
        'eventra_gmv': e['revenue'],
        'commission': z['commission'],
        'transactions': transactions,
        'aov': _ratio(gmv, transactions),
        'active_customers': active,
        'new_signups': users.count(),
        'repeat_rate': _pct(sum(1 for c in per_user.values() if c >= 2), active),
        'cross_vertical_rate': _pct(len(both), active),
        'cancellation_rate': _pct(cancelled, tx_all),
        'discount_spend': z['discount_spend'],
    }


CACHE_SECONDS = 60


def cached(view_get):
    """Cache a report for a minute per URL + user. The operational DB is
    remote, so re-opening a tab or flipping back to a range shouldn't pay
    for the whole report again."""
    def wrapper(self, request, *args, **kwargs):
        key = 'analytics:%s:%s:%s' % (request.user.pk, request.get_full_path(), kwargs.get('pk', ''))
        data = cache.get(key)
        if data is None:
            data = view_get(self, request, *args, **kwargs).data
            cache.set(key, data, CACHE_SECONDS)
        return Response(data)
    return wrapper


class PlatformAnalyticsView(APIView):
    """GET /api/v1/analytics/platform — the whole business across both verticals."""
    permission_classes = [IsPlatformAdmin]

    @cached
    def get(self, request):
        w = get_window(request)
        orders, bookings, users = Order.objects.all(), Booking.objects.all(), User.objects.all()

        cur = platform_numbers(w.current(orders, 'created_at'), w.current(bookings, 'booking_date'), w.current(users, 'date_joined'))
        prev = (
            platform_numbers(w.previous(orders, 'created_at'), w.previous(bookings, 'booking_date'), w.previous(users, 'date_joined'))
            if w.comparable else None
        )

        cur_o = w.current(orders, 'created_at').order_by()
        cur_b = w.current(bookings, 'booking_date').order_by()
        cur_u = w.current(users, 'date_joined').order_by()
        live_o = cur_o.exclude(status='cancelled')
        live_b = cur_b.exclude(status='cancelled')

        earliest = min(
            [d for d in (orders.aggregate(m=Min('created_at'))['m'], bookings.aggregate(m=Min('booking_date'))['m']) if d],
            default=None,
        )
        z_b = grouped_by_bucket(live_o, 'created_at', w.granularity, 'total')
        e_b = grouped_by_bucket(live_b, 'booking_date', w.granularity, 'total')
        u_rows = (
            cur_u.annotate(b=TRUNC[w.granularity]('date_joined', tzinfo=_tz())).values('b').annotate(n=Count('id'))
        )
        signups = {(r['b'].date() if isinstance(r['b'], datetime) else r['b']): r['n'] for r in u_rows}
        series = []
        for key in bucket_keys(w, earliest):
            z, e = z_b.get(key, {}), e_b.get(key, {})
            series.append({
                'date': key,
                'label': _bucket_label(key, w.granularity),
                'zesty': z.get('value', 0.0),
                'eventra': e.get('value', 0.0),
                'orders': z.get('count', 0),
                'bookings': e.get('count', 0),
                'signups': signups.get(key, 0),
            })

        # Lifetime customer funnel.
        all_live_o = orders.order_by().exclude(status='cancelled')
        all_live_b = bookings.order_by().exclude(status='cancelled')
        lifetime = Counter(all_live_o.values_list('user_id', flat=True))
        lifetime.update(all_live_b.values_list('user_id', flat=True))
        both = set(all_live_o.values_list('user_id', flat=True)) & set(all_live_b.values_list('user_id', flat=True))
        funnel = [
            {'label': 'Registered customers', 'count': users.filter(role='customer').count()},
            {'label': 'Made a purchase', 'count': len(lifetime)},
            {'label': 'Came back again', 'count': sum(1 for c in lifetime.values() if c >= 2)},
            {'label': 'Used both Zesty and Eventra', 'count': len(both)},
        ]

        # Payment methods across both verticals.
        methods = defaultdict(lambda: {'count': 0, 'value': 0.0})
        _merge_payment_rows(live_o.values('payment_method').annotate(n=Count('id'), v=Sum('total')), 'payment_method', methods)
        _merge_payment_rows(live_b.values('payment__method').annotate(n=Count('id'), v=Sum('total')), 'payment__method', methods)

        profile_o = time_profile(hour_weekday_rows(live_o, 'created_at', 'total'))
        profile_b = time_profile(hour_weekday_rows(live_b, 'booking_date', 'total'))
        heatmap = [[profile_o['heatmap'][d][h] + profile_b['heatmap'][d][h] for h in range(24)] for d in range(7)]

        regions = defaultdict(lambda: {'zesty': 0.0, 'eventra': 0.0, 'count': 0})
        for r in live_o.values('restaurant__city').annotate(v=Sum('total'), n=Count('id')):
            key = r['restaurant__city'] or NO_CITY
            regions[key]['zesty'] += _f(r['v'])
            regions[key]['count'] += r['n']
        for r in live_b.values('event__venue__city').annotate(v=Sum('total'), n=Count('id')):
            key = r['event__venue__city'] or NO_CITY
            regions[key]['eventra'] += _f(r['v'])
            regions[key]['count'] += r['n']

        now = timezone.now()
        pending_payouts = Payout.objects.filter(status='pending').aggregate(n=Count('id'), v=Sum('net_amount'))
        health = {
            'pending_restaurants': Restaurant.objects.filter(is_verified=False).count(),
            'pending_events': Event.objects.filter(is_approved=False, is_cancelled=False).count(),
            'pending_payouts': pending_payouts['n'] or 0,
            'pending_payout_amount': _f(pending_payouts['v']),
            'stale_orders': Order.objects.filter(
                status__in=['pending', 'confirmed'], created_at__lt=now - timedelta(hours=2)
            ).count(),
            'events_without_seats': Event.objects.filter(
                is_cancelled=False, event_date__gte=now, total_seats=0
            ).count(),
            'suspended_users': users.filter(is_active=False).count(),
        }

        searches = w.current(SearchLog.objects.all(), 'created_at').order_by()
        search_total = searches.count()
        search = {
            'total': search_total,
            'click_rate': _pct(searches.filter(clicked=True).count(), search_total),
            'top_queries': [
                {'label': r['query_text'], 'count': r['n'], 'clicks': r['c']}
                for r in searches.values('query_text').annotate(n=Count('id'), c=Count('id', filter=Q(clicked=True))).order_by('-n')[:8]
            ],
        }

        return Response({
            'window': w.as_dict(),
            'kpis': build_kpis(cur, prev, PLATFORM_KINDS),
            'series': series,
            'signups_by_role': [
                {'label': r['role'], 'count': r['n']} for r in cur_u.values('role').annotate(n=Count('id')).order_by('-n')
            ],
            'funnel': funnel,
            'payment_methods': sorted(
                [{'label': k, **v} for k, v in methods.items()], key=lambda r: r['count'], reverse=True
            ),
            'heatmap': heatmap,
            'weekdays': [
                {'label': d, 'count': profile_o['weekdays'][i]['count'] + profile_b['weekdays'][i]['count'],
                 'value': profile_o['weekdays'][i]['value'] + profile_b['weekdays'][i]['value']}
                for i, d in enumerate(WEEKDAYS)
            ],
            'regions': sorted(
                [{'label': k, **v, 'value': v['zesty'] + v['eventra']} for k, v in regions.items()],
                key=lambda r: r['value'], reverse=True,
            )[:10],
            'health': health,
            'search': search,
        })


class ZestyAnalyticsView(APIView):
    """GET /api/v1/analytics/zesty — food delivery across every restaurant."""
    permission_classes = [IsPlatformAdmin]

    @cached
    def get(self, request):
        w = get_window(request)
        orders = Order.objects.all()
        cur_o = w.current(orders, 'created_at')
        prev_o = w.previous(orders, 'created_at')
        return Response({
            'window': w.as_dict(),
            'kpis': build_kpis(zesty_numbers(cur_o), zesty_numbers(prev_o) if w.comparable else None, ZESTY_KINDS),
            'catalog': zesty_catalog(w, cur_o.exclude(status='cancelled')),
            **zesty_sections(cur_o, w),
        })


class EventraAnalyticsView(APIView):
    """GET /api/v1/analytics/eventra — ticketing across every organizer."""
    permission_classes = [IsPlatformAdmin]

    @cached
    def get(self, request):
        w = get_window(request)
        bookings, events = Booking.objects.all(), Event.objects.all()
        cur_b = w.current(bookings, 'booking_date')
        prev_b = w.previous(bookings, 'booking_date')
        return Response({
            'window': w.as_dict(),
            'kpis': build_kpis(
                eventra_numbers(cur_b, events),
                eventra_numbers(prev_b, events) if w.comparable else None,
                EVENTRA_KINDS, EVENTRA_SNAPSHOT,
            ),
            'inventory': eventra_inventory(events),
            **eventra_sections(cur_b, events, w),
        })


# --------------------------------------------------------------------------
# Partner endpoints
# --------------------------------------------------------------------------

class RestaurantAnalyticsView(APIView):
    """GET /api/v1/analytics/restaurants/<id> — one restaurant, for its owner or an admin."""
    permission_classes = [IsAuthenticated]

    @cached
    def get(self, request, pk):
        try:
            restaurant = Restaurant.objects.get(pk=pk)
        except Restaurant.DoesNotExist:
            raise NotFound('Restaurant not found.')
        user = request.user
        if not (user.is_staff or user.role == 'admin' or restaurant.owner_id == user.id):
            raise PermissionDenied("You don't have access to this restaurant's analytics.")

        w = get_window(request)
        orders = Order.objects.filter(restaurant=restaurant)
        cur_o = w.current(orders, 'created_at')
        prev_o = w.previous(orders, 'created_at')
        live = cur_o.order_by().exclude(status='cancelled')

        sold_ids = OrderItem.objects.filter(order__in=live).values('menu_item_id')
        unsold = [
            {'id': m.id, 'name': m.name, 'category': m.category, 'price': _f(m.price)}
            for m in MenuItem.objects.filter(restaurant=restaurant, is_available=True).exclude(id__in=sold_ids).order_by('category', 'name')[:12]
        ]
        reviews = w.current(Review.objects.filter(restaurant=restaurant), 'created_at').order_by()
        ratings = dict(reviews.values('rating').annotate(n=Count('id')).values_list('rating', 'n'))
        menu = MenuItem.objects.filter(restaurant=restaurant)

        kinds = {k: v for k, v in ZESTY_KINDS.items() if k not in ('active_restaurants', 'commission')}
        kinds['commission'] = 'money_inverse'
        return Response({
            'window': w.as_dict(),
            'restaurant': {'id': restaurant.id, 'name': restaurant.name, 'commission_rate': _f(restaurant.commission_rate)},
            'kpis': build_kpis(zesty_numbers(cur_o), zesty_numbers(prev_o) if w.comparable else None, kinds),
            'menu': {
                'items': menu.count(),
                'available': menu.filter(is_available=True).count(),
                'unsold': unsold,
                'unsold_count': MenuItem.objects.filter(restaurant=restaurant, is_available=True).exclude(id__in=sold_ids).count(),
            },
            'reviews': {
                'count': reviews.count(),
                'average': round(_f(reviews.aggregate(a=Avg('rating'))['a']), 2) or None,
                'distribution': [{'label': f'{s}★', 'count': ratings.get(s, 0)} for s in (5, 4, 3, 2, 1)],
            },
            **zesty_sections(cur_o, w, include_restaurants=False),
        })


class OrganizerAnalyticsView(APIView):
    """GET /api/v1/analytics/organizer?event=<id> — an organizer's events, or one of them."""
    permission_classes = [IsAuthenticated]

    @cached
    def get(self, request):
        user = request.user
        is_admin = user.is_staff or user.role == 'admin'
        if not (is_admin or user.role == 'event_organizer'):
            raise PermissionDenied('Only event organizers can view organizer analytics.')

        if is_admin:
            organizer_id = request.query_params.get('organizer')
            events = Event.objects.filter(organizer_id=organizer_id) if organizer_id else Event.objects.all()
        else:
            events = Event.objects.filter(organizer=user)
        all_events = events
        event_id = request.query_params.get('event')
        if event_id:
            events = events.filter(pk=event_id)
            if not events.exists():
                raise NotFound('Event not found.')

        w = get_window(request)
        bookings = Booking.objects.filter(event__in=events)
        cur_b = w.current(bookings, 'booking_date')
        prev_b = w.previous(bookings, 'booking_date')

        per_event = []
        for e in all_events.annotate(
            n=Count('bookings', filter=~Q(bookings__status='cancelled')),
            v=Sum('bookings__total', filter=~Q(bookings__status='cancelled')),
            t=Sum('bookings__total_tickets', filter=~Q(bookings__status='cancelled')),
        ).order_by('-event_date'):
            per_event.append({
                'id': e.id,
                'name': e.name,
                'category': e.category,
                'date': e.event_date,
                'status': (
                    'cancelled' if e.is_cancelled
                    else 'draft' if not e.is_published
                    else 'pending' if not e.is_approved
                    else 'no_seats' if e.total_seats == 0 and e.event_date >= timezone.now()
                    else 'on_sale' if e.event_date >= timezone.now()
                    else 'ended'
                ),
                'bookings': e.n,
                'tickets': e.t or 0,
                'revenue': _f(e.v),
                'total_seats': e.total_seats,
                'sell_through': _pct(e.total_seats - e.available_seats, e.total_seats),
                'rating': _f(e.rating) if e.review_count else None,
            })

        return Response({
            'window': w.as_dict(),
            'scope': {'event': int(event_id) if event_id else None},
            'kpis': build_kpis(
                eventra_numbers(cur_b, events),
                eventra_numbers(prev_b, events) if w.comparable else None,
                EVENTRA_KINDS, EVENTRA_SNAPSHOT,
            ),
            'inventory': eventra_inventory(all_events),
            'events': per_event,
            **eventra_sections(cur_b, events, w, include_organizers=False),
        })
