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


def _compute_rfm():
    """One (recency_days, frequency, monetary) row per customer, aggregated
    across every month/domain in the cuboid.
    """
    rows = {}
    today = timezone.now().date()
    for row in CbMonthlyCustomerActivity.objects.all().values(
        'customer_id', 'transaction_count', 'total_spend', 'last_transaction_date'
    ):
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


def run_segmentation():
    run = start_run('segments', params={'k_range': list(K_RANGE)})

    try:
        customer_ids, recency, frequency, monetary = _compute_rfm()
        if len(customer_ids) < 10:
            finish_run(run, metrics={'skipped': True, 'reason': 'not enough customers with transactions'})
            return run

        X_raw = np.column_stack([recency, frequency, monetary])
        X = StandardScaler().fit_transform(X_raw)

        best_k, silhouette, labels, model_name = _best_k(X)
        if labels is None:
            finish_run(run, metrics={'skipped': True, 'reason': 'no valid clustering found'})
            return run

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
                run=run, customer_id=cid, segment_label=name_by_cluster[c],
                recency_days=float(recency[i]), frequency=int(frequency[i]), monetary=round(float(monetary[i]), 2),
                confidence=round(max(0.0, min(1.0, confidence)), 4),
                model_version=run.model_version,
            ))

        MiningCustomerSegment.objects.bulk_create(rows, batch_size=1000)

        finish_run(run, metrics={
            'k': best_k, 'model': model_name, 'silhouette': round(float(silhouette), 4),
            'davies_bouldin': round(float(db_score), 4), 'customers_segmented': len(rows),
            'segment_distribution': {name_by_cluster[c]: int((labels == c).sum()) for c in set(labels)},
        })
        return run
    except Exception as exc:
        finish_run(run, status='failed', error_message=str(exc))
        raise
