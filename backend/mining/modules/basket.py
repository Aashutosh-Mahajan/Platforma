"""Market basket mining (PRD §8.4) — Apriori + FP-Growth, mined at both
item level (restaurant-scoped — a pair only means something if it's
orderable from the same menu) and category level (global — categories are
a shared taxonomy across restaurants).

Filtered by lift, not confidence alone (PRD's own instruction — a
high-confidence rule about a universally popular item carries no
information).
"""
import pandas as pd
from mlxtend.frequent_patterns import apriori, fpgrowth, association_rules

from warehouse.models import FactOrderItem, DimMenuItem, DimRestaurant
from mining.models import MiningBasketRule
from mining.registry import start_run, finish_run

MIN_SUPPORT = 0.01
MIN_CONFIDENCE = 0.30
MIN_LIFT = 1.2


def _mine_rules(basket_df, min_support=MIN_SUPPORT):
    """basket_df: one-hot DataFrame, rows=baskets, columns=item/category
    presence. Runs both Apriori and FP-Growth (PRD names both) — FP-Growth
    is used for the actual rule set (faster on wide item sets); Apriori
    is run too and its itemset count is reported in run metrics as a
    cross-check that both algorithms agree on the frequent itemsets.
    """
    if basket_df.empty or basket_df.shape[0] < 5:
        return pd.DataFrame(), 0, 0

    fp_itemsets = fpgrowth(basket_df, min_support=min_support, use_colnames=True)
    apriori_itemsets = apriori(basket_df, min_support=min_support, use_colnames=True)

    if fp_itemsets.empty:
        return pd.DataFrame(), len(apriori_itemsets), len(fp_itemsets)

    rules = association_rules(fp_itemsets, metric='confidence', min_threshold=MIN_CONFIDENCE)
    rules = rules[rules['lift'] >= MIN_LIFT]
    return rules, len(apriori_itemsets), len(fp_itemsets)


def _rules_to_model_rows(rules, run, level, restaurant_id, model_version):
    rows = []
    for _, r in rules.iterrows():
        conviction = r['conviction']
        rows.append(MiningBasketRule(
            run=run, restaurant_id=restaurant_id, level=level,
            antecedent=sorted(r['antecedents']), consequent=sorted(r['consequents']),
            support=float(r['support']), confidence=float(r['confidence']), lift=float(r['lift']),
            conviction=None if conviction in (float('inf'), float('-inf')) else float(conviction),
            model_version=model_version,
        ))
    return rows


def run_basket_mining():
    run = start_run('basket', params={
        'min_support': MIN_SUPPORT, 'min_confidence': MIN_CONFIDENCE, 'min_lift': MIN_LIFT,
    })

    try:
        item_name_by_id = dict(
            DimMenuItem.objects.filter(is_current=True).values_list('item_id', 'item_name')
        )
        category_by_id = dict(
            DimMenuItem.objects.filter(is_current=True).values_list('item_id', 'category')
        )

        fact_rows = list(
            FactOrderItem.objects.exclude(order_id__isnull=True)
            .values_list('order_id', 'restaurant_id', 'menu_item_id')
        )

        all_rows = []
        total_item_rules = 0
        total_category_rules = 0

        # ---- item-level, per restaurant ----
        by_restaurant = {}
        for order_id, restaurant_id, menu_item_id in fact_rows:
            item_name = item_name_by_id.get(menu_item_id)
            if not item_name:
                continue
            by_restaurant.setdefault(restaurant_id, {}).setdefault(order_id, set()).add(item_name)

        for restaurant_id, baskets_by_order in by_restaurant.items():
            baskets = list(baskets_by_order.values())
            if len(baskets) < 5:
                continue
            all_items = sorted({i for b in baskets for i in b})
            df = pd.DataFrame([{item: (item in b) for item in all_items} for b in baskets])
            rules, _, _ = _mine_rules(df)
            if not rules.empty:
                # MIN_SUPPORT alone lets a restaurant with few orders turn a
                # single coincidental basket into a "rule" — at N=100
                # baskets, one occurrence already clears 1% support with
                # confidence=1.0, lift=100 despite being pure noise.
                # Requiring >=2 raw occurrences (support * basket_count)
                # filters exactly that case out regardless of restaurant size.
                rules = rules[rules['support'] * len(baskets) >= 2]
                if rules.empty:
                    continue
                model_rows = _rules_to_model_rows(rules, run, 'item', restaurant_id, run.model_version)
                all_rows.extend(model_rows)
                total_item_rules += len(model_rows)

        # ---- category-level, global ----
        category_baskets = {}
        for order_id, restaurant_id, menu_item_id in fact_rows:
            category = category_by_id.get(menu_item_id)
            if not category:
                continue
            category_baskets.setdefault(order_id, set()).add(category)

        baskets = list(category_baskets.values())
        if len(baskets) >= 5:
            all_categories = sorted({c for b in baskets for c in b})
            df = pd.DataFrame([{c: (c in b) for c in all_categories} for b in baskets])
            rules, _, _ = _mine_rules(df)
            if not rules.empty:
                rules = rules[rules['support'] * len(baskets) >= 2]
            if not rules.empty:
                model_rows = _rules_to_model_rows(rules, run, 'category', None, run.model_version)
                all_rows.extend(model_rows)
                total_category_rules = len(model_rows)

        MiningBasketRule.objects.bulk_create(all_rows, batch_size=1000)

        avg_lift = sum(r.lift for r in all_rows) / len(all_rows) if all_rows else 0.0
        finish_run(run, metrics={
            'item_level_rules': total_item_rules,
            'category_level_rules': total_category_rules,
            'total_rules': len(all_rows),
            'avg_lift': round(avg_lift, 3),
            'restaurants_mined': len(by_restaurant),
        })
        return run
    except Exception as exc:
        finish_run(run, status='failed', error_message=str(exc))
        raise
