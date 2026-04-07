/**
 * Material Extraction Service
 * 
 * Provides a unified API for extracting text from uploaded files.
 * - Tries the Python FastAPI backend first (if available after export)
 * - Falls back to browser-based extraction for TXT/basic text
 * - Reports unsupported formats gracefully
 */

// pdf.js for accurate PDF text extraction in-browser (fallback when backend unavailable)
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';

// ── Types ─────────────────────────────────────────────────────────

export interface PageContent {
  pageNumber: number;
  text: string;
  hasImages: boolean;
  imageText: string;
  slideTitle?: string;
}

export interface ExtractionMetadata {
  wordCount: number;
  charCount: number;
  language: string;
  hasImages: boolean;
  hasTables: boolean;
  extractionMethod: string;
  processingTimeMs: number;
}

// ── NLP Analysis Types ────────────────────────────────────────────

export interface NLPChunkMetadata {
  keywords: string[];
  keyPhrases: string[];
  estimatedDifficulty: 'easy' | 'medium' | 'hard';
  sentenceCount: number;
  wordCount: number;
  hasDefinitions: boolean;
  hasFormulas: boolean;
  hasExamples: boolean;
  namedEntities: string[];
}

export interface NLPContentChunk {
  chunkId: number;
  chunkType: string; // unit, topic, paragraph, section
  title: string;
  text: string;
  sentences: string[];
  lemmatizedTokens: string[];
  metadata: NLPChunkMetadata;
}

export interface NLPTopicInfo {
  name: string;
  relevance: number;
  subtopics: string[];
  keywords: string[];
  chunkIds: number[];
}

export interface NLPAnalysisResult {
  topics: NLPTopicInfo[];
  chunks: NLPContentChunk[];
  globalKeywords: string[];
  globalKeyPhrases: string[];
  namedEntities: Array<{ text: string; label: string; count: number }>;
  sentenceCount: number;
  vocabularyRichness: number;
  estimatedAcademicLevel: string;
  processingTimeMs: number;
}

export interface ExtractionResult {
  success: boolean;
  error?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  totalPages: number;
  extractedText: string;
  pages: PageContent[];
  metadata: ExtractionMetadata;
  topics: string[];
  nlpAnalysis?: NLPAnalysisResult;
}

// ── Configuration ─────────────────────────────────────────────────

/**
 * Set this to your Python backend URL after export.
 * Leave empty to use browser-based fallback only.
 */
/** Python extraction backend (Prompt 2). When running: uvicorn main:app --host 127.0.0.1 --port 8080 */
const EXTRACTION_API_URL = import.meta.env.VITE_EXTRACTION_API_URL ?? 'http://localhost:8080';

// ── Backend Extraction (Python API) ───────────────────────────────

async function extractViaBackend(file: File, fullExtraction: boolean = false): Promise<ExtractionResult | null> {
  if (!EXTRACTION_API_URL) return null;

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('full_extraction', fullExtraction ? 'true' : 'false');

    const controller = new AbortController();
    const timeoutMs = fullExtraction ? 180_000 : 45_000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(`${EXTRACTION_API_URL}/api/extract`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.warn('Backend extraction failed:', response.statusText);
      return null;
    }

    const data = await response.json();
    
    // Parse NLP analysis if present
    let nlpAnalysis: NLPAnalysisResult | undefined;
    if (data.nlp_analysis) {
      const nlp = data.nlp_analysis;
      nlpAnalysis = {
        topics: (nlp.topics || []).map((t: any) => ({
          name: t.name,
          relevance: t.relevance,
          subtopics: t.subtopics || [],
          keywords: t.keywords || [],
          chunkIds: t.chunk_ids || [],
        })),
        chunks: (nlp.chunks || []).map((c: any) => ({
          chunkId: c.chunk_id,
          chunkType: c.chunk_type,
          title: c.title || '',
          text: c.text,
          sentences: c.sentences || [],
          lemmatizedTokens: c.lemmatized_tokens || [],
          metadata: {
            keywords: c.metadata?.keywords || [],
            keyPhrases: c.metadata?.key_phrases || [],
            estimatedDifficulty: c.metadata?.estimated_difficulty || 'medium',
            sentenceCount: c.metadata?.sentence_count || 0,
            wordCount: c.metadata?.word_count || 0,
            hasDefinitions: c.metadata?.has_definitions || false,
            hasFormulas: c.metadata?.has_formulas || false,
            hasExamples: c.metadata?.has_examples || false,
            namedEntities: c.metadata?.named_entities || [],
          },
        })),
        globalKeywords: nlp.global_keywords || [],
        globalKeyPhrases: nlp.global_key_phrases || [],
        namedEntities: nlp.named_entities || [],
        sentenceCount: nlp.sentence_count || 0,
        vocabularyRichness: nlp.vocabulary_richness || 0,
        estimatedAcademicLevel: nlp.estimated_academic_level || 'undergraduate',
        processingTimeMs: nlp.processing_time_ms || 0,
      };
    }

    return {
      success: data.success,
      error: data.error,
      fileName: data.file_name,
      fileType: data.file_type,
      fileSize: data.file_size,
      totalPages: data.total_pages,
      extractedText: data.extracted_text,
      pages: (data.pages || []).map((p: any) => ({
        pageNumber: p.page_number,
        text: p.text,
        hasImages: p.has_images,
        imageText: p.image_text || '',
        slideTitle: p.slide_title,
      })),
      metadata: {
        wordCount: data.metadata?.word_count || 0,
        charCount: data.metadata?.char_count || 0,
        language: data.metadata?.language || 'en',
        hasImages: data.metadata?.has_images || false,
        hasTables: data.metadata?.has_tables || false,
        extractionMethod: data.metadata?.extraction_method || 'backend-api',
        processingTimeMs: data.metadata?.processing_time_ms || 0,
      },
      topics: data.topics || [],
      nlpAnalysis,
    };
  } catch (error) {
    console.warn('Backend not available, falling back to browser extraction:', error);
    return null;
  }
}

