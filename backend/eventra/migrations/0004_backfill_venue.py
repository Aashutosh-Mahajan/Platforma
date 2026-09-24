from django.db import migrations


def backfill_venues(apps, schema_editor):
    Event = apps.get_model('eventra', 'Event')
    Venue = apps.get_model('eventra', 'Venue')

    for event in Event.objects.filter(venue__isnull=True).exclude(venue_name='').exclude(address=''):
        venue, _ = Venue.objects.get_or_create(
            name=event.venue_name,
            address=event.address,
            defaults={'latitude': event.latitude, 'longitude': event.longitude},
        )
        event.venue = venue
        event.save(update_fields=['venue'])


def noop_reverse(apps, schema_editor):
    # Venue rows are harmless to leave in place; nothing to reverse.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('eventra', '0003_venue_event_venue'),
    ]

    operations = [
        migrations.RunPython(backfill_venues, noop_reverse),
    ]
