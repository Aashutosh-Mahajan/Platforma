"""Product-facing mining surfaces (PRD §6 /insights/*).

FR-I8: a rule/prediction below its mining-time confidence threshold is
stored with its score but rendered on no surface. Since every module only
writes rows that passed its own threshold, the serving-layer half of FR-I8
here is simpler: only ever read from the *latest successful* run for a
module — a stale run's rows must never be served as if they were current.

Every response carries `model` = {version, as_of, metrics} (or
`available: false` with the reason), so a UI can say how fresh a number is
and how good the model behind it was.
"""
import datetime

from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from mining.access import (
    IsPartnerOrAdmin, IsPlatformAdmin, require_event, require_restaurant,
    visible_event_ids, visible_restaurant_ids,
)
from mining.models import (
    MiningRun, MiningBasketRule, MiningCustomerSegment, MiningAnomaly, MiningRiskScore, MiningForecast,
    MiningSellOutForecast, MiningRecommendation, MiningSequenceRule, MiningCustomerScore,
    MiningDeliveryEstimate, MiningHotspot, MiningSearchTerm, MiningPromoEffect, MiningPriceElasticity,
)
from mining.registry import latest_successful_run

MODULES = [
    'basket', 'segments', 'customers', 'anomaly', 'risk', 'forecast', 'sellout', 'recommend',
    'sequences', 'delivery', 'hotspots', 'search', 'promos', 'pricing',
]

# Which verticals each module's output covers, for the Both / Zesty / Eventra switch.
MODULE_VERTICALS = {
    'basket': ['zesty'], 'segments': ['zesty', 'eventra'], 'customers': ['zesty', 'eventra'],
    'anomaly': ['zesty', 'eventra'], 'risk': ['zesty', 'eventra'], 'forecast': ['zesty', 'eventra'],
    'sellout': ['eventra'], 'recommend': ['zesty', 'eventra'], 'sequences': ['zesty', 'eventra'],
    'delivery': ['zesty'], 'hotspots': ['zesty', 'eventra'], 'search': ['zesty', 'eventra'],
    'promos': ['zesty'], 'pricing': ['eventra'],
}
VERTICALS = ('all', 'zesty', 'eventra')


def _vertical(request):
    """?vertical=all|zesty|eventra (default all)."""
    value = request.query_params.get('vertical', 'all')
    if value not in VERTICALS:
        raise ValidationError({'vertical': 'Must be all, zesty or eventra.'})
    return value


def _vertical_metrics(run, vertical):
    """Run metrics for one vertical, for modules that train per vertical."""
    by = (run.metrics or {}).get('by_vertical') if run else None
    return by.get(vertical) if by and vertical in by else (run.metrics if run else {})


def _model(run, keys=None):
    if run is None:
        return {'available': False, 'reason': 'This model has not run yet.'}
    metrics = run.metrics or {}
    if metrics.get('skipped'):
        return {'available': False, 'reason': metrics.get('reason', 'Not enough data yet.'),
                'as_of': run.finished_at, 'version': run.model_version}
    if keys is not None:
        metrics = {k: metrics.get(k) for k in keys if k in metrics}
    return {'available': True, 'version': run.model_version, 'as_of': run.finished_at, 'metrics': metrics}


def _people(ids):
    from core.models import User
    return {
        u['id']: {'name': ' '.join(filter(None, [u['first_name'], u['last_name']])) or u['email'], 'email': u['email']}
        for u in User.objects.filter(id__in=[i for i in ids if i is not None])
        .values('id', 'first_name', 'last_name', 'email')
    }


def _restaurant_names(ids):
    from warehouse.models import DimRestaurant
    return dict(DimRestaurant.objects.filter(is_current=True, restaurant_id__in=ids).values_list('restaurant_id', 'name'))


def _event_names(ids):
    from warehouse.models import DimEvent
    return dict(DimEvent.objects.filter(is_current=True, event_id__in=ids).values_list('event_id', 'title'))


def _f(value, digits=2):
    return None if value is None else round(float(value), digits)


