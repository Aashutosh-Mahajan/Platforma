"""Data-quality results (persisted). One row per check per ETL run, so a
regression ("orders stopped reconciling last Tuesday") shows up as a
history, not just as today's pass/fail. The checks themselves live in
warehouse/etl/quality.py.
"""
from django.db import models


class DataQualityCheck(models.Model):
    STATUS_CHOICES = [('pass', 'Pass'), ('warn', 'Warn'), ('fail', 'Fail')]

    run_id = models.UUIDField()
    check_name = models.CharField(max_length=100)
    table_name = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES)
    observed = models.FloatField(null=True, blank=True)
    threshold = models.FloatField(null=True, blank=True)
    message = models.CharField(max_length=255, blank=True)
    checked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'etl_data_quality_check'
        ordering = ['-checked_at']
        indexes = [models.Index(fields=['run_id']), models.Index(fields=['check_name', 'checked_at'])]

    def __str__(self):
        return f"{self.check_name} [{self.status}]"
