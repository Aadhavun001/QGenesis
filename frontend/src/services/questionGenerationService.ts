/**
 * Question Generation Service
 * ============================
 * 
 * Professional, material-aware academic question generation.
 * Currently uses intelligent local generation; designed so swapping
 * to a real backend API (edge function) is a one-line change.
 * 
 * To connect a real backend later, replace the body of
 * `generateQuestions()` and `regenerateAnswer()` with a fetch call.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface GenerateQuestionsParams {
  topics: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  questionType: 'mcq' | 'short' | 'long' | 'descriptive';
  bloomsLevel: string;
  marks: number;
  numberOfQuestions: number;
  materialContent?: string;
  examType?: string;
}

export interface GeneratedQuestionResult {
  content: string;
  answer: string;
  explanation: string;
  type: 'mcq' | 'short' | 'long' | 'descriptive';
  difficulty: 'easy' | 'medium' | 'hard';
  bloomsLevel: string;
  marks: number;
  topic: string;
  options?: string[];
  correctOption?: number;
  keywords: string[];
  estimatedTime: number; // minutes
}

// ── Material-Aware Content Extraction ────────────────────────────────────────

/**
 * Extracts key sentences, definitions, and concepts from material content
 * to ground questions in actual syllabus material.
 */
function extractMaterialConcepts(content: string): {
  sentences: string[];
  definitions: string[];
  keyTerms: string[];
} {
  if (!content || content.trim().length === 0) {
    return { sentences: [], definitions: [], keyTerms: [] };
  }

  const sentences = content
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 20 && s.length < 300);

  // Detect definition-like sentences
  const definitions = sentences.filter(s =>
    /\b(is defined as|refers to|is a|means|can be described as|is the process of|involves)\b/i.test(s)
  );

  // Extract key terms (capitalized multi-word phrases, technical terms)
  const termSet = new Set<string>();
  const termPattern = /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\b/g;
  let match: RegExpExecArray | null;
  while ((match = termPattern.exec(content)) !== null) {
    if (match[1].length > 3 && !['The', 'This', 'That', 'These', 'Those', 'What', 'Which', 'Where', 'When', 'How'].includes(match[1])) {
      termSet.add(match[1]);
    }
  }

  return {
    sentences,
    definitions,
    keyTerms: Array.from(termSet).slice(0, 20),
  };
}

// ── Bloom's Taxonomy-Aligned Question Stems ──────────────────────────────────

