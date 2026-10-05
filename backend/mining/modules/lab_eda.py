"""Order insights (exploratory analysis) and data preparation over the Mumbai
order data in the warehouse.

lab_visualization   descriptive statistics, distributions (histograms),
                    box plots by zone and payment method, bar / pie / line
                    charts, scatter samples, a weekday x hour heatmap and the
                    correlation matrix, each with a sentence saying what it shows.
lab_preprocessing   the cleaning steps a mining dataset goes through: data
                    quality checks and ETL quarantine, missing values and
                    their imputation, duplicates, outliers (IQR capping),
                    encoding (one-hot, label, ordinal), normalisation
                    (min-max, z-score) and feature selection (variance,
                    correlation, mutual information, chi-square).
"""
import numpy as np
import pandas as pd
from sklearn.feature_selection import VarianceThreshold, chi2, mutual_info_classif
from sklearn.preprocessing import MinMaxScaler, StandardScaler

from mining.modules.lab_common import (
    CHURN_FEATURES, CHURN_LABELS, box, churn_dataset, describe, histogram, orders_frame, rfm_frame, save,
)
from mining.registry import execute

NUMERIC = {
    'total': 'Order value (Rs)', 'items': 'Items in order', 'discount': 'Discount (Rs)',
    'delivery_fee': 'Delivery fee (Rs)', 'delivery_minutes': 'Delivery time (min)', 'hour': 'Hour placed',
}
WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']


def _corr_insight(corr):
    pairs = []
    cols = list(corr.columns)
    for i, a in enumerate(cols):
        for b in cols[i + 1:]:
            v = corr.loc[a, b]
            if pd.notna(v):
                pairs.append((abs(v), v, a, b))
    pairs.sort(reverse=True)
    return [{'a': a, 'b': b, 'r': v} for _, v, a, b in pairs[:5]]


def visualization(o):
    o = o.copy()
    o['is_weekend'] = o['is_weekend'].astype(int)
    o['is_cancelled'] = o['is_cancelled'].astype(int)
    delivered = o[o['is_cancelled'] == 0]

    stats = {col: {'label': label, **describe(o[col])} for col, label in NUMERIC.items()}

    daily = (o.groupby(o['date'].dt.date)
             .agg(orders=('order_id', 'count'), revenue=('total', 'sum')).reset_index())
    daily['orders_7d'] = daily['orders'].rolling(7, min_periods=1).mean()
    by_zone = o.groupby('zone').agg(orders=('order_id', 'count'), revenue=('total', 'sum'),
                                    avg_value=('total', 'mean')).reset_index().sort_values('orders', ascending=False)
    by_area = (o.groupby(['area', 'zone']).agg(orders=('order_id', 'count'), revenue=('total', 'sum'),
                                               avg_value=('total', 'mean'))
               .reset_index().sort_values('orders', ascending=False))
    payment = o['payment_method'].fillna('unknown').value_counts()
    cuisine = o['cuisine'].value_counts().head(10)

    heat = np.zeros((7, 24), dtype=int)
    for (wd, hr), n in o.groupby(['weekday', 'hour']).size().items():
        heat[int(wd), int(hr)] = n

    sample = delivered.sample(min(700, len(delivered)), random_state=3)
    corr_cols = ['total', 'items', 'discount', 'delivery_fee', 'delivery_minutes', 'hour', 'is_weekend', 'is_cancelled']
    corr = o[corr_cols].astype(float).corr()

    boxes_zone = {z: box(delivered.loc[delivered['zone'] == z, 'total']) for z in sorted(delivered['zone'].unique())}
    boxes_payment = {p: box(delivered.loc[delivered['payment_method'] == p, 'total'])
                     for p in delivered['payment_method'].dropna().unique()}
    boxes_delivery = {z: box(delivered.loc[delivered['zone'] == z, 'delivery_minutes'])
                      for z in sorted(delivered['zone'].unique())}

    top = _corr_insight(corr)
    t = stats['total']
    insights = [
        f"Order value is right-skewed (skew {t['skew']:.2f}): the mean Rs {t['mean']:.0f} sits above the median "
        f"Rs {t['median']:.0f}, pulled up by {t['outliers']} large orders beyond the upper fence.",
        f"Strongest linear relationship: {top[0]['a']} and {top[0]['b']} (r = {top[0]['r']:.2f})." if top else '',
        f"Busiest zone: {by_zone.iloc[0]['zone']} with {int(by_zone.iloc[0]['orders']):,} orders.",
        f"Most used payment method: {payment.index[0]} ({payment.iloc[0] / payment.sum():.0%} of orders).",
        f"Peak hour: {int(np.unravel_index(heat.argmax(), heat.shape)[1])}:00 on "
        f"{WEEKDAYS[int(np.unravel_index(heat.argmax(), heat.shape)[0])]}.",
    ]
    return {
        'dataset': {'name': 'Zesty orders (fact_order)', 'rows': len(o), 'columns': len(o.columns),
                    'from': o['date'].min(), 'to': o['date'].max(),
                    'attributes': [{'name': c, 'type': str(o[c].dtype)} for c in o.columns]},
        'stats': stats,
        'histograms': {
            'total': histogram(delivered['total'], bins=28, clip_quantile=0.99),
            'delivery_minutes': histogram(delivered['delivery_minutes'], bins=24),
            'items': [{'from': int(k), 'to': int(k), 'count': int(v)}
                      for k, v in delivered['items'].clip(upper=12).value_counts().sort_index().items()],
        },
        'box': {'total_by_zone': boxes_zone, 'total_by_payment': boxes_payment, 'delivery_by_zone': boxes_delivery},
        'bar': {'by_zone': by_zone.to_dict(orient='records'), 'by_area': by_area.to_dict(orient='records'),
                'by_cuisine': [{'label': k, 'value': int(v)} for k, v in cuisine.items()]},
        'pie': {'payment': [{'label': k, 'value': int(v)} for k, v in payment.items()]},
        'line': {'daily': daily.to_dict(orient='records')},
        'scatter': {
            'items_vs_total': sample[['items', 'total']].to_dict(orient='records'),
            'items_vs_delivery': sample[['items', 'delivery_minutes']].dropna().to_dict(orient='records'),
        },
        'heatmap': {'rows': WEEKDAYS, 'columns': list(range(24)), 'values': heat.tolist()},
        'correlation': {'columns': corr_cols, 'matrix': corr.values.tolist(), 'top_pairs': top},
        'insights': [i for i in insights if i],
    }


