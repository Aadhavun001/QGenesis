"""Extractor registry — maps file types to their extractor classes."""

from .base import BaseExtractor
from .pdf_extractor import PDFExtractor
from .docx_extractor import DOCXExtractor
from .pptx_extractor import PPTXExtractor
from .image_extractor import ImageExtractor
from .txt_extractor import TXTExtractor
from .doc_extractor import DOCExtractor
from models import FileType


EXTRACTOR_MAP: dict[FileType, type[BaseExtractor]] = {
    FileType.PDF: PDFExtractor,
    FileType.DOCX: DOCXExtractor,
    FileType.DOC: DOCExtractor,
    FileType.PPTX: PPTXExtractor,
    FileType.TXT: TXTExtractor,
    FileType.JPG: ImageExtractor,
    FileType.PNG: ImageExtractor,
    FileType.BMP: ImageExtractor,
    FileType.TIFF: ImageExtractor,
}


def get_extractor(file_type: FileType) -> BaseExtractor:
    """Get the appropriate extractor for a given file type."""
    extractor_class = EXTRACTOR_MAP.get(file_type)
    if extractor_class is None:
        raise ValueError(f"No extractor available for file type: {file_type}")
    return extractor_class()


__all__ = [
    "get_extractor",
    "BaseExtractor",
    "PDFExtractor",
    "DOCXExtractor",
    "DOCExtractor",
    "PPTXExtractor",
    "ImageExtractor",
    "TXTExtractor",
    "EXTRACTOR_MAP",
]
