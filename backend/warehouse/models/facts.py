"""Warehouse facts (PRD §8.1).

FKs here point at dimension models within this same `warehouse` app only —
never at operational models — so the warehouse migration graph stays fully
self-contained per PRD §12.

NOTE on partitioning: PRD §8.1 calls for fact tables "partitioned by
date_key month." Native declarative partitioning isn't implemented here —
it needs a hand-written raw-SQL migration (Django's ORM doesn't model
PARTITION BY natively) and was judged out of scope for the first working
version of the warehouse. `date_key` is indexed as the next-best thing;
partitioning is a follow-up, not a design change, when volume warrants it.
"""
from django.db import models
from .dimensions import (
    DimDate, DimTime, DimCustomer, DimLocation, DimPayment,
    DimRestaurant, DimMenuItem, DimPromotion, DimEvent, DimVenue, DimTicketType,
)


class FactOrder(models.Model):
    """Grain: one confirmed order."""
    fact_key = models.BigAutoField(primary_key=True)
    order_id = models.UUIDField(unique=True)  # zesty.Order.id — natural key for reconciliation

    date = models.ForeignKey(DimDate, on_delete=models.PROTECT, db_column='date_key')
    time = models.ForeignKey(DimTime, on_delete=models.PROTECT, db_column='time_key')
    customer = models.ForeignKey(DimCustomer, on_delete=models.PROTECT, db_column='customer_key')
    restaurant = models.ForeignKey(DimRestaurant, on_delete=models.PROTECT, db_column='restaurant_key')
    location = models.ForeignKey(DimLocation, on_delete=models.PROTECT, db_column='location_key', null=True)
    payment = models.ForeignKey(DimPayment, on_delete=models.PROTECT, db_column='payment_key', null=True)
    promotion = models.ForeignKey(DimPromotion, on_delete=models.PROTECT, db_column='promotion_key', null=True, blank=True)

    order_total = models.DecimalField(max_digits=12, decimal_places=2)
    item_count = models.IntegerField()
    delivery_fee = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    discount_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    delivery_minutes = models.IntegerField(null=True, blank=True)
    failed_payments = models.IntegerField(default=0)  # failed attempts before this order was paid
    is_cancelled = models.BooleanField(default=False)

    loaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'fact_order'
        indexes = [
            models.Index(fields=['date']), models.Index(fields=['customer']),
            models.Index(fields=['restaurant']),
        ]


class FactOrderItem(models.Model):
    """Grain: one order line item. Fully additive."""
    fact_key = models.BigAutoField(primary_key=True)
    order_item_id = models.BigIntegerField(unique=True)  # zesty.OrderItem.id
    # Nullable only because this field was added after existing fact_order_item
    # rows already existed; a full ETL reload backfills it immediately, and
    # every row loaded by the current ETL code always sets it.
    order_id = models.UUIDField(null=True, blank=True)  # zesty.Order.id — groups items into a basket (§8.4)

    date = models.ForeignKey(DimDate, on_delete=models.PROTECT, db_column='date_key')
    time = models.ForeignKey(DimTime, on_delete=models.PROTECT, db_column='time_key')
    customer = models.ForeignKey(DimCustomer, on_delete=models.PROTECT, db_column='customer_key')
    restaurant = models.ForeignKey(DimRestaurant, on_delete=models.PROTECT, db_column='restaurant_key')
    menu_item = models.ForeignKey(DimMenuItem, on_delete=models.PROTECT, db_column='item_key')

    quantity = models.IntegerField()
    gross_amount = models.DecimalField(max_digits=10, decimal_places=2)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    net_amount = models.DecimalField(max_digits=10, decimal_places=2)

    loaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'fact_order_item'
        indexes = [
            models.Index(fields=['date']), models.Index(fields=['menu_item']),
            models.Index(fields=['order_id']),
        ]


