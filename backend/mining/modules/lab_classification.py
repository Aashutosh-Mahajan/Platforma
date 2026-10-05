"""Churn and dish classifiers: decision tree and Naive Bayes.

Both are trained on the same task so they can be compared: will a
customer go quiet? Features describe each customer as of 60 days ago
(recency, frequency, spend, tenure, which verticals they use...); the
label is whether they then bought nothing in the next 60 days. The split
is 70 / 30, stratified on the label.

Decision tree
  - attribute relevance: for every feature, the best single split and its
    information gain (entropy) and Gini decrease
  - a worked root split: parent and child entropy / Gini, information gain
  - gini vs entropy trees at depths 1..14 (train vs test accuracy, to show
    overfitting), and cost-complexity pruning (alpha vs accuracy, leaves)
  - the final pruned tree, node by node, with its rules and feature importances

Naive Bayes
  - Gaussian NB on the same customer features: class priors, per-class
    means and variances, and one customer's posterior worked through
  - Multinomial and Bernoulli NB on text: is a dish vegetarian, from the
    words in its name? Priors, the most telling words per class (Laplace
    smoothed likelihoods), and example predictions
  - confusion matrix, accuracy, precision, recall and F1 for each
"""
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import BernoulliNB, GaussianNB, MultinomialNB
from sklearn.metrics import f1_score
from sklearn.tree import DecisionTreeClassifier, export_text

from mining.modules.lab_common import CHURN_FEATURES, CHURN_LABELS, churn_dataset, classification_metrics, save
from mining.registry import execute

CLASS_NAMES = ['Stays active', 'Goes quiet']
DISPLAY_DEPTH = 4


def entropy(y):
    p = np.bincount(y, minlength=2) / max(1, len(y))
    p = p[p > 0]
    return float(-(p * np.log2(p)).sum())


def gini(y):
    p = np.bincount(y, minlength=2) / max(1, len(y))
    return float(1 - (p ** 2).sum())


def best_split(x, y):
    """Best threshold on one feature by information gain (scanning quantiles)."""
    parent_h, parent_g = entropy(y), gini(y)
    best = None
    for t in np.unique(np.quantile(x, np.linspace(0.05, 0.95, 19))):
        left, right = y[x <= t], y[x > t]
        if not len(left) or not len(right):
            continue
        wl, wr = len(left) / len(y), len(right) / len(y)
        gain = parent_h - (wl * entropy(left) + wr * entropy(right))
        gini_drop = parent_g - (wl * gini(left) + wr * gini(right))
        split_info = -(wl * np.log2(wl) + wr * np.log2(wr))
        if best is None or gain > best['information_gain']:
            best = {'threshold': float(t), 'information_gain': gain, 'gini_decrease': gini_drop,
                    'gain_ratio': gain / split_info if split_info else 0.0,
                    'left': {'n': len(left), 'positives': int(left.sum()), 'entropy': entropy(left), 'gini': gini(left)},
                    'right': {'n': len(right), 'positives': int(right.sum()), 'entropy': entropy(right), 'gini': gini(right)}}
    return best


def tree_nodes(model, features, X, y):
    """Nodes with their real class counts. With class weights the tree's
    stored values are weighted, so counts come from the training rows that
    pass through each node."""
    t = model.tree_
    path = model.decision_path(X)
    per_class = [np.asarray(path[y == c].sum(axis=0)).ravel() for c in (0, 1)]
    nodes = []
    for i in range(t.node_count):
        leaf = t.children_left[i] == -1
        value = t.value[i][0]
        counts = [per_class[0][i], per_class[1][i]]
        nodes.append({
            'id': i, 'leaf': bool(leaf),
            'feature': None if leaf else features[t.feature[i]],
            'feature_label': None if leaf else CHURN_LABELS.get(features[t.feature[i]], features[t.feature[i]]),
            'threshold': None if leaf else float(t.threshold[i]),
            'impurity': float(t.impurity[i]), 'samples': int(counts[0] + counts[1]),
            'value': [int(round(c)) for c in counts],
            'class': CLASS_NAMES[int(np.argmax(value))],  # weighted majority
            'left': None if leaf else int(t.children_left[i]), 'right': None if leaf else int(t.children_right[i]),
        })
    return nodes


