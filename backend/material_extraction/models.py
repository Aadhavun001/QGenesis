"""Pydantic models for the material extraction API."""

from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class FileType(str, Enum):
    PDF = "pdf"
    DOCX = "docx"
    DOC = "doc"
    PPTX = "pptx"
    TXT = "txt"
    JPG = "jpg"
    PNG = "png"
    BMP = "bmp"
    TIFF = "tiff"
    UNKNOWN = "unknown"


class PageContent(BaseModel):
    """Represents extracted content from a single page/slide."""
    page_number: int
    text: str = ""
    has_images: bool = False
    image_text: str = ""  # OCR text extracted from images on this page
    slide_title: Optional[str] = None  # For PPTX slides


class ExtractionMetadata(BaseModel):
    """Metadata about the extracted content."""
    word_count: int = 0
    char_count: int = 0
    language: str = "en"
    has_images: bool = False
    has_tables: bool = False
    extraction_method: str = ""
    processing_time_ms: float = 0


class ExtractionResult(BaseModel):
    """Complete extraction result for a single file."""
    success: bool = True
    error: Optional[str] = None
    file_name: str
    file_type: str
    file_size: int = 0
    total_pages: int = 0
    extracted_text: str = ""
    pages: list[PageContent] = Field(default_factory=list)
    metadata: ExtractionMetadata = Field(default_factory=ExtractionMetadata)
    topics: list[str] = Field(default_factory=list)
    nlp_analysis: Optional[dict] = None  # Full NLP analysis result when available


class BatchExtractionResult(BaseModel):
    """Result for batch file extraction."""
    total_files: int
    successful: int
    failed: int
    results: list[ExtractionResult]


class HealthResponse(BaseModel):
    """Health check response."""
    status: str = "ok"
    version: str = "1.0.0"
    tesseract_available: bool = False
    spacy_available: bool = False
