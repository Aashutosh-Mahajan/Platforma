"""python manage.py load_demo_data [--months 6] [--orders 30000] ...

Loads a production-like demo dataset (see datagen/generators/production.py):
real Mumbai restaurants and venues, months of orders, bookings, reviews,
promotions, payouts, searches and gate scans. Additive: run it on an empty
database (or after clearing the old data) so totals stay believable.

The demo owner / organizer / customer accounts, if they exist, are given
their own restaurants, events and history so their dashboards are full.
"""
import time

from django.core.management.base import BaseCommand
from django.db import transaction

from datagen.generators.production import Builder, Config


class Command(BaseCommand):
    help = 'Load a production-like demo dataset.'

    def add_arguments(self, parser):
        defaults = Config()
        for name in ('months', 'customers', 'restaurants', 'orders', 'events', 'bookings', 'searches', 'seed'):
            parser.add_argument(f'--{name}', type=int, default=getattr(defaults, name))

    def handle(self, *args, **options):
        cfg = Config(**{k: options[k] for k in ('months', 'customers', 'restaurants', 'orders', 'events',
                                                'bookings', 'searches', 'seed')})
        t0 = time.time()
        # One transaction: a failure part-way leaves the database as it was,
        # never half-loaded.
        with transaction.atomic(using='default'):
            summary = Builder(cfg, log=self.stdout.write).run()
        for key, value in summary.items():
            self.stdout.write(f"  {key}: {value}")
        self.stdout.write(self.style.SUCCESS(f"Demo data loaded in {time.time() - t0:.0f}s"))
