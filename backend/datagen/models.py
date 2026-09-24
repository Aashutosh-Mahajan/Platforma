from django.db import models


class GenerationRun(models.Model):
    """One invocation of `gen_data` — the seed is recorded here so every
    later evaluation (mining metrics, planted-pattern recovery checks) can
    be tied back to exactly the run that produced the data it was scored
    against (PRD §10: 'record the seed alongside every evaluation result').
    """

    seed = models.IntegerField()
    scale = models.FloatField(default=1.0)
    months = models.IntegerField(default=18)
    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    summary = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'datagen_run'
        ordering = ['-started_at']

    def __str__(self):
        return f"gen_data run seed={self.seed} scale={self.scale} @ {self.started_at}"


class PlantedAnomaly(models.Model):
    """A record of exactly which synthetic row is a deliberately-injected
    anomaly, and why (PRD §10: anomalies are 'labelled'; §8.4 anomaly
    module's metric is 'precision@k vs injected'). The mining anomaly
    module scores itself against this table, never against the raw data.
    """

    ANOMALY_TYPES = [
        ('bulk_booking_burst', 'Bulk Booking Burst'),
        ('improbable_value', 'Improbable Value'),
        ('payment_retry_storm', 'Payment Retry Storm'),
    ]

    run = models.ForeignKey(GenerationRun, on_delete=models.CASCADE, related_name='planted_anomalies')
    anomaly_type = models.CharField(max_length=30, choices=ANOMALY_TYPES)
    target_type = models.CharField(max_length=20)  # 'order' | 'booking' | 'payment'
    target_id = models.CharField(max_length=64)
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'datagen_planted_anomaly'
        indexes = [models.Index(fields=['target_type', 'target_id'])]

    def __str__(self):
        return f"{self.anomaly_type} on {self.target_type}:{self.target_id}"
