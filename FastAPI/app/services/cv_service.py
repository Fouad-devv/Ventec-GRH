"""
CV extraction service.
Orchestrates pdfplumber/OCR text extraction + LLM-based structuring.
"""
import asyncio
import json
import logging

from app.config import settings
from app.core.clients import (
    _gemini_extraction_clients,
    _extraction_fast_clients, _extraction_clients,
    _extraction_fast_fallback, _extraction_fallback,
    _SKIP_MODEL_SIGNALS,
)
from app.core.fallback import _call_providers, _call_with_fallback
from app.models.schemas import ExtractCvResponse
from app.utils.helpers import _parse_cv_json, _build_cv_result, _is_transient_error

logger = logging.getLogger(__name__)


async def _run_cv_extraction(text: str, source: str = "native") -> ExtractCvResponse:
    """
    Extract structured CV data using the LLM fallback chain.
    `source` is 'pdfplumber', 'ocr', 'text', or 'pdfplumber_fallback' — used to
    tune the prompt so the model is aware of potential OCR noise.
    """
    ocr_note = ""
    if source == "ocr":
        ocr_note = (
            "\nATTENTION : ce texte a été extrait par reconnaissance optique de caractères (OCR) "
            "depuis un CV scanné. Il peut contenir des erreurs de reconnaissance (lettres confondues, "
            "espaces parasites, lignes fusionnées). Corrige silencieusement les erreurs évidentes "
            "lors de l'extraction et base-toi sur le contexte pour interpréter les parties ambiguës.\n"
        )

    char_limit = 10_000 if source == "ocr" else 6_000

    prompt = f"""Tu es un expert RH et en analyse de CVs. Extrait avec précision les informations \
suivantes du CV ci-dessous et retourne UNIQUEMENT un objet JSON valide.
{ocr_note}
Format attendu :
{{
  "skills": ["compétence1", "compétence2", ...],
  "experience_years": <nombre entier ou null>,
  "education": "<diplôme le plus élevé obtenu ou null>",
  "current_position": "<intitulé du poste actuel ou du dernier poste occupé ou null>",
  "location": "<ville et/ou pays de résidence ou null>"
}}

Règles strictes :
- skills : compétences techniques (langages, frameworks, outils, certifications) ET soft skills — maximum 15, sans doublons
- experience_years : UNIQUEMENT les années d'expérience professionnelle RÉMUNÉRÉE (CDI, CDD, contrat permanent, freelance). NE PAS compter : stages (stage d'initiation, PFE, stage de fin d'études), projets académiques, activités associatives/clubs, bénévolat. Un étudiant qui n'a que des stages → 0. Si non précisé, déduis-le uniquement des dates des postes salariés. ARRONDI : arrondir à l'entier le plus proche (6 mois ou plus → 1 an ; 18 mois → 2 ans). EXEMPLES : étudiant avec "Stage d'initiation 2 mois" → 0 ; "CDI 2 ans" → 2 ; "CDD 6 mois" → 1 ; "1 an CDD + stage 6 mois" → 1.
- education : diplôme principal (ex. "Master Informatique", "Licence Gestion", "Bac+5 Ingénieur") — le plus haut obtenu
- current_position : poste exact tel qu'il apparaît dans le CV
- location : ville et pays si disponibles (ex. "Alger, Algérie")
- Si une information est absente ou impossible à déduire, retourne null pour ce champ
- Ne retourne QUE le JSON, sans aucun texte avant ou après

CV :
{text[:char_limit]}
"""
    raw = await _call_with_fallback(
        [{"role": "user", "content": prompt}],
        model_type="fast", use_json=True, label="extract-cv",
    )
    data = json.loads(raw)
    skills = data.get("skills", [])
    if isinstance(skills, str):
        skills = [s.strip() for s in skills.split(",") if s.strip()]
    return ExtractCvResponse(
        skills=skills[:15],
        experience_years=data.get("experience_years"),
        education=data.get("education"),
        current_position=data.get("current_position"),
        location=data.get("location"),
    )


