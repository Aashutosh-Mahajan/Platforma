"""python manage.py verify_warehouse

Checks the warehouse against its own DoD (PRD §11, M6):
  - zero orphan foreign keys
  - exactly one current row per natural key (SCD-2 dimensions)
  - fact totals reconcile to operational totals within 0.1%

Exits non-zero if any check fails, so this is usable as a CI/deploy gate,
not just a manual sanity check.
"""
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db.models import Count, Sum

from warehouse.models import (
    DimCustomer, DimRestaurant, DimMenuItem, DimEvent, DimTicketType,
    FactOrder, FactBooking, EtlQuarantine,
)
from zesty.models import Order
from eventra.models import Booking


class Command(BaseCommand):
    help = 'Verify warehouse integrity against its DoD.'

    def handle(self, *args, **options):
        failures = []

        # ---- exactly one current row per natural key ----
        scd2_dims = [
            (DimCustomer, 'customer_id'), (DimRestaurant, 'restaurant_id'),
            (DimMenuItem, 'item_id'), (DimEvent, 'event_id'), (DimTicketType, 'ticket_type_id'),
        ]
        for model, natural_field in scd2_dims:
            dupes = (
                model.objects.filter(is_current=True)
                .values(natural_field).annotate(n=Count('*')).filter(n__gt=1)
            )
            count = dupes.count()
            if count:
                failures.append(f"{model._meta.db_table}: {count} natural keys have >1 current row")
            else:
                self.stdout.write(self.style.SUCCESS(f"OK  {model._meta.db_table}: exactly one current row per key"))

        # ---- zero orphan FKs (fact -> dim) ----
        orphan_checks = [
            ('fact_order.customer_id', FactOrder.objects.filter(customer__isnull=True).exclude(customer_id__isnull=True).count()),
            ('fact_order.restaurant_id', FactOrder.objects.filter(restaurant__isnull=True).exclude(restaurant_id__isnull=True).count()),
            ('fact_booking.customer_id', FactBooking.objects.filter(customer__isnull=True).exclude(customer_id__isnull=True).count()),
            ('fact_booking.event_id', FactBooking.objects.filter(event__isnull=True).exclude(event_id__isnull=True).count()),
        ]
        for label, n in orphan_checks:
            if n:
                failures.append(f"{label}: {n} rows point at a non-existent dimension row")
            else:
                self.stdout.write(self.style.SUCCESS(f"OK  {label}: no orphans"))

        # ---- fact totals reconcile to operational totals within 0.1% ----
        # Rows the cleanse stage legitimately quarantined (bad data, not a
        # pipeline defect) are excluded from the "expected" baseline here —
        # otherwise this check would fail every time the ETL is correctly
        # doing its job of rejecting bad rows. A quarantined row is still
        # visible in EtlQuarantine for its own audit trail; it's just not
        # double-counted as a reconciliation failure too.
        #
        # EtlQuarantine is an append-only history, so a row quarantined by
        # an earlier run and successfully loaded by a later one still has
        # an old quarantine record sitting around — exclude only ids that
        # are quarantined AND still have no fact row today, or a resolved
        # row would get wrongly subtracted from the operational baseline.
        loaded_order_ids = set(str(i) for i in FactOrder.objects.values_list('order_id', flat=True))
        loaded_booking_ids = set(str(i) for i in FactBooking.objects.values_list('booking_id', flat=True))

        quarantined_order_ids = set(
            EtlQuarantine.objects.filter(table_name='fact_order').values_list('source_pk', flat=True)
        ) - loaded_order_ids
        quarantined_booking_ids = set(
            EtlQuarantine.objects.filter(table_name='fact_booking').values_list('source_pk', flat=True)
        ) - loaded_booking_ids
        if quarantined_order_ids:
            self.stdout.write(self.style.WARNING(
                f"NOTE  {len(quarantined_order_ids)} order(s) are quarantined (excluded from reconciliation baseline) — see EtlQuarantine"
            ))
        if quarantined_booking_ids:
            self.stdout.write(self.style.WARNING(
                f"NOTE  {len(quarantined_booking_ids)} booking(s) are quarantined (excluded from reconciliation baseline) — see EtlQuarantine"
            ))

        op_order_total = (
            Order.objects.exclude(status='cancelled').exclude(id__in=quarantined_order_ids)
            .aggregate(t=Sum('total'))['t'] or Decimal('0')
        )
        wh_order_total = FactOrder.objects.filter(is_cancelled=False).aggregate(t=Sum('order_total'))['t'] or Decimal('0')
        self._check_reconciliation('order totals', op_order_total, wh_order_total, failures)

        op_booking_total = (
            Booking.objects.exclude(status='cancelled').exclude(id__in=[int(i) for i in quarantined_booking_ids])
            .aggregate(t=Sum('total'))['t'] or Decimal('0')
        )
        wh_booking_total = FactBooking.objects.filter(is_cancelled=False).aggregate(t=Sum('booking_total'))['t'] or Decimal('0')
        self._check_reconciliation('booking totals', op_booking_total, wh_booking_total, failures)

        op_order_count = Order.objects.exclude(id__in=quarantined_order_ids).count()
        wh_order_count = FactOrder.objects.count()
        if op_order_count != wh_order_count:
            failures.append(
                f"order row count mismatch: {op_order_count} operational (excluding quarantined) vs "
                f"{wh_order_count} in fact_order (expected equal — every non-quarantined order should "
                f"have exactly one fact row, including cancelled ones)"
            )
        else:
            self.stdout.write(self.style.SUCCESS(f"OK  order row count matches (excluding quarantined): {op_order_count}"))

        if failures:
            self.stdout.write(self.style.ERROR(f"\n{len(failures)} FAILURE(S):"))
            for f in failures:
                self.stdout.write(self.style.ERROR(f"  - {f}"))
            raise SystemExit(1)

        self.stdout.write(self.style.SUCCESS("\nAll warehouse integrity checks passed."))

    def _check_reconciliation(self, label, op_total, wh_total, failures):
        op_total = Decimal(op_total)
        wh_total = Decimal(wh_total)
        if op_total == 0:
            pct_diff = Decimal('0') if wh_total == 0 else Decimal('100')
        else:
            pct_diff = abs(op_total - wh_total) / op_total * 100

        if pct_diff > Decimal('0.1'):
            failures.append(
                f"{label}: operational={op_total} warehouse={wh_total} "
                f"diff={pct_diff:.4f}% (exceeds 0.1% tolerance)"
            )
        else:
            self.stdout.write(self.style.SUCCESS(
                f"OK  {label}: operational={op_total} warehouse={wh_total} diff={pct_diff:.4f}%"
            ))