# ---------------------------------------------------------------------------
# Existing set A surfaces
# ---------------------------------------------------------------------------

class InsightsCombosView(APIView):
    """GET /insights/combos?restaurant_id=12 — cross-restaurant category
    combos, or a specific restaurant's item-level combos if restaurant_id
    is given.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        run = latest_successful_run('basket')
        if run is None:
            return Response({'combos': [], 'model_version': None})

        restaurant_id = request.query_params.get('restaurant_id')
        qs = MiningBasketRule.objects.filter(run=run)
        if restaurant_id:
            qs = qs.filter(restaurant_id=restaurant_id, level='item')
        else:
            qs = qs.filter(level='category')

        combos = [
            {
                'antecedent': r.antecedent, 'consequent': r.consequent,
                'support': round(r.support, 4), 'confidence': round(r.confidence, 4),
                'lift': round(r.lift, 3),
            }
            for r in qs.order_by('-lift')[:50]
        ]
        return Response({'combos': combos, 'model_version': run.model_version, 'as_of': run.finished_at})


class InsightsSegmentsView(APIView):
    """GET /insights/segments — segment distribution + (if authenticated)
    the caller's own segment.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        run = latest_successful_run('segments')
        if run is None:
            return Response({'segments': [], 'model_version': None})

        vertical = _vertical(request)
        metrics = _vertical_metrics(run, vertical) or {}
        my_segment = None
        if request.user.is_authenticated:
            row = MiningCustomerSegment.objects.filter(run=run, vertical=vertical, customer_id=request.user.id).first()
            if row:
                my_segment = {
                    'segment_label': row.segment_label, 'confidence': round(row.confidence, 4),
                    'recency_days': row.recency_days, 'frequency': row.frequency, 'monetary': str(row.monetary),
                }

        return Response({
            'vertical': vertical,
            'segment_distribution': metrics.get('segment_distribution', {}),
            'silhouette': metrics.get('silhouette'),
            'reason': metrics.get('reason'),
            'model_version': run.model_version, 'as_of': run.finished_at,
            'my_segment': my_segment,
        })


# ---------------------------------------------------------------------------
# Model health
# ---------------------------------------------------------------------------

class ModelRunsView(APIView):
    """GET /insights/models — latest run of every module (admin)."""
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        rows = []
        for module in MODULES:
            last = MiningRun.objects.filter(module=module).order_by('-started_at').first()
            success = latest_successful_run(module)
            rows.append({
                'module': module,
                'verticals': MODULE_VERTICALS[module],
                'status': last.status if last else 'never_run',
                'last_started': last.started_at if last else None,
                'last_error': last.error_message if last and last.status == 'failed' else '',
                'serving_run': success.id if success else None,
                'as_of': success.finished_at if success else None,
                'version': success.model_version if success else None,
                'skipped': bool(success and success.metrics.get('skipped')),
                'metrics': success.metrics if success else {},
            })
        return Response({'modules': rows})


# ---------------------------------------------------------------------------
# Anomalies (admin review queue)
# ---------------------------------------------------------------------------

def _anomaly_row(a, people, names):
    return {
        'id': a.id, 'domain': a.domain, 'target_id': a.target_id, 'rank': a.rank, 'score': _f(a.score, 4),
        'amount': _f(a.amount), 'occurred_on': a.occurred_on, 'reasons': a.reasons,
        'customer': people.get(a.customer_id), 'customer_id': a.customer_id,
        'entity_id': a.entity_id, 'entity_name': names.get((a.domain, a.entity_id)),
        'review_status': a.review_status, 'reviewed_at': a.reviewed_at,
    }


