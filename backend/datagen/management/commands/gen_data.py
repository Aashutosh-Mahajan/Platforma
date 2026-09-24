"""python manage.py gen_data --seed=42 [--scale=1.0] [--months=18]

Generates a reproducible synthetic dataset per PRD §10. Volumes below are
the PRD's stated 18-month targets at scale=1.0; --scale linearly scales
every volume (e.g. --scale=0.02 for a fast smoke test).

This is additive — it never deletes or modifies real data, only inserts
new synthetic rows tagged with a `run_tag` embedded in every synthetic
user's email/username so a run's output can always be identified and,
if ever needed, cleanly removed.
"""
import datetime
import time

from django.core.management.base import BaseCommand
from django.utils import timezone

from datagen.models import GenerationRun
from datagen.generators.common import rng
from datagen.generators.customers import generate_customers
from datagen.generators.catalog import generate_catalog
from datagen.generators.orders import generate_orders
from datagen.generators.events import generate_venues, generate_events, generate_ticket_types_and_seats
from datagen.generators.bookings import generate_bookings
from datagen.generators.anomalies import inject_anomalies

# PRD §10 full-scale (scale=1.0) target volumes.
BASE_VOLUMES = {
    'customers': 12_000,
    'restaurants': 450,
    'items_per_restaurant': 20,  # -> ~9,000 total menu items
    'orders': 50_000,
    'venues': 120,
    'events': 900,
    'bookings': 20_000,
}


class Command(BaseCommand):
    help = 'Generate a reproducible synthetic dataset (PRD §10).'

    def add_arguments(self, parser):
        parser.add_argument('--seed', type=int, default=42)
        parser.add_argument('--scale', type=float, default=1.0,
                             help='Fraction of PRD §10 full-scale volumes (e.g. 0.02 for a smoke test).')
        parser.add_argument('--months', type=int, default=18)

    def handle(self, *args, **options):
        seed = options['seed']
        scale = options['scale']
        months = options['months']
        run_tag = f"s{seed}n{int(time.time()) % 100000}"

        volumes = {k: max(1, int(v * scale)) for k, v in BASE_VOLUMES.items()}
        # items_per_restaurant shouldn't collapse to near-zero at small scale.
        volumes['items_per_restaurant'] = max(4, int(BASE_VOLUMES['items_per_restaurant'] * max(scale, 0.3)))

        end = timezone.now().date()
        start = end - datetime.timedelta(days=30 * months)

        np_rng = rng(seed)
        run = GenerationRun.objects.create(seed=seed, scale=scale, months=months)

        self.stdout.write(self.style.NOTICE(
            f"gen_data: seed={seed} scale={scale} months={months} run_tag={run_tag}"
        ))
        self.stdout.write(f"Target volumes: {volumes}")

        t0 = time.time()
        self.stdout.write("1/6 customers...")
        customers = generate_customers(volumes['customers'], start, end, np_rng, run_tag)
        self.stdout.write(f"    {len(customers)} customers ({time.time() - t0:.1f}s)")

        t1 = time.time()
        self.stdout.write("2/6 restaurants + menu items...")
        restaurants = generate_catalog(volumes['restaurants'], volumes['items_per_restaurant'], np_rng, run_tag)
        self.stdout.write(f"    {len(restaurants)} restaurants ({time.time() - t1:.1f}s)")

        t2 = time.time()
        self.stdout.write("3/6 orders + order items...")
        n_orders = generate_orders(volumes['orders'], restaurants, customers, np_rng, start, end)
        self.stdout.write(f"    {n_orders} orders ({time.time() - t2:.1f}s)")

        t3 = time.time()
        self.stdout.write("4/6 venues + events + seats...")
        venues = generate_venues(volumes['venues'], np_rng, run_tag)
        events = generate_events(volumes['events'], venues, np_rng, start, end, run_tag)
        generate_ticket_types_and_seats(events, np_rng)
        self.stdout.write(f"    {len(venues)} venues, {len(events)} events ({time.time() - t3:.1f}s)")

        t4 = time.time()
        self.stdout.write("5/6 bookings + tickets...")
        n_bookings = generate_bookings(volumes['bookings'], events, customers, np_rng, run_tag)
        self.stdout.write(f"    {n_bookings} bookings ({time.time() - t4:.1f}s)")

        t5 = time.time()
        self.stdout.write("6/6 anomalies...")
        n_anomalies = inject_anomalies(run, run_tag, np_rng)
        self.stdout.write(f"    {n_anomalies} anomalies injected ({time.time() - t5:.1f}s)")

        run.finished_at = timezone.now()
        run.summary = {
            'run_tag': run_tag,
            'customers': len(customers),
            'restaurants': len(restaurants),
            'orders': n_orders,
            'venues': len(venues),
            'events': len(events),
            'bookings': n_bookings,
            'anomalies': n_anomalies,
            'total_seconds': round(time.time() - t0, 1),
        }
        run.save(update_fields=['finished_at', 'summary'])

        self.stdout.write(self.style.SUCCESS(
            f"Done in {time.time() - t0:.1f}s. run_tag={run_tag}, GenerationRun#{run.id}"
        ))