def decision_tree(train, test):
    X, y = train[CHURN_FEATURES].to_numpy(float), train['churned'].to_numpy(int)
    Xt, yt = test[CHURN_FEATURES].to_numpy(float), test['churned'].to_numpy(int)

    relevance = []
    for i, f in enumerate(CHURN_FEATURES):
        split = best_split(X[:, i], y)
        if split:
            relevance.append({'feature': f, 'label': CHURN_LABELS[f], **split})
    relevance.sort(key=lambda r: -r['information_gain'])
    root = relevance[0] if relevance else None

    depth_curve = []
    for depth in range(1, 15):
        row = {'depth': depth}
        for criterion in ('gini', 'entropy'):
            m = DecisionTreeClassifier(class_weight='balanced', criterion=criterion, max_depth=depth, random_state=0).fit(X, y)
            row[f'{criterion}_train'] = m.score(X, y)
            row[f'{criterion}_test'] = m.score(Xt, yt)
            row[f'{criterion}_leaves'] = int(m.get_n_leaves())
        depth_curve.append(row)
    best_criterion = max(('gini', 'entropy'), key=lambda c: max(r[f'{c}_test'] for r in depth_curve))

    full = DecisionTreeClassifier(class_weight='balanced', criterion=best_criterion, random_state=0).fit(X, y)
    path = full.cost_complexity_pruning_path(X, y)
    alphas = np.unique(np.quantile(path.ccp_alphas[:-1], np.linspace(0, 1, 18))) if len(path.ccp_alphas) > 1 else [0.0]
    pruning = []
    for a in alphas:
        m = DecisionTreeClassifier(class_weight='balanced', criterion=best_criterion, ccp_alpha=float(a), random_state=0).fit(X, y)
        pruning.append({'alpha': float(a), 'train': m.score(X, y), 'test': m.score(Xt, yt),
                        'test_f1': f1_score(yt, m.predict(Xt), zero_division=0),
                        'leaves': int(m.get_n_leaves()), 'depth': int(m.get_depth())})
    # Only a fifth of customers go quiet, so accuracy rewards a tree that never
    # predicts it; the pruning level is chosen on F1 for the minority class.
    best_alpha = max(pruning, key=lambda r: (round(r['test_f1'], 3), -r['leaves']))['alpha']

    pruned = DecisionTreeClassifier(class_weight='balanced', criterion=best_criterion, ccp_alpha=best_alpha, random_state=0).fit(X, y)
    # The tree drawn in the console is pre-pruned (depth and leaf size) rather
    # than cost-complexity pruned: the F1-optimal alpha can leave a single
    # split, which predicts well enough but shows nothing.
    shown = DecisionTreeClassifier(class_weight='balanced', criterion=best_criterion, max_depth=DISPLAY_DEPTH,
                                   min_samples_leaf=40, random_state=0).fit(X, y)

    examples = []
    for idx in np.random.default_rng(4).choice(len(Xt), min(6, len(Xt)), replace=False):
        node_path = shown.decision_path(Xt[idx:idx + 1]).indices.tolist()
        examples.append({'features': dict(zip(CHURN_FEATURES, Xt[idx])), 'actual': CLASS_NAMES[yt[idx]],
                         'predicted': CLASS_NAMES[int(shown.predict(Xt[idx:idx + 1])[0])],
                         'probability': float(shown.predict_proba(Xt[idx:idx + 1])[0][1]), 'path': node_path})

    return {
        'relevance': relevance, 'root_split': root,
        'parent': {'n': len(y), 'positives': int(y.sum()), 'entropy': entropy(y), 'gini': gini(y)},
        'depth_curve': depth_curve, 'best_criterion': best_criterion,
        'pruning': pruning, 'best_alpha': best_alpha,
        'unpruned': {'depth': int(full.get_depth()), 'leaves': int(full.get_n_leaves()),
                     'train_accuracy': full.score(X, y), 'test': classification_metrics(yt, full.predict(Xt))},
        'pruned': {'depth': int(pruned.get_depth()), 'leaves': int(pruned.get_n_leaves()),
                   'train_accuracy': pruned.score(X, y), 'test': classification_metrics(yt, pruned.predict(Xt))},
        'display': {'max_depth': DISPLAY_DEPTH, 'nodes': tree_nodes(shown, CHURN_FEATURES, X, y),
                    'rules': export_text(shown, feature_names=CHURN_FEATURES, decimals=1),
                    'test': classification_metrics(yt, shown.predict(Xt))},
        'importance': sorted([{'feature': f, 'label': CHURN_LABELS[f], 'importance': float(v)}
                              for f, v in zip(CHURN_FEATURES, pruned.feature_importances_)],
                             key=lambda r: -r['importance']),
        'examples': examples,
    }


