from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── Groq API keys — PRIMARY provider ─��──────────────────────────────────
    # key1 + key2       → Tier-2 smart extraction (70B, JSON-mode)
    # key1 + key2 + key3 + key4 + key5 → Tier-1 fast extraction (8B)
    # key3 + key4 + key5 + key6 → scoring (filtrage IA)
    groq_api_key:  str = ""
    groq_api_key2: str = ""
    groq_api_key3: str = ""
    groq_api_key4: str = ""
    groq_api_key5: str = ""
    groq_api_key6: str = ""

    # ── SambaNova API keys — FALLBACK provider ──���────────────────────────────
    # Used automatically when Groq hits rate limits (429) or any error
    # key1 + key2  → extraction fallback
    # key3 + key4 + key5 + key6 → scoring fallback
    sambanova_api_key:  str = ""
    sambanova_api_key2: str = ""
    sambanova_api_key3: str = ""
    sambanova_api_key4: str = ""
    sambanova_api_key5: str = ""
    sambanova_api_key6: str = ""

    backend_url: str

    # ── Groq model shortcuts (single-call endpoints) ─────────────────────────
    groq_model_fast:  str = "llama-3.1-8b-instant"      # 8B  — ~560 t/s
    groq_model_smart: str = "llama-3.3-70b-versatile"   # 70B — ~280 t/s

    # ── Groq extraction chains ───────────────────────────────────────────────
    groq_fast_models: List[str] = [
        "llama-3.1-8b-instant",   # 8B  — ~560 t/s ✅
        "openai/gpt-oss-20b",     # 20B — ~1000 t/s ✅
    ]
    groq_smart_models: List[str] = [
        "llama-3.3-70b-versatile",  # 70B  — best quality ✅
        "openai/gpt-oss-120b",      # 120B — high quality ✅
    ]
    groq_scoring_models: List[str] = [
        "llama-3.3-70b-versatile",  # 70B  — best quality ✅
        "openai/gpt-oss-120b",      # 120B ✅
        "openai/gpt-oss-20b",       # 20B  — fast fallback ✅
    ]

    # ── SambaNova model shortcuts (single-call endpoints) ────────────────────
    # NOTE: gpt-oss-120b is a reasoning model on SambaNova — breaks JSON mode.
    # NOTE: Meta-Llama-3.1-8B-Instruct is deprecated on SambaNova.
    sambanova_model_fast:  str = "Meta-Llama-3.3-70B-Instruct"
    sambanova_model_smart: str = "Meta-Llama-3.3-70B-Instruct"

    # ── SambaNova fallback chains ────────────────────────────────────────────
    sambanova_fast_models: List[str] = [
        "Meta-Llama-3.3-70B-Instruct",  # 70B — 1.7s, JSON mode ✅
        "gemma-4-31B-it",               # 31B — 5.3s last resort
    ]
    sambanova_smart_models: List[str] = [
        "Meta-Llama-3.3-70B-Instruct",  # 70B — best quality ✅
        "gemma-4-31B-it",               # 31B — last resort
    ]
    sambanova_scoring_models: List[str] = [
        "Meta-Llama-3.3-70B-Instruct",  # 70B — best quality ✅
        "gemma-4-31B-it",               # 31B — last resort
    ]

    class Config:
        env_file = "../.env"
        extra = "ignore"


settings = Settings()
