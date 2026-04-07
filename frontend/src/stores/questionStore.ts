import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { firestoreQuestionService, firestoreNotificationService } from '@/services/firebase/firestore-database';
import { isFirebaseConfigured } from '@/services/firebase/firestore-config';
import { timestampToDate } from '@/services/firebase/converters';

export interface GeneratedQuestion {
  id: string;
  content: string;
  answer: string;
  explanation?: string;
  type: string;
  difficulty: 'easy' | 'medium' | 'hard';
  bloomsLevel: string;
  marks: number;
  topic: string;
  unit?: string;
  subject?: string;
  source: 'upload' | 'ai-assistant';
  generationSource?: 'config' | 'ai-chat';
  /** Set when created: 'gemini' = AI-generated via Gemini, 'local' = template/local generator */
  generatedBy?: 'gemini' | 'local';
  materialId?: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  feedback?: string;
  createdAt: Date;
  updatedAt: Date;
  options?: string[];
  correctOption?: number;
  examType?: string;
  department?: string;
  institution?: string;
  place?: string;
  staffId?: string;
  staffName?: string;
  // Edit history (before/after tracking)
  originalContent?: string;
  originalAnswer?: string;
  editHistory?: Array<{
    timestamp: Date;
    previousContent: string;
    previousAnswer: string;
    newContent: string;
    newAnswer: string;
  }>;
  wasEdited?: boolean;
  // Lock system
  isLocked?: boolean;
  lockedAt?: Date;
  lockedBy?: string;
  hasUnlockRequest?: boolean;
  unlockRequestReason?: string;
  unlockedAt?: Date;
  unlockedBy?: string;
  printedAt?: Date;
}

export interface NLPChunkMeta {
  keywords: string[];
  keyPhrases: string[];
  estimatedDifficulty: 'easy' | 'medium' | 'hard';
  sentenceCount: number;
  wordCount: number;
  hasDefinitions: boolean;
  hasFormulas: boolean;
  hasExamples: boolean;
  namedEntities: string[];
}

export interface NLPChunk {
  chunkId: number;
  chunkType: string;
  title: string;
  text: string;
  sentences: string[];
  metadata: NLPChunkMeta;
}

export interface NLPTopic {
  name: string;
  relevance: number;
  subtopics: string[];
  keywords: string[];
  chunkIds: number[];
}

export interface UploadedMaterial {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  content: string;
  topics: string[];
  uploadedAt: Date;
  processedAt?: Date;
  wordCount?: number;
  extractionMethod?: string;
  processingTimeMs?: number;
  // NLP analysis data
  nlpChunks?: NLPChunk[];
  nlpTopics?: NLPTopic[];
  nlpKeywords?: string[];
  nlpAcademicLevel?: string;
  /** Set when saved to Firestore; used to show only current user's materials */
  staffId?: string;
  /** False when saved only to this device; true when stored in Firestore */
  syncedToFirestore?: boolean;
  /** Total page count from extraction (PDF pages, etc.) */
  totalPages?: number;
  /** "quick" = text-only; "full" = tables, images, diagrams, OCR */
  extractionType?: 'quick' | 'full';
}

export interface Notification {
  id: string;
  type: 'approval' | 'rejection' | 'feedback' | 'info' | 'request' | 'reply' | 'print-ready';
  title: string;
  message: string;
  questionId?: string;
  paperId?: string;
  fromRole: 'staff' | 'hod' | 'admin';
  toRole: 'staff' | 'hod' | 'admin';
  isRead: boolean;
  createdAt: Date;
  replyTo?: string; // ID of original notification
  department?: string; // For department matching
  institution?: string; // For institution matching
  place?: string; // For place matching
  staffId?: string; // Staff who sent the notification
  hodId?: string; // HOD who should receive it
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;