const BLOOMS_STEMS: Record<string, Record<string, string[]>> = {
  Remember: {
    mcq: [
      'Which of the following correctly defines {concept}?',
      'What is {concept}?',
      'Identify the correct statement about {concept}.',
      'The term {concept} refers to:',
    ],
    short: [
      'Define {concept}.',
      'State the meaning of {concept}.',
      'List the key characteristics of {concept}.',
      'Recall the main components of {concept}.',
    ],
    long: [
      'Describe {concept} in detail with relevant definitions.',
      'Write a comprehensive note on {concept}, covering all fundamental aspects.',
    ],
    descriptive: [
      'Give a detailed account of {concept} with appropriate terminology.',
      'Describe the structure and components of {concept}.',
    ],
  },
  Understand: {
    mcq: [
      'Which explanation best describes the purpose of {concept}?',
      'What is the primary function of {concept} in the given context?',
      'Which of the following demonstrates correct understanding of {concept}?',
    ],
    short: [
      'Explain {concept} in your own words.',
      'Summarize the key principles behind {concept}.',
      'Distinguish between {concept} and related concepts.',
    ],
    long: [
      'Explain the significance of {concept} with suitable examples.',
      'Illustrate the working of {concept} with a diagram or flowchart description.',
    ],
    descriptive: [
      'Elaborate on the theoretical foundations of {concept}.',
      'Discuss the principles underlying {concept} with examples.',
    ],
  },
  Apply: {
    mcq: [
      'In which scenario would {concept} be most appropriately applied?',
      'Given a situation requiring {concept}, which approach would be correct?',
      'How would you apply {concept} to solve the following problem?',
    ],
    short: [
      'Demonstrate the application of {concept} with a practical example.',
      'How would you use {concept} in a real-world scenario?',
      'Solve the following using {concept} principles.',
    ],
    long: [
      'Apply {concept} to design a solution for the given problem statement.',
      'Demonstrate how {concept} can be implemented in a practical scenario with step-by-step explanation.',
    ],
    descriptive: [
      'Illustrate the practical applications of {concept} across different domains.',
      'Describe how {concept} is implemented in industry with case examples.',
    ],
  },
  Analyze: {
    mcq: [
      'What is the relationship between {concept} and its underlying components?',
      'Which factor most significantly influences the behavior of {concept}?',
      'Analyze the following scenario involving {concept} — which conclusion is valid?',
    ],
    short: [
      'Analyze the key factors that affect {concept}.',
      'Compare and contrast {concept} with an alternative approach.',
      'Identify the strengths and weaknesses of {concept}.',
    ],
    long: [
      'Critically analyze {concept} by examining its components, relationships, and implications.',
      'Examine {concept} from multiple perspectives and discuss the interrelationships among its elements.',
    ],
    descriptive: [
      'Provide a detailed analysis of {concept}, examining each component and their interactions.',
      'Analyze the evolution of {concept} and its impact on the field.',
    ],
  },
  Evaluate: {
    mcq: [
      'Which of the following best evaluates the effectiveness of {concept}?',
      'Based on established criteria, which statement correctly assesses {concept}?',
      'What is the most valid criticism of {concept}?',
    ],
    short: [
      'Evaluate the effectiveness of {concept} in achieving its stated objectives.',
      'Justify why {concept} is preferred over alternative approaches.',
      'Assess the limitations of {concept} in complex scenarios.',
    ],
    long: [
      'Critically evaluate {concept}, discussing its merits, limitations, and scope for improvement.',
      'Present a balanced evaluation of {concept} with supporting evidence and counter-arguments.',
    ],
    descriptive: [
      'Evaluate existing approaches to {concept} and recommend improvements based on your analysis.',
      'Assess the relevance and impact of {concept} in contemporary practice.',
    ],
  },
  Create: {
    mcq: [
      'Which design approach would best leverage {concept} to create a novel solution?',
      'If tasked with improving {concept}, which combination of strategies would be most innovative?',
    ],
    short: [
      'Propose an improvement to the current implementation of {concept}.',
      'Design a brief framework that incorporates {concept} in a novel way.',
      'Suggest a new application of {concept} not covered in the material.',
    ],
    long: [
      'Design a comprehensive framework using {concept} principles to solve a real-world problem.',
      'Propose and justify an innovative approach that extends {concept} beyond its current applications.',
    ],
    descriptive: [
      'Develop a detailed proposal for a new system based on {concept} principles.',
      'Create an integrated solution combining {concept} with modern techniques, justifying each design decision.',
    ],
  },
};

// ── Answer Generators (by type + difficulty) ─────────────────────────────────

