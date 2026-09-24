"""Admin-only actions (PRD FR-D1/FR-D5).

Every mutation here is attributed to the acting admin and written to
AuditLog — this module exists specifically to close the gap where
`Restaurant.is_verified` / `Event.is_published` / `User.is_active` could be
flipped with no record of who did it or when.
"""
from decimal import Decimal

from django.db.models import Count, Q, Sum
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import NotFound, PermissionDenied

from core.models import AuditLog
from django.contrib.auth import get_user_model

User = get_user_model()


class IsPlatformAdmin(IsAuthenticated):
    """Staff or role='admin' only — every view below re-checks this."""

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return request.user.is_staff or request.user.role == 'admin'


class AdminRestaurantVerifyView(APIView):
    """PATCH /api/v1/admin/restaurants/{id}/verify — approve a partner listing."""
    permission_classes = [IsPlatformAdmin]

    def patch(self, request, pk):
        from zesty.models import Restaurant
        try:
            restaurant = Restaurant.objects.get(pk=pk)
        except Restaurant.DoesNotExist:
            raise NotFound('Restaurant not found.')

        verified = bool(request.data.get('is_verified', True))
        restaurant.is_verified = verified
        restaurant.save(update_fields=['is_verified'])

        AuditLog.record(
            actor=request.user,
            action='restaurant.verify' if verified else 'restaurant.unverify',
            target_type='restaurant',
            target_id=restaurant.id,
            restaurant_name=restaurant.name,
        )
        return Response({'id': restaurant.id, 'is_verified': restaurant.is_verified})


class AdminRestaurantCommissionView(APIView):
    """PATCH /api/v1/admin/restaurants/{id}/commission — set the platform's
    commission rate for one restaurant's future payouts. Deliberately not
    reachable through the owner-facing RestaurantViewSet (commission_rate
    is read-only there) — only admins set this."""
    permission_classes = [IsPlatformAdmin]

    def patch(self, request, pk):
        from decimal import Decimal, InvalidOperation
        from zesty.models import Restaurant
        try:
            restaurant = Restaurant.objects.get(pk=pk)
        except Restaurant.DoesNotExist:
            raise NotFound('Restaurant not found.')

        try:
            rate = Decimal(str(request.data.get('commission_rate')))
        except (InvalidOperation, TypeError):
            return Response({'error': 'commission_rate must be a number.'}, status=400)

        if rate < 0 or rate > 100:
            return Response({'error': 'commission_rate must be between 0 and 100.'}, status=400)

        old_rate = restaurant.commission_rate
        restaurant.commission_rate = rate
        restaurant.save(update_fields=['commission_rate'])

        AuditLog.record(
            actor=request.user,
            action='restaurant.set_commission_rate',
            target_type='restaurant',
            target_id=restaurant.id,
            restaurant_name=restaurant.name,
            old_rate=str(old_rate),
            new_rate=str(rate),
        )
        return Response({'id': restaurant.id, 'commission_rate': restaurant.commission_rate})


class AdminEventApproveView(APIView):
    """PATCH /api/v1/admin/events/{id}/approve — approve or unapprove an event listing."""
    permission_classes = [IsPlatformAdmin]

    def patch(self, request, pk):
        from eventra.models import Event
        try:
            event = Event.objects.get(pk=pk)
        except Event.DoesNotExist:
            raise NotFound('Event not found.')

        approved = bool(request.data.get('is_approved', True))
        event.is_approved = approved
        event.save(update_fields=['is_approved'])

        AuditLog.record(
            actor=request.user,
            action='event.approve' if approved else 'event.unapprove',
            target_type='event',
            target_id=event.id,
            event_name=event.name,
        )
        return Response({'id': event.id, 'is_approved': event.is_approved})


