"""Basket analysis: association rules with Apriori, kept level by level.

Transactions are Mumbai orders. Two views:

  category level   each order as the set of menu categories in it
                   (Main Course, Breads, Beverages, Desserts, Rice, Starters),
                   across every restaurant. Small enough to show Apriori's
                   candidate generation level by level: C1 -> L1 -> C2
                   (joined from L1, pruned by the Apriori property) -> L2 ...
  item level       each order at the busiest restaurant as the set of dishes
                   in it, mined with mlxtend's Apriori and FP-Growth, and timed
                   at several minimum supports.

Rules carry support, confidence, lift, leverage and conviction, mined at
low thresholds so the console can raise them with sliders. Lift is the
filter that matters: a rule about a dish everyone orders anyway can have
high confidence and still say nothing (lift near 1).
"""
import itertools
import time

import pandas as pd
from mlxtend.frequent_patterns import apriori, association_rules, fpgrowth

from mining.modules.lab_common import save
from mining.registry import execute

CATEGORY_MIN_SUPPORT = 0.01
ITEM_MIN_SUPPORT = 0.01
MIN_CONFIDENCE = 0.1
SUPPORT_LEVELS = [0.005, 0.01, 0.02, 0.05, 0.1]


def level_wise(transactions, min_support):
    """Textbook Apriori on a list of sets: returns every level's candidates
    (with counts) and frequent itemsets, and what the Apriori property pruned."""
    n = len(transactions)
    items = sorted({i for t in transactions for i in t})
    levels = []
    candidates = [frozenset([i]) for i in items]
    frequent_prev = None
    k = 1
    while candidates:
        counts = {c: 0 for c in candidates}
        for t in transactions:
            for c in candidates:
                if c <= t:
                    counts[c] += 1
        frequent = {c: v for c, v in counts.items() if v / n >= min_support}
        levels.append({
            'k': k,
            'candidates': [{'itemset': sorted(c), 'count': v, 'support': v / n, 'frequent': c in frequent}
                           for c, v in sorted(counts.items(), key=lambda kv: -kv[1])],
            'pruned_by_apriori': pruned if k > 1 else [],
            'frequent_count': len(frequent),
        })
        if not frequent:
            break
        frequent_prev = set(frequent)
        k += 1
        joined = {a | b for a, b in itertools.combinations(frequent_prev, 2) if len(a | b) == k}
        candidates, pruned = [], []
        for c in sorted(joined, key=sorted):
            if all(frozenset(sub) in frequent_prev for sub in itertools.combinations(c, k - 1)):
                candidates.append(c)
            else:
                pruned.append(sorted(c))
    return levels


def rules_table(itemsets, min_conf):
    if itemsets.empty:
        return []
    rules = association_rules(itemsets, metric='confidence', min_threshold=min_conf)
    out = []
    for r in rules.to_dict(orient='records'):
        conviction = float(r['conviction'])
        out.append({'antecedent': sorted(r['antecedents']), 'consequent': sorted(r['consequents']),
                    'antecedent_support': float(r['antecedent support']),
                    'consequent_support': float(r['consequent support']),
                    'support': float(r['support']), 'confidence': float(r['confidence']), 'lift': float(r['lift']),
                    'leverage': float(r['leverage']),
                    'conviction': None if conviction == float('inf') else conviction})
    out.sort(key=lambda r: -r['lift'])
    return out


def one_hot(baskets):
    items = sorted({i for b in baskets for i in b})
    return pd.DataFrame([[i in b for i in items] for b in baskets], columns=items)


def run_lab_apriori():
    def body(run):
        from warehouse.models import DimMenuItem, FactOrderItem

        names = dict(DimMenuItem.objects.filter(is_current=True).values_list('item_id', 'item_name'))
        cats = dict(DimMenuItem.objects.filter(is_current=True).values_list('item_id', 'category'))
        rows = list(FactOrderItem.objects.exclude(order_id__isnull=True)
                    .values_list('order_id', 'restaurant_id', 'menu_item_id'))
        if len(rows) < 100:
            return {'skipped': True, 'reason': 'Not enough orders yet.'}

        by_order_cat, by_rest = {}, {}
        for order_id, rest_id, item_id in rows:
            if cats.get(item_id):
                by_order_cat.setdefault(order_id, set()).add(cats[item_id])
            if names.get(item_id):
                by_rest.setdefault(rest_id, {}).setdefault(order_id, set()).add(names[item_id])

        cat_tx = [frozenset(b) for b in by_order_cat.values()]
        levels = level_wise(cat_tx, CATEGORY_MIN_SUPPORT)
        cat_df = one_hot(cat_tx)
        cat_sets = apriori(cat_df, min_support=CATEGORY_MIN_SUPPORT, use_colnames=True)
        cat_rules = rules_table(cat_sets, MIN_CONFIDENCE)

        rest_key = max(by_rest, key=lambda r: len(by_rest[r]))
        from warehouse.models import DimRestaurant
        rest_name = DimRestaurant.objects.filter(restaurant_id=rest_key, is_current=True).values_list('name', flat=True).first()
        item_tx = list(by_rest[rest_key].values())
        item_df = one_hot(item_tx)
        item_sets = apriori(item_df, min_support=ITEM_MIN_SUPPORT, use_colnames=True)
        item_rules = rules_table(item_sets, MIN_CONFIDENCE)

        timing = []
        for s in SUPPORT_LEVELS:
            t0 = time.perf_counter()
            a = apriori(item_df, min_support=s, use_colnames=True)
            t1 = time.perf_counter()
            f = fpgrowth(item_df, min_support=s, use_colnames=True)
            t2 = time.perf_counter()
            timing.append({'min_support': s, 'apriori_itemsets': len(a), 'fpgrowth_itemsets': len(f),
                           'apriori_ms': (t1 - t0) * 1000, 'fpgrowth_ms': (t2 - t1) * 1000,
                           'by_size': a['itemsets'].map(len).value_counts().sort_index().to_dict() if len(a) else {}})

        def itemsets_payload(sets, n_tx):
            return [{'itemset': sorted(s), 'support': float(v), 'count': round(float(v) * n_tx), 'size': len(s)}
                    for s, v in zip(sets['itemsets'], sets['support'])]

        save(run, 'lab_apriori', {
            'category': {
                'transactions': len(cat_tx), 'min_support': CATEGORY_MIN_SUPPORT,
                'sample': [sorted(t) for t in cat_tx[:12]],
                'item_frequency': cat_df.mean().sort_values(ascending=False).to_dict(),
                'levels': levels, 'itemsets': itemsets_payload(cat_sets, len(cat_tx)), 'rules': cat_rules,
            },
            'item': {
                'restaurant': rest_name or f'Restaurant {rest_key}', 'restaurant_id': rest_key,
                'transactions': len(item_tx), 'min_support': ITEM_MIN_SUPPORT,
                'sample': [sorted(t) for t in item_tx[:12]],
                'itemsets': itemsets_payload(item_sets, len(item_tx)), 'rules': item_rules[:400],
                'timing': timing,
            },
            'min_confidence': MIN_CONFIDENCE,
        })
        return {'category_rules': len(cat_rules), 'item_rules': len(item_rules), 'restaurant': rest_key}

    return execute('lab_apriori', {'category_min_support': CATEGORY_MIN_SUPPORT,
                                   'item_min_support': ITEM_MIN_SUPPORT}, body)
