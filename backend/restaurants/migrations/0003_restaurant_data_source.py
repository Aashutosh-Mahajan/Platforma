from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("restaurants", "0002_restaurant_description_restaurant_hours_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="restaurant",
            name="data_source",
            field=models.CharField(
                choices=[("fake", "Fake"), ("real", "Real")],
                db_index=True,
                default="fake",
                max_length=10,
            ),
        ),
    ]
