"""API tests for the /insights and /olap surfaces: who can see what, the
Both / Zesty / Eventra filter, and the anomaly review flow.

Uses both databases (operational + warehouse), so it needs a database
setup the test runner can build; see warehouse/tests_etl.py.
"""
import datetime
import uuid
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from core.models import User
from eventra.models import Event
from mining.models import (
    MiningAnomaly, MiningCustomerScore, MiningForecast, MiningPromoEffect, MiningRun, MiningSearchTerm,
)
from warehouse.models import CbDailyOutletRevenue, DimRestaurant
from zesty.models import Restaurant


def _user(name, role, **extra):
    return User.objects.create_user(
        username=name, email=f'{name}@test.dev', password='x-test-pass-1', role=role, is_email_verified=True, **extra,
    )


def _run(module, metrics=None):
    return MiningRun.objects.create(module=module, model_version='1.1.0', status='succeeded',
                                    finished_at=timezone.now(), metrics=metrics or {})


class InsightsApiTests(TestCase):
    databases = '__all__'

    @classmethod
    def setUpTestData(cls):
        cls.admin = _user('admin1', 'admin', is_staff=True)
        cls.owner = _user('owner1', 'restaurant_owner')
        cls.other_owner = _user('owner2', 'restaurant_owner')
        cls.organizer = _user('org1', 'event_organizer')
        cls.customer = _user('cust1', 'customer')
        cls.mine = Restaurant.objects.create(owner=cls.owner, name='Mine', cuisine_types='Thai', address='1, Bandra, Mumbai',
                                             delivery_fee=Decimal('20'), delivery_time_min=20, delivery_time_max=35)
        cls.theirs = Restaurant.objects.create(owner=cls.other_owner, name='Theirs', cuisine_types='Thai',
                                               address='2, Juhu, Mumbai', delivery_fee=Decimal('20'))
        cls.event = Event.objects.create(organizer=cls.organizer, name='Show', description='d', category='concert',
                                         venue_name='Hall', address='Hall Road',
                                         event_date=timezone.now() + datetime.timedelta(days=10))
        for r in (cls.mine, cls.theirs):
            DimRestaurant.objects.create(restaurant_id=r.id, name=r.name, valid_from=datetime.date(2026, 1, 1))
            CbDailyOutletRevenue.objects.create(date=datetime.date(2026, 9, 1), restaurant_id=r.id,
                                                restaurant_name=r.name, net_revenue=Decimal('500'), order_count=2)

        forecast = _run('forecast', {'restaurant_orders': {'wape': 0.3}})
        MiningForecast.objects.create(run=forecast, series='restaurant_orders', entity_id=cls.mine.id,
                                      target_date=timezone.localdate() + datetime.timedelta(days=1),
                                      predicted=3.0, lower=1.0, upper=5.0, model_version='1.1.0')
        customers = _run('customers', {'by_vertical': {
            'all': {'churn': {'roc_auc': 0.7}}, 'zesty': {'churn': {'roc_auc': 0.72}},
            'eventra': {'skipped': True, 'reason': 'fewer than 50 customers active before the cutoff'},
        }})
        for vertical in ('all', 'zesty'):
            MiningCustomerScore.objects.create(run=customers, vertical=vertical, customer_id=cls.customer.id,
                                               churn_probability=0.8, churn_band='high', predicted_90d_value=Decimal('900'),
                                               value_band='platinum', days_since_last=40, model_version='1.1.0')
        anomaly = _run('anomaly')
        cls.order_flag = MiningAnomaly.objects.create(run=anomaly, domain='order', target_id=str(uuid.uuid4()), score=0.99,
                                                      rank=1, reasons=['x'], model_version='1.1.0',
                                                      entity_id=cls.mine.id, customer_id=cls.customer.id)
        MiningAnomaly.objects.create(run=anomaly, domain='booking', target_id='77', score=0.98, rank=1,
                                     reasons=['y'], model_version='1.1.0', entity_id=cls.event.id)
        search = _run('search')
        for term, vertical in (('pizza', 'zesty'), ('concert', 'eventra'), ('poke bowl', 'unknown')):
            MiningSearchTerm.objects.create(run=search, term=term, cluster=term, vertical=vertical, searches=10,
                                            trend=1.0, zero_result_rate=1.0 if vertical == 'unknown' else 0.0,
                                            flag='unmet' if vertical == 'unknown' else '', model_version='1.1.0')
        promos = _run('promos')
        MiningPromoEffect.objects.create(run=promos, promo_code='P1', restaurant_id=cls.mine.id,
                                         window_start=datetime.date(2026, 8, 1), window_end=datetime.date(2026, 8, 22),
                                         redemptions=3, discount_given=Decimal('30'), orders_per_day_before=1,
                                         orders_per_day_during=2, verdict='worked', model_version='1.1.0')

    def get(self, user, url, **params):
        client = APIClient()
        if user:
            client.force_authenticate(user)
        return client.get(f'/api/v1/{url}', params)

    # ---- access ----

    def test_owner_sees_only_own_restaurant_forecast(self):
        self.assertEqual(self.get(self.owner, f'insights/forecast/restaurants/{self.mine.id}').status_code, 200)
        self.assertEqual(self.get(self.owner, f'insights/forecast/restaurants/{self.theirs.id}').status_code, 403)
        self.assertEqual(self.get(self.organizer, f'insights/forecast/restaurants/{self.mine.id}').status_code, 403)

    def test_admin_only_surfaces_reject_partners_and_customers(self):
        for url in ('insights/models', 'insights/customers', 'insights/anomalies', 'insights/search', 'olap/health'):
            self.assertEqual(self.get(self.owner, url).status_code, 403, url)
            self.assertEqual(self.get(self.customer, url).status_code, 403, url)
            self.assertEqual(self.get(self.admin, url).status_code, 200, url)

    def test_organizer_risk_is_limited_to_own_events(self):
        self.assertEqual(self.get(self.organizer, 'insights/risk/events', event_id=self.event.id).status_code, 200)
        self.assertEqual(self.get(self.owner, 'insights/risk/events').status_code, 403)

    def test_promos_scoped_to_owner(self):
        mine = self.get(self.owner, 'insights/promos').json()['promotions']
        self.assertEqual([p['code'] for p in mine], ['P1'])
        self.assertEqual(self.get(self.other_owner, 'insights/promos').json()['promotions'], [])

    # ---- OLAP scoping ----

    def test_olap_owner_forced_onto_own_restaurant(self):
        rows = self.get(self.owner, 'olap/breakdown', measure='net_revenue', dimensions='restaurant').json()['rows']
        self.assertEqual({r['restaurant'] for r in rows}, {self.mine.id})
        self.assertEqual(rows[0]['restaurant_label'], 'Mine')
        denied = self.get(self.owner, 'olap/breakdown', measure='net_revenue', dimensions='date',
                          filters=f'{{"restaurant": {self.theirs.id}}}')
        self.assertEqual(denied.status_code, 403)

    def test_olap_admin_sees_all_restaurants(self):
        rows = self.get(self.admin, 'olap/breakdown', measure='net_revenue', dimensions='restaurant').json()['rows']
        self.assertEqual({r['restaurant'] for r in rows}, {self.mine.id, self.theirs.id})

    def test_olap_catalog_tags_verticals_and_scopes_partners(self):
        admin = self.get(self.admin, 'olap/catalog').json()
        self.assertEqual({c['vertical'] for c in admin['cuboids']}, {'zesty', 'eventra', 'both'})
        owner = self.get(self.owner, 'olap/catalog').json()
        self.assertEqual(owner['scoped_to'], 'restaurant')
        self.assertTrue(all('restaurant' in [d['key'] for d in c['dimensions']] for c in owner['cuboids']))

    # ---- Both / Zesty / Eventra ----

    def test_customer_scores_follow_vertical(self):
        both = self.get(self.admin, 'insights/customers').json()
        self.assertEqual(both['vertical'], 'all')
        self.assertEqual(len(both['at_risk']), 1)
        zesty = self.get(self.admin, 'insights/customers', vertical='zesty').json()
        self.assertEqual(zesty['model']['metrics']['churn']['roc_auc'], 0.72)
        eventra = self.get(self.admin, 'insights/customers', vertical='eventra').json()
        self.assertFalse(eventra['model']['available'])
        self.assertIn('fewer than 50', eventra['model']['reason'])

    def test_anomalies_follow_vertical(self):
        zesty = self.get(self.admin, 'insights/anomalies', vertical='zesty').json()['results']
        eventra = self.get(self.admin, 'insights/anomalies', vertical='eventra').json()['results']
        both = self.get(self.admin, 'insights/anomalies').json()['results']
        self.assertEqual({a['domain'] for a in zesty}, {'order'})
        self.assertEqual({a['domain'] for a in eventra}, {'booking'})
        self.assertEqual(len(both), 2)

    def test_search_vertical_keeps_unknown_terms(self):
        terms = {t['term'] for t in self.get(self.admin, 'insights/search', vertical='zesty').json()['top']}
        self.assertEqual(terms, {'pizza', 'poke bowl'})

    def test_promos_hidden_for_eventra(self):
        self.assertEqual(self.get(self.admin, 'insights/promos', vertical='eventra').json()['promotions'], [])
        self.assertEqual(len(self.get(self.admin, 'insights/promos', vertical='zesty').json()['promotions']), 1)

    def test_bad_vertical_is_rejected(self):
        self.assertEqual(self.get(self.admin, 'insights/customers', vertical='both').status_code, 400)

    def test_models_report_their_verticals(self):
        modules = {m['module']: m['verticals'] for m in self.get(self.admin, 'insights/models').json()['modules']}
        self.assertEqual(modules['promos'], ['zesty'])
        self.assertEqual(modules['pricing'], ['eventra'])

    # ---- anomaly review ----

    def test_admin_reviews_anomaly_and_it_leaves_the_open_queue(self):
        client = APIClient()
        client.force_authenticate(self.admin)
        response = client.patch(f'/api/v1/insights/anomalies/{self.order_flag.id}', {'review_status': 'dismissed'}, format='json')
        self.assertEqual(response.status_code, 200)
        open_ids = {a['id'] for a in self.get(self.admin, 'insights/anomalies').json()['results']}
        self.assertNotIn(self.order_flag.id, open_ids)
        bad = client.patch(f'/api/v1/insights/anomalies/{self.order_flag.id}', {'review_status': 'maybe'}, format='json')
        self.assertEqual(bad.status_code, 400)

    def test_owner_cannot_review_anomalies(self):
        client = APIClient()
        client.force_authenticate(self.owner)
        response = client.patch(f'/api/v1/insights/anomalies/{self.order_flag.id}', {'review_status': 'dismissed'}, format='json')
        self.assertEqual(response.status_code, 403)

    # ---- customer-facing ----

    def test_delivery_estimate_falls_back_to_listed_times(self):
        data = self.get(None, 'insights/delivery-estimate', restaurant_id=self.mine.id, items=3).json()
        self.assertEqual(data, {'source': 'restaurant', 'minutes': 35, 'low': 20, 'high': 35})
        self.assertEqual(self.get(None, 'insights/delivery-estimate', restaurant_id='abc').status_code, 400)

    def test_recommendations_require_login_and_fall_back_to_popular(self):
        self.assertEqual(self.get(None, 'insights/recommendations').status_code, 401)
        data = self.get(self.customer, 'insights/recommendations').json()
        self.assertFalse(data['personalised'])
        self.assertTrue(all(r['reason'] for r in data['restaurants']))
