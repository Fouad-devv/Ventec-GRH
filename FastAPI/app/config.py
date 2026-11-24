from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── Gemini API keys — PRIMARY provider ───────────────────────────────────
    # key1 + key2       → extraction & generation tasks
    # key3 + key4 + key5 + key6 → scoring / filtrage IA
    gemini_api_key:  str = ""
    gemini_api_key2: str = ""
    gemini_api_key3: str = ""
    gemini_api_key4: str = ""
    gemini_api_key5: str = ""
    gemini_api_key6: str = ""

    # ── Groq API keys — FALLBACK #1 ──────────────────────────────────────────
    # key1 + key2       → Tier-2 smart extraction (70B, JSON-mode)
    # key1–5            → Tier-1 fast extraction (8B)
    # key3–6            → scoring (filtrage IA)
    groq_api_key:  str = ""
    groq_api_key2: str = ""
    groq_api_key3: str = ""
    groq_api_key4: str = ""
    groq_api_key5: str = ""
    groq_api_key6: str = ""

    # ── SambaNova API keys — FALLBACK #2 ─────────────────────────────────────
    # key1 + key2  → extraction fallback
    # key3–6       → scoring fallback
    sambanova_api_key:  str = ""
    sambanova_api_key2: str = ""
    sambanova_api_key3: str = ""
    sambanova_api_key4: str = ""
    sambanova_api_key5: str = ""
    sambanova_api_key6: str = ""

    backend_url: str

    # ── Gemini model chains (confirmed working via OpenAI-compat endpoint) ────
    gemini_model_fast:  str = "gemini-flash-lite-latest"
    gemini_model_smart: str = "gemini-flash-latest"

    gemini_fast_models: List[str] = [
        "gemini-3.5-flash-lite",
    ]
    gemini_smart_models: List[str] = [
        "gemini-flash-latest",       # best quality
        "gemini-3.5-flash",          # fallback
        "gemini-3.1-flash-lite",     # last resort
    ]
    gemini_scoring_models: List[str] = [
        "gemini-3.5-flash",          # best quality
        "gemini-3.6-flash",          # fallback
        "gemini-3.1-flash-lite",     # lightweight fallback
    ]

    # ── Groq model chains ─────────────────────────────────────────────────────
    groq_model_fast:  str = "openai/gpt-oss-20b"
    groq_model_smart: str = "openai/gpt-oss-120b"

    groq_fast_models: List[str] = [
        "openai/gpt-oss-20b",
    ]
    groq_smart_models: List[str] = [
        "openai/gpt-oss-120b",
        "openai/gpt-oss-20b",
    ]
    groq_scoring_models: List[str] = [
        "openai/gpt-oss-120b",
        "openai/gpt-oss-20b",
    ]

    # ── SambaNova model chains ────────────────────────────────────────────────
    # NOTE: gpt-oss-120b is a reasoning model on SambaNova — breaks JSON mode.
    sambanova_model_fast:  str = "Meta-Llama-3.3-70B-Instruct"
    sambanova_model_smart: str = "Meta-Llama-3.3-70B-Instruct"

    sambanova_fast_models: List[str] = [
        "Meta-Llama-3.3-70B-Instruct",
        "gemma-4-31B-it",
    ]
    sambanova_smart_models: List[str] = [
        "Meta-Llama-3.3-70B-Instruct",
        "gemma-4-31B-it",
    ]
    sambanova_scoring_models: List[str] = [
        "Meta-Llama-3.3-70B-Instruct",
        "gemma-4-31B-it",
    ]

    class Config:
        env_file = "../.env"
        extra = "ignore"


settings = Settings()