class AnomalyListView(APIView):
    """GET /insights/anomalies?domain=order|booking&status=open|confirmed|dismissed"""
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        run = latest_successful_run('anomaly')
        if run is None or run.metrics.get('skipped'):
            return Response({'model': _model(run), 'counts': {}, 'results': []})
        qs = MiningAnomaly.objects.filter(run=run)
        counts = dict(qs.values_list('review_status').annotate(n=Count('id')))
        domain = request.query_params.get('domain') or {'zesty': 'order', 'eventra': 'booking'}.get(_vertical(request))
        if domain in ('order', 'booking'):
            qs = qs.filter(domain=domain)
            counts = dict(qs.values_list('review_status').annotate(n=Count('id')))
        review = request.query_params.get('status', 'open')
        if review != 'all':
            qs = qs.filter(review_status=review)
        rows = list(qs.order_by('domain', 'rank')[:200])
        people = _people({a.customer_id for a in rows})
        names = {('order', k): v for k, v in _restaurant_names({a.entity_id for a in rows if a.domain == 'order'}).items()}
        names.update({('booking', k): v for k, v in _event_names({a.entity_id for a in rows if a.domain == 'booking'}).items()})
        return Response({
            'model': _model(run), 'counts': counts,
            'results': [_anomaly_row(a, people, names) for a in rows],
        })


class AnomalyReviewView(APIView):
    """PATCH /insights/anomalies/<id> {"review_status": "confirmed"|"dismissed"|"open"}"""
    permission_classes = [IsPlatformAdmin]

    def patch(self, request, pk):
        review = request.data.get('review_status')
        if review not in ('open', 'confirmed', 'dismissed'):
            raise ValidationError({'review_status': 'Must be open, confirmed or dismissed.'})
        anomaly = MiningAnomaly.objects.filter(pk=pk).first()
        if anomaly is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        anomaly.review_status = review
        anomaly.reviewed_by = request.user.id if review != 'open' else None
        anomaly.reviewed_at = timezone.now() if review != 'open' else None
        anomaly.save(update_fields=['review_status', 'reviewed_by', 'reviewed_at'])
        from core.models import AuditLog
        AuditLog.objects.create(
            actor=request.user, action=f'anomaly_{review}', target_type=anomaly.domain, target_id=anomaly.target_id,
            metadata={'anomaly_id': anomaly.id, 'reasons': anomaly.reasons},
        )
        return Response({'id': anomaly.id, 'review_status': anomaly.review_status, 'reviewed_at': anomaly.reviewed_at})


# ---------------------------------------------------------------------------
# Risk
# ---------------------------------------------------------------------------

class EventRiskView(APIView):
    """GET /insights/risk/events[?event_id=] — expected no-shows and
    cancellations for upcoming events (organizer: own events; admin: all).
    """
    permission_classes = [IsPartnerOrAdmin]

    def get(self, request):
        run = latest_successful_run('risk')
        allowed = visible_event_ids(request.user)
        event_id = request.query_params.get('event_id')
        if event_id:
            allowed = {require_event(request.user, event_id)}
        if run is None or run.metrics.get('skipped'):
            return Response({'model': _model(run), 'events': []})

        qs = MiningRiskScore.objects.filter(run=run, kind__in=['booking_no_show', 'booking_cancellation'])
        if allowed is not None:
            qs = qs.filter(entity_id__in=allowed)
        per_event = {}
        for r in qs.values('entity_id', 'kind', 'probability', 'seats', 'band', 'target_id'):
            e = per_event.setdefault(r['entity_id'], {
                'event_id': r['entity_id'], 'bookings': 0, 'seats': 0,
                'expected_no_show_seats': 0.0, 'expected_cancelled_seats': 0.0,
                'high_risk_bookings': 0, 'riskiest': [],
            })
            if r['kind'] == 'booking_no_show':
                e['bookings'] += 1
                e['seats'] += r['seats']
                e['expected_no_show_seats'] += r['probability'] * r['seats']
                e['high_risk_bookings'] += r['band'] == 'high'
                e['riskiest'].append((r['probability'], r['target_id']))
            else:
                e['expected_cancelled_seats'] += r['probability'] * r['seats']

        names = _event_names(per_event.keys())
        for e in per_event.values():
            e['event_name'] = names.get(e['event_id'])
            e['expected_no_show_seats'] = round(e['expected_no_show_seats'], 1)
            e['expected_cancelled_seats'] = round(e['expected_cancelled_seats'], 1)
            e['riskiest'] = sorted(e['riskiest'], reverse=True)[:5]

        # Booking references for the riskiest bookings (operational DB).
        from eventra.models import Booking
        risky_ids = [int(t) for e in per_event.values() for _, t in e['riskiest']]
        refs = {b['id']: b for b in Booking.objects.filter(id__in=risky_ids)
                .values('id', 'booking_reference', 'total_tickets', 'user__first_name')}
        for e in per_event.values():
            e['riskiest'] = [
                {'booking_id': int(t), 'probability': round(p, 3),
                 'reference': refs.get(int(t), {}).get('booking_reference'),
                 'customer': refs.get(int(t), {}).get('user__first_name'),
                 'seats': refs.get(int(t), {}).get('total_tickets')}
                for p, t in e['riskiest']
            ]

        model = _model(run)
        if model.get('available'):
            model['metrics'] = {k: run.metrics.get(k) for k in ('booking_no_show', 'booking_cancellation')}
        events = sorted(per_event.values(), key=lambda e: -e['expected_no_show_seats'])
        return Response({'model': model, 'events': events})


