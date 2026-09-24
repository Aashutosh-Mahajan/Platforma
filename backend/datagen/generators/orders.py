"""Order + order-item generation with weekly/daily seasonality, festival
spikes, and planted basket pairs (PRD §10, §8.4).
"""
import datetime
import random
import uuid
from decimal import Decimal, ROUND_HALF_UP

from django.utils import timezone

from zesty.models import Order, OrderItem
from .common import weighted_hour, bulk_create_with_timestamps
from datagen.planted import PLANTED_ITEM_PAIRS

STATUS_CHOICES_RECENT = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery']
FESTIVAL_MONTHS = (10, 11)  # Diwali season order-volume spike


def _q2(value):
    return Decimal(value).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def _weighted_day(np_rng, start, end):
    """Bias order dates toward weekends and festival months."""
    total_days = (end - start).days
    day_offset = int(np_rng.integers(0, total_days))
    day = start + datetime.timedelta(days=day_offset)
    # Weekend boost: re-roll non-weekend days some of the time toward the nearest weekend.
    if day.weekday() < 5 and np_rng.random() < 0.35:
        shift = (5 - day.weekday()) % 7
        day = day + datetime.timedelta(days=int(shift))
        if day > end:
            day = end
    return day


def generate_orders(n_orders, restaurants, customers, np_rng, start, end):
    """Bulk-create orders and their line items.

    Returns nothing — this is the largest table by row count, so results
    are written straight to the DB in batches rather than held in memory.
    """
    restaurants_by_id = {r.id: r for r in restaurants}
    menu_items_by_restaurant = {}
    for r in restaurants:
        menu_items_by_restaurant[r.id] = list(r.menu_items.filter(is_available=True))

    trigger_names = {pair[0] for pair in PLANTED_ITEM_PAIRS}
    companion_by_trigger = {pair[0]: pair[1] for pair in PLANTED_ITEM_PAIRS}

    batch_orders = []
    batch_items = []
    BATCH_SIZE = 2000
    created_count = 0

    for _ in range(n_orders):
        restaurant = random.choice(restaurants)
        menu = menu_items_by_restaurant.get(restaurant.id) or []
        if not menu:
            continue
        customer = random.choice(customers)

        day = _weighted_day(np_rng, start, end)
        hour = weighted_hour(np_rng)
        order_dt = timezone.make_aware(datetime.datetime.combine(day, datetime.time(hour=hour, minute=random.randint(0, 59))))

        # Item selection: start from 1-3 random items, boost planted pairs.
        n_items = int(np_rng.integers(1, 4))
        chosen = random.sample(menu, min(n_items, len(menu)))
        chosen_names = {mi.name for mi in chosen}
        for mi in list(chosen):
            companion_name = companion_by_trigger.get(mi.name)
            if companion_name and companion_name not in chosen_names and np_rng.random() < 0.5:
                companion = next((x for x in menu if x.name == companion_name), None)
                if companion:
                    chosen.append(companion)
                    chosen_names.add(companion_name)

        order_id = uuid.uuid4()
        subtotal = Decimal('0.00')
        item_rows = []
        for mi in chosen:
            qty = int(np_rng.integers(1, 4))
            unit_price = mi.price
            total = _q2(unit_price * qty)
            subtotal += total
            item_rows.append(OrderItem(
                order_id=order_id, menu_item=mi, quantity=qty,
                unit_price=unit_price, total=total,
            ))

        delivery_fee = restaurant.delivery_fee
        tax = _q2(subtotal * Decimal('0.05'))
        total = subtotal + delivery_fee + tax

        # Recency-based status: older orders have settled into a terminal
        # state, very recent ones are still mid-pipeline.
        days_ago = (end - day).days
        if days_ago > 2:
            status = 'cancelled' if np_rng.random() < 0.06 else 'delivered'
        else:
            status = random.choice(STATUS_CHOICES_RECENT)

        order = Order(
            id=order_id, user=customer, restaurant=restaurant, status=status,
            delivery_address={'street': '123 Synthetic St', 'city': 'Mumbai', 'is_synthetic': True},
            subtotal=subtotal, delivery_fee=delivery_fee, tax=tax, total=total,
            special_instructions='', payment_method=random.choice(
                ['upi', 'card', 'cod', 'wallet', 'netbank']
            ),
            payment_status='paid' if status != 'cancelled' else 'refunded',
        )
        order.created_at = order_dt
        order.updated_at = order_dt

        batch_orders.append(order)
        batch_items.extend(item_rows)

        if len(batch_orders) >= BATCH_SIZE:
            bulk_create_with_timestamps(
                Order, batch_orders, ['created_at', 'updated_at'],
                create_batch_size=BATCH_SIZE, update_batch_size=BATCH_SIZE,
            )
            OrderItem.objects.bulk_create(batch_items, batch_size=BATCH_SIZE)
            created_count += len(batch_orders)
            batch_orders, batch_items = [], []

    if batch_orders:
        bulk_create_with_timestamps(
            Order, batch_orders, ['created_at', 'updated_at'],
            create_batch_size=BATCH_SIZE, update_batch_size=BATCH_SIZE,
        )
        OrderItem.objects.bulk_create(batch_items, batch_size=BATCH_SIZE)
        created_count += len(batch_orders)

    return created_count
