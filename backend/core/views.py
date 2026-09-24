from rest_framework import viewsets, status, generics
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.exceptions import NotFound, ValidationError as DRFValidationError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings

from core.serializers import (
    UserSerializer, RegisterSerializer, LoginSerializer,
    UserProfileSerializer, PasswordChangeSerializer,
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer,
    AddressSerializer, PaymentSerializer, NotificationSerializer
)
from core.models import Address, Payment, Notification, AuditLog, SearchLog, VerificationToken, EmailCode

User = get_user_model()


def _send_token_email(user, token, purpose):
    """Dev/console-backend email. Swap for a real transactional email
    provider without touching callers — the interface is just (user, token, purpose).
    """
    if purpose == 'email_verify':
        subject = 'Verify your Platforma email'
        body = f'Verify your email: use token {token.token} (expires {token.expires_at}).'
    else:
        subject = 'Reset your Platforma password'
        body = f'Reset your password: use token {token.token} (expires {token.expires_at}).'
    send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=True)


CODE_COPY = {
    'email_verify': {
        'subject': '{code} is your Platforma verification code',
        'heading': 'Confirm your email',
        'lead': 'enter this code to finish setting up your Platforma account.',
    },
    'password_reset': {
        'subject': '{code} is your Platforma password reset code',
        'heading': 'Reset your password',
        'lead': "enter this code to choose a new password. If you didn't ask for this, you can ignore this email.",
    },
}


def _send_code_email(user, code, purpose):
    """Send a 6-digit code as a plain-text + HTML email."""
    copy = CODE_COPY[purpose]
    name = user.first_name or 'there'
    minutes = EmailCode.LIFETIME_MINUTES
    text = (
        f"Hi {name}, {copy['lead']}\n\n    {code}\n\n"
        f"The code expires in {minutes} minutes.\n\n- Platforma"
    )
    spaced = ' '.join(code)
    html = (
        '<div style="background:#f6f4ee;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#141414">'
        '<div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e6e2d8;border-radius:20px;padding:32px">'
        '<p style="margin:0 0 24px;font-family:Georgia,serif;font-size:22px">Platforma<span style="color:#8a9a5b">.</span></p>'
        f'<h1 style="margin:0 0 8px;font-family:Georgia,serif;font-weight:normal;font-size:26px">{copy["heading"]}</h1>'
        f'<p style="margin:0 0 24px;color:#6b6a63;font-size:15px;line-height:1.5">Hi {name}, {copy["lead"]}</p>'
        '<p style="margin:0 0 24px;padding:18px 0;background:#f6f4ee;border-radius:14px;text-align:center;'
        f'font-size:34px;letter-spacing:10px;font-weight:bold">{spaced}</p>'
        f'<p style="margin:0;color:#9c9a90;font-size:13px">This code expires in {minutes} minutes. '
        'Never share it with anyone, including Platforma staff.</p>'
        '</div></div>'
    )
    send_mail(
        copy['subject'].format(code=code), text, settings.DEFAULT_FROM_EMAIL, [user.email],
        html_message=html, fail_silently=True,
    )


def _issue_code(user, purpose):
    """Issue and email a code, returning extra response fields.

    In DEBUG the code is echoed back as `dev_code` so the flow can be tested
    without a real mailbox (the console email backend only prints it to the
    server log). It is never included when DEBUG is off.
    """
    _, code = EmailCode.issue(user, purpose)
    _send_code_email(user, code, purpose)
    extra = {'resend_in': EmailCode.RESEND_COOLDOWN_SECONDS, 'expires_in': EmailCode.LIFETIME_MINUTES * 60}
    if settings.DEBUG:
        extra['dev_code'] = code
    return extra


def _tokens_for(user):
    refresh = RefreshToken.for_user(user)
    return {'access': str(refresh.access_token), 'refresh': str(refresh)}


def _requires_verification(user):
    return not user.is_email_verified and not (user.is_staff or user.role == 'admin')


CODE_ERRORS = {
    'invalid': "That code isn't right. Check the email and try again.",
    'expired': 'That code has expired. Send a new one.',
    'too_many_attempts': 'Too many wrong attempts. Send a new code to try again.',
}


# =====================
# AUTH VIEWS
# =====================

class RegisterView(generics.CreateAPIView):
    """POST /auth/register/ - create an account and email a 6-digit code.

    No session is issued until the address is confirmed with
    POST /auth/verify-code.
    """
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({
            'requires_verification': True,
            'email': user.email,
            **_issue_code(user, 'email_verify'),
        }, status=status.HTTP_201_CREATED)


