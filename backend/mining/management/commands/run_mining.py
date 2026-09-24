"""python manage.py run_mining [--module=basket|segments]

Runs the mining modules built so far (PRD §8.4 Mining set A — basket,
segments). Modules not yet implemented (cross_domain, risk, forecast,
anomaly, sequence — Mining set B, M9) will be added the same way: one file
in mining/modules/, wired in here as another --module choice.
"""
from django.core.management.base import BaseCommand, CommandError

MODULES = {
    'basket': 'mining.modules.basket.run_basket_mining',
    'segments': 'mining.modules.segments.run_segmentation',
}


class Command(BaseCommand):
    help = 'Run one or all mining modules.'

    def add_arguments(self, parser):
        parser.add_argument('--module', type=str, choices=list(MODULES.keys()) + ['all'], default='all')

    def handle(self, *args, **options):
        module = options['module']
        targets = list(MODULES.keys()) if module == 'all' else [module]

        for name in targets:
            path = MODULES[name]
            mod_path, func_name = path.rsplit('.', 1)
            import importlib
            fn = getattr(importlib.import_module(mod_path), func_name)

            self.stdout.write(f"Running {name}...")
            try:
                run = fn()
            except Exception as exc:
                self.stdout.write(self.style.ERROR(f"  {name} FAILED: {exc}"))
                continue

            self.stdout.write(self.style.SUCCESS(f"  {name}: {run.metrics}"))
