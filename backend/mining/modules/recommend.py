"""Recommendations (PRD §8.4).

Food: item-based collaborative filtering at restaurant level. Customers x
restaurants (log-scaled order counts) -> cosine similarity between
restaurants -> each customer's unvisited restaurants scored by similarity
to the ones they order from, with popularity as the cold-start fallback.
Evaluated leave-last-out: hide each repeat customer's most recent *new*
restaurant and check whether it lands in their top 10 (hit rate@10),
against a popularity-only baseline. The same evaluation picks how much
popularity to blend into the similarity score (POPULARITY_WEIGHTS): on
data with little taste structure popularity should win, and does.

Events: category affinity from a customer's own bookings (recency
weighted), and for customers who only order food, a cross-domain mapping
learned from customers who use both — P(event category | cuisines they
order). Categories are matched to actual upcoming events at serve time,
since events expire and a stored event list would go stale overnight.
"""
from collections import defaultdict

import numpy as np
import pandas as pd
from scipy import sparse
from sklearn.preprocessing import normalize

from mining.models import MiningRecommendation
from mining.registry import execute
from mining.modules import data

TOP_FOOD = 10
POPULARITY_WEIGHTS = (0.05, 0.5, 2.0, 8.0)
TOP_EVENT_CATEGORIES = 3
MIN_ORDERS = 50


def _index(values):
    uniq = sorted(set(values))
    return uniq, {v: i for i, v in enumerate(uniq)}


def restaurant_similarity(orders):
    """Returns (customers, restaurants, interaction matrix, restaurant x
    restaurant cosine similarity)."""
    counts = orders.groupby(['customer_id', 'restaurant_id']).size().reset_index(name='n')
    customers, c_idx = _index(counts['customer_id'])
    restaurants, r_idx = _index(counts['restaurant_id'])
    matrix = sparse.csr_matrix(
        (np.log1p(counts['n'].to_numpy(dtype=float)),
         (counts['customer_id'].map(c_idx), counts['restaurant_id'].map(r_idx))),
        shape=(len(customers), len(restaurants)),
    )
    item_vectors = normalize(matrix.T.tocsr())
    similarity = (item_vectors @ item_vectors.T).toarray()
    np.fill_diagonal(similarity, 0.0)
    return customers, restaurants, matrix, similarity


def score_food(matrix, similarity, popularity, exclude_seen=True, popularity_weight=0.05):
    """Scores for every (customer, restaurant): similarity-weighted history
    (normalised per customer) plus a popularity prior, which also serves
    cold starts.
    """
    scores = np.asarray(matrix @ similarity)
    scores = scores / (scores.max(axis=1, keepdims=True) + 1e-9)
    scores = scores + popularity_weight * popularity[None, :]
    if exclude_seen:
        seen = matrix.toarray() > 0
        scores[seen] = -np.inf
    return scores


def hit_rate_at_k(orders, k=TOP_FOOD):
    """Leave-last-out on each customer's most recent first visit to a new
    restaurant (only customers with 3+ distinct restaurants), for every
    popularity weight. Returns metrics including the best weight.
    """
    first_visits = orders.sort_values('date').drop_duplicates(['customer_id', 'restaurant_id'])
    per_customer = first_visits.groupby('customer_id')
    held_out = per_customer.tail(1)
    eligible = per_customer['restaurant_id'].transform('count') >= 3
    held_out = held_out[held_out['customer_id'].isin(first_visits.loc[eligible, 'customer_id'])]
    if len(held_out) < 20:
        return None
    held_pairs = set(zip(held_out['customer_id'], held_out['restaurant_id']))
    train = orders[~orders.apply(lambda r: (r['customer_id'], r['restaurant_id']) in held_pairs, axis=1)]
    customers, restaurants, matrix, similarity = restaurant_similarity(train)
    c_idx = {c: i for i, c in enumerate(customers)}
    r_idx = {r: i for i, r in enumerate(restaurants)}
    popularity = np.asarray(matrix.sum(axis=0)).ravel()
    popularity = popularity / (popularity.max() or 1)
    baseline = np.tile(popularity, (len(customers), 1))
    baseline[matrix.toarray() > 0] = -np.inf
    pairs = [(c_idx[c], r_idx[r]) for c, r in held_pairs if c in c_idx and r in r_idx]
    if not pairs:
        return None

    def hit_rate(scores):
        return sum(target in np.argsort(-scores[row])[:k] for row, target in pairs) / len(pairs)

    by_weight = {w: hit_rate(score_food(matrix, similarity, popularity, popularity_weight=w))
                 for w in POPULARITY_WEIGHTS}
    best = max(by_weight, key=by_weight.get)
    return {'hit_rate_at_10': round(by_weight[best], 4), 'popularity_weight': best,
            'hit_rate_by_weight': {str(w): round(v, 4) for w, v in by_weight.items()},
            'popularity_hit_rate_at_10': round(hit_rate(baseline), 4), 'evaluated_customers': len(pairs)}


