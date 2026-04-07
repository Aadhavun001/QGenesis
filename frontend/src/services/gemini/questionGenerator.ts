/**
 * Question Generator Service
 * ==========================
 * 
 * Generates questions using Google Gemini API based on configuration and materials.
 * 
 * INTEGRATION STEPS:
 * 1. Uncomment Gemini client import
 * 2. Replace mock implementation with actual API calls
 * 3. Configure prompts for your specific needs
 */

import { 
  QuestionGenerationConfig, 
  GeneratedQuestion, 
  QuestionGenerationResult,
  BloomsLevel 
} from './types';
import { 
  GEMINI_CONFIG, 
  SYSTEM_PROMPTS, 
  AI_FEATURES,
  handleGeminiError,
  GeminiError
} from './config';
import { QUESTION_GENERATION_PROMPT } from './prompts';

// ============================================================
// Gemini client (used when AI_FEATURES.useGemini is true)
// ============================================================
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

function getModel(modelName: string) {
  return genAI.getGenerativeModel({ model: modelName });
}

function sanitizePlainAnswer(text: unknown): string {
  const s = typeof text === 'string' ? text : '';
  // Remove markdown emphasis so UI looks like natural chat (no **...** or *...*).
  return s
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function sanitizeNaturalAnswer(text: unknown): string {
  const s = sanitizePlainAnswer(text);
  if (!s) return '';
  // Remove common section-title style starts to keep answer natural/conversational.
  return s
    .replace(/^\s*(introduction|overview|main discussion|analysis|comparison|theoretical framework|practical implications|conclusion|comprehensive analysis)\s*:\s*/i, '')
    .replace(/\n\s*(introduction|overview|main discussion|analysis|comparison|theoretical framework|practical implications|conclusion)\s*:\s*/gi, '\n')
    .replace(/^\s*[-*]\s*/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function isIncompleteAnswer(answer: string, questionType: string, minWords: number): boolean {
  const txt = (answer || '').trim();
  if (!txt) return true;
  const wc = txt.split(/\s+/).filter(Boolean).length;
  const minExpected = questionType === 'mcq' ? Math.max(8, Math.floor(minWords * 0.5)) : Math.max(20, Math.floor(minWords * 0.55));
  if (wc < minExpected) return true;
  // Often model truncates at separators when output is cut.
  return /[,;:-]\s*$/.test(txt);
}

function extractLikelyJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return raw.slice(firstBrace, lastBrace + 1).trim();
  }
  return raw.trim();
}

function normalizeJsonText(jsonText: string): string {
  // Common recovery cleanup for model outputs.
  return jsonText
    .replace(/\u201c|\u201d/g, '"')
    .replace(/\u2018|\u2019/g, "'")
    .replace(/,\s*([}\]])/g, '$1')
    .trim();
}

async function repairJsonWithModel(raw: string): Promise<string> {
  const repairModel = getModel(GEMINI_CONFIG.models.simple);
  const repairPrompt = `Convert the following content to VALID minified JSON only.
- Do not add markdown fences.
- Do not add explanation.
- Preserve the same schema/fields.

CONTENT:
${raw.slice(0, 20000)}`;

  const repaired = await repairModel.generateContent({
    contents: [{ role: 'user', parts: [{ text: repairPrompt }] }],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
    },
  });
  return extractLikelyJson(repaired.response.text() || '');
}

async function parseModelJson<T>(raw: string): Promise<T> {
  const initial = normalizeJsonText(extractLikelyJson(raw));
  try {
    return JSON.parse(initial) as T;
  } catch {
    try {
      const repaired = normalizeJsonText(await repairJsonWithModel(initial));
      return JSON.parse(repaired) as T;
    } catch (repairError) {
      const msg = repairError instanceof Error ? repairError.message : 'Invalid JSON from model';
      // Mark parsing failures as retryable so generation loop can auto-retry
      // instead of surfacing "Unterminated string in JSON" to UI.
      throw new GeminiError(`Model returned malformed/partial JSON: ${msg}`, 'INCOMPLETE_OUTPUT', true);
    }
  }
}

function isTruncatedQuestionText(text: string): boolean {
  const t = (text || '').trim();
  if (!t) return true;
  if (t.split(/\s+/).length < 6) return true;
  return /[,;:-]\s*$/.test(t);
}

