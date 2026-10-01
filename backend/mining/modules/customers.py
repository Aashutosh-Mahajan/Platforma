"""Customer churn risk and predicted value (PRD §8.4), one module because
they share their features and the admin console reads them together.

Both are trained as of a cutoff in the past, so the label is real:

  churn   features as of (today - HORIZON) -> did the customer buy nothing
          in the HORIZON days after? Scored on features as of today:
          the chance a customer buys nothing in the next HORIZON days.
  value   expected spend over the next HORIZON days, as a two-part
          ("hurdle") model: P(buys at all) from the churn model, times the
          typical spend of a customer who does buy (a regression on log
          spend, trained on buyers only, de-biased with Duan's smearing
          factor). Most customers spend nothing in any given quarter, and
          a single regression on log(1 + spend) collapses towards zero for
          exactly that reason. Reported against the naive "same as the
          last HORIZON days" baseline, plus a calibration ratio (predicted
          total / actual total on held-out customers; 1.0 = unbiased).

Features: recency, frequency and spend over 30/90/180 days, tenure, gap
between purchases, recent-vs-earlier trend, and which verticals they use.
"""
import numpy as np
import pandas as pd

from mining.models import MiningCustomerScore
from mining.registry import execute
from mining.modules import data, ml

HORIZON = 90
MIN_CUSTOMERS = 50
NUMERIC = ['recency', 'tenure', 'n_30', 'n_90', 'n_180', 'spend_90', 'spend_180', 'spend_all', 'n_all',
           'avg_gap', 'trend', 'uses_zesty', 'uses_eventra']


def features_as_of(purchases, as_of):
    """One row per customer with at least one purchase on or before `as_of`."""
    p = purchases[purchases['date'] <= as_of]
    if p.empty:
        return pd.DataFrame(columns=['customer_id'] + NUMERIC)
    days_ago = (as_of - p['date']).dt.days
    g = p.assign(days_ago=days_ago).groupby('customer_id')

    def window(days, col='amount', how='count'):
        sub = p[days_ago <= days].groupby('customer_id')[col]
        return (sub.count() if how == 'count' else sub.sum())

    f = pd.DataFrame({
        'recency': g['days_ago'].min(),
        'tenure': g['days_ago'].max(),
        'n_all': g['amount'].count(),
        'spend_all': g['amount'].sum(),
    })
    f['n_30'] = window(30)
    f['n_90'] = window(90)
    f['n_180'] = window(180)
    f['spend_90'] = window(90, how='sum')
    f['spend_180'] = window(180, how='sum')
    f = f.fillna(0)
    f['avg_gap'] = np.where(f['n_all'] > 1, f['tenure'] / (f['n_all'] - 1).clip(lower=1), f['tenure'] + 30)
    earlier = (f['n_180'] - f['n_90']).clip(lower=0)
    f['trend'] = (f['n_90'] + 1) / (earlier + 1)
    domains = p.groupby(['customer_id', 'domain']).size().unstack(fill_value=0)
    for domain in ('zesty', 'eventra'):
        used = (domains[domain] > 0).astype(int) if domain in domains else pd.Series(dtype=int)
        f[f'uses_{domain}'] = used.reindex(f.index, fill_value=0)
    return f.reset_index()


def labels_after(purchases, as_of, horizon):
    after = purchases[(purchases['date'] > as_of) & (purchases['date'] <= as_of + pd.Timedelta(days=horizon))]
    g = after.groupby('customer_id')['amount']
    return g.count(), g.sum()


def spend_model(fit, test, columns):
    """Typical spend of a customer who buys. Returns (model, smearing) or (None, None)."""
    buyers_fit, buyers_test = fit[fit['future_spend'] > 0], test[test['future_spend'] > 0]
    if len(buyers_fit) < 10 or len(buyers_test) < 3:
        return None, None, {'skipped': True, 'reason': 'too few repeat buyers to model spend'}
    X_fit = ml.design(buyers_fit, NUMERIC, [], columns=columns)
    X_test = ml.design(buyers_test, NUMERIC, [], columns=columns)
    model, metrics = ml.select_regressor(X_fit, np.log(buyers_fit['future_spend']),
                                         X_test, np.log(buyers_test['future_spend']))
    buyers = pd.concat([buyers_fit, buyers_test])
    residuals = np.log(buyers['future_spend']) - model.predict(ml.design(buyers, NUMERIC, [], columns=columns))
    return model, float(np.mean(np.exp(residuals))), metrics


def expected_value(X, churn_model, spend, smearing, base_buy_rate):
    """P(buys) x E[spend | buys]."""
    p_buy = 1 - churn_model.predict_proba(X)[:, 1] if churn_model is not None else np.full(len(X), base_buy_rate)
    if spend is None:
        return np.zeros(len(X))
    return np.clip(p_buy * np.exp(spend.predict(X)) * smearing, 0, None)


def churn_reason(row):
    if row['recency'] > 2 * max(row['avg_gap'], 14):
        return f"No purchase in {int(row['recency'])} days, well past their usual {int(row['avg_gap'])}-day gap"
    if row['trend'] < 0.6:
        return 'Buying less often than they used to'
    if row['n_all'] <= 1:
        return 'Has only bought once'
    return 'Recent activity is below their usual pattern'


