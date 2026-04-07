/**
 * RAG (Retrieval-Augmented Generation) Service
 * ==============================================
 * 
 * Provides intelligent material chunk retrieval for the AI Assistant.
 * Ensures all AI responses are strictly grounded in uploaded material content.
 * 
 * ARCHITECTURE:
 * 1. Material → Chunked into semantic segments
 * 2. User query → Matched against chunks via TF-IDF similarity
 * 3. Top-K relevant chunks → Injected into OpenAI prompt context
 * 4. OpenAI generates responses strictly from provided chunks
 * 
 * PRODUCTION UPGRADE (Cursor):
 * - Replace TF-IDF with OpenAI embeddings for better semantic matching
 * - Store embeddings in Firestore for persistence
 * - Add re-ranking with a cross-encoder model
 */

import { NLPChunk, UploadedMaterial } from '@/stores/questionStore';

// ============================================================
// Types
// ============================================================

export interface MaterialChunk {
  id: string;
  materialId: string;
  materialName: string;
  text: string;
  title: string;
  chunkType: string;
  keywords: string[];
  sentences: string[];
  metadata: {
    wordCount: number;
    hasDefinitions: boolean;
    hasFormulas: boolean;
    hasExamples: boolean;
    estimatedDifficulty: string;
  };
}

export interface RetrievedContext {
  chunks: MaterialChunk[];
  totalChunks: number;
  relevanceScores: number[];
  contextText: string;       // Formatted context string for prompt injection
  materialNames: string[];
}

export interface RAGConfig {
  topK: number;              // Number of chunks to retrieve (default: 5)
  minRelevance: number;      // Minimum similarity threshold (default: 0.1)
  maxContextTokens: number;  // Max tokens for context window (default: 8000)
  includeMetadata: boolean;  // Include chunk metadata in context
}

const DEFAULT_RAG_CONFIG: RAGConfig = {
  topK: 6,
  minRelevance: 0.05,
  maxContextTokens: 8000,
  includeMetadata: true,
};

// ============================================================
// Material Chunking
// ============================================================

/**
 * Convert uploaded material into searchable chunks.
 * Uses NLP chunks if available, otherwise creates chunks from raw text.
 */
export function chunkMaterial(material: UploadedMaterial): MaterialChunk[] {
  // If NLP chunks are already available, use them
  if (material.nlpChunks && material.nlpChunks.length > 0) {
    return material.nlpChunks.map((chunk) => ({
      id: `${material.id}_chunk_${chunk.chunkId}`,
      materialId: material.id,
      materialName: material.fileName,
      text: chunk.text,
      title: chunk.title || `Section ${chunk.chunkId + 1}`,
      chunkType: chunk.chunkType,
      keywords: chunk.metadata?.keywords || [],
      sentences: chunk.sentences || [],
      metadata: {
        wordCount: chunk.metadata?.wordCount || chunk.text.split(/\s+/).length,
        hasDefinitions: chunk.metadata?.hasDefinitions || false,
        hasFormulas: chunk.metadata?.hasFormulas || false,
        hasExamples: chunk.metadata?.hasExamples || false,
        estimatedDifficulty: chunk.metadata?.estimatedDifficulty || 'medium',
      },
    }));
  }

  // Fallback: create chunks from raw text content
  return createChunksFromText(material);
}

/**
 * Create chunks from raw text using paragraph/section-based splitting.
 * Targets ~300-500 word chunks with sentence boundary awareness.
 */