function generateAnswer(
  topic: string,
  concept: string,
  type: string,
  difficulty: string,
  bloomsLevel: string,
  materialSentence?: string,
): { answer: string; explanation: string } {
  const ref = materialSentence ? `\n\n*Reference from material: "${materialSentence}"*` : '';

  if (type === 'mcq') {
    return {
      answer: `Option A is the correct answer.`,
      explanation: `This option accurately reflects the definition and characteristics of ${concept} as discussed in the material. The other options represent common misconceptions or incomplete understanding.${ref}`,
    };
  }

  if (type === 'short') {
    const answers: Record<string, string> = {
      easy: `${concept} refers to ${topic.toLowerCase()} and is characterized by its fundamental properties. Key aspects include: (1) its core definition as established in the subject matter, (2) its primary characteristics that distinguish it from related concepts, and (3) its basic applications in the field.`,
      medium: `${concept} plays a significant role within ${topic}. It can be understood through its relationship to related principles, its practical applications, and the considerations necessary for effective implementation. When compared to alternatives, ${concept} offers distinct advantages in terms of specificity and applicability.`,
      hard: `A critical analysis of ${concept} within ${topic} reveals its multifaceted nature. The effectiveness of this approach depends on contextual factors including scope, constraints, and intended outcomes. Evaluation against established criteria demonstrates both strengths in core functionality and limitations in edge cases that warrant further investigation.`,
    };
    return {
      answer: answers[difficulty] || answers.medium,
      explanation: `This answer addresses the ${bloomsLevel} level of Bloom's Taxonomy by ${bloomsLevel === 'Remember' ? 'recalling key facts' : bloomsLevel === 'Understand' ? 'demonstrating comprehension' : bloomsLevel === 'Apply' ? 'showing practical application' : bloomsLevel === 'Analyze' ? 'breaking down components' : bloomsLevel === 'Evaluate' ? 'making informed judgments' : 'proposing original ideas'}.${ref}`,
    };
  }

  // long / descriptive
  const structures: Record<string, string> = {
    easy: `**Introduction**\n${concept} is a foundational concept in ${topic} that encompasses several key principles.\n\n**Main Discussion**\n1. **Definition**: ${concept} can be defined as the process/method/framework that addresses core aspects of the subject.\n2. **Key Characteristics**: The primary features include its structured approach, systematic methodology, and practical applicability.\n3. **Examples**: In practice, ${concept} manifests through standard implementations that demonstrate its utility.\n\n**Conclusion**\nIn summary, understanding ${concept} is essential for a comprehensive grasp of ${topic} and its applications.`,
    medium: `**Introduction**\n${concept} represents a critical element within ${topic} that warrants thorough examination from both theoretical and practical perspectives.\n\n**Theoretical Framework**\nThe conceptual foundation of ${concept} rests on established principles that have evolved through research and practice. Key theoretical aspects include its relationship to broader frameworks and its role in addressing specific challenges.\n\n**Comparative Analysis**\nWhen compared to alternative approaches, ${concept} demonstrates distinct advantages in terms of effectiveness and applicability. However, certain limitations exist that must be acknowledged and addressed.\n\n**Practical Implications**\nThe practical application of ${concept} requires consideration of contextual factors, implementation constraints, and stakeholder requirements.\n\n**Conclusion**\nThe significance of ${concept} in ${topic} lies in its ability to bridge theory and practice while addressing real-world challenges.`,
    hard: `**Comprehensive Analysis**\n\n**1. Theoretical Foundations**\n${concept} is grounded in established principles of ${topic}. A critical examination reveals the evolution from foundational theories to contemporary interpretations, highlighting key paradigm shifts and their implications.\n\n**2. Critical Evaluation**\nCurrent approaches to ${concept} present both strengths and limitations:\n- *Strengths*: Systematic methodology, empirical support, practical applicability\n- *Limitations*: Contextual constraints, scalability challenges, evolving requirements\n\n**3. Synthesis and Innovation**\nIntegrating insights from multiple perspectives, a refined framework for ${concept} can be proposed that addresses existing gaps while maintaining theoretical rigor.\n\n**4. Research Implications**\nFuture investigation should focus on empirical validation of the proposed enhancements and longitudinal studies to assess long-term effectiveness.\n\n**5. Conclusion**\n${concept} remains a dynamic area within ${topic} that requires ongoing scholarly attention and practical refinement to maximize its impact.`,
  };

  return {
    answer: structures[difficulty] || structures.medium,
    explanation: `This ${type} answer is structured at the ${bloomsLevel} level of Bloom's Taxonomy, requiring students to ${bloomsLevel === 'Remember' ? 'recall and organize facts' : bloomsLevel === 'Understand' ? 'demonstrate conceptual understanding' : bloomsLevel === 'Apply' ? 'apply knowledge to scenarios' : bloomsLevel === 'Analyze' ? 'examine relationships and patterns' : bloomsLevel === 'Evaluate' ? 'make evidence-based judgments' : 'synthesize and create original frameworks'}. Expected response length: ${difficulty === 'easy' ? '150-250' : difficulty === 'medium' ? '300-500' : '500-800'} words.${ref}`,
  };
}

