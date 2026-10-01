from django.urls import path
from mining import views

urlpatterns = [
    path('combos', views.InsightsCombosView.as_view(), name='insights-combos'),
    path('segments', views.InsightsSegmentsView.as_view(), name='insights-segments'),
    path('models', views.ModelRunsView.as_view(), name='insights-models'),
    path('anomalies', views.AnomalyListView.as_view(), name='insights-anomalies'),
    path('anomalies/<int:pk>', views.AnomalyReviewView.as_view(), name='insights-anomaly-review'),
    path('risk/events', views.EventRiskView.as_view(), name='insights-risk-events'),
    path('risk/orders', views.OrderRiskView.as_view(), name='insights-risk-orders'),
    path('forecast/platform', views.PlatformForecastView.as_view(), name='insights-forecast-platform'),
    path('forecast/restaurants/<int:pk>', views.RestaurantForecastView.as_view(), name='insights-forecast-restaurant'),
    path('sellout', views.SellOutView.as_view(), name='insights-sellout'),
    path('recommendations', views.RecommendationsView.as_view(), name='insights-recommendations'),
    path('delivery-estimate', views.DeliveryEstimateView.as_view(), name='insights-delivery-estimate'),
    path('sequences', views.SequencesView.as_view(), name='insights-sequences'),
    path('customers', views.CustomerScoresView.as_view(), name='insights-customers'),
    path('hotspots', views.HotspotsView.as_view(), name='insights-hotspots'),
    path('search', views.SearchTermsView.as_view(), name='insights-search'),
    path('promos', views.PromoEffectsView.as_view(), name='insights-promos'),
    path('pricing', views.PricingView.as_view(), name='insights-pricing'),
]
