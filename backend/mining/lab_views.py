"""Admin analytics + Mumbai map endpoints (admin only).

  GET /insights/lab/<key>                one analysis's stored result
  GET /insights/mumbai-map               areas, clusters, restaurants, venues, hotspots
  GET /insights/lab/export/<dataset>     a mining dataset as CSV or ARFF (?format=csv|arff),
                                         for opening the same data in WEKA or R
"""
import io

import numpy as np
import pandas as pd
from django.http import HttpResponse
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from mining.access import IsPlatformAdmin
from mining.models import MiningHotspot, MiningLabArtifact
from mining.registry import latest_successful_run
from mining.views import _model

# artifact key -> module whose run produced it
ARTIFACTS = {
    'mumbai_areas': 'areas', 'mumbai_points': 'areas', 'area_hierarchy': 'areas',
    'lab_visualization': 'lab_eda', 'lab_preprocessing': 'lab_eda',
    'lab_regression': 'lab_regression',
    'lab_decision_tree': 'lab_classification', 'lab_naive_bayes': 'lab_classification',
    'lab_customer_kmeans': 'lab_customer_kmeans',
    'lab_apriori': 'lab_apriori',
}


def artifact(key):
    """(run, payload) for the newest successful run of the artifact's module."""
    run = latest_successful_run(ARTIFACTS[key])
    if run is None:
        return None, None
    row = MiningLabArtifact.objects.filter(run=run, key=key).values_list('payload', flat=True).first()
    return run, row


class LabArtifactView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request, key):
        if key not in ARTIFACTS:
            raise NotFound('Unknown analysis.')
        run, payload = artifact(key)
        model = _model(run)
        if model.get('available') and payload is None:
            model = {'available': False, 'reason': 'This analysis has no output yet.'}
        return Response({'model': model, 'data': payload})


class MumbaiMapView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        run, areas = artifact('mumbai_areas')
        _, points = artifact('mumbai_points')
        model = _model(run)
        if model.get('available') and areas is None:
            model = {'available': False, 'reason': 'Area clustering has not produced output yet.'}
        hot_run = latest_successful_run('hotspots')
        hotspots = [
            {'domain': h.domain, 'label': h.label, 'lat': h.center_lat, 'lng': h.center_lng,
             'radius_km': h.radius_km, 'demand': h.demand, 'supply': h.supply,
             'demand_per_supply': h.demand_per_supply, 'opportunity': h.opportunity}
            for h in MiningHotspot.objects.filter(run=hot_run, city__iexact='Mumbai')
        ] if hot_run else []
        return Response({'model': model, 'areas': areas, 'points': points, 'hotspots': hotspots})


def _arff(df, relation, nominal=()):
    out = io.StringIO()
    out.write(f"% Platforma - {relation}\n@RELATION {relation}\n\n")
    for col in df.columns:
        if col in nominal or df[col].dtype == object or df[col].dtype == bool:
            values = sorted({str(v).replace("'", '') for v in df[col].dropna()})
            out.write(f"@ATTRIBUTE {col} {{{','.join(repr(v) if ' ' in v else v for v in values)}}}\n")
        else:
            out.write(f"@ATTRIBUTE {col} NUMERIC\n")
    out.write("\n@DATA\n")
    for row in df.itertuples(index=False):
        cells = []
        for col, v in zip(df.columns, row):
            if v is None or (isinstance(v, float) and np.isnan(v)):
                cells.append('?')
            elif col in nominal or isinstance(v, (str, bool, np.bool_)):
                text = str(v).replace("'", '')
                cells.append(f"'{text}'" if ' ' in text or ',' in text else text)
            else:
                cells.append(f"{float(v):.4g}" if isinstance(v, (float, np.floating)) else str(v))
        out.write(','.join(cells) + '\n')
    return out.getvalue()


def export_frame(dataset):
    from mining.modules import lab_common

    if dataset == 'customers_rfm':
        rfm = lab_common.rfm_frame()
        churn = lab_common.churn_dataset()[['customer_id', 'churned']]
        df = rfm.merge(churn, on='customer_id', how='left')
        df['churned'] = df['churned'].map({1: 'yes', 0: 'no'}).fillna('new')
        return df, ('churned',)
    if dataset == 'mumbai_areas':
        _, payload = artifact('mumbai_areas')
        if not payload:
            raise NotFound('Area clustering has not run yet.')
        cols = ['area', 'zone', 'residents', 'orders_placed', 'orders_per_resident', 'avg_order_value', 'restaurants',
                'demand_per_kitchen', 'avg_delivery_min', 'bookings', 'affluence', 'cluster_name']
        return pd.DataFrame(payload['areas'])[cols], ('area', 'zone', 'cluster_name')
    if dataset == 'orders':
        o = lab_common.orders_frame()
        cols = ['total', 'items', 'discount', 'delivery_fee', 'delivery_minutes', 'hour', 'is_weekend',
                'payment_method', 'day_part', 'price_band', 'zone', 'cuisine', 'is_cancelled']
        df = o[cols].sample(min(5000, len(o)), random_state=0)
        df['is_weekend'] = df['is_weekend'].map({True: 'yes', False: 'no'})
        df['is_cancelled'] = df['is_cancelled'].map({True: 'yes', False: 'no'})
        return df, ('payment_method', 'day_part', 'price_band', 'zone', 'cuisine', 'is_weekend', 'is_cancelled')
    if dataset == 'baskets':
        from warehouse.models import DimMenuItem, FactOrderItem
        cats = dict(DimMenuItem.objects.filter(is_current=True).values_list('item_id', 'category'))
        baskets = {}
        for order_id, item_id in FactOrderItem.objects.values_list('order_id', 'menu_item_id')[:60000]:
            if cats.get(item_id):
                baskets.setdefault(order_id, set()).add(cats[item_id])
        names = sorted({c for b in baskets.values() for c in b})
        df = pd.DataFrame([{c.replace(' ', '_'): ('t' if c in b else '?') for c in names} for b in baskets.values()])
        return df, tuple(df.columns)
    raise NotFound('Unknown dataset.')


class LabExportView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request, dataset):
        fmt = request.query_params.get('format', 'csv')
        if fmt not in ('csv', 'arff'):
            raise ValidationError({'format': 'Must be csv or arff.'})
        df, nominal = export_frame(dataset)
        if fmt == 'csv':
            body, ctype = df.to_csv(index=False), 'text/csv'
        else:
            body, ctype = _arff(df, f"platforma_{dataset}", nominal), 'text/plain'
        response = HttpResponse(body, content_type=f'{ctype}; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="platforma_{dataset}.{fmt}"'
        return response
