from django.db import models
from accounts.models import CustomUser


class CommentGeneration(models.Model):
    """
    Stores:
    - Input post text / URL and context for comment generation
    - AI-generated primary comment + alternatives
    - Metadata for debugging and history
    """

    # Core
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name="comment_generations",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Input describing the LinkedIn post
    post_url = models.URLField(
        blank=True,
        null=True,
        help_text="Optional: LinkedIn post URL where this comment will be used.",
    )
    post_text = models.TextField(
        blank=True,
        help_text="Post content or snippet captured from the LinkedIn DOM.",
    )

    # UI-selected tone + context (chips etc.)
    tone = models.CharField(
        max_length=64,
        blank=True,
        help_text='Tone hint, e.g. "positive", "insightful", "celebration".',
    )
    audience = models.CharField(
        max_length=128,
        blank=True,
        help_text="Optional: target audience / ICP for the comment.",
    )
    language = models.CharField(
        max_length=32,
        blank=True,
        help_text="Optional: language code or name, e.g. en, hi, fr.",
    )
    extra_context = models.JSONField(
        blank=True,
        null=True,
        help_text="Optional JSON with additional knobs (length, style flags, etc.).",
    )

    # Generated output (LLM) – what fills the draft textarea + options
    primary_comment = models.TextField(
        blank=True,
        help_text="Main suggested comment text (shown in the draft textarea).",
    )
    alt_comments = models.JSONField(
        default=list,
        help_text="List of alternative comment suggestions (strings).",
    )
    style_tags = models.JSONField(
        default=list,
        help_text="Tags summarizing style, e.g. ['supportive', 'concise'].",
    )

    # Model meta + status
    raw_model_meta = models.JSONField(
        default=dict,
        help_text="Raw meta from LLM calls (model, tokens, raw_output, etc.).",
    )
    status = models.CharField(
        max_length=16,
        default="ok",
        help_text='Generation status: "ok" or "failed".',
    )
    error_message = models.TextField(
        blank=True,
        help_text="If failed, store error details for debugging.",
    )

    def __str__(self):
        return f"CommentGeneration {self.pk} for {getattr(self.user, 'email', str(self.user))}"

