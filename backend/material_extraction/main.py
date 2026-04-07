"""
QGenesis Material Extraction API
FastAPI backend for extracting text from PDF, DOCX, PPTX, images, and text files.
"""

import os
import time
import tempfile
import shutil
import logging
from typing import Optional

from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse

logger = logging.getLogger(__name__)

from models import (
    ExtractionResult,
    ExtractionMetadata,
    PageContent,
    BatchExtractionResult,
    HealthResponse,
    FileType,
)
from utils.file_detector import detect_file_type
from utils.text_normalizer import normalize_text, estimate_topics, extract_keywords, extract_sentences, estimate_academic_level

# Fast PDF path: PyPDF2 only, no pdfplumber/OCR (used only when full_extraction=False)
FAST_PDF_MAX_PAGES = 500
MIN_TEXT_FOR_FAST_PATH = 80


def _get_extractor(file_type):
    """Lazy import to avoid segfault from pdf/image libs at startup."""
    from extractors import get_extractor
    return get_extractor(file_type)


def _get_nlp_pipeline():
    """Lazy import to avoid loading spacy at app startup (can segfault in some envs)."""
    from nlp import get_nlp_pipeline
    return get_nlp_pipeline()

# ── App setup ──────────────────────────────────────────────────────

app = FastAPI(
    title="QGenesis Material Extraction API",
    description="Extract text content from educational materials (PDF, DOCX, PPTX, images, TXT)",
    version="1.0.0",
)

# CORS — allow the React frontend to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Max upload size: 50 MB
MAX_FILE_SIZE = 50 * 1024 * 1024

# Chunking (no spaCy): paragraph-aware, word-boundary splits for accurate extraction
SIMPLE_CHUNK_WORDS = 800
# Use full extracted text for chunking/NLP so chunks and topics reflect whole material
MAX_TEXT_FOR_CHUNKING = 1_500_000
MAX_SIMPLE_CHUNKS = 500


def _build_simple_chunks(text: str) -> dict:
    """
    Build chunks and topics from the full extracted text (or a large prefix for huge docs).
    Chunks are paragraph-based or fixed-word blocks so content is accurately preserved word-by-word.
    """
    if not text or not text.strip():
        return {"chunks": [], "topics": [], "global_keywords": [], "estimated_academic_level": estimate_academic_level("")}

    # Use full text up to limit so chunks and topics cover the whole material accurately
    work = text[:MAX_TEXT_FOR_CHUNKING] if len(text) > MAX_TEXT_FOR_CHUNKING else text
    chunks_list = []
    chunk_id = 0

    blocks = []
    for para in work.split("\n\n"):
        para = para.strip()
        if not para:
            continue
        w = para.split()
        if len(w) <= SIMPLE_CHUNK_WORDS:
            blocks.append(para)
        else:
            for i in range(0, len(w), SIMPLE_CHUNK_WORDS):
                blocks.append(" ".join(w[i : i + SIMPLE_CHUNK_WORDS]))
        if len(blocks) >= MAX_SIMPLE_CHUNKS:
            break

    for block in blocks[:MAX_SIMPLE_CHUNKS]:
        if not block.strip():
            continue
        sents = extract_sentences(block)
        word_count = len(block.split())
        chunks_list.append({
            "chunk_id": chunk_id,
            "chunk_type": "paragraph",
            "title": f"Section {chunk_id + 1}",
            "text": block,
            "sentences": sents,
            "metadata": {
                "keywords": extract_keywords(block, top_n=10),
                "key_phrases": [],
                "estimated_difficulty": "medium",
                "sentence_count": len(sents),
                "word_count": word_count,
                "has_definitions": False,
                "has_formulas": False,
                "has_examples": False,
                "named_entities": [],
            },
        })
        chunk_id += 1

    # Topics and global keywords from same text used for chunks (whole-document accuracy)
    topics_from_keywords = estimate_topics(work)
    topic_infos = [
        {"name": t, "relevance": 0.8, "subtopics": [], "keywords": [], "chunk_ids": list(range(min(len(chunks_list), 5)))}
        for t in topics_from_keywords[:15]
    ]

    estimated_level = estimate_academic_level(work)
    return {
        "chunks": chunks_list,
        "topics": topic_infos,
        "global_keywords": extract_keywords(work, top_n=30),
        "estimated_academic_level": estimated_level,
    }


