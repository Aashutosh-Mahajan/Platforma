"""Pure transform functions (PRD §8.2 stage 4) — no DB access, easy to
unit-test in isolation from the extract/load plumbing around them.
"""
import datetime
import re

# Diwali/festival window used consistently across datagen and the ETL so
# the warehouse's festival_flag actually lines up with what was planted.
FESTIVAL_MONTHS = (10, 11)

DAY_PART_BOUNDARIES = [
    (5, 11, 'breakfast'),
    (11, 15, 'lunch'),
    (15, 18, 'afternoon'),
    (18, 22, 'evening'),
    (22, 24, 'late_night'),
    (0, 5, 'late_night'),
]
PEAK_HOURS = {12, 13, 19, 20}


def is_weekend(d: datetime.date) -> bool:
    return d.weekday() >= 5


def festival_flag(d: datetime.date) -> bool:
    return d.month in FESTIVAL_MONTHS


def day_part(hour: int) -> str:
    for lo, hi, name in DAY_PART_BOUNDARIES:
        if lo <= hour < hi:
            return name
    return 'late_night'


def is_peak_hour(hour: int) -> bool:
    return hour in PEAK_HOURS


def minute_band(minute: int) -> int:
    return (minute // 15) * 15


def lead_time_days(booked_at: datetime.datetime, event_at: datetime.datetime) -> float:
    return max(0.0, (event_at - booked_at).total_seconds() / 86400)


def basket_size(order_items) -> int:
    return sum(item.quantity for item in order_items)


def discretize_order_value(total, bin_edges):
    """PRD §8.2: 'discretise order value into LOW|MEDIUM|HIGH|PREMIUM
    (equal-frequency bins recomputed monthly)'. `bin_edges` is the
    3-tuple of quantile boundaries computed by the caller for the current
    month's data (see load.py) — kept as a pure function here so the
    binning logic itself has no DB dependency.
    """
    lo, mid, hi = bin_edges
    total = float(total)
    if total <= lo:
        return 'LOW'
    if total <= mid:
        return 'MEDIUM'
    if total <= hi:
        return 'HIGH'
    return 'PREMIUM'


def price_band(price: float) -> str:
    if price < 200:
        return 'budget'
    if price < 400:
        return 'mid'
    return 'premium'


def rating_band(rating: float) -> str:
    if rating is None:
        return 'unrated'
    rating = float(rating)
    if rating < 3.0:
        return 'low'
    if rating < 4.0:
        return 'mid'
    if rating < 4.5:
        return 'high'
    return 'top'


def tenure_band(days_since_signup: int) -> str:
    if days_since_signup < 30:
        return 'new'
    if days_since_signup < 180:
        return 'growing'
    if days_since_signup < 545:
        return 'established'
    return 'loyal'


def capacity_band(capacity) -> str:
    if capacity is None:
        return 'unknown'
    if capacity < 500:
        return 'small'
    if capacity < 2000:
        return 'medium'
    return 'large'


def density_band(restaurant_count: int) -> str:
    if restaurant_count < 5:
        return 'low'
    if restaurant_count < 20:
        return 'medium'
    return 'high'


def restaurant_area(restaurant) -> str:
    """The locality a restaurant belongs to: its `area` field when set,
    else the first comma-separated part of its address.
    """
    area = (getattr(restaurant, 'area', '') or '').strip()
    if not area:
        area = (restaurant.address or '').split(',')[0].strip()
    return area[:100]


_WHITESPACE = re.compile(r'\s+')
_NON_WORD = re.compile(r"[^\w\s&'-]")


def normalize_query(text: str) -> str:
    """Lower-cased, punctuation-stripped, whitespace-collapsed search text,
    so 'Biryani!', 'biryani' and '  BIRYANI ' count as one term.
    """
    text = _NON_WORD.sub(' ', (text or '').lower())
    return _WHITESPACE.sub(' ', text).strip()


def search_has_results(result_id: str):
    """SearchLog.result_id holds the first hit ('restaurant:12'), or 'none'
    when the search found nothing. Rows logged before that convention
    existed carry '' and are unknown (None), not zero-result.
    """
    if not result_id:
        return None
    return result_id != 'none'


_ZESTY_KINDS = {'restaurants', 'menu', 'menu_items'}
_EVENTRA_KINDS = {'events'}


def search_vertical(scope: str, result_id: str) -> str:
    """Which vertical a search belongs to: where its first hit was
    ('restaurants:12' -> zesty), else the scope it was limited to, else
    'unknown' (an 'all' search that found nothing could be either).
    """
    kind = (result_id or '').split(':')[0] if result_id and result_id != 'none' else ''
    for value in (kind, scope or ''):
        if value in _ZESTY_KINDS:
            return 'zesty'
        if value in _EVENTRA_KINDS:
            return 'eventra'
    return 'unknown'
