from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.urls import reverse
from django.core.mail import send_mail
from django.contrib.auth import authenticate
from django.conf import settings
from .serializers import RegisterSerializer,UpdatePasswordSerializer
from .models import CustomUser
from django.utils.crypto import get_random_string
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import CustomTokenObtainPairSerializer
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import permission_classes
from django.core.mail import EmailMessage
from django.utils.html import format_html
from django.shortcuts import render
from django.utils import timezone
from datetime import timedelta
import uuid

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def protected_view(request):
    return Response({"message": f"Hello, {request.user.username}. You are authenticated."})

def send_verification_email(user, request):
    token = str(uuid.uuid4())
    user.verification_token = token
    user.verification_sent_at = timezone.now()
    user.save()
    verify_url = request.build_absolute_uri(
        reverse('verification_view') + f'?token={token}'
    )
    # Build HTML email body with a clickable button/link
    subject = 'Please verify your email for LinkedIn Productivity'
    html_message = f'''
    <div style="font-family:Inter,sans-serif;background:#f6f8fc;padding:20px;">
      <div style="background:#fff;border-radius:8px;padding:32px 24px;max-width:480px;margin:auto;">
        <h2 style="text-align:center;">Verify Your Email</h2>
        <p style="font-size:16px;">Thank you for registering for <b>LinkedIn Productivity</b>!</p>
        <p style="font-size:15px;">Click the button below to verify your email address and complete your registration:</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="{verify_url}" style="display:inline-block;background:#0a66c2;color:#fff;text-decoration:none;border-radius:6px;padding:10px 24px;font-size:17px;">Verify Email</a>
        </div>
        <p style="font-size:13px;color:#777;text-align:center;">If you didn’t request this, you can ignore this email.</p>
      </div>
    </div>
    '''
    email = EmailMessage(
        subject,
        html_message,
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
    )
    email.content_subtype = "html"
    email.send(fail_silently=False)

@api_view(['POST'])
def register_api(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        send_verification_email(user, request)
        return Response({"message": "Registration successful. Please check your email to verify your account."}, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
def verify_email_api(request, token):
    try:
        user = CustomUser.objects.get(verification_token=token)
        # Token expiry: 24 hours (configurable)
        validity = timedelta(hours=24)
        if user.verification_sent_at and timezone.now() - user.verification_sent_at > validity:
            return Response({"error": "Verification link expired. Please register again."}, status=status.HTTP_400_BAD_REQUEST)
        user.is_active = True
        user.verification_token = ''
        user.verification_sent_at = None
        user.save()
        return Response({"message": "Email verified. You can log in now."}, status=status.HTTP_200_OK)
    except CustomUser.DoesNotExist:
        return Response({"error": "Invalid or expired token."}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_password_api(request):
    serializer = UpdatePasswordSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response({'message': 'Password updated successfully.'}, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
def request_reset_password_api(request):
    email = request.data.get('email', '').lower()
    try:
        user = CustomUser.objects.get(email__iexact=email)
        token = get_random_string(48)
        user.reset_token = token
        user.reset_sent_at = timezone.now()
        user.save()
        reset_url = request.build_absolute_uri(reverse('reset_password_confirm', args=[token]))
        subject = 'Reset Your Password for LinkedIn Productivity'
        html_message = f'''
        <div style="font-family:Inter,sans-serif;background:#f6f8fc;padding:20px;">
          <div style="background:#fff;border-radius:8px;padding:32px 24px;max-width:480px;margin:auto;">
            <h2 style="text-align:center;">Reset Your Password</h2>
            <p>If you requested a password reset, click below:</p>
            <div style="text-align:center;margin:24px 0;">
              <a href="{reset_url}" style="display:inline-block;background:#0a66c2;color:#fff;text-decoration:none;border-radius:6px;padding:10px 24px;font-size:17px;">Reset Password</a>
            </div>
            <p style="font-size:13px;color:#777;text-align:center;">If you didn’t request this, ignore this email.</p>
          </div>
        </div>
        '''
        email_obj = EmailMessage(subject, html_message, settings.DEFAULT_FROM_EMAIL, [user.email])
        email_obj.content_subtype = "html"
        email_obj.send(fail_silently=False)
        return Response({"message": "Reset password link sent"}, status=200)
    except CustomUser.DoesNotExist:
        return Response({"error": "No user with this email"}, status=400)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profile_api(request):
    user = request.user
    profile_data = {
        "email": user.email,
        "username": user.username,
    }
    return Response(profile_data, status=status.HTTP_200_OK)

def verification_view(request):
    return render(request, 'verification.html')
@api_view(['GET', 'POST'])
def reset_password_confirm(request, token):
    try:
        user = CustomUser.objects.get(reset_token=token)
        validity = timedelta(hours=2)
        if not user.reset_sent_at or timezone.now() - user.reset_sent_at > validity:
            return Response({'error': 'Reset link expired. Please request again.'}, status=400)

        if request.method == 'GET':
            return render(request, 'reset_password.html', {'reset_token': token})

        if request.method == 'POST':
            new_password = request.data.get('new_password')
            confirm_password = request.data.get('confirm_password')
            if new_password != confirm_password:
                return Response({'error': 'Passwords do not match'}, status=400)
            if len(new_password) < 8:
                return Response({'error': 'Password must be at least 8 characters'}, status=400)
            user.set_password(new_password)
            user.reset_token = ''
            user.reset_sent_at = None
            user.save()
            return Response({'message': 'Password reset successful'}, status=200)
    except CustomUser.DoesNotExist:
        return Response({'error': 'Invalid or expired token'}, status=400)
