from django.urls import path
from warehouse.olap.views import (
    OlapCatalogView, OlapRevenueView, OlapBreakdownView, OlapSliceView, OlapDiceView,
    OlapPivotView, OlapCrossDomainView, WarehouseHealthView, OlapCubeView, WarehouseSchemaView, OltpVsOlapView,
)

urlpatterns = [
    path('catalog', OlapCatalogView.as_view(), name='olap-catalog'),
    path('revenue', OlapRevenueView.as_view(), name='olap-revenue'),
    path('breakdown', OlapBreakdownView.as_view(), name='olap-breakdown'),
    path('slice', OlapSliceView.as_view(), name='olap-slice'),
    path('dice', OlapDiceView.as_view(), name='olap-dice'),
    path('pivot', OlapPivotView.as_view(), name='olap-pivot'),
    path('cross-domain', OlapCrossDomainView.as_view(), name='olap-cross-domain'),
    path('health', WarehouseHealthView.as_view(), name='olap-health'),
    path('cube', OlapCubeView.as_view(), name='olap-cube'),
    path('schema', WarehouseSchemaView.as_view(), name='olap-schema'),
    path('oltp-vs-olap', OltpVsOlapView.as_view(), name='olap-oltp-vs-olap'),
]
