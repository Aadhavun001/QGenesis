// Smart AI Service with natural conversation and intelligent question generation
// Analyzes materials and generates unique, non-repetitive questions

import { UploadedMaterial } from '@/stores/questionStore';

export interface GeneratedQuestion {
  id: string;
  content: string;
  answer: string;
  type: 'mcq' | 'short' | 'long' | 'descriptive';
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
  options?: string[];
  isEditing?: boolean;
  isSaved?: boolean;
  correctOption?: number;
  marks?: number;
  bloomsLevel?: string;
  isTwisted?: boolean;
}

export interface ConversationContext {
  materials: UploadedMaterial[];
  selectedMaterialId: string | null;
  generatedQuestions: GeneratedQuestion[];
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  // RAG context: pre-retrieved material chunks for OpenAI prompt injection
  materialChunksContext?: string;
}

// Track generated questions to avoid repetition
const generatedQuestionsCache: Set<string> = new Set();

// Topic-specific question patterns
const QUESTION_PATTERNS = {
  mcq: {
    easy: [
      'Which of the following best defines {topic}?',
      'What is the primary purpose of {topic}?',
      '{topic} is characterized by:',
      'Which statement about {topic} is TRUE?',
      'The main function of {topic} is:',
    ],
    medium: [
      'In the context of {topic}, which approach is most effective?',
      'How does {topic} differ from related concepts?',
      'Which of the following demonstrates correct application of {topic}?',
      'What is the relationship between {topic} and its components?',
      'Which factor most influences {topic}?',
    ],
    hard: [
      'Which scenario best illustrates the limitations of {topic}?',
      'In a complex system involving {topic}, what would be the optimal strategy?',
      'How would modifications to {topic} affect overall performance?',
      'Which combination of factors would most impact {topic}?',
      'What distinguishes advanced implementations of {topic}?',
    ],
  },
  short: {
    easy: [
      'Define {topic} in brief.',
      'List three characteristics of {topic}.',
      'What is the basic concept of {topic}?',
      'Explain {topic} in simple terms.',
      'State the purpose of {topic}.',
    ],
    medium: [
      'Compare {topic} with an alternative approach.',
      'Explain the significance of {topic} in this context.',
      'Describe how {topic} is implemented.',
      'What are the key considerations when using {topic}?',
      'Analyze the role of {topic} in the given scenario.',
    ],
    hard: [
      'Evaluate the effectiveness of {topic} in complex scenarios.',
      'Propose improvements to {topic} methodology.',
      'Critically analyze the limitations of {topic}.',
      'How would you optimize {topic} for better results?',
      'Justify the selection of {topic} over alternatives.',
    ],
  },
  long: {
    easy: [
      'Describe {topic} with suitable examples.',
      'Explain the concept of {topic} and its applications.',
      'Write a detailed note on {topic}.',
      'Discuss the fundamentals of {topic}.',
      'Elaborate on the key aspects of {topic}.',
    ],
    medium: [
      'Analyze {topic} from multiple perspectives.',
      'Compare and contrast different approaches to {topic}.',
      'Discuss the advantages and limitations of {topic}.',
      'Explain the implementation of {topic} with a case study.',
      'Evaluate the impact of {topic} on the field.',
    ],
    hard: [
      'Design a comprehensive solution using {topic} principles.',
      'Critically evaluate existing approaches to {topic} and propose innovations.',
      'Synthesize your understanding of {topic} to create a new framework.',
      'Develop a detailed analysis of {topic} with research implications.',
      'Create an integrated approach combining {topic} with modern techniques.',
    ],
  },
  descriptive: {
    easy: [
      'Give a detailed overview of {topic}.',
      'What are the fundamental aspects of {topic}?',
      'Describe the structure and components of {topic}.',
      'Explain the working mechanism of {topic}.',
      'Outline the basic principles behind {topic}.',
    ],
    medium: [
      'Elaborate on various implementations of {topic}.',
      'How is {topic} applied in practical scenarios?',
      'Discuss the theoretical foundations of {topic}.',
      'Explain the evolution and development of {topic}.',
      'Analyze the components and their interactions in {topic}.',
    ],
    hard: [
      'Provide a comprehensive analysis of {topic} with real-world case studies.',
      'Design an innovative approach to {topic} and justify your choices.',
      'Critically evaluate existing literature on {topic}.',
      'Develop a detailed framework for implementing {topic}.',
      'Create a comprehensive research proposal on {topic}.',
    ],
  },
};

