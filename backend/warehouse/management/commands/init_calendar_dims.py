"""python manage.py init_calendar_dims [--start=2023-01-01] [--end=2028-12-31]

Bulk-generates dim_date and dim_time once (PRD §12: "generated once at
warehouse init"). run_etl's loaders also lazily get_or_create any date/time
combination missing from this range, so this command is an optimization
(bulk-insert up front) rather than a hard prerequisite for run_etl to work.
"""
import datetime
from django.core.management.base import BaseCommand

from warehouse.models import DimDate, DimTime
from warehouse.etl import transform as tf


class Command(BaseCommand):
    help = 'Bulk-generate dim_date and dim_time once.'

    def add_arguments(self, parser):
        parser.add_argument('--start', type=str, default='2023-01-01')
        parser.add_argument('--end', type=str, default='2028-12-31')

    def handle(self, *args, **options):
        start = datetime.date.fromisoformat(options['start'])
        end = datetime.date.fromisoformat(options['end'])

        existing = set(DimDate.objects.values_list('full_date', flat=True))
        dates_to_create = []
        d = start
        while d <= end:
            if d not in existing:
                dates_to_create.append(DimDate(
                    full_date=d, day_of_week=d.weekday(), day_name=d.strftime('%A'),
                    month=d.month, month_name=d.strftime('%B'),
                    quarter=(d.month - 1) // 3 + 1, year=d.year,
                    is_weekend=tf.is_weekend(d), festival_flag=tf.festival_flag(d),
                ))
            d += datetime.timedelta(days=1)
        DimDate.objects.bulk_create(dates_to_create, batch_size=2000)
        self.stdout.write(f"dim_date: {len(dates_to_create)} new rows ({start} to {end}).")

        existing_times = set(DimTime.objects.values_list('hour', 'minute_band'))
        times_to_create = []
        for hour in range(24):
            for band in (0, 15, 30, 45):
                if (hour, band) not in existing_times:
                    times_to_create.append(DimTime(
                        hour=hour, minute_band=band,
                        day_part=tf.day_part(hour), is_peak_hour=tf.is_peak_hour(hour),
                    ))
        DimTime.objects.bulk_create(times_to_create, batch_size=200)
        self.stdout.write(self.style.SUCCESS(f"dim_time: {len(times_to_create)} new rows."))