class VerifyCodeView(APIView):
    """POST /auth/verify-code {email, code} - confirm the address and sign in."""
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').strip()
        code = str(request.data.get('code') or '').strip()
        if not email or not code.isdigit() or len(code) != 6:
            raise DRFValidationError({'code': 'Enter the 6-digit code from your email.'})
        user = User.objects.filter(email__iexact=email).first()
        if user is None:
            raise DRFValidationError({'code': CODE_ERRORS['invalid'], 'reason': 'invalid'})
        if user.is_email_verified:
            raise DRFValidationError({'code': 'This email is already verified. Sign in instead.', 'reason': 'already_verified'})
        ok, reason = EmailCode.verify(user, 'email_verify', code)
        if not ok:
            raise DRFValidationError({'code': CODE_ERRORS[reason], 'reason': reason})
        user.is_email_verified = True
        user.save(update_fields=['is_email_verified'])
        return Response({'message': 'Email verified.', **_tokens_for(user)})


class ResendCodeView(APIView):
    """POST /auth/resend-code {email} - send a fresh verification code.

    Answers the same way whether or not the account exists, so it can't be
    used to discover registered emails.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').strip()
        user = User.objects.filter(email__iexact=email).first() if email else None
        payload = {
            'message': 'If that account needs verifying, a new code is on its way.',
            'resend_in': EmailCode.RESEND_COOLDOWN_SECONDS,
            'expires_in': EmailCode.LIFETIME_MINUTES * 60,
        }
        if user is None or user.is_email_verified:
            return Response(payload)
        wait = EmailCode.seconds_until_resend(user, 'email_verify')
        if wait:
            return Response(
                {'detail': f'Please wait {wait} seconds before asking for another code.', 'resend_in': wait},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        return Response({**payload, **_issue_code(user, 'email_verify')})


class PasswordResetCodeRequestView(APIView):
    """POST /auth/password-reset/code {email} - email a reset code (no enumeration)."""
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').strip()
        user = User.objects.filter(email__iexact=email, is_active=True).first() if email else None
        payload = {
            'message': 'If an account exists for that email, a reset code is on its way.',
            'resend_in': EmailCode.RESEND_COOLDOWN_SECONDS,
            'expires_in': EmailCode.LIFETIME_MINUTES * 60,
        }
        if user is None:
            return Response(payload)
        wait = EmailCode.seconds_until_resend(user, 'password_reset')
        if wait:
            return Response(
                {'detail': f'Please wait {wait} seconds before asking for another code.', 'resend_in': wait},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        return Response({**payload, **_issue_code(user, 'password_reset')})


class PasswordResetCodeConfirmView(APIView):
    """POST /auth/password-reset/confirm {email, code, new_password, new_password_confirm}."""
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').strip()
        code = str(request.data.get('code') or '').strip()
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(email__iexact=email, is_active=True).first() if email else None
        if user is None or not code.isdigit() or len(code) != 6:
            raise DRFValidationError({'code': CODE_ERRORS['invalid'], 'reason': 'invalid'})
        ok, reason = EmailCode.verify(user, 'password_reset', code)
        if not ok:
            raise DRFValidationError({'code': CODE_ERRORS[reason], 'reason': reason})
        user.set_password(serializer.validated_data['new_password'])
        # Receiving the code proves the person controls the inbox.
        user.is_email_verified = True
        user.save(update_fields=['password', 'is_email_verified'])
        return Response({'message': 'Password updated. You can sign in now.'})


class VerifyEmailView(APIView):
    """POST /auth/verify/{token} — consume a verification token (FR-A1)."""
    permission_classes = [AllowAny]

    def post(self, request, token):
        try:
            vt = VerificationToken.objects.select_related('user').get(
                token=token, purpose='email_verify'
            )
        except VerificationToken.DoesNotExist:
            raise NotFound('Invalid verification token.')

        if not vt.is_valid:
            raise DRFValidationError('This verification link has expired or was already used.')

        from django.utils import timezone
        vt.used_at = timezone.now()
        vt.save(update_fields=['used_at'])

        user = vt.user
        user.is_email_verified = True
        user.save(update_fields=['is_email_verified'])

        return Response({'message': 'Email verified.', 'is_email_verified': True})


class ResendVerificationView(APIView):
    """POST /auth/verify/resend — issue a fresh token if the old one expired."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.is_email_verified:
            return Response({'message': 'Email already verified.'})
        token = VerificationToken.issue(request.user, purpose='email_verify')
        _send_token_email(request.user, token, purpose='email_verify')
        return Response({'message': 'Verification email sent.'})


