"""python manage.py run_mining [--module=<name>|all]

Runs the mining modules (PRD §8.4) against the warehouse database. Order
matters only loosely — every module reads the warehouse, not each other's
output — but it's kept stable so nightly logs read the same way every day.
A failing module is reported and the rest still run.
"""
import importlib
import time

from django.core.management.base import BaseCommand

MODULES = {
    'basket': 'mining.modules.basket.run_basket_mining',
    'segments': 'mining.modules.segments.run_segmentation',
    'customers': 'mining.modules.customers.run_customer_scores',
    'anomaly': 'mining.modules.anomaly.run_anomaly_detection',
    'risk': 'mining.modules.risk.run_risk_scoring',
    'forecast': 'mining.modules.forecast.run_forecast',
    'sellout': 'mining.modules.forecast.run_sellout_forecast',
    'recommend': 'mining.modules.recommend.run_recommendations',
    'sequences': 'mining.modules.sequences.run_sequence_mining',
    'delivery': 'mining.modules.delivery.run_delivery_model',
    'hotspots': 'mining.modules.hotspots.run_hotspots',
    'search': 'mining.modules.search.run_search_mining',
    'promos': 'mining.modules.promos.run_promo_effects',
    'pricing': 'mining.modules.pricing.run_price_elasticity',
}


class Command(BaseCommand):
    help = 'Run one or all mining modules.'

    def add_arguments(self, parser):
        parser.add_argument('--module', type=str, choices=list(MODULES.keys()) + ['all'], default='all')

    def handle(self, *args, **options):
        module = options['module']
        targets = list(MODULES.keys()) if module == 'all' else [module]
        failures = 0

        for name in targets:
            mod_path, func_name = MODULES[name].rsplit('.', 1)
            fn = getattr(importlib.import_module(mod_path), func_name)

            self.stdout.write(f"Running {name}...")
            t0 = time.time()
            try:
                run = fn()
            except Exception as exc:
                failures += 1
                self.stdout.write(self.style.ERROR(f"  {name} FAILED: {exc}"))
                continue

            style = self.style.WARNING if run.metrics.get('skipped') else self.style.SUCCESS
            self.stdout.write(style(f"  {name} ({time.time() - t0:.1f}s): {run.metrics}"))

        if failures:
            self.stdout.write(self.style.ERROR(f"{failures} module(s) failed."))
