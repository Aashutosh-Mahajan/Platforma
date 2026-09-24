from django.urls import path
from mining.views import InsightsCombosView, InsightsSegmentsView

urlpatterns = [
    path('combos', InsightsCombosView.as_view(), name='insights-combos'),
    path('segments', InsightsSegmentsView.as_view(), name='insights-segments'),
]
