"""Mining module tests on small in-memory datasets with a known answer —
no database. Each one plants a pattern and checks the module finds it.
"""
import numpy as np
import pandas as pd
from django.test import SimpleTestCase

from mining.modules import anomaly, customers, forecast, hotspots, pricing, promos, search, sequences

RNG = np.random.default_rng(7)


class AnomalyTests(SimpleTestCase):
    def test_flags_planted_outliers_with_reasons(self):
        n = 600
        df = pd.DataFrame({
            'order_id': range(n), 'restaurant_id': RNG.integers(1, 6, n),
            'total': RNG.normal(400, 60, n).clip(50), 'items': RNG.integers(1, 4, n),
            'discount': np.zeros(n), 'failed_payments': np.zeros(n),
        })
        df.loc[10, 'total'] = 12000           # improbable value
        df.loc[20, 'failed_payments'] = 5     # payment retry storm
        flagged = anomaly.flag(anomaly.order_features(df), anomaly._ORDER_FEATURES, contamination=0.02)
        self.assertTrue({10, 20} <= set(flagged['order_id']))
        reasons = dict(zip(flagged['order_id'], flagged['reasons']))
        self.assertIn('failed payment', ' '.join(reasons[20]))


class SequenceTests(SimpleTestCase):
    def test_finds_planted_cross_domain_habit(self):
        rows = []
        base = pd.Timestamp('2026-01-01')
        for c in range(60):
            t = base + pd.Timedelta(days=int(RNG.integers(0, 200)))
            rows.append((c, t, 'event:concert'))
            rows.append((c, t - pd.Timedelta(hours=1), 'food:North Indian'))
            for _ in range(4):
                rows.append((c, base + pd.Timedelta(days=int(RNG.integers(0, 300)), hours=int(RNG.integers(0, 24))),
                             f"food:{RNG.choice(['Chinese', 'Italian', 'Thai'])}"))
        events = pd.DataFrame(rows, columns=['customer_id', 'at', 'token']).sort_values(['customer_id', 'at'])
        rules = sequences.rules_for_window(events, 3)
        top = max(rules, key=lambda r: r['lift'])
        self.assertEqual({top['antecedent'], top['consequent']}, {'event:concert', 'food:North Indian'})
        self.assertGreater(top['lift'], 2)


class ForecastTests(SimpleTestCase):
    def test_weekly_pattern_beats_seasonal_naive_or_matches_it(self):
        days = pd.date_range(end=pd.Timestamp('2026-06-30'), periods=200)
        y = np.where(days.weekday >= 5, 30, 10) + RNG.poisson(2, len(days))
        df = pd.DataFrame({'entity': 1, 'date': days, 'y': y.astype(float)})
        fc, metrics = forecast.forecast_series(df, horizon=7, today=days[-1])
        self.assertEqual(len(fc), 7)
        self.assertLessEqual(metrics['wape'], metrics['baseline_wape'] * 1.1)
        weekend = fc[fc['date'].dt.weekday >= 5]['predicted'].mean()
        weekday = fc[fc['date'].dt.weekday < 5]['predicted'].mean()
        self.assertGreater(weekend, weekday * 1.8)
        self.assertTrue((fc['lower'] <= fc['predicted']).all() and (fc['predicted'] <= fc['upper']).all())


class CustomerFeatureTests(SimpleTestCase):
    def test_recency_frequency_and_domains(self):
        p = pd.DataFrame({
            'customer_id': [1, 1, 1, 2],
            'date': pd.to_datetime(['2026-01-01', '2026-03-01', '2026-03-20', '2025-06-01']),
            'amount': [100.0, 200.0, 300.0, 50.0], 'domain': ['zesty', 'eventra', 'zesty', 'zesty'],
        })
        f = customers.features_as_of(p, pd.Timestamp('2026-03-31')).set_index('customer_id')
        self.assertEqual(f.loc[1, 'recency'], 11)
        self.assertEqual(f.loc[1, 'n_90'], 3)
        self.assertEqual(f.loc[1, 'uses_eventra'], 1)
        self.assertEqual(f.loc[2, 'uses_eventra'], 0)
        self.assertEqual(customers.value_bands([0, 0, 10, 50, 100, 1000])[-1], 'platinum')


