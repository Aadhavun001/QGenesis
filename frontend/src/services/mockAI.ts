// Mock AI Service for generating questions and chat responses
// This simulates AI behavior without requiring external APIs

const MOCK_DELAY = 1500;

const BLOOMS_LEVELS = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];

const QUESTION_TEMPLATES = {
  mcq: {
    easy: [
      'What is the definition of {topic}?',
      'Which of the following best describes {topic}?',
      'The term {topic} refers to:',
    ],
    medium: [
      'How does {topic} relate to the overall concept?',
      'What is the primary purpose of {topic}?',
      'Which statement about {topic} is correct?',
    ],
    hard: [
      'In what scenario would {topic} be most applicable?',
      'What distinguishes {topic} from related concepts?',
      'How would you apply {topic} in a complex situation?',
    ],
  },
  short: {
    easy: [
      'Define {topic} in your own words.',
      'List three key characteristics of {topic}.',
      'What is the basic principle behind {topic}?',
    ],
    medium: [
      'Explain the significance of {topic} in the given context.',
      'Compare and contrast {topic} with its alternatives.',
      'Describe the process involved in {topic}.',
    ],
    hard: [
      'Analyze the implications of {topic} in modern applications.',
      'Evaluate the effectiveness of {topic} in solving problems.',
      'How would you modify {topic} to improve efficiency?',
    ],
  },
  long: {
    easy: [
      'Describe {topic} with suitable examples.',
      'Explain the concept of {topic} and its applications.',
      'Write a detailed note on {topic}.',
    ],
    medium: [
      'Critically analyze {topic} and its role in the field.',
      'Compare different approaches to implementing {topic}.',
      'Discuss the advantages and disadvantages of {topic}.',
    ],
    hard: [
      'Design a comprehensive solution using {topic} principles.',
      'Evaluate and propose improvements to current {topic} methodologies.',
      'Synthesize your understanding of {topic} to create a new framework.',
    ],
  },
  descriptive: {
    easy: [
      'Give a brief overview of {topic}.',
      'What are the fundamental aspects of {topic}?',
      'Describe the basic structure of {topic}.',
    ],
    medium: [
      'Elaborate on the various components of {topic}.',
      'How is {topic} implemented in practical scenarios?',
      'Discuss the theoretical foundations of {topic}.',
    ],
    hard: [
      'Provide a comprehensive analysis of {topic} with real-world case studies.',
      'Design and justify an innovative approach to {topic}.',
      'Critically evaluate existing literature on {topic}.',
    ],
  },
};

const ANSWER_TEMPLATES = {
  mcq: {
    easy: ['The correct answer demonstrates basic understanding of the concept.', 'This option accurately defines the term as per standard definitions.'],
    medium: ['This answer correctly identifies the relationship and primary characteristics.', 'The option represents the most accurate interpretation based on context.'],
    hard: ['This answer shows advanced application and critical thinking about the concept.', 'The correct option demonstrates synthesis of multiple concepts.'],
  },
  short: {
    easy: ['{topic} is a fundamental concept that refers to... It has several key characteristics including...'],
    medium: ['{topic} plays a significant role in... The main aspects to consider are... This relates to other concepts through...'],
    hard: ['A comprehensive analysis of {topic} reveals... The implications include... This can be enhanced by...'],
  },
  long: {
    easy: ['Introduction: {topic} is defined as...\n\nMain Body: The key aspects include...\n\nExamples: Consider the following scenarios...\n\nConclusion: In summary...'],
    medium: ['Introduction: {topic} represents an important concept...\n\nAnalysis: When examining this from multiple perspectives...\n\nComparison: Compared to alternatives...\n\nConclusion: The significance lies in...'],
    hard: ['Comprehensive Overview: {topic} encompasses...\n\nCritical Analysis: From theoretical and practical standpoints...\n\nProposed Framework: Based on this analysis...\n\nFuture Implications: This suggests that...'],
  },
  descriptive: {
    easy: ['A brief overview of {topic}:\n\n1. Definition and scope\n2. Basic components\n3. Simple applications'],
    medium: ['Detailed examination of {topic}:\n\n1. Theoretical foundation\n2. Practical implementation\n3. Key considerations\n4. Common challenges'],
    hard: ['Comprehensive analysis of {topic}:\n\n1. Historical context and evolution\n2. Current state of research\n3. Critical evaluation\n4. Innovative approaches\n5. Future directions'],
  },
};

const MCQ_OPTIONS_TEMPLATES = [
  ['Option A - Correct definition', 'Option B - Common misconception', 'Option C - Partially correct', 'Option D - Unrelated concept'],
  ['All of the above', 'None of the above', 'Primary characteristic', 'Secondary feature'],
  ['Theoretical approach', 'Practical implementation', 'Both A and B', 'Neither A nor B'],
];

export interface GenerateQuestionsParams {
  topics: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  questionType: 'mcq' | 'short' | 'long' | 'descriptive';
  bloomsLevel: string;
  marks: number;
  numberOfQuestions: number;
  materialContent?: string;
}

