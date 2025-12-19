from django.db import models
from accounts.models import CustomUser


class ProfileAnalysis(models.Model):
    """
    Stores:
    - Uploaded LinkedIn screenshot
    - Vision OCR raw output + cleaned profile JSON
    - Final LinkedIn Profile Analyzer JSON (LeadzMachine schema)
    """

    # Core
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name="profile_analyses",
    )
    image = models.ImageField(
        upload_to="profile_images/%Y/%m/%d/"
    )
    store_image = models.BooleanField(
        default=True,
        help_text="Whether this screenshot should be stored long-term.",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    # Optional profile context (user-provided)
    profile_url = models.URLField(
        blank=True,
        null=True,
        help_text="Optional: user-supplied LinkedIn profile URL.",
    )
    screenshot_url = models.URLField(
        blank=True,
        null=True,
        help_text="Optional: S3/GCS path if screenshot is stored separately.",
    )
    section = models.CharField(
        max_length=32,
        default="full",
        help_text='Section focus: "full"|"headline"|"about"|"services"|"featured"|"experience"|"skills".',
    )

    # Vision OCR
    ocr_status = models.CharField(
        max_length=16,
        default="pending",  # pending / ok / failed
    )
    ocr_raw_json = models.JSONField(
        blank=True,
        null=True,
        help_text="Raw JSON response from Google Vision / Gemini OCR.",
    )
    ocr_full_text = models.TextField(
        blank=True,
        help_text="Full text extracted from OCR.",
    )
    ocr_error_message = models.TextField(
        blank=True,
        help_text="Any OCR / parser errors.",
    )

    # Cleaned profile JSON (from ocr_cleaner.clean_ocr_to_profile)
    cleaned_profile_json = models.JSONField(
        blank=True,
        null=True,
        help_text="Heuristically cleaned profile JSON derived from OCR.",
    )

    # New: LeadzMachine Profile Analyzer output (strict JSON schema)
    overall_score = models.IntegerField(
        default=0,
        help_text="0–100 overall score from analyzer.",
    )
    rubric_json = models.JSONField(
        default=dict,
        help_text="Rubric scores JSON: photo/banner/headline/about/services/featured/experience/skills/cta_consistency.",
    )
    quick_wins = models.JSONField(
        default=list,
        help_text="List of quick wins (strings).",
    )
    headline_options = models.JSONField(
        default=list,
        help_text="List of generated headline options.",
    )
    about_outline = models.JSONField(
        default=list,
        help_text='Outline array, usually ["Hook","Credibility","Proof","CTA"].',
    )
    cta_snippets = models.JSONField(
        default=list,
        help_text="List of CTA snippet strings.",
    )
    asset_specs = models.JSONField(
        default=list,
        help_text='List of asset spec objects, e.g. [{"name":"Banner","size":"1584×396"},...].',
    )
    notes = models.TextField(
        default="No PII stored or extracted.",
        help_text="Analyzer notes; must respect PII rules.",
    )
    raw_model_meta = models.JSONField(
        default=dict,
        help_text="Raw meta from LLM calls (tokens, cost, model, prompts, etc.).",
    )

    # Legacy GPT fields (kept for backward compatibility, can be deprecated later)
    gpt_raw_json = models.JSONField(
        blank=True,
        null=True,
        help_text="Legacy GPT output JSON (pre-LeadzMachine schema).",
    )
    gpt_score = models.IntegerField(
        blank=True,
        null=True,
        help_text="Legacy single score field.",
    )

    def __str__(self):
        return f"ProfileAnalysis {self.pk} for {getattr(self.user, 'email', str(self.user))}"