class ValueModelTests(SimpleTestCase):
    def test_hurdle_model_is_calibrated_on_zero_inflated_spend(self):
        # 70% of customers spend nothing next quarter; the rest spend ~₹800-2000.
        n = 800
        rng = np.random.default_rng(3)
        df = pd.DataFrame({c: rng.random(n) for c in customers.NUMERIC})
        buys = rng.random(n) < 0.3
        df['future_spend'] = np.where(buys, rng.lognormal(7, 0.35, n), 0.0)
        df['churned'] = (~buys).astype(int)
        fit, test = df.iloc[:600], df.iloc[600:]
        columns = customers.ml.design(fit, customers.NUMERIC, []).columns
        spend, smearing, _ = customers.spend_model(fit, test, columns)
        X_test = customers.ml.design(test, customers.NUMERIC, [], columns=columns)
        # Spend given a purchase is unbiased (smearing undoes the log transform)...
        buyers = test['future_spend'] > 0
        spend_if_buying = np.exp(spend.predict(X_test[buyers.to_numpy()])) * smearing
        self.assertAlmostEqual(spend_if_buying.mean() / test.loc[buyers, 'future_spend'].mean(), 1.0, delta=0.1)
        # ...so with the realised buy rate the expected total matches the actual total.
        predicted = customers.expected_value(X_test, None, spend, smearing, base_buy_rate=buyers.mean())
        self.assertAlmostEqual(predicted.sum() / test['future_spend'].sum(), 1.0, delta=0.1)
        self.assertGreater(predicted.min(), 100)  # never the collapse-to-zero of a log1p regression


class PromoTests(SimpleTestCase):
    def test_detects_uplift_against_platform_trend(self):
        dates = pd.date_range('2026-01-01', '2026-03-31')
        rows = []
        for d in dates:
            in_window = pd.Timestamp('2026-03-01') <= d < pd.Timestamp('2026-03-22')
            for _ in range(10 if in_window else 5):
                rows.append({'restaurant_id': 1, 'date': d, 'promo_code': 'P10' if in_window else None,
                             'discount': 10.0 if in_window else 0.0, 'total': 400.0})
            for _ in range(20):
                rows.append({'restaurant_id': 2, 'date': d, 'promo_code': None, 'discount': 0.0, 'total': 300.0})
        promo = {'code': 'P10', 'restaurant_id': 1,
                 'valid_from': pd.Timestamp('2026-03-01', tz='UTC'), 'valid_until': pd.Timestamp('2026-03-22', tz='UTC')}
        result = promos.evaluate(promo, pd.DataFrame(rows), pd.Timestamp('2026-04-30'))
        self.assertAlmostEqual(result['uplift_pct'], 100.0, delta=1)
        self.assertEqual(result['verdict'], 'worked')

    def test_running_promo_is_too_early(self):
        promo = {'code': 'P', 'restaurant_id': 1,
                 'valid_from': pd.Timestamp('2026-03-01', tz='UTC'), 'valid_until': pd.Timestamp('2026-05-01', tz='UTC')}
        empty = pd.DataFrame(columns=['restaurant_id', 'date', 'promo_code', 'discount', 'total'])
        self.assertEqual(promos.evaluate(promo, empty, pd.Timestamp('2026-04-01'))['verdict'], 'too_early')


class PricingTests(SimpleTestCase):
    def test_recovers_within_event_elasticity(self):
        rows = []
        for event in range(8):
            for price in (200, 400, 800):
                sell_through = min(1.0, 0.9 * (price / 200) ** -1.0 * (0.8 + 0.05 * event))
                rows.append({'event_id': event, 'price': float(price), 'sell_through': sell_through})
        e, r2, n_events, _ = pricing.elasticity(pd.DataFrame(rows))
        self.assertAlmostEqual(e, -1.0, delta=0.05)
        self.assertEqual(n_events, 8)


class HotspotTests(SimpleTestCase):
    def test_separates_two_neighbourhoods(self):
        a = pd.DataFrame({'lat': 19.10 + RNG.normal(0, 0.003, 10), 'lng': 72.85 + RNG.normal(0, 0.003, 10)})
        b = pd.DataFrame({'lat': 19.00 + RNG.normal(0, 0.003, 10), 'lng': 72.82 + RNG.normal(0, 0.003, 10)})
        points = pd.concat([a, b], ignore_index=True).assign(weight=5)
        labels, silhouette = hotspots.cluster_city(points)
        self.assertEqual(len(set(labels[:10])), 1)
        self.assertNotEqual(labels[0], labels[10])
        self.assertGreater(silhouette, 0.7)


class SearchTests(SimpleTestCase):
    def test_groups_spelling_variants(self):
        groups = search.cluster_terms(['chicken biryani', 'chiken biryani', 'margherita pizza'])
        self.assertEqual(groups['chiken biryani'], 'chicken biryani')
        self.assertNotEqual(groups['margherita pizza'], 'chicken biryani')

    def test_flags(self):
        row = {'searches': 40, 'searches_7d': 30, 'trend': 4.0, 'zero_result_rate': 0.9}
        self.assertEqual(search.flag(row), 'unmet_trending')
        self.assertEqual(search.flag({**row, 'zero_result_rate': 0.1}), 'trending')
        self.assertEqual(search.flag({**row, 'trend': 1.0}), 'unmet')
