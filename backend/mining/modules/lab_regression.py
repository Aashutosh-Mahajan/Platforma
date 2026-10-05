"""Delivery time and order value models: linear regression on Mumbai orders.

Simple linear regression, one predictor, fitted by the least-squares
formulas themselves (slope = Sxy / Sxx, intercept = y-bar - slope * x-bar)
and checked against scikit-learn:
  order value (Rs)      ~ items in the order
  delivery time (min)   ~ items in the order

Multiple linear regression on delivery time with four predictors: items,
rush hour, weekend, and the restaurant's typical delivery time (learned
from the training split only, so the test set never leaks into it).

For every model: the equation, coefficients with standard errors, t and p
values, MSE / RMSE / MAE / R2 / adjusted R2 on train and test (80/20
split), residuals for plotting, and checks of the regression assumptions:
linearity (residuals vs fitted), independence (Durbin-Watson), equal
variance (Breusch-Pagan), normal residuals (Jarque-Bera, Q-Q points) and,
for the multiple model, multicollinearity (VIF).
"""
import numpy as np
import pandas as pd
from scipy import stats
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

from datagen.planted import PEAK_DELIVERY_HOURS
from mining.modules.lab_common import orders_frame, save
from mining.registry import execute

SIMPLE = [
    {'key': 'value_by_items', 'x': 'items', 'y': 'total', 'x_label': 'Items in order', 'y_label': 'Order value (Rs)'},
    {'key': 'delivery_by_items', 'x': 'items', 'y': 'delivery_minutes', 'x_label': 'Items in order',
     'y_label': 'Delivery time (min)'},
]
MULTI_FEATURES = ['items', 'is_peak', 'is_weekend', 'restaurant_typical']
MULTI_LABELS = {'items': 'Items in order', 'is_peak': 'Rush hour (1 = yes)', 'is_weekend': 'Weekend (1 = yes)',
                'restaurant_typical': "Restaurant's typical delivery (min)"}


def metrics(y, pred, p):
    n = len(y)
    r2 = r2_score(y, pred)
    mse = mean_squared_error(y, pred)
    return {'n': n, 'mse': mse, 'rmse': float(np.sqrt(mse)), 'mae': mean_absolute_error(y, pred), 'r2': r2,
            'adj_r2': 1 - (1 - r2) * (n - 1) / max(1, n - p - 1)}


def coefficient_table(X, y, model, names):
    """Coefficients with standard errors, t statistics and p values (OLS)."""
    Xd = np.column_stack([np.ones(len(X)), X])
    beta = np.concatenate([[model.intercept_], model.coef_])
    resid = y - Xd @ beta
    n, k = Xd.shape
    sigma2 = resid @ resid / (n - k)
    cov = sigma2 * np.linalg.pinv(Xd.T @ Xd)
    se = np.sqrt(np.diag(cov))
    t = beta / se
    p = 2 * (1 - stats.t.cdf(np.abs(t), df=n - k))
    std_x = np.concatenate([[np.nan], X.std(axis=0)])
    return [{'term': name, 'coef': b, 'std_error': s, 't': tt, 'p': pp,
             'standardized': (b * sx / y.std()) if i else None}
            for i, (name, b, s, tt, pp, sx) in enumerate(zip(['intercept'] + names, beta, se, t, p, std_x))]


def assumptions(X, y, fitted):
    resid = y - fitted
    dw = float(np.sum(np.diff(resid) ** 2) / np.sum(resid ** 2))
    # Breusch-Pagan: regress squared residuals on the predictors; LM = n R2.
    aux = LinearRegression().fit(X, resid ** 2)
    lm = len(y) * aux.score(X, resid ** 2)
    bp_p = 1 - stats.chi2.cdf(lm, df=X.shape[1])
    jb, jb_p = stats.jarque_bera(resid)
    probs = np.linspace(0.01, 0.99, 40)
    qq = [{'theoretical': float(stats.norm.ppf(q)), 'sample': float(np.quantile((resid - resid.mean()) / resid.std(), q))}
          for q in probs]
    return {
        'residual_mean': resid.mean(), 'residual_std': resid.std(), 'residual_skew': stats.skew(resid),
        'durbin_watson': dw, 'independence_ok': 1.5 <= dw <= 2.5,
        'breusch_pagan': {'lm': lm, 'p': bp_p, 'homoscedastic': bp_p > 0.05},
        'jarque_bera': {'statistic': jb, 'p': jb_p, 'normal': jb_p > 0.05},
        'qq': qq,
    }


def residual_points(x, fitted, y, n=500, seed=0):
    idx = np.random.default_rng(seed).choice(len(y), min(n, len(y)), replace=False)
    return [{'x': float(x[i]) if x is not None else None, 'fitted': float(fitted[i]), 'actual': float(y[i]),
             'residual': float(y[i] - fitted[i])} for i in idx]


