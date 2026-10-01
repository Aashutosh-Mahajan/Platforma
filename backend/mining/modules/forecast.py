"""Demand forecasting (PRD §8.4).

Two modules:

forecast  Daily order counts for every active restaurant, plus platform
          totals for orders and bookings, 14 days ahead. One global
          gradient-boosting model over calendar features and lags (7, 14),
          rolling means (7, 28) — so a restaurant with little history
          borrows weekly shape from the rest. Evaluated on the last 14 days
          of every series against a seasonal-naive baseline (same weekday
          last week), reporting MAE, RMSE and WAPE (MAPE is undefined on
          the many zero days a single restaurant has).

sellout   For each upcoming event: projected final ticket sales, chance of
          selling out, and the date it would. Built from booking curves —
          for past events of the same category, the share of final sales
          already sold d days before the event — and backtested at 7, 14
          and 30 days out to size the uncertainty.
"""
import math

import numpy as np
import pandas as pd
from django.utils import timezone
from scipy.stats import norm
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error

from mining.models import MiningForecast, MiningSellOutForecast
from mining.registry import execute
from mining.modules import data

HORIZON = 14
HOLDOUT = 14
HISTORY_DAYS = 365
MIN_HISTORY_DAYS = 42
ACTIVE_WITHIN_DAYS = 90
FEATURES = ['dow', 'month', 'festival', 'lag7', 'lag14', 'roll7', 'roll28', 'trend']


# ---------------------------------------------------------------------------
# Daily series forecasting
# ---------------------------------------------------------------------------

def _dense(df, end):
    """[entity, date, y] -> every entity on every day up to `end`, zeros filled."""
    start = end - pd.Timedelta(days=HISTORY_DAYS - 1)
    df = df[(df['date'] >= start) & (df['date'] <= end)]
    frames = []
    for entity, g in df.groupby('entity'):
        first = max(g['date'].min(), start)
        idx = pd.date_range(first, end, freq='D')
        series = g.groupby('date')['y'].sum().reindex(idx, fill_value=0.0)
        frames.append(pd.DataFrame({'entity': entity, 'date': idx, 'y': series.to_numpy(dtype=float)}))
    return pd.concat(frames, ignore_index=True) if frames else pd.DataFrame(columns=['entity', 'date', 'y'])


def _features(df):
    df = df.sort_values(['entity', 'date']).copy()
    g = df.groupby('entity')['y']
    df['lag7'] = g.shift(7)
    df['lag14'] = g.shift(14)
    df['roll7'] = g.transform(lambda s: s.shift(1).rolling(7, min_periods=3).mean())
    df['roll28'] = g.transform(lambda s: s.shift(1).rolling(28, min_periods=7).mean())
    df['dow'] = df['date'].dt.weekday
    df['month'] = df['date'].dt.month
    df['festival'] = df['month'].isin([10, 11]).astype(int)
    df['trend'] = df.groupby('entity').cumcount()
    return df


def _model():
    return HistGradientBoostingRegressor(
        loss='poisson', max_iter=300, learning_rate=0.05, max_leaf_nodes=31, random_state=42,
    )