class FactBooking(models.Model):
    """Grain: one confirmed booking."""
    fact_key = models.BigAutoField(primary_key=True)
    booking_id = models.BigIntegerField(unique=True)  # eventra.Booking.id

    date = models.ForeignKey(DimDate, on_delete=models.PROTECT, db_column='date_key')
    time = models.ForeignKey(DimTime, on_delete=models.PROTECT, db_column='time_key')
    customer = models.ForeignKey(DimCustomer, on_delete=models.PROTECT, db_column='customer_key')
    event = models.ForeignKey(DimEvent, on_delete=models.PROTECT, db_column='event_key')
    venue = models.ForeignKey(DimVenue, on_delete=models.PROTECT, db_column='venue_key', null=True)
    payment = models.ForeignKey(DimPayment, on_delete=models.PROTECT, db_column='payment_key', null=True)

    booking_total = models.DecimalField(max_digits=12, decimal_places=2)
    seats_booked = models.IntegerField()
    lead_time_days = models.FloatField()
    is_cancelled = models.BooleanField(default=False)
    is_no_show = models.BooleanField(default=False)

    loaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'fact_booking'
        indexes = [
            models.Index(fields=['date']), models.Index(fields=['customer']),
            models.Index(fields=['event']),
        ]


class FactTicketSale(models.Model):
    """Grain: one seat sold (one row per Ticket)."""
    fact_key = models.BigAutoField(primary_key=True)
    ticket_id = models.BigIntegerField(unique=True)  # eventra.Ticket.id

    date = models.ForeignKey(DimDate, on_delete=models.PROTECT, db_column='date_key')
    time = models.ForeignKey(DimTime, on_delete=models.PROTECT, db_column='time_key')
    customer = models.ForeignKey(DimCustomer, on_delete=models.PROTECT, db_column='customer_key')
    event = models.ForeignKey(DimEvent, on_delete=models.PROTECT, db_column='event_key')
    venue = models.ForeignKey(DimVenue, on_delete=models.PROTECT, db_column='venue_key', null=True)
    ticket_type = models.ForeignKey(DimTicketType, on_delete=models.PROTECT, db_column='ticket_type_key')
    payment = models.ForeignKey(DimPayment, on_delete=models.PROTECT, db_column='payment_key', null=True)

    ticket_revenue = models.DecimalField(max_digits=10, decimal_places=2)
    convenience_fee = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    seat_tier_rank = models.SmallIntegerField()  # non-additive — 1=General .. N=highest tier
    is_no_show = models.BooleanField(default=False)

    loaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'fact_ticket_sale'
        indexes = [
            models.Index(fields=['date']), models.Index(fields=['event']),
            models.Index(fields=['ticket_type']),
        ]


class FactOrderLifecycle(models.Model):
    """Accumulating snapshot — grain: one order, one row updated in place as
    the order moves through its pipeline (placed -> confirmed -> preparing
    -> ready -> out_for_delivery -> delivered | cancelled). Built from
    zesty.OrderStatusHistory. The stage durations are what "where do orders
    get stuck?" and the delivery-time model are computed from.
    """
    fact_key = models.BigAutoField(primary_key=True)
    order_id = models.UUIDField(unique=True)  # zesty.Order.id

    date = models.ForeignKey(DimDate, on_delete=models.PROTECT, db_column='date_key')
    time = models.ForeignKey(DimTime, on_delete=models.PROTECT, db_column='time_key')
    customer = models.ForeignKey(DimCustomer, on_delete=models.PROTECT, db_column='customer_key')
    restaurant = models.ForeignKey(DimRestaurant, on_delete=models.PROTECT, db_column='restaurant_key')

    placed_at = models.DateTimeField()
    confirmed_at = models.DateTimeField(null=True, blank=True)
    preparing_at = models.DateTimeField(null=True, blank=True)
    ready_at = models.DateTimeField(null=True, blank=True)
    dispatched_at = models.DateTimeField(null=True, blank=True)  # out_for_delivery
    delivered_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)

    # Stage durations in minutes (null until both ends of the stage exist).
    accept_minutes = models.FloatField(null=True, blank=True)    # placed -> confirmed
    prep_minutes = models.FloatField(null=True, blank=True)      # confirmed -> ready
    handoff_minutes = models.FloatField(null=True, blank=True)   # ready -> dispatched
    transit_minutes = models.FloatField(null=True, blank=True)   # dispatched -> delivered
    total_minutes = models.FloatField(null=True, blank=True)     # placed -> delivered

    item_count = models.IntegerField(default=0)
    current_status = models.CharField(max_length=20)
    is_complete = models.BooleanField(default=False)  # delivered or cancelled

    loaded_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'fact_order_lifecycle'
        indexes = [
            models.Index(fields=['date']), models.Index(fields=['restaurant']),
            models.Index(fields=['current_status']),
        ]


