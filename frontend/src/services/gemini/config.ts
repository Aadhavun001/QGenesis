/**
 * Google Gemini AI Configuration
 * ===============================
 * 
 * Configure your Google Gemini API settings here after exporting the project.
 * 
 * ACTIVATION STEPS:
 * 1. npm install @google/generative-ai
 * 2. Set VITE_GEMINI_API_KEY in .env file
 * 3. Set AI_FEATURES.useGemini = true
 * 4. Everything works automatically
 * 
 * FREE TIER: Google AI Studio provides a generous free tier.
 * Get your API key at: https://aistudio.google.com/apikey
 */

// ============================================================
// STEP 1: Install Gemini SDK
// Run: npm install @google/generative-ai
// ============================================================

// ============================================================
// STEP 2: Uncomment and configure the Gemini client
// ============================================================

import { GoogleGenerativeAI } from '@google/generative-ai';

// Client-side with Vite
export const genAI = new GoogleGenerativeAI(
  import.meta.env.VITE_GEMINI_API_KEY || ''
);

// Get model instance
export function getGeminiModel(modelName: string = GEMINI_CONFIG.models.chatAssistant) {
  return genAI.getGenerativeModel({ model: modelName });
}

// ============================================================
// Configuration Constants
// ============================================================

export const GEMINI_CONFIG = {
  models: {
    // Faster model for question generation
    questionGeneration: 'gemini-2.5-flash',
    // Conversational AI assistant – use current Flash model (1.5-flash retired)
    chatAssistant: 'gemini-2.5-flash',
    // Cost-effective for simple tasks
    simple: 'gemini-2.5-flash',
    // For generating embeddings (semantic search upgrade)
    embeddings: 'text-embedding-004',
  },
  
  // Lower temperature = more accurate, material-grounded outputs (less creative drift)
  temperature: {
    questionGeneration: 0.3,
    materialAnalysis: 0.3,
    chatAssistant: 0.55,
  },
  
  maxTokens: {
    questionGeneration: 4500,
    materialAnalysis: 4000,
    chatResponse: 4096,
  },
  
  // RAG Configuration
  rag: {
    topK: 8,
    minRelevance: 0.05,
    maxContextTokens: 12000,
    includeMetadata: true,
  },
  
  rateLimiting: {
    maxRequestsPerMinute: 60,    // Free tier: 15 RPM for Pro, 30 RPM for Flash
    maxTokensPerMinute: 1000000, // Gemini is very generous with tokens
  },
};

// Legacy alias for backward compatibility
export const OPENAI_CONFIG = GEMINI_CONFIG;

// ============================================================
// Feature Flags
// ============================================================

export const AI_FEATURES = {
  // ⚡ Set to true after configuring Gemini API key
  useGemini: true,
  
  // Legacy alias
  get useOpenAI() { return this.useGemini; },
  
  // Feature toggles
  enableMaterialAnalysis: true,
  enableQuestionGeneration: true,
  enableChatAssistant: true,
  enableVoiceInput: true,
  enableRAG: true,
  
  // Advanced features
  enableSemanticSearch: false,
  enableContentModeration: false,
  enableAutoTagging: false,
  enableStreaming: false,
};

// ============================================================
// Prompt Templates (Legacy - see prompts.ts for RAG prompts)
// ============================================================

export const SYSTEM_PROMPTS = {
  questionGenerator: `You are an expert educational question generator for university examinations. Your outputs must satisfy strict accuracy and material-adherence requirements.

## ACCURACY PROTOCOL (follow every time):
1. READ the entire provided material first. Identify sections that cover the requested topic(s).
2. FOR EACH QUESTION: Locate the exact passage(s) in the material that will support both the question and the answer. Do not invent; extract.
3. GENERATE the question so it is directly answerable from that passage. The answer must be a direct quote or close paraphrase of the material.
4. VALIDATE: Before including any question, confirm the answer appears in the material. If you cannot find the answer in the material, skip that question or choose a different passage.

## RULES:
- Generate questions ONLY from the provided material. Every question and every answer must be grounded in the material.
- Align with Bloom's Taxonomy and the requested difficulty.
- For MCQs: exactly 4 options; one correct answer from the material; distractors plausible but wrong (prefer other phrases from the material that are incorrect in context).
- Be clear, unambiguous, and academically rigorous. No vague or generic questions.
- Respond in valid JSON matching the specified schema.`,

  materialAnalyzer: `You are an expert content analyst for educational materials. Your analysis must be based solely on the actual content provided.

Your role is to:
- Extract key topics and concepts from the content (do not invent topics)
- Identify learning objectives implied by the material
- Categorize by subject area and difficulty from context
- Suggest question types suitable for each topic
- Provide a structured summary
- Base ALL analysis on the actual content; never fabricate

Always respond in valid JSON format matching the specified schema.`,

  chatAssistant: `You are QGenesis AI, a friendly and knowledgeable educational assistant for teachers and staff. Speak naturally and clearly, like a helpful colleague.

## ACCURACY (non-negotiable):
- Base every answer and every generated question ONLY on the selected/uploaded material content.
- Before answering or generating: mentally locate the relevant part of the material. Your response must be grounded in that content only.
- If something is not in the material, say so clearly. Do not use general knowledge or fabricate.

Your role is to: answer doubts and explain concepts from the material; generate and refine questions from the material; modify questions when asked; explain Bloom's Taxonomy when needed. Be conversational, warm, and proactive. Answer fully and clearly; when generating questions, maintain academic rigor and material-only accuracy.`,
};

// ============================================================
// Validation & Error Handling
// ============================================================

export function isGeminiConfigured(): boolean {
  return AI_FEATURES.useGemini && !!import.meta.env.VITE_GEMINI_API_KEY;
}

// Legacy alias
export const isOpenAIConfigured = isGeminiConfigured;

export class GeminiError extends Error {
  constructor(
    message: string,
    public code: string,
    public isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'GeminiError';
  }
}

// Legacy alias
export const OpenAIError = GeminiError;

export function handleGeminiError(error: unknown): never {
  if (error instanceof Error) {
    if (error.message.includes('RATE_LIMIT') || error.message.includes('429')) {
      throw new GeminiError(
        'Rate limit exceeded. Please wait a moment and try again.',
        'RATE_LIMIT',
        true
      );
    }
    if (error.message.includes('API_KEY') || error.message.includes('invalid')) {
      throw new GeminiError(
        'Invalid Gemini API key. Please check your configuration.',
        'INVALID_KEY',
        false
      );
    }
    if (error.message.includes('too long') || error.message.includes('token')) {
      throw new GeminiError(
        'Content too long. Please reduce the amount of material.',
        'CONTEXT_LENGTH',
        false
      );
    }
    throw new GeminiError(error.message, 'UNKNOWN', true);
  }
  throw new GeminiError('An unknown error occurred', 'UNKNOWN', true);
}

// Legacy alias
export const handleOpenAIError = handleGeminiError;
