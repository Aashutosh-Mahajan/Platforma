"""Search mining (PRD §8.4): what people look for, whether they find it,
and what's taking off.

Per normalised term: volume, last-7-days volume, trend (last 7 days vs the
weekly average of the 28 days before, smoothed), click-through and the
share of searches that found nothing. Spelling variants are grouped with
TF-IDF character n-grams + agglomerative clustering (cosine), so 'chiken
biryani' and 'chicken biryani' count as one demand signal.

Flags:
  unmet           >= 50% of its searches found nothing (and enough of them)
  trending        >= 2x its usual weekly volume in the last 7 days
  unmet_trending  both: demand spiking for something nobody offers
"""
import pandas as pd
from sklearn.cluster import AgglomerativeClustering
from sklearn.feature_extraction.text import TfidfVectorizer

from mining.models import MiningSearchTerm
from mining.registry import execute
from mining.modules import data

MIN_SEARCHES = 5
MAX_TERMS = 400
CLUSTER_DISTANCE = 0.45


def term_stats(df, today):
    today = pd.Timestamp(today)
    last7 = df['date'] > today - pd.Timedelta(days=7)
    prior28 = (df['date'] <= today - pd.Timedelta(days=7)) & (df['date'] > today - pd.Timedelta(days=35))
    g = df.groupby('term')
    stats = pd.DataFrame({
        'searches': g.size(),
        'searches_7d': df[last7].groupby('term').size(),
        'prior_28d': df[prior28].groupby('term').size(),
        'clicks': g['clicked'].sum(),
    }).fillna(0)
    known = df[df['has_results'].notna()]
    zero = known.assign(zero=~known['has_results'].astype(bool)).groupby('term')['zero'].agg(['sum', 'count'])
    stats['zero_result_rate'] = (zero['sum'] / zero['count']).reindex(stats.index)
    stats['click_rate'] = stats['clicks'] / stats['searches']
    # The vertical its searches land in most; 'unknown' when they never find anything.
    landed = df[df['vertical'] != 'unknown']
    stats['vertical'] = (
        landed.groupby('term')['vertical'].agg(lambda v: v.value_counts().idxmax()).reindex(stats.index).fillna('unknown')
        if len(landed) else 'unknown'
    )
    stats['trend'] = (stats['searches_7d'] + 1) / (stats['prior_28d'] / 4 + 1)
    return stats


def cluster_terms(terms):
    """{term: canonical term of its group} — the most searched spelling wins."""
    if len(terms) < 2:
        return {t: t for t in terms}
    X = TfidfVectorizer(analyzer='char_wb', ngram_range=(3, 4)).fit_transform(terms).toarray()
    labels = AgglomerativeClustering(
        n_clusters=None, metric='cosine', linkage='average', distance_threshold=CLUSTER_DISTANCE,
    ).fit_predict(X)
    canonical = {}
    for label in set(labels):
        members = [t for t, l in zip(terms, labels) if l == label]
        canonical[label] = members[0]  # `terms` arrives sorted by volume, so the first is the most searched
    return {t: canonical[l] for t, l in zip(terms, labels)}


def flag(row):
    unmet = row['searches'] >= MIN_SEARCHES and pd.notna(row['zero_result_rate']) and row['zero_result_rate'] >= 0.5
    trending = row['searches_7d'] >= MIN_SEARCHES and row['trend'] >= 2.0
    if unmet and trending:
        return 'unmet_trending'  # demand spiking for something the platform doesn't have
    return 'unmet' if unmet else 'trending' if trending else ''


def run_search_mining():
    def body(run):
        df = data.searches()
        if len(df) < 20:
            return {'skipped': True, 'reason': 'fewer than 20 logged searches'}
        stats = term_stats(df, data.today()).sort_values('searches', ascending=False)
        stats['flag'] = stats.apply(flag, axis=1)
        keep = stats[(stats.index.isin(stats.head(MAX_TERMS).index)) | (stats['flag'] != '')]
        groups = cluster_terms(list(keep.index))

        MiningSearchTerm.objects.bulk_create([
            MiningSearchTerm(
                run=run, term=term[:255], cluster=groups[term][:255], vertical=r['vertical'],
                searches=int(r['searches']),
                searches_7d=int(r['searches_7d']), trend=round(float(r['trend']), 3),
                zero_result_rate=None if pd.isna(r['zero_result_rate']) else round(float(r['zero_result_rate']), 4),
                click_rate=round(float(r['click_rate']), 4), flag=r['flag'], model_version=run.model_version,
            )
            for term, r in keep.iterrows()
        ], batch_size=2000)
        known = df['has_results'].notna()
        return {
            'searches': int(len(df)), 'distinct_terms': int(len(stats)), 'terms_stored': int(len(keep)),
            'term_groups': len(set(groups.values())),
            'zero_result_share': round(float((~df.loc[known, 'has_results'].astype(bool)).mean()), 4) if known.any() else None,
            'unmet_terms': keep.index[keep['flag'].str.startswith('unmet')].tolist()[:10],
            'trending_terms': keep.index[keep['flag'].str.endswith('trending')].tolist()[:10],
        }

    return execute('search', {'min_searches': MIN_SEARCHES, 'cluster_distance': CLUSTER_DISTANCE}, body)
