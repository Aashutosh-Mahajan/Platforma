"""The demo-data generator, at a tiny scale against a test database."""
import datetime

from django.test import TestCase
from django.utils import timezone

from core.models import User
from datagen.generators.production import Builder, Config
from eventra.models import Booking, Event, Ticket
from zesty.models import Order, OrderStatusHistory, Restaurant


class DemoDataTests(TestCase):
    databases = '__all__'

    def test_small_load_is_consistent_and_never_in_the_future(self):
        owner = User.objects.create_user(username='o', email='demo.owner@demo.platforma.app', password='x-pass-1',
                                         role='restaurant_owner')
        cfg = Config(months=2, customers=80, restaurants=8, orders=400, events=8, bookings=60, searches=120, seed=1)
        summary = Builder(cfg, log=lambda *_: None).run()

        now = timezone.now() + datetime.timedelta(seconds=5)
        self.assertGreaterEqual(Order.objects.count(), 400)
        self.assertFalse(Order.objects.filter(created_at__gt=now).exists())
        self.assertFalse(Booking.objects.filter(booking_date__gt=now).exists())
        self.assertEqual(Restaurant.objects.filter(owner=owner).count(), 4)  # the demo owner gets kitchens
        self.assertTrue(OrderStatusHistory.objects.exists())
        self.assertFalse(User.objects.exclude(email__endswith='@example.com').exclude(pk=owner.pk).exists())
        self.assertFalse(User.objects.filter(email__endswith='@example.com').exclude(password__startswith='!').exists())
        # Cancelled bookings hold no tickets; every ticket belongs to a live booking.
        self.assertFalse(Ticket.objects.filter(booking__status='cancelled').exists())
        self.assertTrue(Event.objects.filter(event_date__gt=timezone.now()).exists())
        # Shows that are over hold completed (or cancelled) bookings, not confirmed ones.
        self.assertFalse(Booking.objects.filter(event__event_date__lt=timezone.now(), status='confirmed').exists())
        self.assertFalse(Event.objects.filter(created_at__gt=now).exists())
        self.assertEqual(summary['orders'], 400)
