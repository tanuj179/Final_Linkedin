# Import base classes, manager, mixin for custom user
from django.contrib.auth.models import (
    AbstractBaseUser, BaseUserManager, PermissionsMixin
)
from django.db import models
from django.utils import timezone

# 1. Custom manager class to handle user and superuser creation
class CustomUserManager(BaseUserManager):
    def create_user(self, username, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email must be provided')  # Ensure an email is supplied
        email = self.normalize_email(email)             # Standardizes the email format
        extra_fields.setdefault('is_active', False)     # By default, new users are inactive
        user = self.model(username=username, email=email, **extra_fields)  # Creates user instance
        user.set_password(password)                     # Hashes and sets password securely
        user.password_last_changed = timezone.now()     # Tracks last password change
        user.save(using=self._db)                      # Saves user to database
        return user

    # For creating superusers (admin accounts)
    def create_superuser(self, username, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)       # Superusers can access admin site
        extra_fields.setdefault('is_superuser', True)   # Has all permissions
        extra_fields.setdefault('is_active', True)      # Superusers are active by default

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(username, email, password, **extra_fields)

# 2. Main user model class
class CustomUser(AbstractBaseUser, PermissionsMixin):
    username = models.CharField(max_length=150, unique=True)     # Login/unique name
    email = models.EmailField(unique=True)                       # Registered email
    is_active = models.BooleanField(default=False)               # Status (active/inactive)
    is_staff = models.BooleanField(default=False)                # Admin panel access right
    date_joined = models.DateTimeField(default=timezone.now)     # Account creation date
    password_last_changed = models.DateTimeField(null=True, blank=True)  # Password change timestamp
    verification_token = models.CharField(max_length=100, blank=True, null=True) #email verification token  
    verification_sent_at = models.DateTimeField(null=True, blank=True)
    reset_token = models.CharField(max_length=100, blank=True, null=True)
    reset_sent_at = models.DateTimeField(null=True, blank=True)
    objects = CustomUserManager()                                # Attach custom manager to model

    USERNAME_FIELD = 'email'                  # Main field for login
    REQUIRED_FIELDS = ['username']                  # Required on superuser creation (createsuperuser)

    def save(self, *args, **kwargs):
        # Custom logic to track when password is changed
        if self.pk is not None:                              # Existing user
            old_pass = CustomUser.objects.get(pk=self.pk).password
            if self.password != old_pass:
                self.password_last_changed = timezone.now()  # Update timestamp if password changed
        else:                                                # New user
            self.password_last_changed = timezone.now()
        super().save(*args, **kwargs)                        # Calls parent save method to persist

    def __str__(self):
        return self.username                                 # Display username for model instances

