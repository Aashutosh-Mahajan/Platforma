from rest_framework import serializers

from restaurants.models import Restaurant


class RestaurantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Restaurant
        fields = [
            "id",
            "osm_id",
            "name",
            "slug",
            "area",
            "cuisine",
            "rating",
            "data_source",
            "price_range",
            "image_url",
            "address",
            "hours",
            "is_open",
            "veg_only",
            "description",
            "latitude",
            "longitude",
            "opening_hours",
            "photo_url",
            "phone",
            "website",
            "city",
            "is_active",
            "created_at",
        ]


# Backward-compatible aliases used by existing imports.
class RestaurantListSerializer(RestaurantSerializer):
    pass


class RestaurantDetailSerializer(RestaurantSerializer):
    pass
