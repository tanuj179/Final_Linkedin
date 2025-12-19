# billing/models.py
from django.db import models
from django.conf import settings
from django.utils import timezone

User = settings.AUTH_USER_MODEL


class Plan(models.Model):
    code = models.CharField(max_length=50, unique=True)  # 'trial', 'basic', 'premium'
    name = models.CharField(max_length=100)

    # Per-feature limits; null/blank = unlimited
    max_leads = models.PositiveIntegerField(null=True, blank=True)
    max_comments = models.PositiveIntegerField(null=True, blank=True)
    max_profile_optimizations = models.PositiveIntegerField(null=True, blank=True)

    is_trial = models.BooleanField(default=False)
    price_per_month = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True
    )

    def __str__(self):
        return f"{self.name} ({self.code})"


class Account(models.Model):
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="account"
    )
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT)

    # usage counters
    leads_used = models.PositiveIntegerField(default=0)
    comments_used = models.PositiveIntegerField(default=0)
    profile_optimizations_used = models.PositiveIntegerField(default=0)

    # trial + blocking
    trial_started_at = models.DateTimeField(null=True, blank=True)
    trial_ends_at = models.DateTimeField(null=True, blank=True)
    hard_block = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.user.email} – {self.plan.code}"

    @property
    def trial_over(self):
        if not self.plan.is_trial:
            return False
        if self.trial_ends_at and timezone.now() > self.trial_ends_at:
            return True
        return False
