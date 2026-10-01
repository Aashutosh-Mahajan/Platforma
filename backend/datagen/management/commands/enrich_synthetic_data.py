"""python manage.py enrich_synthetic_data [--seed=42] [--scale=1.0]

Adds the second-pass signals (coordinates, promotions, order status
history, gate scans, search logs) to synthetic data that was generated
before `gen_data` did this itself. Safe to run repeatedly: it only touches
synthetic rows and skips anything already enriched. See
datagen/generators/enrichment.py.
"""
import time

from django.core.management.base import BaseCommand

from datagen.generators.enrichment import enrich_all


class Command(BaseCommand):
    help = 'Enrich existing synthetic data with lifecycles, attendance, promotions and searches.'

    def add_arguments(self, parser):
        parser.add_argument('--seed', type=int, default=42)
        parser.add_argument('--scale', type=float, default=1.0,
                            help='Scales the number of synthetic search-log rows.')

    def handle(self, *args, **options):
        t0 = time.time()
        summary = enrich_all(seed=options['seed'], scale=options['scale'], log=self.stdout.write)
        for key, value in summary.items():
            self.stdout.write(f"    {key}: {value}")
        self.stdout.write(self.style.SUCCESS(f"Enrichment done in {time.time() - t0:.1f}s"))
