from django.urls import path
from core.views import global_search

urlpatterns = [
    path('', global_search, name='global-search'),
]
