# profile_optimizer/gpt_client.py

import json
import os
from pathlib import Path
from typing import Dict, Tuple

from django.conf import settings
from openai import OpenAI
from core.ai_openai import get_openai_client

def load_profile_review_prompt() -> Tuple[str, str]:
    """
    Load SYSTEM and USER templates from prompt_templates/profile_review.txt.
    File format:

    [SYSTEM]
    ...
    [USER]
    ...
    """
    try:
        prompt_path = Path(settings.BASE_DIR) / "profile_optimizer" / "prompt_templates" / "profile_review.txt"
        
        # Check if file exists, if not create a default one
        if not prompt_path.exists():
            print(f"DEBUG: Prompt file not found at {prompt_path}, creating default")
            create_default_prompt_file(prompt_path)
        
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
    
    except Exception as e:
        print(f"DEBUG: Error loading prompt template: {e}")
        # Return default prompts if file loading fails
        return get_default_prompts()


def create_default_prompt_file(prompt_path: Path):
    """Create a default prompt file if it doesn't exist"""
    prompt_path.parent.mkdir(parents=True, exist_ok=True)
    
    default_content = """[SYSTEM]
You are an expert LinkedIn profile analyzer. Your task is to analyze profile text extracted from images and provide actionable feedback in JSON format.

You must respond with valid JSON containing:
- overall_score: integer from 1-100
- rubric: object with detailed scoring breakdown
- quick_wins: array of immediate improvement suggestions
- headline_options: array of suggested headlines
- about_outline: array of suggested about section points
- cta_snippets: array of call-to-action suggestions
- asset_specs: array of recommended assets/media
- notes: string with additional observations

[USER]
Analyze this LinkedIn profile text:

Role/Industry Focus: {{ role_or_industry_or_empty }}
Target Audience: {{ target_audience_or_empty }}
Desired CTA: {{ desired_cta_or_empty }}
Section Focus: {{ section_focus }}

Profile Text:
{{ ocr_text_block }}

Please provide a comprehensive analysis in JSON format."""
    
    prompt_path.write_text(default_content, encoding="utf-8")


def get_default_prompts() -> Tuple[str, str]:
    """Return default system and user prompts"""
    system_prompt = """You are an expert LinkedIn profile analyzer. Your task is to analyze profile text extracted from images and provide actionable feedback in JSON format.

You must respond with valid JSON containing:
- overall_score: integer from 1-100
- rubric: object with detailed scoring breakdown
- quick_wins: array of immediate improvement suggestions
- headline_options: array of suggested headlines
- about_outline: array of suggested about section points
- cta_snippets: array of call-to-action suggestions
- asset_specs: array of recommended assets/media
- notes: string with additional observations"""

    user_prompt = """Analyze this LinkedIn profile text:

Role/Industry Focus: {{ role_or_industry_or_empty }}
Target Audience: {{ target_audience_or_empty }}
Desired CTA: {{ desired_cta_or_empty }}
Section Focus: {{ section_focus }}

Profile Text:
{{ ocr_text_block }}

Please provide a comprehensive analysis in JSON format."""
    
    return system_prompt, user_prompt


def render_user_prompt_template(user_template: str, ctx: Dict, ocr_text_block: str) -> str:
    """
    Simple string replace for {{ placeholders }} in the USER template.
    """
    rendered = user_template
    rendered = rendered.replace("{{ role_or_industry_or_empty }}", ctx.get("role_or_industry_or_empty", ""))
    rendered = rendered.replace("{{ target_audience_or_empty }}", ctx.get("target_audience_or_empty", ""))
    rendered = rendered.replace("{{ desired_cta_or_empty }}", ctx.get("desired_cta_or_empty", ""))
    rendered = rendered.replace("{{ section_focus }}", ctx.get("section_focus", "full"))
    rendered = rendered.replace("{{ ocr_text_block }}", ocr_text_block)
    return rendered


def analyze_profile_ocr(ocr_text: str, section: str, ctx: Dict) -> Tuple[Dict, Dict]:
    """
    Calls GPT-4o once to produce the profile analysis JSON.

    Returns:
        analysis_json: dict with overall_score, rubric, quick_wins, etc.
        raw_meta: dict with model, usage, raw_output, section.
    """
    print("DEBUG: analyze_profile_ocr called")
    print("DEBUG: section =", section)
    print("DEBUG: ocr_text length =", len(ocr_text))
    
    try:
        # Get OpenAI client
        client = get_openai_client()
        
        # Load prompts
        system_text, user_template = load_profile_review_prompt()
        user_text = render_user_prompt_template(user_template, ctx, ocr_text)
        
        print("DEBUG: About to call OpenAI API")
        
        # Get model from settings or use default
        model = getattr(settings, 'OPENAI_API_MODEL', 'gpt-4')
        print(f"DEBUG: Using model: {model}")
        
        response = client.chat.completions.create(
            model=model,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_text},
                {"role": "user", "content": user_text},
            ],
            max_tokens=2000,
            temperature=0.7,
        )

        print("DEBUG: OpenAI API call successful")
        
        message = response.choices[0].message
        raw_json_str = message.content or "{}"
        
        print(f"DEBUG: Raw response: {raw_json_str[:200]}...")
        
        try:
            analysis_json = json.loads(raw_json_str)
            print(f"DEBUG: Parsed JSON successfully, overall_score = {analysis_json.get('overall_score')}")
        except json.JSONDecodeError as json_err:
            print(f"DEBUG: JSON parsing failed: {json_err}")
            # Return a default structure if JSON parsing fails
            analysis_json = {
                "overall_score": 50,
                "rubric": {"error": "Failed to parse GPT response"},
                "quick_wins": ["Review profile completeness"],
                "headline_options": ["Update your headline"],
                "about_outline": ["Add a compelling about section"],
                "cta_snippets": ["Add a call to action"],
                "asset_specs": [],
                "notes": f"JSON parsing error: {json_err}"
            }

        usage = getattr(response, "usage", None)
        raw_meta = {
            "model": model,
            "usage": usage.model_dump() if usage is not None else None,
            "raw_output": raw_json_str,
            "section": section,
        }
        
        return analysis_json, raw_meta
        
    except Exception as e:
        print(f"DEBUG: analyze_profile_ocr failed with error: {str(e)}")
        # Return a default error response
        error_analysis = {
            "overall_score": 0,
            "rubric": {"error": str(e)},
            "quick_wins": ["Fix configuration issues"],
            "headline_options": [],
            "about_outline": [],
            "cta_snippets": [],
            "asset_specs": [],
            "notes": f"Analysis failed: {str(e)}"
        }
        
        error_meta = {
            "model": "error",
            "usage": None,
            "raw_output": str(e),
            "section": section,
        }
        
        return error_analysis, error_meta