def value_bands(values):
    """platinum = top 10%, gold = next 20%, silver = next 40%, bronze = rest."""
    if len(values) == 0:
        return []
    q90, q70, q30 = np.quantile(values, [0.9, 0.7, 0.3])
    return ['platinum' if v >= q90 and v > 0 else 'gold' if v >= q70 and v > 0 else 'silver' if v >= q30 and v > 0
            else 'bronze' for v in values]


VERTICALS = ('all', 'zesty', 'eventra')


def score_vertical(run, vertical, purchases, today):
    """Train and score churn + value for one vertical. Returns (rows, metrics)."""
    if vertical != 'all':
        purchases = purchases[purchases['domain'] == vertical]
    cutoff = today - pd.Timedelta(days=HORIZON)

    train = features_as_of(purchases, cutoff)
    if len(train) < MIN_CUSTOMERS:
        return [], {'skipped': True, 'reason': f'fewer than {MIN_CUSTOMERS} customers active before the cutoff'}
    counts, spend = labels_after(purchases, cutoff, HORIZON)
    train['churned'] = (train['customer_id'].map(counts).fillna(0) == 0).astype(int)
    train['future_spend'] = train['customer_id'].map(spend).fillna(0.0)

    metrics = {'horizon_days': HORIZON, 'training_customers': len(train),
               'churn_rate': round(float(train['churned'].mean()), 4)}

    # Customer-level rows have no time order, so the holdout is a seeded shuffle.
    shuffled = train.sample(frac=1.0, random_state=42)
    cut = int(len(shuffled) * 0.75)
    fit, test = shuffled.iloc[:cut], shuffled.iloc[cut:]
    X_fit = ml.design(fit, NUMERIC, [])
    X_test = ml.design(test, NUMERIC, [], columns=X_fit.columns)

    churn_model = None
    if 0 < train['churned'].sum() < len(train) and fit['churned'].nunique() == 2 and test['churned'].nunique() == 2:
        churn_model, metrics['churn'] = ml.select_classifier(X_fit, fit['churned'], X_test, test['churned'])
        metrics['churn']['top_features'] = ml.feature_importance(churn_model, list(X_fit.columns))

    spend, smearing, spend_metrics = spend_model(fit, test, X_fit.columns)
    base_buy_rate = 1 - float(fit['churned'].mean())
    predicted_test = expected_value(X_test, churn_model, spend, smearing, base_buy_rate)
    actual_total = float(test['future_spend'].sum())
    metrics['value'] = {
        'model': 'hurdle',
        'mae_rupees': round(float(np.mean(np.abs(predicted_test - test['future_spend']))), 2),
        'baseline_mae_rupees': round(float(np.mean(np.abs(test['spend_90'] - test['future_spend']))), 2),
        'calibration': round(float(predicted_test.sum()) / actual_total, 4) if actual_total else None,
        'spend_given_purchase': spend_metrics,
        'smearing': round(smearing, 4) if smearing else None,
    }

    current = features_as_of(purchases, today)
    X_now = ml.design(current, NUMERIC, [], columns=X_fit.columns)
    churn_p = churn_model.predict_proba(X_now)[:, 1] if churn_model is not None else np.full(len(current), np.nan)
    predicted_value = expected_value(X_now, churn_model, spend, smearing, base_buy_rate)
    bands = value_bands(predicted_value)

    rows = []
    for i, row in enumerate(current.to_dict('records')):
        p = churn_p[i]
        rows.append(MiningCustomerScore(
            run=run, vertical=vertical, customer_id=int(row['customer_id']),
            churn_probability=None if np.isnan(p) else round(float(p), 4),
            churn_band='' if np.isnan(p) else data.band(p, (0.4, 0.7)),
            predicted_90d_value=round(float(predicted_value[i]), 2),
            historic_value=round(float(row['spend_all']), 2), value_band=bands[i],
            days_since_last=int(row['recency']), purchases_90d=int(row['n_90']),
            top_reason=churn_reason(row)[:255], model_version=run.model_version,
        ))
    metrics['scored_customers'] = len(rows)
    metrics['churn_band_counts'] = pd.Series([r.churn_band for r in rows]).value_counts().to_dict()
    metrics['value_band_counts'] = pd.Series(bands).value_counts().to_dict()
    return rows, metrics


def run_customer_scores():
    """Scores customers three ways: across both verticals, and within Zesty
    and Eventra alone (someone loyal to Zesty can be drifting away from
    Eventra). The cross-vertical metrics stay at the top level of the run.
    """
    def body(run):
        purchases = data.purchases()
        today = pd.Timestamp(data.today())
        by_vertical = {}
        for vertical in VERTICALS:
            rows, metrics = score_vertical(run, vertical, purchases, today)
            MiningCustomerScore.objects.bulk_create(rows, batch_size=5000)
            by_vertical[vertical] = metrics
        # A skipped 'all' carries skipped/reason up, so the run reads as "not enough data".
        return {**by_vertical['all'], 'by_vertical': by_vertical}

    return execute('customers', {'horizon_days': HORIZON, 'verticals': list(VERTICALS)}, body)
