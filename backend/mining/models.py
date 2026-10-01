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
    vertical = models.CharField(max_length=10, default='all')  # all | zesty | eventra
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
            models.UniqueConstraint(fields=['run', 'vertical', 'customer_id'], name='uq_mining_segment_run_vertical_customer'),
        ]

    def __str__(self):
        return f"customer {self.customer_id}: {self.segment_label}"


# ---------------------------------------------------------------------------
# Mining set B. Every table hangs off a MiningRun (CASCADE), so pruning old
# runs (registry.prune_old_runs) also clears their rows: the warehouse
# database only ever keeps the latest few runs per module.
# ---------------------------------------------------------------------------

class MiningAnomaly(models.Model):
    """One flagged order or booking, ranked by how unusual it is. The review
    status carries forward between runs, so a row an admin dismissed
    doesn't come back as 'open' the next day.
    """
    DOMAIN_CHOICES = [('order', 'Order'), ('booking', 'Booking')]
    REVIEW_CHOICES = [('open', 'Open'), ('confirmed', 'Confirmed'), ('dismissed', 'Dismissed')]

    run = models.ForeignKey(MiningRun, on_delete=models.CASCADE, related_name='anomalies')
    domain = models.CharField(max_length=10, choices=DOMAIN_CHOICES)
    target_id = models.CharField(max_length=64)  # order UUID / booking id
    customer_id = models.BigIntegerField(null=True, blank=True)
    entity_id = models.BigIntegerField(null=True, blank=True)  # restaurant_id / event_id
    occurred_on = models.DateField(null=True, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    score = models.FloatField()
    rank = models.IntegerField()
    reasons = models.JSONField(default=list)
    review_status = models.CharField(max_length=10, choices=REVIEW_CHOICES, default='open')
    reviewed_by = models.BigIntegerField(null=True, blank=True)  # core.User.id
    reviewed_at = models.DateTimeField(null=True, blank=True)
    model_version = models.CharField(max_length=20)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'mining_anomaly'
        indexes = [models.Index(fields=['run', 'rank']), models.Index(fields=['domain', 'target_id'])]


class MiningRiskScore(models.Model):
    """A predicted probability for one live booking or order."""
    KIND_CHOICES = [
        ('booking_no_show', 'Booking no-show'),
        ('booking_cancellation', 'Booking cancellation'),
        ('order_cancellation', 'Order cancellation'),
    ]
    run = models.ForeignKey(MiningRun, on_delete=models.CASCADE, related_name='risk_scores')
    kind = models.CharField(max_length=30, choices=KIND_CHOICES)
    target_id = models.CharField(max_length=64)
    entity_id = models.BigIntegerField(null=True, blank=True)  # event_id / restaurant_id
    customer_id = models.BigIntegerField(null=True, blank=True)
    seats = models.IntegerField(default=1)
    probability = models.FloatField()
    band = models.CharField(max_length=10)  # low | medium | high
    model_version = models.CharField(max_length=20)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'mining_risk_score'
        indexes = [models.Index(fields=['run', 'kind', 'entity_id']), models.Index(fields=['target_id'])]


class MiningForecast(models.Model):
    """Daily demand forecast for one series: a restaurant's orders, or the
    platform's total orders / bookings.
    """
    SERIES_CHOICES = [
        ('restaurant_orders', 'Restaurant orders'),
        ('platform_orders', 'Platform orders'),
        ('platform_bookings', 'Platform bookings'),
    ]
    run = models.ForeignKey(MiningRun, on_delete=models.CASCADE, related_name='forecasts')
    series = models.CharField(max_length=30, choices=SERIES_CHOICES)
    entity_id = models.BigIntegerField(null=True, blank=True)  # restaurant_id for restaurant_orders
    target_date = models.DateField()
    predicted = models.FloatField()
    lower = models.FloatField()
    upper = models.FloatField()
    model_version = models.CharField(max_length=20)

    class Meta:
        db_table = 'mining_forecast'
        indexes = [models.Index(fields=['run', 'series', 'entity_id'])]


class MiningSellOutForecast(models.Model):
    """Where an upcoming event's ticket sales are heading."""
    run = models.ForeignKey(MiningRun, on_delete=models.CASCADE, related_name='sellout_forecasts')
    event_id = models.BigIntegerField()
    organizer_id = models.BigIntegerField(null=True, blank=True)
    event_date = models.DateTimeField()
    capacity = models.IntegerField()
    sold = models.IntegerField()
    sold_last_7d = models.IntegerField(default=0)
    days_to_event = models.IntegerField()
    projected_final = models.IntegerField()
    projected_sell_through = models.FloatField()
    sell_out_probability = models.FloatField()
    projected_sell_out_date = models.DateField(null=True, blank=True)
    model_version = models.CharField(max_length=20)

    class Meta:
        db_table = 'mining_sellout_forecast'
        indexes = [models.Index(fields=['run', 'event_id']), models.Index(fields=['organizer_id'])]


class MiningRecommendation(models.Model):
    """Top picks for one customer. Food picks are restaurants; event picks
    are categories, matched to upcoming events when served.
    """
    DOMAIN_CHOICES = [('food', 'Food'), ('event', 'Event')]
    run = models.ForeignKey(MiningRun, on_delete=models.CASCADE, related_name='recommendations')
    customer_id = models.BigIntegerField()
    domain = models.CharField(max_length=10, choices=DOMAIN_CHOICES)
    item_id = models.BigIntegerField(null=True, blank=True)  # restaurant_id for food
    label = models.CharField(max_length=255)  # restaurant name / event category
    score = models.FloatField()
    rank = models.IntegerField()
    reason = models.CharField(max_length=255, blank=True)
    model_version = models.CharField(max_length=20)

    class Meta:
        db_table = 'mining_recommendation'
        indexes = [models.Index(fields=['run', 'customer_id', 'domain'])]


class MiningSequenceRule(models.Model):
    """'Customers who do A tend to do B within N hours' across Zesty and
    Eventra, ranked by lift over B's baseline rate.
    """
    run = models.ForeignKey(MiningRun, on_delete=models.CASCADE, related_name='sequence_rules')
    antecedent = models.CharField(max_length=100)  # e.g. 'event:concert'
    consequent = models.CharField(max_length=100)  # e.g. 'food:North Indian'
    window_hours = models.IntegerField()
    occurrences = models.IntegerField()
    support = models.FloatField()
    confidence = models.FloatField()
    lift = models.FloatField()
    model_version = models.CharField(max_length=20)

    class Meta:
        db_table = 'mining_sequence_rule'
        indexes = [models.Index(fields=['run', 'lift'])]


class MiningCustomerScore(models.Model):
    """Churn risk and predicted value for one customer, side by side. The
    admin console's 'valuable customers about to leave' list joins the
    two, so they share a row.
    """
    run = models.ForeignKey(MiningRun, on_delete=models.CASCADE, related_name='customer_scores')
    vertical = models.CharField(max_length=10, default='all')  # all | zesty | eventra
    customer_id = models.BigIntegerField()
    churn_probability = models.FloatField(null=True, blank=True)
    churn_band = models.CharField(max_length=10, blank=True)
    predicted_90d_value = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    historic_value = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    value_band = models.CharField(max_length=10, blank=True)  # platinum | gold | silver | bronze
    days_since_last = models.IntegerField()
    purchases_90d = models.IntegerField(default=0)
    top_reason = models.CharField(max_length=255, blank=True)
    model_version = models.CharField(max_length=20)

    class Meta:
        db_table = 'mining_customer_score'
        indexes = [models.Index(fields=['run', 'vertical', 'customer_id']), models.Index(fields=['run', 'vertical', 'churn_band'])]


class MiningDeliveryEstimate(models.Model):
    """Predicted delivery time for a restaurant by time of day, weekday vs
    weekend and basket size. A lookup grid, so checkout never runs a model.
    """
    run = models.ForeignKey(MiningRun, on_delete=models.CASCADE, related_name='delivery_estimates')
    restaurant_id = models.BigIntegerField()
    day_part = models.CharField(max_length=20)
    is_weekend = models.BooleanField()
    size_band = models.CharField(max_length=10)  # '1-2' | '3-4' | '5+'
    predicted_minutes = models.FloatField()
    p90_minutes = models.FloatField()
    model_version = models.CharField(max_length=20)

    class Meta:
        db_table = 'mining_delivery_estimate'
        indexes = [models.Index(fields=['run', 'restaurant_id'])]


class MiningHotspot(models.Model):
    """A demand cluster: where orders (or bookings) concentrate, and whether
    there is enough supply there to meet it.
    """
    DOMAIN_CHOICES = [('zesty', 'Zesty'), ('eventra', 'Eventra')]
    run = models.ForeignKey(MiningRun, on_delete=models.CASCADE, related_name='hotspots')
    domain = models.CharField(max_length=10, choices=DOMAIN_CHOICES)
    city = models.CharField(max_length=100, blank=True)
    label = models.CharField(max_length=255)
    center_lat = models.FloatField()
    center_lng = models.FloatField()
    radius_km = models.FloatField()
    demand = models.IntegerField()  # orders / bookings in the lookback window
    revenue = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    supply = models.IntegerField()  # restaurants / venues in the cluster
    demand_per_supply = models.FloatField()
    avg_delivery_minutes = models.FloatField(null=True, blank=True)
    opportunity = models.CharField(max_length=20)  # undersupplied | balanced | oversupplied
    model_version = models.CharField(max_length=20)

    class Meta:
        db_table = 'mining_hotspot'


class MiningSearchTerm(models.Model):
    """What people search for: volume, trend, and whether they find it."""
    run = models.ForeignKey(MiningRun, on_delete=models.CASCADE, related_name='search_terms')
    term = models.CharField(max_length=255)
    cluster = models.CharField(max_length=255)  # canonical spelling of its group
    # Where its searches land: zesty | eventra | unknown (never found anything).
    vertical = models.CharField(max_length=10, default='unknown')
    searches = models.IntegerField()
    searches_7d = models.IntegerField(default=0)
    trend = models.FloatField()  # last 7 days vs the 4 weeks before, 1.0 = flat
    zero_result_rate = models.FloatField(null=True, blank=True)
    click_rate = models.FloatField(null=True, blank=True)
    flag = models.CharField(max_length=20, blank=True)  # unmet | trending | unmet_trending | ''
    model_version = models.CharField(max_length=20)

    class Meta:
        db_table = 'mining_search_term'
        indexes = [models.Index(fields=['run', 'flag'])]


class MiningPromoEffect(models.Model):
    """Did a promotion bring in extra orders, net of the platform trend?"""
    run = models.ForeignKey(MiningRun, on_delete=models.CASCADE, related_name='promo_effects')
    promo_code = models.CharField(max_length=255)
    restaurant_id = models.BigIntegerField(null=True, blank=True)
    window_start = models.DateField()
    window_end = models.DateField()
    redemptions = models.IntegerField()
    discount_given = models.DecimalField(max_digits=12, decimal_places=2)
    orders_per_day_before = models.FloatField()
    orders_per_day_during = models.FloatField()
    uplift_pct = models.FloatField(null=True, blank=True)  # trend-adjusted
    incremental_orders = models.FloatField(null=True, blank=True)
    incremental_revenue = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    roi = models.FloatField(null=True, blank=True)  # incremental revenue per rupee of discount
    p_value = models.FloatField(null=True, blank=True)
    verdict = models.CharField(max_length=20)  # worked | no_lift | costly | too_early
    model_version = models.CharField(max_length=20)

    class Meta:
        db_table = 'mining_promo_effect'
        indexes = [models.Index(fields=['run', 'restaurant_id'])]


class MiningPriceElasticity(models.Model):
    """How sell-through responds to ticket price, per event category."""
    run = models.ForeignKey(MiningRun, on_delete=models.CASCADE, related_name='price_elasticities')
    category = models.CharField(max_length=50)
    elasticity = models.FloatField()
    r_squared = models.FloatField()
    events = models.IntegerField()
    tiers = models.IntegerField()
    avg_sell_through = models.FloatField()
    median_price = models.DecimalField(max_digits=10, decimal_places=2)
    advice = models.CharField(max_length=255)
    model_version = models.CharField(max_length=20)

    class Meta:
        db_table = 'mining_price_elasticity'
