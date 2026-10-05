import re
from django.core.exceptions import ValidationError


def validate_phone(value):
    """Validate phone number format."""
    pattern = r'^\+?[1-9]\d{6,14}$'
    if not re.match(pattern, value):
        raise ValidationError('Enter a valid phone number (e.g., +919876543210).')


def validate_rating(value):
    """Validate rating is between 1 and 5."""
    if not (1 <= value <= 5):
        raise ValidationError('Rating must be between 1 and 5.')


def validate_positive_amount(value):
    """Validate amount is positive."""
    if value <= 0:
        raise ValidationError('Amount must be greater than zero.')


def mumbai_location(attrs, instance=None, area_field='area', with_city=True):
    """Platforma serves Mumbai only. Normalises a serializer's location
    fields in place and rejects anything outside the city:

      city      blank -> 'Mumbai'; anything else is refused
      state     blank -> 'Maharashtra'
      area      matched to a gazetteer locality ('bandra' -> 'Bandra West')
      lat/lng   must fall inside Mumbai

    Only the fields present in `attrs` are checked, so partial updates work.
    """
    from rest_framework import serializers
    from core import mumbai

    errors = {}
    if with_city and ('city' in attrs or instance is None):
        city = (attrs.get('city') or '').strip()
        if city and city.lower() not in ('mumbai', 'bombay'):
            errors['city'] = 'Platforma currently serves Mumbai only.'
        else:
            attrs['city'] = mumbai.CITY
    if 'state' in attrs and not (attrs.get('state') or '').strip():
        attrs['state'] = mumbai.STATE
    if area_field and attrs.get(area_field):
        area = mumbai.canonical_area(attrs[area_field])
        if area is None:
            errors[area_field] = (
                f"'{attrs[area_field]}' is not a Mumbai locality we serve. "
                f"Pick one of: {', '.join(mumbai.AREA_NAMES)}."
            )
        else:
            attrs[area_field] = area
    lat, lng = attrs.get('latitude'), attrs.get('longitude')
    if lat is not None and lng is not None and not mumbai.in_mumbai(lat, lng):
        errors['latitude'] = 'This location is outside Mumbai.'
    if errors:
        raise serializers.ValidationError(errors)
    return attrs
