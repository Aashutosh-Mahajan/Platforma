"""Mumbai area clustering: the map in the admin console, and the worked
clusters and locality hierarchy pages (K-Means and agglomerative clustering).

Every locality in the gazetteer (core/mumbai.py) becomes one row of
features built from the warehouse:

  residents            customers whose default address is there
  orders_placed        orders placed by those residents
  orders_per_resident  how often a resident orders
  avg_order_value      what a resident's order is worth (Rs)
  restaurants          kitchens located there
  demand_per_kitchen   residents' orders per local kitchen (supply gap)
  orders_served        orders cooked by the local kitchens
  avg_delivery_min     how long the local kitchens take to deliver
  bookings             event bookings at the area's venues

The clustering features are standardised (z-scores) so rupees don't drown
out counts. K-Means is fitted for k = 2..8; k is chosen by silhouette
among 3..6 (the elbow is reported alongside). The same matrix is
clustered agglomeratively with single, complete, average and Ward
linkage, and a dendrogram is stored for each. Clusters are named from
their profile ("Premium high-spend", "Underserved", ...), each with the
action it suggests.

Outputs (MiningLabArtifact):
  mumbai_areas      areas with features and cluster labels, cluster
                    profiles, elbow / silhouette, a step-by-step K-Means trace
  mumbai_points     restaurants and venues with coordinates and demand
  area_hierarchy    dendrograms, linkage comparison, distance matrix, merges
"""
import numpy as np
import pandas as pd
from scipy.cluster.hierarchy import cophenet, dendrogram, fcluster, linkage
from scipy.spatial.distance import pdist, squareform
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.metrics import adjusted_rand_score, davies_bouldin_score, silhouette_score
from sklearn.preprocessing import StandardScaler

from core import mumbai
from mining.modules import data
from mining.modules.lab_common import orders_frame, save
from mining.registry import execute

FEATURES = ['log_orders_placed', 'orders_per_resident', 'avg_order_value', 'log_restaurants',
            'log_demand_per_kitchen', 'avg_delivery_min', 'log_bookings']
FEATURE_LABELS = {
    'log_orders_placed': 'Orders placed by residents (log)', 'orders_per_resident': 'Orders per resident',
    'avg_order_value': 'Average order value (Rs)', 'log_restaurants': 'Restaurants (log)',
    'log_demand_per_kitchen': 'Resident orders per local kitchen (log)',
    'avg_delivery_min': 'Average delivery time (min)', 'log_bookings': 'Event bookings at local venues (log)',
}
K_RANGE = range(2, 9)
K_CHOICE = range(3, 7)
LINKAGES = ['single', 'complete', 'average', 'ward']

# Cluster names, in the order they are handed out: each goes to the
# cluster that scores highest on it among those still unnamed.
PROFILES = [
    ('Premium high-spend', lambda z: z['avg_order_value'] + z['orders_per_resident'],
     'High-value residents: premium partners, loyalty perks and curated events.'),
    ('Underserved demand', lambda z: z['log_demand_per_kitchen'] - z['log_restaurants'],
     'Many orders, few local kitchens: recruit restaurants and cloud kitchens here.'),
    ('Dining & events hub', lambda z: z['log_restaurants'] + z['log_bookings'],
     'Dense supply and venues: pre-show dining bundles and event promotions.'),
    ('Budget high-volume', lambda z: z['log_orders_placed'] - z['avg_order_value'],
     'Lots of orders at low value: combo meals and free-delivery thresholds.'),
    ('Low activity', lambda z: -(z['log_orders_placed'] + z['log_restaurants']),
     'Little demand or supply: awareness campaigns and first-order offers.'),
    ('Steady residential', lambda z: -abs(z).sum(),
     'Typical demand and supply: keep service levels steady.'),
]


