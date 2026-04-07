"""File type detection using magic bytes and extension mapping."""

import os
from models import FileType


# Extension → FileType mapping
EXTENSION_MAP: dict[str, FileType] = {
    ".pdf": FileType.PDF,
    ".docx": FileType.DOCX,
    ".doc": FileType.DOC,
    ".pptx": FileType.PPTX,
    ".txt": FileType.TXT,
    ".text": FileType.TXT,
    ".md": FileType.TXT,
    ".csv": FileType.TXT,
    ".jpg": FileType.JPG,
    ".jpeg": FileType.JPG,
    ".png": FileType.PNG,
    ".bmp": FileType.BMP,
    ".tiff": FileType.TIFF,
    ".tif": FileType.TIFF,
}

# Magic bytes for common file types
MAGIC_BYTES: dict[bytes, FileType] = {
    b"%PDF": FileType.PDF,
    b"PK\x03\x04": FileType.DOCX,  # Could be DOCX, PPTX, or XLSX
    b"\xff\xd8\xff": FileType.JPG,
    b"\x89PNG": FileType.PNG,
    b"BM": FileType.BMP,
    b"II*\x00": FileType.TIFF,
    b"MM\x00*": FileType.TIFF,
}


def detect_file_type(file_path: str, file_name: str) -> FileType:
    """
    Detect file type using extension first, then magic bytes as fallback.

    Args:
        file_path: Path to the file on disk.
        file_name: Original file name with extension.

    Returns:
        Detected FileType enum value.
    """
    # 1. Try extension-based detection
    ext = os.path.splitext(file_name)[1].lower()
    if ext in EXTENSION_MAP:
        return EXTENSION_MAP[ext]

    # 2. Try magic bytes detection
    try:
        with open(file_path, "rb") as f:
            header = f.read(8)
            for magic, file_type in MAGIC_BYTES.items():
                if header.startswith(magic):
                    # Distinguish DOCX vs PPTX for PK (ZIP) files
                    if magic == b"PK\x03\x04":
                        return _detect_office_type(file_path, file_name)
                    return file_type
    except Exception:
        pass

    # 3. Try python-magic if available
    try:
        import magic
        mime = magic.from_file(file_path, mime=True)
        mime_map: dict[str, FileType] = {
            "application/pdf": FileType.PDF,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document": FileType.DOCX,
            "application/msword": FileType.DOC,
            "application/vnd.openxmlformats-officedocument.presentationml.presentation": FileType.PPTX,
            "text/plain": FileType.TXT,
            "image/jpeg": FileType.JPG,
            "image/png": FileType.PNG,
            "image/bmp": FileType.BMP,
            "image/tiff": FileType.TIFF,
        }
        if mime in mime_map:
            return mime_map[mime]
    except ImportError:
        pass

    return FileType.UNKNOWN


def _detect_office_type(file_path: str, file_name: str) -> FileType:
    """Distinguish between DOCX and PPTX (both are ZIP files)."""
    import zipfile
    try:
        with zipfile.ZipFile(file_path, "r") as z:
            names = z.namelist()
            if any("word/" in n for n in names):
                return FileType.DOCX
            if any("ppt/" in n for n in names):
                return FileType.PPTX
    except Exception:
        pass

    # Fallback to extension
    ext = os.path.splitext(file_name)[1].lower()
    if ext == ".pptx":
        return FileType.PPTX
    return FileType.DOCX
