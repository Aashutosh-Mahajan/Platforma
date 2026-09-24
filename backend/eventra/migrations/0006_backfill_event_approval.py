from django.db import migrations


def grandfather_existing_events(apps, schema_editor):
    """Events created before the FR-A4 admin-approval gate existed are
    approved automatically so this migration doesn't retroactively hide
    already-published events. Only events created after this point require
    an explicit admin approval.
    """
    Event = apps.get_model('eventra', 'Event')
    Event.objects.filter(is_published=True).update(is_approved=True)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('eventra', '0005_event_is_approved_alter_event_is_published'),
    ]

    operations = [
        migrations.RunPython(grandfather_existing_events, noop_reverse),
    ]