  /** When generated questions are "kept in chat", they are attached to the user prompt message in Firestore. */
  generatedQuestions?: AIAssistantQuestion[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;

  // AI Assistant session state (kept here so it persists across route changes)
  selectedMaterialId?: string | null;
  selectedMaterialTitle?: string | null;
  generatedQuestions?: AIAssistantQuestion[];

  /** The last assistant message id that contains the generatedQuestions payload in Firestore. */
  lastQuestionsMessageId?: string | null;
}

export interface AIAssistantQuestion {
  id: string;
  content: string;
  answer: string;
  type: 'mcq' | 'short' | 'long' | 'descriptive';
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
  options?: string[];
  correctOption?: number;
  marks?: number;
  bloomsLevel?: string;

  // UI state
  isEditing?: boolean;
  isSelected?: boolean;

  // Save state
  isSavedToMyQuestions?: boolean;
  isSavedToBank?: boolean;
  isSavedToCloud?: boolean;
}

export interface ExamTypeConfig {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

export interface QuestionTypeConfig {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

interface QuestionStore {
  questions: GeneratedQuestion[];
  deletedQuestions: GeneratedQuestion[];
  materials: UploadedMaterial[];
  notifications: Notification[];
  /** Notification IDs deleted by this user; sync must not re-add them. */
  deletedNotificationIds: string[];
  chatSessions: ChatSession[];
  activeChatId: string | null;
  examTypes: ExamTypeConfig[];
  questionTypes: QuestionTypeConfig[];
  generatedQuestionIds: string[]; // Persisted IDs of generated questions visible in the generator
  /** Last question config per material set (key = sorted material ids joined by ',') for re-selecting same materials */
  lastQuestionConfigByMaterialKey: Record<string, {
    difficulty: string;
    questionType: string;
    topics: string[];
    marks: number[];
    numberOfQuestions: number[];
    bloomsLevel: string;
    examType: string;
  }>;

