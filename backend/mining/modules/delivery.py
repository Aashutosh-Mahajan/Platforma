"""Delivery-time prediction (PRD §8.4).

Trained on delivered orders' placed->delivered minutes from
fact_order_lifecycle. Features: hour, weekday/weekend, basket size and the
restaurant's own typical time (target-encoded from the training split
only, falling back to the global mean for restaurants it hasn't seen).
A mean model plus a 90th-percentile model give "usually 32 min, rarely
more than 41".

Evaluated on the most recent 20% of deliveries against the naive
"this restaurant's average" estimate. The output is a lookup grid —
restaurant x day part x weekday/weekend x basket size — so checkout reads
one row instead of running a model per request.
"""
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor

from mining.models import MiningDeliveryEstimate
from mining.registry import execute
from mining.modules import data, ml

MIN_DELIVERIES = 100
FEATURES = ['hour', 'is_weekend', 'weekday', 'items', 'restaurant_mean']
DAY_PART_HOURS = {'breakfast': 9, 'lunch': 13, 'afternoon': 16, 'evening': 20, 'late_night': 23}
SIZE_BANDS = {'1-2': 2, '3-4': 4, '5+': 6}


def size_band(items):
    return '1-2' if items <= 2 else '3-4' if items <= 4 else '5+'


def _encode(train, frame, prior_weight=10):
    """Smoothed per-restaurant mean minutes from `train`, applied to `frame`."""
    global_mean = train['minutes'].mean()
    stats = train.groupby('restaurant_id')['minutes'].agg(['mean', 'count'])
    smoothed = (stats['mean'] * stats['count'] + global_mean * prior_weight) / (stats['count'] + prior_weight)
    return frame['restaurant_id'].map(smoothed).fillna(global_mean), smoothed, global_mean


def _quantile_model(q):
    return HistGradientBoostingRegressor(loss='quantile', quantile=q, max_iter=250, learning_rate=0.05,
                                         random_state=42)


def run_delivery_model():
    def body(run):
        df = data.lifecycles()
        df = df[(df['minutes'] > 0) & (df['minutes'] < 240)] if len(df) else df
        if len(df) < MIN_DELIVERIES:
            return {'skipped': True, 'reason': f'fewer than {MIN_DELIVERIES} delivered orders with timings'}
        df = df.assign(items=df['items'].clip(lower=1), is_weekend=df['is_weekend'].astype(int))

        fit, test = ml.time_split(df, 'placed_at')
        fit = fit.assign(restaurant_mean=_encode(fit, fit)[0])
        test = test.assign(restaurant_mean=_encode(fit, test)[0])
        model, metrics = ml.select_regressor(
            fit[FEATURES], fit['minutes'], test[FEATURES], test['minutes'], baseline_pred=test['restaurant_mean'],
        )
        p90_model = _quantile_model(0.9).fit(fit[FEATURES], fit['minutes'])
        coverage = float(np.mean(test['minutes'] <= p90_model.predict(test[FEATURES])))
        pred = model.predict(test[FEATURES])
        metrics.update({
            'within_5_min': round(float(np.mean(np.abs(pred - test['minutes']) <= 5)), 4),
            'p90_coverage': round(coverage, 4),
            'mean_minutes': round(float(df['minutes'].mean()), 2),
        })

        # Refit on everything for the grid.
        df = df.assign(restaurant_mean=_encode(df, df)[0])
        _, smoothed, global_mean = _encode(df, df)
        model.fit(df[FEATURES], df['minutes'])
        p90_model = _quantile_model(0.9).fit(df[FEATURES], df['minutes'])

        restaurants = data.current_restaurants()['restaurant_id'].tolist()
        grid = pd.DataFrame([
            {'restaurant_id': r, 'day_part': part, 'is_weekend': weekend, 'size_band': band,
             'hour': hour, 'weekday': 5 if weekend else 2, 'items': items,
             'restaurant_mean': float(smoothed.get(r, global_mean))}
            for r in restaurants
            for part, hour in DAY_PART_HOURS.items()
            for weekend in (0, 1)
            for band, items in SIZE_BANDS.items()
        ])
        if grid.empty:
            return {'skipped': True, 'reason': 'no restaurants in the warehouse'}
        grid['predicted'] = np.clip(model.predict(grid[FEATURES]), 5, None)
        grid['p90'] = np.maximum(p90_model.predict(grid[FEATURES]), grid['predicted'] + 2)

        MiningDeliveryEstimate.objects.bulk_create([
            MiningDeliveryEstimate(
                run=run, restaurant_id=int(r.restaurant_id), day_part=r.day_part, is_weekend=bool(r.is_weekend),
                size_band=r.size_band, predicted_minutes=round(float(r.predicted), 1),
                p90_minutes=round(float(r.p90), 1), model_version=run.model_version,
            )
            for r in grid.itertuples()
        ], batch_size=5000)
        metrics['grid_rows'] = len(grid)
        metrics['restaurants'] = len(restaurants)
        return metrics

    return execute('delivery', {'features': FEATURES}, body)
