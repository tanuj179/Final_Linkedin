from rest_framework import serializers
from .models import ProfileAnalysis


class ProfileAnalysisSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProfileAnalysis
        fields = "__all__"
        read_only_fields = (
            "user",
            "created_at",
            "ocr_status",
            "ocr_raw_json",
            "ocr_full_text",
            "ocr_error_message",
            "cleaned_profile_json",
            # LeadzMachine output fields are server-written only
            "overall_score",
            "rubric_json",
            "quick_wins",
            "headline_options",
            "about_outline",
            "cta_snippets",
            "asset_specs",
            "notes",
            "raw_model_meta",
            # Legacy
            "gpt_raw_json",
            "gpt_score",
        )


class ProfileAnalyzerRequestSerializer(serializers.Serializer):
    """
    Request body for POST /api/profile-analyzer/analyze/
    Matches the doc:
    - ocr_text: required (string; Cloud Vision output)
    - section: optional ("full"|"headline"|"about"|"services"|"featured"|"experience"|"skills")
    - profile_url: optional
    - role_or_industry: optional
    - target_audience: optional
    - desired_cta: optional
    - consent_store_screenshot: boolean (default false)
    - screenshot_url: optional
    """

    ocr_text = serializers.CharField(max_length=12000)
    section = serializers.ChoiceField(
        choices=["full", "headline", "about", "services", "featured", "experience", "skills"],
        required=False,
        default="full",
    )
    profile_url = serializers.URLField(required=False, allow_blank=True)
    role_or_industry = serializers.CharField(required=False, allow_blank=True)
    target_audience = serializers.CharField(required=False, allow_blank=True)
    desired_cta = serializers.CharField(required=False, allow_blank=True)
    consent_store_screenshot = serializers.BooleanField(required=False, default=False)
    screenshot_url = serializers.URLField(required=False, allow_blank=True)
