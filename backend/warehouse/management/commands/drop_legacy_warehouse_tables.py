"""python manage.py drop_legacy_warehouse_tables [--confirm]

Before the warehouse moved to its own database, its tables (dim_*, fact_*,
cb_*, etl_*, mining_*) lived in the main database. Once the separate
warehouse is set up (`setup_warehouse`), those old copies are dead weight
in the main database. This lists them, and with --confirm drops them.

Refuses to run unless WAREHOUSE_DATABASE_URL is set, so it can never drop
the only copy of the warehouse.
"""
from django.apps import apps
from django.core.management.base import BaseCommand, CommandError
from django.db import connections

from config.db_routers import WAREHOUSE_APPS, is_split


class Command(BaseCommand):
    help = 'Drop the old warehouse/mining tables from the main database (after moving to a separate one).'

    def add_arguments(self, parser):
        parser.add_argument('--confirm', action='store_true', help='Actually drop the tables.')

    def handle(self, *args, **options):
        if not is_split():
            raise CommandError('WAREHOUSE_DATABASE_URL is not set: the main database holds the only warehouse copy.')

        wanted = {
            model._meta.db_table
            for app in WAREHOUSE_APPS
            for model in apps.get_app_config(app).get_models()
        }
        connection = connections['default']
        with connection.cursor() as cursor:
            present = sorted(set(connection.introspection.table_names(cursor)) & wanted)

        if not present:
            self.stdout.write(self.style.SUCCESS('The main database has no leftover warehouse tables.'))
            return

        self.stdout.write(f"{len(present)} warehouse tables in the main database:")
        for table in present:
            self.stdout.write(f"  {table}")
        if not options['confirm']:
            self.stdout.write(self.style.WARNING('Nothing dropped. Re-run with --confirm to drop them.'))
            return

        with connection.cursor() as cursor:
            for table in present:
                cursor.execute(f'DROP TABLE IF EXISTS {connection.ops.quote_name(table)} CASCADE')
        self.stdout.write(self.style.SUCCESS(f"Dropped {len(present)} tables from the main database."))
