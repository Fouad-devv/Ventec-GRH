FROM python:3.12-slim

# ── System dependencies ────────────────────────────────────────────────────────
# tesseract-ocr        : OCR engine for scanned PDFs
# tesseract-ocr-fra    : French language pack (primary language of CVs)
# tesseract-ocr-eng    : English language pack (bilingual CVs)
# poppler-utils        : required by pdf2image to rasterise PDF pages
# libglib2.0-0         : runtime lib needed by Pillow / some pdf libs
RUN apt-get update && apt-get install -y --no-install-recommends \
      tesseract-ocr \
      tesseract-ocr-fra \
      tesseract-ocr-eng \
      poppler-utils \
      libglib2.0-0 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Python dependencies ────────────────────────────────────────────────────────
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Application code ───────────────────────────────────────────────────────────
COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
