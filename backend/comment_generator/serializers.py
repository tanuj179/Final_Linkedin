from rest_framework import serializers
from .models import CommentGeneration


class CommentGenerationSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommentGeneration
        fields = "__all__"
        read_only_fields = (
            "user",
            "created_at",
            "updated_at",
            "primary_comment",
            "alt_comments",
            "style_tags",
            "raw_model_meta",
            "status",
            "error_message",
        )


class CommentGenerateRequestSerializer(serializers.Serializer):
    """
    Request body for POST /comment-generator/generate/
    Used only in text mode (no image).
    """

    post_text = serializers.CharField(
        max_length=6000,
        required=False,
        allow_blank=False,
    )
    post_url = serializers.URLField(required=False, allow_blank=True)
    tone = serializers.CharField(required=False, allow_blank=True)
    audience = serializers.CharField(required=False, allow_blank=True)
    language = serializers.CharField(required=False, allow_blank=True)
    # how many variants user wants
    num_alternatives = serializers.IntegerField(
        required=False,
        min_value=1,
        max_value=5,
        default=3,
    )
