"""Customer clusters (K-Means on RFM) and the segments and campaigns built on them.

Every Mumbai customer who has bought anything is described by recency,
frequency and monetary value (RFM). Frequency and money are heavy-tailed,
so they are log-transformed, then all three are standardised before
clustering (otherwise rupees would decide every distance).

K-Means is run for k = 1..10. The elbow (the point of maximum curvature of
WCSS, found with the kneedle method) and the silhouette score are both
reported; the segmentation uses the elbow's k (falling back to the best
silhouette when the curve has no clear knee). Each segment is profiled in
plain units (days, orders, rupees), by where its customers live and which
verticals they use, named by its RFM score, and given a marketing
strategy.

The area-level K-Means and the agglomerative locality hierarchy
live in areas.py, which clusters Mumbai's localities.
"""
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.metrics import calinski_harabasz_score, davies_bouldin_score, silhouette_score
from sklearn.preprocessing import StandardScaler

from core import mumbai
from mining.modules import data
from mining.modules.lab_common import rfm_frame, save
from mining.registry import execute

K_MAX = 10
SEGMENTS = [
    ('Champions', 'Bought recently, buy often and spend the most.',
     'Reward them: early access to big events, loyalty tier, referral bonuses. No discounts needed.'),
    ('Loyal regulars', 'Order often with solid spend.',
     'Upsell: premium restaurants, event + dinner bundles, subscription for free delivery.'),
    ('Potential loyalists', 'Recent customers with a few purchases.',
     'Nudge the next order: personalised picks, second-order coupon, cross-sell Eventra.'),
    ('Need attention', 'Average recency and spend, slipping.',
     'Re-engage with limited-time offers on their favourite cuisine or event category.'),
    ('At risk', 'Used to buy, but not for a while.',
     'Win-back campaign: "we miss you" coupon, survey on why they left.'),
    ('Hibernating', 'Long gone, low spend.',
     'Low-cost reactivation (email/push) only; do not spend heavily.'),
]


def knee(ks, wcss):
    """Kneedle: the k furthest below the straight line joining the ends of
    the (normalised) elbow curve."""
    x = (np.array(ks) - ks[0]) / (ks[-1] - ks[0])
    y = (np.array(wcss) - min(wcss)) / (max(wcss) - min(wcss) or 1)
    gap = (1 - x) - y
    return int(ks[int(np.argmax(gap))])