function isIncompleteGeneratedQuestion(
  q: { content?: string; answer?: string; topic?: string; type?: string; options?: string[]; correctOption?: number },
  expectedType: 'mcq' | 'short' | 'long' | 'descriptive'
): boolean {
  const content = sanitizePlainAnswer(q.content || '');
  const answer = sanitizeNaturalAnswer(q.answer || '');
  const topic = sanitizePlainAnswer(q.topic || '');
  if (!content || !answer || !topic) return true;
  if (isTruncatedQuestionText(content)) return true;
  if ((answer || '').split(/\s+/).filter(Boolean).length < (expectedType === 'mcq' ? 6 : 18)) return true;
  if (/[,;:-]\s*$/.test(answer)) return true;
  if (expectedType === 'mcq') {
    const options = normalizeOptions(q.options);
    const correct = Number.isInteger(q.correctOption) ? Number(q.correctOption) : -1;
    if (options.length !== 4) return true;
    if (correct < 0 || correct > 3) return true;
  }
  return false;
}

function normalizeOptions(options: unknown): string[] {
  if (!Array.isArray(options)) return [];
  return options
    .map((o) => sanitizePlainAnswer(typeof o === 'string' ? o : ''))
    .filter((o) => o.length > 0)
    .slice(0, 4);
}

function buildFallbackMcqOptions(topic: string): string[] {
  return [
    `Only statement A about ${topic} is correct.`,
    `Only statement B about ${topic} is correct.`,
    `Both A and B are correct.`,
    `Neither A nor B is correct.`,
  ];
}

async function repairMcqQuestionWithModel(
  rawQuestion: any,
  config: QuestionGenerationConfig
): Promise<any | null> {
  const model = getModel(GEMINI_CONFIG.models.simple);
  const prompt = `Rewrite this into a valid, complete MCQ JSON object.
Return JSON only with this exact schema:
{"content":"...","answer":"...","type":"mcq","difficulty":"${config.difficulty}","bloomsLevel":"${config.bloomsLevel === 'Mixed' ? 'Understand' : config.bloomsLevel}","marks":${config.marks},"topic":"...","options":["...","...","...","..."],"correctOption":0}

Rules:
- content must be a complete question sentence and end with "?".
- options must be exactly 4 distinct, plausible choices.
- correctOption must be an integer 0-3.
- answer must identify the correct option and briefly justify from the material context.
- No markdown.

INPUT OBJECT:
${JSON.stringify(rawQuestion).slice(0, 8000)}

MATERIAL CONTEXT:
${(config.materialContent || config.materialContext || '').slice(0, 30000)}`;

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 1400,
      responseMimeType: 'application/json',
    },
  });
  const txt = result.response.text();
  if (!txt) return null;
  try {
    return await parseModelJson<any>(txt);
  } catch {
    return null;
  }
}

// ============================================================
// Prompt Builder
// ============================================================

