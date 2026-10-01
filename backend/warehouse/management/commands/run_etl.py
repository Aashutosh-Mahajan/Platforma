"""python manage.py run_etl

Nightly ETL orchestrator (PRD §8.2). Order: dimensions before facts.
Fact-source tables extract incrementally (high-water-mark from the last
successful EtlRunAudit row for that table); dimension-source tables are
small reference data and are extracted in full every run — the SCD logic
in load.py is what decides whether a re-extracted row is actually a
change, so a full reference reload never produces duplicate dim history.

Idempotent within a delta window: every fact load is `update_or_create`
keyed on its natural id, so re-running this command after a failure (or
over an overlapping window) never duplicates a fact row — it just
overwrites it with the same or newer values.

Reads from the operational database, writes to the warehouse database
(see config/db_routers.py) — the two are never joined in SQL.
"""
import time
import uuid

from django.core.management.base import BaseCommand
from django.utils import timezone

from config.db_routers import warehouse_db
from core.models import SearchLog
from eventra.models import BookingStatusHistory
from zesty.models import OrderStatusHistory
from warehouse.etl import extract, load
from warehouse.etl.load import DateTimeKeyCache
from warehouse.etl.audit import (
    start_table_audit, finish_table_audit,
    latest_high_water_mark as _latest_high_water_mark, latest_high_water_id as _latest_high_water_id,
)


