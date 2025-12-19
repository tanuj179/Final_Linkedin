# core/ai_openai.py
import os
from django.conf import settings
from openai import OpenAI


def get_openai_client():
    """Initialize OpenAI client with proper error handling"""
    api_key = getattr(settings, "OPENAI_API_KEY", None) or os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY not found in settings or environment variables")
    return OpenAI(api_key=api_key)
