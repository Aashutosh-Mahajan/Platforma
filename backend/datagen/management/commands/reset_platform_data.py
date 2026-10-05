"""python manage.py reset_platform_data --yes [--reload]

Wipes every row of platform data so a fresh Mumbai dataset can be loaded:

  operational database   restaurants, menus, orders, carts, promotions,
                         payouts, venues, events, seats, bookings, tickets,
                         reviews, payments, addresses, notifications, search
                         and audit logs, datagen bookkeeping; and every user
                         account except the admins and the demo.* accounts
                         (so you can still sign in afterwards)
  warehouse database     every fact, dimension (except the static calendar:
                         dim_date, dim_time), cuboid, ETL audit and quality
                         row, and every mining output

With --reload it then loads the Mumbai demo dataset, runs a full ETL and
every mining module, i.e. the whole pipeline from an empty platform.

There is no undo. Take a database backup (or a Neon branch) first if the
current data matters.
"""
from django.apps import apps
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.db import connections, transaction
from django.db.models import Q

from config.db_routers import warehouse_db

OPERATIONAL_APPS = ('zesty', 'eventra', 'datagen')
CORE_KEEP = {'User'}  # core models whose rows survive (only the kept accounts do)
WAREHOUSE_APPS = ('warehouse', 'mining')
WAREHOUSE_KEEP = {'dim_date', 'dim_time'}
DEMO_DOMAIN = '@demo.platforma.app'


def _tables(app_labels, skip_models=(), skip_tables=()):
    out = []
    for label in app_labels:
        for model in apps.get_app_config(label).get_models():
            if model._meta.proxy or not model._meta.managed:
                continue
            if model.__name__ in skip_models or model._meta.db_table in skip_tables:
                continue
            out.append(model._meta.db_table)
    return sorted(set(out))


def _truncate(alias, tables):
    if not tables:
        return
    with connections[alias].cursor() as cursor:
        quoted = ', '.join(f'"{t}"' for t in tables)
        cursor.execute(f'TRUNCATE TABLE {quoted} RESTART IDENTITY CASCADE')


class Command(BaseCommand):
    help = 'Delete all platform data (keeping admin and demo accounts), optionally reload the Mumbai dataset.'

    def add_arguments(self, parser):
        parser.add_argument('--yes', action='store_true', help='Confirm: this cannot be undone.')
        parser.add_argument('--reload', action='store_true',
                            help='Then run load_demo_data, run_etl --full-refresh and run_mining.')

    def handle(self, *args, **options):
        if not options['yes']:
            raise CommandError('This deletes all platform data. Re-run with --yes to confirm.')
        from core.models import User

        keep = User.objects.filter(
            Q(role='admin') | Q(is_superuser=True) | Q(is_staff=True) | Q(email__iendswith=DEMO_DOMAIN))
        keep_ids = list(keep.values_list('id', flat=True))
        self.stdout.write(f"Keeping {len(keep_ids)} accounts: {', '.join(keep.values_list('email', flat=True))}")

        op_tables = _tables(OPERATIONAL_APPS) + _tables(('core',), skip_models=CORE_KEEP)
        wh_alias = warehouse_db()
        wh_tables = _tables(WAREHOUSE_APPS, skip_tables=WAREHOUSE_KEEP)

        with transaction.atomic(using='default'):
            self.stdout.write(f"Truncating {len(op_tables)} operational tables...")
            _truncate('default', op_tables)
            removed, _ = User.objects.exclude(id__in=keep_ids).delete()
            self.stdout.write(f"  removed {removed} user-linked rows")
        with transaction.atomic(using=wh_alias):
            self.stdout.write(f"Truncating {len(wh_tables)} warehouse tables on '{wh_alias}'...")
            _truncate(wh_alias, wh_tables)
        self.stdout.write(self.style.SUCCESS('All platform data removed.'))

        if options['reload']:
            self.stdout.write('Loading the Mumbai demo dataset...')
            call_command('load_demo_data')
            self.stdout.write('Running the warehouse ETL...')
            call_command('run_etl', full_refresh=True)
            self.stdout.write('Running every mining module...')
            call_command('run_mining', module='all')
            self.stdout.write(self.style.SUCCESS('Mumbai dataset loaded, warehoused and mined.'))