  // Question actions
  setQuestions: (questions: GeneratedQuestion[]) => void;
  addQuestion: (question: Omit<GeneratedQuestion, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateQuestion: (id: string, updates: Partial<GeneratedQuestion>) => void;
  deleteQuestion: (id: string) => void;
  deleteAllQuestions: () => void;
  undoDeleteQuestion: (id: string) => void;
  undoAllDeletedQuestions: () => void;
  clearDeletedQuestions: () => void;
  sendAllDraftsToHOD: () => number;
  
  // Material actions
  setMaterials: (materials: UploadedMaterial[]) => void;
  addMaterial: (material: Omit<UploadedMaterial, 'id' | 'uploadedAt'>, id?: string) => string;
  updateMaterial: (id: string, updates: Partial<UploadedMaterial>) => void;
  deleteMaterial: (id: string) => void;
  
  // Notification actions
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (role: string) => void;
  deleteNotification: (id: string) => void;
  deleteAllNotifications: (role: string) => void;
  getNotificationsForRole: (role: string) => Notification[];
  replyToNotification: (originalId: string, message: string, fromRole: 'staff' | 'hod' | 'admin', toRole: 'staff' | 'hod' | 'admin') => void;
  
  // Chat actions
  createChatSession: (title: string) => string;
  addMessageToChat: (sessionId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => string;
  deleteChatMessage: (sessionId: string, messageId: string) => void;
  /** Replace all chat sessions (used for Firestore hydration). */
  setChatSessions: (sessions: ChatSession[], activeId?: string | null) => void;
  /** Remove this message and all messages after it (for edit/regenerate flow). */
  removeMessageAndAllAfter: (sessionId: string, messageId: string) => void;
  updateChatTitle: (sessionId: string, title: string) => void;
  deleteChatSession: (sessionId: string) => void;
  deleteAllChatSessions: () => void;
  setActiveChatId: (id: string | null) => void;

  // AI Assistant (per chat) state
  setChatSelectedMaterial: (sessionId: string, materialId: string | null, materialTitle?: string | null) => void;
  setChatGeneratedQuestions: (sessionId: string, questions: AIAssistantQuestion[]) => void;
  updateChatGeneratedQuestion: (sessionId: string, questionId: string, updates: Partial<AIAssistantQuestion>) => void;
  deleteChatGeneratedQuestion: (sessionId: string, questionId: string) => void;
  setChatGeneratedQuestionSelection: (sessionId: string, questionId: string, isSelected: boolean) => void;
  setAllChatGeneratedQuestionSelection: (sessionId: string, isSelected: boolean) => void;
  setChatLastQuestionsMessageId: (sessionId: string, messageId: string | null) => void;
  
  // Generated question IDs actions
  setGeneratedQuestionIds: (ids: string[]) => void;
  addGeneratedQuestionIds: (ids: string[]) => void;
  clearGeneratedQuestionIds: () => void;

  setLastQuestionConfig: (materialKey: string, config: {
    difficulty: string;
    questionType: string;
    topics: string[];
    marks: number[];
    numberOfQuestions: number[];
    bloomsLevel: string;
    examType: string;
  }) => void;
  
  // Exam type actions
  setExamTypes: (types: ExamTypeConfig[]) => void;
  addExamType: (examType: Omit<ExamTypeConfig, 'id'>) => string;
  updateExamType: (id: string, updates: Partial<ExamTypeConfig>) => void;
  deleteExamType: (id: string) => void;
  
  // Question type actions
  setQuestionTypes: (types: QuestionTypeConfig[]) => void;
  addQuestionType: (questionType: Omit<QuestionTypeConfig, 'id'>) => string;
  updateQuestionType: (id: string, updates: Partial<QuestionTypeConfig>) => void;
  deleteQuestionType: (id: string) => void;
}

const DEFAULT_EXAM_TYPES: ExamTypeConfig[] = [
  { id: 'ca1', name: 'CA 1', code: 'CA1', isActive: true },
  { id: 'ca2', name: 'CA 2', code: 'CA2', isActive: true },
  { id: 'sem', name: 'Semester Exam', code: 'SEM', isActive: true },
];

const DEFAULT_QUESTION_TYPES: QuestionTypeConfig[] = [
  { id: 'mcq', name: 'Multiple Choice (MCQ)', code: 'mcq', isActive: true },
  { id: 'short', name: 'Short Answer', code: 'short', isActive: true },
  { id: 'long', name: 'Long Answer', code: 'long', isActive: true },
  { id: 'descriptive', name: 'Descriptive', code: 'descriptive', isActive: true },
];

export const useQuestionStore = create<QuestionStore>()(
  persist(
    (set, get) => ({
      questions: [],
      deletedQuestions: [],
      materials: [],
      notifications: [],
      deletedNotificationIds: [],
      chatSessions: [],
      activeChatId: null,
      examTypes: DEFAULT_EXAM_TYPES,
      questionTypes: DEFAULT_QUESTION_TYPES,
      generatedQuestionIds: [],
      lastQuestionConfigByMaterialKey: {},

      setQuestions: (questions) => {
        set({ questions });
      },

      addQuestion: (question) => {
        const id = `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newQuestion: GeneratedQuestion = {
          ...question,
          id,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        set((state) => ({ questions: [...state.questions, newQuestion] }));
        return id;
      },
      
      updateQuestion: (id, updates) => {
        set((state) => ({
          questions: state.questions.map((q) =>
            q.id === id ? { ...q, ...updates, updatedAt: new Date() } : q
          ),
        }));
        if (isFirebaseConfigured()) {
          firestoreQuestionService.update(id, updates).catch(() => {});
        }
      },

      deleteQuestion: (id) => {
        const question = get().questions.find(q => q.id === id);
        if (question) {
          set((state) => ({
            questions: state.questions.filter((q) => q.id !== id),
            deletedQuestions: [...state.deletedQuestions, question],
          }));
          if (isFirebaseConfigured()) {
            firestoreQuestionService.delete(id).catch(() => {});
          }
        }
      },
      
      deleteAllQuestions: () => {
        set((state) => ({
          deletedQuestions: [...state.deletedQuestions, ...state.questions],
          questions: [],
        }));
      },
      
      undoDeleteQuestion: (id) => {
        const question = get().deletedQuestions.find(q => q.id === id);
        if (question) {
          set((state) => ({
            deletedQuestions: state.deletedQuestions.filter((q) => q.id !== id),
            questions: [...state.questions, question],
          }));
        }
      },
      
      undoAllDeletedQuestions: () => {
        set((state) => ({
          questions: [...state.questions, ...state.deletedQuestions],
          deletedQuestions: [],
        }));
      },
      
      clearDeletedQuestions: () => {
        set({ deletedQuestions: [] });
      },
      
      sendAllDraftsToHOD: () => {
        const drafts = get().questions.filter(q => q.status === 'draft');
        const count = drafts.length;
        
        set((state) => ({
          questions: state.questions.map((q) =>
            q.status === 'draft' ? { ...q, status: 'pending' as const, updatedAt: new Date() } : q
          ),
        }));
        
        if (count > 0) {
          get().addNotification({
            type: 'request',
            title: 'Bulk Approval Request',
            message: `${count} questions have been sent for approval`,
            fromRole: 'staff',
            toRole: 'hod',
          });
        }
        
        return count;
      },
      
      setMaterials: (materials) => set({ materials }),

      addMaterial: (material, optionalId) => {
        const id = optionalId ?? `m_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newMaterial: UploadedMaterial = {
          ...material,
          id,
          uploadedAt: new Date(),
        };
        set((state) => ({ materials: [...state.materials, newMaterial] }));
        return id;
      },

      updateMaterial: (id, updates) => {
        set((state) => ({
          materials: state.materials.map((m) => (m.id === id ? { ...m, ...updates } : m)),
        }));
      },

      deleteMaterial: (id) => {
        set((state) => ({
          materials: state.materials.filter((m) => m.id !== id),
        }));
      },
      
      setNotifications: (notifications) => {
        const deleted = new Set(get().deletedNotificationIds);
        set({ notifications: notifications.filter((n) => !deleted.has(n.id)) });
      },

      addNotification: (notification) => {
        const id = `n_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newNotification: Notification = {
          ...notification,
          id,
          isRead: false,
          createdAt: new Date(),
        };
        set((state) => ({ notifications: [newNotification, ...state.notifications] }));
        if (isFirebaseConfigured()) {
          firestoreNotificationService.create({
            ...notification,
            isRead: false,
          }).catch(() => {});
        }
      },
      
      markNotificationRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, isRead: true } : n
          ),
        }));
        if (isFirebaseConfigured()) {
          firestoreNotificationService.markAsRead(id).catch(() => {});
        }
      },
      
      markAllNotificationsRead: (role) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.toRole === role ? { ...n, isRead: true } : n
          ),
        }));
        if (isFirebaseConfigured()) {
          // For HOD we scope by department in Firestore query.
          const dept = (() => {
            try {
              const raw = sessionStorage.getItem('qgenesis_user') ?? localStorage.getItem('qgenesis_user');
              const u = raw ? JSON.parse(raw) : null;
              return u?.role === 'hod' ? u?.department : undefined;
            } catch {
              return undefined;
            }
          })();
          firestoreNotificationService.markAllAsRead(role, dept).catch(() => {});
        }
      },
      
      deleteNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
          deletedNotificationIds: state.deletedNotificationIds.includes(id) ? state.deletedNotificationIds : [...state.deletedNotificationIds, id],
        }));
        if (isFirebaseConfigured()) {
          firestoreNotificationService.delete(id).catch(() => {});
        }
      },

      deleteAllNotifications: (role) => {
        const idsForRole = get().notifications.filter((n) => n.toRole === role).map((n) => n.id);
        set((state) => ({
          notifications: state.notifications.filter((n) => n.toRole !== role),
          deletedNotificationIds: [...state.deletedNotificationIds, ...idsForRole],
        }));
        if (isFirebaseConfigured()) {
          // Best effort: scope deletes for HOD to prevent cross-dept nukes.
          const scope = (() => {
            try {
              const raw = sessionStorage.getItem('qgenesis_user') ?? localStorage.getItem('qgenesis_user');
              const u = raw ? JSON.parse(raw) : null;
              if (u?.role !== 'hod') return undefined;
              const dept = u?.department || undefined;
              const institution = u?.institution || undefined;
              const place = u?.place || undefined;
              return { department: dept, institution, place };
            } catch {
              return undefined;
            }
          })();
          firestoreNotificationService.deleteAllForRole(role, scope).catch(() => {});
        }
      },
      
      getNotificationsForRole: (role) => {
        return get().notifications.filter((n) => n.toRole === role);
      },

      replyToNotification: (originalId, message, fromRole, toRole) => {
        const original = get().notifications.find(n => n.id === originalId);
        if (!original) return;
        
        const id = `n_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newNotification: Notification = {
          id,
          type: 'reply',
          title: `Reply: ${original.title}`,
          message,
          fromRole,
          toRole,
          isRead: false,
          createdAt: new Date(),
          replyTo: originalId,
          questionId: original.questionId,
          paperId: original.paperId,
        };
        set((state) => ({ notifications: [newNotification, ...state.notifications] }));
      },
      
      createChatSession: (title) => {
        const id = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newSession: ChatSession = {
          id,
          title,
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        set((state) => ({ 
          chatSessions: [newSession, ...state.chatSessions],
          activeChatId: id 
        }));
        return id;
      },

      setChatSessions: (sessions, activeId = null) => {
        set(() => ({
          chatSessions: sessions,
          activeChatId: activeId,
        }));
      },
      
      addMessageToChat: (sessionId, message) => {
        const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newMessage: ChatMessage = {
          ...message,
          id,
          timestamp: new Date(),
        };
        set((state) => ({
          chatSessions: state.chatSessions.map((s) =>
            s.id === sessionId
              ? { ...s, messages: [...s.messages, newMessage], updatedAt: new Date() }
              : s
          ),
        }));
        return id;
      },

      deleteChatMessage: (sessionId, messageId) => {
        set((state) => ({
          chatSessions: state.chatSessions.map((s) =>
            s.id === sessionId
              ? { ...s, messages: s.messages.filter((m) => m.id !== messageId), updatedAt: new Date() }
              : s
          ),
        }));
      },

      removeMessageAndAllAfter: (sessionId, messageId) => {
        set((state) => ({
          chatSessions: state.chatSessions.map((s) => {
            if (s.id !== sessionId) return s;
            const idx = s.messages.findIndex((m) => m.id === messageId);
            if (idx === -1) return s;
            return {
              ...s,
              messages: s.messages.slice(0, idx),
              updatedAt: new Date(),
            };
          }),
        }));
      },

      setChatSelectedMaterial: (sessionId, materialId, materialTitle) => {
        set((state) => ({
          chatSessions: state.chatSessions.map((s) =>
            s.id === sessionId
              ? { ...s, selectedMaterialId: materialId, selectedMaterialTitle: materialTitle ?? null, updatedAt: new Date() }
              : s
          ),
        }));
      },

      setChatGeneratedQuestions: (sessionId, questions) => {
        set((state) => ({
          chatSessions: state.chatSessions.map((s) =>
            s.id === sessionId ? { ...s, generatedQuestions: questions, updatedAt: new Date() } : s
          ),
        }));
      },

      setChatLastQuestionsMessageId: (sessionId, messageId) => {
        set((state) => ({
          chatSessions: state.chatSessions.map((s) =>
            s.id === sessionId ? { ...s, lastQuestionsMessageId: messageId, updatedAt: new Date() } : s
          ),
        }));
      },

      updateChatGeneratedQuestion: (sessionId, questionId, updates) => {
        set((state) => ({
          chatSessions: state.chatSessions.map((s) => {
            if (s.id !== sessionId) return s;
            const list = s.generatedQuestions || [];
            const newList = list.map((q) => (q.id === questionId ? { ...q, ...updates } : q));
            // Also update any user message that has this question in its transcript (generatedQuestions)
            const messages = (s.messages ?? []).map((msg) => {
              if (msg.role !== 'user' || !msg.generatedQuestions?.some((g) => g.id === questionId))
                return msg;
              return {
                ...msg,
                generatedQuestions: msg.generatedQuestions!.map((q) =>
                  q.id === questionId ? { ...q, ...updates } : q
                ),
              };
            });
            return {
              ...s,
              generatedQuestions: newList,
              messages,
              updatedAt: new Date(),
            };
          }),
        }));
      },

      deleteChatGeneratedQuestion: (sessionId, questionId) => {
        set((state) => ({
          chatSessions: state.chatSessions.map((s) => {
            if (s.id !== sessionId) return s;
            const list = s.generatedQuestions || [];
            return { ...s, generatedQuestions: list.filter((q) => q.id !== questionId), updatedAt: new Date() };
          }),
        }));
      },

      setChatGeneratedQuestionSelection: (sessionId, questionId, isSelected) => {
        get().updateChatGeneratedQuestion(sessionId, questionId, { isSelected });
      },

      setAllChatGeneratedQuestionSelection: (sessionId, isSelected) => {
        set((state) => ({
          chatSessions: state.chatSessions.map((s) => {
            if (s.id !== sessionId) return s;
            const list = s.generatedQuestions || [];
            return {
              ...s,
              generatedQuestions: list.map((q) => ({ ...q, isSelected })),
              updatedAt: new Date(),
            };
          }),
        }));
      },
      
      updateChatTitle: (sessionId, title) => {
        set((state) => ({
          chatSessions: state.chatSessions.map((s) =>
            s.id === sessionId ? { ...s, title } : s
          ),
        }));
      },
      
      deleteChatSession: (sessionId) => {
        set((state) => ({
          chatSessions: state.chatSessions.filter((s) => s.id !== sessionId),
          activeChatId: state.activeChatId === sessionId ? null : state.activeChatId,
        }));
      },
      
      deleteAllChatSessions: () => {
        set({ chatSessions: [], activeChatId: null });
      },
      
      setActiveChatId: (id) => {
        set({ activeChatId: id });
      },
      
      // Generated question IDs actions
      setGeneratedQuestionIds: (ids) => {
        set({ generatedQuestionIds: ids });
      },
      addGeneratedQuestionIds: (ids) => {
        set((state) => ({ generatedQuestionIds: [...state.generatedQuestionIds, ...ids] }));
      },
      clearGeneratedQuestionIds: () => {
        set({ generatedQuestionIds: [] });
      },

      setLastQuestionConfig: (materialKey, config) => {
        set((state) => ({
          lastQuestionConfigByMaterialKey: {
            ...state.lastQuestionConfigByMaterialKey,
            [materialKey]: config,
          },
        }));
      },

      // Exam type actions
      setExamTypes: (types) => set({ examTypes: types }),
      addExamType: (examType) => {
        const id = `exam_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        set((state) => ({
          examTypes: [...state.examTypes, { ...examType, id }],
        }));
        return id;
      },
      
      updateExamType: (id, updates) => {
        set((state) => ({
          examTypes: state.examTypes.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          ),
        }));
      },
      
      deleteExamType: (id) => {
        set((state) => ({
          examTypes: state.examTypes.filter((e) => e.id !== id),
        }));
      },
      
      // Question type actions
      setQuestionTypes: (types) => set({ questionTypes: types }),
      addQuestionType: (questionType) => {
        const id = `qtype_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        set((state) => ({
          questionTypes: [...state.questionTypes, { ...questionType, id }],
        }));
        return id;
      },
      
      updateQuestionType: (id, updates) => {
        set((state) => ({
          questionTypes: state.questionTypes.map((q) =>
            q.id === id ? { ...q, ...updates } : q
          ),
        }));
      },
      
      deleteQuestionType: (id) => {
        set((state) => ({
          questionTypes: state.questionTypes.filter((q) => q.id !== id),
        }));
      },
    }),
    {
      name: 'qgenesis-store',
    }
  )
);