class OrderRiskView(APIView):
    """GET /insights/risk/orders?restaurant_id= — live orders likely to be cancelled."""
    permission_classes = [IsPartnerOrAdmin]

    def get(self, request):
        run = latest_successful_run('risk')
        allowed = visible_restaurant_ids(request.user)
        restaurant_id = request.query_params.get('restaurant_id')
        if restaurant_id:
            allowed = {require_restaurant(request.user, restaurant_id)}
        if run is None or run.metrics.get('skipped'):
            return Response({'model': _model(run), 'orders': []})
        qs = MiningRiskScore.objects.filter(run=run, kind='order_cancellation')
        if allowed is not None:
            qs = qs.filter(entity_id__in=allowed)
        rows = list(qs.order_by('-probability')[:50])
        model = _model(run)
        if model.get('available'):
            model['metrics'] = run.metrics.get('order_cancellation')
        return Response({'model': model, 'orders': [
            {'order_id': r.target_id, 'restaurant_id': r.entity_id, 'probability': round(r.probability, 3), 'band': r.band}
            for r in rows
        ]})


# ---------------------------------------------------------------------------
# Forecasts
# ---------------------------------------------------------------------------

def _forecast_rows(run, series, entity_id=None):
    qs = MiningForecast.objects.filter(run=run, series=series, target_date__gt=timezone.localdate())
    if entity_id is not None:
        qs = qs.filter(entity_id=entity_id)
    return [
        {'date': f.target_date, 'predicted': round(f.predicted, 2), 'lower': round(f.lower, 2), 'upper': round(f.upper, 2)}
        for f in qs.order_by('target_date')
    ]


def _actual_daily(model, value_field, filters, days=28):
    start = timezone.localdate() - datetime.timedelta(days=days - 1)
    rows = dict(
        model.objects.filter(date__gte=start, date__lte=timezone.localdate(), **filters)
        .values('date').annotate(n=Sum(value_field)).values_list('date', 'n')
    )
    return [{'date': start + datetime.timedelta(days=i), 'actual': float(rows.get(start + datetime.timedelta(days=i), 0) or 0)}
            for i in range(days)]


class RestaurantForecastView(APIView):
    """GET /insights/forecast/restaurants/<id> — next 14 days of orders,
    the last 28 days of actuals, and tomorrow by hour.
    """
    permission_classes = [IsPartnerOrAdmin]

    def get(self, request, pk):
        restaurant_id = require_restaurant(request.user, pk)
        from warehouse.models import CbDailyOutletRevenue, FactOrder
        run = latest_successful_run('forecast')
        forecast = _forecast_rows(run, 'restaurant_orders', restaurant_id) if run else []

        since = timezone.localdate() - datetime.timedelta(days=180)
        by_hour = dict(
            FactOrder.objects.filter(restaurant__restaurant_id=restaurant_id, is_cancelled=False,
                                     date__full_date__gte=since)
            .values('time__hour').annotate(n=Count('fact_key')).values_list('time__hour', 'n')
        )
        total = sum(by_hour.values())
        tomorrow = forecast[0]['predicted'] if forecast else None
        hourly = [
            {'hour': h, 'share': round(by_hour.get(h, 0) / total, 4) if total else 0,
             'expected_orders': round(tomorrow * by_hour.get(h, 0) / total, 2) if total and tomorrow is not None else None}
            for h in range(24)
        ]
        model = _model(run)
        if model.get('available'):
            model['metrics'] = run.metrics.get('restaurant_orders')
        return Response({
            'model': model, 'restaurant_id': restaurant_id, 'forecast': forecast,
            'next_7_days': round(sum(f['predicted'] for f in forecast[:7]), 1) if forecast else None,
            'actuals': _actual_daily(CbDailyOutletRevenue, 'order_count', {'restaurant_id': restaurant_id}),
            'hourly_tomorrow': hourly,
        })