function createChunksFromText(material: UploadedMaterial): MaterialChunk[] {
  const content = material.content || '';
  if (!content.trim()) return [];

  const chunks: MaterialChunk[] = [];
  
  // Split by headings first (markdown or numbered sections)
  const sections = content.split(/(?=^#{1,3}\s|^\d+\.\s+[A-Z])/m).filter(s => s.trim());
  
  let chunkId = 0;
  for (const section of sections) {
    const lines = section.split('\n');
    const titleLine = lines[0]?.trim() || '';
    const isHeading = /^#{1,3}\s/.test(titleLine) || /^\d+\.\s+[A-Z]/.test(titleLine);
    const title = isHeading ? titleLine.replace(/^#{1,3}\s*/, '').replace(/^\d+\.\s*/, '') : '';
    const body = isHeading ? lines.slice(1).join('\n').trim() : section.trim();
    
    if (!body) continue;

    // Sub-chunk if section is too large (>500 words)
    const words = body.split(/\s+/);
    if (words.length > 500) {
      const sentences = body.split(/(?<=[.!?])\s+/);
      let currentChunk = '';
      let sentenceBuffer: string[] = [];
      
      for (const sentence of sentences) {
        if ((currentChunk + ' ' + sentence).split(/\s+/).length > 400 && currentChunk) {
          chunks.push(buildChunk(material, chunkId++, title, currentChunk, sentenceBuffer));
          currentChunk = sentence;
          sentenceBuffer = [sentence];
        } else {
          currentChunk += (currentChunk ? ' ' : '') + sentence;
          sentenceBuffer.push(sentence);
        }
      }
      if (currentChunk.trim()) {
        chunks.push(buildChunk(material, chunkId++, title, currentChunk, sentenceBuffer));
      }
    } else {
      const sentences = body.split(/(?<=[.!?])\s+/).filter(s => s.trim());
      chunks.push(buildChunk(material, chunkId++, title, body, sentences));
    }
  }

  // If no sections found, just chunk by paragraphs
  if (chunks.length === 0) {
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim());
    let currentChunk = '';
    let sentenceBuffer: string[] = [];
    
    for (const para of paragraphs) {
      if ((currentChunk + '\n\n' + para).split(/\s+/).length > 400 && currentChunk) {
        chunks.push(buildChunk(material, chunkId++, '', currentChunk, sentenceBuffer));
        currentChunk = para;
        sentenceBuffer = para.split(/(?<=[.!?])\s+/);
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + para;
        sentenceBuffer.push(...para.split(/(?<=[.!?])\s+/));
      }
    }
    if (currentChunk.trim()) {
      chunks.push(buildChunk(material, chunkId++, '', currentChunk, sentenceBuffer));
    }
  }

  return chunks;
}

function buildChunk(
  material: UploadedMaterial,
  chunkId: number,
  title: string,
  text: string,
  sentences: string[]
): MaterialChunk {
  const lowerText = text.toLowerCase();
  return {
    id: `${material.id}_chunk_${chunkId}`,
    materialId: material.id,
    materialName: material.fileName,
    text,
    title,
    chunkType: title ? 'section' : 'paragraph',
    keywords: extractSimpleKeywords(text),
    sentences,
    metadata: {
      wordCount: text.split(/\s+/).length,
      hasDefinitions: /\b(is defined as|refers to|means|definition)\b/i.test(lowerText),
      hasFormulas: /[=+\-*/^]\s*\d/.test(text) || /\b(formula|equation)\b/i.test(lowerText),
      hasExamples: /\b(example|for instance|e\.g\.|such as|consider)\b/i.test(lowerText),
      estimatedDifficulty: estimateChunkDifficulty(text),
    },
  };
}

function extractSimpleKeywords(text: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall',
    'should', 'may', 'might', 'must', 'can', 'could', 'of', 'in', 'to',
    'for', 'with', 'on', 'at', 'by', 'from', 'as', 'into', 'through',
    'that', 'this', 'these', 'those', 'it', 'its', 'they', 'them', 'their',
    'which', 'who', 'whom', 'what', 'when', 'where', 'how', 'not', 'no',
    'and', 'or', 'but', 'if', 'then', 'than', 'also', 'just', 'about',
    'more', 'some', 'any', 'each', 'every', 'all', 'both', 'few', 'most',
    'other', 'such', 'only', 'own', 'same', 'so', 'very', 'too', 'quite',
  ]);

  const words = text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/);
  const freq = new Map<string, number>();
  
  for (const word of words) {
    if (word.length > 3 && !stopWords.has(word) && !/^\d+$/.test(word)) {
      freq.set(word, (freq.get(word) || 0) + 1);
    }
  }

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

