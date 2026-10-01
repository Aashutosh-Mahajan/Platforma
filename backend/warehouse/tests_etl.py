"""End-to-end ETL test: operational rows in, warehouse facts out, across the
two databases.

Needs a test-database setup that can build the operational schema. The
project's main-app migrations don't replay from an empty database, so run
this with a settings module that builds that schema from the models
(MIGRATION_MODULES = None for the main apps) — warehouse and mining keep
their real migrations.
"""
import datetime
import io
from decimal import Decimal

from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils import timezone

from core.models import Payment, User
from eventra.models import Booking, Event, Seat, Ticket, TicketType
from warehouse.models import (
    DataQualityCheck, FactBooking, FactOrder, FactOrderItem, FactOrderLifecycle, FactTicketSale,
)
from zesty.models import MenuItem, Order, OrderItem, Promotion, Restaurant

UTC = datetime.timezone.utc


@override_settings(TIME_ZONE='Asia/Kolkata')
class EtlIntegrationTests(TestCase):
    databases = '__all__'

    def setUp(self):
        self.owner = User.objects.create_user(username='o', email='o@t.dev', password='x-pass-1', role='restaurant_owner')
        self.customer = User.objects.create_user(username='c', email='c@t.dev', password='x-pass-1', role='customer')
        organizer = User.objects.create_user(username='g', email='g@t.dev', password='x-pass-1', role='event_organizer')
        self.restaurant = Restaurant.objects.create(owner=self.owner, name='R', cuisine_types='Thai',
                                                    address='1, Bandra, Mumbai', area='Bandra', city='Mumbai',
                                                    delivery_fee=Decimal('20'))
        dish = MenuItem.objects.create(restaurant=self.restaurant, name='Pad Thai', price=Decimal('200'), category='Main')
        Promotion.objects.create(restaurant=self.restaurant, code='TEN', discount_type='percent', discount_value=Decimal('10'))

        # 14:00 UTC = 19:30 in India: the warehouse must file it as evening.
        self.order = Order.objects.create(user=self.customer, restaurant=self.restaurant, status='pending',
                                          subtotal=Decimal('400'), delivery_fee=Decimal('20'), tax=Decimal('19'),
                                          discount=Decimal('40'), promo_code='TEN', total=Decimal('399'),
                                          payment_method='upi')
        OrderItem.objects.create(order=self.order, menu_item=dish, quantity=2, unit_price=Decimal('200'), total=Decimal('400'))
        Order.objects.filter(pk=self.order.pk).update(created_at=datetime.datetime(2026, 5, 1, 14, 0, tzinfo=UTC))
        self.order.refresh_from_db()
        for status in ('confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'):
            self.order.status = status
            self.order.save()  # records OrderStatusHistory

        self.event = Event.objects.create(organizer=organizer, name='Gig', description='d', category='concert',
                                          venue_name='Hall', address='Hall Rd',
                                          event_date=timezone.now() - datetime.timedelta(days=2), total_seats=2)
        tier = TicketType.objects.create(event=self.event, name='General', price=Decimal('500'),
                                         quantity_total=2, quantity_available=0)
        self.booking = Booking.objects.create(user=self.customer, event=self.event, status='confirmed',
                                              total_tickets=1, subtotal=Decimal('500'), total=Decimal('500'))
        Booking.objects.filter(pk=self.booking.pk).update(booking_date=timezone.now() - datetime.timedelta(days=20))
        seat = Seat.objects.create(event=self.event, section='A', row='1', seat_number='1', ticket_type=tier, status='booked')
        Ticket.objects.create(booking=self.booking, seat=seat)
        # A second booking at the same event that did turn up: scanning was in use there.
        other = Booking.objects.create(user=self.customer, event=self.event, status='confirmed', total_tickets=1,
                                       subtotal=Decimal('500'), total=Decimal('500'))
        Booking.objects.filter(pk=other.pk).update(booking_date=timezone.now() - datetime.timedelta(days=20))
        seat2 = Seat.objects.create(event=self.event, section='A', row='1', seat_number='2', ticket_type=tier, status='booked')
        Ticket.objects.create(booking=other, seat=seat2, is_scanned=True)
        Payment.objects.create(user=self.customer, amount=Decimal('500'), method='wallet', status='refunded',
                               content_type='booking', object_id=self.booking.id)

    def etl(self, *args):
        call_command('run_etl', *args, stdout=io.StringIO())

    def test_orders_land_with_local_time_discount_promo_and_lifecycle(self):
        self.etl()
        fact = FactOrder.objects.select_related('time', 'date', 'promotion').get(order_id=self.order.id)
        self.assertEqual(fact.time.hour, 19)
        self.assertEqual(fact.time.day_part, 'evening')
        self.assertEqual(fact.date.full_date, datetime.date(2026, 5, 1))
        self.assertEqual(fact.discount_total, Decimal('40.00'))
        self.assertEqual(fact.promotion.campaign_name, 'TEN')
        self.assertEqual(FactOrderItem.objects.get(order_id=self.order.id).net_amount, Decimal('360.00'))
        lifecycle = FactOrderLifecycle.objects.get(order_id=self.order.id)
        self.assertEqual(lifecycle.current_status, 'delivered')
        self.assertTrue(lifecycle.is_complete)
        self.assertIsNotNone(lifecycle.delivered_at)
        self.assertIsNotNone(fact.delivery_minutes)

    def test_no_shows_and_booking_payment(self):
        self.etl()
        self.assertTrue(FactBooking.objects.get(booking_id=self.booking.id).is_no_show)
        self.assertEqual(FactTicketSale.objects.filter(is_no_show=True).count(), 1)
        self.assertEqual(FactBooking.objects.select_related('payment').get(booking_id=self.booking.id).payment.method, 'wallet')

    def test_rerun_is_idempotent_and_quality_passes(self):
        self.etl()
        self.etl()
        self.etl('--full-refresh')
        self.assertEqual(FactOrder.objects.count(), 1)
        self.assertEqual(FactBooking.objects.count(), 2)
        latest = DataQualityCheck.objects.order_by('-checked_at').first().run_id
        failing = DataQualityCheck.objects.filter(run_id=latest, status='fail')
        self.assertFalse(failing.exists(), list(failing.values_list('check_name', 'message')))

    def test_late_cancellation_of_an_old_booking_is_picked_up(self):
        self.etl()
        self.booking.refresh_from_db()  # pick up the back-dated booking_date before saving
        self.booking.status = 'cancelled'
        self.booking.save()  # records BookingStatusHistory; booking_date stays 20 days old
        self.etl()
        self.assertTrue(FactBooking.objects.get(booking_id=self.booking.id).is_cancelled)

    def test_new_order_without_history_still_gets_a_lifecycle_row(self):
        fresh = Order.objects.create(user=self.customer, restaurant=self.restaurant, status='pending',
                                     subtotal=Decimal('200'), total=Decimal('230'), payment_method='upi')
        self.etl()
        row = FactOrderLifecycle.objects.get(order_id=fresh.id)
        self.assertEqual(row.current_status, 'pending')
        self.assertFalse(row.is_complete)
