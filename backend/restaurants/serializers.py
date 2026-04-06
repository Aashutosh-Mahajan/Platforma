from rest_framework import serializers

from restaurants.models import Restaurant


class RestaurantListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Restaurant
        fields = [
            "id",
            "osm_id",
            "name",
            "cuisine",
            "address",
            "latitude",
            "longitude",
            "photo_url",
            "area",
            "opening_hours",
            "phone",
            "website",
        ]


class RestaurantDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Restaurant
        fields = "__all__"
