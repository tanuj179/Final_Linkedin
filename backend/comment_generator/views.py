from pathlib import Path

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser

from django.conf import settings

from google.cloud import vision

from .models import CommentGeneration
from .serializers import (
    CommentGenerationSerializer,
    CommentGenerateRequestSerializer,
)
from core.ai_openai import get_openai_client
from billing.services import (
    check_and_increment_comments,
    check_comments_quota,
    LimitError,
)
import json


class CommentQuotaCheckView(APIView):
    """
    GET: lightweight check if user can generate a comment.
    No increment; used by extension before screenshot.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            check_comments_quota(request.user)
            return Response(
                {
                    "ok": True,
                    "limit_reached": False,
                },
                status=status.HTTP_200_OK,
            )
        except LimitError as e:
            return Response(
                {
                    "detail": str(e),
                    "limit_reached": True,
                    "upgrade_url": "http://127.0.0.1:8000/home/",
                },
                status=status.HTTP_403_FORBIDDEN,
            )


def load_comment_prompt() -> tuple[str, str]:
    """
    Load SYSTEM and USER templates from prompt_templates/comment_prompt.txt.
    """
    prompt_path = (
        Path(settings.BASE_DIR)
        / "comment_generator"
        / "prompt_templates"
        / "comment_prompt.txt"
    )
    text = prompt_path.read_text(encoding="utf-8")

    system_part = ""
    user_part = ""
    current = None

    for line in text.splitlines():
        if line.strip() == "[SYSTEM]":
            current = "system"
            continue
        if line.strip() == "[USER]":
            current = "user"
            continue
        if current == "system":
            system_part += line + "\n"
        elif current == "user":
            user_part += line + "\n"

    return system_part.strip(), user_part.strip()


def generate_comments_with_gpt(post_text: str, ctx: dict) -> tuple[dict, dict]:
    """
    Calls OpenAI once and returns: (comment_json, raw_meta)
    """
    client = get_openai_client()

    system_text, user_template = load_comment_prompt()

    user_text = (
        user_template
        .replace("{{ post_text }}", post_text)
        .replace("{{ tone }}", ctx.get("tone", ""))
        .replace("{{ audience }}", ctx.get("audience", ""))
        .replace("{{ language }}", ctx.get("language", "en"))
        .replace("{{ num_alternatives }}", str(ctx.get("num_alternatives", 3)))
    )

    model_name = getattr(settings, "OPENAI_API_MODEL", "gpt-4")

    response = client.chat.completions.create(
        model=model_name,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system_text},
            {"role": "user", "content": user_text},
        ],
        max_tokens=600,
        temperature=0.7,
    )

    message = response.choices[0].message
    raw_json_str = message.content or "{}"

    try:
        comment_json = json.loads(raw_json_str)
    except json.JSONDecodeError:
        comment_json = {
            "primary_comment": "",
            "alt_comments": [],
            "style_tags": [],
        }

    usage = getattr(response, "usage", None)
    raw_meta = {
        "model": model_name,
        "usage": usage.model_dump() if usage is not None else None,
        "raw_output": raw_json_str,
    }
    return comment_json, raw_meta


class GenerateCommentView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        # QUOTA CHECK + INCREMENT (this is what bumps comments_used)
        try:
            check_and_increment_comments(request.user)
        except LimitError as e:
            return Response(
                {
                    "detail": str(e),
                    "limit_reached": True,
                    "upgrade_url": "http://127.0.0.1:8000/home/",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # 1) If image is sent, use Vision OCR path
        image_file = request.FILES.get("image")

        post_text = None
        post_url = ""
        tone = ""
        audience = ""
        language = ""
        num_alts = 3

        if image_file:
            try:
                # Read bytes for Vision OCR only (do not save image anywhere)
                content = image_file.read()

                client = vision.ImageAnnotatorClient()
                vision_image = vision.Image(content=content)
                response = client.document_text_detection(image=vision_image)

                vision_error = getattr(getattr(response, "error", None), "message", None)
                if vision_error:
                    return Response(
                        {"error": "Vision OCR failed.", "vision_error": vision_error},
                        status=status.HTTP_502_BAD_GATEWAY,
                    )

                full_text = ""
                if getattr(response, "full_text_annotation", None) and getattr(
                    response.full_text_annotation, "text", None
                ):
                    full_text = response.full_text_annotation.text

                post_text = (full_text or "").strip()
                if len(post_text) > 4000:
                    post_text = post_text[:4000]

                # read tone/audience/language/num_alts from form fields
                tone = request.data.get("tone", "")
                audience = request.data.get("audience", "")
                language = request.data.get("language", "")
                try:
                    num_alts = int(request.data.get("num_alternatives", 3))
                except (TypeError, ValueError):
                    num_alts = 3

            except Exception as e:
                return Response(
                    {"error": "Vision OCR exception.", "details": str(e)},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

        else:
            # 2) Text-only path (no image)
            serializer = CommentGenerateRequestSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            data = serializer.validated_data
            post_text = data["post_text"]
            post_url = data.get("post_url", "")
            tone = data.get("tone", "")
            audience = data.get("audience", "")
            language = data.get("language", "")
            num_alts = data.get("num_alternatives", 3)

        # 3) Create DB row with resolved input (no screenshot stored)
        cg = CommentGeneration.objects.create(
            user=request.user,
            post_url=post_url,
            post_text=post_text,
            tone=tone,
            audience=audience,
            language=language,
        )

        ctx = {
            "tone": cg.tone,
            "audience": cg.audience,
            "language": cg.language,
            "num_alternatives": num_alts,
        }

        try:
            comment_json, raw_meta = generate_comments_with_gpt(post_text, ctx)

            cg.primary_comment = comment_json.get("primary_comment", "") or ""
            cg.alt_comments = comment_json.get("alt_comments", []) or []
            cg.style_tags = comment_json.get("style_tags", []) or []
            cg.raw_model_meta = raw_meta or {}
            cg.status = "ok"
            cg.save()

            payload = {
                "id": cg.id,
                "post_text": cg.post_text,
                "primary_comment": cg.primary_comment,
                "alt_comments": cg.alt_comments,
                "style_tags": cg.style_tags,
                "created_at": cg.created_at,
            }
            return Response(payload, status=status.HTTP_201_CREATED)

        except Exception as e:
            cg.status = "failed"
            cg.error_message = str(e)
            cg.save(update_fields=["status", "error_message"])

            return Response(
                {"detail": "Comment generation failed.", "error": str(e)},
                status=status.HTTP_502_BAD_GATEWAY,
            )


class CommentHistoryView(APIView):
    """
    GET: list all comment generations for current user (latest first).
    URL: /comment-generator/history/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = CommentGeneration.objects.filter(user=request.user).order_by("-created_at")
        serializer = CommentGenerationSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class LatestCommentView(APIView):
    """
    GET: latest successful comment generation for current user.
    URL: /comment-generator/latest/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cg = (
            CommentGeneration.objects
            .filter(user=request.user, status="ok")
            .order_by("-created_at")
            .first()
        )
        if not cg:
            return Response(
                {"detail": "No generated comment found yet."},
                status=status.HTTP_404_NOT_FOUND,
            )

        data = {
            "id": cg.id,
            "primary_comment": cg.primary_comment,
            "alt_comments": cg.alt_comments,
            "style_tags": cg.style_tags,
            "tone": cg.tone,
            "created_at": cg.created_at,
        }
        return Response(data, status=status.HTTP_200_OK)
