import logging

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.config import settings
from app.core.clients import _extraction_semaphore
from app.models.schemas import ExtractCvRequest, ExtractCvResponse
from app.services.cv_service import (
    _extract_full_with_retry,
    _run_cv_extraction,
)
from app.services.extractor import extract_text_from_bytes

router = APIRouter()
logger = logging.getLogger(__name__)

_NO_KEY = not settings.gemini_api_key and not settings.groq_api_key and not settings.sambanova_api_key


@router.post("/extract-cv", response_model=ExtractCvResponse)
async def extract_cv(req: ExtractCvRequest):
    """Extracts structured data from raw CV text (already extracted by the caller)."""
    if _NO_KEY:
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


@router.post("/extract-cv-file", response_model=ExtractCvResponse)
async def extract_cv_file(file: UploadFile = File(...)):
    """
    Extracts structured data from an uploaded CV file.
    - Native PDF  → pdfplumber (fast, precise)
    - Scanned PDF → pytesseract OCR at 300 DPI (automatic fallback)
    - Plain text  → UTF-8 decode
    """
    if _NO_KEY:
        return ExtractCvResponse(skills=[], experience_years=None,
                                 education=None, current_position=None, location=None)
    try:
        content = await file.read()
        filename = file.filename or "file.pdf"
        text, method = extract_text_from_bytes(content, filename)

        logger.info("CV '%s' extracted via %s — %d characters", filename, method, len(text))

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


@router.post("/extract-cv-full")
async def extract_cv_full(file: UploadFile = File(...)):
    """
    Full CV extraction used for bulk import from job postings.
    Returns raw text + all structured fields including name and contact info.
    """
    if _NO_KEY:
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
        async with _extraction_semaphore:
            structured = await _extract_full_with_retry(text, method, filename)
        return {"cv_text": text[:50_000], **structured}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Full CV extraction failed [%s]: %s", type(e).__name__, e)
        raise HTTPException(status_code=500, detail=f"[{type(e).__name__}] {e}")
