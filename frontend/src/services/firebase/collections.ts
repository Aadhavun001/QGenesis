/**
 * Firestore Collection Names and Schema Definitions
 * 
 * This file defines all Firestore collection names and their document schemas.
 * These schemas match the existing TypeScript interfaces in the app.
 */

/**
 * Collection Names - Use these constants when referencing collections
 */
export const COLLECTIONS = {
  // User Management
  USERS: 'users',
  USER_ROLES: 'user_roles',
  BLOCKED_USERS: 'blocked_users',
  /** Maps normalized phone (doc id) to existing user uid for phone-login → same account */
  PHONE_TO_UID: 'phone_to_uid',
  
  // Questions & Materials
  QUESTIONS: 'questions',
  GENERATED_QUESTIONS: 'generated_questions',
  DELETED_QUESTIONS: 'deleted_questions',
  MATERIALS: 'materials',
  QUESTION_BANK: 'question_bank',
  
  // Question Papers
  PAPERS: 'papers',
  DELETED_PAPERS: 'deleted_papers',
  
  // Notifications
  NOTIFICATIONS: 'notifications',
  
  // Chat & AI Assistant
  CHAT_SESSIONS: 'chat_sessions',
  CHAT_MESSAGES: 'chat_messages',
  /** Public share links for chat sessions (HTML/text export + viewer) */
  CHAT_SHARES: 'chat_shares',
  
  // Configuration
  EXAM_TYPES: 'exam_types',
  QUESTION_TYPES: 'question_types',
  DEPARTMENTS: 'departments',
  
  // Security & Audit
  SECURITY_HISTORY: 'security_history',
  
  // Settings
  APP_SETTINGS: 'app_settings',
  USER_ACTIVITIES: 'user_activities',
  NOTIFICATION_SETTINGS: 'notification_settings',
  
  // Feedback
  FEEDBACKS: 'feedbacks',
} as const;

/**
 * Subcollection paths
 */
export const SUBCOLLECTIONS = {
  // User subcollections
  USER_NOTIFICATIONS: (userId: string) => `${COLLECTIONS.USERS}/${userId}/notifications`,
  USER_SETTINGS: (userId: string) => `${COLLECTIONS.USERS}/${userId}/settings`,
  
  // Chat subcollections
  SESSION_MESSAGES: (sessionId: string) => `${COLLECTIONS.CHAT_SESSIONS}/${sessionId}/messages`,
  
  // Paper subcollections
  PAPER_SECTIONS: (paperId: string) => `${COLLECTIONS.PAPERS}/${paperId}/sections`,
  SECTION_QUESTIONS: (paperId: string, sectionId: string) => 
    `${COLLECTIONS.PAPERS}/${paperId}/sections/${sectionId}/questions`,

  // Material subcollections (NLP analysis) — top-level (legacy) or under user
  MATERIAL_CHUNKS: (materialId: string) => `${COLLECTIONS.MATERIALS}/${materialId}/chunks`,
  MATERIAL_TOPICS: (materialId: string) => `${COLLECTIONS.MATERIALS}/${materialId}/topics`,

  // User-scoped materials: everything under the user who uploaded
  USER_MATERIALS: (userId: string) => `${COLLECTIONS.USERS}/${userId}/materials`,
  USER_MATERIAL_CHUNKS: (userId: string, materialId: string) =>
    `${COLLECTIONS.USERS}/${userId}/materials/${materialId}/chunks`,
  USER_MATERIAL_TOPICS: (userId: string, materialId: string) =>
    `${COLLECTIONS.USERS}/${userId}/materials/${materialId}/topics`,
} as const;

/**
 * Document Schema Definitions (for reference and validation)
 * These match the existing TypeScript interfaces
 */
