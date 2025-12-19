from django.urls import path
from .views import (
    register_api,
    verify_email_api,
    CustomTokenObtainPairView,
    profile_api,
    protected_view,
    verification_view,
    request_reset_password_api,
    reset_password_confirm,
    update_password_api
)
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('register/', register_api, name='register_api'),
    path('profile/', profile_api, name='profile_api'),
    path('verify/<str:token>/', verify_email_api, name='verify_email_api'),
    path('verification/', verification_view, name='verification_view'),
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('protected/', protected_view, name='protected_view'), 
    path('request-reset-password/', request_reset_password_api, name='request_reset_password_api'),
    path('reset/<str:token>/', reset_password_confirm, name='reset_password_confirm'),
    path('update-password/', update_password_api, name='update_password_api')
]
