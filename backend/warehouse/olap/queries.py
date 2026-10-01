"""OLAP query resolver (PRD §8.3 / §6).

Five operations — slice, dice, roll-up, drill-down, pivot — all reduce to
the same underlying primitive: aggregate a measure, grouped by a set of
dimension levels, optionally filtered. What differs between them is only
how the caller frames the request:

  slice      = dice with exactly one dimension pinned to a single value
  dice       = filters on one or more dimensions (equality or IN)
  roll-up    = group by a coarser level than the source grain (e.g. day -> month)
  drill-down = group by a finer level (only valid if the source data has that grain)
  pivot      = dice/slice result reshaped into a rows x columns matrix

`resolve()` is the shared engine; the five thin wrappers below just shape
their inputs into (measure, dimensions, filters) and, for pivot, reshape
the output. The resolver always reports which cuboid it used (or 'raw' if
it fell back to the fact tables directly) in `source_cuboid`, per the
uniform response shape in PRD §6.
"""
import datetime
from django.db.models import Sum, Count
from django.utils import timezone

from warehouse.models import (
    CbDailyOutletRevenue, CbDailyItemPerformance, CbMonthlyCustomerActivity,
    CbDailyEventSales, CbHourlyDemandProfile, FactOrder, FactBooking,
)

# Each cuboid's (measure -> queryset field, dimension -> queryset field) coverage.
_CUBOID_REGISTRY = [
    {
        'name': 'cb_daily_outlet_revenue', 'vertical': 'zesty', 'model': CbDailyOutletRevenue,
        'measures': {'net_revenue': 'net_revenue', 'order_count': 'order_count'},
        'dimensions': {'date': 'date', 'restaurant': 'restaurant_id', 'area': 'area'},
    },
    {
        'name': 'cb_daily_item_performance', 'vertical': 'zesty', 'model': CbDailyItemPerformance,
        'measures': {'net_revenue': 'net_revenue', 'quantity_sold': 'quantity_sold'},
        'dimensions': {'date': 'date', 'menu_item': 'menu_item_id', 'restaurant': 'restaurant_id'},
    },
    {
        'name': 'cb_monthly_customer_activity', 'vertical': 'both', 'model': CbMonthlyCustomerActivity,
        'measures': {'total_spend': 'total_spend', 'transaction_count': 'transaction_count'},
        'dimensions': {'month': 'month', 'customer': 'customer_id', 'domain': 'domain'},
    },
    {
        'name': 'cb_daily_event_sales', 'vertical': 'eventra', 'model': CbDailyEventSales,
        'measures': {'net_revenue': 'net_revenue', 'tickets_sold': 'tickets_sold'},
        'dimensions': {'date': 'date', 'event': 'event_id', 'venue': 'venue_id', 'ticket_type': 'ticket_type_id'},
    },
    {
        'name': 'cb_hourly_demand_profile', 'vertical': 'both', 'model': CbHourlyDemandProfile,
        'measures': {'net_revenue': 'net_revenue', 'transaction_count': 'transaction_count'},
        'dimensions': {'date': 'date', 'day_part': 'day_part', 'area': 'area', 'domain': 'domain'},
    },
]


def _find_cuboid(measure, dimensions):
    """Cheapest (i.e. first, smallest-grain) cuboid whose measure and
    dimension set covers the request. None if nothing covers it.
    """
    for cuboid in _CUBOID_REGISTRY:
        if measure not in cuboid['measures']:
            continue
        if all(d in cuboid['dimensions'] for d in dimensions):
            return cuboid
    return None


