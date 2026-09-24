"""Warehouse dimensions (PRD §8.1).

Deliberately NOT a django.db.models.ForeignKey to any operational model —
warehouse migrations must stay in their own graph, never joined to the
operational one (PRD §12). Every dimension keeps the operational id as a
plain, non-unique "natural key" column instead; SCD-2 dimensions enforce
"exactly one current row per natural key" via a partial unique index
(unique together with is_current, filtered to is_current=True) rather than
a hard unique constraint on the natural key column itself.

`*_key` = surrogate, warehouse-issued, BigAutoField.
`*_id` (or `natural_id`)= the operational primary key this row describes.
"""
from django.db import models


class Scd2Mixin(models.Model):
    """Shared fields for Type-2 (history-bearing) dimensions."""
    valid_from = models.DateField()
    valid_to = models.DateField(default='9999-12-31')
    is_current = models.BooleanField(default=True)

    class Meta:
        abstract = True


# ---------------------------------------------------------------------------
# Conformed dimensions
# ---------------------------------------------------------------------------

class DimDate(models.Model):
    """SCD 0 — a static calendar dimension, generated once at warehouse init."""
    date_key = models.BigAutoField(primary_key=True)
    full_date = models.DateField(unique=True)
    day_of_week = models.SmallIntegerField()  # 0=Monday
    day_name = models.CharField(max_length=10)
    month = models.SmallIntegerField()
    month_name = models.CharField(max_length=10)
    quarter = models.SmallIntegerField()
    year = models.SmallIntegerField()
    is_weekend = models.BooleanField()
    festival_flag = models.BooleanField(default=False)

    class Meta:
        db_table = 'dim_date'


class DimTime(models.Model):
    """SCD 0 — every minute-band of a day, generated once at warehouse init."""
    time_key = models.BigAutoField(primary_key=True)
    hour = models.SmallIntegerField()
    minute_band = models.SmallIntegerField()  # 0, 15, 30, 45
    day_part = models.CharField(max_length=20)  # breakfast|lunch|evening|late_night|...
    is_peak_hour = models.BooleanField(default=False)

    class Meta:
        db_table = 'dim_time'
        unique_together = ('hour', 'minute_band')


class DimCustomer(Scd2Mixin):
    """SCD 2 — signup_cohort/tenure_band/rfm_segment change over a
    customer's lifetime and history must be preserved for point-in-time
    analysis (e.g. "what segment was this customer in when they ordered").
    """
    customer_key = models.BigAutoField(primary_key=True)
    customer_id = models.BigIntegerField()  # core.User.id, no FK — see module docstring
    signup_cohort = models.CharField(max_length=7)  # 'YYYY-MM'
    tenure_band = models.CharField(max_length=20)  # new|growing|established|loyal
    rfm_segment = models.CharField(max_length=30, blank=True)

    class Meta:
        db_table = 'dim_customer'
        indexes = [
            models.Index(fields=['customer_id']),
            models.Index(fields=['customer_id', 'is_current']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['customer_id'], condition=models.Q(is_current=True),
                name='uq_dim_customer_current',
            ),
        ]


class DimLocation(models.Model):
    """SCD 1 — location attributes are overwritten in place; history isn't
    meaningful here (a pincode's city doesn't change).
    """
    location_key = models.BigAutoField(primary_key=True)
    area = models.CharField(max_length=100)
    zone = models.CharField(max_length=50, blank=True)
    city = models.CharField(max_length=100)
    region = models.CharField(max_length=100, blank=True)
    pincode = models.CharField(max_length=20, blank=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=6, null=True, blank=True)
    density_band = models.CharField(max_length=20, blank=True)  # low|medium|high

    class Meta:
        db_table = 'dim_location'
        constraints = [
            models.UniqueConstraint(fields=['area', 'city'], name='uq_dim_location_area_city'),
        ]


class DimPayment(models.Model):
    """SCD 1 — method/provider taxonomy rarely changes meaning."""
    payment_key = models.BigAutoField(primary_key=True)
    method = models.CharField(max_length=30, unique=True)
    provider = models.CharField(max_length=50, blank=True)
    is_prepaid = models.BooleanField(default=True)
    settlement_band = models.CharField(max_length=20, blank=True)  # instant|t+1|t+2

    class Meta:
        db_table = 'dim_payment'


# ---------------------------------------------------------------------------
# Zesty-scoped dimensions
# ---------------------------------------------------------------------------

