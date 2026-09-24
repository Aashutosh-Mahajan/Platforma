"""The `venues` table already has a `state` column from the original
database_create.sql schema; this only brings the Django model state in
sync (see zesty/migrations/0004_restaurant_catalog_fields.py for the same
pattern)."""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('eventra', '0007_bookingstatushistory'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name='venue',
                    name='state',
                    field=models.CharField(max_length=100, blank=True, db_index=True),
                ),
            ],
            database_operations=[],
        ),
    ]