class AdminUserSuspendView(APIView):
    """PATCH /api/v1/admin/users/{id}/suspend — suspend or reinstate an account."""
    permission_classes = [IsPlatformAdmin]

    def patch(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            raise NotFound('User not found.')

        if user.id == request.user.id:
            raise PermissionDenied('You cannot suspend your own account.')

        suspend = bool(request.data.get('suspend', True))
        user.is_active = not suspend
        user.save(update_fields=['is_active'])

        AuditLog.record(
            actor=request.user,
            action='user.suspend' if suspend else 'user.reinstate',
            target_type='user',
            target_id=user.id,
            user_email=user.email,
        )
        return Response({'id': user.id, 'is_active': user.is_active})


class AdminAuditLogListView(APIView):
    """GET /api/v1/admin/audit-log — recent admin actions, most recent first."""
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        limit = min(int(request.query_params.get('limit', 50)), 200)
        entries = AuditLog.objects.select_related('actor').all()[:limit]
        return Response([
            {
                'id': e.id,
                'actor': e.actor.email,
                'action': e.action,
                'target_type': e.target_type,
                'target_id': e.target_id,
                'metadata': e.metadata,
                'created_at': e.created_at,
            }
            for e in entries
        ])


class AdminPendingRestaurantsView(APIView):
    """GET /api/v1/admin/restaurants/pending — the verification queue."""
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        from zesty.models import Restaurant
        restaurants = Restaurant.objects.filter(is_verified=False).select_related('owner').order_by('-created_at')
        return Response([
            {
                'id': r.id, 'name': r.name, 'owner_email': r.owner.email,
                'city': r.city, 'state': r.state, 'address': r.address,
                'cuisine_types': r.cuisine_types, 'is_active': r.is_active,
                'created_at': r.created_at,
            }
            for r in restaurants
        ])


class AdminPendingEventsView(APIView):
    """GET /api/v1/admin/events/pending — the approval queue."""
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        from eventra.models import Event
        events = Event.objects.filter(is_approved=False).select_related('organizer', 'venue').order_by('-created_at')
        return Response([
            {
                'id': e.id, 'name': e.name, 'organizer_email': e.organizer.email,
                'category': e.category, 'event_date': e.event_date,
                'venue_name': e.venue.name if e.venue else '',
                'city': e.venue.city if e.venue else '', 'state': e.venue.state if e.venue else '',
                'is_published': e.is_published, 'created_at': e.created_at,
            }
            for e in events
        ])


class AdminUserListView(APIView):
    """GET /api/v1/admin/users?search=&role= — for the suspend/reinstate UI."""
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        qs = User.objects.all().order_by('-date_joined')

        search = request.query_params.get('search')
        if search:
            qs = qs.filter(Q(email__icontains=search) | Q(first_name__icontains=search) | Q(last_name__icontains=search))

        role = request.query_params.get('role')
        if role:
            qs = qs.filter(role=role)

        limit = min(int(request.query_params.get('limit', 50)), 200)
        return Response([
            {
                'id': u.id, 'email': u.email, 'first_name': u.first_name, 'last_name': u.last_name,
                'role': u.role, 'is_active': u.is_active, 'is_email_verified': getattr(u, 'is_email_verified', False),
                'date_joined': u.date_joined,
            }
            for u in qs[:limit]
        ])


class AdminAnalyticsOverviewView(APIView):
    """GET /api/v1/admin/analytics/overview?group_by=city|state — platform-wide
    revenue/order rollups across both Zesty and Eventra, combined, grouped
    by geography. Reads straight from the operational tables rather than
    the warehouse: the warehouse's cuboids need an ETL run over real
    volume to be meaningful, whereas this needs to work from day one.
    """
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        from zesty.models import Order
        from eventra.models import Booking

        group_by = request.query_params.get('group_by', 'city')
        if group_by not in ('city', 'state'):
            group_by = 'city'

        order_field = f'restaurant__{group_by}'
        orders = (
            Order.objects.exclude(status='cancelled')
            .exclude(**{f'{order_field}': ''})
            .values(order_field)
            .annotate(revenue=Sum('total'), order_count=Count('id'))
            .order_by('-revenue')
        )

        booking_field = f'event__venue__{group_by}'
        bookings = (
            Booking.objects.exclude(status='cancelled')
            .exclude(**{f'{booking_field}': ''})
            .exclude(**{f'{booking_field}__isnull': True})
            .values(booking_field)
            .annotate(revenue=Sum('total'), order_count=Count('id'))
            .order_by('-revenue')
        )

        regions = {}
        for row in orders:
            key = row[order_field] or 'Unknown'
            regions.setdefault(key, {'region': key, 'zesty_revenue': Decimal('0'), 'zesty_orders': 0, 'eventra_revenue': Decimal('0'), 'eventra_bookings': 0})
            regions[key]['zesty_revenue'] += row['revenue'] or Decimal('0')
            regions[key]['zesty_orders'] += row['order_count']
        for row in bookings:
            key = row[booking_field] or 'Unknown'
            regions.setdefault(key, {'region': key, 'zesty_revenue': Decimal('0'), 'zesty_orders': 0, 'eventra_revenue': Decimal('0'), 'eventra_bookings': 0})
            regions[key]['eventra_revenue'] += row['revenue'] or Decimal('0')
            regions[key]['eventra_bookings'] += row['order_count']

        region_rows = sorted(regions.values(), key=lambda r: r['zesty_revenue'] + r['eventra_revenue'], reverse=True)
        for r in region_rows:
            r['total_revenue'] = r['zesty_revenue'] + r['eventra_revenue']

        top_restaurants = (
            Order.objects.exclude(status='cancelled')
            .values('restaurant__id', 'restaurant__name', 'restaurant__city', 'restaurant__state')
            .annotate(revenue=Sum('total'), order_count=Count('id'))
            .order_by('-revenue')[:10]
        )
        top_events = (
            Booking.objects.exclude(status='cancelled')
            .values('event__id', 'event__name', 'event__venue__city', 'event__venue__state')
            .annotate(revenue=Sum('total'), booking_count=Count('id'))
            .order_by('-revenue')[:10]
        )

        totals = Order.objects.exclude(status='cancelled').aggregate(revenue=Sum('total'), count=Count('id'))
        booking_totals = Booking.objects.exclude(status='cancelled').aggregate(revenue=Sum('total'), count=Count('id'))

        return Response({
            'group_by': group_by,
            'regions': region_rows,
            'top_restaurants': list(top_restaurants),
            'top_events': list(top_events),
            'totals': {
                'zesty_revenue': totals['revenue'] or Decimal('0'),
                'zesty_orders': totals['count'] or 0,
                'eventra_revenue': booking_totals['revenue'] or Decimal('0'),
                'eventra_bookings': booking_totals['count'] or 0,
            },
        })
