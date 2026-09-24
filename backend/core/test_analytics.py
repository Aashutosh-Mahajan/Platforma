"""Tests for the business analytics API (core/analytics.py)."""
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from eventra.models import Booking, Event
from zesty.models import MenuItem, Order, OrderItem, Restaurant

User = get_user_model()


class AnalyticsTestBase(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.admin = User.objects.create_user(email='a@test.com', username='a', password='x', role='admin')
        self.owner = User.objects.create_user(email='o@test.com', username='o', password='x', role='restaurant_owner')
        self.other_owner = User.objects.create_user(email='o2@test.com', username='o2', password='x', role='restaurant_owner')
        self.organizer = User.objects.create_user(email='e@test.com', username='e', password='x', role='event_organizer')
        self.customer = User.objects.create_user(email='c@test.com', username='c', password='x', role='customer')

        self.restaurant = Restaurant.objects.create(
            owner=self.owner, name='Spice', cuisine_types='Indian', address='1 Road', city='Pune',
            commission_rate=Decimal('10'),
        )
        self.dish = MenuItem.objects.create(restaurant=self.restaurant, name='Dal', price=Decimal('100'), category='Mains')
        self.unsold = MenuItem.objects.create(restaurant=self.restaurant, name='Kheer', price=Decimal('50'), category='Desserts')
        for status in ('delivered', 'delivered', 'cancelled'):
            order = Order.objects.create(
                user=self.customer, restaurant=self.restaurant, status=status,
                subtotal=Decimal('200'), total=Decimal('220'), payment_method='card',
            )
            OrderItem.objects.create(order=order, menu_item=self.dish, quantity=2, unit_price=Decimal('100'), total=Decimal('200'))

        self.event = Event.objects.create(
            organizer=self.organizer, name='Gig', category='concert', venue_name='Hall', address='2 Road',
            event_date=timezone.now() + timedelta(days=10), total_seats=100, available_seats=90,
            is_published=True, is_approved=True,
        )
        Booking.objects.create(user=self.customer, event=self.event, status='confirmed', total_tickets=2,
                               subtotal=Decimal('900'), tax=Decimal('100'), total=Decimal('1000'))


class PlatformAnalyticsTests(AnalyticsTestBase):
    def test_admin_gets_combined_kpis(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get('/api/v1/analytics/platform?range=30d')
        self.assertEqual(res.status_code, 200)
        kpis = res.data['kpis']
        self.assertEqual(kpis['zesty_gmv']['value'], 440.0)   # cancelled order excluded
        self.assertEqual(kpis['eventra_gmv']['value'], 1000.0)
        self.assertEqual(kpis['gmv']['value'], 1440.0)
        self.assertEqual(kpis['commission']['value'], 40.0)   # 10% of two 200 subtotals
        self.assertEqual(kpis['transactions']['value'], 3)
        self.assertEqual(kpis['cross_vertical_rate']['value'], 100.0)
        self.assertEqual(kpis['cancellation_rate']['value'], 25.0)  # 1 of 4
        self.assertEqual(kpis['gmv']['previous'], 0.0)
        self.assertEqual(len(res.data['heatmap']), 7)

    def test_all_time_has_no_comparison(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get('/api/v1/analytics/platform?range=all')
        self.assertIsNone(res.data['kpis']['gmv']['previous'])

    def test_non_admins_are_rejected(self):
        for user in (self.owner, self.organizer, self.customer):
            self.client.force_authenticate(user)
            for path in ('platform', 'zesty', 'eventra'):
                self.assertEqual(self.client.get(f'/api/v1/analytics/{path}').status_code, 403)


class ZestyAnalyticsTests(AnalyticsTestBase):
    def test_admin_zesty_report(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get('/api/v1/analytics/zesty?range=30d')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['kpis']['orders']['value'], 2)
        self.assertEqual(res.data['kpis']['completion_rate']['value'], 66.7)
        self.assertEqual(res.data['top_dishes'][0]['name'], 'Dal')
        self.assertEqual(res.data['payment_methods'][0]['label'], 'card')

    def test_owner_sees_own_restaurant_with_unsold_dishes(self):
        self.client.force_authenticate(self.owner)
        res = self.client.get(f'/api/v1/analytics/restaurants/{self.restaurant.id}?range=30d')
        self.assertEqual(res.status_code, 200)
        self.assertEqual([m['name'] for m in res.data['menu']['unsold']], ['Kheer'])
        self.assertEqual(res.data['customer_mix']['new_orders'], 1)
        self.assertEqual(res.data['customer_mix']['returning_orders'], 1)

    def test_owner_cannot_see_someone_elses_restaurant(self):
        self.client.force_authenticate(self.other_owner)
        res = self.client.get(f'/api/v1/analytics/restaurants/{self.restaurant.id}')
        self.assertEqual(res.status_code, 403)


class EventraAnalyticsTests(AnalyticsTestBase):
    def test_organizer_report_is_scoped_to_their_events(self):
        other = User.objects.create_user(email='e2@test.com', username='e2', password='x', role='event_organizer')
        Event.objects.create(
            organizer=other, name='Not mine', category='sports', venue_name='X', address='Y',
            event_date=timezone.now() + timedelta(days=5),
        )
        self.client.force_authenticate(self.organizer)
        res = self.client.get('/api/v1/analytics/organizer?range=30d')
        self.assertEqual(res.status_code, 200)
        self.assertEqual([e['name'] for e in res.data['events']], ['Gig'])
        self.assertEqual(res.data['kpis']['revenue']['value'], 1000.0)
        self.assertEqual(res.data['kpis']['sell_through']['value'], 10.0)
        self.assertIsNone(res.data['kpis']['sell_through']['previous'])  # snapshot metric
        self.assertEqual(res.data['events'][0]['status'], 'on_sale')

    def test_customer_cannot_use_organizer_report(self):
        self.client.force_authenticate(self.customer)
        self.assertEqual(self.client.get('/api/v1/analytics/organizer').status_code, 403)

    def test_empty_ratios_are_null_not_zero(self):
        Booking.objects.all().delete()
        self.client.force_authenticate(self.organizer)
        res = self.client.get('/api/v1/analytics/organizer?range=7d')
        self.assertIsNone(res.data['kpis']['avg_booking_value']['value'])
        self.assertIsNone(res.data['kpis']['cancellation_rate']['value'])
