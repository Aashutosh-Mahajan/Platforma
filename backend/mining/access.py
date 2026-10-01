"""Who may read which mining/warehouse output.

Admins see everything. A restaurant owner sees only their own restaurants'
numbers, an event organizer only their own events'. Ownership is looked up
in the operational database (where Restaurant/Event live); the warehouse
only ever stores plain ids.
"""
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.permissions import IsAuthenticated


def is_admin(user):
    return bool(user and user.is_authenticated and (user.is_staff or user.role == 'admin'))


class IsPlatformAdmin(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and is_admin(request.user)


class IsPartnerOrAdmin(IsAuthenticated):
    """Admins, restaurant owners and event organizers."""

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return is_admin(request.user) or request.user.role in ('restaurant_owner', 'event_organizer')


def owned_restaurant_ids(user):
    from zesty.models import Restaurant
    return set(Restaurant.objects.filter(owner=user).values_list('id', flat=True))


def owned_event_ids(user):
    from eventra.models import Event
    return set(Event.objects.filter(organizer=user).values_list('id', flat=True))


def require_restaurant(user, restaurant_id):
    """Returns the restaurant id as an int if `user` may see it."""
    try:
        restaurant_id = int(restaurant_id)
    except (TypeError, ValueError):
        raise NotFound('Unknown restaurant.')
    if is_admin(user) or restaurant_id in owned_restaurant_ids(user):
        return restaurant_id
    raise PermissionDenied('You can only view your own restaurants.')


def require_event(user, event_id):
    try:
        event_id = int(event_id)
    except (TypeError, ValueError):
        raise NotFound('Unknown event.')
    if is_admin(user) or event_id in owned_event_ids(user):
        return event_id
    raise PermissionDenied('You can only view your own events.')


def visible_event_ids(user):
    """None = every event (admin); otherwise the organizer's own."""
    if is_admin(user):
        return None
    if user.role == 'event_organizer':
        return owned_event_ids(user)
    raise PermissionDenied('Only event organizers and admins can view this.')


def visible_restaurant_ids(user):
    if is_admin(user):
        return None
    if user.role == 'restaurant_owner':
        return owned_restaurant_ids(user)
    raise PermissionDenied('Only restaurant owners and admins can view this.')
