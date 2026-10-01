"""Ticket price elasticity (PRD §8.4), per event category.

Each ticket tier of a past event is one observation: its price and its
sell-through (tickets sold / seats in the tier). Tiers of the same event
share everything except price and seat quality, so the regression is
within-event (event fixed effects: log price and log sell-through are
demeaned per event) — the slope is how much sell-through moves when price
moves, holding the event constant:

  log(sell_through) - event mean = e * (log(price) - event mean)

e near 0: demand barely reacts to price (room to charge more where tiers
sell out); e below -1: demand is price-sensitive (a cut could raise
revenue). Categories need MIN_EVENTS events with 2+ priced tiers.
"""
import numpy as np
import pandas as pd
from django.utils import timezone

from mining.models import MiningPriceElasticity
from mining.registry import execute
from mining.modules import data

MIN_EVENTS = 5


def tier_observations(sales, tiers, events):
    now = pd.Timestamp(timezone.now())
    events = events.assign(event_date=pd.to_datetime(events['event_date'], utc=True))
    past = set(events.loc[events['event_date'] < now, 'event_id'])
    sold = sales.groupby(['event_id', 'ticket_type_id']).size().rename('sold').reset_index()
    obs = sold.merge(tiers, on='ticket_type_id')
    obs = obs[obs['event_id'].isin(past) & (obs['capacity'] > 0) & (obs['price'] > 0)]
    obs = obs.assign(sell_through=(obs['sold'] / obs['capacity']).clip(upper=1.0))
    category = dict(zip(events['event_id'], events['category']))
    return obs.assign(category=obs['event_id'].map(category))


def elasticity(obs):
    """Within-event slope of log sell-through on log price. Returns (e, r2, n_events)."""
    multi = obs.groupby('event_id').filter(lambda g: g['price'].nunique() >= 2 and len(g) >= 2)
    if multi['event_id'].nunique() < MIN_EVENTS:
        return None
    x = np.log(multi['price'].astype(float))
    y = np.log(multi['sell_through'].clip(lower=0.01))
    xd = x - x.groupby(multi['event_id']).transform('mean')
    yd = y - y.groupby(multi['event_id']).transform('mean')
    denom = float((xd ** 2).sum())
    if denom == 0:
        return None
    e = float((xd * yd).sum() / denom)
    residual = yd - e * xd
    total = float((yd ** 2).sum())
    r2 = 1 - float((residual ** 2).sum()) / total if total else 0.0
    return e, r2, int(multi['event_id'].nunique()), int(len(multi))


def advice(e, sell_through):
    if e > -0.5 and sell_through >= 0.8:
        return 'Demand barely reacts to price and tiers sell out: there is room to raise prices.'
    if e > -0.5:
        return 'Demand barely reacts to price: discounts are unlikely to fill more seats.'
    if e < -1:
        return 'Buyers are price-sensitive: a lower price would likely bring in more revenue.'
    return 'Moderately price-sensitive: keep prices close to the category norm.'


def run_price_elasticity():
    def body(run):
        sales, tiers, events = data.ticket_sales(), data.current_ticket_types(), data.current_events()
        if not len(sales) or not len(tiers):
            return {'skipped': True, 'reason': 'no ticket sales yet'}
        obs = tier_observations(sales, tiers, events)
        rows = []
        for category, group in obs.groupby('category'):
            fit = elasticity(group)
            if fit is None:
                continue
            e, r2, n_events, n_tiers = fit
            sell_through = float(group['sell_through'].mean())
            rows.append(MiningPriceElasticity(
                run=run, category=category, elasticity=round(e, 4), r_squared=round(r2, 4),
                events=n_events, tiers=n_tiers, avg_sell_through=round(sell_through, 4),
                median_price=round(float(group['price'].median()), 2), advice=advice(e, sell_through),
                model_version=run.model_version,
            ))
        if not rows:
            return {'skipped': True, 'reason': f'no category has {MIN_EVENTS}+ past events with 2+ priced tiers'}
        MiningPriceElasticity.objects.bulk_create(rows)
        return {'categories': len(rows), 'elasticities': {r.category: r.elasticity for r in rows}}

    return execute('pricing', {'min_events': MIN_EVENTS}, body)
