#!/usr/bin/env python3
"""
Verify the fast PDF extraction path.

Usage:
  1. Start the backend: uvicorn main:app --host 127.0.0.1 --port 8080 --reload
  2. Run: python verify_fast_pdf.py [path_to.pdf]
     If no path is given, creates a minimal PDF with text (requires reportlab).

Prints extraction_method and processing_time_ms. For a text-based PDF you should see:
  extraction_method: PyPDF2_fast
  processing_time_ms: < 5000 (typically 1–3 seconds)
"""

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path


def main():
    base_url = "http://127.0.0.1:8080"
    pdf_path = sys.argv[1] if len(sys.argv) > 1 else None

    if pdf_path:
        path = Path(pdf_path).resolve()
        if not path.is_file():
            print(f"File not found: {path}", file=sys.stderr)
            sys.exit(1)
    else:
        try:
            from reportlab.pdfgen import canvas
            from reportlab.lib.pagesizes import letter
            import io
            buf = io.BytesIO()
            c = canvas.Canvas(buf, pagesize=letter)
            c.drawString(100, 700, "QGenesis fast PDF verification. This text has more than eighty characters so the fast path is used.")
            c.save()
            data = buf.getvalue()
            fd, path_str = tempfile.mkstemp(suffix=".pdf")
            try:
                os.write(fd, data)
            finally:
                os.close(fd)
            path = Path(path_str)
        except ImportError:
            print("No PDF path given and reportlab not installed. Usage: python verify_fast_pdf.py <path_to.pdf>", file=sys.stderr)
            sys.exit(1)

    # Optional: check backend is up
    r = subprocess.run(["curl", "-s", "-m", "3", f"{base_url}/api/health"], capture_output=True, timeout=5)
    if r.returncode != 0 or b"ok" not in (r.stdout or b""):
        print("Backend not reachable at", base_url, "- start with: uvicorn main:app --host 127.0.0.1 --port 8080 --reload", file=sys.stderr)
        sys.exit(1)

    result = subprocess.run(
        ["curl", "-s", "-S", "-X", "POST", f"{base_url}/api/extract", "-F", f"file=@{path}"],
        capture_output=True,
        timeout=90,
        cwd=Path(__file__).resolve().parent,
    )

    if not pdf_path and isinstance(path, Path) and path.is_file():
        path.unlink(missing_ok=True)
    if result.returncode != 0:
        print("curl failed:", result.stderr.decode() or result.stdout.decode(), file=sys.stderr)
        sys.exit(1)

    try:
        out = result.stdout.decode()
        d = json.loads(out)
    except Exception as e:
        print("Response was not JSON:", e, file=sys.stderr)
        print(out[:500], file=sys.stderr)
        sys.exit(1)

    success = d.get("success", False)
    meta = d.get("metadata") or {}
    method = meta.get("extraction_method", "")
    time_ms = meta.get("processing_time_ms", 0)

    print("Success:", success)
    print("extraction_method:", method)
    print("processing_time_ms:", time_ms)
    print("total_pages:", d.get("total_pages"))
    print("extracted_text length:", len((d.get("extracted_text") or "")))

    if method == "PyPDF2_fast":
        print("\nFast path used: PDF was extracted with PyPDF2 only (no pdfplumber/OCR).")
    else:
        print("\nFull path used (pdfplumber/OCR). Use a text-based PDF to see PyPDF2_fast.")


if __name__ == "__main__":
    main()
