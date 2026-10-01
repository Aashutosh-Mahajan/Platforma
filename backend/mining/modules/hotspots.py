"""Geographic demand hotspots (PRD §8.4).

Per city, restaurants (or venues) are clustered on their coordinates with
K-Means weighted by how much demand each one handles over the last
LOOKBACK_DAYS, k picked by silhouette in [2, 8]. Clustering per city keeps
one dense metro from swallowing everything. Each cluster reports demand,
revenue, supply (outlets in it), demand per outlet and average delivery
time, and is labelled against the median cluster:

  undersupplied  demand per outlet > 1.5x the median -> recruit partners here
  oversupplied   demand per outlet < 0.67x the median
  balanced       otherwise
"""
import math

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

from mining.models import MiningHotspot
from mining.registry import execute
from mining.modules import data

LOOKBACK_DAYS = 180
MAX_K = 8
MIN_POINTS_TO_SPLIT = 6
KM_PER_DEGREE = 111.0


def _project(lat, lng):
    """Equirectangular projection to km — accurate enough within one city."""
    lat0 = np.radians(np.mean(lat))
    return np.column_stack([lat * KM_PER_DEGREE, lng * KM_PER_DEGREE * np.cos(lat0)])


def cluster_city(points):
    """points: DataFrame [lat, lng, weight]. Returns (labels, silhouette or None)."""
    n = len(points)
    if n < MIN_POINTS_TO_SPLIT:
        return np.zeros(n, dtype=int), None
    X = _project(points['lat'].to_numpy(), points['lng'].to_numpy())
    weights = points['weight'].to_numpy(dtype=float) + 1.0
    best = (None, -1.0)
    for k in range(2, min(MAX_K, n // 3) + 1):
        labels = KMeans(n_clusters=k, n_init=10, random_state=42).fit_predict(X, sample_weight=weights)
        if len(set(labels)) < 2:
            continue
        score = silhouette_score(X, labels)
        if score > best[1]:
            best = (labels, score)
    if best[0] is None:
        return np.zeros(n, dtype=int), None
    return best[0], round(float(best[1]), 4)


def summarise(points, labels, domain, city):
    out = []
    for label in sorted(set(labels)):
        members = points[labels == label]
        w = members['weight'].to_numpy(dtype=float)
        weights = w if w.sum() > 0 else np.ones(len(members))
        lat = float(np.average(members['lat'], weights=weights))
        lng = float(np.average(members['lng'], weights=weights))
        dist = np.hypot((members['lat'] - lat) * KM_PER_DEGREE,
                        (members['lng'] - lng) * KM_PER_DEGREE * math.cos(math.radians(lat)))
        label_area = members['area'].mode().iat[0] if 'area' in members and members['area'].notna().any() else city
        delivery = members['delivery_minutes'].dropna() if 'delivery_minutes' in members else pd.Series(dtype=float)
        out.append({
            'domain': domain, 'city': city, 'label': f"{label_area}, {city}" if city else str(label_area),
            'center_lat': round(lat, 6), 'center_lng': round(lng, 6),
            'radius_km': round(float(np.quantile(dist, 0.9)) if len(dist) else 0.0, 2),
            'demand': int(w.sum()), 'revenue': round(float(members['revenue'].sum()), 2),
            'supply': int(len(members)),
            'avg_delivery_minutes': round(float(delivery.mean()), 1) if len(delivery) else None,
        })
    return out


def _opportunity(clusters):
    if not clusters:
        return clusters
    ratios = [c['demand'] / max(c['supply'], 1) for c in clusters]
    median = float(np.median(ratios)) or 1.0
    for c, r in zip(clusters, ratios):
        c['demand_per_supply'] = round(r, 3)
        c['opportunity'] = 'undersupplied' if r > 1.5 * median else 'oversupplied' if r < 0.67 * median else 'balanced'
    return clusters


def run_hotspots():
    def body(run):
        since = pd.Timestamp(data.today()) - pd.Timedelta(days=LOOKBACK_DAYS)
        clusters, silhouettes = [], {}

        restaurants = data.current_restaurants().dropna(subset=['lat', 'lng'])
        orders = data.orders()
        if len(restaurants) and len(orders):
            recent = orders[(orders['date'] >= since) & ~orders['is_cancelled']]
            per = recent.groupby('restaurant_id').agg(weight=('order_id', 'count'), revenue=('total', 'sum'),
                                                      delivery_minutes=('delivery_minutes', 'mean'))
            points = restaurants.join(per, on='restaurant_id').fillna({'weight': 0, 'revenue': 0})
            zesty = []
            for city, group in points.groupby(points['city'].replace('', 'Unknown')):
                group = group.reset_index(drop=True)
                labels, sil = cluster_city(group)
                if sil is not None:
                    silhouettes[f'zesty:{city}'] = sil
                zesty += summarise(group, labels, 'zesty', city)
            clusters += _opportunity(zesty)

        venues = data.venues().dropna(subset=['lat', 'lng'])
        if len(venues):
            from warehouse.models import FactBooking
            per_venue = pd.DataFrame.from_records(
                list(FactBooking.objects.filter(
                    date__full_date__gte=since.date(), date__full_date__lte=data.today(),
                    is_cancelled=False, venue__isnull=False,
                ).values_list('venue__venue_id', 'booking_total')),
                columns=['venue_id', 'revenue'],
            )
            per_venue['revenue'] = per_venue['revenue'].astype(float)
            agg = per_venue.groupby('venue_id').agg(weight=('revenue', 'size'), revenue=('revenue', 'sum'))
            points = venues.join(agg, on='venue_id').fillna({'weight': 0, 'revenue': 0}).rename(columns={'name': 'area'})
            eventra = []
            for city, group in points.groupby(points['city'].replace('', 'Unknown')):
                group = group.reset_index(drop=True)
                labels, sil = cluster_city(group)
                if sil is not None:
                    silhouettes[f'eventra:{city}'] = sil
                eventra += summarise(group, labels, 'eventra', city)
            clusters += _opportunity(eventra)

        if not clusters:
            return {'skipped': True, 'reason': 'no restaurants or venues with coordinates'}
        MiningHotspot.objects.bulk_create([MiningHotspot(run=run, model_version=run.model_version, **c) for c in clusters])
        return {
            'clusters': len(clusters), 'lookback_days': LOOKBACK_DAYS,
            'mean_silhouette': round(float(np.mean(list(silhouettes.values()))), 4) if silhouettes else None,
            'undersupplied': sum(c['opportunity'] == 'undersupplied' for c in clusters),
        }

    return execute('hotspots', {'lookback_days': LOOKBACK_DAYS, 'max_k': MAX_K}, body)
