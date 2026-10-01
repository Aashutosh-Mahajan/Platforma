"""Post-load data-quality checks, persisted to etl_data_quality_check.

`verify_warehouse` is the strict DoD gate (exits non-zero for CI); these
checks run at the end of every ETL and are kept as history so the admin
console can show *when* something started drifting. Each check compares
the warehouse against the operational database or against itself:

  reconcile_*        row counts / totals vs the operational source
  freshness_*        how far the newest fact lags the newest source row
  null_rate_*        share of facts missing an optional dimension key
  negative_amounts   any fact with a negative money measure
  scd_current_rows   more than one current row per natural key
  cuboid_consistency cuboid totals vs the facts they summarise
  quarantine_rate    share of this run's rows rejected by the cleanse stage
"""
from decimal import Decimal

from django.db.models import Count, Max, Q, Sum
from django.utils import timezone

from warehouse.models import (
    DataQualityCheck, EtlQuarantine, EtlRunAudit,
    DimCustomer, DimRestaurant, DimMenuItem, DimEvent, DimTicketType,
    FactOrder, FactOrderItem, FactBooking, FactTicketSale, FactOrderLifecycle,
    CbDailyOutletRevenue,
)


def _pct(part, whole):
    return 0.0 if not whole else round(float(part) / float(whole) * 100, 4)


def _status(observed, warn_at, fail_at=None):
    if fail_at is not None and observed > fail_at:
        return 'fail'
    if observed > warn_at:
        return 'warn'
    return 'pass'


