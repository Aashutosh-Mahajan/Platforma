"""OLAP endpoints (PRD §6). Internal BI surface, not customer-facing data.

Admins can query everything. Restaurant owners and event organizers get
the same operations scoped to their own rows: every query they make is
forced through a filter on their own restaurant (or event) ids, and any
filter they pass must stay inside that set. A measure that can't be
filtered that way comes back as 'unavailable' rather than unfiltered
(see queries._resolve_raw).
"""
import json

from django.db.models import Count, Max, Q, Sum
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, ValidationError

from mining.access import IsPlatformAdmin, is_admin, owned_event_ids, owned_restaurant_ids
from warehouse.olap import queries as q


class OlapPermission(IsAuthenticated):
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return is_admin(request.user) or request.user.role in ('restaurant_owner', 'event_organizer')


def _parse_dims(request, param='dimensions'):
    raw = request.query_params.get(param, '')
    return [d.strip() for d in raw.split(',') if d.strip()]


def _parse_filters(request):
    raw = request.query_params.get('filters')
    if not raw:
        return {}
    try:
        filters = json.loads(raw)
    except json.JSONDecodeError:
        raise ValidationError({'filters': 'Must be a JSON object, e.g. {"restaurant": 12}'})
    if not isinstance(filters, dict):
        raise ValidationError({'filters': 'Must be a JSON object, e.g. {"restaurant": 12}'})
    return filters


def _as_ids(value):
    values = value if isinstance(value, (list, tuple)) else [value]
    try:
        return {int(v) for v in values}
    except (TypeError, ValueError):
        raise ValidationError('Restaurant and event filters must be ids.')


def scope_dimension(user):
    """(dimension, allowed ids) a partner is confined to, or (None, None) for admins."""
    if is_admin(user):
        return None, None
    if user.role == 'restaurant_owner':
        return 'restaurant', owned_restaurant_ids(user)
    if user.role == 'event_organizer':
        return 'event', owned_event_ids(user)
    raise PermissionDenied('Only partners and admins can query the warehouse.')


def scoped(request, filters):
    dimension, allowed = scope_dimension(request.user)
    if dimension is None:
        return filters
    filters = dict(filters)
    if dimension in filters:
        requested = _as_ids(filters[dimension])
        if not requested <= allowed:
            raise PermissionDenied(f'You can only query your own {dimension}s.')
        filters[dimension] = sorted(requested)
    else:
        filters[dimension] = sorted(allowed) or [-1]  # no rows at all rather than everyone's
    return filters


def _answer(result):
    return Response(q.add_labels(result))


class OlapCatalogView(APIView):
    """GET /olap/catalog — the cuboids, measures and dimensions the caller can query."""
    permission_classes = [OlapPermission]

    def get(self, request):
        dimension, _ = scope_dimension(request.user)
        return Response({'cuboids': q.catalog(allowed_dimension=dimension), 'scoped_to': dimension})


class OlapRevenueView(APIView):
    """GET /olap/revenue?dimensions=date,restaurant&filters={"restaurant":12}"""
    permission_classes = [OlapPermission]

    def get(self, request):
        dimensions = _parse_dims(request) or ['date']
        filters = scoped(request, _parse_filters(request))
        measure = request.query_params.get('measure', 'net_revenue')
        return _answer(q.resolve(measure, dimensions, filters))


class OlapBreakdownView(APIView):
    """GET /olap/breakdown?measure=net_revenue&dimensions=restaurant,area"""
    permission_classes = [OlapPermission]

    def get(self, request):
        measure = request.query_params.get('measure')
        dimensions = _parse_dims(request)
        if not measure or not dimensions:
            raise ValidationError('measure and dimensions are required.')
        filters = scoped(request, _parse_filters(request))
        return _answer(q.resolve(measure, dimensions, filters))


