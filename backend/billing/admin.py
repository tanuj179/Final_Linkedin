# billing/admin.py
from django.contrib import admin
from .models import Plan, Account


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = (
        "code",
        "name",
        "max_leads",
        "max_comments",
        "max_profile_optimizations",
        "is_trial",
        "price_per_month",
    )
    search_fields = ("code", "name")


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "plan",
        "leads_used",
        "comments_used",
        "profile_optimizations_used",
        "hard_block",
    )
    list_filter = ("plan", "hard_block")
    search_fields = ("user__email",)
