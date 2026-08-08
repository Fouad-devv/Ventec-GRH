from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    groq_api_key: str = ""
    groq_api_key2: str = ""
    groq_api_key3: str = ""
    groq_api_key4: str = ""
    groq_api_key5: str = ""
    groq_api_key6: str = ""
    backend_url: str

    # ── Primary model names (kept for backward compat with other endpoints) ──
    groq_model_fast: str = "llama-3.1-8b-instant"
    groq_model_smart: str = "llama-3.3-70b-versatile"

    # ── Multi-model fallback chains for CV extraction ────────────────────────
    # Tier 1 — fast/cheap (8B class).  No JSON-mode used here to avoid
    # Groq's json_validate_failed on long CVs. 500 K TPD each on free tier.
    groq_fast_models: List[str] = [
        "llama-3.1-8b-instant",   # Meta Llama 3.1 8B  — 560 t/s  ✅ active
        "openai/gpt-oss-20b",     # OpenAI GPT-OSS 20B — 1000 t/s ✅ active
    ]

    # Tier 2 — smart/heavy. JSON-mode enabled.
    groq_smart_models: List[str] = [
        "llama-3.3-70b-versatile",  # Meta Llama 3.3 70B  — 280 t/s  ✅ active
        "openai/gpt-oss-120b",      # OpenAI GPT-OSS 120B — 500 t/s  ✅ active
    ]

    # Scoring — 70B/120B/20B only (8B reserved for extraction)
    groq_scoring_models: List[str] = [
        "llama-3.3-70b-versatile",  # 70B  — best quality  ✅
        "openai/gpt-oss-120b",      # 120B — best quality  ✅
        "openai/gpt-oss-20b",       # 20B  — fast fallback ✅
    ]

    class Config:
        env_file = "../.env"
        extra = "ignore"


settings = Settings()