// Twisted/Tricky question patterns - tests deep understanding with conceptual traps
const TWISTED_QUESTION_PATTERNS = {
  mcq: [
    'Which of the following statements about {topic} appears correct but is actually FALSE?',
    'A student claims that {topic} always results in [common misconception]. What is the MOST accurate rebuttal?',
    'All of the following are true about {topic} EXCEPT:',
    'Consider this scenario involving {topic}: [seemingly obvious situation]. Which counter-intuitive outcome is CORRECT?',
    'Which common assumption about {topic} is a conceptual trap?',
    'If {topic} were applied in a contradictory context, which outcome would be LEAST expected?',
  ],
  short: [
    'Explain why the most intuitive interpretation of {topic} can lead to incorrect conclusions.',
    'Identify and correct a common misconception about {topic} that even advanced students make.',
    'How can two seemingly contradictory aspects of {topic} both be correct? Explain briefly.',
    'What subtle distinction in {topic} do students most frequently overlook?',
    'Describe a scenario where a standard application of {topic} would produce unexpected results.',
  ],
  long: [
    'A student provides a seemingly perfect analysis of {topic} but reaches an incorrect conclusion. Write the flawed analysis and then critically identify where the reasoning breaks down.',
    'Compare two competing interpretations of {topic}. Show how one appears correct superficially but fails under deeper scrutiny.',
    'Design a case study involving {topic} where the obvious answer is wrong. Present the scenario and provide the correct analysis with justification.',
    'Critically evaluate a common textbook explanation of {topic}. Where does it oversimplify, and what nuances does it miss?',
  ],
  descriptive: [
    'Present a paradox or counter-intuitive aspect of {topic}. Describe why it confuses learners and how to resolve the apparent contradiction.',
    'Write a detailed analysis of the boundary conditions of {topic} — situations where standard rules or definitions break down.',
    'Provide an exhaustive comparison of {topic} with a commonly confused concept. Highlight the subtle but critical differences.',
    'Describe the evolution of understanding in {topic}: from common misconceptions to expert-level comprehension.',
  ],
};

const MCQ_OPTIONS_SETS = [
  ['Correct interpretation based on core principles', 'Common misconception about the concept', 'Partially correct but incomplete', 'Unrelated or opposite concept'],
  ['All of the mentioned aspects', 'None of the mentioned aspects', 'Only the primary characteristic', 'Only the secondary feature'],
  ['Integrated approach combining multiple elements', 'Single-factor solution', 'Both theoretical and practical aspects', 'Neither approach is suitable'],
  ['Process-oriented methodology', 'Result-oriented approach', 'Combination of both approaches', 'Alternative unconventional method'],
];