class Command(BaseCommand):
    help = 'Run the nightly warehouse ETL (extract -> cleanse -> transform -> load).'

    def add_arguments(self, parser):
        parser.add_argument('--skip-quality', action='store_true', help='Skip the post-load data-quality checks.')
        parser.add_argument('--full-refresh', action='store_true',
                            help='Ignore watermarks and re-extract every fact (rows are upserted, never duplicated).')

    def handle(self, *args, **options):
        full = options.get('full_refresh')
        latest_high_water_mark = (lambda table: None) if full else _latest_high_water_mark
        latest_high_water_id = (lambda table: None) if full else _latest_high_water_id
        run_id = uuid.uuid4()
        window_to = timezone.now()
        self.stdout.write(self.style.NOTICE(f"run_etl: run_id={run_id} warehouse_db={warehouse_db()}"))

        t0 = time.time()

        # ---- 1. Reference dimensions (full reload every run) ----
        self.stdout.write("Loading reference dimensions...")
        all_restaurants = extract.extract_restaurants()
        restaurants = self._run_table(run_id, 'dim_restaurant', None, window_to,
                                       lambda: all_restaurants,
                                       lambda rows: (load.load_restaurants(rows, run_id), len(rows)))
        menu_items = self._run_table(run_id, 'dim_menu_item', None, window_to,
                                      lambda: extract.extract_menu_items(),
                                      lambda rows: (load.load_menu_items(rows, run_id), len(rows)))
        events = self._run_table(run_id, 'dim_event', None, window_to,
                                  lambda: extract.extract_events(),
                                  lambda rows: (load.load_events(rows, run_id), len(rows)))
        venues = self._run_table(run_id, 'dim_venue', None, window_to,
                                  lambda: extract.extract_venues(),
                                  lambda rows: (load.load_venues(rows, run_id), len(rows)))
        ticket_types = self._run_table(run_id, 'dim_ticket_type', None, window_to,
                                        lambda: extract.extract_ticket_types(),
                                        lambda rows: (load.load_ticket_types(rows, run_id), len(rows)))
        promotions = self._run_table(run_id, 'dim_promotion', None, window_to,
                                      lambda: extract.extract_promotions(),
                                      lambda rows: (load.load_promotions(rows), len(rows)))

        restaurant_key_by_id = restaurants[0] if restaurants else {}
        menu_item_key_by_id = menu_items[0] if menu_items else {}
        event_key_by_id = events[0] if events else {}
        venue_key_by_id = venues[0] if venues else {}
        ticket_type_key_by_id = ticket_types[0] if ticket_types else {}
        promotion_key_by_code = promotions[0] if promotions else {}

        location_key_by_area = load.load_locations(all_restaurants)
        payment_key_by_method = load.load_payment_methods(extract.extract_payment_methods())

        # ---- 2. Fact-source extraction (incremental) ----
        self.stdout.write("Extracting orders/bookings (incremental)...")
        orders_hwm = latest_high_water_mark('fact_order')
        orders = extract.extract_orders(orders_hwm)
        order_items = extract.extract_order_items(orders_hwm)
        order_items_by_order = {}
        for oi in order_items:
            order_items_by_order.setdefault(oi.order_id, []).append(oi)

        lifecycle_hwm = latest_high_water_mark('fact_order_lifecycle')
        lifecycle_hwid = latest_high_water_id('fact_order_lifecycle')
        order_history_max_id = extract.max_id(OrderStatusHistory)
        lifecycles = load.build_lifecycles(extract.extract_order_status_history(lifecycle_hwm, lifecycle_hwid))
        # Orders with no status history yet (just placed, or from before history
        # was recorded) still get a lifecycle row, so "still in progress" is
        # known for every order.
        for order in orders:
            lifecycles.setdefault(order.id, {'order': order, 'stamps': {}})

        bookings_hwm = latest_high_water_mark('fact_booking')
        bookings_hwid = latest_high_water_id('fact_booking')
        booking_history_max_id = extract.max_id(BookingStatusHistory)
        bookings = extract.extract_bookings(bookings_hwm, bookings_hwid)
        tickets = extract.extract_tickets(bookings_hwm, bookings_hwid)

        # ---- 3. dim_customer: only for customers referenced by this window ----
        customer_ids = (
            {o.user_id for o in orders} | {b.user_id for b in bookings}
            | {entry['order'].user_id for entry in lifecycles.values()}
        )
        customers = extract.extract_customers(customer_ids) if customer_ids else []
        customer_key_by_id = load.load_customers(customers, run_id) if customers else {}
        self.stdout.write(f"Loaded {len(customer_key_by_id)} customer dimension rows.")

        dim_keys = {
            'customer': customer_key_by_id, 'restaurant': restaurant_key_by_id,
            'menu_item': menu_item_key_by_id, 'event': event_key_by_id,
            'venue': venue_key_by_id, 'ticket_type': ticket_type_key_by_id,
            'location': location_key_by_area, 'payment': payment_key_by_method,
            'promotion': promotion_key_by_code,
            'booking_payment': extract.extract_booking_payment_methods() if bookings else {},
        }

        # ---- 4. Facts ----
        dt_cache = DateTimeKeyCache()
        self._run_table(run_id, 'fact_order', orders_hwm, window_to,
                         lambda: orders,
                         lambda rows: load.load_fact_orders(rows, order_items_by_order, dim_keys, dt_cache, run_id,
                                                            extract.extract_failed_order_payments()))
        self._run_table(run_id, 'fact_order_item', orders_hwm, window_to,
                         lambda: order_items,
                         lambda rows: load.load_fact_order_items(rows, dim_keys, dt_cache, run_id))

        def _load_lifecycle(rows):
            item_counts = {oid: sum(i.quantity for i in items) for oid, items in order_items_by_order.items()}
            missing = [oid for oid in rows if oid not in item_counts]
            item_counts.update(load.item_counts_from_warehouse(missing))
            loaded, rejected = load.load_fact_order_lifecycle(rows, item_counts, dim_keys, dt_cache, run_id)
            return loaded, rejected, order_history_max_id
        self._run_table(run_id, 'fact_order_lifecycle', lifecycle_hwm, window_to, lambda: lifecycles, _load_lifecycle)
        synced = load.sync_delivery_minutes()
        self.stdout.write(f"  fact_order.delivery_minutes: {synced} rows synced from lifecycle")

        self._run_table(run_id, 'fact_booking', bookings_hwm, window_to,
                         lambda: bookings,
                         lambda rows: (*load.load_fact_bookings(rows, dim_keys, dt_cache, run_id), booking_history_max_id))
        self._run_table(run_id, 'fact_ticket_sale', bookings_hwm, window_to,
                         lambda: tickets,
                         lambda rows: load.load_fact_ticket_sales(rows, dim_keys, dt_cache, run_id))

        # No-shows can only be decided after the event, usually long after
        # the booking itself was extracted.
        attendance_hwm = latest_high_water_mark('attendance')
        self._run_table(run_id, 'attendance', attendance_hwm, window_to,
                         lambda: extract.extract_attendance_changes(attendance_hwm),
                         lambda rows: (load.refresh_attendance(*rows), 0))

        search_hwid = latest_high_water_id('fact_search')
        search_max_id = extract.max_id(SearchLog)
        self._run_table(run_id, 'fact_search', None, window_to,
                         lambda: extract.extract_search_logs(search_hwid),
                         lambda rows: (*load.load_fact_search(rows, dt_cache, run_id), search_max_id))

        payouts_hwm = latest_high_water_mark('fact_payout')
        self._run_table(run_id, 'fact_payout', payouts_hwm, window_to,
                         lambda: extract.extract_payouts(payouts_hwm),
                         lambda rows: load.load_fact_payouts(rows, dim_keys, run_id))

        self._run_table(run_id, 'fact_seat_inventory_snapshot', None, window_to,
                         lambda: extract.extract_seat_inventory(),
                         lambda rows: load.load_seat_snapshots(rows, dim_keys, dt_cache, run_id))

        # ---- 5. Refresh cuboids (§8.2 stage 5: "Refresh affected cuboids only" — simplified to full refresh, see olap/cuboids.py) ----
        self.stdout.write("Refreshing cuboids...")
        from warehouse.olap.cuboids import refresh_all_cuboids
        cuboid_counts = refresh_all_cuboids()
        for name, count in cuboid_counts.items():
            self.stdout.write(f"  {name}: {count} rows")

        # ---- 6. Data quality ----
        if not options.get('skip_quality'):
            from warehouse.etl.quality import run_quality_checks
            checks = run_quality_checks(run_id)
            for check in checks:
                style = {'pass': self.style.SUCCESS, 'warn': self.style.WARNING}.get(check.status, self.style.ERROR)
                self.stdout.write(style(f"  [{check.status}] {check.check_name}: {check.message}"))

        self.stdout.write(self.style.SUCCESS(f"run_etl done in {time.time() - t0:.1f}s (run_id={run_id})"))

    def _run_table(self, run_id, table_name, window_from, window_to, extract_fn, load_fn):
        """Extract -> load one table, wrapped in its own audit row so one
        table's failure doesn't lose bookkeeping for the tables around it,
        and doesn't stop the rest of the run either.

        load_fn returns (key_map, rows_loaded) for a dimension, or
        (n_loaded, n_rejected) / (n_loaded, n_rejected, high_water_id) for
        a fact.
        """
        audit = start_table_audit(run_id, table_name, window_from, window_to)
        try:
            rows = extract_fn()
            result = load_fn(rows)
            n_read = len(rows) if not isinstance(rows, tuple) else sum(len(r) for r in rows)
            if isinstance(result, tuple) and len(result) == 2 and isinstance(result[0], dict):
                # dimension loader: (key_map, rows_loaded)
                key_map, n_loaded = result
                finish_table_audit(audit, rows_read=n_read, rows_rejected=0, rows_loaded=n_loaded)
                self.stdout.write(f"  {table_name}: {n_read} read, {n_loaded} loaded")
                return key_map, n_loaded
            # fact loader: (n_loaded, n_rejected[, high_water_id])
            n_loaded, n_rejected = result[0], result[1]
            high_water_id = result[2] if len(result) > 2 else None
            finish_table_audit(audit, rows_read=n_read, rows_rejected=n_rejected, rows_loaded=n_loaded,
                               high_water_id=high_water_id)
            self.stdout.write(f"  {table_name}: {n_read} read, {n_loaded} loaded, {n_rejected} rejected")
            return n_loaded, n_rejected
        except Exception as exc:
            finish_table_audit(audit, rows_read=0, rows_rejected=0, rows_loaded=0,
                               status='failed', error_message=str(exc))
            self.stdout.write(self.style.ERROR(f"  {table_name}: FAILED — {exc}"))
            return None