class FactSeatInventorySnapshot(models.Model):
    """Periodic snapshot — grain: one ticket tier of one upcoming event per
    ETL day. Seats sold/held/free as of that day; the sell-out forecast and
    "how fast is this selling" trend read from the run of snapshots.
    """
    fact_key = models.BigAutoField(primary_key=True)
    snapshot_date = models.ForeignKey(DimDate, on_delete=models.PROTECT, db_column='date_key')
    event = models.ForeignKey(DimEvent, on_delete=models.PROTECT, db_column='event_key')
    ticket_type = models.ForeignKey(DimTicketType, on_delete=models.PROTECT, db_column='ticket_type_key')
    # Operational ids, denormalised so per-event reads skip the dim join.
    natural_event_id = models.BigIntegerField()  # eventra.Event.id
    natural_ticket_type_id = models.BigIntegerField()  # eventra.TicketType.id

    capacity = models.IntegerField()
    sold = models.IntegerField()
    held = models.IntegerField(default=0)
    available = models.IntegerField()
    days_to_event = models.IntegerField()

    loaded_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'fact_seat_inventory_snapshot'
        constraints = [models.UniqueConstraint(
            fields=['snapshot_date', 'natural_ticket_type_id'], name='uq_seat_snapshot_day_tier',
        )]
        indexes = [models.Index(fields=['natural_event_id'])]


class FactSearch(models.Model):
    """Grain: one logged search (core.SearchLog). Session-scoped only, never
    tied to a person (NFR-Pr1), so there is deliberately no customer key.
    """
    fact_key = models.BigAutoField(primary_key=True)
    search_log_id = models.BigIntegerField(unique=True)  # core.SearchLog.id

    date = models.ForeignKey(DimDate, on_delete=models.PROTECT, db_column='date_key')
    time = models.ForeignKey(DimTime, on_delete=models.PROTECT, db_column='time_key')

    query_text = models.CharField(max_length=255)
    normalized_query = models.CharField(max_length=255, db_index=True)
    scope = models.CharField(max_length=20, blank=True)
    vertical = models.CharField(max_length=10, default='unknown')  # zesty | eventra | unknown
    # None = logged before searches recorded whether they found anything.
    has_results = models.BooleanField(null=True, blank=True)
    clicked = models.BooleanField(default=False)

    loaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'fact_search'
        indexes = [models.Index(fields=['date'])]


class FactPayout(models.Model):
    """Grain: one restaurant settlement (zesty.Payout). Updated in place when
    a pending payout is marked paid.
    """
    fact_key = models.BigAutoField(primary_key=True)
    payout_id = models.BigIntegerField(unique=True)  # zesty.Payout.id

    restaurant = models.ForeignKey(DimRestaurant, on_delete=models.PROTECT, db_column='restaurant_key')
    period_start = models.DateField()
    period_end = models.DateField()

    order_count = models.IntegerField(default=0)
    gross_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    commission_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    net_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=10)
    created_at = models.DateTimeField()
    paid_at = models.DateTimeField(null=True, blank=True)
    days_to_pay = models.FloatField(null=True, blank=True)

    loaded_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'fact_payout'
        indexes = [models.Index(fields=['restaurant']), models.Index(fields=['status'])]