function buildQuestionGenerationPrompt(config: QuestionGenerationConfig): string {
  const bloomsDescriptions: Record<BloomsLevel, string> = {
    'Remember': 'recall facts, terms, basic concepts, or answers',
    'Understand': 'demonstrate understanding of facts and ideas by organizing, comparing, translating',
    'Apply': 'use acquired knowledge to solve problems in new situations',
    'Analyze': 'examine and break information into parts, identify motives or causes',
    'Evaluate': 'present and defend opinions by making judgments about information',
    'Create': 'compile information together in a different way, propose alternative solutions',
    'Mixed': 'mix multiple Bloom levels across questions to cover a wider range of cognitive skills',
  };

  const getAnswerWordTarget = (): { minWords: number; maxWords: number } => {
    const base =
      config.questionType === 'short' ? { easy: [80, 140], medium: [140, 230], hard: [230, 320] } :
      config.questionType === 'long' ? { easy: [220, 340], medium: [340, 520], hard: [520, 850] } :
      config.questionType === 'descriptive' ? { easy: [240, 360], medium: [360, 560], hard: [560, 900] } :
      { easy: [12, 24], medium: [20, 36], hard: [28, 50] }; // mcq

    const [min0, max0] = (base as any)[config.difficulty] as [number, number];
    const marks = Math.max(1, config.marks || 1);
    const scale = Math.min(1.8, Math.max(0.9, marks / 10));
    return {
      minWords: Math.round(min0 * scale),
      maxWords: Math.round(max0 * scale),
    };
  };

  const { minWords, maxWords } = getAnswerWordTarget();

  return `${QUESTION_GENERATION_PROMPT}

---

**TASK**: Generate exactly ${config.numberOfQuestions} ${config.questionType.toUpperCase()} questions. Be precise and quick; follow the configuration strictly.

**ACCURACY (mandatory):**
- Use the exact topics requested: ${config.topics.join(', ')}. For each topic, find the corresponding section(s) in the material and generate only from those sections.
- Every question must be answerable from the material; every answer must be a direct quote or close paraphrase of the material. If you cannot point to the exact sentence(s) that give the answer, do not generate that question.
- Analyze the full material and any chunk excerpts below. Prefer passages that clearly cover the requested topics. Do not invent or assume anything not in the material.

**Configuration (follow exactly):**
- Topics: ${config.topics.join(', ')}
- Difficulty: ${config.difficulty}
- Bloom's Taxonomy Level: ${config.bloomsLevel} (${bloomsDescriptions[config.bloomsLevel]})
- Marks per question: ${config.marks}
- Question Type: ${config.questionType}
- Number of questions: ${config.numberOfQuestions}
${config.examType ? `- Exam Type: ${config.examType}` : ''}

**Answer length & format (mandatory):**
- The answer field must be plain text only (no markdown emphasis like **bold** or *italic*).
- For this configuration, the answer must be approximately ${minWords}-${maxWords} words.
- For questionType ${config.questionType}, include suitable structure:
  - long/descriptive: introduction, multiple main paragraphs, conclusion
  - short: 2-5 short paragraphs
  - mcq: short answer format "Correct option: <option text>. Why: <brief reason>"

${config.questionType === 'mcq' ? `**MCQ STRICT RULES (mandatory):**
- Each question must be a complete sentence ending with "?".
- Provide exactly 4 options in "options".
- Set "correctOption" as 0, 1, 2, or 3 only.
- Options must be distinct and plausible; only one clearly correct.
- Keep "answer" concise and explicitly mention the correct option.` : ''}

${config.bloomsLevel === 'Mixed' ? `**Bloom's Mixed Instruction (mandatory):**
- When generating a set with Bloom's level = Mixed, you must assign each generated question a specific bloomsLevel value from this list only: Remember, Understand, Apply, Analyze, Evaluate, Create.
- Do not output "Mixed" inside each question's "bloomsLevel" field.
- Ensure variety across questions (cover multiple levels when possible).` : ''}

**Material Content (analyze in full; base every question and answer ONLY on this):**
${config.materialContent || 'No specific material provided. Generate questions based on the topics only if material is provided elsewhere.'}
${config.materialContext ? `\n\n**Relevant excerpts (use these to locate topic sections):**\n${config.materialContext}` : ''}
${(config.previousQuestions && config.previousQuestions.length > 0) ? `\n\n**DO NOT REPEAT OR REPHRASE THESE—every new question must be substantively different (different concept, wording, or part of material):**\n${config.previousQuestions.map((q, i) => `${i + 1}. ${q.content.slice(0, 300)}${q.content.length > 300 ? '...' : ''}`).join('\n')}` : ''}

**Response Format (JSON):**
{
  "questions": [
    {
      "content": "The question text",
      "answer": "The complete answer/explanation",
      "type": "${config.questionType}",
      "difficulty": "${config.difficulty}",
      "bloomsLevel": "${config.bloomsLevel === 'Mixed' ? 'Understand' : config.bloomsLevel}",
      "marks": ${config.marks},
      "topic": "Specific topic this question covers",
      ${config.questionType === 'mcq' ? `"options": ["Option A", "Option B", "Option C", "Option D"],
      "correctOption": 0,` : ''}
      "keywords": ["keyword1", "keyword2"],
      "estimatedTime": 5
    }
  ]
}`;
}

// ============================================================
// Question Generator Implementation
// ============================================================

/**
 * Generate questions using Gemini API
 * 
 * @param config - Question generation configuration
 * @returns Promise<QuestionGenerationResult>
 */