// ── Browser-based Extraction (Fallback) ───────────────────────────

function normalizeText(text: string): string {
  if (!text) return '';
  
  // Fix hyphenated line breaks
  text = text.replace(/(\w)-\n(\w)/g, '$1$2');
  
  // Replace single newlines with space (preserve double newlines as paragraphs)
  text = text.replace(/(?<![.\n!?:;])\n(?!\n)/g, ' ');
  
  // Collapse multiple spaces
  text = text.replace(/[ \t]+/g, ' ');
  
  // Normalize multiple blank lines
  text = text.replace(/\n{3,}/g, '\n\n');
  
  // Trim each line
  text = text.split('\n').map(line => line.trim()).join('\n');
  
  return text.trim();
}

function estimateTopics(text: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'shall', 'must', 'to', 'of', 'in',
    'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through',
    'during', 'before', 'after', 'above', 'below', 'between', 'under',
    'and', 'but', 'or', 'not', 'no', 'if', 'then', 'than', 'too', 'very',
    'just', 'about', 'up', 'out', 'so', 'this', 'that', 'these', 'those',
    'it', 'its', 'he', 'she', 'they', 'we', 'you', 'me', 'him', 'her',
    'us', 'them', 'my', 'your', 'his', 'our', 'their', 'what', 'which',
    'who', 'whom', 'how', 'when', 'where', 'why', 'all', 'each', 'every',
    'both', 'few', 'more', 'most', 'other', 'some', 'such', 'only', 'same',
  ]);

  // Extract words 3+ chars, not stop words
  const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  const freq: Record<string, number> = {};
  for (const w of words) {
    if (!stopWords.has(w)) {
      freq[w] = (freq[w] || 0) + 1;
    }
  }

  // Sort by frequency, take top 8, capitalize
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
}

