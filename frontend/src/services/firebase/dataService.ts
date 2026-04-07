/**
 * Data Service Layer
 * 
 * Abstraction layer for data operations. Currently uses localStorage,
 * ready to switch to Firestore when Firebase is integrated.
 * 
 * INTEGRATION: Replace localStorage calls with Firestore operations
 * when you run "integrate with firestore database" in Cursor.
 */

import { COLLECTIONS } from './collections';
import { generateIds, timestampToDate } from './converters';
import type { 
  FirestoreQuestion, 
  FirestoreGeneratedQuestion,
  FirestoreMaterial, 
  FirestoreMaterialChunk,
  FirestoreMaterialTopic,
  FirestorePaper, 
  FirestoreNotification,
  FirestoreChatSession,
  FirestoreSecurityHistory,
  FirestoreQuestionBankItem,
  FirestoreFeedback,
  FirestoreUser 
} from './types';

// ============================================================================
// STORAGE ADAPTER - Switch between localStorage and Firestore
// ============================================================================

const USE_FIRESTORE = false; // Set to true when Firebase is integrated

/**
 * Get data from storage
 */
const getFromStorage = <T>(key: string, defaultValue: T): T => {
  if (USE_FIRESTORE) {
    // TODO: Replace with Firestore query
    // return await getDocs(collection(db, key));
  }
  
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed;
    }
  } catch (error) {
    console.error(`Error reading from storage: ${key}`, error);
  }
  return defaultValue;
};

/**
 * Save data to storage
 */