const ANSWER_GENERATORS = {
  mcq: (topic: string, difficulty: string) => `The correct answer demonstrates ${difficulty === 'easy' ? 'basic understanding' : difficulty === 'medium' ? 'analytical thinking' : 'advanced synthesis'} of ${topic}. This option accurately captures the essential characteristics and is supported by established principles.`,
  short: (topic: string, difficulty: string) => {
    if (difficulty === 'easy') return `${topic} refers to [fundamental definition]. Key characteristics include: 1) [primary aspect], 2) [secondary aspect], 3) [tertiary aspect]. This concept is essential for understanding the broader context.`;
    if (difficulty === 'medium') return `${topic} plays a significant role in [context]. When comparing to alternatives: [comparison]. The main considerations include [key points]. This understanding enables effective application in various scenarios.`;
    return `A comprehensive analysis of ${topic} reveals [in-depth insights]. The effectiveness can be enhanced by [improvements]. Critical evaluation shows [analysis results]. Future implications suggest [forward-looking perspective].`;
  },
  long: (topic: string, difficulty: string) => {
    if (difficulty === 'easy') return `**Introduction:** ${topic} is a fundamental concept that [overview].\n\n**Main Points:**\n1. [First key aspect]\n2. [Second key aspect]\n3. [Third key aspect]\n\n**Examples:** [Practical illustrations]\n\n**Conclusion:** In summary, ${topic} is essential because [significance].`;
    if (difficulty === 'medium') return `**Introduction:** ${topic} represents a critical concept in [field].\n\n**Analysis:**\n- From theoretical perspective: [theory]\n- From practical standpoint: [practice]\n\n**Comparison:** When compared to alternatives: [analysis]\n\n**Applications:** [Real-world uses]\n\n**Conclusion:** The significance of ${topic} lies in [importance].`;
    return `**Comprehensive Overview:** ${topic} encompasses [broad scope].\n\n**Critical Analysis:**\n1. Theoretical foundations: [deep theory]\n2. Practical implementations: [advanced practice]\n3. Research implications: [scholarly aspects]\n\n**Proposed Framework:** Based on analysis: [innovative approach]\n\n**Future Directions:** [Forward-looking insights]\n\n**Conclusion:** ${topic} represents [summary of significance].`;
  },
  descriptive: (topic: string, difficulty: string) => {
    return ANSWER_GENERATORS.long(topic, difficulty);
  },
};

