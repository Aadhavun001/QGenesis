"""Image text extraction using Tesseract OCR."""

import os
from models import ExtractionResult, PageContent, ExtractionMetadata
from .base import BaseExtractor
from utils.text_normalizer import normalize_text


class ImageExtractor(BaseExtractor):
    """Extract text from images using Tesseract OCR."""

    async def extract(self, file_path: str, file_name: str) -> ExtractionResult:
        try:
            from PIL import Image
            import pytesseract
        except ImportError as e:
            return self._create_error_result(file_name, "image", f"Missing dependency: {e}")

        file_size = os.path.getsize(file_path)
        ext = os.path.splitext(file_name)[1].lower().lstrip(".")

        try:
            img = Image.open(file_path)

            # Convert to RGB if necessary (e.g., RGBA PNGs)
            if img.mode not in ("L", "RGB"):
                img = img.convert("RGB")

            # Run OCR
            text = pytesseract.image_to_string(img)
            text = normalize_text(text)

            page = PageContent(
                page_number=1,
                text=text,
                has_images=True,
                image_text=text,
            )

            word_count = len(text.split())

            return ExtractionResult(
                success=True,
                file_name=file_name,
                file_type=ext or "image",
                file_size=file_size,
                total_pages=1,
                extracted_text=text,
                pages=[page],
                metadata=ExtractionMetadata(
                    word_count=word_count,
                    char_count=len(text),
                    has_images=True,
                    extraction_method="tesseract-ocr",
                ),
            )
        except Exception as e:
            return self._create_error_result(file_name, ext or "image", str(e))