const saveToStorage = <T>(key: string, data: T): void => {
  if (USE_FIRESTORE) {
    // TODO: Replace with Firestore set/update
    // return await setDoc(doc(db, key), data);
  }
  
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving to storage: ${key}`, error);
  }
};

// ============================================================================
// USER SERVICE
// ============================================================================

export const userService = {
  /**
   * Get current user
   */
  getCurrentUser: (): FirestoreUser | null => {
    const stored = sessionStorage.getItem('qgenesis_user') ?? localStorage.getItem('qgenesis_user');
    if (stored) {
      const user = JSON.parse(stored);
      return {
        ...user,
        createdAt: timestampToDate(user.createdAt),
      };
    }
    return null;
  },

  /**
   * Get all managed users
   */
  getAllUsers: (): FirestoreUser[] => {
    return getFromStorage<FirestoreUser[]>('qgenesis-managed-users', []);
  },

  /**
   * Get user by ID
   */
  getUserById: (userId: string): FirestoreUser | undefined => {
    const users = userService.getAllUsers();
    return users.find(u => u.id === userId);
  },

  /**
   * Update user
   */
  updateUser: (userId: string, updates: Partial<FirestoreUser>): void => {
    const users = userService.getAllUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index !== -1) {
      users[index] = { ...users[index], ...updates };
      saveToStorage('qgenesis-managed-users', users);
    }
  },

  /**
   * Get users by department
   */
  getUsersByDepartment: (department: string, institution?: string, place?: string): FirestoreUser[] => {
    return userService.getAllUsers().filter(u => {
      if (u.department !== department) return false;
      if (institution && u.institution !== institution) return false;
      if (place && u.place !== place) return false;
      return true;
    });
  },
};

// ============================================================================
// QUESTION SERVICE
// ============================================================================

export const questionService = {
  /**
   * Get all questions
   */
  getAll: (): FirestoreQuestion[] => {
    const store = getFromStorage<{ questions: any[] }>('question-store', { questions: [] });
    return (store.questions || []).map(q => ({
      ...q,
      createdAt: timestampToDate(q.createdAt),
      updatedAt: timestampToDate(q.updatedAt),
    }));
  },

  /**
   * Get question by ID
   */
  getById: (id: string): FirestoreQuestion | undefined => {
    return questionService.getAll().find(q => q.id === id);
  },

  /**
   * Get questions by staff ID
   */
  getByStaffId: (staffId: string): FirestoreQuestion[] => {
    return questionService.getAll().filter(q => q.staffId === staffId);
  },

  /**
   * Get questions by department
   */
  getByDepartment: (department: string, institution?: string, place?: string): FirestoreQuestion[] => {
    return questionService.getAll().filter(q => {
      if (q.department !== department) return false;
      if (institution && q.institution !== institution) return false;
      if (place && q.place !== place) return false;
      return true;
    });
  },

  /**
   * Get questions by status
   */
  getByStatus: (status: string): FirestoreQuestion[] => {
    return questionService.getAll().filter(q => q.status === status);
  },

  /**
   * Get pending questions for HOD review
   */
  getPendingForHOD: (department: string, institution: string, place: string): FirestoreQuestion[] => {
    return questionService.getAll().filter(q => 
      q.status === 'pending' &&
      q.department === department &&
      q.institution === institution &&
      q.place === place
    );
  },

  /**
   * Create new question
   * Note: This is for direct Firestore integration.
   * The Zustand store handles this currently.
   */
  create: async (question: Omit<FirestoreQuestion, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const id = generateIds.question();
    // When Firebase is integrated:
    // await setDoc(doc(db, COLLECTIONS.QUESTIONS, id), {
    //   ...question,
    //   id,
    //   createdAt: serverTimestamp(),
    //   updatedAt: serverTimestamp(),
    // });
    return id;
  },

  /**
   * Update question
   */
  update: async (id: string, updates: Partial<FirestoreQuestion>): Promise<void> => {
    // When Firebase is integrated:
    // await updateDoc(doc(db, COLLECTIONS.QUESTIONS, id), {
    //   ...updates,
    //   updatedAt: serverTimestamp(),
    // });
  },

  /**
   * Delete question
   */
  delete: async (id: string): Promise<void> => {
    // When Firebase is integrated:
    // await deleteDoc(doc(db, COLLECTIONS.QUESTIONS, id));
  },
};

// ============================================================================
// MATERIAL SERVICE
// ============================================================================

export const materialService = {
  /**
   * Get all materials
   */
  getAll: (): FirestoreMaterial[] => {
    const store = getFromStorage<{ materials: any[] }>('question-store', { materials: [] });
    return (store.materials || []).map(m => ({
      ...m,
      createdAt: timestampToDate(m.uploadedAt),
      uploadedAt: timestampToDate(m.uploadedAt),
    }));
  },

  /**
   * Get material by ID
   */
  getById: (id: string): FirestoreMaterial | undefined => {
    return materialService.getAll().find(m => m.id === id);
  },

  /**
   * Get materials by user
   */
  getByStaff: (staffId: string): FirestoreMaterial[] => {
    return materialService.getAll().filter(m => m.staffId === staffId);
  },
};

// ============================================================================
// PAPER SERVICE
// ============================================================================

export const paperService = {
  /**
   * Get all papers
   */
  getAll: (): FirestorePaper[] => {
    const store = getFromStorage<{ papers: any[] }>('question-paper-store', { papers: [] });
    return (store.papers || []).map(p => ({
      ...p,
      createdAt: timestampToDate(p.createdAt),
      updatedAt: timestampToDate(p.updatedAt),
    }));
  },

  /**
   * Get paper by ID
   */
  getById: (id: string): FirestorePaper | undefined => {
    return paperService.getAll().find(p => p.id === id);
  },

  /**
   * Get papers by staff ID
   */
  getByStaffId: (staffId: string): FirestorePaper[] => {
    return paperService.getAll().filter(p => p.staffId === staffId);
  },

  /**
   * Get papers by department
   */
  getByDepartment: (department: string, institution?: string, place?: string): FirestorePaper[] => {
    return paperService.getAll().filter(p => {
      if (p.department !== department) return false;
      if (institution && p.institution !== institution) return false;
      if (place && p.place !== place) return false;
      return true;
    });
  },

  /**
   * Get pending papers for HOD review
   */
  getPendingForHOD: (department: string, institution: string, place: string): FirestorePaper[] => {
    return paperService.getAll().filter(p => 
      p.status === 'pending' &&
      p.department === department &&
      p.institution === institution &&
      p.place === place
    );
  },
};

// ============================================================================
// NOTIFICATION SERVICE
// ============================================================================

export const notificationService = {
  /**
   * Get all notifications
   */
  getAll: (): FirestoreNotification[] => {
    const store = getFromStorage<{ notifications: any[] }>('question-store', { notifications: [] });
    return (store.notifications || []).map(n => ({
      ...n,
      createdAt: timestampToDate(n.createdAt),
    }));
  },

  /**
   * Get notifications for user
   */
  getForUser: (userId: string, role: string): FirestoreNotification[] => {
    return notificationService.getAll().filter(n => 
      n.toRole === role || n.toUserId === userId
    );
  },

  /**
   * Get notifications by department
   */
  getByDepartment: (
    department: string, 
    institution: string, 
    place: string, 
    role: string
  ): FirestoreNotification[] => {
    return notificationService.getAll().filter(n =>
      n.toRole === role &&
      n.department === department &&
      n.institution === institution &&
      n.place === place
    );
  },

  /**
   * Get unread count
   */
  getUnreadCount: (role: string): number => {
    return notificationService.getAll().filter(n => 
      n.toRole === role && !n.isRead
    ).length;
  },
};

// ============================================================================
// SECURITY HISTORY SERVICE
// ============================================================================

export const securityHistoryService = {
  /**
   * Get all security history
   */
  getAll: (): FirestoreSecurityHistory[] => {
    const store = getFromStorage<{ securityHistory: any[] }>('question-paper-store', { securityHistory: [] });
    return (store.securityHistory || []).map(h => ({
      ...h,
      createdAt: timestampToDate(h.timestamp),
      timestamp: timestampToDate(h.timestamp),
    }));
  },

  /**
   * Get history by department
   */
  getByDepartment: (department: string, institution?: string, place?: string): FirestoreSecurityHistory[] => {
    return securityHistoryService.getAll().filter(h => {
      if (h.department !== department) return false;
      if (institution && h.institution !== institution) return false;
      if (place && h.place !== place) return false;
      return true;
    });
  },

  /**
   * Get history by action type
   */
  getByAction: (action: string): FirestoreSecurityHistory[] => {
    return securityHistoryService.getAll().filter(h => h.action === action);
  },
};

// ============================================================================
// QUESTION BANK SERVICE
// ============================================================================

export const questionBankService = {
  /**
   * Get all question bank items
   */
  getAll: (): FirestoreQuestionBankItem[] => {
    const store = getFromStorage<{ bankQuestions: any[] }>('question-bank-store', { bankQuestions: [] });
    return (store.bankQuestions || []).map(q => ({
      ...q,
      createdAt: timestampToDate(q.createdAt),
      updatedAt: timestampToDate(q.updatedAt),
    }));
  },

  /**
   * Get by topic
   */
  getByTopic: (topic: string): FirestoreQuestionBankItem[] => {
    return questionBankService.getAll().filter(q => 
      q.topic.toLowerCase().includes(topic.toLowerCase())
    );
  },

  /**
   * Get by difficulty
   */
  getByDifficulty: (difficulty: string): FirestoreQuestionBankItem[] => {
    return questionBankService.getAll().filter(q => q.difficulty === difficulty);
  },
};

// ============================================================================
// FEEDBACK SERVICE
// ============================================================================

export const feedbackService = {
  /**
   * Get all feedbacks
   */
  getAll: (): FirestoreFeedback[] => {
    const store = getFromStorage<{ feedbacks: any[] }>('qgenesis-feedback-store', { feedbacks: [] });
    return (store.feedbacks || []).map(f => ({
      ...f,
      createdAt: timestampToDate(f.createdAt),
    }));
  },

  /**
   * Get by user type
   */
  getByUserType: (userType: string): FirestoreFeedback[] => {
    return feedbackService.getAll().filter(f => f.userType === userType);
  },

  /**
   * Get average rating
   */
  getAverageRating: (): number => {
    const feedbacks = feedbackService.getAll();
    if (feedbacks.length === 0) return 0;
    return feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length;
  },
};

// ============================================================================
// CHAT SERVICE
// ============================================================================

export const chatService = {
  /**
   * Get all chat sessions
   */
  getAll: (): FirestoreChatSession[] => {
    const store = getFromStorage<{ chatSessions: any[] }>('question-store', { chatSessions: [] });
    return (store.chatSessions || []).map(s => ({
      ...s,
      createdAt: timestampToDate(s.createdAt),
      updatedAt: timestampToDate(s.updatedAt),
    }));
  },

  /**
   * Get session by ID
   */
  getById: (id: string): FirestoreChatSession | undefined => {
    return chatService.getAll().find(s => s.id === id);
  },

  /**
   * Get sessions by user
   */
  getByUser: (userId: string): FirestoreChatSession[] => {
    return chatService.getAll().filter(s => s.userId === userId);
  },
};

// ============================================================================
// GENERATED QUESTION SERVICE
// ============================================================================

export const generatedQuestionService = {
  /**
   * Get all generated questions
   */
  getAll: (): FirestoreGeneratedQuestion[] => {
    const store = getFromStorage<{ generatedQuestions: any[] }>('generated-questions-store', { generatedQuestions: [] });
    return (store.generatedQuestions || []).map(q => ({
      ...q,
      createdAt: timestampToDate(q.createdAt),
      updatedAt: timestampToDate(q.updatedAt),
    }));
  },

  /**
   * Get by staff ID
   */
  getByStaffId: (staffId: string): FirestoreGeneratedQuestion[] => {
    return generatedQuestionService.getAll().filter(q => q.staffId === staffId);
  },

  /**
   * Get by material ID
   */
  getByMaterialId: (materialId: string): FirestoreGeneratedQuestion[] => {
    return generatedQuestionService.getAll().filter(q => q.materialId === materialId);
  },

  /**
   * Get by status
   */
  getByStatus: (status: string): FirestoreGeneratedQuestion[] => {
    return generatedQuestionService.getAll().filter(q => q.status === status);
  },

  /**
   * Get by department
   */
  getByDepartment: (department: string, institution?: string, place?: string): FirestoreGeneratedQuestion[] => {
    return generatedQuestionService.getAll().filter(q => {
      if (q.department !== department) return false;
      if (institution && q.institution !== institution) return false;
      if (place && q.place !== place) return false;
      return true;
    });
  },
};

// ============================================================================
// EXAM TYPE SERVICE
// ============================================================================

export const examTypeService = {
  /**
   * Get all exam types
   */
  getAll: () => {
    const store = getFromStorage<{ examTypes: any[] }>('question-store', { examTypes: [] });
    return store.examTypes || [];
  },

  /**
   * Get active exam types
   */
  getActive: () => {
    return examTypeService.getAll().filter(e => e.isActive);
  },
};

// ============================================================================
// APP SETTINGS SERVICE
// ============================================================================

export const appSettingsService = {
  /**
   * Get app settings
   */
  getSettings: () => {
    const store = getFromStorage<{ settings: any }>('app-settings-store', { settings: null });
    return store.settings;
  },

  /**
   * Get user activities
   */
  getUserActivities: () => {
    const store = getFromStorage<{ userActivities: any[] }>('app-settings-store', { userActivities: [] });
    return store.userActivities || [];
  },
};
