"""The `venues_city_1a41ad2e` index already exists in the live database
(pre-dates this app's migrations, part of the original schema) — this only
updates Django's model state to know city is indexed."""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('eventra', '0008_venue_state'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterField(
                    model_name='venue',
                    name='city',
                    field=models.CharField(max_length=100, blank=True, db_index=True),
                ),
            ],
            database_operations=[],
        ),
    ]