def _fast_extract_pdf(tmp_path: str, file_name: str, file_size: int) -> ExtractionResult:
    """
    Extract text from PDF using PyPDF2 only (no pdfplumber, no OCR).
    Page-by-page extraction so every page's text is captured; normalize_text only cleans
    whitespace and hyphenation, preserving content word-by-word. Returns total_pages.
    """
    try:
        from PyPDF2 import PdfReader
    except ImportError:
        return ExtractionResult(
            success=False,
            error="PyPDF2 not available",
            file_name=file_name,
            file_type=FileType.PDF.value,
            file_size=file_size,
        )
    try:
        reader = PdfReader(tmp_path)
        total_pages = len(reader.pages)
        pages_to_extract = min(total_pages, FAST_PDF_MAX_PAGES)
        parts = []
        page_contents = []
        for i in range(pages_to_extract):
            page = reader.pages[i]
            raw = page.extract_text() or ""
            text = normalize_text(raw)
            parts.append(text)
            page_contents.append(
                PageContent(page_number=i + 1, text=text, has_images=False, image_text="")
            )
        full_text = "\n\n".join(parts).strip()
        return ExtractionResult(
            success=True,
            file_name=file_name,
            file_type=FileType.PDF.value,
            file_size=file_size,
            total_pages=total_pages,
            extracted_text=full_text,
            pages=page_contents,
            metadata=ExtractionMetadata(
                word_count=len(full_text.split()),
                char_count=len(full_text),
                extraction_method="PyPDF2_fast",
            ),
        )
    except Exception as e:
        logger.exception("Fast PDF extraction failed: %s", e)
        return ExtractionResult(
            success=False,
            error=str(e),
            file_name=file_name,
            file_type=FileType.PDF.value,
            file_size=file_size,
        )


