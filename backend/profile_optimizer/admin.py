from django.contrib import admin
from django.utils.html import format_html
from .models import ProfileAnalysis


@admin.register(ProfileAnalysis)
class ProfileAnalysisAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "image_preview",
        "store_image",      # flag visible in list
        "section",
        "overall_score",
        "ocr_status",
        "created_at",
    )
    list_editable = ("store_image",)
    search_fields = ("user__email", "profile_url")
    list_filter = ("ocr_status", "section", "store_image", "created_at")

    def image_preview(self, obj):
        if obj.image and hasattr(obj.image, "url"):
            return format_html(
                '<a href="{0}" target="_blank">'
                '<img src="{0}" style="max-height:60px; max-width:60px;" />'
                "</a>",
                obj.image.url,
            )
        return "-"
    image_preview.short_description = "Image"
