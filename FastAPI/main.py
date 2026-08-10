"""
GRH-VENTEC FastAPI AI Service
Handles:
  - POST /filter                       — async CV filtering + LLM scoring (calls back Spring Boot)
  - POST /extract-cv                   — extract structured data from CV text
  - POST /generate-description         — generate job posting description + requirements
  - POST /generate-interview-questions — generate interview questions for a candidate
  - POST /generate-checklist           — generate required document checklist
  - POST /match-posting                — match inbound email subject to the right job posting
"""
import asyncio
import json as _json
import logging
import re

import httpx
from fastapi import FastAPI, BackgroundTasks, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from openai import AsyncOpenAI

from config import settings
from cv_extractor import extract_text_from_bytes
from deterministic_filter import apply_deterministic_filter
from llm_scorer import score_multiple_candidates
from models import (
    FilterRequest, ExtractCvRequest, ExtractCvResponse,
    GenerateDescriptionRequest, GenerateDescriptionResponse,
    GenerateInterviewQuestionsRequest, GenerateInterviewQuestionsResponse, QuestionItem,
    GenerateChecklistRequest, GenerateChecklistResponse, ChecklistItem,
    GenerateFicheFonctionRequest, GenerateFicheFonctionResponse, CompetenceCritere, ActivityItem,
    ExtractJobPostingResponse,
    MatchPostingRequest, MatchPostingResponse,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="GRH-VENTEC AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "UP"}


@app.post("/filter")
async def request_filter(req: FilterRequest, background_tasks: BackgroundTasks):
    """
    Receives a filter request from Spring Boot.
    Runs in background; calls back /api/callback/filter/{filter_job_id} when done.
    """
    background_tasks.add_task(_run_filter, req)
    return {"accepted": True, "filter_job_id": req.filter_job_id}


async def _run_filter(req: FilterRequest):
    callback_url = f"{settings.backend_url}/callback/filter/{req.filter_job_id}"
    try:
        # 1. Fetch candidate CV data from backend
        candidates_data = await _fetch_candidates(req.candidate_ids)

        # 2. Deterministic filter (experience + age if provided)
        filtered = apply_deterministic_filter(
            candidates_data,
            min_experience=req.min_experience,
            min_age=req.min_age,
            max_age=req.max_age,
        )

        if not filtered:
            await _send_callback(callback_url, "DONE", [])
            return

        # 3. LLM scoring with full job context
        scoring_input = [
            {
                "candidate_id": c["candidate_id"],
                "cv_text": c.get("cv_text", ""),
                "experience_years": c.get("experience_years"),
            }
            for c in filtered
        ]
        results = await score_multiple_candidates(
            scoring_input,
            req.job_description,
            req.requirements,
            extracted_job_data=req.extracted_job_data,
            free_filter_prompt=req.free_filter_prompt,
            min_experience=req.min_experience,
        )

        await _send_callback(callback_url, "DONE", results)

    except Exception as e:
        logger.error("Filter job %s failed: %s", req.filter_job_id, e)
        await _send_callback(callback_url, "FAILED", [], error_message=str(e))


async def _fetch_candidates(candidate_ids: list[str]) -> list[dict]:
    """
    Fetches anonymized candidate CV data from the public /ai/candidates endpoint.
    Returns list of {candidate_id, cv_text, experience_years}.
    Note: endpoint returns NO name, NO age, NO sex — non-discrimination by design.
    """
    results = []
    async with httpx.AsyncClient(timeout=30.0) as client:
        for cid in candidate_ids:
            try:
                resp = await client.get(f"{settings.backend_url}/ai/candidates/{cid}")
                if resp.status_code == 200:
                    data = resp.json()
                    results.append({
                        "candidate_id": cid,
                        "cv_text": data.get("cvExtractedText") or "",
                        "experience_years": data.get("experienceYears"),
                        "skills": data.get("skills") or "",
                        "education": data.get("education") or "",
                        "current_position": data.get("currentPosition") or "",
                    })
                else:
                    results.append({"candidate_id": cid, "cv_text": "", "experience_years": None})
            except Exception as e:
                logger.warning("Failed to fetch candidate %s: %s", cid, e)
                results.append({"candidate_id": cid, "cv_text": "", "experience_years": None})
    return results


async def _send_callback(url: str, status: str, results: list, error_message: str = None):
    payload = {"status": status}
    if status == "DONE":
        payload["result"] = results
    if error_message:
        payload["error_message"] = error_message

    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(url, json=payload)
                if resp.status_code < 300:
                    logger.info("Callback sent to %s — status: %s", url, status)
                    return
                logger.warning("Callback attempt %d returned %d", attempt + 1, resp.status_code)
        except Exception as e:
            logger.error("Callback attempt %d failed: %s", attempt + 1, e)
        await asyncio.sleep(2 ** attempt)

    logger.error("All callback attempts failed for %s", url)


# ── Groq — PRIMARY ──────────────────────────────────────────────────────────
_GROQ_BASE = "https://api.groq.com/openai/v1"

_groq_client = AsyncOpenAI(
    api_key=settings.groq_api_key, base_url=_GROQ_BASE, max_retries=0,
) if settings.groq_api_key else None
_groq_client2 = AsyncOpenAI(
    api_key=settings.groq_api_key2 or settings.groq_api_key, base_url=_GROQ_BASE, max_retries=0,
) if settings.groq_api_key else None
_groq_client3 = AsyncOpenAI(
    api_key=settings.groq_api_key3 or settings.groq_api_key, base_url=_GROQ_BASE, max_retries=0,
) if settings.groq_api_key else None
_groq_client4 = AsyncOpenAI(
    api_key=settings.groq_api_key4 or settings.groq_api_key3 or settings.groq_api_key, base_url=_GROQ_BASE, max_retries=0,
) if settings.groq_api_key else None
_groq_client5 = AsyncOpenAI(
    api_key=settings.groq_api_key5 or settings.groq_api_key4 or settings.groq_api_key3 or settings.groq_api_key, base_url=_GROQ_BASE, max_retries=0,
) if settings.groq_api_key else None

# Tier-1 fast: key1-5 (8B models, no JSON-mode)
_extraction_fast_clients = [c for c in [_groq_client, _groq_client2, _groq_client3, _groq_client4, _groq_client5] if c is not None]
# Tier-2 smart: key1-2 only (70B, JSON-mode)
_extraction_clients = [c for c in [_groq_client, _groq_client2] if c is not None]


# ── SambaNova — FALLBACK ──────────────────────────────────────────────────────
# Activated automatically when all Groq chains hit rate limits or errors.
# Default SDK connect timeout (5s) is too short from some regions — use 120s.
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


def _require_groq():
    if not _groq_client:
        raise HTTPException(status_code=503, detail="Groq API key not configured")
    return _groq_client


_EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')

def _clean_email(value) -> str | None:
    """Return the value only if it is a real email address — reject URLs, LinkedIn links, etc."""
    if not value or not isinstance(value, str):
        return None
    value = value.strip()
    if _EMAIL_RE.match(value):
        return value
    return None


async def _run_cv_extraction(text: str, source: str = "native") -> ExtractCvResponse:
    """
    Extract structured CV data using Groq (Llama).
    `source` is 'pdfplumber', 'ocr', 'text', or 'pdfplumber_fallback' — used to
    tune the prompt so the model is aware of potential OCR noise.
    """
    # OCR text can contain garbled characters — tell the model explicitly
    ocr_note = ""
    if source == "ocr":
        ocr_note = (
            "\nATTENTION : ce texte a été extrait par reconnaissance optique de caractères (OCR) "
            "depuis un CV scanné. Il peut contenir des erreurs de reconnaissance (lettres confondues, "
            "espaces parasites, lignes fusionnées). Corrige silencieusement les erreurs évidentes "
            "lors de l'extraction et base-toi sur le contexte pour interpréter les parties ambiguës.\n"
        )

    # Send more text for OCR (noisier, needs more context to extract same info)
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
    data = _json.loads(raw)
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


@app.post("/extract-cv", response_model=ExtractCvResponse)
async def extract_cv(req: ExtractCvRequest):
    """Extracts structured data from raw CV text (already extracted by the caller)."""
    if not settings.groq_api_key and not settings.sambanova_api_key:
        return ExtractCvResponse(skills=[], experience_years=None,
                                 education=None, current_position=None, location=None)
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=422, detail="Le texte du CV est vide")
    try:
        return await _run_cv_extraction(req.text, source="text")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("CV extraction failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/extract-cv-file", response_model=ExtractCvResponse)
