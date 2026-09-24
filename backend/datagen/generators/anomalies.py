"""Inject ~1% labelled anomalies into already-generated orders/bookings
(PRD §10) — every injected row is recorded in PlantedAnomaly so the §8.4
anomaly-mining module can be scored on precision@k against a ground truth,
not just eyeballed.

Scoped strictly to this run's own synthetic customers (matched by the
`run_tag` embedded in their synthetic email addresses) — never touches
real user data.
"""
import random
import uuid
from decimal import Decimal

from core.models import User, Payment
from zesty.models import Order
from eventra.models import Booking
from datagen.models import PlantedAnomaly
from datagen.planted import ANOMALY_RATE
from .common import payment_object_id


def inject_anomalies(run, run_tag, np_rng):
    synthetic_customers = list(User.objects.filter(
        email__contains=f".{run_tag}", role='customer'
    ))
    if not synthetic_customers:
        return 0

    orders = list(Order.objects.filter(user__in=synthetic_customers))
    bookings = list(Booking.objects.filter(user__in=synthetic_customers, status='confirmed'))

    labels = []
    injected = 0

    # ---- improbable_value: order total wildly out of line with its items ----
    n_improbable = max(1, int(len(orders) * ANOMALY_RATE * 0.4))
    for order in random.sample(orders, min(n_improbable, len(orders))):
        multiplier = Decimal(str(round(float(np_rng.uniform(15, 40)), 2)))
        original_total = order.total
        order.total = (order.total * multiplier).quantize(Decimal('0.01'))
        order.save(update_fields=['total'])
        labels.append(PlantedAnomaly(
            run=run, anomaly_type='improbable_value', target_type='order',
            target_id=str(order.id),
            details={'original_total': str(original_total), 'inflated_total': str(order.total),
                     'multiplier': str(multiplier)},
        ))
        injected += 1

    # ---- payment_retry_storm: several failed payments before one success ----
    retry_targets = [o for o in orders if o.payment_status == 'paid']
    n_storms = max(1, int(len(retry_targets) * ANOMALY_RATE * 0.3))
    storm_payments = []
    for order in random.sample(retry_targets, min(n_storms, len(retry_targets))):
        n_failed = random.randint(3, 6)
        for _ in range(n_failed):
            storm_payments.append(Payment(
                user=order.user, amount=order.total, method='credit_card',
                status='failed', transaction_id=f"SIM-{uuid.uuid4().hex[:12].upper()}",
                content_type='order', object_id=payment_object_id(order.id),
            ))
        labels.append(PlantedAnomaly(
            run=run, anomaly_type='payment_retry_storm', target_type='order',
            target_id=str(order.id), details={'failed_attempts': n_failed},
        ))
        injected += 1
    if storm_payments:
        Payment.objects.bulk_create(storm_payments, batch_size=1000)

    # ---- bulk_booking_burst: one customer, many bookings, tight time window ----
    if len(synthetic_customers) >= 5 and bookings:
        n_bursts = max(1, int(len(bookings) * ANOMALY_RATE * 0.3 / 5))
        for _ in range(n_bursts):
            burst_customer = random.choice(synthetic_customers)
            burst_sample = random.sample(bookings, min(5, len(bookings)))
            burst_ids = []
            for b in burst_sample:
                Booking.objects.filter(pk=b.pk).update(user=burst_customer)
                burst_ids.append(b.id)
            labels.append(PlantedAnomaly(
                run=run, anomaly_type='bulk_booking_burst', target_type='booking',
                target_id=str(burst_customer.id),
                details={'booking_ids': burst_ids, 'customer_id': burst_customer.id},
            ))
            injected += len(burst_ids)

    PlantedAnomaly.objects.bulk_create(labels, batch_size=500)
    return injected
