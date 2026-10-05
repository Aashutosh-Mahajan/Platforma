"""Warehouse schema, read from the models themselves.

Lists every fact, dimension and cuboid table with its columns, keys,
measures and row count, and groups them into the schema patterns the
warehouse uses:

  star            fact_order with its dimensions, one join away
  snowflake       fact_order -> dim_location -> dim_zone: the location
                  hierarchy normalised into its own table
  constellation   several fact tables sharing conformed dimensions
                  (dim_date, dim_time, dim_customer, dim_payment)
  data marts      the Zesty and Eventra subject areas

`oltp_vs_olap` asks one business question three ways (operational tables,
fact + dimensions, pre-aggregated cuboid) and times each.
"""
import time

from django.db import models
from django.db.models import Count, Max, Sum
from django.db.models.functions import TruncMonth

from warehouse import models as wm

FACTS = [wm.FactOrder, wm.FactOrderItem, wm.FactOrderLifecycle, wm.FactPayout, wm.FactBooking,
         wm.FactTicketSale, wm.FactSeatInventorySnapshot, wm.FactSearch]
DIMENSIONS = [wm.DimDate, wm.DimTime, wm.DimCustomer, wm.DimPayment, wm.DimLocation, wm.DimZone,
              wm.DimRestaurant, wm.DimMenuItem, wm.DimPromotion, wm.DimEvent, wm.DimVenue, wm.DimTicketType]
CUBOIDS = [wm.CbDailyOutletRevenue, wm.CbDailyItemPerformance, wm.CbMonthlyCustomerActivity,
           wm.CbDailyEventSales, wm.CbHourlyDemandProfile]

GRAIN = {
    'fact_order': 'One order', 'fact_order_item': 'One line of an order', 'fact_order_lifecycle':
    'One order, updated as it moves (accumulating snapshot)', 'fact_payout': 'One restaurant settlement',
    'fact_booking': 'One event booking', 'fact_ticket_sale': 'One seat sold',
    'fact_seat_inventory_snapshot': 'One ticket tier per day (periodic snapshot)', 'fact_search': 'One search',
}
SCD = {
    'dim_customer': 'SCD 2', 'dim_restaurant': 'SCD 2', 'dim_menu_item': 'SCD 2', 'dim_event': 'SCD 2',
    'dim_ticket_type': 'SCD 2', 'dim_location': 'SCD 1', 'dim_venue': 'SCD 1', 'dim_payment': 'SCD 1',
    'dim_promotion': 'SCD 1', 'dim_date': 'SCD 0', 'dim_time': 'SCD 0', 'dim_zone': 'SCD 0',
}
MARTS = {
    'Zesty (food) mart': ['fact_order', 'fact_order_item', 'fact_order_lifecycle', 'fact_payout',
                          'dim_restaurant', 'dim_menu_item', 'dim_promotion', 'dim_location', 'dim_zone',
                          'cb_daily_outlet_revenue', 'cb_daily_item_performance'],
    'Eventra (events) mart': ['fact_booking', 'fact_ticket_sale', 'fact_seat_inventory_snapshot',
                              'dim_event', 'dim_venue', 'dim_ticket_type', 'cb_daily_event_sales'],
    'Shared (conformed)': ['dim_date', 'dim_time', 'dim_customer', 'dim_payment', 'fact_search',
                           'cb_monthly_customer_activity', 'cb_hourly_demand_profile'],
}


def _kind(field):
    if isinstance(field, models.ForeignKey):
        return 'fk'
    if field.primary_key:
        return 'pk'
    if isinstance(field, (models.DecimalField, models.FloatField)) or (
            isinstance(field, models.IntegerField) and not field.name.endswith('_id')):
        return 'measure'
    return 'attribute'


def table(model, role):
    fields = []
    for f in model._meta.concrete_fields:
        kind = _kind(f)
        if role != 'fact' and kind == 'measure':
            kind = 'attribute'
        fields.append({
            'name': f.column, 'type': f.get_internal_type().replace('Field', ''), 'kind': kind,
            'references': f.related_model._meta.db_table if kind == 'fk' else None,
        })
    return {
        'name': model._meta.db_table, 'role': role, 'rows': model.objects.count(),
        'grain': GRAIN.get(model._meta.db_table, ''), 'scd': SCD.get(model._meta.db_table, ''),
        'doc': (model.__doc__ or '').strip().split('\n')[0],
        'fields': fields,
    }


