#!/usr/bin/env bash
# Run this from backend/material_extraction to verify the fast PDF path.
# 1. Ensures nothing is on port 8080 (optional kill)
# 2. Starts the backend in the background
# 3. Installs reportlab if needed, runs verify_fast_pdf.py

set -e
cd "$(dirname "$0")"

echo "=== Checking port 8080 ==="
if lsof -i :8080 -t >/dev/null 2>&1; then
  echo "Stopping processes on port 8080..."
  lsof -i :8080 -t | xargs kill -9 2>/dev/null || true
  sleep 2
fi

echo "=== Starting backend ==="
./venv/bin/uvicorn main:app --host 127.0.0.1 --port 8080 --reload &
UVICORN_PID=$!
sleep 4

echo "=== Installing reportlab if needed ==="
./venv/bin/pip install reportlab -q

echo "=== Running verification (generated test PDF) ==="
./venv/bin/python verify_fast_pdf.py

echo ""
echo "Done. Backend is still running (PID $UVICORN_PID). Stop with: kill $UVICORN_PID"
