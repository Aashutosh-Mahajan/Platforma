from django.urls import path
from core.views import (
    RegisterView, LoginView, logout_view, PasswordChangeView,
    VerifyEmailView, ResendVerificationView, VerifyCodeView, ResendCodeView,
    PasswordResetCodeRequestView, PasswordResetCodeConfirmView,
    PasswordResetRequestView, PasswordResetConfirmView, MeView, SafeTokenRefreshView
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('token/refresh/', SafeTokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', logout_view, name='logout'),
    path('password/change/', PasswordChangeView.as_view(), name='password_change'),
    path('verify-code', VerifyCodeView.as_view(), name='verify-code'),
    path('resend-code', ResendCodeView.as_view(), name='resend-code'),
    path('password-reset/code', PasswordResetCodeRequestView.as_view(), name='password-reset-code'),
    path('password-reset/confirm', PasswordResetCodeConfirmView.as_view(), name='password-reset-code-confirm'),
    path('verify/resend', ResendVerificationView.as_view(), name='verify-resend'),
    path('verify/<str:token>', VerifyEmailView.as_view(), name='verify-email'),
    path('password-reset', PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('password-reset/<str:token>', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    path('me', MeView.as_view(), name='auth-me'),
]
