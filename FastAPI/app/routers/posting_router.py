import logging

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.config import settings
from app.models.schemas import ExtractJobPostingResponse
from app.services.extractor import extract_text_from_bytes
from app.services.generation_service import extract_job_posting

router = APIRouter()
logger = logging.getLogger(__name__)

_NO_KEY = not settings.gemini_api_key and not settings.groq_api_key and not settings.sambanova_api_key


@router.post("/extract-job-posting", response_model=ExtractJobPostingResponse)
async def extract_job_posting_endpoint(file: UploadFile = File(...)):
    """
    Extracts structured requirements from an uploaded job posting / fiche de poste document.
    Returns skills, tools, education, experience, missions, and formatted description/requirements.
    """
    if _NO_KEY:
        return ExtractJobPostingResponse()
    try:
        content = await file.read()
        filename = file.filename or "fiche.pdf"
        text, method = extract_text_from_bytes(content, filename)
        logger.info("Job posting extraction '%s' via %s — %d chars", filename, method, len(text))
        if not text.strip():
            raise HTTPException(status_code=422, detail="Impossible d'extraire le texte du document.")
        return await extract_job_posting(text)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Job posting extraction failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