export const SCHEMAS = {
  /**
   * users/{userId}
   */
  user: {
    id: 'string',
    email: 'string',
    phone: 'string?',
    displayName: 'string',
    role: 'staff | hod | admin',
    department: 'string?',
    institution: 'string?',
    place: 'string?',
    avatar: 'string?',
    avatarPosition: '{ x: number, y: number }?',
    avatarZoom: 'number?',
    useDefaultAvatar: 'boolean?',
    dashboardColor: 'string?',
    customGradientStart: 'string?',
    customGradientEnd: 'string?',
    status: 'active | blocked',
    createdAt: 'timestamp',
    updatedAt: 'timestamp',
  },

  /**
   * questions/{questionId}
   */
  question: {
    id: 'string',
    content: 'string',
    answer: 'string',
    type: 'string',
    difficulty: 'easy | medium | hard',
    bloomsLevel: 'string',
    marks: 'number',
    topic: 'string',
    source: 'upload | ai-assistant',
    materialId: 'string?',
    status: 'draft | pending | approved | rejected',
    feedback: 'string?',
    options: 'string[]?',
    correctOption: 'number?',
    examType: 'string?',
    department: 'string?',
    institution: 'string?',
    place: 'string?',
    staffId: 'string?',
    isLocked: 'boolean?',
    lockedAt: 'timestamp?',
    lockedBy: 'string?',
    hasUnlockRequest: 'boolean?',
    unlockRequestReason: 'string?',
    unlockedAt: 'timestamp?',
    unlockedBy: 'string?',
    printedAt: 'timestamp?',
    createdAt: 'timestamp',
    updatedAt: 'timestamp',
  },

  /**
   * generated_questions/{questionId}
   * AI/config-generated questions with full provenance
   */
  generatedQuestion: {
    id: 'string',
    content: 'string',
    answer: 'string',
    explanation: 'string?',
    type: 'string',
    difficulty: 'easy | medium | hard',
    bloomsLevel: 'string',
    marks: 'number',
    topic: 'string',
    unit: 'string?',
    subject: 'string?',
    source: 'upload | ai-assistant',
    generationSource: 'config | ai-chat',
    materialId: 'string?',
    staffId: 'string',
    department: 'string?',
    institution: 'string?',
    place: 'string?',
    status: 'draft | pending | approved | rejected',
    feedback: 'string?',
    options: 'string[]?',
    correctOption: 'number?',
    examType: 'string?',
    isLocked: 'boolean?',
    lockedAt: 'timestamp?',
    lockedBy: 'string?',
    hasUnlockRequest: 'boolean?',
    unlockRequestReason: 'string?',
    unlockedAt: 'timestamp?',
    unlockedBy: 'string?',
    printedAt: 'timestamp?',
    createdAt: 'timestamp',
    updatedAt: 'timestamp',
  },

  /**
   * materials/{materialId}
   * Files stored in Cloud Storage — only storageUrl saved here.
   */
  material: {
    id: 'string',
    fileName: 'string',
    fileSize: 'number',
    fileType: 'string',
    totalPages: 'number',
    storageUrl: 'string',
    title: 'string',
    subject: 'string',
    department: 'string',
    semester: 'string?',
    regulation: 'string?',
    staffId: 'string',
    institution: 'string?',
    place: 'string?',
    status: 'processing | ready | failed',
    globalKeywords: 'string[]',
    globalKeyPhrases: 'string[]',
    academicLevel: 'string',
    chunkCount: 'number',
    vocabularyRichness: 'number',
    wordCount: 'number',
    extractionMethod: 'string?',
    processingTimeMs: 'number?',
    processedAt: 'timestamp?',
    createdAt: 'timestamp',
    updatedAt: 'timestamp',
  },

  /**
   * materials/{materialId}/chunks/{chunkId}
   */
  materialChunk: {
    id: 'string',
    materialId: 'string',
    staffId: 'string',
    chunkId: 'number',
    chunkType: 'unit | topic | paragraph | section',
    title: 'string',
    unit: 'string?',
    topic: 'string?',
    text: 'string',
    sentences: 'string[]',
    keywords: 'string[]',
    keyPhrases: 'string[]',
    estimatedDifficulty: 'easy | medium | hard',
    wordCount: 'number',
    sentenceCount: 'number',
    hasDefinitions: 'boolean',
    hasFormulas: 'boolean',
    hasExamples: 'boolean',
    namedEntities: 'string[]',
    createdAt: 'timestamp',
  },

  /**
   * materials/{materialId}/topics/{topicId}
   */
  materialTopic: {
    id: 'string',
    materialId: 'string',
    staffId: 'string',
    name: 'string',
    relevance: 'number',
    subtopics: 'string[]',
    keywords: 'string[]',
    chunkIds: 'number[]',
  },

  /**
   * papers/{paperId}
   */
  paper: {
    id: 'string',
    title: 'string',
    examType: 'string',
    collegeName: 'string',
    departmentName: 'string',
    courseName: 'string',
    courseCode: 'string',
    semester: 'string',
    duration: 'string',
    maxMarks: 'number',
    date: 'string?',
    instructions: 'string[]',
    courseOutcomes: 'array',
    coMapping: 'map',
    sections: 'array',
    paperColor: 'string',
    textColor: 'string',
    status: 'draft | pending | approved | rejected | print-ready',
    feedback: 'string?',
    staffId: 'string?',
    department: 'string?',
    institution: 'string?',
    place: 'string?',
    isLocked: 'boolean?',
    lockedAt: 'timestamp?',
    lockedBy: 'string?',
    hasUnlockRequest: 'boolean?',
    unlockRequestReason: 'string?',
    unlockedAt: 'timestamp?',
    unlockedBy: 'string?',
    printedAt: 'timestamp?',
    createdAt: 'timestamp',
    updatedAt: 'timestamp',
  },

  /**
   * notifications/{notificationId}
   */
  notification: {
    id: 'string',
    type: 'approval | rejection | feedback | info | request | reply | print-ready',
    title: 'string',
    message: 'string',
    questionId: 'string?',
    paperId: 'string?',
    fromRole: 'staff | hod | admin',
    toRole: 'staff | hod | admin',
    fromUserId: 'string?',
    toUserId: 'string?',
    isRead: 'boolean',
    replyTo: 'string?',
    department: 'string?',
    institution: 'string?',
    place: 'string?',
    createdAt: 'timestamp',
  },

  /**
   * chat_sessions/{sessionId}
   */
  chatSession: {
    id: 'string',
    userId: 'string',
    staffName: 'string',
    title: 'string',
    materialId: 'string?',
    materialTitle: 'string?',
    materialSubject: 'string?',
    department: 'string?',
    institution: 'string?',
    place: 'string?',
    questionConfig: 'map?',
    totalMessages: 'number',
    totalQuestionsGenerated: 'number',
    totalQuestionsSaved: 'number',
    lastMessageAt: 'timestamp?',
    status: 'active | archived',
    createdAt: 'timestamp',
    updatedAt: 'timestamp',
  },

  /**
   * chat_sessions/{sessionId}/messages/{messageId}
   */
  chatMessage: {
    id: 'string',
    role: 'user | assistant',
    content: 'string',
    timestamp: 'timestamp',
    staffPrompt: 'string?',
    questionConfig: 'map?',
    materialId: 'string?',
    materialChunksUsed: 'string[]?',
    generatedQuestions: 'array?',
    suggestions: 'string[]?',
    detectedIntent: 'string?',
    processingTimeMs: 'number?',
    tokenCount: 'number?',
  },

  /**
   * security_history/{entryId}
   */
  securityHistoryEntry: {
    id: 'string',
    action: 'locked | unlocked | unlock_requested | unlock_approved | unlock_denied | relocked',
    itemType: 'question | paper',
    itemId: 'string',
    itemTitle: 'string',
    performedBy: 'string',
    performedByRole: 'staff | hod | admin',
    reason: 'string?',
    department: 'string?',
    institution: 'string?',
    place: 'string?',
    timestamp: 'timestamp',
  },

  /**
   * question_bank/{questionId}
   */
  questionBankItem: {
    id: 'string',
    content: 'string',
    answer: 'string?',
    marks: 'number',
    btl: 'string',
    type: 'string',
    topic: 'string',
    difficulty: 'string',
    examType: 'string',
    subject: 'string?',
    tags: 'string[]',
    userId: 'string',
    createdAt: 'timestamp',
    updatedAt: 'timestamp',
  },

  /**
   * feedbacks/{feedbackId}
   */
  feedback: {
    id: 'string',
    rating: 'number',
    comment: 'string',
    userType: 'staff | hod | admin | public',
    instituteName: 'string?',
    userEmail: 'string?',
    userName: 'string?',
    createdAt: 'timestamp',
  },

  /**
   * exam_types/{examTypeId}
   */
  examType: {
    id: 'string',
    name: 'string',
    code: 'string',
    isActive: 'boolean',
  },

  /**
   * departments/{departmentId}
   */
  department: {
    id: 'string',
    name: 'string',
    code: 'string',
    isActive: 'boolean',
  },
} as const;
