from django.contrib import admin
from .models import Lead


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ('name', 'linkedin_url', 'job_title', 'company', 'added_date', 'tags', 'added_by')
    search_fields = ('name', 'company', 'linkedin_url', 'email', 'tags')
    list_filter = ('tags', 'company', 'added_by', 'added_date')
