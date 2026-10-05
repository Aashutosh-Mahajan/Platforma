"""Shared helpers for the admin analytics modules (lab_*.py, areas.py).

Each lab module runs inside a MiningRun like every other mining module and
stores what the admin console draws as MiningLabArtifact rows: one JSON
document per analysis. These helpers keep that JSON valid (numpy types
and NaN/inf are not JSON) and build the datasets several analyses share.
"""
import math

import numpy as np
import pandas as pd

from mining.models import MiningLabArtifact
from mining.modules import data


def clean(obj, digits=6):
    """Recursively convert numpy / pandas values into JSON-safe Python,
    rounding floats and turning NaN / inf into None (Postgres jsonb refuses
    NaN)."""
    if isinstance(obj, dict):
        return {str(k): clean(v, digits) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [clean(v, digits) for v in obj]
    if isinstance(obj, np.ndarray):
        return [clean(v, digits) for v in obj.tolist()]
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.bool_,)):
        return bool(obj)
    if isinstance(obj, (float, np.floating)):
        value = float(obj)
        if math.isnan(value) or math.isinf(value):
            return None
        return round(value, digits)
    if isinstance(obj, (pd.Timestamp,)):
        return obj.isoformat()
    if hasattr(obj, 'isoformat'):
        return obj.isoformat()
    return obj


def save(run, key, payload):
    MiningLabArtifact.objects.create(run=run, key=key, payload=clean(payload))


def describe(series):
    """Descriptive statistics for one numeric column, with the IQR outlier rule."""
    s = pd.to_numeric(series, errors='coerce')
    present = s.dropna()
    if present.empty:
        return {'count': 0, 'missing': int(s.isna().sum())}
    q1, med, q3 = present.quantile([0.25, 0.5, 0.75])
    iqr = q3 - q1
    lo, hi = q1 - 1.5 * iqr, q3 + 1.5 * iqr
    mode = present.mode()
    return {
        'count': int(present.count()), 'missing': int(s.isna().sum()),
        'mean': present.mean(), 'std': present.std(), 'variance': present.var(),
        'min': present.min(), 'q1': q1, 'median': med, 'q3': q3, 'max': present.max(),
        'mode': mode.iloc[0] if len(mode) else None,
        'range': present.max() - present.min(), 'iqr': iqr,
        'skew': present.skew(), 'kurtosis': present.kurt(),
        'outliers': int(((present < lo) | (present > hi)).sum()),
        'lower_fence': lo, 'upper_fence': hi,
    }


def box(series):
    """Box-plot summary: quartiles, whiskers at the furthest points inside
    1.5 x IQR, and a sample of the outliers beyond them."""
    s = pd.to_numeric(series, errors='coerce').dropna()
    if s.empty:
        return None
    q1, med, q3 = s.quantile([0.25, 0.5, 0.75])
    iqr = q3 - q1
    inside = s[(s >= q1 - 1.5 * iqr) & (s <= q3 + 1.5 * iqr)]
    outliers = s[(s < q1 - 1.5 * iqr) | (s > q3 + 1.5 * iqr)]
    sample = outliers.sample(min(25, len(outliers)), random_state=1) if len(outliers) else outliers
    return {
        'n': int(len(s)), 'q1': q1, 'median': med, 'q3': q3, 'mean': s.mean(),
        'whisker_low': inside.min(), 'whisker_high': inside.max(),
        'outlier_count': int(len(outliers)), 'outliers': sorted(sample.tolist()),
    }


def histogram(series, bins=24, clip_quantile=None):
    s = pd.to_numeric(series, errors='coerce').dropna()
    if s.empty:
        return []
    if clip_quantile:
        s = s[s <= s.quantile(clip_quantile)]
    counts, edges = np.histogram(s, bins=bins)
    return [{'from': edges[i], 'to': edges[i + 1], 'count': int(counts[i])} for i in range(len(counts))]


def orders_frame():
    """Orders from the warehouse, joined to where the kitchen is (area,
    zone) and where the customer lives (home area)."""
    from warehouse.models import DimCustomer
    from core import mumbai

    o = data.orders()
    if o.empty:
        return o
    rest = data.current_restaurants()[['restaurant_id', 'area', 'cuisine']]
    o = o.merge(rest, on='restaurant_id', how='left')
    o['zone'] = o['area'].map(lambda a: mumbai.AREAS.get(a, {}).get('zone', 'Other'))
    homes = dict(DimCustomer.objects.filter(is_current=True).values_list('customer_id', 'home_area'))
    o['home_area'] = o['customer_id'].map(homes).fillna('')
    o['cuisine'] = o['cuisine'].map(data.primary_cuisine)
    return o


CHURN_HORIZON = 60
CHURN_FEATURES = ['recency', 'tenure', 'n_30', 'n_90', 'n_180', 'n_all', 'spend_90', 'spend_all',
                  'avg_gap', 'trend', 'uses_zesty', 'uses_eventra']
CHURN_LABELS = {
    'recency': 'Days since last purchase', 'tenure': 'Days since first purchase',
    'n_30': 'Purchases, last 30 days', 'n_90': 'Purchases, last 90 days', 'n_180': 'Purchases, last 180 days',
    'n_all': 'Purchases, all time', 'spend_90': 'Spend, last 90 days (Rs)', 'spend_all': 'Spend, all time (Rs)',
    'avg_gap': 'Average days between purchases', 'trend': 'Recent vs earlier activity',
    'uses_zesty': 'Orders food', 'uses_eventra': 'Books events',
}


def churn_dataset(horizon=CHURN_HORIZON):
    """Customer features as of `horizon` days ago and whether they then
    went quiet (bought nothing in the following `horizon` days). Shared by
    the decision tree, Naive Bayes and feature-selection analyses so all
    three are judged on the same rows."""
    from mining.modules.customers import features_as_of

    purchases = data.purchases()
    if purchases.empty:
        return pd.DataFrame()
    cutoff = pd.Timestamp(data.today()) - pd.Timedelta(days=horizon)
    f = features_as_of(purchases, cutoff)
    if f.empty:
        return f
    after = purchases[(purchases['date'] > cutoff) & (purchases['date'] <= cutoff + pd.Timedelta(days=horizon))]
    active = set(after['customer_id'])
    f['churned'] = (~f['customer_id'].isin(active)).astype(int)
    return f[['customer_id'] + CHURN_FEATURES + ['churned']].reset_index(drop=True)


def rfm_frame():
    """Recency / frequency / monetary per customer across both verticals."""
    purchases = data.purchases()
    if purchases.empty:
        return pd.DataFrame(columns=['customer_id', 'recency', 'frequency', 'monetary'])
    today = pd.Timestamp(data.today())
    g = purchases.groupby('customer_id')
    return pd.DataFrame({
        'recency': (today - g['date'].max()).dt.days,
        'frequency': g['amount'].count(),
        'monetary': g['amount'].sum(),
    }).reset_index()


def classification_metrics(y_true, y_pred, labels=(0, 1)):
    from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score
    cm = confusion_matrix(y_true, y_pred, labels=list(labels))
    return {
        'accuracy': accuracy_score(y_true, y_pred),
        'precision': precision_score(y_true, y_pred, zero_division=0),
        'recall': recall_score(y_true, y_pred, zero_division=0),
        'f1': f1_score(y_true, y_pred, zero_division=0),
        'confusion_matrix': cm.tolist(),  # rows = actual, columns = predicted
    }