def resolve(measure, dimensions, filters=None, limit=1000):
    """Core OLAP primitive. Returns the uniform §6 response shape.

    dimensions: list of dimension names (e.g. ['month', 'restaurant'])
    filters: dict of {dimension: value_or_list} — equality or IN
    """
    filters = filters or {}
    cuboid = _find_cuboid(measure, list(dimensions) + list(filters.keys()))

    if cuboid is not None:
        qs = cuboid['model'].objects.all()
        for dim, value in filters.items():
            field = cuboid['dimensions'][dim]
            if isinstance(value, (list, tuple)):
                qs = qs.filter(**{f"{field}__in": value})
            else:
                qs = qs.filter(**{field: value})

        group_fields = [cuboid['dimensions'][d] for d in dimensions]
        measure_field = cuboid['measures'][measure]
        agg = Sum(measure_field) if measure_field.endswith(('revenue', 'spend')) else Sum(measure_field)
        rows_qs = qs.values(*group_fields).annotate(value=agg).order_by()[:limit]

        rows = []
        for r in rows_qs:
            row = {dim: r[cuboid['dimensions'][dim]] for dim in dimensions}
            row[measure] = r['value']
            rows.append(row)

        return {
            'measure': measure, 'dimensions': list(dimensions), 'rows': rows,
            'source_cuboid': cuboid['name'], 'as_of': timezone.now().isoformat(),
        }

    # Fall back to computing on-demand from the raw fact tables.
    return _resolve_raw(measure, dimensions, filters, limit)


_RAW_MEASURE_SOURCES = {
    'net_revenue': (FactOrder, 'order_total', {'date': 'date__full_date', 'restaurant': 'restaurant__restaurant_id',
                                                'customer': 'customer__customer_id'}),
    'booking_revenue': (FactBooking, 'booking_total', {'date': 'date__full_date', 'event': 'event__event_id',
                                                        'customer': 'customer__customer_id'}),
}


def _unavailable(measure, dimensions):
    return {
        'measure': measure, 'dimensions': list(dimensions), 'rows': [],
        'source_cuboid': 'unavailable', 'as_of': timezone.now().isoformat(),
    }


def _resolve_raw(measure, dimensions, filters, limit):
    source = _RAW_MEASURE_SOURCES.get(measure)
    # A filter the raw source can't apply must fail closed: silently
    # dropping it would return unfiltered totals (e.g. every restaurant's
    # revenue to an owner whose scope filter didn't fit this measure).
    if source is not None and any(dim not in source[2] for dim in filters):
        source = None
    if source is None:
        return {
            'measure': measure, 'dimensions': list(dimensions), 'rows': [],
            'source_cuboid': 'unavailable', 'as_of': timezone.now().isoformat(),
        }
    model, field, dim_map = source
    qs = model.objects.all()
    for dim, value in filters.items():
        orm_field = dim_map[dim]
        if isinstance(value, (list, tuple)):
            qs = qs.filter(**{f"{orm_field}__in": value})
        else:
            qs = qs.filter(**{orm_field: value})

    group_fields = [dim_map[d] for d in dimensions if d in dim_map]
    rows_qs = qs.values(*group_fields).annotate(value=Sum(field)).order_by()[:limit]
    rows = []
    for r in rows_qs:
        row = {dim: r[dim_map[dim]] for dim in dimensions if dim in dim_map}
        row[measure] = r['value']
        rows.append(row)

    return {
        'measure': measure, 'dimensions': list(dimensions), 'rows': rows,
        'source_cuboid': 'raw', 'as_of': timezone.now().isoformat(),
    }


# ---------------------------------------------------------------------------
# The five named operations (PRD §8.3) — thin wrappers over resolve()
# ---------------------------------------------------------------------------

def op_slice(measure, pinned_dimension, pinned_value, remaining_dimensions):
    return resolve(measure, remaining_dimensions, filters={pinned_dimension: pinned_value})


def op_dice(measure, dimensions, filters):
    return resolve(measure, dimensions, filters=filters)


def op_rollup(measure, coarse_dimensions, filters=None):
    return resolve(measure, coarse_dimensions, filters=filters)


def op_drilldown(measure, fine_dimensions, filters=None):
    return resolve(measure, fine_dimensions, filters=filters)


