/**
 * Material Analyzer Service
 * =========================
 * 
 * Analyzes uploaded educational materials using Google Gemini API.
 * Extracts topics, keywords, and suggests question types.
 * 
 * INTEGRATION STEPS:
 * 1. Install Gemini SDK: npm install @google/generative-ai
 * 2. Uncomment Gemini client import
 * 3. Set VITE_GEMINI_API_KEY in .env
 */

import { 
  MaterialAnalysisConfig, 
  MaterialAnalysisResult,
  ExtractedTopic,
  BloomsLevel 
} from './types';
import { 
  GEMINI_CONFIG, 
  SYSTEM_PROMPTS, 
  AI_FEATURES,
  handleGeminiError 
} from './config';

// ============================================================
// STEP 1: Uncomment after installing Gemini SDK
// Run: npm install @google/generative-ai
// ============================================================
/*
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

function getModel(modelName: string) {
  return genAI.getGenerativeModel({ model: modelName });
}
*/

// ============================================================
// Prompt Builder
// ============================================================

function buildMaterialAnalysisPrompt(config: MaterialAnalysisConfig): string {
  return `Analyze the following educational material and extract structured information:

**File Information:**
- File Name: ${config.fileName}
- File Type: ${config.fileType}

**Content to Analyze:**
${config.content.slice(0, 15000)} ${config.content.length > 15000 ? '... [Content truncated for analysis]' : ''}

**Analysis Requirements:**
1. Extract all major topics and subtopics
2. Identify key terms and keywords
3. Determine the subject area and academic level
4. Suggest appropriate question types for each topic
5. Recommend difficulty distribution
6. Identify content characteristics (definitions, examples, formulas, etc.)

**Response Format (JSON):**
{
  "topics": [
    {
      "name": "Topic Name",
      "relevance": 0.9,
      "subtopics": ["Subtopic 1", "Subtopic 2"],
      "suggestedQuestionTypes": ["mcq", "short"],
      "suggestedDifficulty": "medium",
      "suggestedBloomsLevels": ["Understand", "Apply"]
    }
  ],
  "summary": "A comprehensive summary of the material...",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "subjectArea": "Computer Science",
  "estimatedReadingLevel": "Undergraduate",
  "suggestedQuestionCount": {
    "easy": 10,
    "medium": 15,
    "hard": 5
  },
  "contentStructure": {
    "hasDefinitions": true,
    "hasExamples": true,
    "hasFormulas": false,
    "hasDiagrams": false,
    "hasCodeSnippets": true
  }
}`;
}

// ============================================================
// Material Analyzer Implementation
// ============================================================

/**
 * Analyze educational material using Gemini API
 */
export async function analyzeMaterialWithAI(
  config: MaterialAnalysisConfig
): Promise<MaterialAnalysisResult> {
  const startTime = Date.now();

  // ============================================================
  // PRODUCTION IMPLEMENTATION (Uncomment after Gemini setup)
  // ============================================================
  /*
  if (AI_FEATURES.useGemini) {
    try {
      const prompt = buildMaterialAnalysisPrompt(config);
      const model = getModel(GEMINI_CONFIG.models.questionGeneration);
      
      const result = await model.generateContent({
        contents: [
          { role: 'user', parts: [{ text: SYSTEM_PROMPTS.materialAnalyzer + '\n\n' + prompt }] }
        ],
        generationConfig: {
          temperature: GEMINI_CONFIG.temperature.materialAnalysis,
          maxOutputTokens: GEMINI_CONFIG.maxTokens.materialAnalysis,
          responseMimeType: 'application/json',
        },
      });

      const content = result.response.text();
      if (!content) {
        throw new Error('No response from Gemini');
      }

      const parsed = JSON.parse(content);
      
      return {
        ...parsed,
        metadata: {
          analyzedAt: new Date().toISOString(),
          model: GEMINI_CONFIG.models.questionGeneration,
          tokensUsed: result.response.usageMetadata?.totalTokenCount || 0,
          processingTime: Date.now() - startTime,
        },
      };
    } catch (error) {
      handleGeminiError(error);
    }
  }
  */

  // ============================================================
  // MOCK IMPLEMENTATION (Used before Gemini is configured)
  // ============================================================
  
  await new Promise(resolve => setTimeout(resolve, 2000));

  const topics = extractTopicsFromContent(config.content);
  const keywords = extractKeywords(config.content);
  const summary = generateSummary(config.content, config.fileName);

  return {
    topics,
    summary,
    keywords,
    subjectArea: detectSubjectArea(config.content),
    estimatedReadingLevel: 'Undergraduate',
    suggestedQuestionCount: {
      easy: Math.ceil(topics.length * 2),
      medium: Math.ceil(topics.length * 3),
      hard: Math.ceil(topics.length * 1),
    },
    contentStructure: {
      hasDefinitions: config.content.toLowerCase().includes('definition') || config.content.includes('is defined as'),
      hasExamples: config.content.toLowerCase().includes('example') || config.content.includes('for instance'),
      hasFormulas: /[=+\-*/^]/.test(config.content) && /\d/.test(config.content),
      hasDiagrams: config.content.toLowerCase().includes('figure') || config.content.toLowerCase().includes('diagram'),
      hasCodeSnippets: config.content.includes('```') || config.content.includes('function') || config.content.includes('class'),
    },
    metadata: {
      analyzedAt: new Date().toISOString(),
      model: 'mock-analyzer',
      tokensUsed: 0,
      processingTime: Date.now() - startTime,
    },
  };
}

