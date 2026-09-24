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
"""
import time
import uuid

from django.core.management.base import BaseCommand
from django.utils import timezone

from warehouse.etl import extract, load
from warehouse.etl.load import DateTimeKeyCache
from warehouse.etl.audit import start_table_audit, finish_table_audit, latest_high_water_mark


class Command(BaseCommand):
    help = 'Run the nightly warehouse ETL (extract -> cleanse -> transform -> load).'

    def handle(self, *args, **options):
        run_id = uuid.uuid4()
        window_to = timezone.now()
        self.stdout.write(self.style.NOTICE(f"run_etl: run_id={run_id}"))

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

        restaurant_key_by_id = restaurants[0] if restaurants else {}
        menu_item_key_by_id = menu_items[0] if menu_items else {}
        event_key_by_id = events[0] if events else {}
        venue_key_by_id = venues[0] if venues else {}
        ticket_type_key_by_id = ticket_types[0] if ticket_types else {}

        area_city_pairs = {
            ((r.address or '').split(',')[0][:100], '') for r in all_restaurants
        }
        location_key_by_pair = load.load_locations(area_city_pairs)
        payment_key_by_method = load.load_payment_methods(extract.extract_payment_methods())

        # ---- 2. Fact-source extraction (incremental) ----
        self.stdout.write("Extracting orders/bookings (incremental)...")
        orders_hwm = latest_high_water_mark('fact_order')
        orders = extract.extract_orders(orders_hwm)
        order_items = extract.extract_order_items(orders_hwm)
        order_items_by_order = {}
        for oi in order_items:
            order_items_by_order.setdefault(oi.order_id, []).append(oi)

        bookings_hwm = latest_high_water_mark('fact_booking')
        bookings = extract.extract_bookings(bookings_hwm)
        tickets = extract.extract_tickets(bookings_hwm)

        # ---- 3. dim_customer: only for customers referenced by this window ----
        customer_ids = {o.user_id for o in orders} | {b.user_id for b in bookings}
        customers = extract.extract_customers(customer_ids) if customer_ids else []
        customer_key_by_id = load.load_customers(customers, run_id) if customers else {}
        self.stdout.write(f"Loaded {len(customer_key_by_id)} customer dimension rows.")

        dim_keys = {
            'customer': customer_key_by_id, 'restaurant': restaurant_key_by_id,
            'menu_item': menu_item_key_by_id, 'event': event_key_by_id,
            'venue': venue_key_by_id, 'ticket_type': ticket_type_key_by_id,
            'location': location_key_by_pair, 'payment': payment_key_by_method,
        }

        # ---- 4. Facts ----
        dt_cache = DateTimeKeyCache()
        self._run_table(run_id, 'fact_order', orders_hwm, window_to,
                         lambda: orders,
                         lambda rows: load.load_fact_orders(rows, order_items_by_order, dim_keys, dt_cache, run_id))
        self._run_table(run_id, 'fact_order_item', orders_hwm, window_to,
                         lambda: order_items,
                         lambda rows: load.load_fact_order_items(rows, dim_keys, dt_cache, run_id))
        self._run_table(run_id, 'fact_booking', bookings_hwm, window_to,
                         lambda: bookings,
                         lambda rows: load.load_fact_bookings(rows, dim_keys, dt_cache, run_id))
        self._run_table(run_id, 'fact_ticket_sale', bookings_hwm, window_to,
                         lambda: tickets,
                         lambda rows: load.load_fact_ticket_sales(rows, dim_keys, dt_cache, run_id))

        # ---- 5. Refresh cuboids (§8.2 stage 5: "Refresh affected cuboids only" — simplified to full refresh, see olap/cuboids.py) ----
        self.stdout.write("Refreshing cuboids...")
        from warehouse.olap.cuboids import refresh_all_cuboids
        cuboid_counts = refresh_all_cuboids()
        for name, count in cuboid_counts.items():
            self.stdout.write(f"  {name}: {count} rows")

        self.stdout.write(self.style.SUCCESS(f"run_etl done in {time.time() - t0:.1f}s (run_id={run_id})"))

    def _run_table(self, run_id, table_name, window_from, window_to, extract_fn, load_fn):
        """Extract -> load one table, wrapped in its own audit row so one
        table's failure doesn't lose bookkeeping for the tables around it,
        and doesn't stop the rest of the run either.
        """
        audit = start_table_audit(run_id, table_name, window_from, window_to)
        try:
            rows = extract_fn()
            result = load_fn(rows)
            if isinstance(result, tuple) and len(result) == 2 and isinstance(result[0], dict):
                # dimension loader: (key_map, rows_loaded)
                key_map, n_loaded = result
                finish_table_audit(audit, rows_read=len(rows), rows_rejected=0, rows_loaded=n_loaded)
                self.stdout.write(f"  {table_name}: {len(rows)} read, {n_loaded} loaded")
                return key_map, n_loaded
            else:
                # fact loader: (n_loaded, n_rejected)
                n_loaded, n_rejected = result
                finish_table_audit(audit, rows_read=len(rows), rows_rejected=n_rejected, rows_loaded=n_loaded)
                self.stdout.write(f"  {table_name}: {len(rows)} read, {n_loaded} loaded, {n_rejected} rejected")
                return n_loaded, n_rejected
        except Exception as exc:
            finish_table_audit(audit, rows_read=0, rows_rejected=0, rows_loaded=0,
                                status='failed', error_message=str(exc))
            self.stdout.write(self.style.ERROR(f"  {table_name}: FAILED — {exc}"))
            return None
