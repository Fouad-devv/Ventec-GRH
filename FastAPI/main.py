"""
GRH-VENTEC FastAPI AI Service
Handles:
  - POST /filter                       — async CV filtering + LLM scoring (calls back Spring Boot)
  - POST /extract-cv                   — extract structured data from CV text
  - POST /generate-description         — generate job posting description + requirements
  - POST /generate-interview-questions — generate interview questions for a candidate
  - POST /generate-checklist           — generate required document checklist
"""
import asyncio
import json as _json
import logging

import httpx
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import AsyncOpenAI

from config import settings
from cv_extractor import extract_text_from_bytes
from deterministic_filter import apply_deterministic_filter
from llm_scorer import score_multiple_candidates
from models import (
    FilterRequest, ExtractCvRequest, ExtractCvResponse,
    GenerateDescriptionRequest, GenerateDescriptionResponse,
    GenerateInterviewQuestionsRequest, GenerateInterviewQuestionsResponse,
    GenerateChecklistRequest, GenerateChecklistResponse,
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


_openai_client = AsyncOpenAI(api_key=settings.openai_api_key) if settings.openai_api_key else None


def _require_openai():
    if not _openai_client:
        raise HTTPException(status_code=503, detail="OpenAI API key not configured")
    return _openai_client


@app.post("/extract-cv", response_model=ExtractCvResponse)
async def extract_cv(req: ExtractCvRequest):
    """Extracts structured data from raw CV text using LLM."""
    if not settings.openai_api_key:
        return ExtractCvResponse(skills=[], experience_years=None,
                                 education=None, current_position=None, location=None)
    client = _require_openai()
    prompt = f"""Extrait les informations suivantes du CV ci-dessous et retourne UNIQUEMENT un JSON valide :
{{
  "skills": ["compétence1", "compétence2", ...],
  "experience_years": <entier ou null>,
  "education": "<diplôme principal ou null>",
  "current_position": "<poste actuel ou dernier poste ou null>",
  "location": "<ville ou pays ou null>"
}}

Règles :
- skills : liste des compétences techniques ET soft skills (max 15)
- experience_years : total années d'expérience professionnelle (entier)
- Ne retourne que le JSON, sans texte autour

CV :
{req.text[:5000]}
"""
    try:
        response = await client.chat.completions.create(
            model=settings.model_name,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            response_format={"type": "json_object"},
        )
        data = _json.loads(response.choices[0].message.content)
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
    except Exception as e:
        logger.error("CV extraction failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate-description", response_model=GenerateDescriptionResponse)
async def generate_description(req: GenerateDescriptionRequest):
    """Generates a job posting description and requirements using LLM."""
    client = _require_openai()
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

Retourne UNIQUEMENT un JSON valide :
{{
  "description": "<description du poste en 3-4 paragraphes : contexte, missions principales, environnement de travail>",
  "requirements": "<liste des exigences et compétences requises, une par ligne avec tiret '-'>"
}}

La description doit être motivante, claire et professionnelle. Les exigences doivent être précises et réalistes.
"""
    try:
        response = await client.chat.completions.create(
            model=settings.model_name,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            response_format={"type": "json_object"},
        )
        data = _json.loads(response.choices[0].message.content)
        return GenerateDescriptionResponse(
            description=data.get("description", ""),
            requirements=data.get("requirements", ""),
        )
    except Exception as e:
        logger.error("Description generation failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate-interview-questions", response_model=GenerateInterviewQuestionsResponse)
async def generate_interview_questions(req: GenerateInterviewQuestionsRequest):
    """Generates tailored interview questions based on job and candidate profile."""
    client = _require_openai()
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

    prompt = f"""Tu es un expert RH. Génère 8 questions d'entretien pertinentes en français pour :

{context}

Retourne UNIQUEMENT un JSON valide :
{{
  "questions": [
    "Question 1 ?",
    "Question 2 ?",
    ...
  ]
}}

Inclure : 3 questions techniques, 2 questions comportementales, 2 questions de motivation, 1 question de mise en situation.
"""
    try:
        response = await client.chat.completions.create(
            model=settings.model_name,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            response_format={"type": "json_object"},
        )
        data = _json.loads(response.choices[0].message.content)
        questions = data.get("questions", [])
        return GenerateInterviewQuestionsResponse(questions=questions[:10])
    except Exception as e:
        logger.error("Interview questions generation failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate-checklist", response_model=GenerateChecklistResponse)
async def generate_checklist(req: GenerateChecklistRequest):
    """Generates required documents checklist for a hired candidate."""
    client = _require_openai()
    context_parts = [f"Poste : {req.job_title}"]
    if req.contract_type:
        context_parts.append(f"Type de contrat : {req.contract_type}")
    if req.department:
        context_parts.append(f"Département : {req.department}")
    context = "\n".join(context_parts)

    prompt = f"""Tu es un expert RH en droit du travail algérien/français. Génère la liste des documents requis pour l'embauche d'un candidat pour :

{context}

Retourne UNIQUEMENT un JSON valide :
{{
  "documents": [
    "Document 1",
    "Document 2",
    ...
  ]
}}

Inclure : pièces d'identité, diplômes, documents administratifs, documents spécifiques au contrat.
Liste entre 8 et 15 documents pertinents et précis.
"""
    try:
        response = await client.chat.completions.create(
            model=settings.model_name,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
            response_format={"type": "json_object"},
        )
        data = _json.loads(response.choices[0].message.content)
        documents = data.get("documents", [])
        return GenerateChecklistResponse(documents=documents[:15])
    except Exception as e:
        logger.error("Checklist generation failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