// ============================================================
// Helper Functions for Mock Implementation
// ============================================================

function extractTopicsFromContent(content: string): ExtractedTopic[] {
  const lines = content.split('\n');
  const topics: ExtractedTopic[] = [];
  const seenTopics = new Set<string>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length > 100 || trimmed.length < 3) continue;
    
    const isHeading = 
      /^#{1,6}\s/.test(trimmed) ||
      /^[A-Z][A-Za-z\s]+:$/.test(trimmed) ||
      /^\d+\.\s*[A-Z]/.test(trimmed) ||
      (trimmed === trimmed.toUpperCase() && trimmed.length < 50);

    if (isHeading) {
      const topicName = trimmed
        .replace(/^#{1,6}\s*/, '')
        .replace(/^[\d.]+\s*/, '')
        .replace(/:$/, '')
        .trim();
      
      if (topicName.length > 2 && !seenTopics.has(topicName.toLowerCase())) {
        seenTopics.add(topicName.toLowerCase());
        topics.push({
          name: topicName,
          relevance: 0.8 + Math.random() * 0.2,
          subtopics: [],
          suggestedQuestionTypes: ['mcq', 'short'],
          suggestedDifficulty: 'medium',
          suggestedBloomsLevels: ['Understand', 'Apply'] as BloomsLevel[],
        });
      }
    }
  }

  if (topics.length === 0) {
    return [
      {
        name: 'Introduction',
        relevance: 0.9,
        subtopics: ['Overview', 'Background'],
        suggestedQuestionTypes: ['mcq', 'short'],
        suggestedDifficulty: 'easy',
        suggestedBloomsLevels: ['Remember', 'Understand'],
      },
      {
        name: 'Core Concepts',
        relevance: 1.0,
        subtopics: ['Definitions', 'Principles'],
        suggestedQuestionTypes: ['mcq', 'short', 'long'],
        suggestedDifficulty: 'medium',
        suggestedBloomsLevels: ['Understand', 'Apply'],
      },
      {
        name: 'Advanced Topics',
        relevance: 0.7,
        subtopics: ['Applications', 'Analysis'],
        suggestedQuestionTypes: ['long', 'descriptive'],
        suggestedDifficulty: 'hard',
        suggestedBloomsLevels: ['Analyze', 'Evaluate'],
      },
    ];
  }

  return topics.slice(0, 10);
}

function extractKeywords(content: string): string[] {
  const words = content.toLowerCase()
    .replace(/[^\\w\\s]/g, ' ')
    .split(/\\s+/)
    .filter(word => word.length > 4);
  
  const wordCount = new Map<string, number>();
  for (const word of words) {
    wordCount.set(word, (wordCount.get(word) || 0) + 1);
  }
  
  const sortedWords = [...wordCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word);
  
  const stopWords = ['about', 'after', 'before', 'being', 'between', 'could', 'during', 'every', 'first', 'their', 'there', 'these', 'through', 'where', 'which', 'while', 'would'];
  
  return sortedWords.filter(word => !stopWords.includes(word)).slice(0, 10);
}

function generateSummary(content: string, fileName: string): string {
  const wordCount = content.split(/\\s+/).length;
  const firstParagraph = content.split('\n\n')[0]?.slice(0, 300) || '';
  
  return `This document "${fileName}" contains approximately ${wordCount} words covering various topics. ${firstParagraph}...`;
}

function detectSubjectArea(content: string): string {
  const contentLower = content.toLowerCase();
  
  const subjects: Record<string, string[]> = {
    'Computer Science': ['algorithm', 'programming', 'database', 'software', 'code', 'function', 'variable', 'computer'],
    'Mathematics': ['equation', 'theorem', 'proof', 'calculate', 'formula', 'integral', 'derivative', 'algebra'],
    'Physics': ['force', 'energy', 'momentum', 'velocity', 'acceleration', 'gravity', 'quantum', 'electron'],
    'Chemistry': ['molecule', 'atom', 'chemical', 'reaction', 'compound', 'element', 'bond', 'solution'],
    'Biology': ['cell', 'organism', 'gene', 'protein', 'dna', 'evolution', 'species', 'tissue'],
    'Business': ['management', 'marketing', 'finance', 'strategy', 'organization', 'revenue', 'customer'],
    'Literature': ['novel', 'poetry', 'author', 'character', 'narrative', 'theme', 'literary'],
  };

  let maxScore = 0;
  let detectedSubject = 'General Studies';

  for (const [subject, keywords] of Object.entries(subjects)) {
    const score = keywords.filter(kw => contentLower.includes(kw)).length;
    if (score > maxScore) {
      maxScore = score;
      detectedSubject = subject;
    }
  }

  return detectedSubject;
}
