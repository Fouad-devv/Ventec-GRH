"""
CV text extraction utilities.

Extraction strategy (automatic, in order):
  1. pdfplumber  — fast, precise for native/digital PDFs (selectable text layer)
  2. pytesseract — OCR fallback for scanned PDFs (images embedded in PDF)

A PDF is considered "scanned" when pdfplumber extracts on average fewer than
MIN_CHARS_PER_PAGE non-whitespace characters per page, which indicates there is
no embedded text layer and the content is stored as raster images.

System dependencies required for OCR:
  - Tesseract OCR   (apt: tesseract-ocr tesseract-ocr-fra tesseract-ocr-eng)
  - Poppler utils   (apt: poppler-utils)
  Windows: install via https://github.com/UB-Mannheim/tesseract/wiki
           and     https://github.com/oschwartz10612/poppler-windows/releases
"""

import io
import logging
import re

logger = logging.getLogger(__name__)

# Avg non-whitespace chars per page below this → treat as scanned
_MIN_CHARS_PER_PAGE = 80

# Tesseract language string — French primary, English secondary
_TESSERACT_LANG = "fra+eng"

# pdf2image DPI — 300 gives good OCR quality without excessive memory use
_OCR_DPI = 300


# ── Text cleaning ──────────────────────────────────────────────────────────────

def _clean_text(text: str) -> str:
    """
    Normalize whitespace and remove OCR/PDF extraction artifacts.
    Works for both native-PDF and OCR output.
    """
    # Normalize Windows line endings
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    # Collapse multiple spaces/tabs on a single line into one space
    text = re.sub(r"[ \t]+", " ", text)

    # Remove lines that are pure symbols/noise (3+ repeated non-alphanumeric chars)
    lines = text.splitlines()
    cleaned_lines = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            cleaned_lines.append("")
            continue
        # Skip lines that are purely punctuation/symbols with no alphanumeric content
        if stripped and not re.search(r"[a-zA-Z0-9À-ɏ؀-ۿ]", stripped):
            continue
        cleaned_lines.append(stripped)

    text = "\n".join(cleaned_lines)

    # Collapse 3+ consecutive blank lines into 2
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()


# ── Native PDF extraction (pdfplumber) ────────────────────────────────────────

def _extract_with_pdfplumber(content: bytes) -> tuple[str, int]:
    """
    Extract text from a native PDF using pdfplumber.
    Returns (raw_text, page_count).
    pdfplumber handles multi-column layouts, tables, and varied fonts
    significantly better than PyPDF2.
    """
    import pdfplumber

    pages_text: list[str] = []
    with pdfplumber.open(io.BytesIO(content)) as pdf:
        page_count = len(pdf.pages)
        for page in pdf.pages:
            # x_tolerance/y_tolerance control character grouping — defaults work
            # well for most CVs; tighten if words are merged on complex layouts
            page_text = page.extract_text(x_tolerance=3, y_tolerance=3) or ""
            pages_text.append(page_text)

    return "\n\n".join(pages_text), page_count


# ── Scanned PDF detection ─────────────────────────────────────────────────────

def _is_scanned(text: str, page_count: int) -> bool:
    """
    Return True when pdfplumber text is too sparse, indicating the PDF
    contains scanned images rather than an embedded text layer.
    """
    non_whitespace = len(re.sub(r"\s", "", text))
    avg_per_page = non_whitespace / max(page_count, 1)
    logger.debug(
        "pdfplumber: %d non-ws chars across %d page(s) → %.1f avg/page (threshold: %d)",
        non_whitespace, page_count, avg_per_page, _MIN_CHARS_PER_PAGE,
    )
    return avg_per_page < _MIN_CHARS_PER_PAGE


# ── OCR extraction (pytesseract + pdf2image) ──────────────────────────────────

def _extract_with_ocr(content: bytes) -> str:
    """
    Convert each PDF page to a high-resolution image and run Tesseract OCR.
    Supports French (primary) and English (secondary) text.
    Returns concatenated OCR text for all pages.
    """
    import pytesseract
    from pdf2image import convert_from_bytes

    # Convert PDF → PIL Images at 300 DPI
    images = convert_from_bytes(
        content,
        dpi=_OCR_DPI,
        fmt="jpeg",       # JPEG is faster than PNG for large pages
        thread_count=2,   # parallel page rendering
    )

    if not images:
        logger.warning("pdf2image returned no pages")
        return ""

    pages_text: list[str] = []
    for i, img in enumerate(images):
        # PSM 1 = automatic page segmentation with OSD
        # PSM 3 = fully automatic (no OSD) — better for structured CVs
        page_text = pytesseract.image_to_string(
            img,
            lang=_TESSERACT_LANG,
            config="--psm 3 --oem 3",
        )
        pages_text.append(page_text)
        logger.debug("OCR page %d: %d chars extracted", i + 1, len(page_text))

    return "\n\n".join(pages_text)


# ── Public API ─────────────────────────────────────────────────────────────────

def extract_text_from_pdf(content: bytes) -> tuple[str, str]:
    """
    Extract text from a PDF with automatic native/scanned detection.

    Returns:
        (text, method) where method is 'pdfplumber' or 'ocr'

    Flow:
        1. Run pdfplumber on the PDF
        2. If avg chars/page < threshold → switch to OCR (pytesseract)
        3. Clean and return the result
    """
    # Step 1: attempt native extraction
    try:
        raw_text, page_count = _extract_with_pdfplumber(content)
    except Exception as e:
        logger.error("pdfplumber failed (%s) — falling back to OCR", e)
        raw_text, page_count = "", 1

    # Step 2: decide whether OCR is needed
    if _is_scanned(raw_text, page_count):
        logger.info(
            "Scanned PDF detected — running Tesseract OCR (lang=%s, dpi=%d)",
            _TESSERACT_LANG, _OCR_DPI,
        )
        try:
            ocr_raw = _extract_with_ocr(content)
            return _clean_text(ocr_raw), "ocr"
        except Exception as e:
            logger.error("OCR failed: %s", e)
            # Return whatever pdfplumber got (possibly empty) rather than crash
            return _clean_text(raw_text), "pdfplumber_fallback"

    return _clean_text(raw_text), "pdfplumber"


def extract_text_from_bytes(content: bytes, filename: str) -> tuple[str, str]:
    """
    Extract text from an uploaded file.

    Returns:
        (text, method) — method identifies the extraction path used.

    Supported formats:
        .pdf  → native extraction (pdfplumber) or OCR (pytesseract) automatically
        other → UTF-8 decode (plain text, .txt, etc.)
    """
    if filename.lower().endswith(".pdf"):
        return extract_text_from_pdf(content)

    # Plain-text fallback (.txt, .csv, etc.)
    try:
        return content.decode("utf-8", errors="ignore").strip(), "text"
    except Exception as e:
        logger.error("Text decode failed: %s", e)
        return "", "text"
