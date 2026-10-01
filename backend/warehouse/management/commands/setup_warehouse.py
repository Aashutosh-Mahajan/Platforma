"""python manage.py setup_warehouse [--skip-etl] [--skip-mining]

One-shot setup for the warehouse database (WAREHOUSE_DATABASE_URL):

  1. migrate the warehouse + mining apps into it
  2. build the calendar dimensions
  3. run the first full ETL from the operational database
  4. run every mining module

Safe to re-run: migrations are idempotent, the ETL is incremental after
its first run, and mining just produces a fresh run.
"""
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError

from config.db_routers import is_split, warehouse_db


class Command(BaseCommand):
    help = 'Create and fill the warehouse database (migrate, ETL, mining).'

    def add_arguments(self, parser):
        parser.add_argument('--skip-etl', action='store_true')
        parser.add_argument('--skip-mining', action='store_true')

    def handle(self, *args, **options):
        if not is_split():
            raise CommandError(
                'WAREHOUSE_DATABASE_URL is not set, so the warehouse would share the main database. '
                'Add the warehouse database URL to .env first.'
            )
        db = warehouse_db()

        self.stdout.write(self.style.NOTICE(f'1/4 Migrating warehouse + mining into "{db}"...'))
        call_command('migrate', database=db, verbosity=1)

        self.stdout.write(self.style.NOTICE('2/4 Calendar dimensions...'))
        call_command('init_calendar_dims')

        if options['skip_etl']:
            self.stdout.write('3/4 ETL skipped.')
        else:
            self.stdout.write(self.style.NOTICE('3/4 First ETL run (full extract)...'))
            call_command('run_etl')

        if options['skip_mining']:
            self.stdout.write('4/4 Mining skipped.')
        else:
            self.stdout.write(self.style.NOTICE('4/4 Mining...'))
            call_command('run_mining', module='all')

        self.stdout.write(self.style.SUCCESS('Warehouse ready.'))
