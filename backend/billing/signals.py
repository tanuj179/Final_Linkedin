# billing/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from django.conf import settings
from django.apps import apps

from .models import Plan, Account

User = apps.get_model(*settings.AUTH_USER_MODEL.split("."))


@receiver(post_save, sender=User)
def create_account_for_user(sender, instance, created, **kwargs):
    if not created:
        return

    trial_plan, _ = Plan.objects.get_or_create(
        code="trial",
        defaults={
            "name": "Trial",
            "max_leads": 2,
            "max_comments": 2,
            "max_profile_optimizations": 2,
            "is_trial": True,
        },
    )

    Account.objects.create(
        user=instance,
        plan=trial_plan,
        trial_started_at=timezone.now(),
        # trial_ends_at can be set if you want time-based too
    )