function estimateChunkDifficulty(text: string): string {
  const complexIndicators = /\b(analyze|evaluate|synthesize|critically|furthermore|moreover|consequently|therefore|hypothesis|theoretical|empirical)\b/gi;
  const matches = text.match(complexIndicators);
  const complexity = (matches?.length || 0) / Math.max(text.split(/\s+/).length / 100, 1);
  
  if (complexity > 3) return 'hard';
  if (complexity > 1) return 'medium';
  return 'easy';
}

// ============================================================
// TF-IDF Based Retrieval (No External Dependencies)
// ============================================================

/**
 * Compute TF-IDF similarity between a query and a set of chunks.
 * This is a lightweight, zero-dependency implementation.
 * 
 * PRODUCTION UPGRADE: Replace with OpenAI embeddings + cosine similarity
 */
function computeTFIDF(query: string, chunks: MaterialChunk[]): number[] {
  const queryTerms = tokenize(query);
  const N = chunks.length;
  
  // Document frequency for each term
  const df = new Map<string, number>();
  const chunkTokens = chunks.map(chunk => {
    const tokens = tokenize(chunk.text + ' ' + chunk.title + ' ' + chunk.keywords.join(' '));
    const uniqueTokens = new Set(tokens);
    for (const token of uniqueTokens) {
      df.set(token, (df.get(token) || 0) + 1);
    }
    return tokens;
  });

  // Compute TF-IDF score for each chunk against the query
  return chunkTokens.map(tokens => {
    let score = 0;
    const tokenFreq = new Map<string, number>();
    for (const t of tokens) {
      tokenFreq.set(t, (tokenFreq.get(t) || 0) + 1);
    }

    for (const queryTerm of queryTerms) {
      const tf = (tokenFreq.get(queryTerm) || 0) / Math.max(tokens.length, 1);
      const idf = Math.log((N + 1) / ((df.get(queryTerm) || 0) + 1)) + 1;
      score += tf * idf;
    }

    return score;
  });
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);
}

// ============================================================
// Core RAG Retrieval
// ============================================================

/**
 * Retrieve the most relevant material chunks for a given query.
 * Uses TF-IDF similarity scoring (upgradeable to embeddings).
 */
export function retrieveRelevantChunks(
  query: string,
  materials: UploadedMaterial[],
  selectedMaterialId?: string | null,
  config: Partial<RAGConfig> = {}
): RetrievedContext {
  const ragConfig = { ...DEFAULT_RAG_CONFIG, ...config };
  
  // Chunk all relevant materials
  const targetMaterials = selectedMaterialId
    ? materials.filter(m => m.id === selectedMaterialId)
    : materials;

  if (targetMaterials.length === 0) {
    return {
      chunks: [],
      totalChunks: 0,
      relevanceScores: [],
      contextText: '',
      materialNames: [],
    };
  }

  const allChunks: MaterialChunk[] = [];
  for (const material of targetMaterials) {
    allChunks.push(...chunkMaterial(material));
  }

  if (allChunks.length === 0) {
    return {
      chunks: [],
      totalChunks: 0,
      relevanceScores: [],
      contextText: '',
      materialNames: targetMaterials.map(m => m.fileName),
    };
  }

  // Score chunks against query
  const scores = computeTFIDF(query, allChunks);

  // Rank and filter
  const ranked = scores
    .map((score, idx) => ({ score, idx }))
    .filter(item => item.score >= ragConfig.minRelevance)
    .sort((a, b) => b.score - a.score)
    .slice(0, ragConfig.topK);

  const retrievedChunks = ranked.map(r => allChunks[r.idx]);
  const relevanceScores = ranked.map(r => r.score);

  // Build context string with token budget
  const contextText = buildContextString(retrievedChunks, ragConfig);

  const materialNames = [...new Set(retrievedChunks.map(c => c.materialName))];

  return {
    chunks: retrievedChunks,
    totalChunks: allChunks.length,
    relevanceScores,
    contextText,
    materialNames,
  };
}

