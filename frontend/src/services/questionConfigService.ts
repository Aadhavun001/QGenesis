import { z } from 'zod';

// ── Zod Schemas ──────────────────────────────────────────────────────────────

const BLOOMS_LEVELS = [
  'Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create', 'Mixed', 'All',
] as const;

const difficultySchema = z.enum(['easy', 'medium', 'hard']);

const questionConfigSchema = z.object({
  // Material & topic selection
  materialIds: z
    .array(z.string().min(1))
    .min(1, 'Select at least one material'),
  topics: z
    .array(z.string().trim().min(1, 'Topic cannot be empty'))
    .min(1, 'At least one topic is required'),

  // Exam & question type
  examType: z
    .string()
    .min(1, 'Exam type is required'),
  questionType: z
    .string()
    .min(1, 'Question type is required'),

  // Difficulty & Bloom's
  difficulty: difficultySchema,
  bloomsLevel: z.enum(BLOOMS_LEVELS),

  // Marks & count
  marksPerQuestion: z
    .number()
    .int()
    .min(1, 'Marks must be at least 1')
    .max(100, 'Marks cannot exceed 100'),
  numberOfQuestions: z
    .number()
    .int()
    .min(1, 'Must generate at least 1 question')
    .max(50, 'Cannot exceed 50 questions per session'),

  // Optional NLP refinements
  selectedChunkIds: z.array(z.number()).optional(),
  selectedTopicNames: z.array(z.string()).optional(),

  // Owner context (auto-filled from auth)
  staffId: z.string().min(1, 'Staff ID is required'),
  department: z.string().optional(),
  institution: z.string().optional(),
  place: z.string().optional(),
});

// ── Derived Types ────────────────────────────────────────────────────────────

export type QuestionConfigInput = z.input<typeof questionConfigSchema>;
export type QuestionConfig = z.output<typeof questionConfigSchema>;

export interface QuestionConfigValidationResult {
  success: boolean;
  config?: QuestionConfig;
  errors?: Record<string, string>;
}

// ── Resolve Bloom's "All" ────────────────────────────────────────────────────

const CONCRETE_BLOOMS = BLOOMS_LEVELS.filter(l => l !== 'All' && l !== 'Mixed');

function resolveBloomsLevel(level: typeof BLOOMS_LEVELS[number]): string {
  if (level === 'All') {
    return CONCRETE_BLOOMS[Math.floor(Math.random() * CONCRETE_BLOOMS.length)];
  }
  if (level === 'Mixed') {
    return 'Mixed';
  }
  return level;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Validates staff-defined configuration inputs and returns a structured,
 * AI-ready configuration object.  Does NOT generate questions.
 */
export function validateQuestionConfig(
  input: QuestionConfigInput,
): QuestionConfigValidationResult {
  const result = questionConfigSchema.safeParse(input);

  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.');
      if (!fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return { success: false, errors: fieldErrors };
  }

  return { success: true, config: result.data };
}

/**
 * Builds the final structured configuration object that can be consumed by
 * an AI question-generation service.  Resolves dynamic values (e.g. "All"
 * Bloom's level) and attaches material content context.
 */
export function buildAIReadyConfig(
  config: QuestionConfig,
  materialContentMap: Record<string, string>,
) {
  const resolvedBloomsLevel = resolveBloomsLevel(config.bloomsLevel);

  // Gather content from selected materials
  const materialContent = config.materialIds
    .map(id => materialContentMap[id] ?? '')
    .filter(Boolean)
    .join('\n\n');

  return {
    topics: config.topics,
    examType: config.examType,
    questionType: config.questionType,
    difficulty: config.difficulty,
    bloomsLevel: resolvedBloomsLevel,
    marksPerQuestion: config.marksPerQuestion,
    numberOfQuestions: config.numberOfQuestions,
    materialContent: materialContent || undefined,
    selectedChunkIds: config.selectedChunkIds,
    selectedTopicNames: config.selectedTopicNames,
    staffId: config.staffId,
    department: config.department,
    institution: config.institution,
    place: config.place,
  };
}

export { questionConfigSchema, BLOOMS_LEVELS };