class PasswordResetRequestView(APIView):
    """POST /auth/password-reset — request a reset link (FR-A5).

    Always returns 200 regardless of whether the email exists, so this
    endpoint can't be used to enumerate registered accounts.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user = User.objects.get(email=serializer.validated_data['email'])
        except User.DoesNotExist:
            return Response({'message': 'If that email exists, a reset link has been sent.'})

        token = VerificationToken.issue(user, purpose='password_reset', lifetime_hours=1)
        _send_token_email(user, token, purpose='password_reset')
        return Response({'message': 'If that email exists, a reset link has been sent.'})


class PasswordResetConfirmView(APIView):
    """POST /auth/password-reset/{token} — consume the reset token."""
    permission_classes = [AllowAny]

    def post(self, request, token):
        try:
            vt = VerificationToken.objects.select_related('user').get(
                token=token, purpose='password_reset'
            )
        except VerificationToken.DoesNotExist:
            raise NotFound('Invalid reset token.')

        if not vt.is_valid:
            raise DRFValidationError('This reset link has expired or was already used.')

        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        from django.utils import timezone
        vt.used_at = timezone.now()
        vt.save(update_fields=['used_at'])

        user = vt.user
        user.set_password(serializer.validated_data['new_password'])
        user.save(update_fields=['password'])

        return Response({'message': 'Password reset successful.'})


class MeView(APIView):
    """GET /auth/me — current user profile (PRD §6 alias for /users/profile/)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserProfileSerializer(request.user).data)


class LoginView(generics.GenericAPIView):
    """Login user with email and password."""
    permission_classes = [AllowAny]
    serializer_class = LoginSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']

        if _requires_verification(user):
            # Right password, unconfirmed email: send a code (unless one went
            # out moments ago) and let the client switch to the code screen.
            wait = EmailCode.seconds_until_resend(user, 'email_verify')
            extra = _issue_code(user, 'email_verify') if wait == 0 else {'resend_in': wait}
            return Response({
                'detail': 'Please confirm your email to finish signing in. We sent you a 6-digit code.',
                'reason': 'email_not_verified',
                'email': user.email,
                **extra,
            }, status=status.HTTP_403_FORBIDDEN)

        return Response(_tokens_for(user), status=status.HTTP_200_OK)


class SafeTokenRefreshView(TokenRefreshView):
    """TokenRefreshView, but never a raw 500.

    simplejwt's own refresh serializer does `User.objects.get(pk=...)` on
    the token's user id with no exception handling — if that user has
    since been deleted (or the token is otherwise stale/corrupt in a way
    simplejwt doesn't already wrap as TokenError), it raises a bare
    User.DoesNotExist that DRF's default exception handler doesn't
    recognize, producing an unhandled 500 instead of the 401 a stale
    token should return. Confirmed live: an old refresh token surviving
    in localStorage after its user was deleted crashed this endpoint.
    """

    def post(self, request, *args, **kwargs):
        try:
            return super().post(request, *args, **kwargs)
        except (TokenError, get_user_model().DoesNotExist):
            raise InvalidToken('Token is invalid or the account no longer exists.')


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
    """Search across restaurants, events, and menu items.

    Accepts `q` (per PRD §6 `GET /search?q=`) and keeps `query` working for
    existing callers. Every search is logged to SearchLog keyed by session
    id only (FR-S6/NFR-Pr1) — never a user id, so a signed-in search and an
    anonymous one are logged identically.
    """
    query = (request.query_params.get('q') or request.query_params.get('query', '')).strip()
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
            name__icontains=query, is_published=True, is_approved=True
        )[:limit]
        results['events'] = EventListSerializer(events, many=True).data

    if scope in ('all', 'menu'):
        from zesty.models import MenuItem
        from zesty.serializers import MenuItemSerializer
        menu_items = MenuItem.objects.filter(
            name__icontains=query, is_available=True
        )[:limit]
        results['menu_items'] = MenuItemSerializer(menu_items, many=True).data

    if not request.session.session_key:
        request.session.save()
    total_results = sum(len(v) for v in results.values())
    SearchLog.objects.create(
        session_id=request.session.session_key,
        query_text=query[:255],
        result_type=scope,
        result_id='',
        clicked=False,
    )
    results['session_id'] = request.session.session_key
    results['total_results'] = total_results

    return Response(results)
