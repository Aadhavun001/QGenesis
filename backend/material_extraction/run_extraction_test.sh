#!/usr/bin/env bash
# Quick extraction pipeline test. Run with: ./run_extraction_test.sh
# Backend must be running: uvicorn main:app --host 0.0.0.0 --port 8000

set -e
BASE="${1:-http://127.0.0.1:8000}"

echo "=============================================="
echo "  QGenesis Extraction Pipeline Test"
echo "  Base URL: $BASE"
echo "=============================================="
echo ""

echo "1. Health check"
echo "   GET $BASE/api/health"
curl -s "$BASE/api/health" | python3 -m json.tool
echo ""

echo "2. Extraction test (TXT file)"
TESTFILE="/tmp/qgenesis-extract-test-$$.txt"
echo "QGenesis test. This file has a few words for extraction." > "$TESTFILE"
echo "   POST $BASE/api/extract (file: $TESTFILE)"
curl -s -X POST "$BASE/api/extract" -F "file=@$TESTFILE" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print('   success:', d.get('success'))
print('   file_name:', d.get('file_name'))
print('   word_count:', d.get('metadata', {}).get('word_count'))
print('   extraction_method:', d.get('metadata', {}).get('extraction_method'))
print('   processing_time_ms:', d.get('metadata', {}).get('processing_time_ms'))
print('   topics:', d.get('topics', [])[:6])
print('   nlp_analysis:', 'yes' if d.get('nlp_analysis') else 'no')
"
rm -f "$TESTFILE"
echo ""

echo "=============================================="
echo "  Done. See readme/EXTRACTION_TEST_RESULTS.md for full output format."
echo "=============================================="
