"""Anomaly detection (PRD §8.4) over orders and bookings.

Two detectors, ranked together: an Isolation Forest (catches unusual
*combinations* of features) and a robust z-score detector (catches a
single feature far outside its normal range, such as five failed payment
attempts on an otherwise ordinary order, which an Isolation Forest can
under-rank because it picks features at random). Each row's score is the
higher of its two percentile ranks, and the top CONTAMINATION share is
flagged. All features are non-negative counts and ratios, so z-scores are
taken on log1p values, which keeps long-tailed features (lead time) from
crowding out genuinely abnormal ones.

Orders are described relative to their restaurant (value vs the
restaurant's typical order, value per item) plus failed payment attempts
and discount share; bookings relative to their event (price per seat vs
the event's typical) plus seats, lead time and how many bookings the same
customer holds overall and placed on the same day. Each flagged row carries plain-language reasons — the
features furthest from normal by robust z-score — so the admin review
queue explains *why* something was flagged.

Scored against datagen's PlantedAnomaly labels (precision@k, recall)
when synthetic data is present; real data has no labels, so those metrics
are simply absent.
"""
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

from mining.models import MiningAnomaly
from mining.registry import execute
from mining.modules import data

CONTAMINATION = 0.015  # share of rows flagged, ~ the injected anomaly rate plus margin
MIN_ROWS = 50
MAX_FLAGGED = 500

_ORDER_FEATURES = ['value_vs_restaurant', 'value_per_item', 'items', 'failed_payments', 'discount_share']
_BOOKING_FEATURES = ['price_vs_event', 'seats', 'lead_days', 'customer_bookings', 'customer_bookings_same_day']


def _robust_z(series):
    """Median/MAD z-score. When most values are identical the MAD collapses
    to (near) zero and would blow up every other value, so it falls back to
    the standard deviation whenever it's negligible next to it.
    """
    median = series.median()
    scale = 1.4826 * (series - median).abs().median()
    std = series.std() or 1.0
    if scale < 0.1 * std:
        scale = std
    return (series - median) / scale


def order_features(df):
    df = df.copy()
    typical = df.groupby('restaurant_id')['total'].transform('median').replace(0, np.nan)
    df['value_vs_restaurant'] = (df['total'] / typical).fillna(1.0)
    df['value_per_item'] = df['total'] / df['items'].clip(lower=1)
    df['discount_share'] = (df['discount'] / (df['total'] + df['discount']).replace(0, np.nan)).fillna(0)
    df['failed_payments'] = df['failed_payments'].fillna(0)
    return df


def booking_features(df):
    df = df.copy()
    df['price_per_seat'] = df['total'] / df['seats'].clip(lower=1)
    typical = df.groupby('event_id')['price_per_seat'].transform('median').replace(0, np.nan)
    df['price_vs_event'] = (df['price_per_seat'] / typical).fillna(1.0)
    df['customer_bookings'] = df.groupby('customer_id')['booking_id'].transform('count')
    df['customer_bookings_same_day'] = df.groupby(['customer_id', 'date'])['booking_id'].transform('count')
    return df


_REASON_TEXT = {
    'value_vs_restaurant': lambda r: f"Order value is {r['value_vs_restaurant']:.1f}x this restaurant's typical order",
    'value_per_item': lambda r: f"₹{r['value_per_item']:,.0f} per item is far outside the norm",
    'items': lambda r: f"{int(r['items'])} items in one order",
    'failed_payments': lambda r: f"{int(r['failed_payments'])} failed payment attempts before it went through",
    'discount_share': lambda r: f"Discount covers {r['discount_share'] * 100:.0f}% of the order",
    'price_vs_event': lambda r: f"Paid {r['price_vs_event']:.1f}x the event's typical price per seat",
    'seats': lambda r: f"{int(r['seats'])} seats in one booking",
    'lead_days': lambda r: f"Booked {r['lead_days']:.0f} days ahead",
    'customer_bookings': lambda r: f"This customer holds {int(r['customer_bookings'])} bookings",
    'customer_bookings_same_day': lambda r: f"{int(r['customer_bookings_same_day'])} bookings by the same customer on one day",
}


