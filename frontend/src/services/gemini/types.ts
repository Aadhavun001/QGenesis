/**
 * OpenAI Service Types
 * ====================
 * 
 * Type definitions for OpenAI integration including RAG types.
 */

// ============================================================
// Question Generation Types
// ============================================================

export interface QuestionGenerationConfig {
  topics: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  questionType: 'mcq' | 'short' | 'long' | 'descriptive';
  bloomsLevel: BloomsLevel;
  marks: number;
  numberOfQuestions: number;
  examType?: string;
  materialContent?: string;
  
  // RAG-enhanced: pass full material for chunk retrieval
  materialContext?: string;
  /** When set, Gemini must NOT repeat or rephrase these; every new question must be substantively different. */
  previousQuestions?: Array<{ content: string; topic?: string }>;
  
  // Advanced options
  language?: string;
  includeExplanations?: boolean;
  alignWithCurriculum?: string;
}

export type BloomsLevel = 
  | 'Remember' 
  | 'Understand' 
  | 'Apply' 
  | 'Analyze' 
  | 'Evaluate' 
  | 'Create'
  | 'Mixed';

export interface GeneratedQuestion {
  id: string;
  content: string;
  answer: string;
  explanation?: string;
  type: 'mcq' | 'short' | 'long' | 'descriptive';
  difficulty: 'easy' | 'medium' | 'hard';
  bloomsLevel: BloomsLevel;
  marks: number;
  topic: string;
  
  // MCQ specific
  options?: string[];
  correctOption?: number;
  
  // Metadata
  keywords?: string[];
  estimatedTime?: number; // in minutes
  rubric?: string;
}

export interface QuestionGenerationResult {
  questions: GeneratedQuestion[];
  metadata: {
    generatedAt: string;
    model: string;
    tokensUsed: number;
    processingTime: number;
  };
}

// ============================================================
// Material Analysis Types
// ============================================================

export interface MaterialAnalysisConfig {
  content: string;
  fileName: string;
  fileType: string;
  
  // Analysis options
  extractTopics?: boolean;
  extractKeywords?: boolean;
  generateSummary?: boolean;
  identifyDifficulty?: boolean;
  suggestQuestionTypes?: boolean;
}

export interface ExtractedTopic {
  name: string;
  relevance: number; // 0-1
  subtopics: string[];
  suggestedQuestionTypes: ('mcq' | 'short' | 'long' | 'descriptive')[];
  suggestedDifficulty: 'easy' | 'medium' | 'hard';
  suggestedBloomsLevels: BloomsLevel[];
}

export interface MaterialAnalysisResult {
  topics: ExtractedTopic[];
  summary: string;
  keywords: string[];
  subjectArea: string;
  estimatedReadingLevel: string;
  suggestedQuestionCount: {
    easy: number;
    medium: number;
    hard: number;
  };
  contentStructure: {
    hasDefinitions: boolean;
    hasExamples: boolean;
    hasFormulas: boolean;
    hasDiagrams: boolean;
    hasCodeSnippets: boolean;
  };
  metadata: {
    analyzedAt: string;
    model: string;
    tokensUsed: number;
    processingTime: number;
  };
}

// ============================================================
// Chat Assistant Types
// ============================================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  
  // Optional metadata
  generatedQuestions?: GeneratedQuestion[];
  materialReference?: string;
  action?: ChatAction;
}

export type ChatAction = 
  | 'greeting'
  | 'question_generation'
  | 'question_modification'
  | 'question_regeneration'
  | 'material_analysis'
  | 'help'
  | 'thanks'
  | 'general';

export interface ChatContext {
  messages: ChatMessage[];
  selectedMaterialId?: string;
  selectedMaterialContent?: string;
  generatedQuestions: GeneratedQuestion[];
  
  // RAG-enhanced context
  materialChunksContext?: string;  // Pre-retrieved RAG context
  
  userPreferences?: {
    preferredDifficulty?: 'easy' | 'medium' | 'hard';
    preferredQuestionType?: 'mcq' | 'short' | 'long' | 'descriptive';
    preferredBloomsLevel?: BloomsLevel;
  };
}

export interface ChatResponse {
  message: string;
  action: ChatAction;
  generatedQuestions?: GeneratedQuestion[];
  suggestions?: string[];
  requiresConfirmation?: boolean;
}

// ============================================================
// Voice Input Types
// ============================================================

export interface VoiceTranscription {
  text: string;
  confidence: number;
  language: string;
  duration: number;
}

export interface VoiceInputConfig {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

// ============================================================
// API Response Types
// ============================================================

export interface OpenAIUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    isRetryable: boolean;
  };
  usage?: OpenAIUsage;
}
