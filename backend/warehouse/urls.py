from django.urls import path
from warehouse.olap.views import (
    OlapRevenueView, OlapBreakdownView, OlapSliceView, OlapDiceView,
    OlapPivotView, OlapCrossDomainView,
)

urlpatterns = [
    path('revenue', OlapRevenueView.as_view(), name='olap-revenue'),
    path('breakdown', OlapBreakdownView.as_view(), name='olap-breakdown'),
    path('slice', OlapSliceView.as_view(), name='olap-slice'),
    path('dice', OlapDiceView.as_view(), name='olap-dice'),
    path('pivot', OlapPivotView.as_view(), name='olap-pivot'),
    path('cross-domain', OlapCrossDomainView.as_view(), name='olap-cross-domain'),
]