class PlatformForecastView(APIView):
    """GET /insights/forecast/platform — orders and bookings, 14 days ahead (admin)."""
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        from warehouse.models import CbDailyOutletRevenue
        run = latest_successful_run('forecast')
        model = _model(run)
        if model.get('available'):
            model['metrics'] = {k: run.metrics.get(k) for k in ('platform_orders', 'platform_bookings', 'restaurant_orders')}
        from warehouse.models import FactBooking
        start = timezone.localdate() - datetime.timedelta(days=27)
        bookings = dict(
            FactBooking.objects.filter(date__full_date__gte=start, date__full_date__lte=timezone.localdate(),
                                       is_cancelled=False)
            .values('date__full_date').annotate(n=Count('fact_key')).values_list('date__full_date', 'n')
        )
        return Response({
            'model': model,
            'orders': {'forecast': _forecast_rows(run, 'platform_orders') if run else [],
                       'actuals': _actual_daily(CbDailyOutletRevenue, 'order_count', {})},
            'bookings': {'forecast': _forecast_rows(run, 'platform_bookings') if run else [],
                         'actuals': [{'date': start + datetime.timedelta(days=i),
                                      'actual': float(bookings.get(start + datetime.timedelta(days=i), 0))}
                                     for i in range(28)]},
        })


class SellOutView(APIView):
    """GET /insights/sellout[?event_id=] — projected sales for upcoming events,
    with expected no-shows from the risk model."""
    permission_classes = [IsPartnerOrAdmin]

    def get(self, request):
        run = latest_successful_run('sellout')
        allowed = visible_event_ids(request.user)
        event_id = request.query_params.get('event_id')
        if event_id:
            allowed = {require_event(request.user, event_id)}
        if run is None or run.metrics.get('skipped'):
            return Response({'model': _model(run), 'events': []})
        qs = MiningSellOutForecast.objects.filter(run=run, event_date__gte=timezone.now())
        if allowed is not None:
            qs = qs.filter(event_id__in=allowed)
        rows = list(qs.order_by('event_date')[:100])

        risk_run = latest_successful_run('risk')
        no_shows = {}
        if risk_run:
            for r in (MiningRiskScore.objects.filter(run=risk_run, kind='booking_no_show',
                                                     entity_id__in=[s.event_id for s in rows])
                      .values('entity_id', 'probability', 'seats')):
                no_shows[r['entity_id']] = no_shows.get(r['entity_id'], 0.0) + r['probability'] * r['seats']
        names = _event_names([s.event_id for s in rows])
        return Response({'model': _model(run), 'events': [
            {
                'event_id': s.event_id, 'event_name': names.get(s.event_id), 'event_date': s.event_date,
                'capacity': s.capacity, 'sold': s.sold, 'sold_last_7d': s.sold_last_7d,
                'days_to_event': s.days_to_event, 'projected_final': s.projected_final,
                'projected_sell_through': round(s.projected_sell_through, 3),
                'sell_out_probability': round(s.sell_out_probability, 3),
                'projected_sell_out_date': s.projected_sell_out_date,
                'expected_no_show_seats': round(no_shows[s.event_id], 1) if s.event_id in no_shows else None,
            }
            for s in rows
        ]})


# ---------------------------------------------------------------------------
# Customer-facing
# ---------------------------------------------------------------------------