# ── Root: simple page so opening the backend URL in a browser shows something
ROOT_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>QGenesis Material Extraction API</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 600px; margin: 3rem auto; padding: 1rem; background: #1a1a1a; color: #e0e0e0; }
    a { color: #6ea8fe; }
    h1 { color: #fff; }
  </style>
</head>
<body>
  <h1>QGenesis Material Extraction API</h1>
  <p>Backend is running. This server is the <strong>API</strong>; the app UI runs on the frontend.</p>
  <ul>
    <li><a href="/docs">API docs (Swagger)</a> — try endpoints here</li>
    <li><a href="/api/health">Health check</a> — JSON status</li>
  </ul>
  <p><small>Use the frontend at <strong>http://127.0.0.1:8081</strong> for Upload Materials and the rest of the app.</small></p>
</body>
</html>"""


@app.get("/", response_class=HTMLResponse, include_in_schema=False)
async def root():
    """Show a simple landing page with links to docs and health."""
    return HTMLResponse(content=ROOT_HTML, status_code=200, media_type="text/html; charset=utf-8")


# ── Health check ───────────────────────────────────────────────────

@app.on_event("startup")
async def startup_event():
    """Optionally pre-load spaCy on first request instead of here to avoid startup failures."""
    pass


@app.get("/api/health")
async def health_check():
    """Lightweight health check — returns JSON; use /api/health/page for browser-friendly view."""
    body = {
        "status": "ok",
        "version": "1.0.0",
        "tesseract_available": False,
        "spacy_available": False,
    }
    return JSONResponse(content=body, media_type="application/json; charset=utf-8")


@app.get("/api/health/page", response_class=HTMLResponse, include_in_schema=False)
async def health_check_page():
    """Browser-friendly health page so the tab shows something when you open it."""
    return HTMLResponse(
        content="""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>API Health</title></head>
<body style="font-family: system-ui; max-width: 480px; margin: 2rem auto; padding: 1rem;">
  <h1>QGenesis API</h1>
  <p><strong>Status:</strong> <span style="color: green;">ok</span></p>
  <p><strong>Version:</strong> 1.0.0</p>
  <p>Backend is running. Use <a href="/docs">/docs</a> for the API.</p>
</body></html>""",
        status_code=200,
        media_type="text/html; charset=utf-8",
    )


# ── Single file extraction ────────────────────────────────────────

@app.post("/api/extract", response_model=ExtractionResult)
async def extract_file(
    file: UploadFile = File(...),
    full_extraction: bool = Form(True, description="If True (default), extract everything: all pages, tables, images/diagrams (OCR). Use False for quick text-only."),
):
    """
    Upload a single file and extract its text content.

    Supported formats: PDF, DOCX, DOC, PPTX, TXT, JPG, PNG, BMP, TIFF.
    For PDFs: full_extraction=True (default) gives full document, tables, and image/diagram OCR; False gives fast text-only.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    # Read file content
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File size exceeds 50 MB limit")

    start_time = time.time()

    # Save to temp file
    tmp_dir = tempfile.mkdtemp()
    tmp_path = os.path.join(tmp_dir, file.filename)
    try:
        with open(tmp_path, "wb") as f:
            f.write(content)

        # Detect file type
        file_type = detect_file_type(tmp_path, file.filename)
        if file_type == FileType.UNKNOWN:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {file.filename}. "
                       f"Supported: PDF, DOCX, DOC, PPTX, TXT, JPG, PNG, BMP, TIFF",
            )

        # PDF: use fast path only when full_extraction=False. Default = full (tables, images/diagrams, all pages).
        if file_type == FileType.PDF and not full_extraction:
            fast_result = _fast_extract_pdf(tmp_path, file.filename, len(content))
            if fast_result.success and len((fast_result.extracted_text or "").strip()) >= MIN_TEXT_FOR_FAST_PATH:
                fast_result.topics = estimate_topics(fast_result.extracted_text)
                fast_result.nlp_analysis = _build_simple_chunks(fast_result.extracted_text)
                elapsed = (time.time() - start_time) * 1000
                fast_result.metadata.processing_time_ms = round(elapsed, 2)
                return fast_result

        # Full extraction: all pages, tables, images/diagrams (OCR), word-by-word text
        extractor = _get_extractor(file_type)
        result = await extractor.extract(tmp_path, file.filename)

        # Topics and simple chunking (no spaCy on upload — fast; full content extracted and saved)
        if result.success and result.extracted_text:
            result.topics = estimate_topics(result.extracted_text)
            result.nlp_analysis = _build_simple_chunks(result.extracted_text)

        # Record processing time
        elapsed = (time.time() - start_time) * 1000
        result.metadata.processing_time_ms = round(elapsed, 2)

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


# ── Batch file extraction ─────────────────────────────────────────

@app.post("/api/extract/batch", response_model=BatchExtractionResult)
async def extract_batch(files: list[UploadFile] = File(...)):
    """
    Upload multiple files and extract text content from each.

    Maximum 10 files per batch.
    """
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 files per batch")

    results: list[ExtractionResult] = []
    successful = 0
    failed = 0

    for file in files:
        try:
            content = await file.read()
            if len(content) > MAX_FILE_SIZE:
                results.append(ExtractionResult(
                    success=False,
                    error="File exceeds 50 MB limit",
                    file_name=file.filename or "unknown",
                    file_type="unknown",
                ))
                failed += 1
                continue

            tmp_dir = tempfile.mkdtemp()
            tmp_path = os.path.join(tmp_dir, file.filename or "unknown")
            try:
                with open(tmp_path, "wb") as f:
                    f.write(content)

                file_type = detect_file_type(tmp_path, file.filename or "unknown")
                if file_type == FileType.UNKNOWN:
                    results.append(ExtractionResult(
                        success=False,
                        error=f"Unsupported file type",
                        file_name=file.filename or "unknown",
                        file_type="unknown",
                    ))
                    failed += 1
                    continue

                extractor = _get_extractor(file_type)
                start = time.time()
                result = await extractor.extract(tmp_path, file.filename or "unknown")
                result.metadata.processing_time_ms = round((time.time() - start) * 1000, 2)

                if result.success and result.extracted_text:
                    result.topics = estimate_topics(result.extracted_text)
                    try:
                        nlp_pipe = _get_nlp_pipeline()
                        analysis = nlp_pipe.analyze(result.extracted_text)
                        result.nlp_analysis = analysis.model_dump()
                    except Exception:
                        pass

                results.append(result)
                if result.success:
                    successful += 1
                else:
                    failed += 1
            finally:
                shutil.rmtree(tmp_dir, ignore_errors=True)

        except Exception as e:
            results.append(ExtractionResult(
                success=False,
                error=str(e),
                file_name=file.filename or "unknown",
                file_type="unknown",
            ))
            failed += 1

    return BatchExtractionResult(
        total_files=len(files),
        successful=successful,
        failed=failed,
        results=results,
    )


# ── Standalone NLP analysis endpoint ──────────────────────────────

@app.post("/api/analyze")
async def analyze_text(file: UploadFile = File(...)):
    """
    Upload a previously extracted text or raw file and run deep NLP analysis.
    Returns chunks, topics, keywords, entities, and difficulty estimates.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File size exceeds 50 MB limit")

    start_time = time.time()
    tmp_dir = tempfile.mkdtemp()
    tmp_path = os.path.join(tmp_dir, file.filename)
    try:
        with open(tmp_path, "wb") as f:
            f.write(content)

        # Extract text first
        file_type = detect_file_type(tmp_path, file.filename)
        if file_type == FileType.UNKNOWN:
            raise HTTPException(status_code=400, detail="Unsupported file type")

        extractor = _get_extractor(file_type)
        result = await extractor.extract(tmp_path, file.filename)

        if not result.success or not result.extracted_text:
            raise HTTPException(status_code=422, detail=result.error or "No text extracted")

        # Run NLP analysis
        nlp_pipe = _get_nlp_pipeline()
        analysis = nlp_pipe.analyze(result.extracted_text)
        analysis_dict = analysis.model_dump()
        analysis_dict["processing_time_ms"] = round((time.time() - start_time) * 1000, 2)

        return analysis_dict

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


# ── Entry point ───────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
