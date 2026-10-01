"""Warehouse tests that need no database: routing, transforms, lifecycle
building, no-show rules and OLAP scoping.
"""
import datetime
import uuid
from types import SimpleNamespace
from unittest import mock

from django.test import SimpleTestCase, override_settings
from rest_framework.exceptions import PermissionDenied

from config.db_routers import WarehouseRouter
from warehouse.etl import load, transform as tf
from warehouse.models import FactOrder
from warehouse.olap import queries, views

UTC = datetime.timezone.utc
SPLIT = {'default': {'ENGINE': 'django.db.backends.postgresql', 'NAME': 'main'},
         'warehouse': {'ENGINE': 'django.db.backends.postgresql', 'NAME': 'wh'}}
SINGLE = {'default': SPLIT['default']}


class RouterTests(SimpleTestCase):
    router = WarehouseRouter()

    @override_settings(DATABASES=SPLIT)
    def test_split_mode_routes_warehouse_apps_to_warehouse(self):
        from core.models import User
        self.assertEqual(self.router.db_for_read(FactOrder), 'warehouse')
        self.assertEqual(self.router.db_for_write(FactOrder), 'warehouse')
        self.assertIsNone(self.router.db_for_read(User))

    @override_settings(DATABASES=SPLIT)
    def test_split_mode_keeps_migrations_apart(self):
        self.assertTrue(self.router.allow_migrate('warehouse', 'warehouse'))
        self.assertTrue(self.router.allow_migrate('warehouse', 'mining'))
        self.assertFalse(self.router.allow_migrate('default', 'warehouse'))
        self.assertFalse(self.router.allow_migrate('warehouse', 'core'))
        self.assertIsNone(self.router.allow_migrate('default', 'core'))

    @override_settings(DATABASES=SINGLE)
    def test_single_database_mode_steps_aside(self):
        self.assertEqual(self.router.db_for_read(FactOrder), 'default')
        self.assertIsNone(self.router.allow_migrate('default', 'warehouse'))


class TransformTests(SimpleTestCase):
    def test_normalize_query(self):
        self.assertEqual(tf.normalize_query('  Chicken   BIRYANI!! '), 'chicken biryani')
        self.assertEqual(tf.normalize_query("Haldiram's"), "haldiram's")

    def test_search_has_results(self):
        self.assertIsNone(tf.search_has_results(''))  # logged before the convention existed
        self.assertFalse(tf.search_has_results('none'))
        self.assertTrue(tf.search_has_results('restaurants:12'))

    def test_restaurant_area_prefers_area_field(self):
        self.assertEqual(tf.restaurant_area(SimpleNamespace(area='Bandra', address='1, Juhu, Mumbai')), 'Bandra')
        self.assertEqual(tf.restaurant_area(SimpleNamespace(area='', address='1, Juhu, Mumbai')), '1')


class LifecycleTests(SimpleTestCase):
    def test_stage_durations_use_first_arrival(self):
        order_id = uuid.uuid4()
        placed = datetime.datetime(2026, 5, 1, 19, 0, tzinfo=UTC)
        order = SimpleNamespace(id=order_id, created_at=placed)

        def h(status, minutes):
            return SimpleNamespace(order_id=order_id, order=order, new_status=status,
                                   changed_at=placed + datetime.timedelta(minutes=minutes))

        history = [h('confirmed', 4), h('preparing', 6), h('ready', 26), h('ready', 40),
                   h('out_for_delivery', 30), h('delivered', 52)]
        stamps = load.build_lifecycles(history)[order_id]['stamps']
        self.assertEqual(stamps['ready_at'], placed + datetime.timedelta(minutes=26))
        self.assertEqual(load._minutes(placed, stamps['delivered_at']), 52.0)
        self.assertIsNone(load._minutes(stamps['delivered_at'], placed))


class LocalTimeTests(SimpleTestCase):
    @override_settings(TIME_ZONE='Asia/Kolkata')
    def test_warehouse_dates_and_hours_are_local(self):
        # 14:00 UTC is 19:30 in India; 20:00 UTC is already the next day there.
        evening = datetime.datetime(2026, 5, 1, 14, 0, tzinfo=UTC)
        late = datetime.datetime(2026, 5, 1, 20, 0, tzinfo=UTC)
        self.assertEqual(load._local(evening).hour, 19)
        self.assertEqual(load._local(late).date(), datetime.date(2026, 5, 2))


class NoShowTests(SimpleTestCase):
    now = datetime.datetime(2026, 6, 1, tzinfo=UTC)
    past = datetime.datetime(2026, 5, 1, tzinfo=UTC)

    def test_unscanned_booking_at_scanning_event_is_no_show(self):
        self.assertTrue(load.is_no_show(self.past, 'confirmed', 0, True, self.now))

    def test_not_a_no_show_when_venue_never_scans(self):
        self.assertFalse(load.is_no_show(self.past, 'confirmed', 0, False, self.now))

    def test_future_or_cancelled_or_scanned_is_never_a_no_show(self):
        future = datetime.datetime(2026, 7, 1, tzinfo=UTC)
        self.assertFalse(load.is_no_show(future, 'confirmed', 0, True, self.now))
        self.assertFalse(load.is_no_show(self.past, 'cancelled', 0, True, self.now))
        self.assertFalse(load.is_no_show(self.past, 'confirmed', 2, True, self.now))


class OlapScopingTests(SimpleTestCase):
    def _request(self, role):
        return SimpleNamespace(user=SimpleNamespace(is_authenticated=True, is_staff=False, role=role))

    def test_owner_is_forced_onto_their_restaurants(self):
        with mock.patch.object(views, 'owned_restaurant_ids', return_value={3, 7}):
            self.assertEqual(views.scoped(self._request('restaurant_owner'), {}), {'restaurant': [3, 7]})
            self.assertEqual(views.scoped(self._request('restaurant_owner'), {'restaurant': '7'}), {'restaurant': [7]})
            with self.assertRaises(PermissionDenied):
                views.scoped(self._request('restaurant_owner'), {'restaurant': [7, 9]})

    def test_partner_without_rows_sees_nothing(self):
        with mock.patch.object(views, 'owned_event_ids', return_value=set()):
            self.assertEqual(views.scoped(self._request('event_organizer'), {}), {'event': [-1]})

    def test_admin_is_not_scoped(self):
        admin = SimpleNamespace(user=SimpleNamespace(is_authenticated=True, is_staff=False, role='admin'))
        self.assertEqual(views.scoped(admin, {'area': 'Bandra'}), {'area': 'Bandra'})

    def test_raw_fallback_fails_closed_on_unknown_filter(self):
        # booking_revenue can't be filtered by restaurant: it must come back
        # empty, never as unfiltered platform totals.
        result = queries._resolve_raw('booking_revenue', ['date'], {'restaurant': [1]}, 100)
        self.assertEqual(result['source_cuboid'], 'unavailable')
        self.assertEqual(result['rows'], [])
