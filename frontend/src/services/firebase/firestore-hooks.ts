/**
 * ============================================================================
 * FIREBASE REACT HOOKS (COMPLETE PRODUCTION-READY CODE)
 * ============================================================================
 * 
 * Complete React hooks for:
 * - Authentication state
 * - Real-time data subscriptions
 * - CRUD operations with loading states
 * 
 * ============================================================================
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { firestoreAuthService, type AuthResult } from './firestore-auth';
import { 
  firestoreQuestionService,
  firestorePaperService,
  firestoreNotificationService,
  firestoreSecurityHistoryService,
  firestoreUserService,
  firestoreQuestionBankService,
  firestoreMaterialService
} from './firestore-database';
import type {
  FirestoreQuestion,
  FirestorePaper,
  FirestoreNotification,
  FirestoreSecurityHistory,
  FirestoreUser,
  FirestoreQuestionBankItem,
  FirestoreMaterial
} from './types';

// ============================================================================
// AUTH HOOK
// ============================================================================

export interface UseAuthReturn {
  user: FirestoreUser | null;
  loading: boolean;
  isAuthReady: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<AuthResult>;
  loginWithGoogle: () => Promise<AuthResult>;
  register: (data: any) => Promise<AuthResult>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<FirestoreUser>) => Promise<AuthResult>;
  sendPasswordReset: (email: string) => Promise<AuthResult>;
}

export const useFirestoreAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<FirestoreUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentUser = await firestoreAuthService.getCurrentUser();
        setUser(currentUser);
      } catch (err) {
        console.error('Auth init error:', err);
        setError('Failed to initialize authentication');
      } finally {
        setLoading(false);
        setIsAuthReady(true);
      }
    };

    initAuth();

    // Listen for auth changes
    const handleAuthChange = async () => {
      const currentUser = await firestoreAuthService.getCurrentUser();
      setUser(currentUser);
    };

    window.addEventListener('user-updated', handleAuthChange);
    window.addEventListener('auth-logout', () => setUser(null));

    return () => {
      window.removeEventListener('user-updated', handleAuthChange);
      window.removeEventListener('auth-logout', () => setUser(null));
    };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    setLoading(true);
    setError(null);
    try {
      const result = await firestoreAuthService.loginWithEmail({ email, password });
      if (result.success && result.user) {
        setUser(result.user);
      } else {
        setError(result.error || 'Login failed');
      }
      return result;
    } finally {
      setLoading(false);
    }
  }, []);

  const loginWithGoogle = useCallback(async (): Promise<AuthResult> => {
    setLoading(true);
    setError(null);
    try {
      const result = await firestoreAuthService.loginWithGoogle();
      if (result.success && result.user) {
        setUser(result.user);
      } else {
        setError(result.error || 'Google login failed');
      }
      return result;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (data: any): Promise<AuthResult> => {
    setLoading(true);
    setError(null);
    try {
      const result = await firestoreAuthService.registerWithEmail(data);
      if (!result.success) {
        setError(result.error || 'Registration failed');
      }
      return result;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    await firestoreAuthService.logout();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (updates: Partial<FirestoreUser>): Promise<AuthResult> => {
    if (!user) {
      return { success: false, error: 'No user logged in' };
    }
    const result = await firestoreAuthService.updateUserProfile(user.id, updates);
    if (result.success && result.user) {
      setUser(result.user);
    }
    return result;
  }, [user]);

  const sendPasswordReset = useCallback(async (email: string): Promise<AuthResult> => {
    return await firestoreAuthService.sendPasswordReset(email);
  }, []);

  return {
    user,
    loading,
    isAuthReady,
    error,
    login,
    loginWithGoogle,
    register,
    logout,
    updateProfile,
    sendPasswordReset,
  };
};

// ============================================================================
// QUESTIONS HOOK
// ============================================================================

export interface UseQuestionsOptions {
  staffId?: string;
  department?: string;
  institution?: string;
  place?: string;
  status?: string;
  realtime?: boolean;
}

export interface UseQuestionsReturn {
  questions: FirestoreQuestion[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  create: (question: Omit<FirestoreQuestion, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  update: (id: string, updates: Partial<FirestoreQuestion>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useFirestoreQuestions = (options: UseQuestionsOptions = {}): UseQuestionsReturn => {
  const [questions, setQuestions] = useState<FirestoreQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { staffId, department, institution, place, status, realtime = false } = options;

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let result: FirestoreQuestion[];
      
      if (staffId) {
        result = await firestoreQuestionService.getByStaffId(staffId);
      } else if (department) {
        result = await firestoreQuestionService.getByDepartment(department, institution, place);
      } else {
        result = await firestoreQuestionService.getAll();
      }

      if (status) {
        result = result.filter(q => q.status === status);
      }

      setQuestions(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [staffId, department, institution, place, status]);

  useEffect(() => {
    if (realtime) {
      const unsubscribe = firestoreQuestionService.onQuestionsChange(
        setQuestions,
        { staffId, department, status }
      );
      setLoading(false);
      return unsubscribe;
    } else {
      refetch();
    }
  }, [refetch, realtime, staffId, department, status]);

  const create = useCallback(async (question: Omit<FirestoreQuestion, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = await firestoreQuestionService.create(question);
    await refetch();
    return id;
  }, [refetch]);

  const update = useCallback(async (id: string, updates: Partial<FirestoreQuestion>) => {
    await firestoreQuestionService.update(id, updates);
    await refetch();
  }, [refetch]);

  const remove = useCallback(async (id: string) => {
    await firestoreQuestionService.delete(id);
    await refetch();
  }, [refetch]);

  return { questions, loading, error, refetch, create, update, remove };
};

// ============================================================================
// PAPERS HOOK
// ============================================================================

export interface UsePapersOptions {
  staffId?: string;
  department?: string;
  institution?: string;
  place?: string;
  status?: string;
  realtime?: boolean;
}

export interface UsePapersReturn {
  papers: FirestorePaper[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  create: (paper: Omit<FirestorePaper, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  update: (id: string, updates: Partial<FirestorePaper>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useFirestorePapers = (options: UsePapersOptions = {}): UsePapersReturn => {
  const [papers, setPapers] = useState<FirestorePaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { staffId, department, institution, place, status, realtime = false } = options;

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let result: FirestorePaper[];
      
      if (staffId) {
        result = await firestorePaperService.getByStaffId(staffId);
      } else if (department) {
        result = await firestorePaperService.getByDepartment(department, institution, place);
      } else {
        result = await firestorePaperService.getAll();
      }

      if (status) {
        result = result.filter(p => p.status === status);
      }

      setPapers(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [staffId, department, institution, place, status]);

  useEffect(() => {
    if (realtime) {
      const unsubscribe = firestorePaperService.onPapersChange(
        setPapers,
        { staffId, department, status }
      );
      setLoading(false);
      return unsubscribe;
    } else {
      refetch();
    }
  }, [refetch, realtime, staffId, department, status]);

  const create = useCallback(async (paper: Omit<FirestorePaper, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = await firestorePaperService.create(paper);
    await refetch();
    return id;
  }, [refetch]);

  const update = useCallback(async (id: string, updates: Partial<FirestorePaper>) => {
    await firestorePaperService.update(id, updates);
    await refetch();
  }, [refetch]);

  const remove = useCallback(async (id: string) => {
    await firestorePaperService.delete(id);
    await refetch();
  }, [refetch]);

  return { papers, loading, error, refetch, create, update, remove };
};

// ============================================================================
// NOTIFICATIONS HOOK
// ============================================================================

export interface UseNotificationsOptions {
  role: string;
  department?: string;
  institution?: string;
  place?: string;
  realtime?: boolean;
}

export interface UseNotificationsReturn {
  notifications: FirestoreNotification[];
  unreadCount: number;
  loading: boolean;
  refetch: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  create: (notification: Omit<FirestoreNotification, 'id' | 'createdAt'>) => Promise<string>;
}

export const useFirestoreNotifications = (options: UseNotificationsOptions): UseNotificationsReturn => {
  const [notifications, setNotifications] = useState<FirestoreNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const { role, department, institution, place, realtime = false } = options;

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await firestoreNotificationService.getForUser(role, department, institution, place);
      setNotifications(result);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [role, department, institution, place]);

  useEffect(() => {
    if (realtime) {
      const unsubscribe = firestoreNotificationService.onNotificationsChange(
        setNotifications,
        role,
        department
      );
      setLoading(false);
      return unsubscribe;
    } else {
      refetch();
    }
  }, [refetch, realtime, role, department]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.isRead).length;
  }, [notifications]);

  const markAsRead = useCallback(async (id: string) => {
    await firestoreNotificationService.markAsRead(id);
    await refetch();
  }, [refetch]);

  const markAllAsRead = useCallback(async () => {
    await firestoreNotificationService.markAllAsRead(role, department);
    await refetch();
  }, [role, department, refetch]);

  const create = useCallback(async (notification: Omit<FirestoreNotification, 'id' | 'createdAt'>) => {
    const id = await firestoreNotificationService.create(notification);
    await refetch();
    return id;
  }, [refetch]);

  return { notifications, unreadCount, loading, refetch, markAsRead, markAllAsRead, create };
};

// ============================================================================
// SECURITY HISTORY HOOK
// ============================================================================

export interface UseSecurityHistoryReturn {
  history: FirestoreSecurityHistory[];
  loading: boolean;
  refetch: () => Promise<void>;
  add: (entry: Omit<FirestoreSecurityHistory, 'id' | 'createdAt'>) => Promise<string>;
}

export const useFirestoreSecurityHistory = (
  department?: string,
  institution?: string,
  place?: string
): UseSecurityHistoryReturn => {
  const [history, setHistory] = useState<FirestoreSecurityHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = department
        ? await firestoreSecurityHistoryService.getByDepartment(department, institution, place)
        : await firestoreSecurityHistoryService.getAll();
      setHistory(result);
    } catch (err) {
      console.error('Error fetching security history:', err);
    } finally {
      setLoading(false);
    }
  }, [department, institution, place]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const add = useCallback(async (entry: Omit<FirestoreSecurityHistory, 'id' | 'createdAt'>) => {
    const id = await firestoreSecurityHistoryService.add(entry);
    await refetch();
    return id;
  }, [refetch]);

  return { history, loading, refetch, add };
};

// ============================================================================
// USERS HOOK
// ============================================================================

export interface UseUsersReturn {
  users: FirestoreUser[];
  loading: boolean;
  refetch: () => Promise<void>;
  getById: (id: string) => Promise<FirestoreUser | null>;
  update: (id: string, updates: Partial<FirestoreUser>) => Promise<void>;
  delete: (id: string) => Promise<void>;
  block: (id: string) => Promise<void>;
  unblock: (id: string) => Promise<void>;
}

export const useFirestoreUsers = (
  department?: string,
  institution?: string,
  place?: string
): UseUsersReturn => {
  const [users, setUsers] = useState<FirestoreUser[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = department
        ? await firestoreUserService.getByDepartment(department, institution, place)
        : await firestoreUserService.getAll();
      setUsers(result);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, [department, institution, place]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const getById = useCallback(async (id: string) => {
    return await firestoreUserService.getById(id);
  }, []);

  const update = useCallback(async (id: string, updates: Partial<FirestoreUser>) => {
    await firestoreUserService.update(id, updates);
    await refetch();
  }, [refetch]);

  const deleteUser = useCallback(async (id: string) => {
    await firestoreUserService.delete(id);
    await refetch();
  }, [refetch]);

  const block = useCallback(async (id: string) => {
    await firestoreAuthService.blockUser(id);
    await refetch();
  }, [refetch]);

  const unblock = useCallback(async (id: string) => {
    await firestoreAuthService.unblockUser(id);
    await refetch();
  }, [refetch]);

  return { users, loading, refetch, getById, update, delete: deleteUser, block, unblock };
};

// ============================================================================
// QUESTION BANK HOOK
// ============================================================================

export interface UseQuestionBankReturn {
  items: FirestoreQuestionBankItem[];
  loading: boolean;
  refetch: () => Promise<void>;
  create: (item: Omit<FirestoreQuestionBankItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  update: (id: string, updates: Partial<FirestoreQuestionBankItem>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useFirestoreQuestionBank = (userId?: string): UseQuestionBankReturn => {
  const [items, setItems] = useState<FirestoreQuestionBankItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = userId
        ? await firestoreQuestionBankService.getByUser(userId)
        : await firestoreQuestionBankService.getAll();
      setItems(result);
    } catch (err) {
      console.error('Error fetching question bank:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const create = useCallback(async (item: Omit<FirestoreQuestionBankItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = await firestoreQuestionBankService.create(item);
    await refetch();
    return id;
  }, [refetch]);

  const update = useCallback(async (id: string, updates: Partial<FirestoreQuestionBankItem>) => {
    await firestoreQuestionBankService.update(id, updates);
    await refetch();
  }, [refetch]);

  const remove = useCallback(async (id: string) => {
    await firestoreQuestionBankService.delete(id);
    await refetch();
  }, [refetch]);

  return { items, loading, refetch, create, update, remove };
};

// ============================================================================
// MATERIALS HOOK
// ============================================================================

export interface UseMaterialsReturn {
  materials: FirestoreMaterial[];
  loading: boolean;
  refetch: () => Promise<void>;
  create: (material: Omit<FirestoreMaterial, 'id' | 'createdAt'>) => Promise<string>;
  remove: (id: string) => Promise<void>;
}

export const useFirestoreMaterials = (userId?: string): UseMaterialsReturn => {
  const [materials, setMaterials] = useState<FirestoreMaterial[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = userId
        ? await firestoreMaterialService.getByStaff(userId)
        : await firestoreMaterialService.getAll();
      setMaterials(result);
    } catch (err) {
      console.error('Error fetching materials:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const create = useCallback(async (material: Omit<FirestoreMaterial, 'id' | 'createdAt'>) => {
    const id = await firestoreMaterialService.create(material);
    await refetch();
    return id;
  }, [refetch]);

  const remove = useCallback(async (id: string) => {
    const staffId = materials.find(m => m.id === id)?.staffId ?? userId;
    await firestoreMaterialService.delete(id, staffId);
    await refetch();
  }, [refetch, materials, userId]);

  return { materials, loading, refetch, create, remove };
};

// ============================================================================
// PENDING ITEMS HOOK (for HOD Dashboard)
// ============================================================================

export interface UsePendingItemsReturn {
  pendingQuestions: number;
  pendingPapers: number;
  unlockRequests: number;
  loading: boolean;
  refetch: () => Promise<void>;
}

export const useFirestorePendingItems = (
  department: string,
  institution: string,
  place: string
): UsePendingItemsReturn => {
  const [pendingQuestions, setPendingQuestions] = useState(0);
  const [pendingPapers, setPendingPapers] = useState(0);
  const [unlockRequests, setUnlockRequests] = useState(0);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const questions = await firestoreQuestionService.getPendingForHOD(department, institution, place);
      const papers = await firestorePaperService.getPendingForHOD(department, institution, place);
      
      setPendingQuestions(questions.length);
      setPendingPapers(papers.length);
      
      // Count unlock requests
      const allQuestions = await firestoreQuestionService.getByDepartment(department, institution, place);
      const allPapers = await firestorePaperService.getByDepartment(department, institution, place);
      
      const questionUnlocks = allQuestions.filter(q => q.hasUnlockRequest).length;
      const paperUnlocks = allPapers.filter(p => p.hasUnlockRequest).length;
      
      setUnlockRequests(questionUnlocks + paperUnlocks);
    } catch (err) {
      console.error('Error fetching pending items:', err);
    } finally {
      setLoading(false);
    }
  }, [department, institution, place]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { pendingQuestions, pendingPapers, unlockRequests, loading, refetch };
};

// ============================================================================
// EXPORT ALL HOOKS
// ============================================================================

export const firestoreHooks = {
  useFirestoreAuth,
  useFirestoreQuestions,
  useFirestorePapers,
  useFirestoreNotifications,
  useFirestoreSecurityHistory,
  useFirestoreUsers,
  useFirestoreQuestionBank,
  useFirestoreMaterials,
  useFirestorePendingItems,
};

export default firestoreHooks;
