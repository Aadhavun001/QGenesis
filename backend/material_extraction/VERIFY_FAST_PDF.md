# Verify fast PDF upload path

## One-command verification (recommended)

From `backend/material_extraction`:

```bash
./run_verify.sh
```

This frees port 8080, starts the backend, installs reportlab if needed, and runs the verification with a generated test PDF. You should see `extraction_method: PyPDF2_fast` and a low `processing_time_ms`.

---

## Manual steps

### 1. Start the backend

From this directory (`backend/material_extraction`):

```bash
uvicorn main:app --host 127.0.0.1 --port 8080 --reload
```

If port 8080 is in use, stop the existing process first or use another port and set `VITE_EXTRACTION_API_URL` in the frontend accordingly.

## 2. Verify with the script

**Option A – Use a text-based PDF you have (e.g. exported from Word):**

```bash
python verify_fast_pdf.py /path/to/your/document.pdf
```

**Option B – Generate a small test PDF (needs `reportlab`):**

```bash
pip install reportlab
python verify_fast_pdf.py
```

You should see:

- `extraction_method: PyPDF2_fast`
- `processing_time_ms:` a low value (typically 1–3 seconds)

If you see a different `extraction_method` (e.g. `pdfplumber+PyPDF2+OCR`), the PDF had too little extractable text and the full path was used (e.g. scanned/image PDF).

## 3. Verify in the app (Upload Materials)

1. Open the frontend (e.g. `http://127.0.0.1:8081`) and go to **Upload Materials**.
2. Upload a **text-based PDF** (not a scanned image PDF).
3. Upload should finish in a few seconds.
4. To confirm the fast path was used: open DevTools → Network → select the request to `/api/extract` → Response → check `metadata.extraction_method === "PyPDF2_fast"`.
