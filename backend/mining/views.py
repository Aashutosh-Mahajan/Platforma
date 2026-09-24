"""Product-facing mining surfaces (PRD §6 /insights/*).

FR-I8: a rule/prediction below its mining-time confidence threshold is
stored with its score but rendered on no surface. Since basket.py and
segments.py already only write rows that passed their module's own
threshold (MIN_LIFT, MIN_CONFIDENCE, silhouette-based k selection), the
serving-layer half of FR-I8 here is simpler: only ever read from the
*latest successful* run for a module — a stale run's rows must never be
served as if they were current.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

from mining.models import MiningBasketRule, MiningCustomerSegment
from mining.registry import latest_successful_run


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

        my_segment = None
        if request.user.is_authenticated:
            row = MiningCustomerSegment.objects.filter(run=run, customer_id=request.user.id).first()
            if row:
                my_segment = {
                    'segment_label': row.segment_label, 'confidence': round(row.confidence, 4),
                    'recency_days': row.recency_days, 'frequency': row.frequency, 'monetary': str(row.monetary),
                }

        return Response({
            'segment_distribution': run.metrics.get('segment_distribution', {}),
            'silhouette': run.metrics.get('silhouette'),
            'model_version': run.model_version, 'as_of': run.finished_at,
            'my_segment': my_segment,
        })