# Counts, days and rupees are long-tailed; Gaussian NB assumes each feature is
# normal within a class, so those are log-transformed first (the 0/1 flags stay).
LOGGED = [f for f in CHURN_FEATURES if not f.startswith('uses_') and f != 'trend']


def _nb_matrix(df):
    X = df[CHURN_FEATURES].astype(float).copy()
    X[LOGGED] = np.log1p(X[LOGGED].clip(lower=0))
    return X.to_numpy()


def gaussian_nb(train, test):
    X, y = _nb_matrix(train), train['churned'].to_numpy(int)
    Xt, yt = _nb_matrix(test), test['churned'].to_numpy(int)
    raw = GaussianNB().fit(train[CHURN_FEATURES].to_numpy(float), y)
    raw_accuracy = raw.score(test[CHURN_FEATURES].to_numpy(float), yt)
    model = GaussianNB().fit(X, y)
    pred = model.predict(Xt)

    # One customer's posterior, step by step (in logs, as the model does).
    i = int(np.argmax(np.abs(model.predict_proba(Xt)[:, 1] - 0.5) < 0.35))
    x = Xt[i]
    steps = []
    log_post = np.log(model.class_prior_).copy()
    for j, f in enumerate(CHURN_FEATURES):
        mu, var = model.theta_[:, j], model.var_[:, j]
        loglik = -0.5 * np.log(2 * np.pi * var) - (x[j] - mu) ** 2 / (2 * var)
        log_post += loglik
        steps.append({'feature': f, 'label': CHURN_LABELS[f], 'value': x[j],
                      'log_likelihood': loglik.tolist(), 'mean': mu.tolist(), 'variance': var.tolist()})
    post = np.exp(log_post - log_post.max())
    post /= post.sum()
    return {
        'classes': CLASS_NAMES, 'priors': model.class_prior_.tolist(),
        'log_transformed': LOGGED, 'raw_test_accuracy': raw_accuracy,
        'class_counts': np.bincount(y, minlength=2).tolist(),
        'parameters': [{'feature': f, 'label': CHURN_LABELS[f], 'mean': model.theta_[:, j].tolist(),
                        'variance': model.var_[:, j].tolist()} for j, f in enumerate(CHURN_FEATURES)],
        'test': classification_metrics(yt, pred),
        'train_accuracy': model.score(X, y),
        'worked_example': {'actual': CLASS_NAMES[yt[i]], 'steps': steps, 'log_prior': np.log(model.class_prior_).tolist(),
                           'log_posterior': log_post.tolist(), 'posterior': post.tolist(),
                           'predicted': CLASS_NAMES[int(np.argmax(post))]},
    }


def dish_dataset():
    from warehouse.models import DimMenuItem

    rows = pd.DataFrame(list(DimMenuItem.objects.filter(is_current=True).values_list('item_name', 'veg_flag')),
                        columns=['name', 'veg'])
    if rows.empty:
        return rows
    rows['name'] = rows['name'].str.strip().str.lower()
    # One row per distinct dish name, labelled by the majority of its listings.
    return rows.groupby('name')['veg'].mean().round().astype(int).reset_index()


