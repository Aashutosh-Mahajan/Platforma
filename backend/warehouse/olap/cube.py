"""Hierarchical OLAP cube over the fact tables.

Where queries.py answers fixed questions from pre-aggregated cuboids, this
module lets the admin console walk the dimension hierarchies themselves:

  time       year -> quarter -> month -> day
  location   city -> zone -> area           (zone comes through dim_zone:
                                             the snowflaked branch)
  restaurant price band -> restaurant
  day part   part of day -> hour
  weekday    weekday/weekend -> day name
  payment    method
  event      category -> genre -> event     (bookings)
  venue      city -> area -> venue          (bookings)

A request names a fact, a measure, the level on the rows (and optionally on
the columns), and filters as {level: [members]}. The five OLAP operations
are then just moves between requests:

  roll-up     rows move to a coarser level of the same hierarchy
  drill-down  rows move to a finer level, filtered to the member clicked
  slice       one dimension pinned to a single member
  dice        two or more dimensions restricted to sets of members
  pivot       rows and columns swap

Every member is a string (a month is '2026-05', a quarter '2026-Q2') so a
member clicked in the UI can be sent straight back as a filter.
"""
import datetime

from django.db.models import Avg, Count, Q, Sum

from warehouse.models import FactBooking, FactOrder

QUARTER = lambda r: f"{r['date__year']}-Q{r['date__quarter']}"  # noqa: E731
MONTH = lambda r: f"{r['date__year']}-{r['date__month']:02d}"  # noqa: E731


def _quarter_q(v):
    y, q = v.split('-Q')
    return Q(date__year=int(y), date__quarter=int(q))


def _month_q(v):
    y, m = v.split('-')
    return Q(date__year=int(y), date__month=int(m))


def _bool_q(field):
    return lambda v: Q(**{field: v == 'Weekend'})


def level(label, fields, member=None, q=None, order=None):
    """fields: ORM paths grouped on; member: row -> member string;
    q: member string -> Q filter."""
    field = fields[0]
    return {
        'label': label, 'fields': fields,
        'member': member or (lambda r: '' if r[field] is None else str(r[field])),
        'q': q or (lambda v: Q(**{field: v})),
        'order': order,
    }


TIME = [
    ('year', level('Year', ['date__year'], q=lambda v: Q(date__year=int(v)))),
    ('quarter', level('Quarter', ['date__year', 'date__quarter'], QUARTER, _quarter_q)),
    ('month', level('Month', ['date__year', 'date__month'], MONTH, _month_q)),
    ('day', level('Day', ['date__full_date'], q=lambda v: Q(date__full_date=datetime.date.fromisoformat(v)))),
]
WEEKDAY = [
    ('week_part', level('Weekday / weekend', ['date__is_weekend'],
                        lambda r: 'Weekend' if r['date__is_weekend'] else 'Weekday', _bool_q('date__is_weekend'))),
    ('day_name', level('Day of week', ['date__day_name', 'date__day_of_week'], order='date__day_of_week')),
]
DAY_PART = [
    ('day_part', level('Part of day', ['time__day_part'])),
    ('hour', level('Hour', ['time__hour'], q=lambda v: Q(time__hour=int(v)), order='time__hour')),
]
PAYMENT = [('payment', level('Payment method', ['payment__method']))]

CUBES = {
    'orders': {
        'label': 'Zesty orders (fact_order)', 'model': FactOrder, 'live': Q(is_cancelled=False),
        'measures': {
            'revenue': ('Revenue (Rs)', Sum('order_total')), 'orders': ('Orders', Count('fact_key')),
            'avg_order_value': ('Average order value (Rs)', Avg('order_total')),
            'items': ('Items sold', Sum('item_count')), 'discount': ('Discounts (Rs)', Sum('discount_total')),
            'avg_delivery': ('Average delivery (min)', Avg('delivery_minutes')),
        },
        'dimensions': {
            'time': ('Time', TIME),
            'location': ('Location', [
                ('city', level('City', ['location__zone_ref__city'])),
                ('zone', level('Zone', ['location__zone_ref__zone'])),
                ('area', level('Area', ['location__area'])),
            ]),
            'restaurant': ('Restaurant', [
                ('price_band', level('Price band', ['restaurant__price_band'])),
                ('restaurant', level('Restaurant', ['restaurant__name'])),
            ]),
            'day_part': ('Time of day', DAY_PART),
            'weekday': ('Day of week', WEEKDAY),
            'payment': ('Payment', PAYMENT),
        },
    },
    'bookings': {
        'label': 'Eventra bookings (fact_booking)', 'model': FactBooking, 'live': Q(is_cancelled=False),
        'measures': {
            'revenue': ('Revenue (Rs)', Sum('booking_total')), 'bookings': ('Bookings', Count('fact_key')),
            'seats': ('Seats', Sum('seats_booked')), 'avg_booking': ('Average booking (Rs)', Avg('booking_total')),
            'lead_time': ('Average lead time (days)', Avg('lead_time_days')),
        },
        'dimensions': {
            'time': ('Time', TIME),
            'venue': ('Venue', [
                ('city', level('City', ['venue__city'])),
                ('area', level('Area', ['venue__zone'])),
                ('venue', level('Venue', ['venue__venue_name'])),
            ]),
            'event': ('Event', [
                ('category', level('Category', ['event__category'])),
                ('genre', level('Genre', ['event__genre'])),
                ('event', level('Event', ['event__title'])),
            ]),
            'day_part': ('Time of day', DAY_PART),
            'weekday': ('Day of week', WEEKDAY),
            'payment': ('Payment', PAYMENT),
        },
    },
}