class DimRestaurant(Scd2Mixin):
    restaurant_key = models.BigAutoField(primary_key=True)
    restaurant_id = models.BigIntegerField()  # zesty.Restaurant.id
    name = models.CharField(max_length=255)
    cuisine = models.CharField(max_length=255, blank=True)
    price_band = models.CharField(max_length=20, blank=True)
    area = models.CharField(max_length=100, blank=True)
    rating_band = models.CharField(max_length=20, blank=True)  # low|mid|high|top

    class Meta:
        db_table = 'dim_restaurant'
        indexes = [models.Index(fields=['restaurant_id'])]
        constraints = [
            models.UniqueConstraint(
                fields=['restaurant_id'], condition=models.Q(is_current=True),
                name='uq_dim_restaurant_current',
            ),
        ]


class DimMenuItem(Scd2Mixin):
    """Tracks price changes: MenuItemPriceHistory in the operational schema
    is exactly the tracked-attribute-change signal this dimension versions.
    """
    item_key = models.BigAutoField(primary_key=True)
    item_id = models.BigIntegerField()  # zesty.MenuItem.id
    item_name = models.CharField(max_length=255)
    category = models.CharField(max_length=100, blank=True)
    list_price = models.DecimalField(max_digits=8, decimal_places=2)
    veg_flag = models.BooleanField(default=False)

    class Meta:
        db_table = 'dim_menu_item'
        indexes = [models.Index(fields=['item_id'])]
        constraints = [
            models.UniqueConstraint(
                fields=['item_id'], condition=models.Q(is_current=True),
                name='uq_dim_menu_item_current',
            ),
        ]


class DimPromotion(models.Model):
    """SCD 1. No operational source table exists yet (out of scope per PRD
    §5.2's model list) — the ETL's extract stage for this dimension is a
    documented no-op until a Promotion/Campaign model is added upstream;
    this table exists so fact_order can carry a (currently always-null)
    promotion_key without a later migration.
    """
    promotion_key = models.BigAutoField(primary_key=True)
    campaign_name = models.CharField(max_length=255, unique=True)
    promo_type = models.CharField(max_length=50, blank=True)
    discount_pct = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    channel = models.CharField(max_length=50, blank=True)

    class Meta:
        db_table = 'dim_promotion'


# ---------------------------------------------------------------------------
# Eventra-scoped dimensions
# ---------------------------------------------------------------------------

class DimEvent(Scd2Mixin):
    event_key = models.BigAutoField(primary_key=True)
    event_id = models.BigIntegerField()  # eventra.Event.id
    title = models.CharField(max_length=255)
    category = models.CharField(max_length=50, blank=True)
    genre = models.CharField(max_length=50, blank=True)
    organiser = models.CharField(max_length=255, blank=True)
    language = models.CharField(max_length=50, default='en')

    class Meta:
        db_table = 'dim_event'
        indexes = [models.Index(fields=['event_id'])]
        constraints = [
            models.UniqueConstraint(
                fields=['event_id'], condition=models.Q(is_current=True),
                name='uq_dim_event_current',
            ),
        ]


class DimVenue(models.Model):
    """SCD 1 — sourced from eventra.Venue."""
    venue_key = models.BigAutoField(primary_key=True)
    venue_id = models.BigIntegerField(unique=True)  # eventra.Venue.id
    venue_name = models.CharField(max_length=255)
    capacity_band = models.CharField(max_length=20, blank=True)  # small|medium|large
    zone = models.CharField(max_length=50, blank=True)
    city = models.CharField(max_length=100, blank=True)

    class Meta:
        db_table = 'dim_venue'


class DimTicketType(Scd2Mixin):
    ticket_type_key = models.BigAutoField(primary_key=True)
    ticket_type_id = models.BigIntegerField()  # eventra.TicketType.id
    class_name = models.CharField(max_length=100)
    tier = models.CharField(max_length=50, blank=True)
    base_price = models.DecimalField(max_digits=10, decimal_places=2)
    is_refundable = models.BooleanField(default=True)

    class Meta:
        db_table = 'dim_ticket_type'
        indexes = [models.Index(fields=['ticket_type_id'])]
        constraints = [
            models.UniqueConstraint(
                fields=['ticket_type_id'], condition=models.Q(is_current=True),
                name='uq_dim_ticket_type_current',
            ),
        ]
