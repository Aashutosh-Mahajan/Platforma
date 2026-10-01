"""Risk scoring (PRD §8.4): three classifiers, each trained only on
outcomes that are already final and applied to what's still live.

  booking_no_show       past, non-cancelled bookings -> did they turn up?
                        scored on upcoming bookings; summed per event it
                        gives organisers an expected no-show count.
  booking_cancellation  bookings for past events -> cancelled or not;
                        scored on upcoming confirmed bookings.
  order_cancellation    orders older than two days -> cancelled or not;
                        scored on orders still in progress.

Splits are by time (train on the earlier 80%), never random, so the
reported metrics reflect predicting the future rather than interpolating.
"""
import numpy as np
import pandas as pd
from django.utils import timezone

from mining.models import MiningRiskScore
from mining.registry import execute
from mining.modules import data, ml
from warehouse.models import FactOrderLifecycle

MIN_ROWS = 200
MIN_POSITIVES = 15

_BOOKING_NUMERIC = ['lead_days', 'log_price_per_seat', 'seats', 'event_weekday', 'event_hour',
                    'booking_hour', 'customer_bookings']
_BOOKING_CATEGORICAL = ['payment_method', 'category']
_ORDER_NUMERIC = ['hour', 'weekday', 'log_total', 'items', 'discount_share', 'customer_orders', 'failed_payments']
_ORDER_CATEGORICAL = ['payment_method', 'rating_band', 'price_band']


def booking_features(df):
    df = df.copy()
    local_event = df['event_date'].dt.tz_convert(timezone.get_current_timezone_name())
    df['log_price_per_seat'] = np.log1p(df['total'] / df['seats'].clip(lower=1))
    df['event_weekday'] = local_event.dt.weekday
    df['event_hour'] = local_event.dt.hour
    df['booking_hour'] = df['hour']
    df['customer_bookings'] = df.groupby('customer_id')['booking_id'].transform('count')
    return df


def order_features(df):
    df = df.copy()
    df['log_total'] = np.log1p(df['total'])
    df['discount_share'] = (df['discount'] / (df['total'] + df['discount']).replace(0, np.nan)).fillna(0)
    df['customer_orders'] = df.groupby('customer_id')['order_id'].transform('count')
    return df


def _train_and_score(train, score, label, numeric, categorical, time_col):
    """Returns (metrics, probabilities for `score`) or (skip-metrics, None)."""
    positives = int(train[label].sum())
    if len(train) < MIN_ROWS or positives < MIN_POSITIVES or positives == len(train):
        return {'skipped': True, 'reason': f'{len(train)} rows, {positives} positives'}, None
    fit_part, test_part = ml.time_split(train, time_col)
    if test_part[label].nunique() < 2:
        return {'skipped': True, 'reason': 'held-out period has only one outcome'}, None
    X_fit = ml.design(fit_part, numeric, categorical)
    X_test = ml.design(test_part, numeric, categorical, columns=X_fit.columns)
    model, metrics = ml.select_classifier(X_fit, fit_part[label].astype(int), X_test, test_part[label].astype(int))
    metrics['top_features'] = ml.feature_importance(model, list(X_fit.columns))
    if not len(score):
        return metrics, np.array([])
    X_score = ml.design(score, numeric, categorical, columns=X_fit.columns)
    return metrics, model.predict_proba(X_score)[:, 1]


def run_risk_scoring():
    def body(run):
        now = pd.Timestamp(timezone.now())
        metrics = {}
        objs = []

        b = data.bookings()
        if len(b):
            b = booking_features(b)
            past = b[b['event_date'] < now]
            upcoming = b[(b['event_date'] >= now) & ~b['is_cancelled']]

            # No-show: among bookings that weren't cancelled.
            m, p = _train_and_score(past[~past['is_cancelled']], upcoming, 'is_no_show',
                                    _BOOKING_NUMERIC, _BOOKING_CATEGORICAL, 'event_date')
            metrics['booking_no_show'] = m
            if p is not None:
                objs += [
                    MiningRiskScore(run=run, kind='booking_no_show', target_id=str(r.booking_id),
                                    entity_id=int(r.event_id), customer_id=int(r.customer_id), seats=int(r.seats),
                                    probability=round(float(prob), 4), band=data.band(prob, (0.1, 0.25)),
                                    model_version=run.model_version)
                    for r, prob in zip(upcoming.itertuples(), p)
                ]

            m, p = _train_and_score(past, upcoming, 'is_cancelled',
                                    _BOOKING_NUMERIC, _BOOKING_CATEGORICAL, 'event_date')
            metrics['booking_cancellation'] = m
            if p is not None:
                objs += [
                    MiningRiskScore(run=run, kind='booking_cancellation', target_id=str(r.booking_id),
                                    entity_id=int(r.event_id), customer_id=int(r.customer_id), seats=int(r.seats),
                                    probability=round(float(prob), 4), band=data.band(prob),
                                    model_version=run.model_version)
                    for r, prob in zip(upcoming.itertuples(), p)
                ]

        o = data.orders()
        if len(o):
            o = order_features(o)
            settled = o[o['date'] <= now.tz_localize(None).normalize() - pd.Timedelta(days=2)]
            live_ids = set(
                str(v) for v in FactOrderLifecycle.objects.filter(is_complete=False).values_list('order_id', flat=True)
            )
            live = o[o['order_id'].astype(str).isin(live_ids)]
            m, p = _train_and_score(settled, live, 'is_cancelled', _ORDER_NUMERIC, _ORDER_CATEGORICAL, 'date')
            metrics['order_cancellation'] = m
            if p is not None:
                objs += [
                    MiningRiskScore(run=run, kind='order_cancellation', target_id=str(r.order_id),
                                    entity_id=int(r.restaurant_id), customer_id=int(r.customer_id),
                                    probability=round(float(prob), 4), band=data.band(prob),
                                    model_version=run.model_version)
                    for r, prob in zip(live.itertuples(), p)
                ]

        MiningRiskScore.objects.bulk_create(objs, batch_size=2000)
        metrics['scored'] = len(objs)
        return metrics

    return execute('risk', {'min_rows': MIN_ROWS, 'min_positives': MIN_POSITIVES}, body)
