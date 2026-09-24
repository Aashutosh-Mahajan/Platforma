"""Reconcile the Restaurant model with columns that already exist in the
live `restaurants` table (city, area, cuisine, price_range, veg_only, slug,
image_url, hours, is_open, source_record_id — inherited from the original
database_create.sql schema but never exposed on the Django model) using
SeparateDatabaseAndState, and genuinely add the one column that's actually
missing (state), the same pattern used in 0001_initial for the same table.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('zesty', '0003_orderstatushistory_menuitempricehistory'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name='restaurant',
                    name='city',
                    field=models.CharField(max_length=100, blank=True, db_index=True),
                ),
                migrations.AddField(
                    model_name='restaurant',
                    name='area',
                    field=models.CharField(max_length=100, blank=True, db_index=True),
                ),
                migrations.AddField(
                    model_name='restaurant',
                    name='cuisine',
                    field=models.CharField(max_length=100, blank=True),
                ),
                migrations.AddField(
                    model_name='restaurant',
                    name='price_range',
                    field=models.IntegerField(default=2, help_text='1 (budget) - 4 (premium)'),
                ),
                migrations.AddField(
                    model_name='restaurant',
                    name='veg_only',
                    field=models.BooleanField(default=False),
                ),
                migrations.AddField(
                    model_name='restaurant',
                    name='slug',
                    field=models.SlugField(max_length=255, blank=True),
                ),
                migrations.AddField(
                    model_name='restaurant',
                    name='image_url',
                    field=models.URLField(max_length=1000, blank=True),
                ),
                migrations.AddField(
                    model_name='restaurant',
                    name='hours',
                    field=models.CharField(max_length=255, blank=True),
                ),
                migrations.AddField(
                    model_name='restaurant',
                    name='is_open',
                    field=models.BooleanField(default=True),
                ),
            ],
            database_operations=[],
        ),
        migrations.AddField(
            model_name='restaurant',
            name='state',
            field=models.CharField(max_length=100, blank=True, db_index=True),
        ),
    ]