def op_pivot(measure, row_dimension, column_dimension, filters=None):
    """Reshape a two-dimension result into {row_values, column_values, matrix}."""
    result = resolve(measure, [row_dimension, column_dimension], filters=filters)
    row_values = sorted({str(r[row_dimension]) for r in result['rows']})
    col_values = sorted({str(r[column_dimension]) for r in result['rows']})
    matrix = {rv: {cv: 0 for cv in col_values} for rv in row_values}
    for r in result['rows']:
        matrix[str(r[row_dimension])][str(r[column_dimension])] = r[measure]

    return {
        'measure': measure, 'dimensions': [row_dimension, column_dimension],
        'row_values': row_values, 'column_values': col_values, 'matrix': matrix,
        'source_cuboid': result['source_cuboid'], 'as_of': result['as_of'],
    }


# ---------------------------------------------------------------------------
# Catalog + labels (for the explorer UI)
# ---------------------------------------------------------------------------

MEASURE_LABELS = {
    'net_revenue': 'Revenue', 'order_count': 'Orders', 'quantity_sold': 'Items sold',
    'total_spend': 'Customer spend', 'transaction_count': 'Transactions', 'tickets_sold': 'Tickets sold',
    'booking_revenue': 'Booking revenue',
}
DIMENSION_LABELS = {
    'date': 'Day', 'month': 'Month', 'restaurant': 'Restaurant', 'area': 'Area', 'menu_item': 'Dish',
    'customer': 'Customer', 'domain': 'Vertical', 'event': 'Event', 'venue': 'Venue',
    'ticket_type': 'Ticket tier', 'day_part': 'Time of day',
}


def catalog(allowed_dimension=None):
    """Cuboids with their measures and dimensions. `allowed_dimension`
    ('restaurant' / 'event') limits the list to cuboids that can be scoped
    to one partner's own rows.
    """
    out = []
    for cuboid in _CUBOID_REGISTRY:
        if allowed_dimension and allowed_dimension not in cuboid['dimensions']:
            continue
        out.append({
            'name': cuboid['name'],
            'vertical': cuboid['vertical'],  # zesty | eventra | both (has a 'domain' dimension)
            'measures': [{'key': m, 'label': MEASURE_LABELS.get(m, m)} for m in cuboid['measures']],
            'dimensions': [{'key': d, 'label': DIMENSION_LABELS.get(d, d)} for d in cuboid['dimensions']],
        })
    return out


def label_lookup(dimension, values):
    """{value: display name} for id-valued dimensions; {} for the rest."""
    from warehouse.models import DimRestaurant, DimEvent, DimMenuItem, DimVenue, DimTicketType
    sources = {
        'restaurant': (DimRestaurant, 'restaurant_id', 'name', True),
        'event': (DimEvent, 'event_id', 'title', True),
        'menu_item': (DimMenuItem, 'item_id', 'item_name', True),
        'venue': (DimVenue, 'venue_id', 'venue_name', False),
        'ticket_type': (DimTicketType, 'ticket_type_id', 'class_name', True),
    }
    if dimension not in sources:
        return {}
    model, key, name, scd2 = sources[dimension]
    ids = [v for v in values if v is not None]
    qs = model.objects.filter(**{f'{key}__in': ids})
    if scd2:
        qs = qs.filter(is_current=True)
    return dict(qs.values_list(key, name))


def add_labels(result):
    """Adds '<dimension>_label' to each row (and row/column labels to a pivot)."""
    if 'rows' in result:
        for dim in result['dimensions']:
            names = label_lookup(dim, {r.get(dim) for r in result['rows']})
            if names:
                for r in result['rows']:
                    r[f'{dim}_label'] = names.get(r.get(dim), str(r.get(dim)))
    if 'matrix' in result:
        row_dim, col_dim = result['dimensions']
        for key, values in (('row_labels', (row_dim, result['row_values'])),
                            ('column_labels', (col_dim, result['column_values']))):
            dim, vals = values
            names = label_lookup(dim, {int(v) if str(v).isdigit() else v for v in vals})
            result[key] = {v: names.get(int(v) if str(v).isdigit() else v, v) for v in vals}
    return result