class RecommendationsView(APIView):
    """GET /insights/recommendations — restaurants and upcoming events picked
    for the signed-in customer, falling back to what's popular.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from zesty.models import Restaurant
        from zesty.serializers import RestaurantListSerializer
        from eventra.models import Event
        from eventra.serializers import EventListSerializer

        run = latest_successful_run('recommend')
        food = list(MiningRecommendation.objects.filter(run=run, customer_id=request.user.id, domain='food')
                    .order_by('rank')) if run else []
        cats = list(MiningRecommendation.objects.filter(run=run, customer_id=request.user.id, domain='event')
                    .order_by('rank')) if run else []
        personalised = bool(food or cats)

        reasons = {r.item_id: r.reason for r in food}
        if food:
            ids = [r.item_id for r in food]
        else:
            ids = self._popular_restaurant_ids()
        live = {r.id: r for r in Restaurant.objects.filter(id__in=ids, is_active=True)}
        ordered = [live[i] for i in ids if i in live][:8]
        restaurants = RestaurantListSerializer(ordered, many=True, context={'request': request}).data
        for item, r in zip(restaurants, ordered):
            item['reason'] = reasons.get(r.id, 'Popular right now')

        category_reason = {r.label: r.reason for r in cats}
        events_qs = Event.objects.filter(
            is_published=True, is_approved=True, is_cancelled=False, event_date__gte=timezone.now(),
        ).exclude(bookings__user=request.user)
        if cats:
            events_qs = events_qs.filter(category__in=list(category_reason))
        picked = sorted(events_qs.order_by('event_date')[:24],
                        key=lambda e: (list(category_reason).index(e.category) if e.category in category_reason else 99,
                                       e.event_date))[:8]
        events = EventListSerializer(picked, many=True, context={'request': request}).data
        for item, e in zip(events, picked):
            item['reason'] = category_reason.get(e.category, 'Coming up soon')

        return Response({
            'personalised': personalised, 'as_of': run.finished_at if run else None,
            'restaurants': restaurants, 'events': events,
        })

    @staticmethod
    def _popular_restaurant_ids():
        from warehouse.models import CbDailyOutletRevenue
        since = timezone.localdate() - datetime.timedelta(days=30)
        return list(
            CbDailyOutletRevenue.objects.filter(date__gte=since).values('restaurant_id')
            .annotate(n=Sum('order_count')).order_by('-n').values_list('restaurant_id', flat=True)[:12]
        )


class DeliveryEstimateView(APIView):
    """GET /insights/delivery-estimate?restaurant_id=12&items=3"""
    permission_classes = [AllowAny]

    def get(self, request):
        from warehouse.etl.transform import day_part
        from mining.modules.delivery import size_band
        try:
            restaurant_id = int(request.query_params.get('restaurant_id'))
            items = max(1, int(request.query_params.get('items', 2)))
        except (TypeError, ValueError):
            raise ValidationError('restaurant_id (and optionally items) must be integers.')
        now = timezone.localtime()
        part, weekend = day_part(now.hour), now.weekday() >= 5
        run = latest_successful_run('delivery')
        row = MiningDeliveryEstimate.objects.filter(
            run=run, restaurant_id=restaurant_id, day_part=part, is_weekend=weekend, size_band=size_band(items),
        ).first() if run else None
        if row is None:
            from zesty.models import Restaurant
            r = Restaurant.objects.filter(id=restaurant_id).values('delivery_time_min', 'delivery_time_max').first()
            if r is None:
                return Response({'detail': 'Unknown restaurant.'}, status=status.HTTP_404_NOT_FOUND)
            return Response({'source': 'restaurant', 'minutes': r['delivery_time_max'],
                             'low': r['delivery_time_min'], 'high': r['delivery_time_max']})
        return Response({
            'source': 'model', 'minutes': round(row.predicted_minutes), 'low': round(row.predicted_minutes),
            'high': round(row.p90_minutes), 'day_part': part, 'is_weekend': weekend,
            'model_version': row.model_version, 'as_of': run.finished_at,
        })


# ---------------------------------------------------------------------------
# Admin intelligence
# ---------------------------------------------------------------------------

class SequencesView(APIView):
    """GET /insights/sequences — cross-domain habits (admin)."""
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        run = latest_successful_run('sequences')
        rows = MiningSequenceRule.objects.filter(run=run).order_by('-lift')[:50] if run else []
        return Response({'model': _model(run), 'rules': [
            {'antecedent': r.antecedent, 'consequent': r.consequent, 'window_hours': r.window_hours,
             'occurrences': r.occurrences, 'confidence': round(r.confidence, 4), 'lift': round(r.lift, 2)}
            for r in rows
        ]})


class CustomerScoresView(APIView):
    """GET /insights/customers — churn and value overview plus the most
    valuable customers at risk of leaving (admin)."""
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        run = latest_successful_run('customers')
        vertical = _vertical(request)
        model = _model(run)
        if model.get('available'):
            metrics = _vertical_metrics(run, vertical) or {}
            if metrics.get('skipped'):
                model = {'available': False, 'reason': metrics.get('reason'), 'as_of': run.finished_at,
                         'version': run.model_version}
            else:
                model['metrics'] = metrics
        if not model.get('available'):
            return Response({'model': model, 'vertical': vertical, 'matrix': [], 'at_risk': []})
        qs = MiningCustomerScore.objects.filter(run=run, vertical=vertical)
        matrix = list(
            qs.values('value_band', 'churn_band').annotate(
                customers=Count('id'), predicted_value=Sum('predicted_90d_value'),
            ).order_by()
        )
        at_risk = list(
            qs.filter(churn_band__in=['high', 'medium'], value_band__in=['platinum', 'gold'])
            .order_by('-predicted_90d_value')[:25]
        )
        people = _people({c.customer_id for c in at_risk})
        totals = qs.aggregate(predicted=Sum('predicted_90d_value'),
                              at_risk_value=Sum('predicted_90d_value', filter=Q(churn_band='high')))
        return Response({
            'model': model, 'vertical': vertical,
            'totals': {'customers': qs.count(), 'predicted_90d_value': _f(totals['predicted']),
                       'high_risk_value': _f(totals['at_risk_value'])},
            'matrix': [{**m, 'predicted_value': _f(m['predicted_value'])} for m in matrix],
            'at_risk': [
                {'customer_id': c.customer_id, 'customer': people.get(c.customer_id),
                 'churn_probability': _f(c.churn_probability, 3), 'churn_band': c.churn_band,
                 'predicted_90d_value': _f(c.predicted_90d_value), 'historic_value': _f(c.historic_value),
                 'value_band': c.value_band, 'days_since_last': c.days_since_last, 'reason': c.top_reason}
                for c in at_risk
            ],
        })


class HotspotsView(APIView):
    """GET /insights/hotspots?domain=zesty|eventra (admin)"""
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        run = latest_successful_run('hotspots')
        qs = MiningHotspot.objects.filter(run=run) if run else MiningHotspot.objects.none()
        domain = request.query_params.get('domain') or _vertical(request)
        if domain in ('zesty', 'eventra'):
            qs = qs.filter(domain=domain)
        return Response({'model': _model(run), 'hotspots': [
            {'domain': h.domain, 'city': h.city, 'label': h.label, 'lat': h.center_lat, 'lng': h.center_lng,
             'radius_km': h.radius_km, 'demand': h.demand, 'revenue': _f(h.revenue), 'supply': h.supply,
             'demand_per_supply': h.demand_per_supply, 'avg_delivery_minutes': h.avg_delivery_minutes,
             'opportunity': h.opportunity}
            for h in qs.order_by('-demand')
        ]})


class SearchTermsView(APIView):
    """GET /insights/search — unmet and trending demand from search (admin)."""
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        run = latest_successful_run('search')
        qs = MiningSearchTerm.objects.filter(run=run) if run else MiningSearchTerm.objects.none()
        vertical = _vertical(request)
        if vertical != 'all':
            # Terms that never found anything could belong to either vertical, so they stay in both.
            qs = qs.filter(vertical__in=[vertical, 'unknown'])

        def rows(q, n):
            return [
                {'term': t.term, 'group': t.cluster, 'vertical': t.vertical, 'searches': t.searches,
                 'searches_7d': t.searches_7d,
                 'trend': round(t.trend, 2), 'zero_result_rate': _f(t.zero_result_rate, 3),
                 'click_rate': _f(t.click_rate, 3), 'flag': t.flag}
                for t in q[:n]
            ]
        return Response({
            'model': _model(run),
            'unmet': rows(qs.filter(flag__startswith='unmet').order_by('-searches'), 25),
            'trending': rows(qs.filter(flag__endswith='trending').order_by('-trend'), 25),
            'top': rows(qs.order_by('-searches'), 25),
        })


class PromoEffectsView(APIView):
    """GET /insights/promos[?restaurant_id=] — did each promotion pay off?"""
    permission_classes = [IsPartnerOrAdmin]

    def get(self, request):
        run = latest_successful_run('promos')
        allowed = visible_restaurant_ids(request.user)
        restaurant_id = request.query_params.get('restaurant_id')
        if restaurant_id:
            allowed = {require_restaurant(request.user, restaurant_id)}
        qs = MiningPromoEffect.objects.filter(run=run) if run else MiningPromoEffect.objects.none()
        if _vertical(request) == 'eventra':
            qs = qs.none()  # promotions are Zesty-only
        if allowed is not None:
            qs = qs.filter(restaurant_id__in=allowed)
        rows = list(qs.order_by('-window_start')[:100])
        names = _restaurant_names({p.restaurant_id for p in rows})
        return Response({'model': _model(run), 'promotions': [
            {'code': p.promo_code, 'restaurant_id': p.restaurant_id, 'restaurant': names.get(p.restaurant_id),
             'window_start': p.window_start, 'window_end': p.window_end, 'redemptions': p.redemptions,
             'discount_given': _f(p.discount_given), 'orders_per_day_before': p.orders_per_day_before,
             'orders_per_day_during': p.orders_per_day_during, 'uplift_pct': p.uplift_pct,
             'incremental_orders': p.incremental_orders, 'incremental_revenue': _f(p.incremental_revenue),
             'roi': p.roi, 'p_value': p.p_value, 'verdict': p.verdict}
            for p in rows
        ]})


class PricingView(APIView):
    """GET /insights/pricing — price elasticity by category, plus (for an
    organizer) how each of their tiers is selling against its category."""
    permission_classes = [IsPartnerOrAdmin]

    def get(self, request):
        allowed = visible_event_ids(request.user)
        run = latest_successful_run('pricing')
        categories = [
            {'category': p.category, 'elasticity': round(p.elasticity, 3), 'r_squared': round(p.r_squared, 3),
             'events': p.events, 'avg_sell_through': round(p.avg_sell_through, 3),
             'median_price': _f(p.median_price), 'advice': p.advice}
            for p in (MiningPriceElasticity.objects.filter(run=run).order_by('category') if run else [])
        ]
        tiers = []
        if allowed is not None:
            from warehouse.models import FactTicketSale
            sold = dict(
                FactTicketSale.objects.filter(event__event_id__in=allowed)
                .values('ticket_type__ticket_type_id').annotate(n=Count('fact_key'))
                .values_list('ticket_type__ticket_type_id', 'n')
            )
            from eventra.models import TicketType
            for tt in (TicketType.objects.filter(event_id__in=allowed, event__event_date__gte=timezone.now())
                       .select_related('event').order_by('event__event_date', 'price')[:60]):
                n = sold.get(tt.id, max(0, (tt.quantity_total or 0) - (tt.quantity_available or 0)))
                tiers.append({
                    'event_id': tt.event_id, 'event_name': tt.event.name, 'category': tt.event.category,
                    'tier': tt.name, 'price': _f(tt.price), 'capacity': tt.quantity_total, 'sold': n,
                    'sell_through': round(n / tt.quantity_total, 3) if tt.quantity_total else None,
                })
        return Response({'model': _model(run), 'categories': categories, 'my_tiers': tiers})
