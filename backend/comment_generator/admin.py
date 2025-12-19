from django.contrib import admin
from django.utils.html import format_html
from .models import CommentGeneration


@admin.register(CommentGeneration)
class CommentGenerationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "post_url",
        "tone",
        "status",
        "created_at",
    )
    list_filter = ("status", "tone", "created_at")
    search_fields = ("user__email", "post_url", "post_text")
    readonly_fields = ("created_at", "updated_at", "raw_model_meta", "error_message")
