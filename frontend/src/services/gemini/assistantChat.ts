/**
 * AI Assistant Chat Service
 * =========================
 * 
 * RAG-enhanced conversational AI for question generation and material analysis.
 * Uses retrieved material chunks to ground all responses in uploaded content.
 * 
 * ARCHITECTURE:
 * 1. User message → Intent detection
 * 2. RAG retrieval → Get relevant material chunks
 * 3. Context building → Material chunks + conversation history
 * 4. Gemini API call → Material-restricted response
 * 5. Response parsing → Extract questions if generated
 * 
 * ACTIVATION: Set AI_FEATURES.useGemini = true after Gemini setup
 */

import { 
  ChatMessage, 
  ChatContext, 
  ChatResponse, 
  ChatAction,
  GeneratedQuestion 
} from './types';
import { 
  GEMINI_CONFIG, 
  SYSTEM_PROMPTS, 
  AI_FEATURES,
  handleGeminiError 
} from './config';
import { RAG_SYSTEM_PROMPT } from './prompts';
import { generateQuestionsWithAI } from './questionGenerator';
import { analyzeMaterialWithAI } from './materialAnalyzer';

// ============================================================
// Gemini client (used when AI_FEATURES.useGemini is true)
// ============================================================
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

function getModel(modelName: string) {
  return genAI.getGenerativeModel({ model: modelName });
}

/** Max characters of full material to send to Gemini (so it analyzes whole material, not just chunks). Fits within 1M context. */
const MAX_FULL_MATERIAL_CHARS = 400_000;

// ============================================================
// Intent Detection
// ============================================================

const INTENT_PATTERNS = {
  greeting: /\b(hello|hi|hey|good morning|good afternoon|good evening|howdy)\b/i,
  twistedQuestions: /\b(twist|twisted|tricky|confus|conceptual trap|mislead|trick question|brain teas|catch question|gotcha|deceptive|mind.?bend|thought.?provok|counter.?intuitive|paradox|subtle|nuance|deep understanding|higher.?order|critical think|analytical)\b/i,
  // Natural phrasing: "give me 5 short answers", "five short answer questions", "I need MCQs on X", "get me questions", etc.
  questionGeneration: /\b(generate|create|make|give me|get me|provide|write|produce|i need|want|need)\b.*\b(question|mcq|mcqs|short answer|short answers|long answer|long answers|descriptive|quiz|questions)\b/i,
  questionGenerationAlt: /\b(\d+)\s*(mcq|short|long|descriptive)\s*(question|answer|answers)?/i,
  modification: /\b(change|modify|edit|update|alter|remove|add|delete|fix|improve|enhance|rewrite)\b/i,
  regenerate: /\b(regenerate|redo|again|another|different|new version|try again|more)\b/i,
  help: /\b(help|how|what|explain|tell me|guide|assist|can you)\b/i,
  material: /\b(material|document|file|content|upload|analyze|pdf|doc|ppt)\b/i,
  bloomsTaxonomy: /\b(bloom|taxonomy|cognitive|remember|understand|apply|analyze|evaluate|create)\b/i,
  thanks: /\b(thank|thanks|appreciate|great|good job|well done|perfect|excellent)\b/i,
  difficulty: /\b(easy|medium|hard|difficult|simple|complex|challenging)\b/i,
  specific: /\b(question\s*\d+|q\s*\d+|number\s*\d+|\#\d+|first|second|third|last|previous)\b/i,
};

function detectIntent(message: string): ChatAction {
  if (INTENT_PATTERNS.greeting.test(message)) return 'greeting';
  if (INTENT_PATTERNS.twistedQuestions.test(message)) return 'question_generation';
  if (INTENT_PATTERNS.questionGeneration.test(message)) return 'question_generation';
  if (INTENT_PATTERNS.questionGenerationAlt.test(message)) return 'question_generation';
  if (INTENT_PATTERNS.regenerate.test(message)) return 'question_regeneration';
  if (INTENT_PATTERNS.modification.test(message)) return 'question_modification';
  if (INTENT_PATTERNS.material.test(message)) return 'material_analysis';
  if (INTENT_PATTERNS.thanks.test(message)) return 'thanks';
  if (INTENT_PATTERNS.help.test(message)) return 'help';
  return 'general';
}

/** Obvious out-of-material questions: time, date, weather, news, etc. Reply without calling Gemini. */
const OUT_OF_SCOPE_PATTERNS = [
  /\b(what'?s?|current|today'?s?|right now)\s*(the\s*)?(time|date|day|year)\b/i,
  /\b(time|date|today|tomorrow|yesterday)\s*(is|now|today)?\b/i,
  /\b(weather|forecast|temperature|rain|sunny)\b/i,
  /\b(news|headlines|sports|score|match|game)\s*(today|now)?\b/i,
  /\b(who\s*won|election|stock\s*market|bitcoin|crypto)\b/i,
  /\b(how\s*many\s*days|when\s*is\s*(christmas|easter|holiday))\b/i,
];

function isClearlyOutOfScope(message: string): boolean {
  const trimmed = message.trim();
  if (trimmed.length < 4) return false;
  return OUT_OF_SCOPE_PATTERNS.some((re) => re.test(trimmed));
}

function sanitizeAssistantText(text: string): string {
  let out = text ?? '';
  // Remove common markdown emphasis that looks unnatural in chat UI
  out = out.replace(/\*\*(.+?)\*\*/g, '$1');
  out = out.replace(/\*(.+?)\*/g, '$1');
  out = out.replace(/`(.+?)`/g, '$1');
  // Normalize bullets to plain lines
  out = out.replace(/^\s*[-•]\s+/gm, '');
  // Collapse excessive blank lines
  out = out.replace(/\n{3,}/g, '\n\n');
  return out.trim();
}

// ============================================================
// Message Parser
// ============================================================

interface ParsedRequest {
  count: number;
  type: 'mcq' | 'short' | 'long' | 'descriptive';
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
  bloomsLevel: string;
}

const NUMBER_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };

function parseQuestionRequest(message: string): ParsedRequest {
  const lowerMsg = message.toLowerCase();
  
  const countMatch = message.match(/(\d+)\s*(mcq|question|short|long|descriptive)/i) ||
                     message.match(/(\d+)\s*(mcq|short|long|descriptive)?\s*(question|answer|answers)?/i) ||
                     message.match(/(?:give me|get me|i need|generate|create)\s*(\d+)/i) ||
                     message.match(/(?:give me|get me|i need)\s+(one|two|three|four|five|six|seven|eight|nine|ten)\s+/i);
  let count = 5;
  if (countMatch) {
    const num = countMatch[1];
    count = NUMBER_WORDS[num] ?? (parseInt(num, 10) || 5);
    count = Math.min(Math.max(1, count), 50);
  }
  
  let type: 'mcq' | 'short' | 'long' | 'descriptive' = 'mcq';
  if (lowerMsg.includes('mcq') || lowerMsg.includes('multiple choice')) type = 'mcq';
  else if (lowerMsg.includes('short')) type = 'short';
  else if (lowerMsg.includes('long') || lowerMsg.includes('paragraph')) type = 'long';
  else if (lowerMsg.includes('descriptive')) type = 'descriptive';
  
  let difficulty: 'easy' | 'medium' | 'hard' = 'medium';
  if (lowerMsg.includes('easy') || lowerMsg.includes('simple') || lowerMsg.includes('basic')) difficulty = 'easy';
  else if (lowerMsg.includes('hard') || lowerMsg.includes('difficult') || lowerMsg.includes('complex')) difficulty = 'hard';
  
  const isTwisted = INTENT_PATTERNS.twistedQuestions.test(message);
  if (isTwisted) difficulty = 'hard';
  
  let bloomsLevel = 'Understand';
  if (isTwisted) bloomsLevel = 'Analyze';
  else if (lowerMsg.includes('remember') || lowerMsg.includes('recall')) bloomsLevel = 'Remember';
  else if (lowerMsg.includes('apply') || lowerMsg.includes('application')) bloomsLevel = 'Apply';
  else if (lowerMsg.includes('analyze') || lowerMsg.includes('analysis')) bloomsLevel = 'Analyze';
  else if (lowerMsg.includes('evaluate') || lowerMsg.includes('evaluation')) bloomsLevel = 'Evaluate';
  else if (lowerMsg.includes('create') || lowerMsg.includes('synthesis')) bloomsLevel = 'Create';
  
  const topicMatch = message.match(/(?:on|about|regarding|for|topic)\s+["']?([^"'\n,]+?)["']?\s*(?:\.|$|,|with|and|or|please)/i) ||
                     message.match(/["']([^"']+)["']/);
  const topic = topicMatch ? topicMatch[1].trim() : 'the selected topic';
  
  return { count, type, topic, difficulty, bloomsLevel };
}