def area_features():
    """One row per gazetteer area, plus the restaurant/venue points for the map."""
    from warehouse.models import DimCustomer, DimVenue, FactBooking

    areas = pd.DataFrame(list(mumbai.AREAS.values())).rename(columns={'name': 'area'})
    o = orders_frame()
    rest = data.current_restaurants()
    rest = rest[rest['area'].isin(mumbai.AREAS)] if len(rest) else rest

    residents = pd.Series(
        list(DimCustomer.objects.filter(is_current=True).exclude(home_area='').values_list('home_area', flat=True))
    ).value_counts()
    live = o[~o['is_cancelled']] if len(o) else o
    placed = live.groupby('home_area').agg(orders_placed=('order_id', 'count'), avg_order_value=('total', 'mean'))
    served = o.groupby('area').agg(
        orders_served=('order_id', 'count'), revenue=('total', 'sum'),
        avg_delivery_min=('delivery_minutes', 'mean'), cancel_rate=('is_cancelled', 'mean'),
    )
    top_cuisine = (live[live['home_area'] != ''].groupby('home_area')['cuisine']
                   .agg(lambda s: s.value_counts().index[0] if len(s) else ''))
    kitchens = rest.groupby('area').size() if len(rest) else pd.Series(dtype=int)

    venue_area = dict(DimVenue.objects.values_list('venue_key', 'zone'))
    b = pd.DataFrame(list(FactBooking.objects.filter(is_cancelled=False)
                          .values_list('venue_id', 'booking_total', 'seats_booked')),
                     columns=['venue_key', 'total', 'seats'])
    if len(b):
        b['area'] = b['venue_key'].map(venue_area)
        b['total'] = b['total'].astype(float)
        booked = b.groupby('area').agg(bookings=('total', 'count'), ticket_revenue=('total', 'sum'))
    else:
        booked = pd.DataFrame(columns=['bookings', 'ticket_revenue'])
    venues = pd.Series(list(DimVenue.objects.values_list('zone', flat=True))).value_counts()

    df = areas.set_index('area')
    df['residents'] = residents.reindex(df.index).fillna(0)
    df = df.join(placed).join(served).join(booked)
    df['restaurants'] = kitchens.reindex(df.index).fillna(0)
    df['venues'] = venues.reindex(df.index).fillna(0)
    df['top_cuisine'] = top_cuisine.reindex(df.index).fillna('')
    for col in ('orders_placed', 'orders_served', 'revenue', 'bookings', 'ticket_revenue'):
        df[col] = df[col].fillna(0)
    df['avg_order_value'] = df['avg_order_value'].fillna(df['avg_order_value'].median())
    # An area with no kitchens has no delivery time of its own: use the city's.
    df['avg_delivery_min'] = df['avg_delivery_min'].fillna(df['avg_delivery_min'].median())
    df['cancel_rate'] = df['cancel_rate'].fillna(0)
    df['orders_per_resident'] = df['orders_placed'] / df['residents'].clip(lower=1)
    df['demand_per_kitchen'] = df['orders_placed'] / df['restaurants'].clip(lower=1)
    df['log_orders_placed'] = np.log1p(df['orders_placed'])
    df['log_restaurants'] = np.log1p(df['restaurants'])
    df['log_demand_per_kitchen'] = np.log1p(df['demand_per_kitchen'])
    df['log_bookings'] = np.log1p(df['bookings'])
    df = df.reset_index()

    # Map points.
    by_rest = o.groupby('restaurant_id').agg(orders=('order_id', 'count'), revenue=('total', 'sum')) if len(o) else None
    restaurants = []
    for r in rest.itertuples():
        if r.lat is None or r.lng is None or pd.isna(r.lat):
            continue
        stats = by_rest.loc[r.restaurant_id] if by_rest is not None and r.restaurant_id in by_rest.index else None
        restaurants.append({
            'id': r.restaurant_id, 'name': r.name, 'area': r.area, 'lat': r.lat, 'lng': r.lng,
            'cuisine': data.primary_cuisine(r.cuisine),
            'orders': int(stats['orders']) if stats is not None else 0,
            'revenue': float(stats['revenue']) if stats is not None else 0.0,
        })
    venue_rows = []
    by_venue = b.groupby('venue_key').agg(bookings=('total', 'count'), revenue=('total', 'sum')) if len(b) else None
    for key, vid, name, zone, lat, lng in DimVenue.objects.values_list(
            'venue_key', 'venue_id', 'venue_name', 'zone', 'latitude', 'longitude'):
        if lat is None or lng is None:
            continue
        stats = by_venue.loc[key] if by_venue is not None and key in by_venue.index else None
        venue_rows.append({'id': vid, 'name': name, 'area': zone, 'lat': lat, 'lng': lng,
                           'bookings': int(stats['bookings']) if stats is not None else 0,
                           'revenue': float(stats['revenue']) if stats is not None else 0.0})
    return df, restaurants, venue_rows


