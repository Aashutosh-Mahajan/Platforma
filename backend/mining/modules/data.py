"""Warehouse readers shared by the mining modules: each returns a pandas
DataFrame keyed by operational ids (customer_id, restaurant_id, event_id),
so modules never deal with surrogate keys. All joins run inside the
warehouse database.
"""
import pandas as pd
from django.utils import timezone

from warehouse.models import (
    FactOrder, FactBooking, FactOrderLifecycle, FactTicketSale, FactSearch,
    DimRestaurant, DimEvent, DimTicketType, DimVenue,
)


def _frame(qs, columns):
    """qs.values_list(*columns) -> DataFrame with short column names.
    `columns` is a list of (orm_path, name) pairs.
    """
    paths = [c[0] for c in columns]
    names = [c[1] for c in columns]
    df = pd.DataFrame.from_records(list(qs.values_list(*paths)), columns=names)
    for name in names:
        if len(df) and df[name].map(lambda v: v.__class__.__name__ == 'Decimal').any():
            df[name] = df[name].astype(float)
    return df


def today():
    return timezone.localdate()


def orders(include_future=False):
    df = _frame(FactOrder.objects.all(), [
        ('order_id', 'order_id'), ('customer__customer_id', 'customer_id'),
        ('restaurant__restaurant_id', 'restaurant_id'), ('date__full_date', 'date'),
        ('date__day_of_week', 'weekday'), ('date__is_weekend', 'is_weekend'),
        ('time__hour', 'hour'), ('time__day_part', 'day_part'),
        ('order_total', 'total'), ('item_count', 'items'), ('discount_total', 'discount'),
        ('delivery_fee', 'delivery_fee'), ('delivery_minutes', 'delivery_minutes'),
        ('failed_payments', 'failed_payments'), ('is_cancelled', 'is_cancelled'),
        ('payment__method', 'payment_method'), ('promotion__campaign_name', 'promo_code'),
        ('restaurant__rating_band', 'rating_band'), ('restaurant__price_band', 'price_band'),
    ])
    if len(df):
        df['date'] = pd.to_datetime(df['date'])
        if not include_future:
            df = df[df['date'] <= pd.Timestamp(today())]
    return df.reset_index(drop=True)


def bookings(include_future=False):
    df = _frame(FactBooking.objects.all(), [
        ('booking_id', 'booking_id'), ('customer__customer_id', 'customer_id'),
        ('event__event_id', 'event_id'), ('event__category', 'category'),
        ('event__event_date', 'event_date'), ('event__organizer_id', 'organizer_id'),
        ('date__full_date', 'date'), ('time__hour', 'hour'),
        ('booking_total', 'total'), ('seats_booked', 'seats'), ('lead_time_days', 'lead_days'),
        ('is_cancelled', 'is_cancelled'), ('is_no_show', 'is_no_show'),
        ('payment__method', 'payment_method'), ('venue__city', 'city'),
    ])
    if len(df):
        df['date'] = pd.to_datetime(df['date'])
        df['event_date'] = pd.to_datetime(df['event_date'], utc=True)
        if not include_future:
            df = df[df['date'] <= pd.Timestamp(today())]
    return df.reset_index(drop=True)


def purchases():
    """Non-cancelled orders and bookings as one (customer, date, amount,
    domain) stream, up to today — the input to churn, value and RFM.
    """
    o = orders()
    b = bookings()
    parts = []
    if len(o):
        o = o[~o['is_cancelled']]
        parts.append(pd.DataFrame({'customer_id': o['customer_id'], 'date': o['date'],
                                   'amount': o['total'], 'domain': 'zesty'}))
    if len(b):
        b = b[~b['is_cancelled']]
        parts.append(pd.DataFrame({'customer_id': b['customer_id'], 'date': b['date'],
                                   'amount': b['total'], 'domain': 'eventra'}))
    if not parts:
        return pd.DataFrame(columns=['customer_id', 'date', 'amount', 'domain'])
    return pd.concat(parts, ignore_index=True)


def lifecycles():
    df = _frame(FactOrderLifecycle.objects.filter(total_minutes__isnull=False), [
        ('order_id', 'order_id'), ('restaurant__restaurant_id', 'restaurant_id'),
        ('placed_at', 'placed_at'), ('total_minutes', 'minutes'), ('prep_minutes', 'prep_minutes'),
        ('transit_minutes', 'transit_minutes'), ('item_count', 'items'),
    ])
    if len(df):
        local = pd.to_datetime(df['placed_at'], utc=True).dt.tz_convert(timezone.get_current_timezone_name())
        df['hour'] = local.dt.hour
        df['weekday'] = local.dt.weekday
        df['is_weekend'] = df['weekday'] >= 5
        df['date'] = local.dt.tz_localize(None).dt.normalize()
    return df


def ticket_sales():
    return _frame(FactTicketSale.objects.all(), [
        ('ticket_id', 'ticket_id'), ('event__event_id', 'event_id'),
        ('ticket_type__ticket_type_id', 'ticket_type_id'), ('ticket_revenue', 'price'),
        ('event__category', 'category'),
    ])


def searches():
    df = _frame(FactSearch.objects.all(), [
        ('normalized_query', 'term'), ('date__full_date', 'date'),
        ('has_results', 'has_results'), ('clicked', 'clicked'), ('vertical', 'vertical'),
    ])
    if len(df):
        df['date'] = pd.to_datetime(df['date'])
    return df


def current_restaurants():
    return _frame(DimRestaurant.objects.filter(is_current=True), [
        ('restaurant_id', 'restaurant_id'), ('name', 'name'), ('cuisine', 'cuisine'),
        ('area', 'area'), ('city', 'city'), ('latitude', 'lat'), ('longitude', 'lng'),
    ])


def current_events():
    return _frame(DimEvent.objects.filter(is_current=True), [
        ('event_id', 'event_id'), ('title', 'title'), ('category', 'category'),
        ('event_date', 'event_date'), ('organizer_id', 'organizer_id'), ('total_seats', 'total_seats'),
    ])


def current_ticket_types():
    return _frame(DimTicketType.objects.filter(is_current=True), [
        ('ticket_type_id', 'ticket_type_id'), ('class_name', 'tier'),
        ('base_price', 'price'), ('capacity', 'capacity'),
    ])


def venues():
    return _frame(DimVenue.objects.all(), [
        ('venue_key', 'venue_key'), ('venue_id', 'venue_id'), ('venue_name', 'name'), ('city', 'city'),
        ('latitude', 'lat'), ('longitude', 'lng'),
    ])


def primary_cuisine(cuisine):
    return (cuisine or '').split(',')[0].strip() or 'Other'


def band(p, cuts=(0.15, 0.35)):
    """low | medium | high for a probability."""
    if p >= cuts[1]:
        return 'high'
    if p >= cuts[0]:
        return 'medium'
    return 'low'
