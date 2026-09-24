from rest_framework.exceptions import PermissionDenied


def ensure_verified(user):
    """FR-A1: verification is required before a user's first transaction.

    Called explicitly at the top of order/booking creation rather than as a
    blanket permission_class, since browsing, cart, and every other action
    on those viewsets must stay available to an unverified user — only the
    transaction itself is gated.
    """
    if not user.is_email_verified:
        raise PermissionDenied(
            'Please verify your email before placing an order or booking. '
            'Check your inbox for a verification link, or request a new one '
            'from POST /api/v1/auth/verify/resend.'
        )