def flag(df, features, contamination=CONTAMINATION, seed=42):
    """Score every row and return the flagged ones, most unusual first, with
    `score` (0-1, higher = more unusual) and plain-language `reasons`.
    """
    X = df[features].astype(float).fillna(0).to_numpy()
    forest = IsolationForest(n_estimators=300, random_state=seed).fit(X)
    z = pd.DataFrame({f: _robust_z(np.log1p(df[f].astype(float).clip(lower=0))) for f in features}, index=df.index)
    forest_rank = pd.Series(-forest.score_samples(X), index=df.index).rank(pct=True)
    extreme_rank = z.abs().max(axis=1).rank(pct=True)
    df = df.assign(score=np.maximum(forest_rank, extreme_rank))
    n_flag = min(MAX_FLAGGED, max(1, int(round(len(df) * contamination))))
    flagged = df.sort_values('score', ascending=False).head(n_flag)

    reasons = []
    for idx, row in flagged.iterrows():
        top = z.loc[idx].abs().sort_values(ascending=False)
        picked = [f for f, v in top.items() if v >= 3][:2] or [top.index[0]]
        reasons.append([_REASON_TEXT[f](row) for f in picked])
    return flagged.assign(reasons=reasons)


def _planted_truth():
    """Ground-truth ids from synthetic data, or (set(), set()) if none."""
    from datagen.models import PlantedAnomaly
    orders, bookings = set(), set()
    for a in PlantedAnomaly.objects.all().values('target_type', 'target_id', 'details'):
        if a['target_type'] == 'order':
            orders.add(str(a['target_id']))
        elif a['target_type'] == 'booking':
            bookings.update(str(b) for b in (a['details'] or {}).get('booking_ids', []))
    return orders, bookings


def _precision_recall(ranked_ids, truth, scored_ids):
    """precision@k with k = number of planted anomalies among the scored
    rows (the PRD metric), plus recall over everything flagged."""
    truth = truth & scored_ids
    if not truth:
        return None
    k = len(truth)
    top_k = set(ranked_ids[:k])
    return {
        'planted': len(truth), 'k': k,
        'precision_at_k': round(len(top_k & truth) / k, 4),
        'recall_flagged': round(len(set(ranked_ids) & truth) / len(truth), 4),
        'flagged': len(ranked_ids),
    }


def run_anomaly_detection():
    def body(run):
        previous = {
            (a['domain'], a['target_id']): a
            for a in MiningAnomaly.objects.exclude(review_status='open')
            .values('domain', 'target_id', 'review_status', 'reviewed_by', 'reviewed_at')
        }
        truth_orders, truth_bookings = _planted_truth()
        metrics = {}
        rows = []

        o = data.orders()
        if len(o) >= MIN_ROWS:
            flagged = flag(order_features(o), _ORDER_FEATURES)
            ids = [str(v) for v in flagged['order_id']]
            metrics['orders'] = {'scored': len(o), 'flagged': len(flagged),
                                 'evaluation': _precision_recall(ids, truth_orders, set(o['order_id'].astype(str)))}
            for rank, (_, r) in enumerate(flagged.iterrows(), start=1):
                rows.append(('order', str(r['order_id']), r, rank, r['restaurant_id'], r['total']))

        b = data.bookings()
        if len(b) >= MIN_ROWS:
            flagged = flag(booking_features(b), _BOOKING_FEATURES)
            ids = [str(v) for v in flagged['booking_id']]
            metrics['bookings'] = {'scored': len(b), 'flagged': len(flagged),
                                   'evaluation': _precision_recall(ids, truth_bookings, set(b['booking_id'].astype(str)))}
            for rank, (_, r) in enumerate(flagged.iterrows(), start=1):
                rows.append(('booking', str(r['booking_id']), r, rank, r['event_id'], r['total']))

        if not rows:
            return {'skipped': True, 'reason': f'fewer than {MIN_ROWS} orders and bookings'}

        objs = []
        for domain, target_id, r, rank, entity_id, amount in rows:
            prior = previous.get((domain, target_id), {})
            objs.append(MiningAnomaly(
                run=run, domain=domain, target_id=target_id, customer_id=int(r['customer_id']),
                entity_id=int(entity_id), occurred_on=r['date'].date(), amount=round(float(amount), 2),
                score=round(float(r['score']), 5), rank=rank, reasons=r['reasons'],
                review_status=prior.get('review_status', 'open'), reviewed_by=prior.get('reviewed_by'),
                reviewed_at=prior.get('reviewed_at'), model_version=run.model_version,
            ))
        MiningAnomaly.objects.bulk_create(objs, batch_size=1000)
        metrics['contamination'] = CONTAMINATION
        return metrics

    return execute('anomaly', {'contamination': CONTAMINATION}, body)
