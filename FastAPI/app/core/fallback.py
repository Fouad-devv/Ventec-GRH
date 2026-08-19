"""
Multi-provider LLM fallback engine.
Tries providers left-to-right, skipping on rate-limit/quota/404 signals.
"""
import logging

from fastapi import HTTPException

from app.config import settings
from app.core.clients import (
    _gemini_extraction_clients,
    _groq_client, _groq_client2,
    _sambanova_client, _sambanova_client2,
    _SKIP_MODEL_SIGNALS,
)

logger = logging.getLogger(__name__)


async def _call_providers(
    chains: list,
    messages: list,
    use_json_format: bool = False,
    label: str = "",
    temperature: float = 0.0,
) -> str:
    """
    Multi-provider, multi-key, multi-model fallback engine.

    chains: [(provider_name, [client, ...], [model, ...]), ...]
      e.g. [("gemini", [c1, c2], ["gemini-flash-lite-latest", "gemini-flash-latest"]),
            ("groq",   [c3, c4], ["llama-3.1-8b-instant"]),
            ("samba",  [c5],     ["Meta-Llama-3.3-70B-Instruct"])]

    Tries each provider's keys × models left-to-right.
    Skips on rate-limit / quota / 404; raises immediately on 5xx / auth errors.
    Falls through to the next provider when all keys+models of one are exhausted.
    """
    last_error: Exception = RuntimeError(f"[{label}] all provider chains exhausted")
    for provider, clients_arg, models in chains:
        active = [c for c in (clients_arg if isinstance(clients_arg, list) else [clients_arg]) if c is not None]
        if not active:
            continue
        for i, c in enumerate(active):
            for model in models:
                try:
                    kwargs: dict = {"model": model, "messages": messages, "temperature": temperature}
                    if use_json_format:
                        kwargs["response_format"] = {"type": "json_object"}
                    resp = await c.chat.completions.create(**kwargs)
                    if not (i == 0 and model == models[0]):
                        logger.info("[%s] succeeded with %s/key%d/%s", label, provider, i + 1, model)
                    return resp.choices[0].message.content
                except Exception as e:
                    if any(sig in str(e).lower() for sig in _SKIP_MODEL_SIGNALS):
                        logger.warning("[%s] Skipping %s/key%d/%s — %s", label, provider, i + 1, model, str(e)[:120])
                        last_error = e
                        continue
                    raise
        logger.warning("[%s] %s exhausted — trying next provider", label, provider)
    raise last_error


async def _call_with_fallback(
    messages: list,
    *,
    model_type: str = "smart",
    use_json: bool = False,
    label: str = "",
    temperature: float = 0.0,
) -> str:
    """
    Generation + match-posting endpoints.
    Gemini (key1+2) → Groq (key1+2) → SambaNova (key1+2), full model-list fallback per provider.
    """
    gemini_models = settings.gemini_smart_models if model_type == "smart" else settings.gemini_fast_models
    groq_models   = settings.groq_smart_models   if model_type == "smart" else settings.groq_fast_models
    samba_models  = settings.sambanova_smart_models if model_type == "smart" else settings.sambanova_fast_models

    chains: list = []
    if _gemini_extraction_clients:
        chains.append(("gemini", _gemini_extraction_clients, gemini_models))
    groq_gen = [c for c in [_groq_client, _groq_client2] if c is not None]
    if groq_gen:
        chains.append(("groq", groq_gen, groq_models))
    samba_gen = [c for c in [_sambanova_client, _sambanova_client2] if c is not None]
    if samba_gen:
        chains.append(("sambanova", samba_gen, samba_models))

    if not chains:
        raise HTTPException(status_code=503, detail="No LLM provider configured")

    return await _call_providers(
        chains, messages,
        use_json_format=use_json,
        label=label,
        temperature=temperature,
    )
