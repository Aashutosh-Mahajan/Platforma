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