def find_level(cube, key):
    """'time.month' -> (dimension, index in hierarchy, level dict)."""
    dim, _, lvl = key.partition('.')
    if dim not in cube['dimensions']:
        raise ValueError(f'Unknown dimension {dim!r}.')
    for i, (name, spec) in enumerate(cube['dimensions'][dim][1]):
        if name == lvl:
            return dim, i, spec
    raise ValueError(f'Unknown level {key!r}.')


def catalog():
    return {
        name: {
            'label': cube['label'],
            'measures': [{'key': k, 'label': v[0]} for k, v in cube['measures'].items()],
            'dimensions': [
                {'key': d, 'label': label, 'levels': [{'key': f"{d}.{n}", 'label': s['label']} for n, s in levels]}
                for d, (label, levels) in cube['dimensions'].items()
            ],
        }
        for name, cube in CUBES.items()
    }


def _sql(cube, measure, levels, filters):
    table = cube['model']._meta.db_table
    group = ', '.join(f for lv in levels for f in lv['fields'])
    where = ' AND '.join(f"{k} IN ({', '.join(repr(v) for v in vs)})" for k, vs in filters.items()) or 'TRUE'
    agg = cube['measures'][measure][1]
    return (f"SELECT {group}, {agg.name.upper()}({agg.source_expressions[0].name}) AS {measure}\n"
            f"FROM {table} JOIN dimension tables ON surrogate keys\n"
            f"WHERE NOT is_cancelled AND {where}\nGROUP BY {group};")


def query(fact, measure, rows, cols=None, filters=None, limit=400):
    cube = CUBES.get(fact)
    if cube is None:
        raise ValueError('Unknown fact.')
    if measure not in cube['measures']:
        raise ValueError('Unknown measure.')
    filters = filters or {}
    row_dim, row_i, row_lv = find_level(cube, rows)
    col_lv = None
    if cols:
        col_dim, col_i, col_lv = find_level(cube, cols)
        if col_dim == row_dim:
            raise ValueError('Rows and columns must come from different dimensions.')

    qs = cube['model'].objects.filter(cube['live'])
    for key, members in filters.items():
        _, _, lv = find_level(cube, key)
        members = members if isinstance(members, (list, tuple)) else [members]
        cond = Q()
        for m in members:
            cond |= lv['q'](str(m))
        qs = qs.filter(cond)

    levels = [row_lv] + ([col_lv] if col_lv else [])
    fields = [f for lv in levels for f in lv['fields']]
    agg = cube['measures'][measure][1]
    data = list(qs.values(*fields).annotate(value=agg).order_by())

    def ordered(lv, rows_):
        keyed = {}
        for r in rows_:
            m = lv['member'](r)
            sort_key = r[lv['order']] if lv['order'] else m
            keyed.setdefault(m, sort_key)
        return [m for m, _ in sorted(keyed.items(), key=lambda kv: (kv[1] is None, kv[1]))]

    def num(v):
        return float(v) if v is not None else 0.0

    hierarchy = cube['dimensions'][row_dim][1]
    out = {
        'fact': fact, 'measure': measure, 'measure_label': cube['measures'][measure][0],
        'rows': rows, 'rows_label': row_lv['label'], 'cols': cols, 'cols_label': col_lv['label'] if col_lv else None,
        'filters': filters,
        'can_drill': row_i + 1 < len(hierarchy), 'can_roll_up': row_i > 0,
        'finer': f"{row_dim}.{hierarchy[row_i + 1][0]}" if row_i + 1 < len(hierarchy) else None,
        'coarser': f"{row_dim}.{hierarchy[row_i - 1][0]}" if row_i > 0 else None,
        'sql': _sql(cube, measure, levels, filters),
        'additive': measure not in ('avg_order_value', 'avg_delivery', 'avg_booking', 'lead_time'),
    }
    if col_lv is None:
        members = ordered(row_lv, data)
        values = {}
        for r in data:
            values[row_lv['member'](r)] = num(r['value'])
        out['row_members'] = members[:limit]
        out['values'] = [{'member': m, 'value': values.get(m, 0.0)} for m in members[:limit]]
        out['total'] = sum(values.values()) if out['additive'] else None
    else:
        row_members, col_members = ordered(row_lv, data), ordered(col_lv, data)
        matrix = {}
        for r in data:
            matrix.setdefault(row_lv['member'](r), {})[col_lv['member'](r)] = num(r['value'])
        out['row_members'] = row_members[:limit]
        out['col_members'] = col_members[:60]
        out['matrix'] = {rm: matrix.get(rm, {}) for rm in out['row_members']}
        if out['additive']:
            out['row_totals'] = {rm: sum(matrix.get(rm, {}).values()) for rm in out['row_members']}
            out['col_totals'] = {cm: sum(matrix.get(rm, {}).get(cm, 0) for rm in row_members) for cm in out['col_members']}
            out['total'] = sum(out['row_totals'].values())
    return out
