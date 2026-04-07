"""Base extractor interface for all file type extractors."""

from abc import ABC, abstractmethod
from models import ExtractionResult


class BaseExtractor(ABC):
    """Abstract base class for document text extractors."""

    @abstractmethod
    async def extract(self, file_path: str, file_name: str) -> ExtractionResult:
        """
        Extract text content from a file.

        Args:
            file_path: Path to the temporary file on disk.
            file_name: Original file name.

        Returns:
            ExtractionResult with text content and metadata.
        """
        ...

    def _create_error_result(self, file_name: str, file_type: str, error: str) -> ExtractionResult:
        """Create a standardized error result."""
        return ExtractionResult(
            success=False,
            error=error,
            file_name=file_name,
            file_type=file_type,
        )
