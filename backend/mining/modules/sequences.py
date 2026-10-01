"""Cross-domain sequence mining (PRD §8.4): "people who do A also do B
within N hours of it", where A and B sit in different verticals.

Each customer's history becomes a timeline of tokens — 'food:<cuisine>'
at order time, 'event:<category>' at the *event's* start (when they're
actually out, which is when a pre- or post-show meal happens). The
window looks both ways, since dinner before a show and dinner after it
are the same habit. For every cross-domain pair (A, B) and window W:

  confidence = share of A occurrences with a B within W of them
  baseline   = share of *any* token with a B within W of it
  lift       = confidence / baseline

Rules need MIN_OCCURRENCES supporting instances and lift >= MIN_LIFT. The
planted pattern (concert -> North Indian within 3 hours) should come out
on top for synthetic data.
"""
from collections import Counter

import numpy as np
import pandas as pd

from mining.models import MiningSequenceRule
from mining.registry import execute
from mining.modules import data

WINDOWS_HOURS = (3, 24)
MIN_OCCURRENCES = 5
MIN_LIFT = 1.5
MAX_RULES = 200


def timelines(orders, bookings, restaurants):
    cuisine_of = dict(zip(restaurants['restaurant_id'], restaurants['cuisine'].map(data.primary_cuisine)))
    parts = []
    if len(orders):
        o = orders[~orders['is_cancelled']]
        # Order time = its date plus hour (fact grain is day + 15-minute band).
        at = o['date'] + pd.to_timedelta(o['hour'], unit='h')
        parts.append(pd.DataFrame({'customer_id': o['customer_id'], 'at': at,
                                   'token': 'food:' + o['restaurant_id'].map(cuisine_of).fillna('Other')}))
    if len(bookings):
        b = bookings[~bookings['is_cancelled']]
        at = b['event_date'].dt.tz_convert(None)
        parts.append(pd.DataFrame({'customer_id': b['customer_id'], 'at': at, 'token': 'event:' + b['category']}))
    if not parts:
        return pd.DataFrame(columns=['customer_id', 'at', 'token'])
    return pd.concat(parts, ignore_index=True).sort_values(['customer_id', 'at'])


def mine(events, window_hours):
    """Count, for each token instance, which other tokens occur within the
    window either side of it. Returns (pair_counts, antecedent_counts,
    near_counts, total_instances).
    """
    window = np.timedelta64(int(window_hours * 3600), 's')
    pair = Counter()
    antecedent = Counter()
    followed_by = Counter()  # instances (of any token) with consequent B nearby
    total = 0
    for _, g in events.groupby('customer_id', sort=False):
        times = g['at'].to_numpy()
        tokens = g['token'].to_numpy()
        n = len(tokens)
        for i in range(n):
            total += 1
            antecedent[tokens[i]] += 1
            seen = set()
            j = i - 1
            while j >= 0 and times[i] - times[j] <= window:
                seen.add(tokens[j])
                j -= 1
            j = i + 1
            while j < n and times[j] - times[i] <= window:
                seen.add(tokens[j])
                j += 1
            seen.discard(tokens[i])
            for b in seen:
                followed_by[b] += 1
                pair[(tokens[i], b)] += 1
    return pair, antecedent, followed_by, total


def rules_for_window(events, window_hours):
    pair, antecedent, followed_by, total = mine(events, window_hours)
    rules = []
    for (a, b), count in pair.items():
        if a.split(':')[0] == b.split(':')[0] or count < MIN_OCCURRENCES:
            continue  # cross-domain only
        confidence = count / antecedent[a]
        baseline = followed_by[b] / total if total else 0
        lift = confidence / baseline if baseline else 0
        if lift >= MIN_LIFT:
            rules.append({'antecedent': a, 'consequent': b, 'window_hours': window_hours, 'occurrences': count,
                          'support': count / total, 'confidence': confidence, 'lift': lift})
    return rules


def run_sequence_mining():
    def body(run):
        events = timelines(data.orders(include_future=True), data.bookings(include_future=True),
                           data.current_restaurants())
        if events['customer_id'].nunique() < 20:
            return {'skipped': True, 'reason': 'fewer than 20 customers with history'}

        rules = []
        for w in WINDOWS_HOURS:
            rules += rules_for_window(events, w)
        rules.sort(key=lambda r: (-r['lift'], -r['occurrences']))
        rules = rules[:MAX_RULES]
        MiningSequenceRule.objects.bulk_create([
            MiningSequenceRule(run=run, antecedent=r['antecedent'], consequent=r['consequent'],
                               window_hours=r['window_hours'], occurrences=r['occurrences'],
                               support=round(r['support'], 6), confidence=round(r['confidence'], 4),
                               lift=round(r['lift'], 3), model_version=run.model_version)
            for r in rules
        ])
        return {
            'rules': len(rules), 'customers': int(events['customer_id'].nunique()), 'tokens': int(len(events)),
            'top_rules': [f"{r['antecedent']} -> {r['consequent']} ({r['window_hours']}h, lift {r['lift']:.2f})"
                          for r in rules[:5]],
        }

    return execute('sequences', {'windows_hours': list(WINDOWS_HOURS), 'min_lift': MIN_LIFT}, body)