/**
 * Build a formatted context string from retrieved chunks for prompt injection.
 */
function buildContextString(chunks: MaterialChunk[], config: RAGConfig): string {
  if (chunks.length === 0) return '';

  let context = '=== RELEVANT MATERIAL CONTENT (Use ONLY this to answer) ===\n\n';
  let estimatedTokens = 0;
  const maxTokens = config.maxContextTokens;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkHeader = chunk.title 
      ? `[Source: ${chunk.materialName} | Section: ${chunk.title}]`
      : `[Source: ${chunk.materialName} | Chunk ${i + 1}]`;
    
    const chunkText = `${chunkHeader}\n${chunk.text}\n`;
    const chunkTokenEstimate = chunkText.split(/\s+/).length * 1.3; // rough token estimate

    if (estimatedTokens + chunkTokenEstimate > maxTokens) break;

    context += chunkText + '\n---\n\n';
    estimatedTokens += chunkTokenEstimate;
  }

  context += '=== END OF MATERIAL CONTENT ===';
  return context;
}

// ============================================================
// Full Material Context (for complete analysis)
// ============================================================

/**
 * Get the full material content formatted for AI analysis.
 * Used when the user wants a complete material analysis (not chunked retrieval).
 */
export function getFullMaterialContext(
  material: UploadedMaterial,
  maxChars: number = 15000
): string {
  const content = material.content || '';
  const truncated = content.length > maxChars 
    ? content.slice(0, maxChars) + '\n\n[... Content truncated for analysis ...]'
    : content;

  let context = `=== COMPLETE MATERIAL: ${material.fileName} ===\n`;
  context += `File Type: ${material.fileType}\n`;
  context += `Word Count: ${material.wordCount || content.split(/\s+/).length}\n`;
  
  if (material.topics && material.topics.length > 0) {
    context += `Identified Topics: ${material.topics.join(', ')}\n`;
  }
  if (material.nlpKeywords && material.nlpKeywords.length > 0) {
    context += `Keywords: ${material.nlpKeywords.join(', ')}\n`;
  }
  
  context += `\n${truncated}\n`;
  context += `=== END OF MATERIAL ===`;
  
  return context;
}

// ============================================================
// Embedding-Based Retrieval (Production Upgrade)
// ============================================================

/**
 * PRODUCTION UPGRADE: Replace TF-IDF with OpenAI embeddings.
 * 
 * Uncomment and use after configuring OpenAI:
 * 
 * ```typescript
 * import OpenAI from 'openai';
 * 
 * const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
 * 
 * export async function generateEmbedding(text: string): Promise<number[]> {
 *   const response = await openai.embeddings.create({
 *     model: 'text-embedding-3-small',
 *     input: text,
 *   });
 *   return response.data[0].embedding;
 * }
 * 
 * export function cosineSimilarity(a: number[], b: number[]): number {
 *   let dot = 0, normA = 0, normB = 0;
 *   for (let i = 0; i < a.length; i++) {
 *     dot += a[i] * b[i];
 *     normA += a[i] * a[i];
 *     normB += b[i] * b[i];
 *   }
 *   return dot / (Math.sqrt(normA) * Math.sqrt(normB));
 * }
 * 
 * export async function retrieveWithEmbeddings(
 *   query: string,
 *   chunks: MaterialChunk[],
 *   topK: number = 5
 * ): Promise<MaterialChunk[]> {
 *   const queryEmbedding = await generateEmbedding(query);
 *   const chunkEmbeddings = await Promise.all(
 *     chunks.map(c => generateEmbedding(c.text))
 *   );
 *   
 *   const scores = chunkEmbeddings.map(e => cosineSimilarity(queryEmbedding, e));
 *   const ranked = scores
 *     .map((score, idx) => ({ score, idx }))
 *     .sort((a, b) => b.score - a.score)
 *     .slice(0, topK);
 *   
 *   return ranked.map(r => chunks[r.idx]);
 * }
 * ```
 */