async def extract_cv_file(file: UploadFile = File(...)):
    """
    Extracts structured data from an uploaded CV file.
    - Native PDF  → pdfplumber (fast, precise)
    - Scanned PDF → pytesseract OCR at 300 DPI (automatic fallback)
    - Plain text  → UTF-8 decode
    """
    if not settings.groq_api_key and not settings.sambanova_api_key:
        return ExtractCvResponse(skills=[], experience_years=None,
                                 education=None, current_position=None, location=None)
    try:
        content = await file.read()
        filename = file.filename or "file.pdf"
        text, method = extract_text_from_bytes(content, filename)

        logger.info(
            "CV '%s' extracted via %s — %d characters",
            filename, method, len(text),
        )

        if not text.strip():
            raise HTTPException(
                status_code=422,
                detail=(
                    "Impossible d'extraire le texte du CV. "
                    "Vérifiez que le fichier n'est pas protégé ou corrompu."
                ),
            )

        return await _run_cv_extraction(text, source=method)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("CV file extraction failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


_JSON_BLOCK_RE = re.compile(r'\{[\s\S]*\}')

# Errors that mean "this model can't serve the request right now — try the next one"
_SKIP_MODEL_SIGNALS = (
    "429", "rate limit", "too many requests", "rate_limit",
    "json_validate_failed", "max completion tokens",
    "decommissioned", "model_decommissioned",
    "404", "not found", "model_not_found", "does not exist",
    "402", "payment", "billing", "subscription",
)


def _parse_cv_json(raw: str) -> dict:
    """Parse JSON from a Groq response, with markdown-fence fallback."""
    try:
        return _json.loads(raw)
    except _json.JSONDecodeError:
        m = _JSON_BLOCK_RE.search(raw)
        if m:
            return _json.loads(m.group())
        raise


def _build_cv_result(data: dict) -> dict:
    skills = data.get("skills", [])
    if isinstance(skills, str):
        skills = [s.strip() for s in skills.split(",") if s.strip()]
    return {
        "first_name": data.get("first_name"),
        "last_name": data.get("last_name"),
        "email": _clean_email(data.get("email")),
        "phone": data.get("phone"),
        "skills": skills[:15],
        "experience_years": data.get("experience_years"),
        "education": data.get("education"),
        "current_position": data.get("current_position"),
        "location": data.get("location"),
    }


async def _call_groq(
    client,
    models: list,
    messages: list,
    use_json_format: bool = False,
    label: str = "",
    fallback_clients=None,
    fallback_models=None,
) -> str:
    """
    Try each model across all clients in sequence.
    client can be a single AsyncOpenAI instance or a list of instances.
    Moves to the next model/client on 429, decommissioned, or not_found.
    If all primary (Groq) chains are exhausted, tries fallback_clients with fallback_models (SambaNova).
    Re-raises immediately on 5xx / connection errors.
    """
    clients = client if isinstance(client, list) else [client]
    last_error: Exception = RuntimeError(f"[{label}] all extraction chains exhausted")
    for i, c in enumerate(clients):
        key_label = f"key{i + 1}"
        for model in models:
            try:
                kwargs: dict = {"model": model, "messages": messages, "temperature": 0.0}
                if use_json_format:
                    kwargs["response_format"] = {"type": "json_object"}
                resp = await c.chat.completions.create(**kwargs)
                if i > 0 or model != models[0]:
                    logger.info("[%s] CV extraction succeeded with %s/%s", label, key_label, model)
                return resp.choices[0].message.content
            except Exception as e:
                e_lower = str(e).lower()
                if any(sig in e_lower for sig in _SKIP_MODEL_SIGNALS):
                    logger.warning("[%s] Skipping %s/%s — %s", label, key_label, model, str(e)[:120])
                    last_error = e
                    continue
                raise
    # All primary (Groq) exhausted — switch to SambaNova fallback
    if fallback_clients and fallback_models:
        logger.warning("[%s] Groq exhausted — switching to SambaNova fallback", label)
        fb_clients = fallback_clients if isinstance(fallback_clients, list) else [fallback_clients]
        for i, c in enumerate(fb_clients):
            key_label = f"samba-key{i + 1}"
            for model in fallback_models:
                try:
                    kwargs: dict = {"model": model, "messages": messages, "temperature": 0.0}
                    if use_json_format:
                        kwargs["response_format"] = {"type": "json_object"}
                    resp = await c.chat.completions.create(**kwargs)
                    logger.info("[%s] SambaNova fallback succeeded with %s/%s", label, key_label, model)
                    return resp.choices[0].message.content
                except Exception as e:
                    e_lower = str(e).lower()
                    if any(sig in e_lower for sig in _SKIP_MODEL_SIGNALS):
                        logger.warning("[%s] Skipping fallback %s/%s — %s", label, key_label, model, str(e)[:120])
                        last_error = e
                        continue
                    raise
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
    Single-call with Groq primary → SambaNova fallback.
    Used by generate-description, interview questions, checklist, fiche de fonction, etc.
    """
    groq_model = settings.groq_model_smart if model_type == "smart" else settings.groq_model_fast
    samba_model = settings.sambanova_model_smart if model_type == "smart" else settings.sambanova_model_fast
    chains = []
    if _groq_client:
        chains.append(("groq", _groq_client, groq_model))
    if _sambanova_client:
        chains.append(("sambanova", _sambanova_client, samba_model))
    if not chains:
        raise HTTPException(status_code=503, detail="No LLM provider configured")
    last_error: Exception = RuntimeError(f"[{label}] all providers exhausted")
    for provider, c, model in chains:
        try:
            kwargs: dict = {"model": model, "messages": messages, "temperature": temperature}
            if use_json:
                kwargs["response_format"] = {"type": "json_object"}
            resp = await c.chat.completions.create(**kwargs)
            if provider != "groq":
                logger.info("[%s] SambaNova fallback used", label)
            return resp.choices[0].message.content
        except Exception as e:
            if any(sig in str(e).lower() for sig in _SKIP_MODEL_SIGNALS):
                logger.warning("[%s] %s failed — trying next provider: %s", label, provider, str(e)[:80])
                last_error = e
                continue
            raise
    raise last_error


async def _run_cv_extraction_full(text: str, source: str = "native") -> dict:
    """
    Full CV extraction with a two-tier multi-model fallback chain.

    Tier 1 — fast (8B class), no JSON-mode, input capped at 4 000 chars:
      llama-3.1-8b-instant → gemma2-9b-it → llama3-8b-8192 → llama-3.2-11b-vision-preview

    Tier 2 — smart (70B class), JSON-mode, full text — only if Tier 1 returns
    unparseable JSON (rare; happens for very rich/long CVs):
      llama-3.3-70b-versatile → llama-3.3-70b-specdec → deepseek-r1-distill-llama-70b → qwen-qwq-32b

    Within each tier, models are tried left-to-right on 429 / json_validate_failed.
    5xx / connection errors bubble up to _extract_full_with_retry for backoff retries.
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

    # ── Tier 1: fast chain (8B) ── no JSON-mode, 4 000-char cap ─────────────
    fast_msgs = [{"role": "user", "content": prompt_base + text[:4000]}]
    try:
        raw = await _call_groq(
            _extraction_fast_clients, settings.groq_fast_models, fast_msgs,
            use_json_format=False, label="fast",
            fallback_clients=_extraction_fast_fallback,
            fallback_models=settings.sambanova_fast_models,
        )
        try:
            return _build_cv_result(_parse_cv_json(raw))
        except _json.JSONDecodeError:
            logger.warning("Tier-1 fast chain returned unparseable JSON — escalating to Tier-2 smart chain")
    except Exception as fast_err:
        e_lower = str(fast_err).lower()
        if any(sig in e_lower for sig in _SKIP_MODEL_SIGNALS):
            logger.warning("Tier-1 fast chain exhausted (%s) — escalating to Tier-2 smart chain", str(fast_err)[:80])
        else:
            raise

    # ── Tier 2: smart chain (70B) ── JSON-mode, full text ────────────────────
    smart_msgs = [{"role": "user", "content": prompt_base + text[:12000]}]
    raw = await _call_groq(
        _extraction_clients, settings.groq_smart_models, smart_msgs,
        use_json_format=True, label="smart",
        fallback_clients=_extraction_fallback,
        fallback_models=settings.sambanova_smart_models,
    )
    return _build_cv_result(_parse_cv_json(raw))


def _is_transient_error(e: Exception) -> bool:
    """
    Returns True for any Groq/network error that is worth retrying:
      - 429 rate limit
      - 5xx server errors (Groq 500/502/503)
      - connection / timeout errors (APIConnectionError, httpx timeouts, network hiccups)
    Returns False for permanent errors (401 auth, 400 bad request, etc.) that retrying won't fix.
    """
    e_str = str(e)
    msg = e_str.lower()
    # Rate-limit signals
    if "429" in e_str or "rate_limit" in msg or "too many requests" in msg or "rate limit" in msg:
        return True
    # Groq / upstream 5xx
    if "500" in e_str or "502" in e_str or "503" in e_str:
        return True
    if "internal server error" in msg or "bad gateway" in msg or "service unavailable" in msg:
        return True
    # Connection / timeout errors (openai.APIConnectionError, httpx.ReadTimeout, etc.)
    if "connection" in msg or "timeout" in msg or "timed out" in msg or "network" in msg:
        return True
    # openai exception class names
    cls = type(e).__name__.lower()
    if "connection" in cls or "timeout" in cls or "server" in cls:
        return True
    return False


async def _extract_full_with_retry(text: str, source: str, filename: str, max_retries: int = 3) -> dict:
    """
    Calls _run_cv_extraction_full with exponential backoff on any transient error.
    Retries on: 429 rate-limit, Groq 5xx, connection/timeout errors.
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


@app.post("/extract-cv-full")
async def extract_cv_full(file: UploadFile = File(...)):
    """
    Full CV extraction used for bulk import from job postings.
    Returns raw text + all structured fields including name and contact info.
    """
    if not settings.groq_api_key and not settings.sambanova_api_key:
        return {"cv_text": "", "first_name": None, "last_name": None, "email": None,
                "phone": None, "skills": [], "experience_years": None,
                "education": None, "current_position": None, "location": None}
    try:
        content = await file.read()
        filename = file.filename or "file.pdf"
        text, method = extract_text_from_bytes(content, filename)
        logger.info("Full CV extraction '%s' via %s — %d chars", filename, method, len(text))
        if not text.strip():
            raise HTTPException(status_code=422, detail="Impossible d'extraire le texte du CV.")
        structured = await _extract_full_with_retry(text, method, filename)
        return {"cv_text": text[:50_000], **structured}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Full CV extraction failed [%s]: %s", type(e).__name__, e)
        raise HTTPException(status_code=500, detail=f"[{type(e).__name__}] {e}")


@app.post("/extract-job-posting", response_model=ExtractJobPostingResponse)
async def extract_job_posting(file: UploadFile = File(...)):
    """
    Extracts structured requirements from an uploaded job posting / fiche de poste document.
    Returns skills, tools, education, experience, missions, and formatted description/requirements.
    """
    if not settings.groq_api_key and not settings.sambanova_api_key:
        return ExtractJobPostingResponse()
    try:
        content = await file.read()
        filename = file.filename or "fiche.pdf"
        text, method = extract_text_from_bytes(content, filename)
        logger.info("Job posting extraction '%s' via %s — %d chars", filename, method, len(text))
        if not text.strip():
            raise HTTPException(status_code=422, detail="Impossible d'extraire le texte du document.")
        prompt = f"""Tu es un expert RH. Analyse cette fiche de poste et extrait les informations structurées.

Retourne UNIQUEMENT un objet JSON valide :
{{
  "required_skills": ["compétence1", "compétence2"],
  "tools": ["outil1", "outil2"],
  "required_education": "<niveau de formation requis ou null>",
  "required_experience": "<description de l'expérience requise ou null>",
  "missions": ["mission1", "mission2"],
  "nice_to_have": ["compétence optionnelle1"],
  "description": "<description du poste reformatée en 2-3 paragraphes>",
  "requirements": "<liste des exigences, une par ligne avec tiret '-'>"
}}

Règles :
- required_skills : compétences techniques indispensables (max 15)
- tools : logiciels, frameworks, équipements mentionnés (max 10)
- required_education : ex "Bac+5 Informatique" ou null
- required_experience : ex "3 à 5 ans en développement Java"
- missions : 3 à 6 missions principales extraites du document
- nice_to_have : compétences souhaitées mais non obligatoires (max 8)
- description et requirements : reformater le contenu du document de manière claire et professionnelle
- Retourne QUE le JSON, sans texte avant ou après

Fiche de poste :
{text[:10000]}
"""
        raw = await _call_with_fallback(
            [{"role": "user", "content": prompt}],
            model_type="smart", use_json=True, label="extract-job-posting", temperature=0.1,
        )
        data = _json.loads(raw)

        def _to_str(val) -> str | None:
            if val is None:
                return None
            if isinstance(val, list):
                # Strip any leading "- " the LLM may have already added before re-adding one
                cleaned = [str(item).lstrip("- ").strip() for item in val if item]
                return "\n".join(f"- {item}" for item in cleaned if item)
            return str(val)

        def _to_list(val) -> list:
            if not val:
                return []
            if isinstance(val, str):
                # If it's a bullet-list string, split on newlines
                lines = [v.lstrip("- •").strip() for v in val.splitlines() if v.strip()]
                return lines if lines else [val.strip()]
            return [str(v) for v in val if v]

        return ExtractJobPostingResponse(
            required_skills=_to_list(data.get("required_skills")),
            tools=_to_list(data.get("tools")),
            required_education=_to_str(data.get("required_education")),
            required_experience=_to_str(data.get("required_experience")),
            missions=_to_list(data.get("missions")),
            nice_to_have=_to_list(data.get("nice_to_have")),
            description=_to_str(data.get("description")),
            requirements=_to_str(data.get("requirements")),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Job posting extraction failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate-description", response_model=GenerateDescriptionResponse)
async def generate_description(req: GenerateDescriptionRequest):
    """Generates a job posting description and requirements using Groq Llama."""
    context_parts = [f"Titre du poste : {req.title}"]
    if req.department:
        context_parts.append(f"Département : {req.department}")
    if req.contract_type:
        context_parts.append(f"Type de contrat : {req.contract_type}")
    if req.location:
        context_parts.append(f"Localisation : {req.location}")
    if req.min_experience is not None:
        context_parts.append(f"Expérience minimum : {req.min_experience} an(s)")
    context = "\n".join(context_parts)

    prompt = f"""Tu es un expert RH. Génère une offre d'emploi professionnelle en français pour :

{context}

Retourne UNIQUEMENT un objet JSON valide :
{{
  "description": "<description du poste en 3-4 paragraphes : contexte, missions principales, environnement de travail>",
  "requirements": "<liste des exigences et compétences requises, une par ligne avec tiret '-'>"
}}

La description doit être motivante, claire et professionnelle. Les exigences doivent être précises et réalistes.
"""
    try:
        raw = await _call_with_fallback(
            [{"role": "user", "content": prompt}],
            model_type="smart", use_json=True, label="generate-description", temperature=0.7,
        )
        data = _json.loads(raw)
        return GenerateDescriptionResponse(
            description=data.get("description", ""),
            requirements=data.get("requirements", ""),
        )
    except Exception as e:
        logger.error("Description generation failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate-interview-questions", response_model=GenerateInterviewQuestionsResponse)
async def generate_interview_questions(req: GenerateInterviewQuestionsRequest):
    """Generates tailored interview questions using Groq Llama fast."""
    context_parts = [f"Poste : {req.job_title}"]
    if req.job_description:
        context_parts.append(f"Description : {req.job_description[:500]}")
    if req.requirements:
        context_parts.append(f"Exigences : {req.requirements[:300]}")
    if req.candidate_skills:
        context_parts.append(f"Compétences candidat : {req.candidate_skills}")
    if req.candidate_position:
        context_parts.append(f"Poste actuel candidat : {req.candidate_position}")
    if req.candidate_experience_years is not None:
        context_parts.append(f"Expérience candidat : {req.candidate_experience_years} an(s)")
    context = "\n".join(context_parts)

    prompt = f"""Tu es un recruteur RH expérimenté. Tu dois générer 8 questions d'entretien RH en français pour évaluer ce candidat.

{context}

STYLE DES QUESTIONS :
- Questions générales et accessibles, adaptées à un entretien RH (pas un entretien technique approfondi)
- Centrées sur le parcours, les motivations, le comportement, et les compétences générales du domaine
- Pour les questions qui touchent légèrement à un aspect technique du domaine (ex : outils RH, processus de recrutement, gestion des compétences), ajoute un champ "answer" avec une réponse attendue courte et claire
- Pour les questions purement comportementales ou de motivation, laisse "answer" à null

Répartition : 2 questions de présentation/parcours, 2 questions de motivation, 2 questions comportementales, 2 questions sur le domaine métier (avec réponse suggérée).

Retourne UNIQUEMENT ce JSON :
{{
  "questions": [
    {{"question": "Pouvez-vous vous présenter et nous parler de votre parcours ?", "answer": null}},
    {{"question": "Quels outils SIRH avez-vous utilisés ?", "answer": "Les principaux SIRH sont SAP SuccessFactors, Workday, Lucca, ou ADP. L'important est la capacité d'adaptation à de nouveaux outils."}}
  ]
}}
"""
    try:
        response_raw = await _call_with_fallback(
            [{"role": "user", "content": prompt}],
            model_type="fast", use_json=True, label="generate-interview-questions", temperature=0.7,
        )
        data = _json.loads(response_raw)
        raw = data.get("questions", [])
        questions = []
        for q in raw:
            if isinstance(q, dict):
                question_text = q.get("question") or q.get("text") or q.get("content") or q.get("q") or ""
                if not question_text:
                    continue
                answer_text = q.get("answer") or q.get("reponse") or q.get("suggested_answer") or None
                if answer_text and str(answer_text).strip().lower() in ("null", "none", ""):
                    answer_text = None
                questions.append(QuestionItem(
                    question=str(question_text).strip(),
                    answer=str(answer_text).strip() if answer_text else None,
                ))
            elif isinstance(q, str) and q.strip():
                questions.append(QuestionItem(question=q.strip(), answer=None))
        return GenerateInterviewQuestionsResponse(questions=questions[:10])
    except Exception as e:
        logger.error("Interview questions generation failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate-fiche-fonction", response_model=GenerateFicheFonctionResponse)
async def generate_fiche_fonction(req: GenerateFicheFonctionRequest):
    """
    Generates all textual content for a Ventec-style fiche de fonction (job function sheet).
    The behavioral competencies are standard and hardcoded in the Java export layer.
    This endpoint only generates the variable content specific to the position.
    """
    context_parts = [f"Titre du poste : {req.title}"]
    if req.department:    context_parts.append(f"Département : {req.department}")
    if req.contract_type: context_parts.append(f"Type de contrat : {req.contract_type}")
    if req.filiale:       context_parts.append(f"Filiale / Entité : {req.filiale}")
    if req.description:   context_parts.append(f"Description existante :\n{req.description[:800]}")
    if req.requirements:  context_parts.append(f"Exigences existantes :\n{req.requirements[:600]}")
    context = "\n".join(context_parts)

    prompt = f"""Tu es un expert RH chez Ventec Maroc. Tu dois générer le contenu d'une fiche de fonction \
professionnelle en français, en suivant EXACTEMENT le style et la structure des fiches de fonction Ventec.

Poste à documenter :
{context}

STYLE VENTEC À RESPECTER :
- Les missions sont courtes, concrètes, orientées action (verbe d'action à l'infinitif)
  Exemples pour un poste RH : "Coordonner les activités RH du Groupe", "Assurer le suivi des procédures RH"
- Les activités sont des tâches opérationnelles détaillées et spécifiques au poste
  Exemples : "Mettre en œuvre la politique de recrutement selon les orientations stratégiques",
             "Elaborer et mettre à jour les fiches de fonction des salariés",
             "Participer à l'élaboration du plan de formation annuel"
- L'intérimaire : une phrase complète mentionnant le supérieur hiérarchique direct
  Exemple : "Pendant l'absence du titulaire, l'intérim sera assuré par une personne désignée par le [titre du responsable]."
- collaborateurs_directs : "Néant" si aucun subordonné direct, sinon liste les postes
- Les compétences techniques sont précises et propres au métier (pas génériques)

Retourne UNIQUEMENT un objet JSON valide avec exactement cette structure :
{{
  "missions": [
    "Coordonner les ... du ...",
    "Assurer le suivi de ...",
    "Apporter une expertise en ...",
    "Contribuer à ..."
  ],
  "activites_principales": [
    {{
      "label": "Activité principale 1 du titulaire (verbe d'action à l'infinitif, spécifique au poste) :",
      "sub": [
        "Sous-activité détaillée 1a",
        "Sous-activité détaillée 1b",
        "Sous-activité détaillée 1c"
      ]
    }},
    {{
      "label": "Activité principale 2 :",
      "sub": [
        "Sous-activité détaillée 2a",
        "Sous-activité détaillée 2b"
      ]
    }},
    {{
      "label": "Activité principale 3 :",
      "sub": [
        "Sous-activité détaillée 3a",
        "Sous-activité détaillée 3b"
      ]
    }}
  ],
  "collaborateurs_directs": "Néant",
  "indicateurs_performance": [
    "KPI mesurable 1",
    "KPI mesurable 2",
    "KPI mesurable 3",
    "KPI mesurable 4"
  ],
  "niveau_formation": "BAC+X en Domaine spécifique ou en Domaine équivalent",
  "experience_requise": "Débutant(e) accepté(e) ou X à Y ans d'expérience dans un poste similaire",
  "competences_techniques": [
    {{"label": "Compétence technique spécifique au poste 1", "poids": 5}},
    {{"label": "Compétence technique spécifique au poste 2", "poids": 5}},
    {{"label": "Compétence technique spécifique au poste 3", "poids": 5}},
    {{"label": "Compétence technique spécifique au poste 4", "poids": 5}},
    {{"label": "Compétence technique spécifique au poste 5", "poids": 5}},
    {{"label": "Compétence technique spécifique au poste 6", "poids": 5}},
    {{"label": "Compétence technique spécifique au poste 7", "poids": 5}}
  ],
  "interlocuteurs_internes": [
    "Service ou Département interne 1",
    "Service ou Département interne 2",
    "Service ou Département interne 3"
  ],
  "interlocuteurs_externes": [
    "Organisme ou Partenaire externe 1",
    "Organisme ou Partenaire externe 2"
  ],
  "interimaire": "Pendant l'absence du titulaire, l'intérim sera assuré par une personne désignée par le [titre du responsable hiérarchique direct]."
}}

Règles strictes :
- missions : 3 à 5 missions CONCISES, verbe à l'infinitif, spécifiques au poste (pas génériques)
- activites_principales : 4 à 6 objets avec "label" (activité principale, verbe infinitif, finissant par ":") et "sub" (2 à 4 sous-tâches opérationnelles et spécifiques). EXEMPLE pour un poste RH : {{"label": "Mettre en œuvre la politique de recrutement selon les orientations stratégiques :", "sub": ["Analyser les besoins en recrutement en lien avec les managers", "Assurer la campagne de recrutement et la procédure de sélection", "Rédiger et publier les offres d'emploi sur les canaux appropriés"]}}
- collaborateurs_directs : "Néant" pour un poste sans subordonnés, sinon les titres des postes gérés
- indicateurs_performance : 4 à 6 KPIs mesurables et pertinents pour CE poste précis
- niveau_formation : diplôme et domaine précis (ex: "BAC+5 en Gestion des Ressources Humaines ou en Droit Social")
- experience_requise : précis et adapté au niveau du poste
- competences_techniques : exactement 7, toutes très spécifiques au métier, poids = 5
- interlocuteurs_internes : 2 à 4 services avec lesquels ce poste interagit vraiment
- interlocuteurs_externes : 2 à 4 organismes/partenaires externes réels pour ce métier
- interimaire : phrase complète avec le titre du responsable hiérarchique direct déduit du contexte
- Français professionnel, style Ventec formel
- Ne retourne QUE le JSON, sans texte avant ou après
"""

    try:
        response_raw = await _call_with_fallback(
            [{"role": "user", "content": prompt}],
            model_type="smart", use_json=True, label="generate-fiche-fonction", temperature=0.3,
        )
        data = _json.loads(response_raw)

        competences_raw = data.get("competences_techniques", [])
        competences = []
        for c in competences_raw:
            if isinstance(c, dict):
                competences.append(CompetenceCritere(
                    label=str(c.get("label", "")),
                    poids=int(c.get("poids", 5)),
                ))

        activites_raw = data.get("activites_principales", [])
        activites = []
        for a in activites_raw:
            if isinstance(a, dict):
                activites.append(ActivityItem(
                    label=str(a.get("label", "")),
                    sub=[str(s) for s in a.get("sub", [])],
                ))
            elif isinstance(a, str):
                activites.append(ActivityItem(label=a, sub=[]))

        return GenerateFicheFonctionResponse(
            missions=data.get("missions", []),
            activites_principales=activites,
            collaborateurs_directs=data.get("collaborateurs_directs", "Néant"),
            indicateurs_performance=data.get("indicateurs_performance", []),
            niveau_formation=data.get("niveau_formation", ""),
            experience_requise=data.get("experience_requise", ""),
            competences_techniques=competences,
            interlocuteurs_internes=data.get("interlocuteurs_internes", []),
            interlocuteurs_externes=data.get("interlocuteurs_externes", []),
            interimaire=data.get("interimaire", ""),
        )
    except Exception as e:
        logger.error("Fiche de fonction generation failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


_CHECKLIST_DEFAULT = [
    {"name": "Curriculum Vitae",                                     "copies": 1, "observation": ""},
    {"name": "Photo d'identité récente",                             "copies": 3, "observation": ""},
    {"name": "Photocopie CIN légalisée",                             "copies": 2, "observation": ""},
    {"name": "Photocopie carte CNSS",                                "copies": 1, "observation": "Si déjà inscrit"},
    {"name": "N° CIMR",                                              "copies": 1, "observation": "Si déjà inscrit"},
    {"name": "Relevé d'Identité Bancaire",                           "copies": 1, "observation": ""},
    {"name": "Fiche anthropométrique",                               "copies": 1, "observation": ""},
    {"name": "Photocopie des diplômes",                              "copies": 1, "observation": ""},
    {"name": "Attestations de stage",                                "copies": 1, "observation": "Pour débutant"},
    {"name": "Certificat de travail du dernier employeur",           "copies": 1, "observation": "Expérimenté"},
    {"name": "Radio pulmonaire (petit format)",                      "copies": 1, "observation": ""},
    {"name": "Bulletin d'adhésion Assurance + Fiche Administrative", "copies": 1, "observation": "À remplir le jour de l'intégration"},
    {"name": "Contrat de travail",                                   "copies": 2, "observation": ""},
]


@app.post("/generate-checklist", response_model=GenerateChecklistResponse)
async def generate_checklist(req: GenerateChecklistRequest):
    """
    Generates a personalised administrative document checklist for a hired candidate.
    Uses Groq (Llama) for context-aware personalisation.
    Falls back to the standard Ventec list if Groq is not configured or fails.
    """
    if not _groq_client and not _sambanova_client:
        logger.warning("No LLM provider configured — returning default checklist")
        return GenerateChecklistResponse(documents=[ChecklistItem(**d) for d in _CHECKLIST_DEFAULT])

    context = (req.job_title + " " + (req.department or "")).lower()

    is_chantier = any(kw in context for kw in (
        "chantier", "terrain", "site", "travaux", "btp",
        "génie civil", "construction", "ouvrier", "technicien de chantier",
    ))
    is_senior = any(kw in context for kw in (
        "senior", "confirmé", "expérimenté", "chef", "directeur",
        "responsable", "manager", "lead", "principal", "coordinateur",
    ))
    is_junior = any(kw in context for kw in (
        "junior", "débutant", "stagiaire", "assistant", "aide",
        "trainee", "apprenti", "entry", "profil junior",
    ))

    # Build conditional instructions
    if is_senior:
        exp_rule = "INCLURE uniquement 'Certificat de travail du dernier employeur' (observation: 'Expérimenté'). NE PAS inclure 'Attestations de stage'."
    elif is_junior:
        exp_rule = "INCLURE uniquement 'Attestations de stage' (observation: 'Pour débutant'). NE PAS inclure 'Certificat de travail du dernier employeur'."
    else:
        exp_rule = "INCLURE les deux : 'Attestations de stage' (observation: 'Pour débutant') ET 'Certificat de travail du dernier employeur' (observation: 'Expérimenté')."

    chantier_rule = (
        "INCLURE 'Analyse de sang NFS (numérotation formule sanguine)' (1 ex, observation vide) ET 'Analyse de sang IGE (immunoglobuline non spécifique)' (1 ex, observation vide)."
        if is_chantier else
        "NE PAS inclure 'Analyse de sang NFS' ni 'Analyse de sang IGE'. Ces documents sont CHANTIER UNIQUEMENT et ce poste n'est pas un poste de chantier."
    )

    prompt = f"""Tu es un assistant RH chez Ventec Maroc.
Génère la liste exacte des documents administratifs à fournir pour ce candidat recruté.

Contexte :
- Candidat : {req.candidate_name or "—"}
- Poste : {req.job_title}
- Type de contrat : {req.contract_type or "CDI"}
- Département : {req.department or "—"}

Documents à toujours inclure (ordre obligatoire) :
1. Curriculum Vitae — 1 ex — observation vide
2. Photo d'identité récente — 3 ex — observation vide
3. Photocopie CIN légalisée — 2 ex — observation vide
4. Photocopie carte CNSS — 1 ex — observation : "Si déjà inscrit"
5. N° CIMR — 1 ex — observation : "Si déjà inscrit"
6. Relevé d'Identité Bancaire — 1 ex — observation vide
7. Fiche anthropométrique — 1 ex — observation vide
8. Photocopie des diplômes — 1 ex — observation vide

Règle expérience (appliquer strictement) :
{exp_rule}

Règle analyses sanguines (appliquer strictement) :
{chantier_rule}

Documents à toujours inclure en fin de liste :
- Radio pulmonaire (petit format) — 1 ex — observation vide
- Bulletin d'adhésion Assurance + Fiche Administrative — 1 ex — observation : "À remplir le jour de l'intégration"
- Contrat de travail — 2 ex — observation vide

IMPORTANT :
- Ne jamais inclure NFS/IGE si le poste n'est pas un poste de chantier
- Ne jamais modifier les noms des documents (copie exacte des libellés ci-dessus)
- Observations : courtes (max 6 mots) ou vides — jamais "null" ou "None"
- Retourner UNIQUEMENT le JSON, sans texte autour

Format JSON attendu :
{{
  "documents": [
    {{"name": "Curriculum Vitae", "copies": 1, "observation": ""}},
    {{"name": "Photo d'identité récente", "copies": 3, "observation": ""}}
  ]
}}"""

    try:
        checklist_raw = await _call_with_fallback(
            [{"role": "user", "content": prompt}],
            model_type="fast", use_json=True, label="generate-checklist", temperature=0.1,
        )
        data = _json.loads(checklist_raw)
        raw_items = data.get("documents", [])
        documents = [
            ChecklistItem(
                name=str(item.get("name", "")),
                copies=int(item.get("copies", 1)),
                observation=str(item.get("observation", "") or ""),
            )
            for item in raw_items
            if item.get("name")
        ]
        return GenerateChecklistResponse(documents=documents)

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Cerebras checklist generation failed: %s — returning default", e)
        return GenerateChecklistResponse(documents=[ChecklistItem(**d) for d in _CHECKLIST_DEFAULT])


# ── Inbound email: match candidature subject to the right job posting ─────────

@app.post("/match-posting", response_model=MatchPostingResponse)
async def match_posting(req: MatchPostingRequest):
    """
    Given the subject of an incoming candidature email and the list of open job
    postings, returns which posting best matches and a confidence score [0-1].

    Called by the Spring Boot IMAP listener to automatically route inbound CVs
    to the correct job posting and trigger AI scoring.
    """
    if not req.postings:
        return MatchPostingResponse()

    # ── Programmatic domain pre-check ─────────────────────────────────────────
    # If every posting's title shares zero domain keywords with the subject,
    # short-circuit and return NO_MATCH before wasting an LLM call.
    # This catches the "only one posting, wrong domain" false-match problem.
    _STOP_WORDS = {
        "candidature", "candidat", "objet", "poste", "pour", "de", "du",
        "le", "la", "les", "un", "une", "des", "en", "et", "au", "aux",
        "je", "ma", "mon", "offre", "emploi", "stage",
    }

    def _domain_tokens(text: str) -> set[str]:
        return {
            w for w in re.split(r'[\s\-_/,;.]+', text.lower())
            if len(w) >= 3 and w not in _STOP_WORDS
        }

    subject_tokens = _domain_tokens(req.subject)
    if subject_tokens:
        any_overlap = any(
            subject_tokens & _domain_tokens(p.title + " " + (p.department or ""))
            for p in req.postings
        )
        if not any_overlap:
            logger.info(
                "match-posting '%s' → NO domain overlap with any posting — returning NO_MATCH",
                req.subject[:80],
            )
            return MatchPostingResponse()
    # ─────────────────────────────────────────────────────────────────────────

    postings_list = "\n".join(
        f"{i + 1}. [id={p.id}] {p.title}"
        + (f" — Département : {p.department}" if p.department else "")
        + (f"\n   {p.description[:250]}" if p.description else "")
        for i, p in enumerate(req.postings)
    )

    prompt = f"""Tu es un système RH chargé de trier les candidatures reçues par email.

Voici l'objet de l'email de candidature reçu :
"{req.subject}"

Voici la liste des offres d'emploi actuellement ouvertes :
{postings_list}

Ta tâche : identifier l'offre dont le DOMAINE MÉTIER correspond à l'objet de l'email.

RÈGLES STRICTES — à respecter absolument :
1. Ne retourne un posting_id QUE si l'objet de l'email est clairement lié au domaine du poste.
   Exemples de correspondance valide :
   - "Candidature développeur web" → poste "Développeur web full stack" ✅
   - "Candidature RH / ressources humaines" → poste "Responsable RH" ✅
   - "Candidature comptable" → poste "Comptable junior" ✅
   Exemples de NON-correspondance :
   - "Candidature RH" → poste "Développeur web" ❌ (domaines différents)
   - "Candidature informatique" → poste "Responsable RH" ❌ (domaines différents)

2. Si plusieurs offres sont disponibles mais qu'aucune ne correspond au domaine mentionné
   dans l'objet → retourne null. Ne jamais forcer un match par défaut.

3. La confiance doit refléter la pertinence réelle du domaine :
   - 0.9+ : correspondance explicite et directe (même intitulé de poste)
   - 0.75–0.89 : correspondance claire mais formulation différente
   - 0.65–0.74 : correspondance probable mais ambiguë
   - < 0.65 : doute trop fort → retourner null

Réponds UNIQUEMENT en JSON valide, sans texte autour, dans ce format exact :
{{"posting_id": "uuid-exact-de-l-offre", "posting_title": "titre exact", "confidence": 0.85}}

Si aucune offre ne correspond au domaine de l'email, retourne :
{{"posting_id": null, "posting_title": null, "confidence": 0.0}}"""

    try:
        raw = await _call_with_fallback(
            [{"role": "user", "content": prompt}],
            model_type="smart",
            use_json=True,
            label="match-posting",
            temperature=0.0,
        )
        data = _json.loads(raw)
        posting_id    = data.get("posting_id")
        posting_title = data.get("posting_title")
        confidence    = float(data.get("confidence", 0.0))
        logger.info(
            "match-posting '%s' → posting_id=%s confidence=%.2f",
            req.subject[:80], posting_id, confidence,
        )
        return MatchPostingResponse(
            posting_id=posting_id,
            posting_title=posting_title,
            confidence=confidence,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("match-posting failed for '%s': %s", req.subject[:80], e)
        return MatchPostingResponse()
