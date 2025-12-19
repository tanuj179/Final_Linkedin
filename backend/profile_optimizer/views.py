from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser

from google.cloud import vision
from google.protobuf.json_format import MessageToDict

from accounts.models import CustomUser

from profile_optimizer.ocr_cleaner import clean_ocr_to_profile
from profile_optimizer.gpt_client import analyze_profile_ocr
from rest_framework.permissions import IsAuthenticated

import json

from .models import ProfileAnalysis
from .serializers import ProfileAnalysisSerializer


class VisionDebugView(APIView):
    """
    POST: image -> Vision OCR -> clean OCR -> GPT analysis.

    Thunder Client:
    - Method: POST
    - URL:   /profile-optimizer/vision-debug/
    - Auth:  Bearer <access_token>
    - Body:  form-data
        - key: image (type: file)
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        image_file = request.FILES.get("image")

        if not image_file:
            return Response(
                {"error": "Please upload an image file with field name 'image'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create DB record (store uploaded file)
        analysis = ProfileAnalysis.objects.create(
            user=request.user,
            image=image_file,
            ocr_status="pending",
            store_image=True,
        )

        try:
            # Read file content safely
            if hasattr(image_file, "open"):
                image_file.open("rb")
            content = image_file.read()
            if hasattr(image_file, "close"):
                try:
                    image_file.close()
                except Exception:
                    pass

            # Call Google Vision
            client = vision.ImageAnnotatorClient()
            vision_image = vision.Image(content=content)
            response = client.document_text_detection(image=vision_image)

            # Vision errors
            vision_error = getattr(getattr(response, "error", None), "message", None)
            if vision_error:
                analysis.ocr_status = "failed"
                analysis.ocr_error_message = vision_error
                analysis.save(update_fields=["ocr_status", "ocr_error_message"])

                return Response(
                    {
                        "error": "Vision OCR failed.",
                        "vision_error": vision_error,
                        "analysis_id": analysis.id,
                    },
                    status=status.HTTP_502_BAD_GATEWAY,
                )

            # Convert protobuf response to dict
            response_dict = None
            try:
                response_json_text = getattr(response, "to_json", None)
                if callable(response_json_text):
                    response_dict = json.loads(response.to_json())
                else:
                    response_dict = MessageToDict(response._pb)
            except Exception:
                response_dict = None

            # Extract full text if present
            full_text = ""
            if getattr(response, "full_text_annotation", None) and getattr(
                response.full_text_annotation, "text", None
            ):
                full_text = response.full_text_annotation.text

            # Update DB with OCR results
            analysis.ocr_status = "ok"
            analysis.ocr_raw_json = response_dict
            analysis.ocr_full_text = full_text
            analysis.save(update_fields=["ocr_status", "ocr_raw_json", "ocr_full_text"])

            # Run cleaning and save cleaned JSON
            try:
                cleaned_profile_json, meta = clean_ocr_to_profile(
                    ocr_raw_json=response_dict,
                    ocr_full_text=full_text,
                )
                analysis.cleaned_profile_json = cleaned_profile_json
                # keep meta nested under _meta to avoid extra migration
                analysis.cleaned_profile_json["_meta"] = meta
                analysis.save(update_fields=["cleaned_profile_json"])
            except Exception as e:
                existing = analysis.ocr_error_message or ""
                analysis.ocr_error_message = existing + f"\ncleaner_exception: {str(e)}"
                analysis.save(update_fields=["ocr_error_message"])

                return Response(
                    {
                        "error": "OCR cleaning failed.",
                        "details": str(e),
                        "analysis_id": analysis.id,
                        "ocr_raw_json": analysis.ocr_raw_json,
                        "ocr_full_text": analysis.ocr_full_text,
                    },
                    status=status.HTTP_502_BAD_GATEWAY,
                )

            # ---- GPT analyzer on cleaned text ----
            gpt_error = None
            try:
                ocr_text_block = analysis.cleaned_profile_json.get("raw_text", "") or ""
                ctx = {
                    "role_or_industry_or_empty": "",
                    "target_audience_or_empty": "",
                    "desired_cta_or_empty": "",
                    "section_focus": "full",
                }

                print("DEBUG: About to call analyze_profile_ocr")
                analysis_json, raw_meta = analyze_profile_ocr(
                    ocr_text=ocr_text_block,
                    section="full",
                    ctx=ctx,
                )
                print("DEBUG: analyze_profile_ocr returned overall_score =", analysis_json.get("overall_score"))

                # Persist analyzer fields onto the model
                analysis.overall_score = int(analysis_json.get("overall_score", 0))
                analysis.rubric_json = analysis_json.get("rubric", {}) or {}
                analysis.quick_wins = analysis_json.get("quick_wins", []) or []
                analysis.headline_options = analysis_json.get("headline_options", []) or []
                analysis.about_outline = analysis_json.get("about_outline", []) or []
                analysis.cta_snippets = analysis_json.get("cta_snippets", []) or []
                analysis.asset_specs = analysis_json.get("asset_specs", []) or []
                analysis.notes = analysis_json.get("notes", "") or "No PII stored or extracted."
                analysis.raw_model_meta = raw_meta or {}
                analysis.save()
                
            except Exception as e:
                print(f"DEBUG: GPT analysis failed with error: {str(e)}")
                gpt_error = str(e)
                existing = analysis.ocr_error_message or ""
                analysis.ocr_error_message = existing + f"\nanalysis_exception: {str(e)}"
                analysis.save(update_fields=["ocr_error_message"])

            # Build response payload
            payload = {
                "message": "OCR + analysis success." if not gpt_error else "OCR success, analysis failed.",
                "analysis_id": analysis.id,
                "ocr_raw_json": analysis.ocr_raw_json,
                "ocr_full_text": analysis.ocr_full_text,
                "cleaned_profile_json": analysis.cleaned_profile_json,
            }

            if not gpt_error:
                payload.update(
                    {
                        "overall_score": analysis.overall_score,
                        "rubric": analysis.rubric_json,
                        "quick_wins": analysis.quick_wins,
                        "headline_options": analysis.headline_options,
                        "about_outline": analysis.about_outline,
                        "cta_snippets": analysis.cta_snippets,
                        "asset_specs": analysis.asset_specs,
                        "notes": analysis.notes,
                    }
                )
            else:
                payload["analysis_error"] = gpt_error
            
            return Response(payload, status=status.HTTP_201_CREATED)

        except Exception as e:
            analysis.ocr_status = "failed"
            analysis.ocr_error_message = str(e)
            analysis.save(update_fields=["ocr_status", "ocr_error_message"])

            return Response(
                {
                    "error": "Vision OCR exception.",
                    "details": str(e),
                    "analysis_id": analysis.id,
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )


class ProfileAnalysisHistoryView(APIView):
    """
    GET: list all ProfileAnalysis rows for current user (latest first).

    Thunder Client:
    - Method: GET
    - URL: /profile_optimizer/analyses/
    - Auth: Bearer <access_token>
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = ProfileAnalysis.objects.filter(user=request.user).order_by("-created_at")
        serializer = ProfileAnalysisSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class LatestProfileAnalysisView(APIView):
    """
    GET: latest ProfileAnalysis row for current user (for dashboard Profile Optimizer).

    - Method: GET
    - URL:    /profile-optimizer/latest/
    - Auth:   Bearer <access_token>
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        analysis = (
            ProfileAnalysis.objects
            .filter(user=request.user, ocr_status="ok")
            .order_by("-created_at")
            .first()
        )

        if not analysis:
            return Response(
                {"detail": "No profile analysis found yet."},
                status=status.HTTP_404_NOT_FOUND,
            )

        data = {
            "id": analysis.id,
            "created_at": analysis.created_at,
            "section": analysis.section,
            "overall_score": analysis.overall_score,
            "rubric": analysis.rubric_json,
            "quick_wins": analysis.quick_wins,
            "headline_options": analysis.headline_options,
            "about_outline": analysis.about_outline,
            "cta_snippets": analysis.cta_snippets,
            "asset_specs": analysis.asset_specs,
            "notes": analysis.notes,
        }
        return Response(data, status=status.HTTP_200_OK)