def forecast_series(df, horizon=HORIZON, today=None):
    """df: [entity, date, y]. Returns (forecast DataFrame [entity, date,
    predicted, lower, upper], metrics). Entities with less than
    MIN_HISTORY_DAYS of history or no activity in ACTIVE_WITHIN_DAYS are
    left out.
    """
    today = pd.Timestamp(today or data.today())
    dense = _dense(df, today)
    if dense.empty:
        return pd.DataFrame(), {'skipped': True, 'reason': 'no history'}

    span = dense.groupby('entity')['date'].agg(['min', 'count'])
    recent = dense[dense['date'] > today - pd.Timedelta(days=ACTIVE_WITHIN_DAYS)].groupby('entity')['y'].sum()
    keep = span.index[(span['count'] >= MIN_HISTORY_DAYS) & (recent.reindex(span.index).fillna(0) > 0)]
    dense = dense[dense['entity'].isin(keep)]
    if dense.empty:
        return pd.DataFrame(), {'skipped': True, 'reason': f'no series with {MIN_HISTORY_DAYS}+ days of recent history'}

    feats = _features(dense).dropna(subset=['lag14', 'roll28'])
    if feats['y'].sum() <= 0:
        # A Poisson model can't be fit to all-zero history (and there's nothing to forecast).
        return pd.DataFrame(), {'skipped': True, 'reason': 'no orders in the usable history window'}
    cutoff = today - pd.Timedelta(days=HOLDOUT)
    train, test = feats[feats['date'] <= cutoff], feats[feats['date'] > cutoff]

    metrics = {'series': int(dense['entity'].nunique()), 'train_rows': int(len(train)), 'test_rows': int(len(test))}
    residual_q = (-1.0, 1.0)
    if len(train) >= 100 and len(test) and train['y'].sum() > 0:
        model = _model().fit(train[FEATURES], train['y'])
        pred = model.predict(test[FEATURES])
        total = test['y'].sum() or 1.0
        metrics.update({
            'mae': round(float(mean_absolute_error(test['y'], pred)), 4),
            'rmse': round(float(np.sqrt(mean_squared_error(test['y'], pred))), 4),
            'wape': round(float(np.abs(test['y'] - pred).sum() / total), 4),
            'baseline_wape': round(float(np.abs(test['y'] - test['lag7']).sum() / total), 4),
        })
        scale = test['roll28'].to_numpy() + 1.0
        residual_q = tuple(np.quantile((test['y'].to_numpy() - pred) / scale, [0.1, 0.9]))

    model = _model().fit(feats[FEATURES], feats['y'])

    # Recursive multi-step forecast: each predicted day feeds the lags of the next.
    history = {e: g.set_index('date')['y'].copy() for e, g in dense.groupby('entity')}
    rows = []
    for step in range(1, horizon + 1):
        day = today + pd.Timedelta(days=step)
        batch = []
        for entity, series in history.items():
            values = series.to_numpy()
            batch.append({
                'entity': entity, 'date': day, 'dow': day.weekday(), 'month': day.month,
                'festival': int(day.month in (10, 11)),
                'lag7': values[-7] if len(values) >= 7 else 0.0,
                'lag14': values[-14] if len(values) >= 14 else 0.0,
                'roll7': values[-7:].mean(), 'roll28': values[-28:].mean(), 'trend': len(values),
            })
        frame = pd.DataFrame(batch)
        frame['predicted'] = np.clip(model.predict(frame[FEATURES]), 0, None)
        for r in frame.itertuples():
            history[r.entity] = pd.concat([history[r.entity], pd.Series([r.predicted], index=[day])])
        scale = frame['roll28'] + 1.0
        frame['lower'] = np.clip(frame['predicted'] + residual_q[0] * scale, 0, None)
        frame['upper'] = frame['predicted'] + residual_q[1] * scale
        rows.append(frame[['entity', 'date', 'predicted', 'lower', 'upper']])
    return pd.concat(rows, ignore_index=True), metrics


def run_forecast():
    def body(run):
        metrics = {}
        objs = []

        o = data.orders()
        o = o[~o['is_cancelled']] if len(o) else o
        if len(o):
            per_restaurant = o.groupby(['restaurant_id', 'date']).size().rename('y').reset_index()
            per_restaurant = per_restaurant.rename(columns={'restaurant_id': 'entity'})
            fc, metrics['restaurant_orders'] = forecast_series(per_restaurant)
            objs += [
                MiningForecast(run=run, series='restaurant_orders', entity_id=int(r.entity), target_date=r.date.date(),
                               predicted=round(r.predicted, 3), lower=round(r.lower, 3), upper=round(r.upper, 3),
                               model_version=run.model_version)
                for r in fc.itertuples()
            ]
            platform = o.groupby('date').size().rename('y').reset_index().assign(entity=0)
            fc, metrics['platform_orders'] = forecast_series(platform)
            objs += [
                MiningForecast(run=run, series='platform_orders', target_date=r.date.date(),
                               predicted=round(r.predicted, 3), lower=round(r.lower, 3), upper=round(r.upper, 3),
                               model_version=run.model_version)
                for r in fc.itertuples()
            ]

        b = data.bookings()
        b = b[~b['is_cancelled']] if len(b) else b
        if len(b):
            platform = b.groupby('date').size().rename('y').reset_index().assign(entity=0)
            fc, metrics['platform_bookings'] = forecast_series(platform)
            objs += [
                MiningForecast(run=run, series='platform_bookings', target_date=r.date.date(),
                               predicted=round(r.predicted, 3), lower=round(r.lower, 3), upper=round(r.upper, 3),
                               model_version=run.model_version)
                for r in fc.itertuples()
            ]

        if not objs:
            return {**metrics, 'skipped': True, 'reason': 'not enough order or booking history'}
        MiningForecast.objects.bulk_create(objs, batch_size=2000)
        metrics['rows'] = len(objs)
        return metrics

    return execute('forecast', {'horizon_days': HORIZON, 'holdout_days': HOLDOUT}, body)


# ---------------------------------------------------------------------------
# Event sell-out
# ---------------------------------------------------------------------------

CURVE_DAYS = 120
BACKTEST_DAYS = (7, 14, 30)
MIN_CATEGORY_EVENTS = 5


