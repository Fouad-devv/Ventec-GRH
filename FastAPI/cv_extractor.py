"""
CV text extraction utilities.
Supports PDF and plain text. DOCX extraction can be added if needed.
"""
import io
import logging

import PyPDF2

logger = logging.getLogger(__name__)


def extract_text_from_pdf(content: bytes) -> str:
    try:
        reader = PyPDF2.PdfReader(io.BytesIO(content))
        pages = [page.extract_text() or "" for page in reader.pages]
        return "\n".join(pages).strip()
    except Exception as e:
        logger.error("PDF extraction failed: %s", e)
        return ""


def extract_text_from_bytes(content: bytes, filename: str) -> str:
    filename_lower = filename.lower()
    if filename_lower.endswith(".pdf"):
        return extract_text_from_pdf(content)
    # Fallback: try UTF-8 decode
    try:
        return content.decode("utf-8", errors="ignore").strip()
    except Exception:
        return ""