class OlapSliceView(APIView):
    """GET /olap/slice?measure=net_revenue&dimension=restaurant&value=12&dimensions=date"""
    permission_classes = [OlapPermission]

    def get(self, request):
        measure = request.query_params.get('measure', 'net_revenue')
        pinned_dim = request.query_params.get('dimension')
        pinned_value = request.query_params.get('value')
        remaining = _parse_dims(request) or ['date']
        if not pinned_dim or pinned_value is None:
            raise ValidationError('dimension and value are required for a slice.')
        filters = scoped(request, {pinned_dim: pinned_value})
        return _answer(q.resolve(measure, remaining, filters))


class OlapDiceView(APIView):
    """GET /olap/dice?measure=net_revenue&dimensions=date,restaurant&filters={"area":["Bandra","Andheri"]}"""
    permission_classes = [OlapPermission]

    def get(self, request):
        measure = request.query_params.get('measure', 'net_revenue')
        dimensions = _parse_dims(request) or ['date']
        filters = scoped(request, _parse_filters(request))
        return _answer(q.op_dice(measure, dimensions, filters))


class OlapPivotView(APIView):
    """GET /olap/pivot?measure=net_revenue&row=restaurant&column=date"""
    permission_classes = [OlapPermission]

    def get(self, request):
        measure = request.query_params.get('measure', 'net_revenue')
        row_dim = request.query_params.get('row')
        col_dim = request.query_params.get('column')
        if not row_dim or not col_dim:
            raise ValidationError('row and column are required for a pivot.')
        filters = scoped(request, _parse_filters(request))
        return _answer(q.op_pivot(measure, row_dim, col_dim, filters))


class OlapCrossDomainView(APIView):
    """GET /olap/cross-domain — customers who both booked an event and
    ordered food (admin; the mined version is /insights/sequences).
    """
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        from warehouse.models import FactBooking, FactOrder
        booking_customers = set(
            FactBooking.objects.filter(is_cancelled=False).values_list('customer__customer_id', flat=True)
        )
        order_customers = set(
            FactOrder.objects.filter(is_cancelled=False).values_list('customer__customer_id', flat=True)
        )
        overlap = booking_customers & order_customers
        return Response({
            'measure': 'customer_overlap_count',
            'dimensions': [],
            'rows': [{
                'customers_with_bookings': len(booking_customers),
                'customers_with_orders': len(order_customers),
                'customers_with_both': len(overlap),
            }],
            'source_cuboid': 'raw',
        })


class WarehouseHealthView(APIView):
    """GET /olap/health — last ETL run per table, data-quality checks and
    table sizes (admin)."""
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        from config.db_routers import is_split
        from warehouse.models import (
            EtlRunAudit, DataQualityCheck, FactOrder, FactOrderItem, FactBooking, FactTicketSale,
            FactOrderLifecycle, FactSearch, FactPayout, FactSeatInventorySnapshot,
        )
        last = EtlRunAudit.objects.order_by('-started_at').first()
        tables = []
        if last:
            tables = list(
                EtlRunAudit.objects.filter(run_id=last.run_id).order_by('started_at').values(
                    'table_name', 'status', 'rows_read', 'rows_loaded', 'rows_rejected',
                    'started_at', 'ended_at', 'error_message',
                )
            )
        checks = []
        latest_check = DataQualityCheck.objects.order_by('-checked_at').first()
        if latest_check:
            checks = list(
                DataQualityCheck.objects.filter(run_id=latest_check.run_id).order_by('check_name').values(
                    'check_name', 'table_name', 'status', 'observed', 'threshold', 'message', 'checked_at',
                )
            )
        history = list(
            EtlRunAudit.objects.values('run_id').annotate(
                started=Max('started_at'), loaded=Sum('rows_loaded'), rejected=Sum('rows_rejected'),
                failed=Count('id', filter=Q(status='failed')),
            ).order_by('-started')[:10]
        )
        sizes = {
            m._meta.db_table: m.objects.count()
            for m in (FactOrder, FactOrderItem, FactBooking, FactTicketSale, FactOrderLifecycle,
                      FactSearch, FactPayout, FactSeatInventorySnapshot)
        }
        return Response({
            'separate_database': is_split(),
            'last_run': {'run_id': last.run_id, 'started_at': last.started_at} if last else None,
            'tables': tables, 'checks': checks, 'history': history, 'row_counts': sizes,
        })
