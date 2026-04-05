from rest_framework import viewsets, status, generics
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model

from core.serializers import (
    UserSerializer, RegisterSerializer, LoginSerializer,
    UserProfileSerializer, PasswordChangeSerializer,
    AddressSerializer, PaymentSerializer, NotificationSerializer
)
from core.models import Address, Payment, Notification

User = get_user_model()


# =====================
# AUTH VIEWS
# =====================

class RegisterView(generics.CreateAPIView):
    """Register a new user."""
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            }
        }, status=status.HTTP_201_CREATED)


class LoginView(generics.GenericAPIView):
    """Login user with email and password."""
    permission_classes = [AllowAny]
    serializer_class = LoginSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Blacklist the refresh token to logout."""
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
        return Response({'message': 'Successfully logged out.'}, status=status.HTTP_200_OK)
    except Exception:
        return Response({'message': 'Logged out.'}, status=status.HTTP_200_OK)


class PasswordChangeView(generics.GenericAPIView):
    """Change user password."""
    permission_classes = [IsAuthenticated]
    serializer_class = PasswordChangeSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({
            'message': 'Password changed successfully.'
        }, status=status.HTTP_200_OK)


# =====================
# USER VIEWS
# =====================

class ProfileView(generics.RetrieveUpdateAPIView):
    """Get or update the authenticated user's profile."""
    permission_classes = [IsAuthenticated]
    serializer_class = UserProfileSerializer

    def get_object(self):
        return self.request.user


class AddressViewSet(viewsets.ModelViewSet):
    """CRUD for user addresses."""
    permission_classes = [IsAuthenticated]
    serializer_class = AddressSerializer

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['patch'])
    def set_default(self, request, pk=None):
        """Set an address as the default address."""
        address = self.get_object()
        address.is_default = True
        address.save()  # The model's save method handles unsetting other defaults
        return Response(AddressSerializer(address).data)


# =====================
# PAYMENT VIEWS (Simulated)
# =====================

class PaymentViewSet(viewsets.ModelViewSet):
    """Simulated payment management."""
    permission_classes = [IsAuthenticated]
    serializer_class = PaymentSerializer

    def get_queryset(self):
        return Payment.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        payment = serializer.save(user=self.request.user)
        # Auto-simulate the payment
        payment.simulate_payment()

    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        """Simulate confirming a payment."""
        payment = self.get_object()
        payment.simulate_payment()
        return Response(PaymentSerializer(payment).data)

    @action(detail=True, methods=['post'])
    def refund(self, request, pk=None):
        """Simulate refunding a payment."""
        payment = self.get_object()
        payment.status = 'refunded'
        payment.save()
        return Response(PaymentSerializer(payment).data)


# =====================
# NOTIFICATION VIEWS
# =====================

class NotificationViewSet(viewsets.ModelViewSet):
    """User notifications."""
    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer
    http_method_names = ['get', 'patch', 'delete']

    def get_queryset(self):
        qs = Notification.objects.filter(user=self.request.user)
        unread = self.request.query_params.get('unread')
        if unread and unread.lower() == 'true':
            qs = qs.filter(is_read=False)
        return qs

    @action(detail=True, methods=['patch'])
    def mark_read(self, request, pk=None):
        """Mark a notification as read."""
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response(NotificationSerializer(notification).data)

    @action(detail=False, methods=['patch'])
    def mark_all_read(self, request):
        """Mark all notifications as read."""
        self.get_queryset().update(is_read=True)
        return Response({'message': 'All notifications marked as read.'})


# =====================
# GLOBAL SEARCH
# =====================

@api_view(['GET'])
@permission_classes([AllowAny])
def global_search(request):
    """Search across restaurants, events, and menu items."""
    query = request.query_params.get('query', '').strip()
    scope = request.query_params.get('scope', 'all')
    limit = int(request.query_params.get('limit', 10))

    results = {}

    if not query:
        return Response({'error': 'Query parameter is required.'}, status=400)

    if scope in ('all', 'restaurants'):
        from zesty.models import Restaurant
        from zesty.serializers import RestaurantListSerializer
        restaurants = Restaurant.objects.filter(
            name__icontains=query, is_active=True
        )[:limit]
        results['restaurants'] = RestaurantListSerializer(restaurants, many=True).data

    if scope in ('all', 'events'):
        from eventra.models import Event
        from eventra.serializers import EventListSerializer
        events = Event.objects.filter(
            name__icontains=query, is_published=True
        )[:limit]
        results['events'] = EventListSerializer(events, many=True).data

    if scope in ('all', 'menu'):
        from zesty.models import MenuItem
        from zesty.serializers import MenuItemSerializer
        menu_items = MenuItem.objects.filter(
            name__icontains=query, is_available=True
        )[:limit]
        results['menu_items'] = MenuItemSerializer(menu_items, many=True).data

    return Response(results)
