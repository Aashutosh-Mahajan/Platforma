"""Shared modelling helpers: one-hot design matrices that stay aligned
between training and scoring, and a small model-selection routine that
compares a regularised logistic regression with gradient boosting on a
held-out split and reports the metrics the PRD asks for.

Models are trained without class re-weighting on purpose: the scores are
used as probabilities (expected no-shows = sum of probabilities), and
re-weighting would inflate them.
"""
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier, HistGradientBoostingRegressor
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.metrics import (
    f1_score, mean_absolute_error, mean_squared_error, precision_score, r2_score, recall_score, roc_auc_score,
)
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler


def design(df, numeric, categorical, columns=None):
    """Numeric columns as-is plus one-hot categoricals. Pass the training
    matrix's `columns` when scoring so unseen categories drop out and
    missing ones become zeros.
    """
    parts = [df[numeric].astype(float).fillna(0)]
    if categorical:
        parts.append(pd.get_dummies(df[categorical].fillna('unknown').astype(str), prefix=categorical, dtype=float))
    X = pd.concat(parts, axis=1)
    if columns is not None:
        X = X.reindex(columns=columns, fill_value=0.0)
    return X


def time_split(df, time_col, train_frac=0.8):
    ordered = df.sort_values(time_col)
    cut = int(len(ordered) * train_frac)
    return ordered.iloc[:cut], ordered.iloc[cut:]


def _best_threshold(y, p):
    best_t, best_f1 = 0.5, -1.0
    for t in np.unique(np.quantile(p, np.linspace(0.5, 0.99, 40))):
        f1 = f1_score(y, p >= t, zero_division=0)
        if f1 > best_f1:
            best_t, best_f1 = float(t), f1
    return best_t


def select_classifier(X_train, y_train, X_test, y_test):
    """Fit both candidates, keep the one with the higher held-out ROC-AUC,
    then refit it on all the data. Returns (model, metrics).
    """
    candidates = {
        'logistic_regression': lambda: make_pipeline(StandardScaler(), LogisticRegression(max_iter=2000, C=0.5)),
        'gradient_boosting': lambda: HistGradientBoostingClassifier(
            max_iter=200, learning_rate=0.06, max_leaf_nodes=15, l2_regularization=1.0, random_state=42,
        ),
    }
    scores = {}
    fitted = {}
    for name, make in candidates.items():
        model = make().fit(X_train, y_train)
        p = model.predict_proba(X_test)[:, 1]
        scores[name] = roc_auc_score(y_test, p) if len(set(y_test)) > 1 else 0.5
        fitted[name] = (model, p)

    best = max(scores, key=scores.get)
    _, p = fitted[best]
    threshold = _best_threshold(y_test, p)
    predicted = p >= threshold
    metrics = {
        'model': best,
        'roc_auc': round(float(scores[best]), 4),
        'roc_auc_by_model': {k: round(float(v), 4) for k, v in scores.items()},
        'threshold': round(threshold, 4),
        'precision': round(float(precision_score(y_test, predicted, zero_division=0)), 4),
        'recall': round(float(recall_score(y_test, predicted, zero_division=0)), 4),
        'f1': round(float(f1_score(y_test, predicted, zero_division=0)), 4),
        'base_rate': round(float(np.mean(y_test)), 4),
        'mean_predicted': round(float(np.mean(p)), 4),
        'train_rows': int(len(X_train)), 'test_rows': int(len(X_test)),
    }
    X_all = pd.concat([X_train, X_test])
    y_all = np.concatenate([np.asarray(y_train), np.asarray(y_test)])
    final = candidates[best]().fit(X_all, y_all)
    return final, metrics


def select_regressor(X_train, y_train, X_test, y_test, baseline_pred=None):
    """Ridge vs gradient boosting on held-out MAE, refit the winner on all
    data. `baseline_pred` (a naive prediction for the test rows) is scored
    too so every regression reports what it beats.
    """
    candidates = {
        'ridge': lambda: make_pipeline(StandardScaler(), Ridge(alpha=1.0)),
        'gradient_boosting': lambda: HistGradientBoostingRegressor(
            max_iter=300, learning_rate=0.05, max_leaf_nodes=31, l2_regularization=1.0, random_state=42,
        ),
    }
    results = {}
    for name, make in candidates.items():
        model = make().fit(X_train, y_train)
        pred = model.predict(X_test)
        results[name] = (mean_absolute_error(y_test, pred), model, pred)
    best = min(results, key=lambda k: results[k][0])
    mae, _, pred = results[best]
    metrics = {
        'model': best,
        'mae': round(float(mae), 3),
        'rmse': round(float(np.sqrt(mean_squared_error(y_test, pred))), 3),
        'r2': round(float(r2_score(y_test, pred)), 4) if len(y_test) > 1 else None,
        'mae_by_model': {k: round(float(v[0]), 3) for k, v in results.items()},
        'train_rows': int(len(X_train)), 'test_rows': int(len(X_test)),
    }
    if baseline_pred is not None:
        metrics['baseline_mae'] = round(float(mean_absolute_error(y_test, baseline_pred)), 3)
    X_all = pd.concat([X_train, X_test])
    y_all = np.concatenate([np.asarray(y_train), np.asarray(y_test)])
    final = candidates[best]().fit(X_all, y_all)
    return final, metrics


def feature_importance(model, columns, top=6):
    """Largest absolute coefficients (logistic/ridge) — gradient boosting
    has no cheap global importance, so it returns [] rather than a guess.
    """
    estimator = model.steps[-1][1] if hasattr(model, 'steps') else model
    coef = getattr(estimator, 'coef_', None)
    if coef is None:
        return []
    values = np.ravel(coef)
    order = np.argsort(-np.abs(values))[:top]
    return [{'feature': columns[i], 'weight': round(float(values[i]), 4)} for i in order]
