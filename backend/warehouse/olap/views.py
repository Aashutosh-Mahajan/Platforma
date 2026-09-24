"""OLAP endpoints (PRD §6). All require staff/admin or partner-role access
— this is internal BI surface, not customer-facing data.
"""
import json
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError

from warehouse.olap import queries as q


class OlapPermission(IsAuthenticated):
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return request.user.is_staff or request.user.role in (
            'admin', 'restaurant_owner', 'event_organizer'
        )


def _parse_dims(request, param='dimensions'):
    raw = request.query_params.get(param, '')
    return [d.strip() for d in raw.split(',') if d.strip()]


def _parse_filters(request):
    raw = request.query_params.get('filters')
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        raise ValidationError({'filters': 'Must be a JSON object, e.g. {"restaurant": 12}'})


class OlapRevenueView(APIView):
    """GET /olap/revenue?dimensions=date,restaurant&filters={"restaurant":12}"""
    permission_classes = [OlapPermission]

    def get(self, request):
        dimensions = _parse_dims(request) or ['date']
        filters = _parse_filters(request)
        measure = request.query_params.get('measure', 'net_revenue')
        return Response(q.resolve(measure, dimensions, filters))


class OlapBreakdownView(APIView):
    """GET /olap/breakdown?measure=net_revenue&dimensions=restaurant,area"""
    permission_classes = [OlapPermission]

    def get(self, request):
        measure = request.query_params.get('measure')
        dimensions = _parse_dims(request)
        if not measure or not dimensions:
            raise ValidationError('measure and dimensions are required.')
        filters = _parse_filters(request)
        return Response(q.resolve(measure, dimensions, filters))


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
        return Response(q.op_slice(measure, pinned_dim, pinned_value, remaining))


class OlapDiceView(APIView):
    """GET /olap/dice?measure=net_revenue&dimensions=date,restaurant&filters={"area":["Bandra","Andheri"]}"""
    permission_classes = [OlapPermission]

    def get(self, request):
        measure = request.query_params.get('measure', 'net_revenue')
        dimensions = _parse_dims(request) or ['date']
        filters = _parse_filters(request)
        return Response(q.op_dice(measure, dimensions, filters))


class OlapPivotView(APIView):
    """GET /olap/pivot?measure=net_revenue&row=restaurant&column=date"""
    permission_classes = [OlapPermission]

    def get(self, request):
        measure = request.query_params.get('measure', 'net_revenue')
        row_dim = request.query_params.get('row')
        col_dim = request.query_params.get('column')
        if not row_dim or not col_dim:
            raise ValidationError('row and column are required for a pivot.')
        filters = _parse_filters(request)
        return Response(q.op_pivot(measure, row_dim, col_dim, filters))


class OlapCrossDomainView(APIView):
    """GET /olap/cross-domain — customers who both booked an event and
    ordered food, as a first pass ahead of the real cross_domain mining
    module (M9/§8.4); this view reads directly from the fact tables.
    """
    permission_classes = [OlapPermission]

    def get(self, request):
        from warehouse.models import FactBooking, FactOrder
        booking_customers = set(
            FactBooking.objects.filter(is_cancelled=False).values_list('customer_id', flat=True)
        )
        order_customers = set(
            FactOrder.objects.filter(is_cancelled=False).values_list('customer_id', flat=True)
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
