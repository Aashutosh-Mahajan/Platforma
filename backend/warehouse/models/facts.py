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