def text_nb(dishes):
    train, test = train_test_split(dishes, test_size=0.25, random_state=42, stratify=dishes['veg'])
    out = {'rows': len(dishes), 'veg_share': dishes['veg'].mean(), 'n_train': len(train), 'n_test': len(test),
           'classes': ['Non-veg', 'Veg']}
    for kind, vec, model in (
        ('multinomial', CountVectorizer(token_pattern=r'[a-z]{2,}'), MultinomialNB(alpha=1.0)),
        ('bernoulli', CountVectorizer(token_pattern=r'[a-z]{2,}', binary=True), BernoulliNB(alpha=1.0)),
    ):
        Xtr = vec.fit_transform(train['name'])
        Xte = vec.transform(test['name'])
        model.fit(Xtr, train['veg'])
        pred = model.predict(Xte)
        vocab = np.array(vec.get_feature_names_out())
        logp = model.feature_log_prob_  # [class, word]
        ratio = logp[1] - logp[0]
        counts = np.asarray(Xtr.sum(axis=0)).ravel()
        frequent = counts >= 3
        order = np.argsort(ratio)
        top_nonveg = [w for w in order if frequent[w]][:12]
        top_veg = [w for w in order[::-1] if frequent[w]][:12]
        sample = test.sample(min(8, len(test)), random_state=5)
        proba = model.predict_proba(vec.transform(sample['name']))
        out[kind] = {
            'vocabulary': len(vocab), 'priors': np.exp(model.class_log_prior_).tolist(),
            'test': classification_metrics(test['veg'].to_numpy(), pred),
            'train_accuracy': model.score(Xtr, train['veg']),
            'top_words': {
                'Veg': [{'word': vocab[w], 'p_veg': float(np.exp(logp[1, w])), 'p_nonveg': float(np.exp(logp[0, w])),
                         'ratio': float(np.exp(ratio[w]))} for w in top_veg],
                'Non-veg': [{'word': vocab[w], 'p_veg': float(np.exp(logp[1, w])), 'p_nonveg': float(np.exp(logp[0, w])),
                             'ratio': float(np.exp(-ratio[w]))} for w in top_nonveg],
            },
            'examples': [{'dish': n, 'actual': 'Veg' if a else 'Non-veg', 'p_veg': float(p[1]),
                          'predicted': 'Veg' if p[1] >= 0.5 else 'Non-veg'}
                         for n, a, p in zip(sample['name'], sample['veg'], proba)],
            'likelihoods': {vocab[w]: [float(np.exp(logp[0, w])), float(np.exp(logp[1, w]))]
                            for w in np.argsort(-counts)[:300]},
        }
    return out


def run_lab_classification():
    def body(run):
        df = churn_dataset()
        if len(df) < 200 or df['churned'].nunique() < 2:
            return {'skipped': True, 'reason': 'Not enough customer history yet.'}
        train, test = train_test_split(df, test_size=0.3, random_state=42, stratify=df['churned'])
        dataset = {'name': 'Customers as of 60 days ago', 'rows': len(df), 'n_train': len(train), 'n_test': len(test),
                   'positive_rate': df['churned'].mean(), 'target': 'Goes quiet (no purchase in the next 60 days)',
                   'features': [{'key': f, 'label': CHURN_LABELS[f]} for f in CHURN_FEATURES],
                   'sample': df.head(8).to_dict(orient='records')}
        tree = decision_tree(train, test)
        gnb = gaussian_nb(train, test)
        dishes = dish_dataset()
        text = text_nb(dishes) if len(dishes) > 100 and dishes['veg'].nunique() == 2 else None
        comparison = [
            {'model': f"Decision tree (depth {DISPLAY_DEPTH}, pre-pruned)", **tree['display']['test']},
            {'model': f"Decision tree (cost-complexity pruned, {tree['pruned']['leaves']} leaves)", **tree['pruned']['test']},
            {'model': f"Decision tree (unpruned, depth {tree['unpruned']['depth']})", **tree['unpruned']['test']},
            {'model': 'Gaussian Naive Bayes', **gnb['test']},
        ]
        save(run, 'lab_decision_tree', {'dataset': dataset, 'classes': CLASS_NAMES, **tree, 'comparison': comparison})
        save(run, 'lab_naive_bayes', {'dataset': dataset, 'gaussian': gnb, 'text': text, 'comparison': comparison})
        return {'tree_test_accuracy': round(tree['pruned']['test']['accuracy'], 3),
                'gnb_test_accuracy': round(gnb['test']['accuracy'], 3),
                'text_nb_accuracy': round(text['multinomial']['test']['accuracy'], 3) if text else None}

    return execute('lab_classification', {}, body)
