"""Platforma URL Configuration"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    # NOTE: the legacy `orders` app (api/orders/) was retired — it duplicated
    # zesty.Order with no ownership checks (IDOR) and zero frontend usage.
    # Its now-orphaned `orders_order` table (0 rows) is left in the database
    # untouched; only the app's code and route are removed.
    # NOTE: the legacy `restaurants` app (api/restaurants/, api/areas/) was
    # retired the same way — it was a separate seed/public catalog that the
    # frontend read from instead of zesty.Restaurant (the model owners
    # actually manage), so restaurants owners created never showed up in
    # listings. zesty.Restaurant now carries every field that catalog had
    # (city, area, cuisine, price_range, veg_only, ...). The `restaurants_
    # restaurant` table is left in the database untouched.
    path('api/v1/auth/', include('core.urls.auth_urls')),
    path('api/v1/users/', include('core.urls.user_urls')),
    path('api/v1/zesty/', include('zesty.urls')),
    path('api/v1/eventra/', include('eventra.urls')),
    path('api/v1/payments/', include('core.urls.payment_urls')),
    path('api/v1/notifications/', include('core.urls.notification_urls')),
    path('api/v1/search/', include('core.urls.search_urls')),
    path('api/v1/admin/', include('core.urls.admin_urls')),
    path('api/v1/analytics/', include('core.urls.analytics_urls')),
    path('api/v1/olap/', include('warehouse.urls')),
    path('api/v1/insights/', include('mining.urls')),

]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