// ── MCQ Option Generator ─────────────────────────────────────────────────────

function generateMCQOptions(
  concept: string,
  topic: string,
  difficulty: string,
): { options: string[]; correctOption: number } {
  const optionSets: Record<string, string[][]> = {
    easy: [
      [
        `The correct definition and primary characteristics of ${concept}`,
        `A common misinterpretation that confuses ${concept} with a related concept`,
        `An oversimplified description that omits key aspects of ${concept}`,
        `An unrelated concept from a different area of ${topic}`,
      ],
      [
        `${concept} accurately describes the process/method as established in the material`,
        `${concept} is only applicable in theoretical contexts, not practical ones`,
        `${concept} was introduced as a replacement for all prior methods`,
        `${concept} has no significant relationship to ${topic}`,
      ],
    ],
    medium: [
      [
        `It integrates multiple components of ${concept} to achieve a comprehensive outcome`,
        `It focuses exclusively on theoretical aspects without practical consideration`,
        `It only applies to specific cases and cannot be generalized`,
        `It contradicts the established principles of ${topic}`,
      ],
      [
        `Both the systematic approach and contextual adaptation are essential to ${concept}`,
        `Only the systematic approach matters; context is irrelevant`,
        `Contextual factors override systematic methodology entirely`,
        `Neither systematic approach nor context affects the outcome`,
      ],
    ],
    hard: [
      [
        `A nuanced integration of ${concept} with consideration of trade-offs and constraints`,
        `A simplified application that ignores critical boundary conditions`,
        `An approach that prioritizes efficiency over correctness in all scenarios`,
        `A theoretical framework that has not been validated empirically`,
      ],
      [
        `The synergy between ${concept} components produces emergent properties not present in isolation`,
        `Individual components of ${concept} function independently without interaction`,
        `The effectiveness of ${concept} decreases proportionally with system complexity`,
        `${concept} is limited to first-order effects and cannot address cascading impacts`,
      ],
    ],
  };

  const sets = optionSets[difficulty] || optionSets.medium;
  const selected = sets[Math.floor(Math.random() * sets.length)];
  return { options: selected, correctOption: 0 };
}

// ── Main Generator ───────────────────────────────────────────────────────────

const usedQuestions = new Set<string>();

/**
 * Generate professional, exam-standard questions.
 * 
 * To swap to a real API later, replace this function body with:
 * ```ts
 * const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-questions`, {
 *   method: 'POST',
 *   headers: { Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' },
 *   body: JSON.stringify(params),
 * });
 * return res.json();
 * ```
 */
