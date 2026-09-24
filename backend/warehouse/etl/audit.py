"""Thin helpers around EtlRunAudit/EtlQuarantine so extract/transform/load
don't each reimplement the same bookkeeping (PRD §8.2 stage 6, NFR-Au1).
"""
from django.utils import timezone
from warehouse.models import EtlRunAudit, EtlQuarantine


def start_table_audit(run_id, table_name, window_from, window_to):
    return EtlRunAudit.objects.create(
        run_id=run_id, table_name=table_name,
        window_from=window_from, window_to=window_to,
    )


def finish_table_audit(audit, rows_read, rows_rejected, rows_loaded, status='succeeded', error_message=''):
    audit.ended_at = timezone.now()
    audit.rows_read = rows_read
    audit.rows_rejected = rows_rejected
    audit.rows_loaded = rows_loaded
    audit.status = status
    audit.error_message = error_message
    audit.save(update_fields=[
        'ended_at', 'rows_read', 'rows_rejected', 'rows_loaded', 'status', 'error_message'
    ])


def quarantine(run_id, table_name, source_pk, violated_rule, raw_row=None):
    EtlQuarantine.objects.create(
        run_id=run_id, table_name=table_name, source_pk=str(source_pk),
        violated_rule=violated_rule, raw_row=raw_row or {},
    )


def bulk_quarantine(run_id, table_name, entries):
    """entries: list of (source_pk, violated_rule, raw_row_or_None).

    A single bulk_create instead of one INSERT per rejected row — with a
    genuinely dirty source table (thousands of rejects), the per-row
    version can dominate a load's total runtime on its own.
    """
    if not entries:
        return
    EtlQuarantine.objects.bulk_create([
        EtlQuarantine(
            run_id=run_id, table_name=table_name, source_pk=str(pk),
            violated_rule=rule, raw_row=raw or {},
        )
        for pk, rule, raw in entries
    ], batch_size=2000)


def latest_high_water_mark(table_name):
    """The window_to of the most recent successful run for this table, or
    None if this table has never loaded successfully (full extract).
    """
    last = (
        EtlRunAudit.objects
        .filter(table_name=table_name, status='succeeded')
        .order_by('-window_to')
        .first()
    )
    return last.window_to if last else None