async function extractInBrowser(file: File, options?: ExtractOptions): Promise<ExtractionResult> {
  const startTime = performance.now();
  const fileName = file.name;
  const fileSize = file.size;
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const requestedFull = options?.fullExtraction ?? false;

  try {
    let text = '';
    let method = 'browser-text-reader';

    // Text-based files we can read directly
    if (['txt', 'text', 'md', 'csv', 'json', 'xml', 'html', 'htm'].includes(ext)) {
      text = await file.text();
      method = 'direct-read';
    } 
    // PDF: real text extraction via pdf.js (much better than binary scan)
    else if (ext === 'pdf') {
      const buffer = await file.arrayBuffer();
      // Use CDN worker to avoid bundler config hassles
      GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.js';
      const pdf = await getDocument({ data: buffer }).promise;
      const pages: PageContent[] = [];
      const pageTexts: string[] = [];
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        const items = content.items as TextItem[];
        const pageText = items.map((i) => i.str).join(' ');
        pageTexts.push(pageText);
        pages.push({
          pageNumber,
          text: pageText,
          hasImages: false,
          imageText: '',
        });
      }
      text = pageTexts.join('\n\n');
      method = requestedFull ? 'browser-pdfjs-full-text' : 'pdfjs-text';

      text = normalizeText(text);
      const topics = estimateTopics(text);
      const elapsed = performance.now() - startTime;
      return {
        success: true,
        fileName,
        fileType: ext,
        fileSize,
        totalPages: pdf.numPages,
        extractedText: text,
        pages,
        metadata: {
          wordCount: text.split(/\s+/).filter(Boolean).length,
          charCount: text.length,
          language: 'en',
          hasImages: false,
          hasTables: false,
          extractionMethod: method,
          processingTimeMs: Math.round(elapsed * 100) / 100,
        },
        topics,
      };
    }
    // For PDF/DOCX/PPTX, try to read as text (won't work for binary, but catches some)
    else if (['pdf', 'docx', 'doc', 'pptx'].includes(ext)) {
      // Attempt to read as ArrayBuffer and extract any readable text
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      
      // Try to find text content in binary
      const textChunks: string[] = [];
      let currentChunk = '';
      
      for (let i = 0; i < bytes.length; i++) {
        const byte = bytes[i];
        // Printable ASCII range
        if (byte >= 32 && byte <= 126) {
          currentChunk += String.fromCharCode(byte);
        } else if (byte === 10 || byte === 13) {
          currentChunk += '\n';
        } else {
          if (currentChunk.trim().length > 10) {
            textChunks.push(currentChunk.trim());
          }
          currentChunk = '';
        }
      }
      if (currentChunk.trim().length > 10) {
        textChunks.push(currentChunk.trim());
      }
      
      text = textChunks.join('\n\n');
      method = 'binary-text-scan';
      
      // If very little text found, note limitation
      if (text.length < 100) {
        return {
          success: true,
          fileName,
          fileType: ext,
          fileSize,
          totalPages: 0,
          extractedText: text,
          pages: [],
          metadata: {
            wordCount: text.split(/\s+/).filter(Boolean).length,
            charCount: text.length,
            language: 'en',
            hasImages: false,
            hasTables: false,
            extractionMethod: method,
            processingTimeMs: performance.now() - startTime,
          },
          topics: [],
        };
      }
    }
    // Images — we can't OCR in browser without a library
    else if (['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'tif'].includes(ext)) {
      return {
        success: true,
        fileName,
        fileType: ext,
        fileSize,
        totalPages: 1,
        extractedText: '',
        pages: [{
          pageNumber: 1,
          text: '',
          hasImages: true,
          imageText: '',
        }],
        metadata: {
          wordCount: 0,
          charCount: 0,
          language: 'en',
          hasImages: true,
          hasTables: false,
          extractionMethod: 'browser-no-ocr',
          processingTimeMs: performance.now() - startTime,
        },
        topics: [],
      };
    }
    else {
      // Try reading as text
      try {
        text = await file.text();
        method = 'text-fallback';
      } catch {
        return {
          success: false,
          error: `Unsupported file format: .${ext}`,
          fileName,
          fileType: ext,
          fileSize,
          totalPages: 0,
          extractedText: '',
          pages: [],
          metadata: {
            wordCount: 0,
            charCount: 0,
            language: 'en',
            hasImages: false,
            hasTables: false,
            extractionMethod: 'none',
            processingTimeMs: performance.now() - startTime,
          },
          topics: [],
        };
      }
    }

    // Normalize and build result
    text = normalizeText(text);
    const topics = estimateTopics(text);
    const elapsed = performance.now() - startTime;

    return {
      success: true,
      fileName,
      fileType: ext,
      fileSize,
      totalPages: 1,
      extractedText: text,
      pages: [{
        pageNumber: 1,
        text,
        hasImages: false,
        imageText: '',
      }],
      metadata: {
        wordCount: text.split(/\s+/).filter(Boolean).length,
        charCount: text.length,
        language: 'en',
        hasImages: false,
        hasTables: false,
        extractionMethod: method,
        processingTimeMs: Math.round(elapsed * 100) / 100,
      },
      topics,
    };
  } catch (error) {
    return {
      success: false,
      error: `Extraction failed: ${error instanceof Error ? error.message : String(error)}`,
      fileName,
      fileType: ext,
      fileSize,
      totalPages: 0,
      extractedText: '',
      pages: [],
      metadata: {
        wordCount: 0,
        charCount: 0,
        language: 'en',
        hasImages: false,
        hasTables: false,
        extractionMethod: 'failed',
        processingTimeMs: performance.now() - startTime,
      },
      topics: [],
    };
  }
}

// ── Public API ─────────────────────────────────────────────────────

export interface ExtractOptions {
  /** If true, full extraction (tables, images/diagrams OCR) — slower. If false, quick text-only — faster. */
  fullExtraction?: boolean;
}

/**
 * Extract text content from a file.
 * Tries Python backend first, falls back to browser-based extraction.
 * @param options.fullExtraction - true = full (tables, images/OCR, slower); false = quick (text-only, faster). Default false.
 */
export async function extractMaterialContent(file: File, options?: ExtractOptions): Promise<ExtractionResult> {
  const fullExtraction = options?.fullExtraction ?? false;
  const backendResult = await extractViaBackend(file, fullExtraction);
  if (backendResult) return backendResult;

  return extractInBrowser(file, { fullExtraction });
}

/**
 * Check if the Python extraction backend is available.
 */
export async function isBackendAvailable(): Promise<boolean> {
  if (!EXTRACTION_API_URL) return false;
  try {
    const resp = await fetch(`${EXTRACTION_API_URL}/api/health`, { signal: AbortSignal.timeout(3000) });
    return resp.ok;
  } catch {
    return false;
  }
}