export async function generateQuestions(
  params: GenerateQuestionsParams,
): Promise<GeneratedQuestionResult[]> {
  // Simulate processing time proportional to question count
  await new Promise(r => setTimeout(r, 800 + params.numberOfQuestions * 200));

  const materialConcepts = extractMaterialConcepts(params.materialContent || '');
  const questions: GeneratedQuestionResult[] = [];
  const bloomsLevel = params.bloomsLevel || 'Understand';
  const stems = BLOOMS_STEMS[bloomsLevel]?.[params.questionType]
    || BLOOMS_STEMS['Understand'][params.questionType]
    || BLOOMS_STEMS['Understand']['short'];

  for (let i = 0; i < params.numberOfQuestions; i++) {
    const topic = params.topics[i % params.topics.length];

    // Pick a concept — prefer material-derived terms, fall back to topic
    const concept = materialConcepts.keyTerms.length > 0
      ? materialConcepts.keyTerms[i % materialConcepts.keyTerms.length]
      : topic;

    // Pick a unique stem
    let stem: string;
    let attempts = 0;
    do {
      stem = stems[Math.floor(Math.random() * stems.length)]
        .replace(/{concept}/g, concept)
        .replace(/{topic}/g, topic);
      attempts++;
    } while (usedQuestions.has(stem) && attempts < 15);

    if (usedQuestions.has(stem)) {
      stem = `With reference to ${concept}, ${stem.charAt(0).toLowerCase()}${stem.slice(1)}`;
    }
    usedQuestions.add(stem);

    // Find a relevant material sentence for grounding
    const relevantSentence = materialConcepts.sentences.find(s =>
      s.toLowerCase().includes(concept.toLowerCase()) || s.toLowerCase().includes(topic.toLowerCase())
    );

    const { answer, explanation } = generateAnswer(
      topic, concept, params.questionType, params.difficulty, bloomsLevel, relevantSentence,
    );

    const result: GeneratedQuestionResult = {
      content: stem,
      answer,
      explanation,
      type: params.questionType,
      difficulty: params.difficulty,
      bloomsLevel,
      marks: params.marks,
      topic,
      keywords: [concept, topic, ...materialConcepts.keyTerms.slice(0, 3)].filter((v, idx, a) => a.indexOf(v) === idx),
      estimatedTime: params.questionType === 'mcq' ? 2 : params.questionType === 'short' ? 5 : 15,
    };

    if (params.questionType === 'mcq') {
      const mcq = generateMCQOptions(concept, topic, params.difficulty);
      result.options = mcq.options;
      result.correctOption = mcq.correctOption;
    }

    questions.push(result);
  }

  return questions;
}

// ── Dynamic Answer Regeneration ──────────────────────────────────────────────

/**
 * Regenerates the answer when a staff member edits a question's content.
 * Uses Gemini when configured, otherwise local template-based generation.
 */
export async function regenerateAnswer(params: {
  questionContent: string;
  questionType: 'mcq' | 'short' | 'long' | 'descriptive';
  difficulty: 'easy' | 'medium' | 'hard';
  bloomsLevel: string;
  topic: string;
  marks: number;
  /** Optional material content; when set, Gemini will derive the answer only from this (e.g. AI Assistant). */
  materialContent?: string;
  /** Optional MCQ metadata to format answer with the actual correct option. */
  options?: string[];
  correctOption?: number;
}): Promise<{ answer: string; explanation: string }> {
  let useGemini = false;
  try {
    const { isGeminiConfigured } = await import('@/services/gemini/config');
    useGemini = isGeminiConfigured();
  } catch {
    // Gemini not available
  }

  if (useGemini) {
    try {
      const { regenerateAnswerWithAI } = await import('@/services/gemini/questionGenerator');
      return await regenerateAnswerWithAI(params);
    } catch (e) {
      // Fall through to local generation on any error
    }
  }

  await new Promise(r => setTimeout(r, 600));

  const words = params.questionContent
    .replace(/[?.,!;:'"()]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && w[0] === w[0].toUpperCase());
  const concept = words.length > 0 ? words[0] : params.topic;

  const out = generateAnswer(
    params.topic,
    concept,
    params.questionType,
    params.difficulty,
    params.bloomsLevel,
  );
  if (
    params.questionType === 'mcq' &&
    Array.isArray(params.options) &&
    params.options.length === 4 &&
    Number.isInteger(params.correctOption) &&
    Number(params.correctOption) >= 0 &&
    Number(params.correctOption) <= 3
  ) {
    const idx = Number(params.correctOption);
    const letter = String.fromCharCode(65 + idx);
    const optionText = params.options[idx] || '';
    return {
      answer: `Correct option: ${letter}) ${optionText}. Why: ${out.explanation || out.answer}`,
      explanation: out.explanation,
    };
  }
  return out;
}
