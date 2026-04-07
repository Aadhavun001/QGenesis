# How PDF text is extracted

## Is all text extracted? Word by word? What about images and diagrams?

- **Pages (full extraction, default):** Up to **1000 pages** are processed (full books). Every page’s text is extracted; we do **not** drop words. Tables are extracted and appended with a `[TABLE]` marker.
- **Images and diagrams:** For every page that contains images/diagrams, we run **OCR** (Tesseract) on the page image (up to 500 such pages). Extracted text from figures, labels, and captions is appended with an `[IMAGE/DIAGRAM TEXT]` marker so it’s clear in the final text. So images and diagrams are analysed and their text is included in `extracted_text`.
- **Scanned books:** If the PDF has almost no selectable text, we run **full-page OCR** on up to 500 pages and label the result as `[SCANNED PAGE TEXT]`.
- **Within a page:** We do **not** skip words. pdfplumber/PyPDF2 give full page text; we concatenate everything (body text, table text, image/diagram OCR). So the content is analysed and extracted as completely as the libraries and OCR allow.
- **Chunking/topics:** The first **500k characters** are used to build chunks and topics. The **entire** `extracted_text` (all pages, tables, image/diagram text) is returned and saved (frontend saves up to 2M characters).

## Full extraction vs fast (PDF only)

- **Full extraction** (`full_extraction=true`, default): All pages, tables, and image/diagram OCR. Use this for materials and full books.
- **Fast** (`full_extraction=false`): Text-only via PyPDF2, up to 500 pages, no tables or OCR. Use for quick previews.

## Limits (as of last update)

| What | Limit |
|------|--------|
| Full path (pdfplumber + tables + OCR) | 1000 pages |
| Pages with image/diagram OCR | 500 |
| Full-page OCR (scanned PDFs) | 500 pages |
| Text used for chunking/topics | First 500k chars |
| Max chunks built | 150 |
| Frontend saved content | First 2M chars |

So for full books and materials, **all text, tables, and image/diagram text are extracted and analysed** within these caps.