// ============================================================
// Production Gemini Chat (Ready to activate)
// ============================================================

/**
 * PRODUCTION: Send message to Gemini with RAG context.
 * Activate by setting AI_FEATURES.useGemini = true.
 */
async function callGemini(
  message: string,
  context: ChatContext,
  intent: ChatAction
): Promise<ChatResponse> {
  // Build system prompt: always send FULL material so Gemini analyzes whole content (not only chunks)
  let systemPrompt = RAG_SYSTEM_PROMPT;
  const fullMaterial = context.selectedMaterialContent;
  if (fullMaterial) {
    const materialText = fullMaterial.length <= MAX_FULL_MATERIAL_CHARS
      ? fullMaterial
      : fullMaterial.slice(0, MAX_FULL_MATERIAL_CHARS) + '\n\n[... material truncated for length ...]';
    systemPrompt += `\n\n=== FULL MATERIAL CONTENT (this is the selected/chosen material—use it as the single source of truth) ===
Before answering or generating questions: (1) Locate the relevant part of the material for the user's request. (2) Base your response only on that content. (3) For question generation, each question and its answer must be extractable from this material; do not invent.
${materialText}
=== END FULL MATERIAL ===`;
  }
  if (context.materialChunksContext) {
    systemPrompt += `\n\n=== RELEVANT EXCERPTS (RAG) ===\n${context.materialChunksContext}\n=== END EXCERPTS ===`;
  }

  if (context.generatedQuestions.length > 0) {
    systemPrompt += `\n\n=== PREVIOUSLY GENERATED QUESTIONS (${context.generatedQuestions.length} total) — DO NOT REPEAT ===\n`;
    systemPrompt += context.generatedQuestions.slice(-20).map((q, i) =>
      `${i + 1}. [${q.type}/${q.difficulty}] ${q.content.slice(0, 250)}${q.content.length > 250 ? '...' : ''}`
    ).join('\n');
    systemPrompt += `\n=== END ===\n\nWhen generating more questions, you MUST generate only NEW questions: different wording, different concept tested, different part of the material. Do not repeat or rephrase any of the above. Every new question must be substantively different from every previous one.`;
  }

  const model = getModel(GEMINI_CONFIG.models.chatAssistant);
  
  /**
   * IMPORTANT: Gemini v1beta can reject large/complex `system_instruction` payloads with a 400
   * ("Invalid value at 'system_instruction'"). To avoid that, we send the system prompt as normal
   * content instead of `systemInstruction`.
   */
  const history = context.messages.slice(-10).map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  const result = await model.generateContent({
    contents: [
      { role: 'user', parts: [{ text: systemPrompt }] },
      ...history,
      { role: 'user', parts: [{ text: message }] },
    ],
    generationConfig: {
      temperature: GEMINI_CONFIG.temperature.chatAssistant,
      maxOutputTokens: GEMINI_CONFIG.maxTokens.chatResponse,
      topP: 0.9,
      topK: 40,
    },
  });
  let assistantMessage: string;
  try {
    assistantMessage = result.response.text() ?? '';
  } catch (textError) {
    console.error('[AIAssistant] Gemini response.text() failed (e.g. blocked or empty):', textError);
    return {
      message: 'I received a response that I couldn’t display. Please try again or rephrase your question. If you asked for question generation, try selecting a material first.',
      action: intent,
      suggestions: ['Generate 5 MCQ questions', 'Analyze my material', 'Help'],
    };
  }
  if (!assistantMessage.trim()) {
    return {
      message: 'I didn’t get a usable response. Please try again or select a material and ask something more specific.',
      action: intent,
      suggestions: ['Generate 5 MCQ questions', 'Analyze my material', 'Help'],
    };
  }

  // Parse questions from response if present
  let generatedQuestions: GeneratedQuestion[] | undefined;
  const questionsMatch = assistantMessage.match(/\[QUESTIONS_JSON\]([\s\S]*?)\[\/QUESTIONS_JSON\]/);
  if (questionsMatch) {
    try {
      const parsed = JSON.parse(questionsMatch[1]);
      generatedQuestions = parsed.questions.map((q: any, i: number) => ({
        ...q,
        id: `q_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`,
      }));
    } catch (e) {
      console.error('[AIAssistant] Failed to parse questions from response:', e);
    }
  }

  // Extract suggestions so they appear as normal chat suggestion chips,
  // not as a raw "[SUGGESTIONS] ... [/SUGGESTIONS]" block in the message UI.
  let geminiSuggestions: string[] | undefined;
  const suggestionsMatch = assistantMessage.match(/\[SUGGESTIONS\]([\s\S]*?)\[\/SUGGESTIONS\]/);
  if (suggestionsMatch) {
    const raw = suggestionsMatch[1]?.trim() || '';
    try {
      const candidate = raw.replace(/```/g, '').trim();
      const parsed = JSON.parse(candidate);
      if (Array.isArray(parsed)) {
        geminiSuggestions = parsed.map((s) => String(s)).filter(Boolean);
      }
    } catch {
      const quoted = raw.match(/"([^"]+)"/g);
      if (quoted && quoted.length > 0) {
        geminiSuggestions = quoted.map((q) => q.replace(/^"|"$/g, '').trim()).filter(Boolean);
      }
    }
  }

  const cleanMessage = assistantMessage
    .replace(/\[QUESTIONS_JSON\][\s\S]*?\[\/QUESTIONS_JSON\]/g, '')
    .replace(/\[SUGGESTIONS\][\s\S]*?\[\/SUGGESTIONS\]/g, '')
    .trim();

  return {
    message: sanitizeAssistantText(cleanMessage),
    action: intent,
    generatedQuestions,
    suggestions: geminiSuggestions ?? generateSuggestions(intent, context),
  };
}

// ============================================================
// Main Chat Response Handler
// ============================================================

/**
 * Generate a chat response.
 * Uses Gemini when configured, falls back to mock implementation.
 */
export async function getChatResponse(
  message: string,
  context: ChatContext
): Promise<ChatResponse> {
  const intent = detectIntent(message);

  // Fast path: obvious out-of-scope (time, weather, etc.) — material-only assistant
  if (isClearlyOutOfScope(message)) {
    return {
      message: "That's outside what I can help with. I'm only here for your chosen material—I can answer doubts, explain topics, and generate questions from what you've uploaded. What would you like to ask about from your material?",
      action: intent,
      suggestions: ['Generate 5 MCQ questions', 'Analyze my material', 'Explain a topic from the material'],
    };
  }

  // ============================================================
  // PRODUCTION: Gemini when configured
  // ============================================================
  if (AI_FEATURES.useGemini) {
    try {
      return await callGemini(message, context, intent);
    } catch (error) {
      console.error('[AIAssistant] Gemini error, falling back to mock:', error);
      // Fall through to mock implementation
    }
  }

  // ============================================================
  // MOCK IMPLEMENTATION (Active until Gemini is configured or after Gemini error fallback)
  // ============================================================
  try {
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700));

    switch (intent) {
      case 'greeting':
        return handleGreeting(context);
      case 'question_generation':
        return await handleQuestionGeneration(message, context);
      case 'question_modification':
        return handleModification(message, context);
      case 'question_regeneration':
        return await handleRegeneration(message, context);
      case 'material_analysis':
        return await handleMaterialAnalysis(message, context);
      case 'thanks':
        return handleThanks();
      case 'help':
        return handleHelp(message);
      default:
        return handleGeneral(message, context);
    }
  } catch (mockError) {
    console.error('[AIAssistant] Mock/Gemini fallback error:', mockError);
    return {
      message: `I couldn't complete that right now. Please check your Gemini API key (VITE_GEMINI_API_KEY) and try again. If the problem continues, try selecting a material first or rephrasing your request.`,
      action: intent,
      suggestions: ['Generate 5 MCQ questions', 'Analyze my material', 'Help'],
    };
  }
}

// ============================================================
// Intent Handlers (Mock)
// ============================================================

function handleGreeting(context: ChatContext): ChatResponse {
  const hasMaterial = !!context.selectedMaterialContent;
  const hasQuestions = context.generatedQuestions.length > 0;

  let message = `Hello! 👋 I'm your AI Question Assistant. I can help you:

• **Generate questions** from your course materials
• **Modify existing questions** - make them easier, harder, or different
• **Analyze documents** to extract topics and concepts
• **Explain Bloom's Taxonomy** and question design best practices`;

  if (hasMaterial) {
    message += `\n\n📄 I see you have material selected. I'm ready to generate questions from it!`;
  }
  if (hasQuestions) {
    message += `\n\n📝 You have ${context.generatedQuestions.length} questions generated. I can help modify them.`;
  }

  message += `\n\n**Try saying:**\n- "Generate 5 MCQ questions on data structures"\n- "Create 3 hard long-answer questions"\n- "Make question 2 easier"`;

  return {
    message,
    action: 'greeting',
    suggestions: ['Generate 5 MCQ questions', 'Analyze my material', 'Explain Bloom\'s Taxonomy'],
  };
}

async function handleQuestionGeneration(
  message: string,
  context: ChatContext
): Promise<ChatResponse> {
  const request = parseQuestionRequest(message);
  
  const result = await generateQuestionsWithAI({
    topics: [request.topic],
    difficulty: request.difficulty,
    questionType: request.type,
    bloomsLevel: request.bloomsLevel as any,
    marks: request.type === 'mcq' ? 2 : request.type === 'short' ? 5 : 10,
    numberOfQuestions: request.count,
    materialContent: context.selectedMaterialContent,
    materialContext: context.materialChunksContext,
  });

  const questionsPreview = result.questions.slice(0, 3).map((q, i) => 
    `**Q${i + 1}:** ${q.content.slice(0, 100)}${q.content.length > 100 ? '...' : ''}`
  ).join('\n\n');

  const responseMessage = `I've generated **${result.questions.length} ${request.type.toUpperCase()} questions** on "${request.topic}" at ${request.difficulty} difficulty level.

${questionsPreview}

${result.questions.length > 3 ? `\n_...and ${result.questions.length - 3} more questions._` : ''}

**What would you like to do next?**
- Ask me to make any question easier or harder
- Request more questions on a specific topic
- Save these to your question bank`;

  return {
    message: responseMessage,
    action: 'question_generation',
    generatedQuestions: result.questions,
    suggestions: ['Make these harder', 'Generate 5 more', 'Change to short answer'],
  };
}

function handleModification(message: string, context: ChatContext): ChatResponse {
  const lowerMsg = message.toLowerCase();
  
  if (lowerMsg.includes('easier') || lowerMsg.includes('simpler')) {
    return {
      message: `I've made the question easier by:
- Simplifying the language
- Reducing complexity
- Making the correct answer more obvious

Would you like me to modify any other questions?`,
      action: 'question_modification',
      suggestions: ['Make it even simpler', 'Modify another question', 'Generate new ones'],
    };
  }

  if (lowerMsg.includes('harder') || lowerMsg.includes('difficult')) {
    return {
      message: `I've increased the difficulty by:
- Adding more complexity
- Requiring deeper analysis
- Including challenging distractors

Would you like me to modify any other questions?`,
      action: 'question_modification',
      suggestions: ['Make it challenging', 'Add more options', 'Generate new ones'],
    };
  }

  return {
    message: `I understand you want to modify a question. Could you be more specific? For example:
- "Make question 1 easier"
- "Remove the comma from question 2"
- "Make the last question harder"
- "Rewrite question 3 with different wording"`,
    action: 'question_modification',
    suggestions: ['Make it easier', 'Make it harder', 'Rewrite it'],
  };
}

async function handleRegeneration(message: string, context: ChatContext): Promise<ChatResponse> {
  if (context.generatedQuestions.length === 0) {
    return {
      message: `I don't have any previous questions to regenerate. Would you like me to generate new ones?

**Try saying:**
- "Generate 5 MCQ questions on [topic]"
- "Create short answer questions"`,
      action: 'question_regeneration',
      suggestions: ['Generate new questions', 'Analyze my material'],
    };
  }

  const lastQuestion = context.generatedQuestions[context.generatedQuestions.length - 1];
  
  return {
    message: `I'm regenerating questions based on your previous request. Here are ${context.generatedQuestions.length} new questions on "${lastQuestion.topic}".

The new questions have different wording and approach while maintaining the same difficulty and type.

Would you like me to adjust anything?`,
    action: 'question_regeneration',
    suggestions: ['Generate more', 'Change difficulty', 'Different topic'],
  };
}

async function handleMaterialAnalysis(message: string, context: ChatContext): Promise<ChatResponse> {
  if (!context.selectedMaterialContent) {
    return {
      message: `I don't have any material selected right now. Select a document from your uploads and I can tell you what's in it, extract topics, or help you generate questions from it.`,
      action: 'material_analysis',
      suggestions: ['Select a material', 'Upload new material'],
    };
  }

  const analysis = await analyzeMaterialWithAI({
    content: context.selectedMaterialContent,
    fileName: 'selected material',
    fileType: 'text',
  });

  // Sanitize keywords: only show when they look like real terms (avoid PDF extraction garbage like "s", "w", "s  w")
  const rawKeywords = (analysis.keywords || []).filter((k: string) => typeof k === 'string' && k.trim().length >= 3);
  const safeKeywords = rawKeywords
    .filter((k: string) => !/^[sw\s]+$/i.test(k) && k.length <= 40)
    .slice(0, 6);
  const keywordPhrase = safeKeywords.join(', ');
  const showKeywords = safeKeywords.length > 0 && keywordPhrase.length <= 80 && !/^[\sw\s.,]+$/i.test(keywordPhrase);

  const topicList = (analysis.topics || []).slice(0, 5).map((t: { name: string }) => t.name);
  const topicPhrase = topicList.length > 0
    ? topicList.join(', ')
    : 'a few main themes';

  const reply = `Based on your material, it looks like ${analysis.subjectArea || 'general'} content at around ${analysis.estimatedReadingLevel || 'undergraduate'} level. The main topics I see are: ${topicPhrase}.${showKeywords ? ` Some important terms: ${keywordPhrase}.` : ''} You could generate about ${analysis.suggestedQuestionCount?.easy ?? 0} easier, ${analysis.suggestedQuestionCount?.medium ?? 0} medium, and ${analysis.suggestedQuestionCount?.hard ?? 0} harder questions from this. Want me to generate some questions from it?`;

  return {
    message: reply,
    action: 'material_analysis',
    suggestions: [
      `Generate ${analysis.suggestedQuestionCount?.medium ?? 5} questions`,
      'Focus on first topic',
      'Create mixed difficulty set',
    ],
  };
}

function handleThanks(): ChatResponse {
  const responses = [
    "You're welcome! 😊 Feel free to ask if you need more help with questions.",
    "Happy to help! Let me know if you need anything else.",
    "Glad I could assist! I'm here whenever you need more questions.",
    "My pleasure! Don't hesitate to ask for more help anytime.",
  ];

  return {
    message: responses[Math.floor(Math.random() * responses.length)],
    action: 'thanks',
    suggestions: ['Generate more questions', 'Modify a question', 'Analyze material'],
  };
}

function handleHelp(message: string): ChatResponse {
  const lowerMsg = message.toLowerCase();

  if (lowerMsg.includes('bloom') || lowerMsg.includes('taxonomy')) {
    return {
      message: `**Bloom's Taxonomy** is a framework for categorizing educational goals:

1. **Remember** 📚 - Recall facts and basic concepts
   _Example: "What is photosynthesis?"_

2. **Understand** 💡 - Explain ideas or concepts
   _Example: "Explain how photosynthesis works"_

3. **Apply** 🔧 - Use information in new situations
   _Example: "Calculate the rate of photosynthesis..."_

4. **Analyze** 🔍 - Draw connections among ideas
   _Example: "Compare photosynthesis and respiration"_

5. **Evaluate** ⚖️ - Justify decisions or actions
   _Example: "Evaluate the importance of photosynthesis..."_

6. **Create** 🎨 - Produce new or original work
   _Example: "Design an experiment to test..."_

Which level would you like me to generate questions for?`,
      action: 'help',
      suggestions: ['Generate Apply-level questions', 'Create Analyze questions', 'Mix all levels'],
    };
  }

  return {
    message: `**Here's how I can help you:**

**🎯 Generate Questions**
- "Generate 5 MCQ on [topic]"
- "Create 3 hard descriptive questions"
- "Make short answer questions about [concept]"

**✏️ Modify Questions**
- "Make question 1 easier"
- "Rewrite the last question"
- "Add more options to the MCQ"

**📄 Analyze Materials**
- "Analyze my uploaded document"
- "What topics are in this material?"
- "Suggest questions for this content"

**📚 Learn About Question Design**
- "Explain Bloom's Taxonomy"
- "How do I write good MCQs?"
- "What makes a question effective?"

What would you like to try?`,
    action: 'help',
    suggestions: ['Generate questions', 'Analyze my material', 'Explain Bloom\'s'],
  };
}

function handleGeneral(message: string, context: ChatContext): ChatResponse {
  const materialNote = context.selectedMaterialContent
    ? '\n\n📌 _I have your material loaded. Ask me anything about its content, or request questions from it._'
    : '\n\n📌 _Select a material to get topic-specific responses and questions._';

  return {
    message: `I understand you're asking about: "${message.slice(0, 50)}${message.length > 50 ? '...' : ''}"

I'm specialized in helping with question generation and analysis. Here's what I can do:

• **Generate questions** - Just tell me the topic, type, and difficulty
• **Modify questions** - I can make them easier, harder, or different
• **Analyze materials** - Upload a document and I'll extract topics

**Try being more specific, like:**
- "Generate 5 MCQ questions on machine learning"
- "Make this question easier"
- "What topics are in my uploaded material?"${materialNote}`,
    action: 'general',
    suggestions: ['Generate questions', 'Help me get started', 'What can you do?'],
  };
}

// ============================================================
// Helper Functions
// ============================================================

function buildSystemPrompt(context: ChatContext): string {
  let systemPrompt = SYSTEM_PROMPTS.chatAssistant;
  const fullMaterial = context.selectedMaterialContent;
  if (fullMaterial) {
    const materialText = fullMaterial.length <= MAX_FULL_MATERIAL_CHARS
      ? fullMaterial
      : fullMaterial.slice(0, MAX_FULL_MATERIAL_CHARS) + '\n\n[... truncated ...]';
    systemPrompt += `\n\n**FULL MATERIAL CONTENT:**\n${materialText}`;
  }
  if (context.materialChunksContext) {
    systemPrompt += `\n\n**Relevant excerpts (RAG):**\n${context.materialChunksContext}`;
  }

  if (context.generatedQuestions.length > 0) {
    systemPrompt += `\n\n**Previously Generated Questions (${context.generatedQuestions.length} total):**\n`;
    systemPrompt += context.generatedQuestions.slice(0, 5).map((q, i) => 
      `${i + 1}. [${q.type}/${q.difficulty}] ${q.content.slice(0, 100)}`
    ).join('\n');
  }

  return systemPrompt;
}

function generateSuggestions(action: ChatAction, context: ChatContext): string[] {
  const suggestions: Record<ChatAction, string[]> = {
    greeting: ['Generate questions', 'Analyze my material', 'Clear a doubt from my material', 'Explain Bloom\'s'],
    question_generation: [
      'Generate 5 more questions without configuration',
      'Generate more MCQs without configuration',
      'Generate more questions with configuration',
      'Make these easier',
      'Make these harder',
      'Change to MCQ',
    ],
    question_modification: ['Modify another question', 'Regenerate all questions', 'Save questions', 'Make question 1 easier'],
    question_regeneration: ['Generate a new set without repeats', 'Try a different type', 'Adjust difficulty', 'Generate with configuration'],
    material_analysis: ['Generate questions from the first topic', 'Generate mixed difficulty questions', 'Focus on one topic', 'Explain key terms'],
    help: ['How do I clear a doubt?', 'How do I generate questions?', 'Where is X in the material?', 'Make an exam-style set'],
    thanks: ['Generate more questions', 'New topic from my material', 'Clear another doubt', 'Done for now'],
    general: ['Ask a doubt from the material', 'Generate questions', 'Analyze material', 'Where is topic X explained?'],
  };

  return suggestions[action] || suggestions.general;
}

// ============================================================
// Streaming Support (Production - uncomment after Gemini setup)
// ============================================================

/*
export async function* streamChatResponse(
  message: string,
  context: ChatContext
): AsyncGenerator<string, void, unknown> {
  if (!AI_FEATURES.useGemini) {
    throw new Error('Gemini is not configured');
  }

  let systemPrompt = RAG_SYSTEM_PROMPT;
  const fullMaterial = context.selectedMaterialContent;
  if (fullMaterial) {
    const materialText = fullMaterial.length <= MAX_FULL_MATERIAL_CHARS
      ? fullMaterial
      : fullMaterial.slice(0, MAX_FULL_MATERIAL_CHARS) + '\n\n[... material truncated for length ...]';
    systemPrompt += `\n\n=== FULL MATERIAL CONTENT ===\n${materialText}\n=== END FULL MATERIAL ===`;
  }
  if (context.materialChunksContext) {
    systemPrompt += `\n\n=== RELEVANT EXCERPTS (RAG) ===\n${context.materialChunksContext}\n=== END EXCERPTS ===`;
  }

  const model = getModel(GEMINI_CONFIG.models.chatAssistant);
  const chat = model.startChat({
    history: context.messages.slice(-10).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    })),
    generationConfig: {
      temperature: GEMINI_CONFIG.temperature.chatAssistant,
    },
    systemInstruction: systemPrompt,
  });

  const result = await chat.sendMessageStream(message);

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) {
      yield text;
    }
  }
}
*/
