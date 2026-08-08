from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── SambaNova API keys ───────────────────────────────────────────────────
    # key1 + key2  → extraction (CV, fiche de poste, other endpoints)
    # key3 + key4 + key5 + key6 → scoring (filtrage IA)
    sambanova_api_key:  str = ""
    sambanova_api_key2: str = ""
    sambanova_api_key3: str = ""
    sambanova_api_key4: str = ""
    sambanova_api_key5: str = ""
    sambanova_api_key6: str = ""

    backend_url: str

    # ── Model shortcuts for single-call endpoints ────────────────────────────
    # (description, interview questions, checklist, fiche de fonction, etc.)
    sambanova_model_fast:  str = "Meta-Llama-3.3-70B-Instruct"  # 70B — ~1.7s ✅
    sambanova_model_smart: str = "Meta-Llama-3.3-70B-Instruct"  # same — best quality

    # ── Extraction chains ────────────────────────────────────────────────────
    # NOTE: gpt-oss-120b is a reasoning model (chain-of-thought) — breaks JSON mode, do NOT use.
    # NOTE: Meta-Llama-3.1-8B-Instruct is deprecated on SambaNova.
    sambanova_fast_models: List[str] = [
        "Meta-Llama-3.3-70B-Instruct",  # 70B — 1.7s, JSON mode ✅
        "gemma-4-31B-it",               # 31B — 5.3s fallback
    ]

    sambanova_smart_models: List[str] = [
        "Meta-Llama-3.3-70B-Instruct",  # 70B — best quality ✅
        "gemma-4-31B-it",               # 31B — fallback
    ]

    # ── Scoring chain ────────────────────────────────────────────────────────
    sambanova_scoring_models: List[str] = [
        "Meta-Llama-3.3-70B-Instruct",  # 70B — best quality ✅
        "gemma-4-31B-it",               # 31B — fallback
    ]

    class Config:
        env_file = "../.env"
        extra = "ignore"


settings = Settings()
