"""`data_source` already exists on the live `restaurants` table (see
0004_restaurant_catalog_fields) — state-only, same pattern."""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("zesty", "0005_alter_restaurant_cuisine_alter_restaurant_image_url"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name="restaurant",
                    name="data_source",
                    field=models.CharField(
                        default="real",
                        help_text="'real' for owner-onboarded restaurants; 'fake' is reserved for seed/demo data.",
                        max_length=10,
                    ),
                ),
            ],
            database_operations=[],
        ),
    ]