def preprocessing(o):
    from warehouse.models import DataQualityCheck, EtlQuarantine
    from django.db.models import Count

    steps = []
    # 1. Data quality from the ETL.
    quarantine = list(EtlQuarantine.objects.values('table_name', 'violated_rule').annotate(n=Count('id')).order_by('-n')[:12])
    latest = DataQualityCheck.objects.order_by('-checked_at').values_list('run_id', flat=True).first()
    checks = list(DataQualityCheck.objects.filter(run_id=latest).values(
        'check_name', 'table_name', 'status', 'observed', 'threshold', 'message')) if latest else []

    # 2. Missing values in the order dataset.
    missing = []
    for col in o.columns:
        n = int(o[col].isna().sum())
        if o[col].dtype == object:
            n += int((o[col] == '').sum())
        if n:
            missing.append({'column': col, 'missing': n, 'pct': n / len(o)})
    dm = o['delivery_minutes']
    filled = dm.fillna(o.groupby('restaurant_id')['delivery_minutes'].transform('median')).fillna(dm.median())
    imputation = {
        'column': 'delivery_minutes', 'missing_before': int(dm.isna().sum()), 'missing_after': int(filled.isna().sum()),
        'strategy': 'Cancelled and in-progress orders were never delivered, so they have no delivery time. '
                    "For modelling, a gap is filled with the same restaurant's median, else the city median.",
        'mean_before': dm.mean(), 'mean_after': filled.mean(),
    }

    # 3. Duplicates.
    key = ['customer_id', 'restaurant_id', 'date', 'hour', 'total']
    dup_rows = int(o.duplicated(subset=key).sum())
    exact_dups = int(o.duplicated(subset=['order_id']).sum())

    # 4. Outliers: IQR capping on order value.
    q1, q3 = o['total'].quantile([0.25, 0.75])
    hi = q3 + 1.5 * (q3 - q1)
    capped = o['total'].clip(upper=hi)
    outliers = {'column': 'total', 'upper_fence': hi, 'rows_capped': int((o['total'] > hi).sum()),
                'max_before': o['total'].max(), 'max_after': capped.max(),
                'std_before': o['total'].std(), 'std_after': capped.std()}

    # 5. Encoding.
    sample = o[['order_id', 'payment_method', 'zone', 'day_part', 'price_band']].head(6).copy()
    one_hot = pd.get_dummies(sample[['payment_method', 'zone']], prefix=['pay', 'zone']).astype(int)
    day_parts = sorted(o['day_part'].dropna().unique())
    bands = ['budget', 'mid', 'premium']
    encoding = {
        'sample': sample.drop(columns=['order_id']).to_dict(orient='records'),
        'one_hot': {'columns': list(one_hot.columns), 'rows': one_hot.values.tolist()},
        'label': {v: i for i, v in enumerate(day_parts)},
        'ordinal': {b: i for i, b in enumerate(bands)},
    }

    # 6. Normalisation of RFM features.
    rfm = rfm_frame()
    cols = ['recency', 'frequency', 'monetary']
    mm = pd.DataFrame(MinMaxScaler().fit_transform(rfm[cols]), columns=cols)
    zs = pd.DataFrame(StandardScaler().fit_transform(rfm[cols]), columns=cols)

    def summary(frame):
        return {c: {'min': frame[c].min(), 'max': frame[c].max(), 'mean': frame[c].mean(), 'std': frame[c].std()}
                for c in cols}

    normalisation = {
        'raw': summary(rfm), 'minmax': summary(mm), 'zscore': summary(zs),
        'sample': [{'raw': rfm[cols].iloc[i].to_dict(), 'minmax': mm.iloc[i].to_dict(), 'zscore': zs.iloc[i].to_dict()}
                   for i in range(min(6, len(rfm)))],
        'why': 'Monetary value runs to thousands of rupees while frequency is a handful of orders; without scaling, '
               'distance-based methods (K-Means, KNN) would see only money.',
    }

    # 7. Feature selection on the churn dataset.
    churn = churn_dataset()
    selection = None
    if len(churn) > 50 and churn['churned'].nunique() == 2:
        X = churn[CHURN_FEATURES].astype(float)
        y = churn['churned']
        variances = X.var()
        vt = VarianceThreshold(threshold=0.01).fit(MinMaxScaler().fit_transform(X))
        mi = mutual_info_classif(X, y, random_state=0)
        ch, ch_p = chi2(MinMaxScaler().fit_transform(X), y)
        corr = X.apply(lambda c: np.corrcoef(c, y)[0, 1] if c.std() > 0 else 0)
        table = []
        for i, f in enumerate(CHURN_FEATURES):
            table.append({'feature': f, 'label': CHURN_LABELS[f], 'variance': variances[f],
                          'kept_by_variance': bool(vt.get_support()[i]), 'corr_with_target': corr[f],
                          'mutual_info': mi[i], 'chi2': ch[i], 'chi2_p': ch_p[i]})
        table.sort(key=lambda r: -r['mutual_info'])
        selected = [r['feature'] for r in table[:6]]
        selection = {'target': 'churned (no purchase in the next 60 days)', 'rows': len(churn),
                     'positive_rate': y.mean(), 'table': table, 'selected': selected}

    steps = [
        {'step': 'Data cleaning in ETL', 'detail': 'Rows failing validation are quarantined, not loaded.',
         'count': sum(q['n'] for q in quarantine)},
        {'step': 'Missing values', 'detail': f"{len(missing)} columns have gaps.", 'count': len(missing)},
        {'step': 'Duplicates', 'detail': 'Natural-key duplicates are rejected by the warehouse.', 'count': dup_rows},
        {'step': 'Outliers', 'detail': 'IQR rule; capped at the upper fence for modelling.', 'count': outliers['rows_capped']},
        {'step': 'Encoding', 'detail': 'One-hot for nominal, label/ordinal for ordered categories.', 'count': len(one_hot.columns)},
        {'step': 'Normalisation', 'detail': 'Min-max to [0, 1] and z-score to mean 0, sd 1.', 'count': len(rfm)},
        {'step': 'Feature selection', 'detail': 'Variance, correlation, mutual information and chi-square.',
         'count': len(selection['selected']) if selection else 0},
    ]
    return {
        'steps': steps, 'quarantine': quarantine, 'quality_checks': checks,
        'missing': missing, 'imputation': imputation,
        'duplicates': {'natural_key_duplicates': dup_rows, 'order_id_duplicates': exact_dups, 'key': key},
        'outliers': outliers, 'encoding': encoding, 'normalisation': normalisation, 'feature_selection': selection,
        'exports': [
            {'key': 'customers_rfm', 'label': 'Customer RFM + churn label'},
            {'key': 'mumbai_areas', 'label': 'Mumbai area features + clusters'},
            {'key': 'orders', 'label': 'Orders (sample of 5,000)'},
            {'key': 'baskets', 'label': 'Category baskets (one-hot)'},
        ],
    }


def run_lab_eda():
    def body(run):
        o = orders_frame()
        if o.empty:
            return {'skipped': True, 'reason': 'No orders in the warehouse yet.'}
        save(run, 'lab_visualization', visualization(o))
        save(run, 'lab_preprocessing', preprocessing(o))
        return {'rows': len(o)}

    return execute('lab_eda', {}, body)
