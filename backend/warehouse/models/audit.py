"""ETL audit trail (PRD §8.2 stage 6, NFR-Au1)."""
import uuid
from django.db import models


class EtlRunAudit(models.Model):
    """One row per (run, table) — every warehouse load's rows read/rejected/
    loaded must be recorded (NFR-Au1), not just a pass/fail flag.
    """
    run_id = models.UUIDField(default=uuid.uuid4, editable=False)
    table_name = models.CharField(max_length=100)
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    window_from = models.DateTimeField(null=True, blank=True)
    window_to = models.DateTimeField(null=True, blank=True)
    rows_read = models.IntegerField(default=0)
    rows_rejected = models.IntegerField(default=0)
    rows_loaded = models.IntegerField(default=0)
    status = models.CharField(
        max_length=20, default='running',
        choices=[('running', 'Running'), ('succeeded', 'Succeeded'), ('failed', 'Failed')],
    )
    error_message = models.TextField(blank=True)

    class Meta:
        db_table = 'etl_run_audit'
        indexes = [models.Index(fields=['run_id']), models.Index(fields=['table_name'])]

    def __str__(self):
        return f"{self.run_id} {self.table_name} [{self.status}]"


class EtlQuarantine(models.Model):
    """Rows rejected during the Cleanse stage, with the rule that rejected
    them — a rejection with no recorded reason isn't auditable.
    """
    run_id = models.UUIDField()
    table_name = models.CharField(max_length=100)
    source_pk = models.CharField(max_length=64)
    violated_rule = models.CharField(max_length=100)
    raw_row = models.JSONField(default=dict, blank=True)
    quarantined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'etl_quarantine'
        indexes = [models.Index(fields=['run_id']), models.Index(fields=['table_name'])]

    def __str__(self):
        return f"{self.table_name}:{self.source_pk} rejected ({self.violated_rule})"
