"""Mining output tables (PRD §8.4).

Every row carries `confidence` and `model_version` (PRD's own rule) so the
serving layer can filter below-threshold results out (FR-I8) without a
second lookup, and so a UI can always show which model version produced
what it's displaying.
"""
from django.db import models


class MiningRun(models.Model):
    """One invocation of a mining module — the registry PRD §8.4 asks for.
    `metrics` holds whatever that module reports (lift/conviction for
    basket, silhouette/Davies-Bouldin for segments, precision/recall/F1/
    ROC-AUC for risk, MAE/RMSE/MAPE for forecast, precision@k for anomaly).
    """
    module = models.CharField(max_length=30)
    model_version = models.CharField(max_length=20)
    params = models.JSONField(default=dict, blank=True)
    metrics = models.JSONField(default=dict, blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=20, default='running',
        choices=[('running', 'Running'), ('succeeded', 'Succeeded'), ('failed', 'Failed')],
    )
    error_message = models.TextField(blank=True)

    class Meta:
        db_table = 'mining_run'
        ordering = ['-started_at']
        indexes = [models.Index(fields=['module', 'started_at'])]

    def __str__(self):
        return f"{self.module} v{self.model_version} [{self.status}] @ {self.started_at}"


class MiningBasketRule(models.Model):
    """mining_basket_rule (§8.4). Mined at both item level and category
    level per the module's own rule — a low-support item-level pair can
    still be an obvious, useful category-level pattern.
    """
    LEVEL_CHOICES = [('item', 'Item'), ('category', 'Category')]

    run = models.ForeignKey(MiningRun, on_delete=models.CASCADE, related_name='basket_rules')
    restaurant_id = models.BigIntegerField(null=True, blank=True)  # scoped per restaurant; null = cross-restaurant
    level = models.CharField(max_length=10, choices=LEVEL_CHOICES)
    antecedent = models.JSONField()  # list[str] of item/category names
    consequent = models.JSONField()  # list[str]
    support = models.FloatField()
    confidence = models.FloatField()
    lift = models.FloatField()
    conviction = models.FloatField(null=True, blank=True)
    model_version = models.CharField(max_length=20)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'mining_basket_rule'
        indexes = [
            models.Index(fields=['restaurant_id']), models.Index(fields=['level']),
            models.Index(fields=['lift']),
        ]

    def __str__(self):
        return f"{self.antecedent} -> {self.consequent} (lift={self.lift:.2f})"


class MiningCustomerSegment(models.Model):
    """mining_customer_segment (§8.4). One current row per customer per run
    — a customer's segment assignment for that run's RFM snapshot.
    """
    run = models.ForeignKey(MiningRun, on_delete=models.CASCADE, related_name='customer_segments')
    customer_id = models.BigIntegerField()
    segment_label = models.CharField(max_length=30)
    recency_days = models.FloatField()
    frequency = models.IntegerField()
    monetary = models.DecimalField(max_digits=12, decimal_places=2)
    confidence = models.FloatField()  # distance-based cluster-membership confidence, [0,1]
    model_version = models.CharField(max_length=20)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'mining_customer_segment'
        indexes = [models.Index(fields=['customer_id']), models.Index(fields=['segment_label'])]
        constraints = [
            models.UniqueConstraint(fields=['run', 'customer_id'], name='uq_mining_segment_run_customer'),
        ]

    def __str__(self):
        return f"customer {self.customer_id}: {self.segment_label}"
