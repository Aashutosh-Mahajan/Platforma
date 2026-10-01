"""Promotion effectiveness (PRD §8.4).

For each restaurant promotion with a validity window, compare the
restaurant's orders per day during the window with the same-length window
just before it, adjusted for what every *other* restaurant did over the
same two windows (difference-in-differences against the platform trend):

  uplift = (during / before) / (control_during / control_before) - 1

Incremental orders = during - expected (before x control trend); their
value at the window's average order value, set against the discount
handed out, gives a return per rupee of discount. A Poisson test on the
order count says whether the change could be noise.

Verdicts: worked (lift and pays for itself), costly (lift, but the
discount costs more than it brings), no_lift, too_early (window not over,
or too few orders to judge).
"""

import pandas as pd
from scipy.stats import poisson

from mining.models import MiningPromoEffect
from mining.registry import execute
from mining.modules import data
from warehouse.models import DimPromotion

MIN_ORDERS_BEFORE = 5


def evaluate(promo, orders, today):
    start = pd.Timestamp(promo['valid_from']).tz_convert(None).normalize()
    end = pd.Timestamp(promo['valid_until']).tz_convert(None).normalize()
    days = max(1, (end - start).days)
    before_start = start - pd.Timedelta(days=days)

    own = orders[orders['restaurant_id'] == promo['restaurant_id']]
    others = orders[orders['restaurant_id'] != promo['restaurant_id']]

    def count(df, lo, hi):
        return int(((df['date'] >= lo) & (df['date'] < hi)).sum())

    during, before = count(own, start, end), count(own, before_start, start)
    c_during, c_before = count(others, start, end), count(others, before_start, start)
    in_window = own[(own['date'] >= start) & (own['date'] < end)]
    redeemed = in_window[in_window['promo_code'] == promo['code']]

    row = {
        'promo_code': promo['code'], 'restaurant_id': promo['restaurant_id'],
        'window_start': start.date(), 'window_end': end.date(),
        'redemptions': int(len(redeemed)), 'discount_given': round(float(redeemed['discount'].sum()), 2),
        'orders_per_day_before': round(before / days, 3), 'orders_per_day_during': round(during / days, 3),
        'uplift_pct': None, 'incremental_orders': None, 'incremental_revenue': None, 'roi': None, 'p_value': None,
    }
    if end > pd.Timestamp(today) or before < MIN_ORDERS_BEFORE or c_before == 0:
        row['verdict'] = 'too_early'
        return row

    control_trend = c_during / c_before if c_before else 1.0
    expected = before * control_trend
    uplift = (during / expected - 1) if expected else None
    incremental = during - expected
    aov = float(in_window['total'].mean()) if len(in_window) else 0.0
    incremental_revenue = incremental * aov
    discount = row['discount_given']
    p_value = float(poisson.sf(during - 1, expected)) if during > expected else float(poisson.cdf(during, expected))

    row.update({
        'uplift_pct': round(uplift * 100, 2) if uplift is not None else None,
        'incremental_orders': round(incremental, 2),
        'incremental_revenue': round(incremental_revenue, 2),
        'roi': round(incremental_revenue / discount, 3) if discount > 0 else None,
        'p_value': round(p_value, 5),
    })
    significant = p_value < 0.1
    if uplift is not None and uplift > 0.05 and significant:
        row['verdict'] = 'worked' if discount == 0 or incremental_revenue >= discount else 'costly'
    else:
        row['verdict'] = 'no_lift'
    return row


def run_promo_effects():
    def body(run):
        promos = list(
            DimPromotion.objects.filter(restaurant_id__isnull=False, valid_from__isnull=False, valid_until__isnull=False)
            .values('campaign_name', 'restaurant_id', 'valid_from', 'valid_until')
        )
        if not promos:
            return {'skipped': True, 'reason': 'no restaurant promotions with a validity window'}
        orders = data.orders()
        orders = orders[~orders['is_cancelled']] if len(orders) else orders
        if not len(orders):
            return {'skipped': True, 'reason': 'no orders'}

        today = data.today()
        rows = [evaluate({'code': p['campaign_name'], **p}, orders, today) for p in promos]
        MiningPromoEffect.objects.bulk_create([
            MiningPromoEffect(run=run, model_version=run.model_version, **r) for r in rows
        ])
        judged = [r for r in rows if r['verdict'] != 'too_early']
        uplifts = [r['uplift_pct'] for r in judged if r['uplift_pct'] is not None]
        return {
            'promotions': len(rows), 'judged': len(judged),
            'verdicts': pd.Series([r['verdict'] for r in rows]).value_counts().to_dict(),
            'median_uplift_pct': round(float(pd.Series(uplifts).median()), 2) if uplifts else None,
        }

    return execute('promos', {'min_orders_before': MIN_ORDERS_BEFORE}, body)
