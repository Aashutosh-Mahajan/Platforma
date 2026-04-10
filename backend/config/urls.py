"""Platforma URL Configuration"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/orders/', include('orders.urls')),
    path('api/', include('restaurants.urls')),
    path('api/v1/auth/', include('core.urls.auth_urls')),
    path('api/v1/users/', include('core.urls.user_urls')),
    path('api/v1/zesty/', include('zesty.urls')),
    path('api/v1/eventra/', include('eventra.urls')),
    path('api/v1/payments/', include('core.urls.payment_urls')),
    path('api/v1/notifications/', include('core.urls.notification_urls')),
    path('api/v1/search/', include('core.urls.search_urls')),
    
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