def name_clusters(centroids_z):
    """{cluster: (name, action)} by handing out PROFILES greedily."""
    remaining = list(centroids_z.index)
    names = {}
    for name, score, action in PROFILES:
        if not remaining:
            break
        best = max(remaining, key=lambda c: score(centroids_z.loc[c]))
        names[best] = (name, action)
        remaining.remove(best)
    for c in remaining:
        names[c] = ('Steady residential', PROFILES[-1][2])
    return names


def kmeans_trace(points, k, seed=7, max_steps=15):
    """Lloyd's algorithm on the 2-D projection, recording every assignment
    and centroid update until the centroids stop moving."""
    rng = np.random.default_rng(seed)
    centroids = points[rng.choice(len(points), k, replace=False)].copy()
    steps = []
    for step in range(1, max_steps + 1):
        dist = ((points[:, None, :] - centroids[None, :, :]) ** 2).sum(axis=2)
        labels = dist.argmin(axis=1)
        new = np.array([points[labels == c].mean(axis=0) if (labels == c).any() else centroids[c] for c in range(k)])
        wcss = float(((points - new[labels]) ** 2).sum())
        shift = float(np.sqrt(((new - centroids) ** 2).sum(axis=1)).max())
        steps.append({'step': step, 'labels': labels.tolist(), 'centroids_before': centroids.tolist(),
                      'centroids_after': new.tolist(), 'wcss': wcss, 'max_shift': shift})
        centroids = new
        if shift < 1e-6:
            break
    return steps


def hierarchy(X, names):
    """Linkage comparison, dendrograms and the distance matrix."""
    dist = pdist(X, metric='euclidean')
    out = {'methods': {}, 'labels': names}
    for method in LINKAGES:
        Z = linkage(X, method=method)
        coph, _ = cophenet(Z, dist)
        sil = {}
        for k in range(2, 9):
            labels = fcluster(Z, t=k, criterion='maxclust')
            if 1 < len(set(labels)) < len(X):
                sil[k] = silhouette_score(X, labels)
        dg = dendrogram(Z, labels=names, no_plot=True, color_threshold=0)
        merges = []
        clusters = {i: [n] for i, n in enumerate(names)}
        for i, (a, b_, d, size) in enumerate(Z):
            left, right = clusters[int(a)], clusters[int(b_)]
            clusters[len(names) + i] = left + right
            merges.append({'step': i + 1, 'left': left, 'right': right, 'distance': d, 'size': int(size)})
        best_k = max(sil, key=sil.get) if sil else None
        out['methods'][method] = {
            'cophenetic': coph, 'silhouette_by_k': sil, 'best_k': best_k,
            'best_silhouette': sil.get(best_k) if best_k else None,
            'dendrogram': {'icoord': dg['icoord'], 'dcoord': dg['dcoord'], 'leaves': dg['ivl']},
            'merges': merges,
            'max_distance': float(Z[:, 2].max()),
            # Leaf order -> cluster at a few cut levels, for colouring the dendrogram.
            'cuts': {k: dict(zip(names, fcluster(Z, t=k, criterion='maxclust').tolist())) for k in range(2, 9)},
        }
    out['distance_matrix'] = squareform(dist).round(2).tolist()
    out['best_method'] = max(out['methods'], key=lambda m: out['methods'][m]['best_silhouette'] or -1)
    return out


