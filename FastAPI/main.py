"""
GRH-VENTEC FastAPI AI Service
Handles:
  - POST /filter       — async CV filtering + LLM scoring (calls back Spring Boot)
  - POST /extract-cv   — extract structured data from CV text
"""
import asyncio
import logging

import httpx
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from cv_extractor import extract_text_from_bytes
from deterministic_filter import apply_deterministic_filter
from llm_scorer import score_multiple_candidates
from models import FilterRequest, ExtractCvRequest, ExtractCvResponse

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

        # 2. Deterministic filter (experience only — no age/sex)
        filtered = apply_deterministic_filter(candidates_data)

        if not filtered:
            await _send_callback(callback_url, "DONE", [])
            return

        # 3. LLM scoring (only skills, experience, education — no demographics)
        scoring_input = [
            {"candidate_id": c["candidate_id"], "cv_text": c.get("cv_text", "")}
            for c in filtered
        ]
        results = await score_multiple_candidates(
            scoring_input, req.job_description, req.requirements
        )

        await _send_callback(callback_url, "DONE", results)

    except Exception as e:
        logger.error("Filter job %s failed: %s", req.filter_job_id, e)
        await _send_callback(callback_url, "FAILED", [], error_message=str(e))


async def _fetch_candidates(candidate_ids: list[str]) -> list[dict]:
    """
    Fetches candidate CV text from backend.
    Returns list of {candidate_id, cv_text, experience_years}.
    Note: backend sends NO age, NO sex — non-discrimination by design.
    """
    results = []
    async with httpx.AsyncClient(timeout=30.0) as client:
        for cid in candidate_ids:
            try:
                resp = await client.get(f"{settings.backend_url}/candidates/{cid}")
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


@app.post("/extract-cv", response_model=ExtractCvResponse)
async def extract_cv(req: ExtractCvRequest):
    """
    Extracts structured data from raw CV text using LLM.
    """
    if not settings.openai_api_key:
        return ExtractCvResponse(skills=[], experience_years=None,
                                  education=None, current_position=None, location=None)
    from openai import AsyncOpenAI
    import json as _json

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    prompt = f"""Extrait les informations suivantes du CV ci-dessous et retourne un JSON :
{{
  "skills": ["liste", "de", "compétences"],
  "experience_years": <nombre entier ou null>,
  "education": "<diplôme ou formation principale>",
  "current_position": "<poste actuel ou dernier poste>",
  "location": "<ville ou pays>"
}}

CV :
{req.text[:4000]}
"""
    try:
        response = await client.chat.completions.create(
            model=settings.model_name,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            response_format={"type": "json_object"},
        )
        data = _json.loads(response.choices[0].message.content)
        return ExtractCvResponse(
            skills=data.get("skills", []),
            experience_years=data.get("experience_years"),
            education=data.get("education"),
            current_position=data.get("current_position"),
            location=data.get("location"),
        )
    except Exception as e:
        logger.error("CV extraction failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
