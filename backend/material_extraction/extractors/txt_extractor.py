"""Plain text file extraction."""

import os
from models import ExtractionResult, PageContent, ExtractionMetadata
from .base import BaseExtractor
from utils.text_normalizer import normalize_text


class TXTExtractor(BaseExtractor):
    """Extract text from plain text files."""

    async def extract(self, file_path: str, file_name: str) -> ExtractionResult:
        file_size = os.path.getsize(file_path)

        try:
            # Try multiple encodings
            text = ""
            for encoding in ("utf-8", "utf-8-sig", "latin-1", "cp1252", "ascii"):
                try:
                    with open(file_path, "r", encoding=encoding) as f:
                        text = f.read()
                    break
                except (UnicodeDecodeError, UnicodeError):
                    continue

            if not text:
                return self._create_error_result(file_name, "txt", "Could not decode file with any supported encoding")

            text = normalize_text(text)

            page = PageContent(
                page_number=1,
                text=text,
            )

            word_count = len(text.split())

            return ExtractionResult(
                success=True,
                file_name=file_name,
                file_type="txt",
                file_size=file_size,
                total_pages=1,
                extracted_text=text,
                pages=[page],
                metadata=ExtractionMetadata(
                    word_count=word_count,
                    char_count=len(text),
                    extraction_method="direct-read",
                ),
            )
        except Exception as e:
            return self._create_error_result(file_name, "txt", str(e))
