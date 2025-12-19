from django.db import models
from django.conf import settings


class Lead(models.Model):
    name = models.CharField(max_length=255)
    linkedin_url = models.URLField()
    job_title = models.CharField(max_length=255, blank=True, null=True)
    company = models.CharField(max_length=255, blank=True, null=True)
    email = models.CharField(max_length=255, blank=True, null=True)
    added_date = models.DateTimeField(auto_now_add=True)
    tags = models.CharField(max_length=255, blank=True, null=True, default='Prospect')
    notes = models.TextField(blank=True, null=True)
    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='leads'
    )

    def __str__(self):
        return f"{self.name} ({self.linkedin_url})"
