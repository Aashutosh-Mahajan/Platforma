"""Customer segmentation (PRD §8.4) — K-Means vs agglomerative on
standardized RFM, k chosen by elbow + silhouette in [4, 6]. Features are
standardized before clustering (monetary value is orders of magnitude
larger than frequency and would otherwise dominate the distance metric —
PRD's own rule).
"""
import numpy as np
from django.utils import timezone
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans, AgglomerativeClustering
from sklearn.metrics import silhouette_score, davies_bouldin_score

from warehouse.models import CbMonthlyCustomerActivity
from mining.models import MiningCustomerSegment
from mining.registry import start_run, finish_run

K_RANGE = range(4, 7)  # [4, 6] inclusive

# Human-readable labels assigned to clusters after ranking by monetary value
# (highest-spend cluster is always 'Champions', lowest 'At Risk', etc.) —
# consistent regardless of which arbitrary cluster index KMeans/Agglomerative
# assigns internally.
SEGMENT_NAMES_BY_RANK = ['At Risk', 'New', 'Growing', 'Loyal', 'Champions', 'VIP']


def _compute_rfm(domain=None):
    """One (recency_days, frequency, monetary) row per customer, aggregated
    across every month in the cuboid — all domains, or just `domain`
    ('zesty' / 'eventra'). Activity dated after today (bookings for events
    still to come can carry future order dates) is ignored, so recency is
    never negative.
    """
    rows = {}
    today = timezone.localdate()
    qs = CbMonthlyCustomerActivity.objects.all()
    if domain:
        qs = qs.filter(domain=domain)
    for row in qs.values('customer_id', 'transaction_count', 'total_spend', 'last_transaction_date'):
        if row['last_transaction_date'] and row['last_transaction_date'] > today:
            continue
        cid = row['customer_id']
        entry = rows.setdefault(cid, {'frequency': 0, 'monetary': 0.0, 'last_date': None})
        entry['frequency'] += row['transaction_count']
        entry['monetary'] += float(row['total_spend'] or 0)
        if row['last_transaction_date'] and (entry['last_date'] is None or row['last_transaction_date'] > entry['last_date']):
            entry['last_date'] = row['last_transaction_date']

    customer_ids, recency, frequency, monetary = [], [], [], []
    for cid, entry in rows.items():
        if entry['frequency'] <= 0:
            continue
        customer_ids.append(cid)
        recency.append((today - entry['last_date']).days if entry['last_date'] else 9999)
        frequency.append(entry['frequency'])
        monetary.append(entry['monetary'])

    return customer_ids, np.array(recency, dtype=float), np.array(frequency, dtype=float), np.array(monetary, dtype=float)


def _best_k(X, k_range=K_RANGE):
    """Elbow (inertia) informs the search range; silhouette picks the
    winner — the metric PRD's own DoD (M8: 'silhouette > 0.45') is scored on.
    """
    best_k, best_score, best_labels, best_model_name = None, -1.0, None, None
    for k in k_range:
        if k >= len(X):
            continue
        kmeans = KMeans(n_clusters=k, n_init=10, random_state=42).fit(X)
        agglo = AgglomerativeClustering(n_clusters=k).fit(X)

        for name, labels in (('kmeans', kmeans.labels_), ('agglomerative', agglo.labels_)):
            if len(set(labels)) < 2:
                continue
            score = silhouette_score(X, labels)
            if score > best_score:
                best_k, best_score, best_labels, best_model_name = k, score, labels, name

    return best_k, best_score, best_labels, best_model_name


VERTICALS = {'all': None, 'zesty': 'zesty', 'eventra': 'eventra'}


def _segment(run, vertical, domain):
    """Cluster one vertical's customers. Returns (rows, metrics)."""
    customer_ids, recency, frequency, monetary = _compute_rfm(domain)
    if len(customer_ids) < 10:
        return [], {'skipped': True, 'reason': 'not enough customers with transactions'}

    # Frequency and spend are heavy-tailed; on a log scale a handful of big
    # spenders can't claim a cluster of their own.
    X_raw = np.column_stack([recency, np.log1p(frequency), np.log1p(monetary)])
    X = StandardScaler().fit_transform(X_raw)

    best_k, silhouette, labels, model_name = _best_k(X)
    if labels is None:
        return [], {'skipped': True, 'reason': 'no valid clustering found'}

    db_score = davies_bouldin_score(X, labels)

    # Rank clusters by mean monetary value so labels are meaningful
    # regardless of the arbitrary label indices KMeans/Agglomerative assigned.
    cluster_monetary_mean = {
        c: monetary[labels == c].mean() for c in set(labels)
    }
    ranked_clusters = sorted(cluster_monetary_mean, key=cluster_monetary_mean.get)
    name_by_cluster = {
        c: SEGMENT_NAMES_BY_RANK[min(i, len(SEGMENT_NAMES_BY_RANK) - 1)]
        for i, c in enumerate(ranked_clusters)
    }

    # Per-point confidence: normalized distance to assigned cluster centroid
    # among all centroids (closer = higher confidence), bounded [0, 1].
    centroids = np.array([X[labels == c].mean(axis=0) for c in sorted(set(labels))])
    cluster_order = sorted(set(labels))
    rows = []
    for i, cid in enumerate(customer_ids):
        c = labels[i]
        centroid_idx = cluster_order.index(c)
        dists = np.linalg.norm(X[i] - centroids, axis=1)
        own_dist = dists[centroid_idx]
        confidence = float(1.0 - (own_dist / dists.sum())) if dists.sum() > 0 else 1.0
        rows.append(MiningCustomerSegment(
            run=run, vertical=vertical, customer_id=cid, segment_label=name_by_cluster[c],
            recency_days=float(recency[i]), frequency=int(frequency[i]), monetary=round(float(monetary[i]), 2),
            confidence=round(max(0.0, min(1.0, confidence)), 4),
            model_version=run.model_version,
        ))

    return rows, {
        'k': best_k, 'model': model_name, 'silhouette': round(float(silhouette), 4),
        'davies_bouldin': round(float(db_score), 4), 'customers_segmented': len(rows),
        'segment_distribution': {name_by_cluster[c]: int((labels == c).sum()) for c in set(labels)},
    }


def run_segmentation():
    """Segments customers three ways: across both verticals, and within
    Zesty and Eventra on their own. The cross-vertical result is also kept
    at the top level of the run metrics (what older readers expect).
    """
    run = start_run('segments', params={'k_range': list(K_RANGE), 'verticals': list(VERTICALS)})

    try:
        by_vertical = {}
        for vertical, domain in VERTICALS.items():
            rows, metrics = _segment(run, vertical, domain)
            MiningCustomerSegment.objects.bulk_create(rows, batch_size=1000)
            by_vertical[vertical] = metrics
        finish_run(run, metrics={**by_vertical['all'], 'by_vertical': by_vertical})
        return run
    except Exception as exc:
        finish_run(run, status='failed', error_message=str(exc))
        raise
