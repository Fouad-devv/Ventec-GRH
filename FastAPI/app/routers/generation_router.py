import logging

from fastapi import APIRouter, HTTPException

from app.core.clients import _gemini_client, _groq_client, _sambanova_client
from app.models.schemas import (
    GenerateChecklistRequest, GenerateChecklistResponse,
    GenerateDescriptionRequest, GenerateDescriptionResponse,
    GenerateFicheFonctionRequest, GenerateFicheFonctionResponse,
    GenerateInterviewQuestionsRequest, GenerateInterviewQuestionsResponse,
    MatchPostingRequest, MatchPostingResponse,
)
from app.services.generation_service import (
    generate_checklist,
    generate_description,
    generate_fiche_fonction,
    generate_interview_questions,
    match_posting,
)

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/generate-description", response_model=GenerateDescriptionResponse)
async def generate_description_endpoint(req: GenerateDescriptionRequest):
    """Generates a job posting description and requirements."""
    try:
        return await generate_description(req)
    except Exception as e:
        logger.error("Description generation failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-interview-questions", response_model=GenerateInterviewQuestionsResponse)
async def generate_interview_questions_endpoint(req: GenerateInterviewQuestionsRequest):
    """Generates tailored interview questions."""
    try:
        return await generate_interview_questions(req)
    except Exception as e:
        logger.error("Interview questions generation failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-fiche-fonction", response_model=GenerateFicheFonctionResponse)
async def generate_fiche_fonction_endpoint(req: GenerateFicheFonctionRequest):
    """
    Generates all textual content for a Ventec-style fiche de fonction (job function sheet).
    """
    try:
        return await generate_fiche_fonction(req)
    except Exception as e:
        logger.error("Fiche de fonction generation failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-checklist", response_model=GenerateChecklistResponse)
async def generate_checklist_endpoint(req: GenerateChecklistRequest):
    """
    Generates a personalised administrative document checklist for a hired candidate.
    Falls back to the standard Ventec list if no LLM provider is configured or if it fails.
    """
    has_llm = bool(_gemini_client or _groq_client or _sambanova_client)
    return await generate_checklist(req, has_llm=has_llm)


@router.post("/match-posting", response_model=MatchPostingResponse)
async def match_posting_endpoint(req: MatchPostingRequest):
    """
    Given the subject of an incoming candidature email and the list of open job
    postings, returns which posting best matches and a confidence score [0-1].

    Called by the Spring Boot IMAP listener to automatically route inbound CVs
    to the correct job posting and trigger AI scoring.
    """
    try:
        return await match_posting(req)
    except Exception as e:
        logger.error("match-posting failed for '%s': %s", req.subject[:80], e)
        raise HTTPException(status_code=500, detail=str(e))
