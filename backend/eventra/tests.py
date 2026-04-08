from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import Notification
from eventra.models import Event, TicketType, Seat


User = get_user_model()


class EventraDynamicSyncTests(APITestCase):
    def setUp(self):
        self.organizer = User.objects.create_user(
            email='organizer@test.com',
            username='organizer',
            password='OrganizerPass123!',
            first_name='Event',
            last_name='Organizer',
            role='event_organizer',
        )
        self.customer = User.objects.create_user(
            email='customer@test.com',
            username='customer',
            password='CustomerPass123!',
            first_name='Customer',
            last_name='User',
            role='customer',
        )
        self.customer_two = User.objects.create_user(
            email='customer2@test.com',
            username='customer2',
            password='CustomerPass123!',
            first_name='Customer',
            last_name='Two',
            role='customer',
        )

    def test_new_organizer_event_is_visible_to_customer(self):
        """Organizer-created events should become visible in customer event listings."""
        self.client.force_authenticate(self.organizer)

        now = timezone.now() + timedelta(days=5)
        payload = {
            'name': 'Dynamic Organizer Event',
            'description': 'Live event created by organizer',
            'category': 'concert',
            'venue_name': 'City Arena',
            'address': 'Main Street',
            'event_date': now.isoformat(),
            'event_end_date': (now + timedelta(hours=3)).isoformat(),
        }

        create_response = self.client.post('/api/v1/eventra/events/', payload, format='json')
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(create_response.data['is_published'])

        created_event_id = create_response.data['id']

        self.client.force_authenticate(self.customer)
        list_response = self.client.get('/api/v1/eventra/events/')
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)

        event_ids = [event['id'] for event in list_response.data['results']]
        self.assertIn(created_event_id, event_ids)

    def test_customer_booking_is_visible_to_organizer_dashboard_feed(self):
        """Customer bookings should appear in organizer booking list and trigger a notification."""
        event_date = timezone.now() + timedelta(days=10)
        event = Event.objects.create(
            organizer=self.organizer,
            name='Organizer Managed Event',
            description='Event to validate organizer booking visibility',
            category='concert',
            venue_name='Arena Hall',
            address='Venue Road',
            event_date=event_date,
            event_end_date=event_date + timedelta(hours=2),
            is_published=True,
            is_cancelled=False,
            total_seats=5,
            available_seats=5,
        )

        ticket_type = TicketType.objects.create(
            event=event,
            name='General',
            price=Decimal('499.00'),
            quantity_total=5,
            quantity_available=5,
            description='General pass',
            benefits='Standard entry',
        )

        seats = []
        for idx in range(1, 6):
            seats.append(
                Seat(
                    event=event,
                    section='A',
                    row='R1',
                    seat_number=str(idx),
                    ticket_type=ticket_type,
                    status='available',
                )
            )
        Seat.objects.bulk_create(seats)

        seat_ids = list(Seat.objects.filter(event=event).order_by('id').values_list('id', flat=True)[:2])

        self.client.force_authenticate(self.customer)
        booking_payload = {
            'event_id': event.id,
            'payment_method': 'credit_card',
            'tickets': [
                {
                    'ticket_type_id': ticket_type.id,
                    'quantity': 2,
                    'seats': seat_ids,
                }
            ],
        }

        booking_response = self.client.post('/api/v1/eventra/bookings/', booking_payload, format='json')
        self.assertEqual(booking_response.status_code, status.HTTP_201_CREATED)
        booking_id = booking_response.data['id']

        self.client.force_authenticate(self.organizer)
        organizer_booking_response = self.client.get('/api/v1/eventra/bookings/')
        self.assertEqual(organizer_booking_response.status_code, status.HTTP_200_OK)

        organizer_booking_ids = [booking['id'] for booking in organizer_booking_response.data['results']]
        self.assertIn(booking_id, organizer_booking_ids)

        self.assertTrue(
            Notification.objects.filter(
                user=self.organizer,
                related_id=booking_id,
                related_type='booking',
                title='New Booking Received',
            ).exists()
        )

    def test_published_event_is_visible_to_all_customers(self):
        """Published events should be visible to every customer account."""
        event_date = timezone.now() + timedelta(days=7)
        event = Event.objects.create(
            organizer=self.organizer,
            name='Shared Visibility Event',
            description='Visible to all customers',
            category='concert',
            venue_name='Public Venue',
            address='Shared Street',
            event_date=event_date,
            event_end_date=event_date + timedelta(hours=2),
            is_published=True,
            is_cancelled=False,
        )

        self.client.force_authenticate(self.customer)
        first_response = self.client.get('/api/v1/eventra/events/')
        self.assertEqual(first_response.status_code, status.HTTP_200_OK)
        first_ids = [listed_event['id'] for listed_event in first_response.data['results']]
        self.assertIn(event.id, first_ids)

        self.client.force_authenticate(self.customer_two)
        second_response = self.client.get('/api/v1/eventra/events/')
        self.assertEqual(second_response.status_code, status.HTTP_200_OK)
        second_ids = [listed_event['id'] for listed_event in second_response.data['results']]
        self.assertIn(event.id, second_ids)

    def test_organizer_only_filter_keeps_dashboard_scope(self):
        """Organizer-only query parameter should include drafts and exclude other organizers."""
        other_organizer = User.objects.create_user(
            email='other.organizer@test.com',
            username='other-organizer',
            password='OrganizerPass123!',
            first_name='Other',
            last_name='Organizer',
            role='event_organizer',
        )

        now = timezone.now() + timedelta(days=12)
        own_published = Event.objects.create(
            organizer=self.organizer,
            name='Own Published Event',
            description='Published and public',
            category='concert',
            venue_name='Organizer Venue',
            address='Organizer Street',
            event_date=now,
            event_end_date=now + timedelta(hours=2),
            is_published=True,
            is_cancelled=False,
        )
        own_draft = Event.objects.create(
            organizer=self.organizer,
            name='Own Draft Event',
            description='Draft for organizer dashboard',
            category='concert',
            venue_name='Organizer Venue',
            address='Organizer Street',
            event_date=now + timedelta(days=1),
            event_end_date=now + timedelta(days=1, hours=2),
            is_published=False,
            is_cancelled=False,
        )
        other_published = Event.objects.create(
            organizer=other_organizer,
            name='Other Organizer Published Event',
            description='Should be excluded from organizer scope',
            category='sports',
            venue_name='Other Venue',
            address='Other Street',
            event_date=now + timedelta(days=2),
            event_end_date=now + timedelta(days=2, hours=2),
            is_published=True,
            is_cancelled=False,
        )

        self.client.force_authenticate(self.organizer)

        public_response = self.client.get('/api/v1/eventra/events/')
        self.assertEqual(public_response.status_code, status.HTTP_200_OK)
        public_ids = [listed_event['id'] for listed_event in public_response.data['results']]
        self.assertIn(own_published.id, public_ids)
        self.assertIn(other_published.id, public_ids)
        self.assertNotIn(own_draft.id, public_ids)

        organizer_response = self.client.get('/api/v1/eventra/events/?organizer_only=true')
        self.assertEqual(organizer_response.status_code, status.HTTP_200_OK)
        organizer_ids = [listed_event['id'] for listed_event in organizer_response.data['results']]
        self.assertIn(own_published.id, organizer_ids)
        self.assertIn(own_draft.id, organizer_ids)
        self.assertNotIn(other_published.id, organizer_ids)
