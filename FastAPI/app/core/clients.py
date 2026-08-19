"""
LLM client instances for extraction and generation tasks.

Key allocation:
  Gemini  key1+2  → extraction & generation
  Groq    key1+2  → extraction & generation fallback
  SambaNova key1+2 → extraction & generation final fallback

  Gemini  key3-6  → scoring (in services/scorer.py)
  Groq    key3-6  → scoring fallback
  SambaNova key3-6 → scoring final fallback
"""
import asyncio

from openai import AsyncOpenAI

from app.config import settings

# ── Gemini — PRIMARY (key1-2) ─────────────────────────────────────────────────
_GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/openai/"

_gemini_client = AsyncOpenAI(
    api_key=settings.gemini_api_key, base_url=_GEMINI_BASE, max_retries=0,
) if settings.gemini_api_key else None

_gemini_client2 = AsyncOpenAI(
    api_key=settings.gemini_api_key2 or settings.gemini_api_key, base_url=_GEMINI_BASE, max_retries=0,
) if settings.gemini_api_key else None

_gemini_extraction_clients = [c for c in [_gemini_client, _gemini_client2] if c is not None]

# ── Groq — FALLBACK #1 (key1-2) ───────────────────────────────────────────────
_GROQ_BASE = "https://api.groq.com/openai/v1"

_groq_client = AsyncOpenAI(
    api_key=settings.groq_api_key, base_url=_GROQ_BASE, max_retries=0,
) if settings.groq_api_key else None

_groq_client2 = AsyncOpenAI(
    api_key=settings.groq_api_key2 or settings.groq_api_key, base_url=_GROQ_BASE, max_retries=0,
) if settings.groq_api_key else None

# key3-6 are reserved for scoring in services/scorer.py
_extraction_fast_clients = [c for c in [_groq_client, _groq_client2] if c is not None]
_extraction_clients      = [c for c in [_groq_client, _groq_client2] if c is not None]

# ── SambaNova — FALLBACK #2 (key1-2) ─────────────────────────────────────────
_SAMBANOVA_BASE = "https://api.sambanova.ai/v1"
_SAMBANOVA_TIMEOUT = 120.0

_sambanova_client = AsyncOpenAI(
    api_key=settings.sambanova_api_key, base_url=_SAMBANOVA_BASE, max_retries=0, timeout=_SAMBANOVA_TIMEOUT,
) if settings.sambanova_api_key else None

_sambanova_client2 = AsyncOpenAI(
    api_key=settings.sambanova_api_key2 or settings.sambanova_api_key, base_url=_SAMBANOVA_BASE, max_retries=0, timeout=_SAMBANOVA_TIMEOUT,
) if settings.sambanova_api_key else None

_extraction_fast_fallback = [c for c in [_sambanova_client, _sambanova_client2] if c is not None]
_extraction_fallback      = [c for c in [_sambanova_client, _sambanova_client2] if c is not None]

# Limit concurrent full extractions to avoid Gemini per-minute quota bursts
# (50 CVs imported at once → processed in ~10 batches of 5 instead of all at once)
_extraction_semaphore = asyncio.Semaphore(5)

# Signals that mean "this model/key can't serve now — skip to next key/model/provider"
_SKIP_MODEL_SIGNALS = (
    "429", "rate limit", "too many requests", "rate_limit",
    "json_validate_failed", "max completion tokens",
    "decommissioned", "model_decommissioned",
    "404", "not found", "model_not_found", "does not exist",
    "402", "payment", "billing", "subscription",
    "quota", "resource_exhausted", "quota_exceeded",
    "503", "service unavailable", "temporarily unavailable", "high demand",
    "unavailable", "transient",
)