export async function generateQuestionsWithAI(
  config: QuestionGenerationConfig
): Promise<QuestionGenerationResult> {
  const startTime = Date.now();

  // ============================================================
  // PRODUCTION: Gemini when configured
  // ============================================================
  if (AI_FEATURES.useGemini) {
    const expectedCount = config.numberOfQuestions ?? 0;
    const maxRetries = 3;
    let lastError: unknown = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const prompt = buildQuestionGenerationPrompt(config);
        const model = getModel(GEMINI_CONFIG.models.questionGeneration);

        const isSingleQuestion = expectedCount <= 1;
        // MCQ outputs are larger (options + stricter structure). Scale maxOutputTokens
        // so Gemini can return the full set without truncating JSON.
        const mcqExtra = config.questionType === 'mcq' ? 650 : 380;
        const mcqMultiplier = config.questionType === 'mcq' ? 1.35 : 1.0;
        const scaledMaxOutputTokens = isSingleQuestion
          ? (config.questionType === 'mcq' ? 2500 : 1800)
          : Math.min(16000, Math.round(GEMINI_CONFIG.maxTokens.questionGeneration * mcqMultiplier + expectedCount * mcqExtra));
        const result = await model.generateContent({
          contents: [
            { role: 'user', parts: [{ text: SYSTEM_PROMPTS.questionGenerator + '\n\n' + prompt }] }
          ],
          generationConfig: {
            temperature: GEMINI_CONFIG.temperature.questionGeneration,
            maxOutputTokens: scaledMaxOutputTokens,
            responseMimeType: 'application/json',
            topP: 0.9,
            topK: 40,
          },
        });

        const content = result.response.text();
        if (!content) throw new Error('No response from Gemini');
        const parsed = await parseModelJson<{ questions?: any[] }>(content);
        const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];
        // Gemini sometimes returns truncated/partial JSON. If we got fewer than requested,
        // force a retry so the UI always receives exactly N questions.
        if (expectedCount > 1 && rawQuestions.length < expectedCount) {
          throw new GeminiError(
            `Gemini returned ${rawQuestions.length} questions, expected ${expectedCount}`,
            'INCOMPLETE_OUTPUT',
            true
          );
        }
        const rawQuestionsLimited = expectedCount > 0 ? rawQuestions.slice(0, expectedCount) : rawQuestions;

        const normalizedQuestions: GeneratedQuestion[] = await Promise.all(
          rawQuestionsLimited.map(async (q: any, index: number) => {
            const resolvedBloomsLevel =
              config.bloomsLevel === 'Mixed'
                ? (sanitizePlainAnswer(q?.bloomsLevel) || 'Understand')
                : config.bloomsLevel;
            let normalized: any = {
              ...q,
              // Enforce requested configuration for all generated items.
              type: config.questionType as string,
              difficulty: config.difficulty as string,
              bloomsLevel: resolvedBloomsLevel as string,
              marks: config.marks as number,
              topic: (q?.topic ?? (config.topics?.[0] || '')) as string,
              content: sanitizePlainAnswer(q?.content),
              answer: sanitizeNaturalAnswer(q?.answer),
              explanation: sanitizeNaturalAnswer(q?.explanation),
            };

            if (config.questionType === 'mcq') {
              let options = normalizeOptions(normalized.options);
              let correctOption = Number.isInteger(normalized.correctOption) ? Number(normalized.correctOption) : -1;
              const invalidMcq =
                isTruncatedQuestionText(normalized.content) ||
                options.length !== 4 ||
                correctOption < 0 ||
                correctOption > 3;

              if (invalidMcq) {
                const repaired = await repairMcqQuestionWithModel(normalized, config);
                if (repaired) {
                  normalized = {
                    ...normalized,
                    ...repaired,
                    content: sanitizePlainAnswer(repaired.content || normalized.content),
                    answer: sanitizeNaturalAnswer(repaired.answer || normalized.answer),
                    explanation: sanitizeNaturalAnswer(repaired.explanation || normalized.explanation),
                  };
                  options = normalizeOptions(repaired.options);
                  correctOption = Number.isInteger(repaired.correctOption) ? Number(repaired.correctOption) : correctOption;
                }
              }

              if (!normalized.content.endsWith('?')) normalized.content = `${normalized.content.replace(/[.!\s]*$/, '')}?`;
              if (options.length !== 4) options = buildFallbackMcqOptions(normalized.topic || config.topics[0] || 'the topic');
              if (correctOption < 0 || correctOption > 3) correctOption = 0;
              if (!normalized.answer) {
                normalized.answer = `Correct option: ${options[correctOption]}. Why: This best matches the material context for the asked concept.`;
              }
              normalized.options = options;
              normalized.correctOption = correctOption;
            }

            const answerLooksLikeMaterialMissing =
              typeof normalized.answer === 'string' &&
              /no material was supplied|no material provided|unable to discuss|cannot\.? based on the material|material was supplied/i.test(normalized.answer);

            if (answerLooksLikeMaterialMissing) {
              throw new GeminiError('Gemini produced a material-missing answer (likely truncated/empty context).', 'MATERIAL_MISSING', true);
            }

            if (isIncompleteGeneratedQuestion(normalized, config.questionType)) {
              throw new GeminiError('Gemini produced incomplete question/answer content.', 'INCOMPLETE_OUTPUT', true);
            }

            return {
              ...normalized,
              id: `q_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
              content: sanitizePlainAnswer(normalized.content),
              answer: sanitizeNaturalAnswer(normalized.answer),
            } as GeneratedQuestion;
          })
        );

        // Final sanity check: if anything still looks incomplete, retry once more.
        if (
          expectedCount > 0 &&
          normalizedQuestions.length !== expectedCount
        ) {
          throw new GeminiError(
            `Final question count mismatch: got ${normalizedQuestions.length}, expected ${expectedCount}`,
            'INCOMPLETE_OUTPUT',
            true
          );
        }

        const questions = normalizedQuestions;
        return {
          questions,
          metadata: {
            generatedAt: new Date().toISOString(),
            model: GEMINI_CONFIG.models.questionGeneration,
            tokensUsed: result.response.usageMetadata?.totalTokenCount || 0,
            processingTime: Date.now() - startTime,
          },
        };
      } catch (error) {
        // Normalize all unknown errors into GeminiError so retryability is preserved.
        let normalizedError: GeminiError;
        if (error instanceof GeminiError) {
          normalizedError = error;
        } else {
          try {
            handleGeminiError(error);
          } catch (mapped) {
            normalizedError = mapped instanceof GeminiError
              ? mapped
              : new GeminiError(
                error instanceof Error ? error.message : 'Unknown generation error',
                'UNKNOWN',
                true
              );
          }
        }

        lastError = normalizedError;
        if (normalizedError.isRetryable && attempt < maxRetries - 1) {
          const waitMs = 800 * Math.pow(2, attempt) + Math.floor(Math.random() * 300);
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }
        throw normalizedError;
      }
    }

    // Fallback path for long/descriptive with multi-question configs:
    // generate one-by-one to avoid huge JSON arrays getting truncated.
    if (
      expectedCount > 1 &&
      (config.questionType === 'long' || config.questionType === 'descriptive')
    ) {
      const singleResults: GeneratedQuestion[] = [];
      for (let i = 0; i < expectedCount; i++) {
        const single = await generateQuestionsWithAI({
          ...config,
          numberOfQuestions: 1,
          previousQuestions: [
            ...(config.previousQuestions || []),
            ...singleResults.map((q) => ({ content: q.content, topic: q.topic })),
          ],
        });
        const q = single.questions[0];
        if (!q) {
          throw new GeminiError('Failed to generate one of the long/descriptive questions.', 'INCOMPLETE_OUTPUT', true);
        }
        singleResults.push({
          ...q,
          id: `q_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`,
          type: config.questionType,
          difficulty: config.difficulty,
          marks: config.marks,
        } as GeneratedQuestion);
      }

      return {
        questions: singleResults,
        metadata: {
          generatedAt: new Date().toISOString(),
          model: `${GEMINI_CONFIG.models.questionGeneration} (single-pass fallback)`,
          tokensUsed: 0,
          processingTime: Date.now() - startTime,
        },
      };
    }

    // Should never hit because handleGeminiError throws, but keep TS happy.
    handleGeminiError(lastError);
  }

  // ============================================================
  // MOCK IMPLEMENTATION (fallback when Gemini not configured)
  // ============================================================
  await new Promise(resolve => setTimeout(resolve, 1500));

  const questions: GeneratedQuestion[] = [];
  const questionPatterns = getQuestionPatterns(config.questionType, config.difficulty);
  
  for (let i = 0; i < config.numberOfQuestions; i++) {
    const topic = config.topics[i % config.topics.length];
    const pattern = questionPatterns[i % questionPatterns.length];
    
    const question: GeneratedQuestion = {
      id: `q_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`,
      content: pattern.replace(/{topic}/g, topic),
      answer: generateMockAnswer(topic, config.questionType, config.difficulty),
      type: config.questionType,
      difficulty: config.difficulty,
      bloomsLevel: config.bloomsLevel,
      marks: config.marks,
      topic,
      keywords: [topic, config.difficulty, config.bloomsLevel],
      estimatedTime: config.questionType === 'mcq' ? 2 : config.questionType === 'short' ? 5 : 15,
    };

    if (config.questionType === 'mcq') {
      question.options = generateMockOptions(topic);
      question.correctOption = 0;
    }

    questions.push(question);
  }

  return {
    questions,
    metadata: {
      generatedAt: new Date().toISOString(),
      model: 'mock-generator',
      tokensUsed: 0,
      processingTime: Date.now() - startTime,
    },
  };
}

// ============================================================
// Helper Functions
// ============================================================

function getQuestionPatterns(
  type: 'mcq' | 'short' | 'long' | 'descriptive',
  difficulty: 'easy' | 'medium' | 'hard'
): string[] {
  const patterns: Record<string, Record<string, string[]>> = {
    mcq: {
      easy: [
        'Which of the following best defines {topic}?',
        'What is the primary purpose of {topic}?',
        '{topic} is characterized by:',
      ],
      medium: [
        'How does {topic} differ from related concepts?',
        'In the context of {topic}, which approach is most effective?',
        'Which factor most influences {topic}?',
      ],
      hard: [
        'Which scenario best illustrates the limitations of {topic}?',
        'In a complex system involving {topic}, what would be the optimal strategy?',
        'What distinguishes advanced implementations of {topic}?',
      ],
    },
    short: {
      easy: [
        'Define {topic} in brief.',
        'List three characteristics of {topic}.',
        'What is the basic concept of {topic}?',
      ],
      medium: [
        'Compare {topic} with an alternative approach.',
        'Explain the significance of {topic} in this context.',
        'What are the key considerations when using {topic}?',
      ],
      hard: [
        'Evaluate the effectiveness of {topic} in complex scenarios.',
        'Propose improvements to {topic} methodology.',
        'Critically analyze the limitations of {topic}.',
      ],
    },
    long: {
      easy: [
        'Describe {topic} with suitable examples.',
        'Explain the concept of {topic} and its applications.',
        'Write a detailed note on {topic}.',
      ],
      medium: [
        'Analyze {topic} from multiple perspectives.',
        'Compare and contrast different approaches to {topic}.',
        'Discuss the advantages and limitations of {topic}.',
      ],
      hard: [
        'Design a comprehensive solution using {topic} principles.',
        'Critically evaluate existing approaches to {topic} and propose innovations.',
        'Synthesize your understanding of {topic} to create a new framework.',
      ],
    },
    descriptive: {
      easy: [
        'Give a detailed overview of {topic}.',
        'Describe the structure and components of {topic}.',
        'Outline the basic principles behind {topic}.',
      ],
      medium: [
        'Elaborate on various implementations of {topic}.',
        'Discuss the theoretical foundations of {topic}.',
        'Explain the evolution and development of {topic}.',
      ],
      hard: [
        'Provide a comprehensive analysis of {topic} with real-world case studies.',
        'Design an innovative approach to {topic} and justify your choices.',
        'Develop a detailed framework for implementing {topic}.',
      ],
    },
  };

  return patterns[type][difficulty];
}

function generateMockAnswer(
  topic: string,
  type: 'mcq' | 'short' | 'long' | 'descriptive',
  difficulty: 'easy' | 'medium' | 'hard'
): string {
  const templates: Record<string, Record<string, string>> = {
    mcq: {
      easy: `The correct answer demonstrates basic understanding of ${topic}.`,
      medium: `This answer correctly identifies the relationship and key characteristics of ${topic}.`,
      hard: `The correct option demonstrates synthesis and critical analysis of ${topic}.`,
    },
    short: {
      easy: `${topic} refers to [fundamental definition]. Key characteristics include: 1) [primary aspect], 2) [secondary aspect], 3) [tertiary aspect].`,
      medium: `${topic} plays a significant role in [context]. The main considerations include [key points]. This enables effective application in various scenarios.`,
      hard: `A comprehensive analysis of ${topic} reveals [in-depth insights]. Critical evaluation shows [analysis results]. Future implications suggest [forward-looking perspective].`,
    },
    long: {
      easy: `**Introduction:** ${topic} is a fundamental concept.\n\n**Main Points:**\n1. [First key aspect]\n2. [Second key aspect]\n3. [Third key aspect]\n\n**Conclusion:** In summary, ${topic} is essential because [significance].`,
      medium: `**Introduction:** ${topic} represents a critical concept.\n\n**Analysis:**\n- Theoretical perspective: [theory]\n- Practical standpoint: [practice]\n\n**Comparison:** [analysis]\n\n**Conclusion:** The significance of ${topic} lies in [importance].`,
      hard: `**Comprehensive Overview:** ${topic} encompasses [broad scope].\n\n**Critical Analysis:**\n1. Theoretical foundations: [deep theory]\n2. Practical implementations: [advanced practice]\n3. Research implications: [scholarly aspects]\n\n**Proposed Framework:** [innovative approach]\n\n**Conclusion:** ${topic} represents [summary].`,
    },
    descriptive: {
      easy: `A brief overview of ${topic}:\n\n1. Definition and scope\n2. Basic components\n3. Simple applications`,
      medium: `Detailed examination of ${topic}:\n\n1. Theoretical foundation\n2. Practical implementation\n3. Key considerations`,
      hard: `Comprehensive analysis of ${topic}:\n\n1. Historical context\n2. Current state of research\n3. Critical evaluation\n4. Future directions`,
    },
  };

  return templates[type][difficulty];
}

function generateMockOptions(topic: string): string[] {
  return [
    `Correct interpretation based on core principles of ${topic}`,
    `Common misconception about ${topic}`,
    `Partially correct but incomplete understanding`,
    `Unrelated or opposite concept`,
  ];
}

// ============================================================
// Answer regeneration (for when staff edits question content)
// ============================================================

export async function regenerateAnswerWithAI(params: {
  questionContent: string;
  questionType: 'mcq' | 'short' | 'long' | 'descriptive';
  difficulty: 'easy' | 'medium' | 'hard';
  bloomsLevel: string;
  topic: string;
  marks: number;
  /** When provided, answer must be derived ONLY from this material (e.g. AI Assistant context). */
  materialContent?: string;
  /** Optional MCQ metadata so answer can explicitly include the correct option. */
  options?: string[];
  correctOption?: number;
}): Promise<{ answer: string; explanation: string }> {
  if (!AI_FEATURES.useGemini) {
    throw new Error('Gemini not enabled');
  }

  const getAnswerWordTarget = (): { minWords: number; maxWords: number } => {
    const base =
      params.questionType === 'short' ? { easy: [80, 140], medium: [140, 230], hard: [230, 320] } :
      params.questionType === 'long' ? { easy: [220, 340], medium: [340, 520], hard: [520, 850] } :
      params.questionType === 'descriptive' ? { easy: [240, 360], medium: [360, 560], hard: [560, 900] } :
      { easy: [90, 160], medium: [160, 250], hard: [250, 360] }; // mcq

    const [min0, max0] = (base as any)[params.difficulty] as [number, number];
    const marks = Math.max(1, params.marks || 1);
    const scale = Math.min(1.8, Math.max(0.9, marks / 10));
    return {
      minWords: Math.round(min0 * scale),
      maxWords: Math.round(max0 * scale),
    };
  };

  const { minWords, maxWords } = getAnswerWordTarget();

  const materialSection = params.materialContent
    ? `

STEP 1: Locate the section(s) in the material below that directly address the question. Your answer must come from that section only.
STEP 2: The "answer" in your JSON must be a direct quote or close paraphrase of the material—no external knowledge.

=== MATERIAL (use only this to derive the answer; use as much as needed up to limit) ===
${params.materialContent.slice(0, 400000)}
=== END MATERIAL ===
`
    : '';
  const promptBase = `You are an expert academic question setter. The question below may have been edited by the user—generate an answer that correctly addresses this exact (current) question text.${materialSection}

Question (${params.questionType}, ${params.difficulty}, Bloom's: ${params.bloomsLevel}, topic: ${params.topic}):
${params.questionContent}
${params.materialContent ? '\nBase your answer ONLY on the material above. Find the exact passage that answers this (possibly edited) question; your "answer" must be drawn from that passage and must match what the question is now asking.' : ''}
${params.questionType === 'mcq' ? `\nMCQ correctness (mandatory): Start the answer with "Correct option: <LETTER>) <option text>. Why: <reason>".` : ''}

Answer requirements (mandatory):
- Plain text only. Do NOT use markdown emphasis like **bold** or *italic*.
- Do NOT add headings like "Introduction", "Conclusion", "Overview", numbered section titles, or bullet lists.
- Start directly with the answer sentence in natural style (ChatGPT/Gemini-like, no title prefix).
- Approximate answer length: ${minWords}-${maxWords} words.
- For long/descriptive: include introduction, multiple main-paragraph points, and a brief conclusion.

Respond in JSON only:
{"answer": "Plain text answer (${minWords}-${maxWords} words; must be from the material if material was provided)", "explanation": "Brief explanation of why this is correct"}`;

  const runAnswerGen = async (retryHint?: string) => {
    const model = getModel(GEMINI_CONFIG.models.questionGeneration);
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: SYSTEM_PROMPTS.questionGenerator + '\n\n' + promptBase + (retryHint ? `\n\n${retryHint}` : '') }] }],
      generationConfig: {
        temperature: 0.25,
        maxOutputTokens: (params.questionType === 'long' || params.questionType === 'descriptive' || params.difficulty === 'hard') ? 5200 : 3200,
        responseMimeType: 'application/json',
        topP: 0.85,
      },
    });
    const text = result.response.text();
    if (!text) throw new Error('No response from Gemini');
    const parsed = await parseModelJson<{ answer?: string; explanation?: string }>(text);
    return {
      answer: sanitizeNaturalAnswer(typeof parsed.answer === 'string' ? parsed.answer : ''),
      explanation: sanitizeNaturalAnswer(typeof parsed.explanation === 'string' ? parsed.explanation : ''),
    };
  };

  let out = await runAnswerGen();
  if (isIncompleteAnswer(out.answer, params.questionType, minWords)) {
    out = await runAnswerGen('Your previous answer was incomplete. Regenerate a full complete answer now. Do not truncate.');
  }

  if (params.questionType === 'mcq') {
    const options = Array.isArray(params.options) ? params.options : [];
    const correctOption = Number.isInteger(params.correctOption) ? Number(params.correctOption) : -1;
    if (options.length === 4 && correctOption >= 0 && correctOption <= 3) {
      const letter = String.fromCharCode(65 + correctOption);
      const correctText = sanitizePlainAnswer(options[correctOption] || '');
      const hasPrefix = /^correct option\s*:/i.test(out.answer || '');
      if (!hasPrefix) {
        const why = (out.answer || '').trim() || 'This option best matches the material context for the edited question.';
        out.answer = `Correct option: ${letter}) ${correctText}. Why: ${why}`;
      }
    } else if (!/^correct option\s*:/i.test(out.answer || '')) {
      out.answer = `Correct option: A) ${sanitizePlainAnswer(params.topic || 'Option A')}. Why: ${(out.answer || 'This is the best answer based on the provided material.').trim()}`;
    }
  }

  return {
    answer: out.answer || 'Could not generate a complete answer in this attempt. Please regenerate once more.',
    explanation: out.explanation,
  };
}

// ============================================================
// Batch Processing
// ============================================================

export async function generateQuestionsInBatches(
  configs: QuestionGenerationConfig[],
  batchSize: number = 5,
  delayBetweenBatches: number = 1000
): Promise<QuestionGenerationResult[]> {
  const results: QuestionGenerationResult[] = [];
  
  for (let i = 0; i < configs.length; i += batchSize) {
    const batch = configs.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(config => generateQuestionsWithAI(config))
    );
    results.push(...batchResults);
    
    if (i + batchSize < configs.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }
  
  return results;
}