def booking_curves(past):
    """{category: array F where F[d] = average share of an event's final
    seats already sold d days before it}, plus '__all__'.
    """
    def curve(group):
        shares = []
        for _, ev in group.groupby('event_id'):
            final = ev['seats'].sum()
            if final <= 0:
                continue
            leads = ev['lead_days'].to_numpy()
            seats = ev['seats'].to_numpy()
            shares.append([seats[leads >= d].sum() / final for d in range(CURVE_DAYS + 1)])
        return np.mean(shares, axis=0) if shares else None

    curves = {'__all__': curve(past)}
    for category, group in past.groupby('category'):
        if group['event_id'].nunique() >= MIN_CATEGORY_EVENTS:
            c = curve(group)
            if c is not None:
                curves[category] = c
    return curves


def _share_sold(curves, category, days_out):
    c = curves.get(category)
    if c is None:
        c = curves['__all__']
    return float(c[min(max(days_out, 0), CURVE_DAYS)])


def backtest(past, curves):
    """Log-error of projecting each past event's final sales from what it
    had sold d days out. Returns ({d: sigma}, metrics).
    """
    sigma, metrics = {}, {}
    for d in BACKTEST_DAYS:
        errors, ape = [], []
        for event_id, ev in past.groupby('event_id'):
            final = ev['seats'].sum()
            sold = ev.loc[ev['lead_days'] >= d, 'seats'].sum()
            share = _share_sold(curves, ev['category'].iloc[0], d)
            if final < 5 or sold <= 0 or share < 0.02:
                continue
            projected = sold / share
            errors.append(math.log(final / projected))
            ape.append(abs(final - projected) / final)
        if len(errors) >= 5:
            sigma[d] = float(np.std(errors)) or 0.25
            metrics[f'mape_{d}d'] = round(float(np.mean(ape)), 4)
            metrics[f'events_{d}d'] = len(errors)
    return sigma, metrics


def _sigma_for(sigma, days_out):
    if not sigma:
        return 0.5
    nearest = min(sigma, key=lambda d: abs(d - days_out))
    return max(0.05, sigma[nearest])


def run_sellout_forecast():
    def body(run):
        now = pd.Timestamp(timezone.now())
        b = data.bookings()
        events = data.current_events()
        if not len(b) or not len(events):
            return {'skipped': True, 'reason': 'no bookings or events yet'}
        live = b[~b['is_cancelled']]
        past = live[live['event_date'] < now]
        if past['event_id'].nunique() < MIN_CATEGORY_EVENTS:
            return {'skipped': True, 'reason': f'fewer than {MIN_CATEGORY_EVENTS} past events to learn booking curves from'}

        curves = booking_curves(past)
        sigma, metrics = backtest(past, curves)
        median_final = past.groupby(['category', 'event_id'])['seats'].sum().groupby('category').median()

        events['event_date'] = pd.to_datetime(events['event_date'], utc=True)
        upcoming = events[events['event_date'] >= now]
        sold_by_event = live.groupby('event_id')['seats'].sum()
        week_ago = pd.Timestamp(data.today()) - pd.Timedelta(days=7)
        recent_by_event = live[live['date'] > week_ago].groupby('event_id')['seats'].sum()

        objs = []
        for e in upcoming.itertuples():
            capacity = int(e.total_seats or 0)
            if capacity <= 0:
                continue
            sold = int(sold_by_event.get(e.event_id, 0))
            days_out = max(0, math.ceil((e.event_date - now).total_seconds() / 86400))
            share = _share_sold(curves, e.category, days_out)
            if sold > 0 and share >= 0.02:
                uncapped = sold / share
            else:
                uncapped = float(median_final.get(e.category, sold)) or float(sold)
            projected = min(capacity, max(sold, int(round(uncapped))))
            s = _sigma_for(sigma, days_out)
            p_sell_out = 1.0 if sold >= capacity else float(
                1 - norm.cdf((math.log(capacity) - math.log(max(uncapped, 0.5))) / s)
            )

            sell_out_date = None
            if sold >= capacity:
                sell_out_date = data.today()
            elif uncapped >= capacity:
                for lead in range(days_out, -1, -1):  # earliest date the cumulative projection crosses capacity
                    if uncapped * _share_sold(curves, e.category, lead) >= capacity:
                        sell_out_date = (e.event_date - pd.Timedelta(days=lead)).date()
                        break

            objs.append(MiningSellOutForecast(
                run=run, event_id=int(e.event_id), organizer_id=e.organizer_id, event_date=e.event_date,
                capacity=capacity, sold=sold, sold_last_7d=int(recent_by_event.get(e.event_id, 0)),
                days_to_event=days_out, projected_final=projected,
                projected_sell_through=round(projected / capacity, 4),
                sell_out_probability=round(p_sell_out, 4), projected_sell_out_date=sell_out_date,
                model_version=run.model_version,
            ))

        MiningSellOutForecast.objects.bulk_create(objs, batch_size=1000)
        metrics.update({'events_forecast': len(objs), 'past_events': int(past['event_id'].nunique()),
                        'categories_with_own_curve': sorted(k for k in curves if k != '__all__')})
        return metrics

    return execute('sellout', {'curve_days': CURVE_DAYS}, body)
