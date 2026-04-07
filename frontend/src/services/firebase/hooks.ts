/**
 * Firebase Hooks
 * 
 * React hooks for real-time Firestore data subscriptions.
 * These are placeholder implementations ready for Firebase integration.
 * 
 * INTEGRATION: Uncomment the real-time listeners when Firebase is installed.
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  questionService, 
  paperService, 
  notificationService, 
  securityHistoryService 
} from './dataService';
import { authService } from './authService';
import type { 
  FirestoreQuestion, 
  FirestorePaper, 
  FirestoreNotification,
  FirestoreSecurityHistory,
  FirestoreUser 
} from './types';

// ============================================================================
// AUTH HOOK
// ============================================================================

/**
 * Hook for authentication state
 */
export const useFirebaseAuth = () => {
  const [user, setUser] = useState<FirestoreUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    // When Firebase is integrated:
    // const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
    //   if (firebaseUser) {
    //     const userData = await userService.getUserById(firebaseUser.uid);
    //     setUser(userData);
    //   } else {
    //     setUser(null);
    //   }
    //   setLoading(false);
    //   setIsAuthReady(true);
    // });
    // return () => unsubscribe();

    // Current localStorage implementation
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    setLoading(false);
    setIsAuthReady(true);

    // Listen for auth changes
    const handleAuthChange = () => {
      setUser(authService.getCurrentUser());
    };
    
    window.addEventListener('storage', handleAuthChange);
    window.addEventListener('user-updated', handleAuthChange);
    window.addEventListener('auth-logout', handleAuthChange);
    
    return () => {
      window.removeEventListener('storage', handleAuthChange);
      window.removeEventListener('user-updated', handleAuthChange);
      window.removeEventListener('auth-logout', handleAuthChange);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    const result = await authService.login({ email, password });
    if (result.success && result.user) {
      setUser(result.user);
    }
    setLoading(false);
    return result;
  }, []);

  const register = useCallback(async (data: any) => {
    setLoading(true);
    const result = await authService.register(data);
    setLoading(false);
    return result;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  const updateProfile = useCallback((updates: Partial<FirestoreUser>) => {
    const updated = authService.updateProfile(updates);
    if (updated) {
      setUser(updated);
    }
    return updated;
  }, []);

  return {
    user,
    loading,
    isAuthReady,
    login,
    register,
    logout,
    updateProfile,
  };
};

// ============================================================================
// QUESTIONS HOOK
// ============================================================================

/**
 * Hook for questions with real-time updates
 */
export const useQuestions = (filters?: {
  staffId?: string;
  department?: string;
  institution?: string;
  place?: string;
  status?: string;
}) => {
  const [questions, setQuestions] = useState<FirestoreQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(() => {
    setLoading(true);
    try {
      let result = questionService.getAll();
      
      if (filters?.staffId) {
        result = result.filter(q => q.staffId === filters.staffId);
      }
      if (filters?.department) {
        result = result.filter(q => q.department === filters.department);
      }
      if (filters?.institution) {
        result = result.filter(q => q.institution === filters.institution);
      }
      if (filters?.place) {
        result = result.filter(q => q.place === filters.place);
      }
      if (filters?.status) {
        result = result.filter(q => q.status === filters.status);
      }
      
      setQuestions(result);
      setError(null);
    } catch (err) {
      setError(err as Error);
    }
    setLoading(false);
  }, [filters?.staffId, filters?.department, filters?.institution, filters?.place, filters?.status]);

  useEffect(() => {
    refetch();
    
    // When Firebase is integrated, set up real-time listener:
    // const q = query(collection(db, COLLECTIONS.QUESTIONS), ...whereConditions);
    // const unsubscribe = onSnapshot(q, (snapshot) => {
    //   const docs = snapshot.docs.map(doc => questionConverter.fromFirestore(doc, {}));
    //   setQuestions(docs);
    //   setLoading(false);
    // }, setError);
    // return () => unsubscribe();
    
    // Listen for store changes (localStorage)
    const handleStorageChange = () => refetch();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [refetch]);

  return { questions, loading, error, refetch };
};

// ============================================================================
// PAPERS HOOK
// ============================================================================

/**
 * Hook for papers with real-time updates
 */
export const usePapers = (filters?: {
  staffId?: string;
  department?: string;
  institution?: string;
  place?: string;
  status?: string;
}) => {
  const [papers, setPapers] = useState<FirestorePaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(() => {
    setLoading(true);
    try {
      let result = paperService.getAll();
      
      if (filters?.staffId) {
        result = result.filter(p => p.staffId === filters.staffId);
      }
      if (filters?.department) {
        result = result.filter(p => p.department === filters.department);
      }
      if (filters?.institution) {
        result = result.filter(p => p.institution === filters.institution);
      }
      if (filters?.place) {
        result = result.filter(p => p.place === filters.place);
      }
      if (filters?.status) {
        result = result.filter(p => p.status === filters.status);
      }
      
      setPapers(result);
      setError(null);
    } catch (err) {
      setError(err as Error);
    }
    setLoading(false);
  }, [filters?.staffId, filters?.department, filters?.institution, filters?.place, filters?.status]);

  useEffect(() => {
    refetch();
    
    const handleStorageChange = () => refetch();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [refetch]);

  return { papers, loading, error, refetch };
};

// ============================================================================
// NOTIFICATIONS HOOK
// ============================================================================

/**
 * Hook for notifications with real-time updates
 */
export const useNotifications = (
  role: string,
  department?: string,
  institution?: string,
  place?: string
) => {
  const [notifications, setNotifications] = useState<FirestoreNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const refetch = useCallback(() => {
    setLoading(true);
    try {
      let result = notificationService.getAll().filter(n => n.toRole === role);
      
      if (department && institution && place) {
        result = result.filter(n => 
          n.department === department &&
          n.institution === institution &&
          n.place === place
        );
      }
      
      setNotifications(result);
      setUnreadCount(result.filter(n => !n.isRead).length);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
    setLoading(false);
  }, [role, department, institution, place]);

  useEffect(() => {
    refetch();
    
    const handleStorageChange = () => refetch();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [refetch]);

  return { notifications, loading, unreadCount, refetch };
};

// ============================================================================
// SECURITY HISTORY HOOK
// ============================================================================

/**
 * Hook for security history with real-time updates
 */
export const useSecurityHistory = (
  department?: string,
  institution?: string,
  place?: string
) => {
  const [history, setHistory] = useState<FirestoreSecurityHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    setLoading(true);
    try {
      let result = securityHistoryService.getAll();
      
      if (department) {
        result = result.filter(h => h.department === department);
      }
      if (institution) {
        result = result.filter(h => h.institution === institution);
      }
      if (place) {
        result = result.filter(h => h.place === place);
      }
      
      setHistory(result);
    } catch (err) {
      console.error('Error fetching security history:', err);
    }
    setLoading(false);
  }, [department, institution, place]);

  useEffect(() => {
    refetch();
    
    const handleStorageChange = () => refetch();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [refetch]);

  return { history, loading, refetch };
};

// ============================================================================
// PENDING ITEMS HOOK (for HOD dashboard)
// ============================================================================

/**
 * Hook for pending items count
 */
export const usePendingItems = (
  department: string,
  institution: string,
  place: string
) => {
  const [pendingQuestions, setPendingQuestions] = useState(0);
  const [pendingPapers, setPendingPapers] = useState(0);
  const [unlockRequests, setUnlockRequests] = useState(0);

  useEffect(() => {
    const questions = questionService.getPendingForHOD(department, institution, place);
    const papers = paperService.getPendingForHOD(department, institution, place);
    
    setPendingQuestions(questions.length);
    setPendingPapers(papers.length);
    
    // Count unlock requests
    const questionsWithUnlock = questionService.getByDepartment(department, institution, place)
      .filter(q => q.hasUnlockRequest);
    const papersWithUnlock = paperService.getByDepartment(department, institution, place)
      .filter(p => p.hasUnlockRequest);
    
    setUnlockRequests(questionsWithUnlock.length + papersWithUnlock.length);
    
    const handleStorageChange = () => {
      const q = questionService.getPendingForHOD(department, institution, place);
      const p = paperService.getPendingForHOD(department, institution, place);
      setPendingQuestions(q.length);
      setPendingPapers(p.length);
      
      const qUnlock = questionService.getByDepartment(department, institution, place)
        .filter(q => q.hasUnlockRequest);
      const pUnlock = paperService.getByDepartment(department, institution, place)
        .filter(p => p.hasUnlockRequest);
      setUnlockRequests(qUnlock.length + pUnlock.length);
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [department, institution, place]);

  return { pendingQuestions, pendingPapers, unlockRequests };
};
