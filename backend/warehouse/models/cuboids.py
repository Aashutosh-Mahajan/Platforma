"""Materialized cuboids (PRD §8.3) — pre-aggregated summary tables refreshed
nightly by `refresh_cuboids` (called from run_etl after facts load). Plain
Django models rather than a Postgres MATERIALIZED VIEW so refresh logic
stays in Python alongside the rest of the ETL and is testable the same way.
"""
from django.db import models


class CbDailyOutletRevenue(models.Model):
    """date, restaurant, location -> owner headline + trend."""
    date = models.DateField()
    restaurant_id = models.BigIntegerField()
    restaurant_name = models.CharField(max_length=255)
    area = models.CharField(max_length=100, blank=True)
    net_revenue = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    order_count = models.IntegerField(default=0)
    item_count = models.IntegerField(default=0)
    refreshed_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cb_daily_outlet_revenue'
        constraints = [models.UniqueConstraint(fields=['date', 'restaurant_id'], name='uq_cb_outlet_rev')]
        indexes = [models.Index(fields=['date']), models.Index(fields=['restaurant_id'])]


class CbDailyItemPerformance(models.Model):
    """date, menu_item, restaurant -> menu engineering, item drill-down."""
    date = models.DateField()
    menu_item_id = models.BigIntegerField()
    item_name = models.CharField(max_length=255)
    restaurant_id = models.BigIntegerField()
    net_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    quantity_sold = models.IntegerField(default=0)
    refreshed_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cb_daily_item_performance'
        constraints = [models.UniqueConstraint(
            fields=['date', 'menu_item_id', 'restaurant_id'], name='uq_cb_item_perf'
        )]
        indexes = [models.Index(fields=['date']), models.Index(fields=['menu_item_id'])]


class CbMonthlyCustomerActivity(models.Model):
    """month, customer, domain -> RFM features, segment tracking."""
    month = models.CharField(max_length=7)  # 'YYYY-MM'
    customer_id = models.BigIntegerField()
    domain = models.CharField(max_length=10)  # 'zesty' | 'eventra'
    total_spend = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    transaction_count = models.IntegerField(default=0)
    last_transaction_date = models.DateField(null=True, blank=True)
    refreshed_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cb_monthly_customer_activity'
        constraints = [models.UniqueConstraint(
            fields=['month', 'customer_id', 'domain'], name='uq_cb_customer_activity'
        )]
        indexes = [models.Index(fields=['month']), models.Index(fields=['customer_id'])]


class CbDailyEventSales(models.Model):
    """date, event, venue, ticket_type -> organiser sell-through."""
    date = models.DateField()
    event_id = models.BigIntegerField()
    event_title = models.CharField(max_length=255)
    venue_id = models.BigIntegerField(null=True)
    ticket_type_id = models.BigIntegerField()
    tier_name = models.CharField(max_length=100)
    net_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tickets_sold = models.IntegerField(default=0)
    refreshed_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cb_daily_event_sales'
        constraints = [models.UniqueConstraint(
            fields=['date', 'event_id', 'ticket_type_id'], name='uq_cb_event_sales'
        )]
        indexes = [models.Index(fields=['date']), models.Index(fields=['event_id'])]


class CbHourlyDemandProfile(models.Model):
    """date, day_part, location, domain -> forecasting input."""
    date = models.DateField()
    day_part = models.CharField(max_length=20)
    area = models.CharField(max_length=100, blank=True)
    domain = models.CharField(max_length=10)  # 'zesty' | 'eventra'
    transaction_count = models.IntegerField(default=0)
    net_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    refreshed_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cb_hourly_demand_profile'
        constraints = [models.UniqueConstraint(
            fields=['date', 'day_part', 'area', 'domain'], name='uq_cb_demand_profile'
        )]
        indexes = [models.Index(fields=['date'])]
