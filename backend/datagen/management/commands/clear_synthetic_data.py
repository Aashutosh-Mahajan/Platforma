"""python manage.py clear_synthetic_data [--run-tag=s42n12345] [--yes]

Removes datagen-generated rows. Every synthetic user (customer, restaurant
owner, event organizer) has an @synthetic.platforma.dev email, which is
the single reliable marker used here to scope every delete — real user
data is never touched because it never has that domain.

Deletes in dependency order (leaf tables before the rows they PROTECT)
since several FKs in this schema use on_delete=PROTECT rather than
CASCADE (Order.restaurant, OrderItem.menu_item, Seat.ticket_type,
BookingSeat.seat, Ticket.seat, Event.venue).
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from core.models import User, Address, Payment
from zesty.models import Restaurant, MenuItem, Order, OrderItem
from eventra.models import (
    Venue, Event, TicketType, Seat, Booking, BookingSeat, Ticket, TicketScanAttempt
)
from datagen.models import GenerationRun, PlantedAnomaly

SYNTHETIC_DOMAIN = '@synthetic.platforma.dev'


class Command(BaseCommand):
    help = 'Delete all datagen-generated synthetic data.'

    def add_arguments(self, parser):
        parser.add_argument('--run-tag', type=str, default=None,
                             help='Only clear rows from one run (matches emails containing ".<tag>@").')
        parser.add_argument('--yes', action='store_true', help='Skip the confirmation prompt.')

    @transaction.atomic
    def handle(self, *args, **options):
        run_tag = options['run_tag']
        if run_tag:
            users = User.objects.filter(email__iendswith=SYNTHETIC_DOMAIN, email__icontains=f".{run_tag}")
        else:
            users = User.objects.filter(email__iendswith=SYNTHETIC_DOMAIN)

        user_ids = list(users.values_list('id', flat=True))
        if not user_ids:
            self.stdout.write("Nothing to clear.")
            return

        if not options['yes']:
            confirm = input(f"About to delete all synthetic data for {len(user_ids)} users. Type 'yes' to continue: ")
            if confirm.strip().lower() != 'yes':
                self.stdout.write("Aborted.")
                return

        restaurants = Restaurant.objects.filter(owner_id__in=user_ids)
        events = Event.objects.filter(organizer_id__in=user_ids)
        venue_ids = list(Venue.objects.filter(events__in=events).distinct().values_list('id', flat=True))

        TicketScanAttempt.objects.filter(ticket__booking__user_id__in=user_ids).delete()
        Ticket.objects.filter(booking__user_id__in=user_ids).delete()
        BookingSeat.objects.filter(booking__user_id__in=user_ids).delete()
        Payment.objects.filter(user_id__in=user_ids).delete()
        Booking.objects.filter(user_id__in=user_ids).delete()

        Seat.objects.filter(event__in=events).delete()
        TicketType.objects.filter(event__in=events).delete()
        n_events = events.count()
        events.delete()
        Venue.objects.filter(id__in=venue_ids).delete()

        OrderItem.objects.filter(order__user_id__in=user_ids).delete()
        n_orders = Order.objects.filter(user_id__in=user_ids).count()
        Order.objects.filter(user_id__in=user_ids).delete()

        MenuItem.objects.filter(restaurant__in=restaurants).delete()
        n_restaurants = restaurants.count()
        restaurants.delete()

        Address.objects.filter(user_id__in=user_ids).delete()

        anomaly_qs = PlantedAnomaly.objects.all()
        if run_tag:
            anomaly_qs = anomaly_qs.filter(run__summary__run_tag=run_tag)
        n_anomalies = anomaly_qs.count()
        anomaly_qs.delete()

        run_qs = GenerationRun.objects.all()
        if run_tag:
            run_qs = run_qs.filter(summary__run_tag=run_tag)
        run_qs.delete()

        n_users = users.count()
        users.delete()

        self.stdout.write(self.style.SUCCESS(
            f"Cleared: {n_users} users, {n_restaurants} restaurants, {n_orders} orders, "
            f"{n_events} events, {n_anomalies} anomalies."
        ))
