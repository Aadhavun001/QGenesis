"""Legacy .doc file extraction using antiword or textract fallback."""

import os
import subprocess
from models import ExtractionResult, PageContent, ExtractionMetadata
from .base import BaseExtractor
from utils.text_normalizer import normalize_text


class DOCExtractor(BaseExtractor):
    """Extract text from legacy .doc files using antiword."""

    async def extract(self, file_path: str, file_name: str) -> ExtractionResult:
        file_size = os.path.getsize(file_path)

        try:
            text = ""

            # Method 1: Try antiword
            try:
                result = subprocess.run(
                    ["antiword", file_path],
                    capture_output=True,
                    text=True,
                    timeout=30,
                )
                if result.returncode == 0:
                    text = result.stdout
            except FileNotFoundError:
                pass  # antiword not installed

            # Method 2: Try catdoc
            if not text.strip():
                try:
                    result = subprocess.run(
                        ["catdoc", file_path],
                        capture_output=True,
                        text=True,
                        timeout=30,
                    )
                    if result.returncode == 0:
                        text = result.stdout
                except FileNotFoundError:
                    pass  # catdoc not installed

            # Method 3: Try libreoffice conversion
            if not text.strip():
                try:
                    import tempfile
                    with tempfile.TemporaryDirectory() as tmp_dir:
                        subprocess.run(
                            [
                                "libreoffice", "--headless", "--convert-to", "txt:Text",
                                "--outdir", tmp_dir, file_path,
                            ],
                            capture_output=True,
                            timeout=60,
                        )
                        base_name = os.path.splitext(os.path.basename(file_path))[0]
                        txt_path = os.path.join(tmp_dir, f"{base_name}.txt")
                        if os.path.exists(txt_path):
                            with open(txt_path, "r", encoding="utf-8", errors="ignore") as f:
                                text = f.read()
                except (FileNotFoundError, subprocess.TimeoutExpired):
                    pass

            if not text.strip():
                return self._create_error_result(
                    file_name, "doc",
                    "Could not extract text from .doc file. "
                    "Install antiword (`sudo apt-get install antiword`) or "
                    "LibreOffice for .doc support."
                )

            text = normalize_text(text)

            page = PageContent(
                page_number=1,
                text=text,
            )

            word_count = len(text.split())

            return ExtractionResult(
                success=True,
                file_name=file_name,
                file_type="doc",
                file_size=file_size,
                total_pages=1,
                extracted_text=text,
                pages=[page],
                metadata=ExtractionMetadata(
                    word_count=word_count,
                    char_count=len(text),
                    extraction_method="antiword/catdoc/libreoffice",
                ),
            )
        except Exception as e:
            return self._create_error_result(file_name, "doc", str(e))