def run_quality_checks(run_id):
    from zesty.models import Order
    from eventra.models import Booking

    results = []

    def record(name, table, status, observed=None, threshold=None, message=''):
        results.append(DataQualityCheck(
            run_id=run_id, check_name=name, table_name=table, status=status,
            observed=observed, threshold=threshold, message=message[:255],
        ))

    # ---- reconciliation (row counts, quarantined rows excluded) ----
    # EtlQuarantine is append-only: a row rejected once and loaded by a later
    # run still has its old quarantine record, so only ids that are
    # quarantined AND still missing from the facts count as excluded.
    quarantined_orders = set(
        EtlQuarantine.objects.filter(table_name='fact_order').values_list('source_pk', flat=True)
    ) - {str(i) for i in FactOrder.objects.values_list('order_id', flat=True)}
    quarantined_bookings = set(
        EtlQuarantine.objects.filter(table_name='fact_booking').values_list('source_pk', flat=True)
    ) - {str(i) for i in FactBooking.objects.values_list('booking_id', flat=True)}
    for name, table, op_count, wh_count, quarantined in (
        ('reconcile_orders', 'fact_order', Order.objects.count(), FactOrder.objects.count(), quarantined_orders),
        ('reconcile_bookings', 'fact_booking', Booking.objects.count(), FactBooking.objects.count(), quarantined_bookings),
    ):
        expected = max(0, op_count - len(quarantined))
        gap = _pct(abs(expected - wh_count), expected)
        record(name, table, _status(gap, 0.1, 1.0), gap, 0.1,
               f"{wh_count} in warehouse vs {expected} expected ({op_count} source, {len(quarantined)} quarantined)")

    op_total = Order.objects.exclude(status='cancelled').aggregate(t=Sum('total'))['t'] or Decimal('0')
    wh_total = FactOrder.objects.filter(is_cancelled=False).aggregate(t=Sum('order_total'))['t'] or Decimal('0')
    gap = _pct(abs(op_total - wh_total), op_total)
    record('reconcile_order_value', 'fact_order', _status(gap, 0.1, 1.0), gap, 0.1,
           f"warehouse {wh_total} vs source {op_total}")

    # ---- freshness ----
    newest_source = Order.objects.aggregate(m=Max('created_at'))['m']
    newest_fact = FactOrder.objects.aggregate(m=Max('date__full_date'))['m']
    if newest_source and newest_fact:
        lag_days = max(0, (timezone.localtime(newest_source).date() - newest_fact).days)
        record('freshness_orders', 'fact_order', _status(lag_days, 1, 3), lag_days, 1,
               f"newest fact {newest_fact}, newest source order {timezone.localtime(newest_source).date()}")
    elif newest_source:
        record('freshness_orders', 'fact_order', 'fail', None, 1, 'source has orders but the warehouse has none')

    # ---- null rates on optional keys ----
    n_orders = FactOrder.objects.count()
    if n_orders:
        missing_payment = FactOrder.objects.filter(payment__isnull=True).count()
        rate = _pct(missing_payment, n_orders)
        record('null_rate_order_payment', 'fact_order', _status(rate, 5, 25), rate, 5,
               f"{missing_payment} orders without a payment method")
        missing_location = FactOrder.objects.filter(location__isnull=True).count()
        rate = _pct(missing_location, n_orders)
        record('null_rate_order_location', 'fact_order', _status(rate, 5, 25), rate, 5,
               f"{missing_location} orders without a location")

    # ---- negative money ----
    negatives = (
        FactOrder.objects.filter(Q(order_total__lt=0) | Q(discount_total__lt=0)).count()
        + FactOrderItem.objects.filter(net_amount__lt=0).count()
        + FactBooking.objects.filter(booking_total__lt=0).count()
        + FactTicketSale.objects.filter(ticket_revenue__lt=0).count()
    )
    record('negative_amounts', 'facts', 'fail' if negatives else 'pass', negatives, 0,
           f"{negatives} fact rows with a negative amount")

    # ---- SCD-2: exactly one current row per natural key ----
    duplicate_keys = 0
    for model, natural in ((DimCustomer, 'customer_id'), (DimRestaurant, 'restaurant_id'),
                           (DimMenuItem, 'item_id'), (DimEvent, 'event_id'), (DimTicketType, 'ticket_type_id')):
        duplicate_keys += (
            model.objects.filter(is_current=True).values(natural).annotate(n=Count('*')).filter(n__gt=1).count()
        )
    record('scd_current_rows', 'dimensions', 'fail' if duplicate_keys else 'pass', duplicate_keys, 0,
           f"{duplicate_keys} natural keys with more than one current row")

    # ---- cuboid consistency ----
    cuboid_total = CbDailyOutletRevenue.objects.aggregate(t=Sum('net_revenue'))['t'] or Decimal('0')
    gap = _pct(abs(cuboid_total - wh_total), wh_total)
    record('cuboid_consistency', 'cb_daily_outlet_revenue', _status(gap, 0.01, 0.5), gap, 0.01,
           f"cuboid {cuboid_total} vs facts {wh_total}")

    # ---- status-history coverage ----
    # Every order has a lifecycle row; this measures how many have at least
    # one recorded status change (without them, stage timings are empty).
    if n_orders:
        with_history = FactOrderLifecycle.objects.filter(
            Q(confirmed_at__isnull=False) | Q(cancelled_at__isnull=False) | Q(delivered_at__isnull=False)
        ).count()
        coverage = _pct(with_history, n_orders)
        record('lifecycle_coverage', 'fact_order_lifecycle', 'warn' if coverage < 50 else 'pass', coverage, 50,
               f"{with_history} of {n_orders} orders have status history")

    # ---- this run's rejection rate ----
    audits = EtlRunAudit.objects.filter(run_id=run_id)
    read = audits.aggregate(n=Sum('rows_read'))['n'] or 0
    rejected = audits.aggregate(n=Sum('rows_rejected'))['n'] or 0
    failed_tables = list(audits.filter(status='failed').values_list('table_name', flat=True))
    rate = _pct(rejected, read)
    record('quarantine_rate', 'all', _status(rate, 1, 5), rate, 1, f"{rejected} of {read} rows rejected this run")
    record('table_loads', 'all', 'fail' if failed_tables else 'pass', len(failed_tables), 0,
           ('failed: ' + ', '.join(failed_tables)) if failed_tables else 'every table loaded')

    DataQualityCheck.objects.bulk_create(results)
    return results