def run_customer_kmeans():
    def body(run):
        rfm = rfm_frame()
        if len(rfm) < 50:
            return {'skipped': True, 'reason': 'Not enough customers yet.'}
        rfm['log_frequency'] = np.log1p(rfm['frequency'])
        rfm['log_monetary'] = np.log1p(rfm['monetary'])
        cols = ['recency', 'log_frequency', 'log_monetary']
        scaler = StandardScaler()
        X = scaler.fit_transform(rfm[cols])
        sample_idx = np.random.default_rng(0).choice(len(X), min(3000, len(X)), replace=False)

        elbow = []
        for k in range(1, K_MAX + 1):
            km = KMeans(n_clusters=k, n_init=10, random_state=42).fit(X)
            row = {'k': k, 'wcss': km.inertia_, 'iterations': int(km.n_iter_)}
            if k > 1:
                row['silhouette'] = silhouette_score(X[sample_idx], km.labels_[sample_idx])
                row['davies_bouldin'] = davies_bouldin_score(X, km.labels_)
                row['calinski_harabasz'] = calinski_harabasz_score(X, km.labels_)
            elbow.append(row)
        elbow_k = knee([e['k'] for e in elbow], [e['wcss'] for e in elbow])
        best_sil = max((e for e in elbow if e['k'] >= 3), key=lambda e: e['silhouette'])['k']
        k = elbow_k if 3 <= elbow_k <= 6 else min(max(best_sil, 3), 6)

        km = KMeans(n_clusters=k, n_init=20, random_state=42).fit(X)
        rfm['cluster'] = km.labels_
        centroids = pd.DataFrame(scaler.inverse_transform(km.cluster_centers_), columns=cols)
        centroids['frequency'] = np.expm1(centroids['log_frequency'])
        centroids['monetary'] = np.expm1(centroids['log_monetary'])
        z = pd.DataFrame(km.cluster_centers_, columns=cols)
        score = -z['recency'] + z['log_frequency'] + z['log_monetary']
        order = list(score.sort_values(ascending=False).index)
        picks = np.linspace(0, len(SEGMENTS) - 1, k).round().astype(int)
        names = {c: SEGMENTS[picks[rank]] for rank, c in enumerate(order)}

        from warehouse.models import DimCustomer
        homes = dict(DimCustomer.objects.filter(is_current=True).values_list('customer_id', 'home_area'))
        rfm['zone'] = rfm['customer_id'].map(lambda c: mumbai.AREAS.get(homes.get(c, ''), {}).get('zone', 'Unknown'))
        purchases = data.purchases()
        uses = purchases.groupby(['customer_id', 'domain']).size().unstack(fill_value=0)
        rfm['uses_zesty'] = rfm['customer_id'].map(uses.get('zesty', pd.Series(dtype=int)) > 0).fillna(False)
        rfm['uses_eventra'] = rfm['customer_id'].map(uses.get('eventra', pd.Series(dtype=int)) > 0).fillna(False)

        profiles = []
        for c in order:
            members = rfm[rfm['cluster'] == c]
            name, who, strategy = names[c]
            profiles.append({
                'cluster': int(c), 'name': name, 'who': who, 'strategy': strategy,
                'size': len(members), 'share': len(members) / len(rfm),
                'recency': members['recency'].mean(), 'frequency': members['frequency'].mean(),
                'monetary': members['monetary'].mean(), 'median_monetary': members['monetary'].median(),
                'revenue_share': members['monetary'].sum() / rfm['monetary'].sum(),
                'centroid': {'recency': centroids.loc[c, 'recency'], 'frequency': centroids.loc[c, 'frequency'],
                             'monetary': centroids.loc[c, 'monetary']},
                'centroid_z': z.loc[c].to_dict(),
                'zones': members['zone'].value_counts(normalize=True).to_dict(),
                'uses_zesty': members['uses_zesty'].mean(), 'uses_eventra': members['uses_eventra'].mean(),
            })

        pca = PCA(n_components=2, random_state=0).fit(X)
        P = pca.transform(X[sample_idx])
        scatter_idx = sample_idx[:900]
        save(run, 'lab_customer_kmeans', {
            'dataset': {'name': 'Customers (RFM across Zesty and Eventra)', 'rows': len(rfm),
                        'features': ['Recency (days)', 'log(1 + frequency)', 'log(1 + monetary)']},
            'preprocessing': {'scaler_mean': dict(zip(cols, scaler.mean_)), 'scaler_std': dict(zip(cols, scaler.scale_))},
            'elbow': elbow, 'elbow_k': elbow_k, 'silhouette_k': best_sil, 'k': k,
            'iterations': int(km.n_iter_), 'wcss': km.inertia_,
            'segments': profiles,
            'scatter': [{'recency': float(rfm['recency'].iloc[i]), 'frequency': float(rfm['frequency'].iloc[i]),
                         'monetary': float(rfm['monetary'].iloc[i]), 'cluster': int(km.labels_[i]),
                         'pc1': float(P[j, 0]), 'pc2': float(P[j, 1])}
                        for j, i in enumerate(scatter_idx)],
            'centroids_2d': pca.transform(km.cluster_centers_).tolist(),
            'pca_variance': pca.explained_variance_ratio_.tolist(),
        })
        return {'customers': len(rfm), 'k': k, 'elbow_k': elbow_k, 'silhouette_k': best_sil}

    return execute('lab_customer_kmeans', {'k_max': K_MAX}, body)