def simple_regression(df, spec):
    d = df[[spec['x'], spec['y']]].dropna()
    train, test = train_test_split(d, test_size=0.2, random_state=42)
    x, y = train[spec['x']].to_numpy(float), train[spec['y']].to_numpy(float)
    x_bar, y_bar = x.mean(), y.mean()
    sxy = float(((x - x_bar) * (y - y_bar)).sum())
    sxx = float(((x - x_bar) ** 2).sum())
    syy = float(((y - y_bar) ** 2).sum())
    slope = sxy / sxx
    intercept = y_bar - slope * x_bar
    r = sxy / np.sqrt(sxx * syy)
    model = LinearRegression().fit(x.reshape(-1, 1), y)
    fit_train = intercept + slope * x
    xt, yt = test[spec['x']].to_numpy(float), test[spec['y']].to_numpy(float)
    fit_test = intercept + slope * xt
    example_x = float(np.median(x)) + 1
    return {
        **spec,
        'n_train': len(train), 'n_test': len(test),
        'formula': {'x_mean': x_bar, 'y_mean': y_bar, 'sxy': sxy, 'sxx': sxx, 'syy': syy, 'r': r, 'r2': r ** 2},
        'slope': slope, 'intercept': intercept,
        'sklearn': {'slope': float(model.coef_[0]), 'intercept': float(model.intercept_)},
        'equation': f"{spec['y_label']} = {intercept:.2f} + {slope:.2f} x {spec['x_label']}",
        'example': {'x': example_x, 'prediction': intercept + slope * example_x},
        'coefficients': coefficient_table(x.reshape(-1, 1), y, model, [spec['x']]),
        'train': metrics(y, fit_train, 1), 'test': metrics(yt, fit_test, 1),
        'assumptions': assumptions(x.reshape(-1, 1), y, fit_train),
        'points': residual_points(xt, fit_test, yt),
        'line': [{'x': v, 'y': intercept + slope * v} for v in (float(d[spec['x']].min()), float(d[spec['x']].max()))],
        'x_range': [float(d[spec['x']].min()), float(d[spec['x']].max())],
    }


def multiple_regression(df):
    d = df[['restaurant_id', 'items', 'hour', 'is_weekend', 'delivery_minutes', 'date']].dropna().copy()
    d['is_peak'] = d['hour'].isin(PEAK_DELIVERY_HOURS).astype(int)
    d['is_weekend'] = d['is_weekend'].astype(int)
    train, test = train_test_split(d, test_size=0.2, random_state=42)
    typical = train.groupby('restaurant_id')['delivery_minutes'].mean()
    overall = train['delivery_minutes'].mean()
    for part in (train, test):
        part['restaurant_typical'] = part['restaurant_id'].map(typical).fillna(overall)
    X, y = train[MULTI_FEATURES].to_numpy(float), train['delivery_minutes'].to_numpy(float)
    Xt, yt = test[MULTI_FEATURES].to_numpy(float), test['delivery_minutes'].to_numpy(float)
    model = LinearRegression().fit(X, y)
    fit_train, fit_test = model.predict(X), model.predict(Xt)

    vif = []
    for i, f in enumerate(MULTI_FEATURES):
        others = np.delete(X, i, axis=1)
        r2 = LinearRegression().fit(others, X[:, i]).score(others, X[:, i])
        vif.append({'feature': f, 'vif': 1 / max(1e-9, 1 - r2)})

    # How much each added predictor improves the fit (nested models).
    steps = []
    for j in range(1, len(MULTI_FEATURES) + 1):
        cols = list(range(j))
        m = LinearRegression().fit(X[:, cols], y)
        steps.append({'features': MULTI_FEATURES[:j], 'test_r2': r2_score(yt, m.predict(Xt[:, cols])),
                      'test_rmse': float(np.sqrt(mean_squared_error(yt, m.predict(Xt[:, cols]))))})

    terms = ' + '.join(f"{c:.2f} x {MULTI_LABELS[f]}" for f, c in zip(MULTI_FEATURES, model.coef_))
    return {
        'target': 'delivery_minutes', 'target_label': 'Delivery time (min)',
        'features': [{'key': f, 'label': MULTI_LABELS[f], 'min': float(d[f].min()) if f in d else None,
                      'max': float(d[f].max()) if f in d else None} for f in MULTI_FEATURES],
        'feature_ranges': {f: [float(train[f].min()), float(train[f].max()), float(train[f].median())]
                           for f in MULTI_FEATURES},
        'n_train': len(train), 'n_test': len(test),
        'intercept': model.intercept_, 'coefs': dict(zip(MULTI_FEATURES, model.coef_)),
        'equation': f"Delivery time = {model.intercept_:.2f} + {terms}",
        'coefficients': coefficient_table(X, y, model, MULTI_FEATURES),
        'train': metrics(y, fit_train, len(MULTI_FEATURES)), 'test': metrics(yt, fit_test, len(MULTI_FEATURES)),
        'assumptions': assumptions(X, y, fit_train), 'vif': vif, 'nested': steps,
        'points': residual_points(None, fit_test, yt),
        'correlation': pd.DataFrame(X, columns=MULTI_FEATURES).assign(delivery_minutes=y).corr().round(4).to_dict(),
    }


def run_lab_regression():
    def body(run):
        o = orders_frame()
        o = o[~o['is_cancelled']] if len(o) else o
        if len(o) < 200:
            return {'skipped': True, 'reason': 'Not enough delivered orders yet.'}
        simple = [simple_regression(o, spec) for spec in SIMPLE]
        multi = multiple_regression(o)
        save(run, 'lab_regression', {
            'dataset': {'name': 'Delivered Mumbai orders (fact_order)', 'rows': len(o),
                        'split': '80% train / 20% test, random_state=42'},
            'simple': simple, 'multiple': multi,
            'comparison': [
                {'model': f"SLR: delivery ~ items", 'test_r2': simple[1]['test']['r2'], 'test_rmse': simple[1]['test']['rmse']},
                {'model': 'MLR: delivery ~ 4 predictors', 'test_r2': multi['test']['r2'], 'test_rmse': multi['test']['rmse']},
            ],
        })
        return {'slr_value_r2': round(simple[0]['test']['r2'], 3), 'slr_delivery_r2': round(simple[1]['test']['r2'], 3),
                'mlr_delivery_r2': round(multi['test']['r2'], 3)}

    return execute('lab_regression', {}, body)
