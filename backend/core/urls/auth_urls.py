from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from core.views import RegisterView, LoginView, logout_view, PasswordChangeView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', logout_view, name='logout'),
    path('password/change/', PasswordChangeView.as_view(), name='password_change'),
]