def event_affinities(bookings, orders, restaurants):
    """{customer_id: [(category, score, reason)]} — own bookings first,
    cross-domain (cuisine -> category) for food-only customers.
    """
    today = pd.Timestamp(data.today())
    result = {}
    b = bookings[~bookings['is_cancelled']].copy()
    if len(b):
        b['weight'] = np.exp(-(today - b['date']).dt.days.clip(lower=0) / 180.0)
        own = b.groupby(['customer_id', 'category'])['weight'].sum().reset_index()
        for customer_id, g in own.groupby('customer_id'):
            top = g.sort_values('weight', ascending=False).head(TOP_EVENT_CATEGORIES)
            result[customer_id] = [
                (row.category, round(float(row.weight), 4), f"You've booked {row.category} events before")
                for row in top.itertuples()
            ]

    if not len(orders) or not len(b):
        return result, {}

    cuisine_of = dict(zip(restaurants['restaurant_id'], restaurants['cuisine'].map(data.primary_cuisine)))
    o = orders[~orders['is_cancelled']].assign(cuisine=lambda d: d['restaurant_id'].map(cuisine_of).fillna('Other'))
    customer_cuisines = o.groupby(['customer_id', 'cuisine']).size().rename('n').reset_index()
    booked_categories = b.groupby(['customer_id', 'category']).size().rename('m').reset_index()

    both = customer_cuisines.merge(booked_categories, on='customer_id')
    if both.empty:
        return result, {}
    joint = both.groupby(['cuisine', 'category'])['customer_id'].nunique().rename('k').reset_index()
    cuisine_customers = both.groupby('cuisine')['customer_id'].nunique()
    joint['p'] = joint['k'] / joint['cuisine'].map(cuisine_customers)
    category_prior = booked_categories.groupby('category')['customer_id'].nunique()
    category_prior = category_prior / category_prior.sum()
    joint['lift'] = joint['p'] / joint['category'].map(category_prior)
    mapping = joint[joint['k'] >= 3]

    for customer_id, g in customer_cuisines.groupby('customer_id'):
        if customer_id in result:
            continue
        scored = defaultdict(float)
        why = {}
        for row in g.itertuples():
            for m in mapping[mapping['cuisine'] == row.cuisine].itertuples():
                value = m.p * np.log1p(row.n)
                if value > scored[m.category]:
                    why[m.category] = f"Popular with people who order {row.cuisine}"
                scored[m.category] = max(scored[m.category], value)
        top = sorted(scored.items(), key=lambda kv: -kv[1])[:TOP_EVENT_CATEGORIES]
        if top:
            result[customer_id] = [(c, round(float(s), 4), why[c]) for c, s in top]

    strongest = mapping.sort_values('lift', ascending=False).head(5)
    return result, {
        'cross_domain_pairs': int(len(mapping)),
        'strongest_pairs': [
            {'cuisine': r.cuisine, 'category': r.category, 'lift': round(float(r.lift), 3)}
            for r in strongest.itertuples()
        ],
    }


def run_recommendations():
    def body(run):
        orders = data.orders()
        orders = orders[~orders['is_cancelled']] if len(orders) else orders
        bookings = data.bookings()
        restaurants = data.current_restaurants()
        name_of = dict(zip(restaurants['restaurant_id'], restaurants['name']))
        metrics = {}
        objs = []

        if len(orders) >= MIN_ORDERS:
            evaluation = hit_rate_at_k(orders)
            weight = evaluation['popularity_weight'] if evaluation else POPULARITY_WEIGHTS[0]
            customers, rest_ids, matrix, similarity = restaurant_similarity(orders)
            popularity = np.asarray(matrix.sum(axis=0)).ravel()
            popularity = popularity / (popularity.max() or 1)
            scores = score_food(matrix, similarity, popularity, popularity_weight=weight)
            # The similarity half of each score on its own, to say *why* a pick was made.
            taste = score_food(matrix, similarity, popularity, popularity_weight=0.0)
            dense = matrix.toarray()
            for row, customer_id in enumerate(customers):
                top = [j for j in np.argsort(-scores[row])[:TOP_FOOD] if np.isfinite(scores[row, j])]
                history = np.nonzero(dense[row])[0]
                for rank, j in enumerate(top, start=1):
                    anchor = history[np.argmax(similarity[j, history])] if len(history) else None
                    by_taste = (anchor is not None and similarity[j, anchor] > 0
                                and taste[row, j] >= weight * popularity[j])
                    reason = (f"Because you order from {name_of.get(rest_ids[anchor], 'a similar place')}"
                              if by_taste else 'Popular with Zesty customers')
                    objs.append(MiningRecommendation(
                        run=run, customer_id=int(customer_id), domain='food', item_id=int(rest_ids[j]),
                        label=name_of.get(rest_ids[j], f'Restaurant {rest_ids[j]}')[:255],
                        score=round(float(scores[row, j]), 5), rank=rank, reason=reason[:255],
                        model_version=run.model_version,
                    ))
            metrics['food'] = {'customers': len(customers), 'restaurants': len(rest_ids),
                               'evaluation': evaluation}

        affinities, cross = event_affinities(bookings, orders, restaurants) if len(bookings) else ({}, {})
        for customer_id, picks in affinities.items():
            for rank, (category, score, reason) in enumerate(picks, start=1):
                objs.append(MiningRecommendation(
                    run=run, customer_id=int(customer_id), domain='event', label=category,
                    score=score, rank=rank, reason=reason[:255], model_version=run.model_version,
                ))
        metrics['event'] = {'customers': len(affinities), **cross}

        if not objs:
            return {'skipped': True, 'reason': 'not enough orders or bookings', **metrics}
        MiningRecommendation.objects.bulk_create(objs, batch_size=5000)
        metrics['rows'] = len(objs)
        return metrics

    return execute('recommend', {'top_food': TOP_FOOD, 'top_event_categories': TOP_EVENT_CATEGORIES}, body)
