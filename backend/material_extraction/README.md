# Material Extraction Backend (Python FastAPI)

## Overview
This is a standalone Python FastAPI backend service for extracting text content from uploaded materials (PDF, DOCX, PPTX, images, TXT, DOC). It runs separately from the QGenesis React frontend.

## Quick Start

```bash
cd backend/material_extraction

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt

# Install Tesseract OCR (required for image/scanned PDF extraction)
# Ubuntu/Debian:
sudo apt-get install tesseract-ocr
# macOS:
brew install tesseract
# Windows: Download from https://github.com/UB-Mannheim/tesseract/wiki

# Run the server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## API Endpoints

### `POST /api/extract`
Upload a file and extract text content with metadata.

**Request:** `multipart/form-data` with `file` field

**Response:**
```json
{
  "success": true,
  "file_name": "document.pdf",
  "file_type": "pdf",
  "file_size": 1234567,
  "total_pages": 5,
  "extracted_text": "Full extracted text...",
  "pages": [
    {
      "page_number": 1,
      "text": "Page 1 text...",
      "has_images": true,
      "image_text": "OCR text from images..."
    }
  ],
  "metadata": {
    "word_count": 2500,
    "char_count": 15000,
    "language": "en",
    "has_images": true,
    "has_tables": false
  },
  "topics": ["Topic 1", "Topic 2"]
}
```

### `POST /api/extract/batch`
Upload multiple files at once.

### `GET /api/health`
Health check endpoint.

## Supported Formats
| Format | Extension | Method |
|--------|-----------|--------|
| PDF | .pdf | PyPDF2 + pdfplumber + Tesseract OCR |
| Word | .docx | python-docx |
| Word (Legacy) | .doc | antiword fallback |
| PowerPoint | .pptx | python-pptx |
| Images | .jpg, .png, .bmp, .tiff | Tesseract OCR |
| Plain Text | .txt | Direct read |

## Architecture
```
material_extraction/
├── main.py              # FastAPI app & routes
├── extractors/
│   ├── __init__.py      # Extractor registry
│   ├── base.py          # Base extractor interface
│   ├── pdf_extractor.py # PDF text + image extraction
│   ├── docx_extractor.py# DOCX text + image extraction
│   ├── pptx_extractor.py# PPTX slide text extraction
│   ├── image_extractor.py# OCR for images
│   ├── txt_extractor.py # Plain text reader
│   └── doc_extractor.py # Legacy .doc support
├── utils/
│   ├── __init__.py
│   ├── text_normalizer.py # Text cleanup utilities
│   └── file_detector.py   # MIME type detection
├── models.py            # Pydantic models
├── requirements.txt     # Python dependencies
└── README.md
```

## Integration with QGenesis Frontend

Update `frontend/src/services/materialExtraction.ts` with your backend URL:

```typescript
const EXTRACTION_API_URL = 'http://localhost:8000';
// or your deployed URL
```

The frontend `UploadMaterials` component will automatically detect and use the Python backend when available, falling back to browser-based extraction otherwise.