def schema():
    tables = ([table(m, 'fact') for m in FACTS] + [table(m, 'dimension') for m in DIMENSIONS]
              + [table(m, 'cuboid') for m in CUBOIDS])
    by_name = {t['name']: t for t in tables}
    shared = {}
    for t in tables:
        if t['role'] != 'fact':
            continue
        for f in t['fields']:
            if f['references']:
                shared.setdefault(f['references'], []).append(t['name'])
    star_dims = [f['references'] for f in by_name['fact_order']['fields'] if f['references']]
    return {
        'tables': tables,
        'patterns': {
            'star': {'fact': 'fact_order', 'dimensions': star_dims,
                     'note': 'Every dimension is one join from the fact table; denormalised for fast queries.'},
            'snowflake': {'fact': 'fact_order', 'chain': ['fact_order', 'dim_location', 'dim_zone'],
                          'note': "The location hierarchy is normalised: an area points to its zone, the zone "
                                  "carries the district, city and state. Saves repetition, costs one more join."},
            'constellation': {'facts': [t['name'] for t in tables if t['role'] == 'fact'],
                              'shared_dimensions': {d: fs for d, fs in shared.items() if len(fs) > 1},
                              'note': 'Several fact tables share conformed dimensions, so food and event '
                                      'activity can be compared on the same calendar and the same customers.'},
        },
        'marts': [{'name': n, 'tables': ts, 'rows': sum(by_name[t]['rows'] for t in ts if t in by_name)}
                  for n, ts in MARTS.items()],
        'etl': etl_status(),
    }


def etl_status():
    latest = (wm.EtlRunAudit.objects.values('table_name')
              .annotate(last=Max('started_at'), loaded=Sum('rows_loaded'), rejected=Sum('rows_rejected'),
                        read=Sum('rows_read'), runs=Count('run_id', distinct=True)).order_by('table_name'))
    return {
        'stages': [
            {'stage': 'Extract', 'detail': 'Incremental reads from the operational Postgres (high-water marks).'},
            {'stage': 'Cleanse', 'detail': 'Validation rules; failing rows go to etl_quarantine with the rule.'},
            {'stage': 'Transform', 'detail': 'Surrogate keys, bands (price, rating, tenure), day parts, gazetteer zones.'},
            {'stage': 'Load', 'detail': 'SCD 1/2 dimensions first, then facts upserted on natural keys.'},
            {'stage': 'Aggregate', 'detail': 'Cuboids (pre-computed summaries) refreshed for fast OLAP.'},
            {'stage': 'Verify', 'detail': 'Data-quality checks: reconciliation, nulls, freshness.'},
        ],
        'tables': list(latest),
        'quarantined': wm.EtlQuarantine.objects.count(),
    }


def oltp_vs_olap():
    """'Revenue by area per month' asked three ways, timed."""
    from zesty.models import Order

    def timed(fn):
        t0 = time.perf_counter()
        rows = fn()
        return rows, (time.perf_counter() - t0) * 1000

    oltp, oltp_ms = timed(lambda: list(
        Order.objects.exclude(status='cancelled').annotate(month=TruncMonth('created_at'))
        .values('restaurant__area', 'month').annotate(revenue=Sum('total'))))
    star, star_ms = timed(lambda: list(
        wm.FactOrder.objects.filter(is_cancelled=False)
        .values('location__area', 'date__year', 'date__month').annotate(revenue=Sum('order_total'))))
    cube, cube_ms = timed(lambda: list(
        wm.CbDailyOutletRevenue.objects.annotate(month=TruncMonth('date'))
        .values('area', 'month').annotate(revenue=Sum('net_revenue'))))
    return {
        'question': 'Revenue by area, per month',
        'runs': [
            {'source': 'OLTP: operational tables', 'tables': 'orders JOIN restaurants',
             'rows_scanned': Order.objects.count(), 'result_rows': len(oltp), 'ms': oltp_ms,
             'note': 'Normalised for writes; every report re-joins and re-aggregates live order rows.'},
            {'source': 'OLAP: star schema', 'tables': 'fact_order JOIN dim_location, dim_date',
             'rows_scanned': wm.FactOrder.objects.count(), 'result_rows': len(star), 'ms': star_ms,
             'note': 'Read-optimised copy, separate database, same answer without touching the live app.'},
            {'source': 'OLAP: cuboid (pre-aggregated)', 'tables': 'cb_daily_outlet_revenue',
             'rows_scanned': wm.CbDailyOutletRevenue.objects.count(), 'result_rows': len(cube), 'ms': cube_ms,
             'note': 'Summed once per night; a report reads a few thousand rows instead of every order.'},
        ],
    }
