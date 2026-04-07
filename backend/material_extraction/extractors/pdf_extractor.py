"""PDF text extraction using PyPDF2, pdfplumber, and Tesseract OCR for images."""

import io
import os
from models import ExtractionResult, PageContent, ExtractionMetadata
from .base import BaseExtractor
from utils.text_normalizer import normalize_text

try:
    import pytesseract
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False

# Full-book extraction: process up to 1000 pages (every word, tables, images/diagrams)
MAX_PDF_PAGES = 1000
# OCR on pages that have images/diagrams (up to this many pages) so figures and diagrams are extracted
MAX_PDF_PAGES_OCR = 500
# Full-page OCR for scanned books (no selectable text)
MAX_PDF_PAGES_FULL_OCR = 500


class PDFExtractor(BaseExtractor):
    """Extract text from PDF files, including OCR for embedded images."""

    async def extract(self, file_path: str, file_name: str) -> ExtractionResult:
        try:
            import pdfplumber
            from PyPDF2 import PdfReader
            from PIL import Image
        except ImportError as e:
            return self._create_error_result(file_name, "pdf", f"Missing dependency: {e}")

        pages: list[PageContent] = []
        all_text_parts: list[str] = []
        has_images = False
        has_tables = False
        file_size = os.path.getsize(file_path)

        try:
            # ---- Primary extraction with pdfplumber (better for tables/layout) ----
            # Only process first MAX_PDF_PAGES so large PDFs finish quickly
            with pdfplumber.open(file_path) as pdf:
                pages_to_process = pdf.pages[:MAX_PDF_PAGES]
                for page_num, page in enumerate(pages_to_process, start=1):
                    page_text = page.extract_text() or ""

                    # Detect tables
                    tables = page.extract_tables()
                    table_text = ""
                    if tables:
                        has_tables = True
                        for table in tables:
                            for row in table:
                                cells = [str(cell) if cell else "" for cell in row]
                                table_text += " | ".join(cells) + "\n"

                    # Combine page text + table text
                    combined = normalize_text(page_text)
                    if table_text:
                        combined += "\n\n[TABLE]\n" + normalize_text(table_text)

                    # Extract images/diagrams: run OCR on every page that has images (up to MAX_PDF_PAGES_OCR pages)
                    image_text = ""
                    page_images = page.images
                    if page_images:
                        has_images = True
                        if TESSERACT_AVAILABLE and page_num <= MAX_PDF_PAGES_OCR:
                            image_text = self._extract_images_ocr(page, page_images)
                            if image_text.strip():
                                image_text = "[IMAGE/DIAGRAM TEXT]\n" + image_text.strip()

                    page_content = PageContent(
                        page_number=page_num,
                        text=combined,
                        has_images=bool(page_images),
                        image_text=normalize_text(image_text),
                    )
                    pages.append(page_content)
                    all_text_parts.append(combined)
                    if image_text:
                        all_text_parts.append(image_text)

            # ---- Fallback: if pdfplumber extracted very little, try PyPDF2 ----
            total_text = "\n\n".join(all_text_parts)
            if len(total_text.strip()) < 100:
                reader = PdfReader(file_path)
                fallback_parts: list[str] = []
                for page_num, page in enumerate(list(reader.pages)[:MAX_PDF_PAGES], start=1):
                    text = page.extract_text() or ""
                    text = normalize_text(text)
                    fallback_parts.append(text)
                    if page_num <= len(pages):
                        pages[page_num - 1].text = text
                    else:
                        pages.append(PageContent(page_number=page_num, text=text))
                total_text = "\n\n".join(fallback_parts)

            # ---- If still empty, attempt full-page OCR (scanned books) ----
            if len(total_text.strip()) < 50 and TESSERACT_AVAILABLE:
                total_text, pages = await self._ocr_full_pdf(file_path)
                has_images = True
                if total_text.strip():
                    total_text = "[SCANNED PAGE TEXT]\n\n" + total_text.strip()

            extracted = normalize_text(total_text)
            word_count = len(extracted.split())

            return ExtractionResult(
                success=True,
                file_name=file_name,
                file_type="pdf",
                file_size=file_size,
                total_pages=len(pages),
                extracted_text=extracted,
                pages=pages,
                metadata=ExtractionMetadata(
                    word_count=word_count,
                    char_count=len(extracted),
                    has_images=has_images,
                    has_tables=has_tables,
                    extraction_method="pdfplumber+PyPDF2+OCR",
                ),
            )
        except Exception as e:
            return self._create_error_result(file_name, "pdf", str(e))

    # ------------------------------------------------------------------
    def _extract_images_ocr(self, page, images) -> str:
        """Run OCR on page (captures text in images, diagrams, figures) for accurate extraction."""
        from PIL import Image
        texts: list[str] = []
        try:
            # 300 DPI for accuracy; captures labels, captions, and text inside diagrams
            page_image = page.to_image(resolution=300)
            pil_image = page_image.original
            text = pytesseract.image_to_string(pil_image)
            if text.strip():
                texts.append(text.strip())
        except Exception:
            pass
        return "\n".join(texts)

    async def _ocr_full_pdf(self, file_path: str) -> tuple[str, list[PageContent]]:
        """Full-page OCR for scanned PDFs with no selectable text."""
        from PIL import Image
        import subprocess
        import tempfile
        import glob

        pages: list[PageContent] = []
        all_text: list[str] = []

        try:
            with tempfile.TemporaryDirectory() as tmp_dir:
                # Convert PDF pages to images using pdftoppm (poppler)
                subprocess.run(
                    ["pdftoppm", "-png", "-r", "300", file_path, os.path.join(tmp_dir, "page")],
                    check=True,
                    capture_output=True,
                )
                image_files = sorted(glob.glob(os.path.join(tmp_dir, "page-*.png")))[:MAX_PDF_PAGES_FULL_OCR]
                for idx, img_path in enumerate(image_files, start=1):
                    img = Image.open(img_path)
                    text = pytesseract.image_to_string(img)
                    text = normalize_text(text)
                    pages.append(PageContent(page_number=idx, text=text, has_images=True))
                    all_text.append(text)
        except FileNotFoundError:
            # pdftoppm not installed — skip full-page OCR
            pass
        except Exception:
            pass

        return "\n\n".join(all_text), pages