export interface GeneratedQuestionResult {
  content: string;
  answer: string;
  type: 'mcq' | 'short' | 'long' | 'descriptive';
  difficulty: 'easy' | 'medium' | 'hard';
  bloomsLevel: string;
  marks: number;
  topic: string;
  options?: string[];
  correctOption?: number;
}

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateMockQuestion(params: GenerateQuestionsParams, topic: string): GeneratedQuestionResult {
  const templates = QUESTION_TEMPLATES[params.questionType][params.difficulty];
  const answerTemplates = ANSWER_TEMPLATES[params.questionType][params.difficulty];
  
  const questionTemplate = getRandomItem(templates);
  const answerTemplate = getRandomItem(answerTemplates);
  
  const content = questionTemplate.replace(/{topic}/g, topic);
  const answer = answerTemplate.replace(/{topic}/g, topic);
  
  const result: GeneratedQuestionResult = {
    content,
    answer,
    type: params.questionType,
    difficulty: params.difficulty,
    bloomsLevel: params.bloomsLevel,
    marks: params.marks,
    topic,
  };
  
  if (params.questionType === 'mcq') {
    const options = getRandomItem(MCQ_OPTIONS_TEMPLATES).map(opt => 
      opt.replace(/{topic}/g, topic)
    );
    result.options = options;
    result.correctOption = 0;
  }
  
  return result;
}

export async function generateQuestions(params: GenerateQuestionsParams): Promise<GeneratedQuestionResult[]> {
  await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
  
  const questions: GeneratedQuestionResult[] = [];
  const questionsPerTopic = Math.ceil(params.numberOfQuestions / params.topics.length);
  
  for (const topic of params.topics) {
    for (let i = 0; i < questionsPerTopic && questions.length < params.numberOfQuestions; i++) {
      questions.push(generateMockQuestion(params, topic));
    }
  }
  
  return questions;
}

// Chat AI responses
const CHAT_RESPONSES = {
  greeting: [
    "Hello! I'm your AI Question Assistant. I can help you generate questions, improve existing ones, or discuss question design strategies. What would you like to work on today?",
    "Welcome! I'm here to assist with question creation and refinement. You can ask me to generate questions, suggest improvements, or explain Bloom's Taxonomy levels. How can I help?",
  ],
  questionImprovement: [
    "Great question! Here are some suggestions to enhance it:\n\n1. **Clarity**: Consider rephrasing for clearer understanding\n2. **Bloom's Level**: You could elevate this to a higher cognitive level\n3. **Grammar**: The structure is correct, but consider adding more specificity\n\nWould you like me to provide a revised version?",
    "I've analyzed your question. Here's my feedback:\n\n**Strengths**: Good topic coverage and appropriate difficulty\n**Improvements**: \n- Add more context for better understanding\n- Consider alternative question formats\n- Align more closely with learning objectives\n\nShall I rewrite it for you?",
  ],
  questionGeneration: [
    "Based on your requirements, I've generated the following questions:\n\n1. [Question tailored to your specifications]\n2. [Alternative approach to the same concept]\n3. [Higher-order thinking variation]\n\nWould you like me to adjust any of these or generate more?",
    "Here are some questions I've created:\n\n**Easy Level**: Basic recall and understanding\n**Medium Level**: Application and analysis\n**Hard Level**: Evaluation and creation\n\nLet me know which style works best for your needs!",
  ],
  bloomsTaxonomy: [
    "Bloom's Taxonomy consists of six cognitive levels:\n\n1. **Remember**: Recall facts and basic concepts\n2. **Understand**: Explain ideas or concepts\n3. **Apply**: Use information in new situations\n4. **Analyze**: Draw connections among ideas\n5. **Evaluate**: Justify decisions or actions\n6. **Create**: Produce new or original work\n\nWhich level would you like to focus on?",
  ],
  general: [
    "I understand you want to work on questions. Could you provide more details about:\n- The subject or topic\n- Difficulty level (easy/medium/hard)\n- Question type (MCQ/Short/Long/Descriptive)\n- Number of questions needed\n\nThis will help me generate more relevant questions for you!",
    "That's an interesting request! To help you better, please share:\n- Specific topics or concepts to cover\n- Target audience (students' level)\n- Assessment purpose (formative/summative)\n\nWith this information, I can tailor my assistance more effectively.",
  ],
};

function analyzeMessage(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
    return getRandomItem(CHAT_RESPONSES.greeting);
  }
  
  if (lowerMessage.includes('improve') || lowerMessage.includes('better') || lowerMessage.includes('enhance') || lowerMessage.includes('grammar')) {
    return getRandomItem(CHAT_RESPONSES.questionImprovement);
  }
  
  if (lowerMessage.includes('generate') || lowerMessage.includes('create') || lowerMessage.includes('make question')) {
    return getRandomItem(CHAT_RESPONSES.questionGeneration);
  }
  
  if (lowerMessage.includes('bloom') || lowerMessage.includes('taxonomy') || lowerMessage.includes('cognitive')) {
    return getRandomItem(CHAT_RESPONSES.bloomsTaxonomy);
  }
  
  return getRandomItem(CHAT_RESPONSES.general);
}

export async function getChatResponse(message: string): Promise<string> {
  await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
  return analyzeMessage(message);
}

export function extractTopicsFromContent(content: string): string[] {
  // Mock topic extraction - in real implementation, this would use NLP
  const commonTopics = [
    'Introduction',
    'Fundamentals',
    'Core Concepts',
    'Advanced Topics',
    'Applications',
    'Case Studies',
    'Best Practices',
    'Implementation',
  ];
  
  // Return 3-5 random topics to simulate extraction
  const numTopics = 3 + Math.floor(Math.random() * 3);
  const shuffled = [...commonTopics].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, numTopics);
}

export { BLOOMS_LEVELS };