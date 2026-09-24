"""SCD-2 upsert (PRD §8.2).

    for each incoming dimension row:
        current = SELECT * FROM dim_x WHERE natural_id = :id AND is_current
        if not current:            INSERT new row, valid_from=today, valid_to='9999-12-31', is_current=true
        elif tracked attrs differ: UPDATE current SET valid_to=today-1, is_current=false
                                   INSERT new row with a fresh surrogate key
        else:                      no-op
"""
import datetime


def apply_scd2(model, natural_id_field, natural_id_value, tracked_fields, incoming_values,
                today=None, current_row=None):
    """Apply one incoming row to a Type-2 dimension.

    `tracked_fields` — attribute names whose change should trigger a new
    version. `incoming_values` — dict of {field: value} for ALL dimension
    attributes (tracked and not) to write into a new/first row.

    `current_row` lets the caller pass an already-fetched current row (e.g.
    from a single bulk SELECT covering an entire batch) to skip the
    per-call lookup entirely — with thousands of dimension rows per ETL
    run, one SELECT per row against a remote DB is the difference between
    seconds and minutes.

    Returns (row, status) where status is 'inserted' | 'versioned' | 'noop'.
    """
    today = today or datetime.date.today()
    if current_row is None:
        current_row = model.objects.filter(
            **{natural_id_field: natural_id_value, 'is_current': True}
        ).first()

    if current_row is None:
        row = model.objects.create(
            **{natural_id_field: natural_id_value},
            valid_from=today, valid_to=datetime.date(9999, 12, 31), is_current=True,
            **incoming_values,
        )
        return row, 'inserted'

    changed = any(getattr(current_row, f) != incoming_values.get(f) for f in tracked_fields)
    if not changed:
        return current_row, 'noop'

    current_row.valid_to = today - datetime.timedelta(days=1)
    current_row.is_current = False
    current_row.save(update_fields=['valid_to', 'is_current'])

    row = model.objects.create(
        **{natural_id_field: natural_id_value},
        valid_from=today, valid_to=datetime.date(9999, 12, 31), is_current=True,
        **incoming_values,
    )
    return row, 'versioned'


def apply_scd1(model, natural_id_field, natural_id_value, incoming_values, current_row=None):
    """Type-1: overwrite in place, no history. Returns (row, status)."""
    if current_row is not None:
        changed_fields = [f for f, v in incoming_values.items() if getattr(current_row, f) != v]
        if not changed_fields:
            return current_row, 'noop'
        for f, v in incoming_values.items():
            setattr(current_row, f, v)
        current_row.save(update_fields=changed_fields)
        return current_row, 'updated'

    obj, created = model.objects.get_or_create(
        **{natural_id_field: natural_id_value},
        defaults=incoming_values,
    )
    if created:
        return obj, 'inserted'

    changed_fields = [f for f, v in incoming_values.items() if getattr(obj, f) != v]
    if not changed_fields:
        return obj, 'noop'

    for f, v in incoming_values.items():
        setattr(obj, f, v)
    obj.save(update_fields=changed_fields)
    return obj, 'updated'