async def _run_cv_extraction_full(text: str, source: str = "native") -> dict:
    """
    Full CV extraction with a two-tier multi-model fallback chain.

    Tier 1 — fast (8B class), no JSON-mode, input capped at 4 000 chars:
      Tries Gemini fast → Groq fast → SambaNova fast.

    Tier 2 — smart (70B class), JSON-mode, full text — only if Tier 1 returns
    unparseable JSON (rare; happens for very rich/long CVs).
    """
    ocr_note = (
        "\nATTENTION : texte extrait par OCR, peut contenir des erreurs.\n"
        if source == "ocr" else ""
    )

    prompt_base = (
        "Tu es un expert RH en analyse de CVs. Extrait les informations suivantes.\n"
        + ocr_note
        + """
Retourne UNIQUEMENT un objet JSON valide :
{
  "first_name": "<prénom ou null>",
  "last_name": "<nom de famille ou null>",
  "email": "<adresse email valide contenant @ ou null — NE JAMAIS mettre un lien LinkedIn, URL ou numéro de téléphone>",
  "phone": "<numéro de téléphone ou null>",
  "skills": ["compétence1", "compétence2"],
  "experience_years": <entier ou null>,
  "education": "<diplôme le plus élevé ou null>",
  "current_position": "<dernier poste occupé ou null>",
  "location": "<ville/pays ou null>"
}
Règles strictes :
- skills : max 15, sans doublons
- experience_years : UNIQUEMENT les années d'expérience professionnelle RÉMUNÉRÉE (CDI, CDD, contrat permanent, freelance). NE PAS compter : stages (stage d'initiation, PFE, stage de fin d'études), projets académiques, activités associatives/clubs, bénévolat, projets personnels. Un candidat encore en formation qui a seulement effectué des stages → experience_years = 0. ARRONDI : arrondir à l'entier le plus proche (6 mois ou plus → 1 an ; 18 mois → 2 ans).
- email : doit obligatoirement contenir "@", sinon retourner null
- Retourner QUE le JSON, sans texte avant ou après

EXEMPLES CRITIQUES pour experience_years :
• Étudiant en école d'ingénieurs avec uniquement "Stage d'initiation 2 mois" → experience_years: 0
• Candidat avec "CDI 2 ans chez Société X" → experience_years: 2
• Candidat avec "CDD 6 mois" → experience_years: 1 (arrondi à l'entier le plus proche)
• Candidat avec "1 an CDD + Stage de 6 mois" → experience_years: 1 (stage non compté)
• Étudiant avec PFE + clubs + projets académiques → experience_years: 0

CV :
"""
    )

    # ── Tier 1: fast chain — no JSON-mode, 4 000-char cap ────────────────────
    fast_chains = [
        ("gemini", _gemini_extraction_clients, settings.gemini_fast_models),
        ("groq",   _extraction_fast_clients,   settings.groq_fast_models),
        ("samba",  _extraction_fast_fallback,  settings.sambanova_fast_models),
    ]
    fast_msgs = [{"role": "user", "content": prompt_base + text[:4000]}]
    try:
        raw = await _call_providers(fast_chains, fast_msgs, use_json_format=False, label="fast")
        try:
            return _build_cv_result(_parse_cv_json(raw))
        except json.JSONDecodeError:
            logger.warning("Tier-1 fast chain returned unparseable JSON — escalating to Tier-2 smart chain")
    except Exception as fast_err:
        e_lower = str(fast_err).lower()
        if any(sig in e_lower for sig in _SKIP_MODEL_SIGNALS):
            logger.warning("Tier-1 fast chain exhausted (%s) — escalating to Tier-2 smart chain", str(fast_err)[:80])
        else:
            raise

    # ── Tier 2: smart chain — JSON-mode, full text ────────────────────────────
    smart_chains = [
        ("gemini", _gemini_extraction_clients, settings.gemini_smart_models),
        ("groq",   _extraction_clients,        settings.groq_smart_models),
        ("samba",  _extraction_fallback,       settings.sambanova_smart_models),
    ]
    smart_msgs = [{"role": "user", "content": prompt_base + text[:12000]}]
    raw = await _call_providers(smart_chains, smart_msgs, use_json_format=True, label="smart")
    return _build_cv_result(_parse_cv_json(raw))


async def _extract_full_with_retry(text: str, source: str, filename: str, max_retries: int = 3) -> dict:
    """
    Calls _run_cv_extraction_full with exponential backoff on any transient error.
    Retries on: 429 rate-limit, 5xx, connection/timeout errors.
    Fails immediately on permanent errors (auth failure, bad request, etc.).
    """
    last_error: Exception = Exception("unknown")
    for attempt in range(max_retries):
        try:
            return await _run_cv_extraction_full(text, source)
        except Exception as e:
            last_error = e
            if _is_transient_error(e):
                wait = 5 * (2 ** attempt)  # 5s, 10s, 20s
                logger.warning(
                    "Transient error on '%s' [%s] — retrying in %ds (attempt %d/%d): %s",
                    filename, type(e).__name__, wait, attempt + 1, max_retries, str(e)[:120],
                )
                await asyncio.sleep(wait)
            else:
                logger.error(
                    "Permanent error on '%s' [%s] — not retrying: %s",
                    filename, type(e).__name__, str(e)[:200],
                )
                raise
    logger.error("All %d attempts failed for '%s': %s", max_retries, filename, str(last_error)[:200])
    raise last_error
