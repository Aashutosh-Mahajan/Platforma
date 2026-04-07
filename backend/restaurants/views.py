import django_filters
from rest_framework import filters, generics
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend

from restaurants.models import Restaurant
from restaurants.serializers import RestaurantSerializer


def normalize_primary_cuisine(cuisine_value):
    if not cuisine_value:
        return ""
    return str(cuisine_value).split(";")[0].strip().lower()


class RestaurantPagination(PageNumberPagination):
    page_size = 12


class RestaurantFilter(django_filters.FilterSet):
    area = django_filters.CharFilter(field_name="area", lookup_expr="exact")
    cuisine = django_filters.CharFilter(field_name="cuisine", lookup_expr="exact")
    veg_only = django_filters.BooleanFilter(field_name="veg_only")
    price_range = django_filters.NumberFilter(field_name="price_range")
    is_open = django_filters.BooleanFilter(field_name="is_open")
    data_source = django_filters.CharFilter(field_name="data_source", lookup_expr="exact")

    class Meta:
        model = Restaurant
        fields = ["area", "cuisine", "veg_only", "price_range", "is_open", "data_source"]


class RestaurantListAPIView(generics.ListAPIView):
    queryset = Restaurant.objects.filter(is_active=True).order_by("name")
    serializer_class = RestaurantSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = RestaurantFilter
    search_fields = ["name", "description"]
    ordering_fields = ["name", "rating", "price_range"]
    ordering = ["name"]
    pagination_class = RestaurantPagination


class RestaurantDetailAPIView(generics.RetrieveAPIView):
    queryset = Restaurant.objects.all()
    serializer_class = RestaurantSerializer
    lookup_field = "id"


class AreasAPIView(APIView):
    # CORS headers are handled globally by django-cors-headers middleware in settings.
    def get(self, request):
        areas = sorted(
            {
                area.strip()
                for area in Restaurant.objects.values_list("area", flat=True)
                if area and area.strip()
            }
        )
        return Response({"areas": areas})


class CuisinesAPIView(APIView):
    def get(self, request):
        cuisines = sorted(
            {
                normalized
                for normalized in (
                    normalize_primary_cuisine(value)
                    for value in Restaurant.objects.values_list("cuisine", flat=True)
                )
                if normalized
            }
        )
        return Response({"cuisines": cuisines})