// Natural conversation patterns
const CONVERSATION_INTENTS = {
  greeting: /\b(hello|hi|hey|good morning|good afternoon|good evening)\b/i,
  twistedQuestions: /\b(twist|twisted|tricky|confus|conceptual trap|mislead|trick question|brain teas|catch question|gotcha|deceptive|mind.?bend|thought.?provok|counter.?intuitive|paradox|subtle|nuance|deep understanding|higher.?order|critical think|analytical)\b/i,
  questionGeneration: /\b(generate|create|make|give me|provide|write)\b.*\b(question|mcq|short answer|long answer|descriptive)\b/i,
  modification: /\b(change|modify|edit|update|alter|remove|add|delete|fix)\b.*\b(comma|word|phrase|question|answer|option)\b/i,
  regenerate: /\b(regenerate|redo|again|another|different|new version|try again)\b/i,
  help: /\b(help|how|what|explain|tell me|guide|assist)\b/i,
  material: /\b(material|document|file|content|upload|analyze)\b/i,
  specific: /\b(question\s*\d+|q\s*\d+|number\s*\d+|\#\d+|first|second|third|last)\b/i,
  thanks: /\b(thank|thanks|appreciate|great|good job|well done)\b/i,
  bloomsTaxonomy: /\b(bloom|taxonomy|cognitive|remember|understand|apply|analyze|evaluate|create)\b/i,
};

function extractNumberFromText(text: string): number | null {
  const match = text.match(/(?:question\s*|q\s*|number\s*|\#)(\d+)|(\bfirst\b)|(\bsecond\b)|(\bthird\b)|(\blast\b)/i);
  if (match) {
    if (match[1]) return parseInt(match[1]) - 1;
    if (match[2]) return 0;
    if (match[3]) return 1;
    if (match[4]) return 2;
    if (match[5]) return -1; // Will be handled as last
  }
  return null;
}

function parseQuestionRequest(message: string): { 
  count: number; 
  type: 'mcq' | 'short' | 'long' | 'descriptive'; 
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  isTwisted: boolean;
} {
  const lowerMsg = message.toLowerCase();
  
  // Extract count
  const countMatch = message.match(/(\d+)\s*(mcq|question|short|long|descriptive)/i) || 
                     message.match(/give me\s*(\d+)/i) ||
                     message.match(/generate\s*(\d+)/i);
  const count = countMatch ? parseInt(countMatch[1]) : 5;
  
  // Extract type
  let type: 'mcq' | 'short' | 'long' | 'descriptive' = 'mcq';
  if (lowerMsg.includes('mcq') || lowerMsg.includes('multiple choice')) type = 'mcq';
  else if (lowerMsg.includes('short')) type = 'short';
  else if (lowerMsg.includes('long') || lowerMsg.includes('paragraph')) type = 'long';
  else if (lowerMsg.includes('descriptive')) type = 'descriptive';
  
  // Extract difficulty
  let difficulty: 'easy' | 'medium' | 'hard' = 'medium';
  if (lowerMsg.includes('easy') || lowerMsg.includes('simple') || lowerMsg.includes('basic')) difficulty = 'easy';
  else if (lowerMsg.includes('hard') || lowerMsg.includes('difficult') || lowerMsg.includes('complex')) difficulty = 'hard';
  
  // Detect twisted/tricky intent
  const isTwisted = CONVERSATION_INTENTS.twistedQuestions.test(message);
  if (isTwisted) difficulty = 'hard'; // Twisted questions are always high difficulty
  
  // Extract topic - look for "on", "about", "regarding", "for"
  const topicMatch = message.match(/(?:on|about|regarding|for|topic)\s+["']?([^"'\n,]+?)["']?\s*(?:\.|$|,|with|and|or|please)/i) ||
                     message.match(/["']([^"']+)["']/);
  const topic = topicMatch ? topicMatch[1].trim() : 'the selected topic';
  
  return { count: Math.min(count, 20), type, topic, difficulty, isTwisted };
}

function generateUniqueQuestion(
  type: 'mcq' | 'short' | 'long' | 'descriptive',
  difficulty: 'easy' | 'medium' | 'hard',
  topic: string,
  existingQuestions: GeneratedQuestion[],
  isTwisted: boolean = false
): GeneratedQuestion {
  const patterns = isTwisted 
    ? TWISTED_QUESTION_PATTERNS[type] 
    : QUESTION_PATTERNS[type][difficulty];
  let attempts = 0;
  let selectedPattern: string;
  let content: string;
  
  // Try to find a unique question
  do {
    selectedPattern = patterns[Math.floor(Math.random() * patterns.length)];
    content = selectedPattern.replace(/{topic}/g, topic);
    attempts++;
  } while (
    (generatedQuestionsCache.has(content) || existingQuestions.some(q => q.content === content)) && 
    attempts < 20
  );
  
  // If still duplicate, add variation
  if (attempts >= 20) {
    const variations = isTwisted 
      ? ['Critically examine: ', 'Consider this trap: ', 'Think carefully: ', 'Counter-intuitive aspect: ']
      : ['In detail, ', 'Briefly, ', 'Specifically, ', 'Comprehensively, ', 'Critically, '];
    content = variations[Math.floor(Math.random() * variations.length)] + content.toLowerCase();
  }
  
  generatedQuestionsCache.add(content);
  
  const answer = isTwisted 
    ? generateTwistedAnswer(topic, type)
    : ANSWER_GENERATORS[type](topic, difficulty);
  
  const question: GeneratedQuestion = {
    id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    content,
    answer,
    type,
    difficulty: isTwisted ? 'hard' : difficulty,
    topic,
    bloomsLevel: isTwisted ? 'Analyze' : undefined,
    isTwisted,
  };
  
  if (type === 'mcq') {
    if (isTwisted) {
      question.options = [
        `The commonly assumed correct answer about ${topic} (actually misleading)`,
        `A subtle but correct interpretation of ${topic}`,
        `A partially correct statement that misses a key nuance`,
        `An obviously wrong answer that serves as a control option`,
      ];
      question.correctOption = 1; // The subtle correct one
    } else {
      const optionsSet = MCQ_OPTIONS_SETS[Math.floor(Math.random() * MCQ_OPTIONS_SETS.length)];
      question.options = optionsSet.map(opt => opt.replace(/{topic}/g, topic));
      question.correctOption = 0;
    }
  }
  
  return question;
}

function generateTwistedAnswer(topic: string, type: string): string {
  if (type === 'mcq') {
    return `**Why Option B is correct:** The subtle interpretation is accurate because it accounts for nuances that most students overlook in ${topic}. Option A represents the common misconception — while it appears correct at first glance, it fails to account for [critical distinction]. This question tests the ability to distinguish surface-level understanding from deep conceptual mastery.`;
  }
  if (type === 'short') {
    return `**Key Insight:** The counter-intuitive aspect of ${topic} is that [apparent contradiction]. This occurs because [underlying mechanism]. Students commonly make the mistake of assuming [misconception], but the correct understanding requires recognizing [subtle distinction].`;
  }
  return `**Critical Analysis:**\n\n**The Apparent Answer:** Most students would answer [common response], which seems logical because [surface reasoning].\n\n**Why It's Wrong/Incomplete:** This interpretation fails because [critical flaw in reasoning]. The key nuance is [subtle point].\n\n**The Correct Understanding:** ${topic} actually works by [correct mechanism]. The conceptual trap arises from [source of confusion].\n\n**Takeaway:** This demonstrates why deep understanding of ${topic} requires going beyond textbook definitions to examine [deeper principle].`;
}

function analyzeMaterial(material: UploadedMaterial): string {
  const content = material.content || '';
  const topics = material.topics || [];
  
  return `I've analyzed the material "${material.fileName}". Here's what I found:

**Document Type:** ${material.fileType}
**Size:** ${(material.fileSize / 1024).toFixed(2)} KB
**Topics Identified:** ${topics.length > 0 ? topics.join(', ') : 'General content'}

**Content Overview:**
${content.slice(0, 500)}${content.length > 500 ? '...' : ''}

I'm ready to generate questions from this material. You can ask me things like:
- "Generate 5 MCQ questions on ${topics[0] || 'this topic'}"
- "Create 3 long answer questions"
- "Give me descriptive questions on ${topics[1] || 'the main concepts'}"`;
}

export function processModificationRequest(
  message: string, 
  questions: GeneratedQuestion[], 
  questionIndex: number | null
): { updatedQuestions: GeneratedQuestion[]; response: string } {
  const lowerMsg = message.toLowerCase();
  const updatedQuestions = [...questions];
  
  let targetIndex = questionIndex;
  if (targetIndex === null) {
    targetIndex = extractNumberFromText(message);
  }
  
  if (targetIndex === -1) targetIndex = questions.length - 1;
  if (targetIndex === null || targetIndex < 0 || targetIndex >= questions.length) {
    return {
      updatedQuestions: questions,
      response: `I need to know which question you want to modify. Please specify like "change question 1" or "modify the first question".`,
    };
  }
  
  const question = updatedQuestions[targetIndex];
  
  // Handle specific modifications
  if (lowerMsg.includes('remove') && lowerMsg.includes('comma')) {
    question.content = question.content.replace(/,/g, '');
    return {
      updatedQuestions,
      response: `Done! I've removed the commas from question ${targetIndex + 1}:\n\n**Updated Question:** ${question.content}`,
    };
  }
  
  if (lowerMsg.includes('longer') || lowerMsg.includes('paragraph') || lowerMsg.includes('elaborate')) {
    question.content = `In a detailed and comprehensive manner, ${question.content.charAt(0).toLowerCase() + question.content.slice(1)} Provide thorough explanation with relevant examples and justifications.`;
    return {
      updatedQuestions,
      response: `I've made question ${targetIndex + 1} more elaborate:\n\n**Updated Question:** ${question.content}`,
    };
  }
  
  if (lowerMsg.includes('shorter') || lowerMsg.includes('brief') || lowerMsg.includes('concise')) {
    const words = question.content.split(' ');
    question.content = words.slice(0, Math.ceil(words.length * 0.6)).join(' ') + '?';
    return {
      updatedQuestions,
      response: `I've made question ${targetIndex + 1} more concise:\n\n**Updated Question:** ${question.content}`,
    };
  }
  
  if (lowerMsg.includes('easier') || lowerMsg.includes('simple')) {
    question.difficulty = 'easy';
    question.content = question.content.replace(/analyze|evaluate|synthesize|critical/gi, 'describe');
    return {
      updatedQuestions,
      response: `I've simplified question ${targetIndex + 1}:\n\n**Updated Question:** ${question.content}`,
    };
  }
  
  if (lowerMsg.includes('harder') || lowerMsg.includes('difficult') || lowerMsg.includes('complex')) {
    question.difficulty = 'hard';
    question.content = `Critically analyze and evaluate: ${question.content}`;
    return {
      updatedQuestions,
      response: `I've made question ${targetIndex + 1} more challenging:\n\n**Updated Question:** ${question.content}`,
    };
  }
  
  return {
    updatedQuestions,
    response: `I understand you want to modify question ${targetIndex + 1}. Could you be more specific? For example:
- "Remove the comma from question ${targetIndex + 1}"
- "Make it longer/shorter"
- "Make it easier/harder"`,
  };
}

export async function getSmartResponse(
  message: string,
  context: ConversationContext
): Promise<{ response: string; questions: GeneratedQuestion[] | null; action: string; suggestions?: string[] }> {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700));
  
  const lowerMsg = message.toLowerCase();
  
  // Check intents
  if (CONVERSATION_INTENTS.greeting.test(message)) {
    const selectedMaterial = context.materials.find(m => m.id === context.selectedMaterialId);
    const materialInfo = selectedMaterial 
      ? `\n\nI see you have "${selectedMaterial.fileName}" selected. I've analyzed it and I'm ready to generate questions from it!`
      : context.materials.length > 0 
        ? `\n\nI notice you have ${context.materials.length} material(s) uploaded. Select one and I can generate questions from it!`
        : '';
    
    return {
      response: `Hello! I'm your AI Question Assistant. I can help you generate unique questions, modify existing ones, or analyze your study materials.${materialInfo}\n\nTry asking me:\n• "Generate 5 MCQ questions on data structures"\n• "Create twisted tricky questions about algorithms"\n• "Make question 2 easier"`,
      questions: null,
      action: 'greeting',
      suggestions: ['Generate 5 MCQ questions', 'Create twisted tricky questions', 'Analyze my material', 'Explain Bloom\'s Taxonomy'],
    };
  }
  
  if (CONVERSATION_INTENTS.thanks.test(message)) {
    return {
      response: `You're welcome! 😊 Is there anything else you'd like me to help with? I can generate more questions, modify existing ones, or help you understand concepts better.`,
      questions: null,
      action: 'thanks',
      suggestions: ['Generate more questions', 'Create twisted questions', 'Analyze my material'],
    };
  }
  
  if (CONVERSATION_INTENTS.bloomsTaxonomy.test(message)) {
    return {
      response: `**Bloom's Taxonomy** is a framework for categorizing educational goals. Here are the six cognitive levels:

1. **Remember** 📚 - Recall facts and basic concepts
   *Example: "Define photosynthesis"*

2. **Understand** 💡 - Explain ideas or concepts
   *Example: "Explain how photosynthesis works"*

3. **Apply** 🔧 - Use information in new situations
   *Example: "Calculate the rate of photosynthesis"*

4. **Analyze** 🔍 - Draw connections among ideas
   *Example: "Compare photosynthesis in C3 and C4 plants"*

5. **Evaluate** ⚖️ - Justify a decision or course of action
   *Example: "Assess the efficiency of photosynthesis"*

6. **Create** 🎨 - Produce new or original work
   *Example: "Design an experiment to test photosynthesis"*

Would you like me to generate questions targeting a specific Bloom's level?`,
      questions: null,
      action: 'bloom_explanation',
      suggestions: ['Generate Analyze-level questions', 'Create Evaluate questions', 'Mix all Bloom\'s levels', 'Generate twisted conceptual questions'],
    };
  }

  // TWISTED / TRICKY QUESTION INTENT — check before regular generation  
  if (CONVERSATION_INTENTS.twistedQuestions.test(message)) {
    const { count, type, topic } = parseQuestionRequest(message);
    
    let finalTopic = topic;
    if (topic === 'the selected topic' && context.selectedMaterialId) {
      const material = context.materials.find(m => m.id === context.selectedMaterialId);
      if (material && material.topics.length > 0) {
        finalTopic = material.topics[Math.floor(Math.random() * material.topics.length)];
      }
    }
    
    const questions: GeneratedQuestion[] = [];
    for (let i = 0; i < count; i++) {
      questions.push(generateUniqueQuestion(type, 'hard', finalTopic, questions, true));
    }
    
    const typeLabels = { mcq: 'MCQ', short: 'Short Answer', long: 'Long Answer', descriptive: 'Descriptive' };
    
    let response = `🧠 **Twisted & Tricky Questions Generated!**\n\nI've created **${count} conceptually challenging ${typeLabels[type]} questions** on **${finalTopic}** designed to test deep understanding and expose common misconceptions.\n\n`;
    questions.forEach((q, i) => {
      response += `**${i + 1}. 🔥** ${q.content}\n`;
      if (type === 'mcq' && q.options) {
        q.options.forEach((opt, j) => {
          response += `   ${String.fromCharCode(65 + j)}) ${opt}${j === q.correctOption ? ' ✓' : ''}\n`;
        });
      }
      response += `   **Answer:** ${q.answer.slice(0, 200)}${q.answer.length > 200 ? '...' : ''}\n\n`;
    });
    
    response += `\n⚡ **These questions feature:**\n- Conceptual traps & misleading options\n- Counter-intuitive scenarios\n- Common misconception exposure\n- Bloom's Taxonomy: Analyze/Evaluate level\n\n💡 Want me to adjust the difficulty or try different tricky angles?`;
    
    return {
      response,
      questions,
      action: 'generate_twisted',
      suggestions: ['Make even more twisted', 'Generate normal difficulty', 'Change to descriptive type', 'Add more conceptual traps', 'Save all to bank'],
    };
  }
  
  if (CONVERSATION_INTENTS.regenerate.test(message)) {
    if (context.generatedQuestions.length === 0) {
      return {
        response: `I don't have any questions to regenerate. Would you like me to generate some new questions? Just tell me the topic, type, and how many you need!`,
        questions: null,
        action: 'no_questions',
      };
    }
    
    const targetIndex = extractNumberFromText(message);
    
    if (targetIndex !== null) {
      // Regenerate specific question
      const idx = targetIndex === -1 ? context.generatedQuestions.length - 1 : targetIndex;
      if (idx >= 0 && idx < context.generatedQuestions.length) {
        const oldQuestion = context.generatedQuestions[idx];
        const newQuestion = generateUniqueQuestion(
          oldQuestion.type, 
          oldQuestion.difficulty, 
          oldQuestion.topic,
          context.generatedQuestions
        );
        newQuestion.id = oldQuestion.id;
        
        const updatedQuestions = [...context.generatedQuestions];
        updatedQuestions[idx] = newQuestion;
        
        return {
          response: `I've regenerated question ${idx + 1}:\n\n**New Question:** ${newQuestion.content}\n\n**Answer:** ${newQuestion.answer}`,
          questions: updatedQuestions,
          action: 'regenerate_single',
        };
      }
    }
    
    // Regenerate all
    const lastQuestion = context.generatedQuestions[0];
    const newQuestions = [];
    for (let i = 0; i < context.generatedQuestions.length; i++) {
      const q = context.generatedQuestions[i];
      newQuestions.push(generateUniqueQuestion(q.type, q.difficulty, q.topic, newQuestions));
    }
    
    return {
      response: `I've regenerated all ${newQuestions.length} questions with fresh content. Here they are:\n\n${newQuestions.map((q, i) => `**${i + 1}.** ${q.content}`).join('\n\n')}`,
      questions: newQuestions,
      action: 'regenerate_all',
    };
  }
  
  if (CONVERSATION_INTENTS.modification.test(message)) {
    const result = processModificationRequest(message, context.generatedQuestions, null);
    return {
      response: result.response,
      questions: result.updatedQuestions,
      action: 'modification',
      suggestions: ['Make it twisted', 'Regenerate all', 'Save to bank', 'Generate more'],
    };
  }
  
  if (CONVERSATION_INTENTS.questionGeneration.test(message)) {
    const { count, type, topic, difficulty, isTwisted } = parseQuestionRequest(message);
    
    // Get topic from selected material if not specified
    let finalTopic = topic;
    if (topic === 'the selected topic' && context.selectedMaterialId) {
      const material = context.materials.find(m => m.id === context.selectedMaterialId);
      if (material && material.topics.length > 0) {
        finalTopic = material.topics[Math.floor(Math.random() * material.topics.length)];
      }
    }
    
    const questions: GeneratedQuestion[] = [];
    for (let i = 0; i < count; i++) {
      questions.push(generateUniqueQuestion(type, difficulty, finalTopic, questions, isTwisted));
    }
    
    const typeLabels = { mcq: 'MCQ', short: 'Short Answer', long: 'Long Answer', descriptive: 'Descriptive' };
    
    let response = `Here are ${count} unique ${typeLabels[type]} questions on **${finalTopic}** (${difficulty} difficulty):\n\n`;
    questions.forEach((q, i) => {
      response += `**${i + 1}.** ${q.content}\n`;
      if (type === 'mcq' && q.options) {
        q.options.forEach((opt, j) => {
          response += `   ${String.fromCharCode(65 + j)}) ${opt}\n`;
        });
      }
      response += `   **Answer:** ${q.answer.slice(0, 150)}${q.answer.length > 150 ? '...' : ''}\n\n`;
    });
    
    response += `\n💡 **Tips:**\n- Edit any question by clicking the edit icon\n- Say "regenerate question 3" to get a different version\n- Say "make question 1 harder" to adjust difficulty`;
    
    return {
      response,
      questions,
      action: 'generate',
      suggestions: ['Make these twisted', 'Generate 5 more', 'Change difficulty', 'Save all to bank', 'Try different question type'],
    };
  }
  
  if (CONVERSATION_INTENTS.material.test(message) && context.selectedMaterialId) {
    const material = context.materials.find(m => m.id === context.selectedMaterialId);
    if (material) {
      return {
        response: analyzeMaterial(material),
        questions: null,
        action: 'analyze_material',
        suggestions: ['Generate MCQ from this material', 'Create twisted questions', 'Generate descriptive questions', 'Focus on first topic'],
      };
    }
  }
  
  if (CONVERSATION_INTENTS.help.test(message)) {
    return {
      response: `I'm here to help you with question generation! Here's what I can do:

**🎯 Generate Questions**
- "Generate 5 MCQ questions on software testing"
- "Create 3 long answer questions about databases"
- "Give me easy questions on networking"

**🧠 Twisted & Tricky Questions**
- "Create twisted tricky questions on data structures"
- "Generate confusing MCQs with conceptual traps"
- "Make mind-bending questions about algorithms"

**✏️ Modify Questions**
- "Make question 2 longer"
- "Remove comma from question 1"
- "Make the last question harder"

**🔄 Regenerate Questions**
- "Regenerate question 3"
- "Give me different questions"
- "Try again with new questions"

**📚 Material Analysis**
- Select a material and I'll analyze it for topics
- I can generate questions directly from your uploaded content

**🧬 Bloom's Taxonomy**
- Ask me about Bloom's levels
- Request questions at specific cognitive levels

What would you like to do?`,
      questions: null,
      action: 'help',
      suggestions: ['Generate 5 MCQ questions', 'Create twisted questions', 'Analyze my material', 'Explain Bloom\'s Taxonomy'],
    };
  }
  
  // Default response for unrecognized input
  return {
    response: `I understand you're asking about "${message.slice(0, 50)}${message.length > 50 ? '...' : ''}". 

To help you better, try being specific:
- **Generate questions:** "Generate 5 MCQ on [topic]"
- **Twisted questions:** "Create twisted tricky questions on [topic]"
- **Modify questions:** "Make question 1 shorter"
- **Get help:** "How can you help me?"

${context.selectedMaterialId ? "I see you have a material selected. Want me to generate questions from it?" : ""}`,
    questions: null,
    action: 'clarify',
    suggestions: ['Generate 5 MCQ questions', 'Create twisted questions', 'Help me get started', 'What can you do?'],
  };
}

export function clearQuestionCache() {
  generatedQuestionsCache.clear();
}