def run_area_clustering():
    def body(run):
        df, restaurants, venues = area_features()
        if df['orders_placed'].sum() == 0:
            return {'skipped': True, 'reason': 'No orders in the warehouse yet.'}

        scaler = StandardScaler()
        X = scaler.fit_transform(df[FEATURES])
        elbow = []
        for k in K_RANGE:
            km = KMeans(n_clusters=k, n_init=20, random_state=42).fit(X)
            elbow.append({'k': k, 'wcss': km.inertia_, 'silhouette': silhouette_score(X, km.labels_),
                          'davies_bouldin': davies_bouldin_score(X, km.labels_), 'iterations': int(km.n_iter_)})
        chosen = max((e for e in elbow if e['k'] in K_CHOICE), key=lambda e: e['silhouette'])
        k = chosen['k']
        km = KMeans(n_clusters=k, n_init=20, random_state=42).fit(X)
        df['cluster'] = km.labels_

        centroids_z = pd.DataFrame(km.cluster_centers_, columns=FEATURES)
        names = name_clusters(centroids_z)
        df['cluster_name'] = df['cluster'].map(lambda c: names[c][0])

        pca = PCA(n_components=2, random_state=42)
        P = pca.fit_transform(X)
        df['pc1'], df['pc2'] = P[:, 0], P[:, 1]
        centroid_2d = pca.transform(km.cluster_centers_)
        trace = kmeans_trace(P, k)

        # Distance of each area to its own centroid (in standardised units).
        df['distance_to_centroid'] = np.sqrt(((X - km.cluster_centers_[km.labels_]) ** 2).sum(axis=1))

        profiles = []
        for c in range(k):
            members = df[df['cluster'] == c]
            profiles.append({
                'cluster': c, 'name': names[c][0], 'action': names[c][1], 'size': len(members),
                'areas': members['area'].tolist(),
                'centroid_z': dict(zip(FEATURES, km.cluster_centers_[c])),
                'centroid_2d': centroid_2d[c].tolist(),
                'means': {col: members[col].mean() for col in (
                    'residents', 'orders_placed', 'orders_per_resident', 'avg_order_value', 'restaurants',
                    'demand_per_kitchen', 'orders_served', 'revenue', 'avg_delivery_min', 'bookings',
                    'cancel_rate', 'affluence')},
                'lat': members['lat'].mean(), 'lng': members['lng'].mean(),
            })

        hier = hierarchy(X, df['area'].tolist())
        ward_labels = fcluster(linkage(X, method='ward'), t=k, criterion='maxclust')
        df['ward_cluster'] = ward_labels - 1
        agreement = adjusted_rand_score(km.labels_, ward_labels)
        hier['kmeans_agreement'] = {'k': k, 'adjusted_rand_index': agreement}
        hier['kmeans_labels'] = dict(zip(df['area'], df['cluster_name']))

        columns = ['area', 'zone', 'district', 'pincode', 'lat', 'lng', 'affluence', 'population', 'residents',
                   'orders_placed', 'orders_per_resident', 'avg_order_value', 'restaurants', 'demand_per_kitchen',
                   'orders_served', 'revenue', 'avg_delivery_min', 'cancel_rate', 'venues', 'bookings',
                   'ticket_revenue', 'top_cuisine', 'cluster', 'cluster_name', 'ward_cluster', 'pc1', 'pc2',
                   'distance_to_centroid'] + FEATURES
        save(run, 'mumbai_areas', {
            'city': mumbai.CITY, 'zones': mumbai.ZONES,
            'features': [{'key': f, 'label': FEATURE_LABELS[f]} for f in FEATURES],
            'areas': df[columns].to_dict(orient='records'),
            'clusters': profiles, 'k': k, 'elbow': elbow,
            'scaler': {'mean': dict(zip(FEATURES, scaler.mean_)), 'std': dict(zip(FEATURES, scaler.scale_))},
            'pca': {'explained_variance': pca.explained_variance_ratio_.tolist(),
                    'loadings': {f: pca.components_[:, i].tolist() for i, f in enumerate(FEATURES)}},
            'trace': trace,
            'totals': {'areas': len(df), 'residents': df['residents'].sum(), 'orders': df['orders_placed'].sum(),
                       'restaurants': len(restaurants), 'venues': len(venues)},
        })
        save(run, 'mumbai_points', {'restaurants': restaurants, 'venues': venues})
        save(run, 'area_hierarchy', hier)
        return {'areas': len(df), 'k': k, 'silhouette': round(chosen['silhouette'], 3),
                'ward_vs_kmeans_ari': round(agreement, 3), 'best_linkage': hier['best_method']}

    return execute('areas', {'k_range': [K_RANGE.start, K_RANGE.stop - 1], 'features': FEATURES}, body)
