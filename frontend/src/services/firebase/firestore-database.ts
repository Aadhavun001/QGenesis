/**
 * ============================================================================
 * FIREBASE FIRESTORE DATABASE SERVICE
 * ============================================================================
 * 
 * Complete database service with localStorage fallback.
 * Firebase imports are commented out until Firebase is installed.
 * 
 * CURSOR INTEGRATION: After running `npm install firebase`, uncomment the
 * Firebase imports at the top and implementation blocks marked FIREBASE_IMPL.
 * 
 * ============================================================================
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  increment,
  Timestamp,
  writeBatch,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from './firestore-config';
import { COLLECTIONS } from './collections';
import { generateIds, timestampToDate } from './converters';
import { isFirebaseConfigured } from './firestore-config';
import { materialStorageService } from './materialStorageService';
import type {
  FirestoreQuestion,
  FirestoreGeneratedQuestion,
  FirestoreMaterial,
  FirestorePaper,
  FirestoreNotification,
  FirestoreChatSession,
  FirestoreChatMessage,
  FirestoreChatShare,
  FirestoreSecurityHistory,
  FirestoreQuestionBankItem,
  FirestoreFeedback,
  FirestoreUser
} from './types';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/** Remove undefined values from an object so Firestore setDoc/updateDoc don't throw */
function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as T;
}

/** Deep-remove `undefined` from objects/arrays so Firestore doesn't reject nested fields. */
function stripUndefinedDeep<T>(value: T): T {
  if (value === undefined) return value;
  if (value === null) return value;

  if (Array.isArray(value)) {
    return value
      .map((v) => stripUndefinedDeep(v))
      .filter((v) => v !== undefined) as any;
  }

  if (typeof value === 'object') {
    const obj = value as any;
    const out: any = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined) continue;
      out[k] = stripUndefinedDeep(v);
    }
    return out;
  }

  return value;
}

const getLocalStorageData = <T>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const saveLocalStorageData = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

// ============================================================================
// QUESTIONS SERVICE
// ============================================================================

export const firestoreQuestionService = {
  getAll: async (): Promise<FirestoreQuestion[]> => {
    if (isFirebaseConfigured() && db) {
      const q = query(collection(db, COLLECTIONS.QUESTIONS), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ ...d.data(), id: d.id } as FirestoreQuestion));
    }
    const store = getLocalStorageData<{ questions: any[] }>('question-store', { questions: [] });
    return (store.questions || []).map(q => ({
      ...q,
      createdAt: timestampToDate(q.createdAt),
      updatedAt: timestampToDate(q.updatedAt),
    }));
  },

  getById: async (id: string): Promise<FirestoreQuestion | null> => {
    const questions = await firestoreQuestionService.getAll();
    return questions.find(q => q.id === id) || null;
  },

  getByStaffId: async (staffId: string): Promise<FirestoreQuestion[]> => {
    if (isFirebaseConfigured() && db) {
      const q = query(
        collection(db, COLLECTIONS.QUESTIONS),
        where('staffId', '==', staffId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ ...d.data(), id: d.id } as FirestoreQuestion));
    }
    const questions = await firestoreQuestionService.getAll();
    return questions.filter(q => q.staffId === staffId);
  },

  getByDepartment: async (
    department: string,
    institution?: string,
    place?: string
  ): Promise<FirestoreQuestion[]> => {
    const questions = await firestoreQuestionService.getAll();
    return questions.filter(q => {
      if (q.department !== department) return false;
      if (institution && q.institution !== institution) return false;
      if (place && q.place !== place) return false;
      return true;
    });
  },

  getPendingForHOD: async (
    department: string,
    institution: string,
    place: string
  ): Promise<FirestoreQuestion[]> => {
    const questions = await firestoreQuestionService.getAll();
    return questions.filter(q =>
      q.status === 'pending' &&
      q.department === department &&
      q.institution === institution &&
      q.place === place
    );
  },

  create: async (question: Omit<FirestoreQuestion, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const id = generateIds.question();
    if (isFirebaseConfigured() && db) {
      const payload = stripUndefined({
        ...question,
        id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      } as Record<string, unknown>);
      await setDoc(doc(db, COLLECTIONS.QUESTIONS, id), payload);
      return id;
    }
    const store = getLocalStorageData<{ questions: any[] }>('question-store', { questions: [] });
    store.questions.push({
      ...question,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    saveLocalStorageData('question-store', store);
    return id;
  },

  /** Create question with a specific id (e.g. when sending for approval so store and Firestore share the same id). */
  createWithId: async (id: string, question: Omit<FirestoreQuestion, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
    if (isFirebaseConfigured() && db) {
      const payload = stripUndefined({
        ...question,
        id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      } as Record<string, unknown>);
      await setDoc(doc(db, COLLECTIONS.QUESTIONS, id), payload);
      return;
    }
    const store = getLocalStorageData<{ questions: any[] }>('question-store', { questions: [] });
    const exists = store.questions?.some((q: { id: string }) => q.id === id);
    if (exists) {
      const idx = store.questions.findIndex((q: { id: string }) => q.id === id);
      store.questions[idx] = { ...store.questions[idx], ...question, id, updatedAt: new Date() };
    } else {
      store.questions = store.questions || [];
      store.questions.push({ ...question, id, createdAt: new Date(), updatedAt: new Date() });
    }
    saveLocalStorageData('question-store', store);
  },

  update: async (id: string, updates: Partial<FirestoreQuestion>): Promise<void> => {
    if (isFirebaseConfigured() && db) {
      const payload = stripUndefined({
        ...updates,
        updatedAt: serverTimestamp(),
      } as Record<string, unknown>);
      await updateDoc(doc(db, COLLECTIONS.QUESTIONS, id), payload);
      return;
    }
    const store = getLocalStorageData<{ questions: any[] }>('question-store', { questions: [] });
    const index = store.questions.findIndex(q => q.id === id);
    if (index !== -1) {
      store.questions[index] = { ...store.questions[index], ...updates, updatedAt: new Date() };
      saveLocalStorageData('question-store', store);
    }
  },

  delete: async (id: string): Promise<void> => {
    if (isFirebaseConfigured() && db) {
      await deleteDoc(doc(db, COLLECTIONS.QUESTIONS, id));
      return;
    }
    const store = getLocalStorageData<{ questions: any[] }>('question-store', { questions: [] });
    store.questions = store.questions.filter(q => q.id !== id);
    saveLocalStorageData('question-store', store);
  },

  onQuestionsChange: (
    callback: (questions: FirestoreQuestion[]) => void,
    filters?: { staffId?: string; department?: string; status?: string }
  ): (() => void) => {
    if (isFirebaseConfigured() && db) {
      const constraints: QueryConstraint[] = [];
      if (filters?.staffId) constraints.push(where('staffId', '==', filters.staffId));
      if (filters?.department) constraints.push(where('department', '==', filters.department));
      if (filters?.status) constraints.push(where('status', '==', filters.status));
      constraints.push(orderBy('createdAt', 'desc'));
      const q = query(collection(db, COLLECTIONS.QUESTIONS), ...constraints);
      return onSnapshot(
        q,
        (snapshot) => {
          const questions = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as FirestoreQuestion));
          callback(questions);
        },
        (error) => {
          console.error('[Firestore] onQuestionsChange failed:', error);
          // Best-effort fallback so UI isn't stuck at zero
          firestoreQuestionService.getAll().then(callback).catch(() => {});
        }
      );
    }
    const interval = setInterval(async () => {
      const questions = await firestoreQuestionService.getAll();
      let filtered = questions;
      if (filters?.staffId) filtered = filtered.filter(q => q.staffId === filters.staffId);
      if (filters?.department) filtered = filtered.filter(q => q.department === filters.department);
      if (filters?.status) filtered = filtered.filter(q => q.status === filters.status);
      callback(filtered);
    }, 1000);
    return () => clearInterval(interval);
  },
};

// ============================================================================
// MATERIALS SERVICE
// ============================================================================

const mapMaterialFromDoc = (id: string, data: Record<string, unknown>): FirestoreMaterial => {
  return {
    ...data,
    id,
    createdAt: timestampToDate((data.createdAt as any) ?? data.processedAt),
    updatedAt: data.updatedAt ? timestampToDate(data.updatedAt as any) : undefined,
    processedAt: data.processedAt ? timestampToDate(data.processedAt as any) : undefined,
  } as FirestoreMaterial;
};

export const firestoreMaterialService = {
  getAll: async (): Promise<FirestoreMaterial[]> => {
    if (isFirebaseConfigured() && db) {
      const q = query(collection(db, COLLECTIONS.MATERIALS), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => mapMaterialFromDoc(d.id, d.data()));
    }
    const store = getLocalStorageData<{ materials: any[] }>('question-store', { materials: [] });
    return (store.materials || []).map(m => ({
      ...m,
      createdAt: timestampToDate(m.uploadedAt ?? m.createdAt),
      updatedAt: m.updatedAt ? timestampToDate(m.updatedAt) : undefined,
      processedAt: m.processedAt ? timestampToDate(m.processedAt) : undefined,
    }));
  },

  /** Get one material. When using Firestore, pass staffId so we read from users/{staffId}/materials/{id}. */
  getById: async (id: string, staffId?: string): Promise<FirestoreMaterial | null> => {
    if (isFirebaseConfigured() && db) {
      if (staffId) {
        const snap = await getDoc(doc(db, COLLECTIONS.USERS, staffId, 'materials', id));
        if (!snap.exists()) return null;
        return mapMaterialFromDoc(snap.id, snap.data() ?? {});
      }
      const snap = await getDoc(doc(db, COLLECTIONS.MATERIALS, id));
      if (!snap.exists()) return null;
      return mapMaterialFromDoc(snap.id, snap.data() ?? {});
    }
    const materials = await firestoreMaterialService.getAll();
    return materials.find(m => m.id === id) || null;
  },

  /** Get all materials for a user (from users/{staffId}/materials when using Firestore). */
  getByStaff: async (staffId: string): Promise<FirestoreMaterial[]> => {
    if (isFirebaseConfigured() && db) {
      const q = query(
        collection(db, COLLECTIONS.USERS, staffId, 'materials'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => mapMaterialFromDoc(d.id, d.data()));
    }
    const materials = await firestoreMaterialService.getAll();
    return materials.filter(m => m.staffId === staffId);
  },

  getByDepartment: async (
    department: string,
    institution?: string,
    place?: string
  ): Promise<FirestoreMaterial[]> => {
    if (isFirebaseConfigured() && db) {
      const q = query(
        collection(db, COLLECTIONS.MATERIALS),
        where('department', '==', department),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      let results = snapshot.docs.map(d => mapMaterialFromDoc(d.id, d.data()));
      if (institution != null) results = results.filter(m => m.institution === institution);
      if (place != null) results = results.filter(m => m.place === place);
      return results;
    }
    const materials = await firestoreMaterialService.getAll();
    return materials.filter(m => {
      if (m.department !== department) return false;
      if (institution != null && m.institution !== institution) return false;
      if (place != null && m.place !== place) return false;
      return true;
    });
  },

  create: async (material: Omit<FirestoreMaterial, 'id' | 'createdAt'>): Promise<string> => {
    const id = generateIds.material();
    if (isFirebaseConfigured() && db) {
      const payload = {
        ...material,
        id,
        globalKeywords: material.globalKeywords ?? [],
        globalKeyPhrases: material.globalKeyPhrases ?? [],
        status: material.status ?? 'ready',
        chunkCount: material.chunkCount ?? 0,
        vocabularyRichness: material.vocabularyRichness ?? 0,
        academicLevel: material.academicLevel ?? 'undergraduate',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const staffId = material.staffId;
      if (staffId) {
        const userMaterialsRef = collection(db, COLLECTIONS.USERS, staffId, 'materials');
        await setDoc(doc(userMaterialsRef, id), payload);
      } else {
        await setDoc(doc(db, COLLECTIONS.MATERIALS, id), payload);
      }
      return id;
    }
    const store = getLocalStorageData<{ materials: any[] }>('question-store', { materials: [] });
    if (!store.materials) store.materials = [];
    store.materials.push({
      ...material,
      id,
      createdAt: new Date(),
      uploadedAt: new Date(),
    });
    saveLocalStorageData('question-store', store);
    return id;
  },

  /** Delete a material. Pass staffId when using Firestore so we delete from users/{staffId}/materials/{id}. */
  delete: async (id: string, staffId?: string): Promise<void> => {
    if (isFirebaseConfigured() && db) {
      if (staffId) {
        await materialStorageService.deleteMaterial(id, staffId);
        return;
      }
      await deleteDoc(doc(db, COLLECTIONS.MATERIALS, id));
      return;
    }
    const store = getLocalStorageData<{ materials: any[] }>('question-store', { materials: [] });
    store.materials = (store.materials || []).filter(m => m.id !== id);
    saveLocalStorageData('question-store', store);
  },
};

// ============================================================================
// PAPERS SERVICE
// ============================================================================

const mapPaperFromDoc = (id: string, data: Record<string, unknown>): FirestorePaper => {
  return {
    ...data,
    id,
    createdAt: timestampToDate(data.createdAt as any),
    updatedAt: data.updatedAt ? timestampToDate(data.updatedAt as any) : undefined,
    lockedAt: data.lockedAt ? timestampToDate(data.lockedAt as any) : undefined,
    unlockedAt: data.unlockedAt ? timestampToDate(data.unlockedAt as any) : undefined,
    printedAt: data.printedAt ? timestampToDate(data.printedAt as any) : undefined,
    submittedAt: data.submittedAt ? timestampToDate(data.submittedAt as any) : undefined,
  } as FirestorePaper;
};

export const firestorePaperService = {
  getAll: async (): Promise<FirestorePaper[]> => {
    if (isFirebaseConfigured() && db) {
      const q = query(collection(db, COLLECTIONS.PAPERS), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => mapPaperFromDoc(d.id, d.data()));
    }
    const store = getLocalStorageData<{ papers: any[] }>('question-paper-store', { papers: [] });
    return (store.papers || []).map(p => ({
      ...p,
      createdAt: timestampToDate(p.createdAt),
      updatedAt: timestampToDate(p.updatedAt),
    }));
  },

  getById: async (id: string): Promise<FirestorePaper | null> => {
    if (isFirebaseConfigured() && db) {
      const snap = await getDoc(doc(db, COLLECTIONS.PAPERS, id));
      if (!snap.exists()) return null;
      return mapPaperFromDoc(snap.id, snap.data() ?? {});
    }
    const papers = await firestorePaperService.getAll();
    return papers.find(p => p.id === id) || null;
  },

  getByStaffId: async (staffId: string): Promise<FirestorePaper[]> => {
    if (isFirebaseConfigured() && db) {
      const q = query(
        collection(db, COLLECTIONS.PAPERS),
        where('staffId', '==', staffId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => mapPaperFromDoc(d.id, d.data()));
    }
    const papers = await firestorePaperService.getAll();
    return papers.filter(p => p.staffId === staffId);
  },

  getByDepartment: async (
    department: string,
    institution?: string,
    place?: string
  ): Promise<FirestorePaper[]> => {
    if (isFirebaseConfigured() && db) {
      const q = query(
        collection(db, COLLECTIONS.PAPERS),
        where('department', '==', department),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      let results = snapshot.docs.map(d => mapPaperFromDoc(d.id, d.data()));
      if (institution != null) results = results.filter(p => p.institution === institution);
      if (place != null) results = results.filter(p => p.place === place);
      return results;
    }
    const papers = await firestorePaperService.getAll();
    return papers.filter(p => {
      if (p.department !== department) return false;
      if (institution && p.institution !== institution) return false;
      if (place && p.place !== place) return false;
      return true;
    });
  },

  getPendingForHOD: async (
    department: string,
    institution: string,
    place: string
  ): Promise<FirestorePaper[]> => {
    if (isFirebaseConfigured() && db) {
      const q = query(
        collection(db, COLLECTIONS.PAPERS),
        where('status', '==', 'pending'),
        where('department', '==', department),
        where('institution', '==', institution),
        where('place', '==', place),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => mapPaperFromDoc(d.id, d.data()));
    }
    const papers = await firestorePaperService.getAll();
    return papers.filter(p =>
      p.status === 'pending' &&
      p.department === department &&
      p.institution === institution &&
      p.place === place
    );
  },

  create: async (paper: Omit<FirestorePaper, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const id = generateIds.paper();
    if (isFirebaseConfigured() && db) {
      const payload = stripUndefined({
        ...paper,
        id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      } as Record<string, unknown>);
      await setDoc(doc(db, COLLECTIONS.PAPERS, id), payload);
      return id;
    }
    const store = getLocalStorageData<{ papers: any[] }>('question-paper-store', { papers: [] });
    store.papers.push({
      ...paper,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    saveLocalStorageData('question-paper-store', store);
    return id;
  },

  /** Save paper with a specific id (e.g. when submitting to HOD so store and Firestore share the same id). */
  createWithId: async (id: string, paper: Omit<FirestorePaper, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
    if (isFirebaseConfigured() && db) {
      const dateFields = ['lockedAt', 'unlockedAt', 'printedAt', 'submittedAt'] as const;
      const paperForFirestore = { ...paper } as Record<string, unknown>;
      for (const key of dateFields) {
        const v = paperForFirestore[key];
        if (v instanceof Date) paperForFirestore[key] = Timestamp.fromDate(v);
      }
      const payload = stripUndefined({
        ...paperForFirestore,
        id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      } as Record<string, unknown>);
      await setDoc(doc(db, COLLECTIONS.PAPERS, id), payload);
      return;
    }
    const store = getLocalStorageData<{ papers: any[] }>('question-paper-store', { papers: [] });
    const exists = store.papers.some((p: { id: string }) => p.id === id);
    if (exists) {
      const index = store.papers.findIndex((p: { id: string }) => p.id === id);
      store.papers[index] = { ...store.papers[index], ...paper, id, updatedAt: new Date() };
    } else {
      store.papers.push({ ...paper, id, createdAt: new Date(), updatedAt: new Date() });
    }
    saveLocalStorageData('question-paper-store', store);
  },

  update: async (id: string, updates: Partial<FirestorePaper>): Promise<void> => {
    if (isFirebaseConfigured() && db) {
      const dateFields = ['lockedAt', 'unlockedAt', 'printedAt', 'submittedAt'] as const;
      const payload: Record<string, unknown> = stripUndefinedDeep({ ...updates, updatedAt: serverTimestamp() }) as Record<string, unknown>;
      for (const key of dateFields) {
        const v = payload[key];
        if (v instanceof Date) payload[key] = Timestamp.fromDate(v);
      }
      await updateDoc(doc(db, COLLECTIONS.PAPERS, id), payload);
      return;
    }
    const store = getLocalStorageData<{ papers: any[] }>('question-paper-store', { papers: [] });
    const index = store.papers.findIndex(p => p.id === id);
    if (index !== -1) {
      store.papers[index] = { ...store.papers[index], ...updates, updatedAt: new Date() };
      saveLocalStorageData('question-paper-store', store);
    }
  },

  delete: async (id: string): Promise<void> => {
    if (isFirebaseConfigured() && db) {
      await deleteDoc(doc(db, COLLECTIONS.PAPERS, id));
      return;
    }
    const store = getLocalStorageData<{ papers: any[] }>('question-paper-store', { papers: [] });
    store.papers = store.papers.filter(p => p.id !== id);
    saveLocalStorageData('question-paper-store', store);
  },

  onPapersChange: (
    callback: (papers: FirestorePaper[]) => void,
    filters?: { staffId?: string; department?: string; status?: string }
  ): (() => void) => {
    if (isFirebaseConfigured() && db) {
      const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];
      if (filters?.staffId) constraints.push(where('staffId', '==', filters.staffId));
      if (filters?.department) constraints.push(where('department', '==', filters.department));
      if (filters?.status) constraints.push(where('status', '==', filters.status));
      const q = query(collection(db, COLLECTIONS.PAPERS), ...constraints);
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const papers = snapshot.docs.map(d => mapPaperFromDoc(d.id, d.data()));
          callback(papers);
        },
        (error) => {
          console.error('[Firestore] onPapersChange failed:', error);
          firestorePaperService.getAll().then(callback).catch(() => {});
        }
      );
      return unsubscribe;
    }
    const interval = setInterval(async () => {
      const papers = await firestorePaperService.getAll();
      let filtered = papers;
      if (filters?.staffId) filtered = filtered.filter(p => p.staffId === filters.staffId);
      if (filters?.department) filtered = filtered.filter(p => p.department === filters.department);
      if (filters?.status) filtered = filtered.filter(p => p.status === filters.status);
      callback(filtered);
    }, 1000);
    return () => clearInterval(interval);
  },
};

// ============================================================================
// NOTIFICATIONS SERVICE
// ============================================================================

const mapNotificationFromDoc = (id: string, data: Record<string, unknown>): FirestoreNotification => {
  return {
    ...data,
    id,
    createdAt: timestampToDate(data.createdAt as any),
    updatedAt: data.updatedAt ? timestampToDate(data.updatedAt as any) : undefined,
  } as FirestoreNotification;
};

export const firestoreNotificationService = {
  getAll: async (): Promise<FirestoreNotification[]> => {
    if (isFirebaseConfigured() && db) {
      const q = query(collection(db, COLLECTIONS.NOTIFICATIONS), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => mapNotificationFromDoc(d.id, d.data()));
    }
    const store = getLocalStorageData<{ notifications: any[] }>('question-store', { notifications: [] });
    return (store.notifications || []).map(n => ({
      ...n,
      createdAt: timestampToDate(n.createdAt),
    }));
  },

  getForUser: async (
    role: string,
    department?: string,
    institution?: string,
    place?: string
  ): Promise<FirestoreNotification[]> => {
    if (isFirebaseConfigured() && db) {
      const q = query(
        collection(db, COLLECTIONS.NOTIFICATIONS),
        where('toRole', '==', role),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      let results = snapshot.docs.map(d => mapNotificationFromDoc(d.id, d.data()));
      results = results.filter((n: any) => !n.deletedByRecipient);
      if (department != null) results = results.filter(n => n.department === department);
      if (institution != null) results = results.filter(n => n.institution === institution);
      if (place != null) results = results.filter(n => n.place === place);
      return results;
    }
    const notifications = await firestoreNotificationService.getAll();
    return notifications.filter(n => {
      if (n.toRole !== role) return false;
      if (department && n.department !== department) return false;
      if (institution && n.institution !== institution) return false;
      if (place && n.place !== place) return false;
      return true;
    });
  },

  create: async (notification: Omit<FirestoreNotification, 'id' | 'createdAt'>): Promise<string> => {
    const id = generateIds.notification();
    if (isFirebaseConfigured() && db) {
      await setDoc(doc(db, COLLECTIONS.NOTIFICATIONS, id), {
        ...notification,
        id,
        createdAt: serverTimestamp(),
      });
      return id;
    }
    const store = getLocalStorageData<{ notifications: any[] }>('question-store', { notifications: [] });
    if (!store.notifications) store.notifications = [];
    store.notifications.unshift({
      ...notification,
      id,
      createdAt: new Date(),
    });
    saveLocalStorageData('question-store', store);
    return id;
  },

  markAsRead: async (id: string): Promise<void> => {
    if (isFirebaseConfigured() && db) {
      await updateDoc(doc(db, COLLECTIONS.NOTIFICATIONS, id), { isRead: true });
      return;
    }
    const store = getLocalStorageData<{ notifications: any[] }>('question-store', { notifications: [] });
    const index = (store.notifications || []).findIndex(n => n.id === id);
    if (index !== -1) {
      store.notifications[index].isRead = true;
      saveLocalStorageData('question-store', store);
    }
  },

  markAllAsRead: async (role: string, department?: string): Promise<void> => {
    if (isFirebaseConfigured() && db) {
      const q = query(
        collection(db, COLLECTIONS.NOTIFICATIONS),
        where('toRole', '==', role),
        where('isRead', '==', false)
      );
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach(d => {
        batch.update(doc(db, COLLECTIONS.NOTIFICATIONS, d.id), { isRead: true });
      });
      if (snapshot.docs.length > 0) await batch.commit();
      return;
    }
    const store = getLocalStorageData<{ notifications: any[] }>('question-store', { notifications: [] });
    store.notifications = (store.notifications || []).map(n => {
      if (n.toRole === role && (!department || n.department === department)) {
        return { ...n, isRead: true };
      }
      return n;
    });
    saveLocalStorageData('question-store', store);
  },

  onNotificationsChange: (
    callback: (notifications: FirestoreNotification[]) => void,
    role: string,
    department?: string
  ): (() => void) => {
    if (isFirebaseConfigured() && db) {
      const q = query(
        collection(db, COLLECTIONS.NOTIFICATIONS),
        where('toRole', '==', role),
        orderBy('createdAt', 'desc')
      );
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          let results = snapshot.docs.map(d => mapNotificationFromDoc(d.id, d.data()));
          results = results.filter((n: any) => !n.deletedByRecipient);
          if (department != null) results = results.filter(n => n.department === department);
          callback(results);
        },
        (error) => {
          console.error('[Firestore] onNotificationsChange failed:', error);
          firestoreNotificationService.getForUser(role, department).then(callback).catch(() => {});
        }
      );
      return unsubscribe;
    }
    const interval = setInterval(async () => {
      const notifications = await firestoreNotificationService.getForUser(role, department);
      callback(notifications);
    }, 1000);
    return () => clearInterval(interval);
  },

  delete: async (id: string): Promise<void> => {
    if (isFirebaseConfigured() && db) {
      // Soft-delete so recipient can "delete" without admin-only delete permission
      await updateDoc(doc(db, COLLECTIONS.NOTIFICATIONS, id), { deletedByRecipient: true });
      return;
    }
    const store = getLocalStorageData<{ notifications: any[] }>('question-store', { notifications: [] });
    store.notifications = (store.notifications || []).filter((n: any) => n.id !== id);
    saveLocalStorageData('question-store', store);
  },

  deleteAllForRole: async (
    role: string,
    scope?: { department?: string; institution?: string; place?: string }
  ): Promise<void> => {
    if (isFirebaseConfigured() && db) {
      const q = query(collection(db, COLLECTIONS.NOTIFICATIONS), where('toRole', '==', role));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => {
        const data = d.data() as any;
        if (data.deletedByRecipient) return;
        if (scope?.department && data.department !== scope.department) return;
        if (scope?.institution && data.institution !== scope.institution) return;
        if (scope?.place && data.place !== scope.place) return;
        batch.update(doc(db, COLLECTIONS.NOTIFICATIONS, d.id), { deletedByRecipient: true });
      });
      await batch.commit();
      return;
    }
    const store = getLocalStorageData<{ notifications: any[] }>('question-store', { notifications: [] });
    store.notifications = (store.notifications || []).filter((n: any) => n.toRole !== role);
    saveLocalStorageData('question-store', store);
  },
};

// ============================================================================
// SECURITY HISTORY SERVICE
// ============================================================================

const mapSecurityHistoryFromDoc = (id: string, data: Record<string, unknown>): FirestoreSecurityHistory => {
  return {
    ...data,
    id,
    createdAt: timestampToDate(data.createdAt as any),
    updatedAt: data.updatedAt ? timestampToDate(data.updatedAt as any) : undefined,
    timestamp: timestampToDate((data.timestamp ?? data.createdAt) as any),
  } as FirestoreSecurityHistory;
};

export const firestoreSecurityHistoryService = {
  getAll: async (): Promise<FirestoreSecurityHistory[]> => {
    if (isFirebaseConfigured() && db) {
      const q = query(collection(db, COLLECTIONS.SECURITY_HISTORY), orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => mapSecurityHistoryFromDoc(d.id, d.data()));
    }
    const store = getLocalStorageData<{ securityHistory: any[] }>('question-paper-store', { securityHistory: [] });
    return (store.securityHistory || []).map(h => ({
      ...h,
      createdAt: timestampToDate(h.timestamp ?? h.createdAt),
      timestamp: timestampToDate(h.timestamp),
    }));
  },

  getByDepartment: async (
    department: string,
    institution?: string,
    place?: string
  ): Promise<FirestoreSecurityHistory[]> => {
    if (isFirebaseConfigured() && db) {
      const q = query(
        collection(db, COLLECTIONS.SECURITY_HISTORY),
        where('department', '==', department),
        orderBy('timestamp', 'desc')
      );
      const snapshot = await getDocs(q);
      let results = snapshot.docs.map(d => mapSecurityHistoryFromDoc(d.id, d.data()));
      if (institution != null) results = results.filter(h => h.institution === institution);
      if (place != null) results = results.filter(h => h.place === place);
      return results;
    }
    const history = await firestoreSecurityHistoryService.getAll();
    return history.filter(h => {
      if (h.department !== department) return false;
      if (institution && h.institution !== institution) return false;
      if (place && h.place !== place) return false;
      return true;
    });
  },

  add: async (entry: Omit<FirestoreSecurityHistory, 'id' | 'createdAt'>): Promise<string> => {
    const id = generateIds.securityHistory();
    if (isFirebaseConfigured() && db) {
      await setDoc(doc(db, COLLECTIONS.SECURITY_HISTORY, id), {
        ...entry,
        id,
        timestamp: entry.timestamp ?? serverTimestamp(),
        createdAt: serverTimestamp(),
      });
      return id;
    }
    const store = getLocalStorageData<{ securityHistory: any[] }>('question-paper-store', { securityHistory: [] });
    if (!store.securityHistory) store.securityHistory = [];
    store.securityHistory.unshift({
      ...entry,
      id,
      createdAt: new Date(),
    });
    saveLocalStorageData('question-paper-store', store);
    return id;
  },
};

// ============================================================================
// QUESTION BANK SERVICE
// ============================================================================

const mapQuestionBankFromDoc = (id: string, data: Record<string, unknown>): FirestoreQuestionBankItem => {
  return {
    ...data,
    id,
    createdAt: timestampToDate(data.createdAt as any),
    updatedAt: data.updatedAt ? timestampToDate(data.updatedAt as any) : undefined,
  } as FirestoreQuestionBankItem;
};

export const firestoreQuestionBankService = {
  getAll: async (): Promise<FirestoreQuestionBankItem[]> => {
    if (isFirebaseConfigured() && db) {
      const q = query(collection(db, COLLECTIONS.QUESTION_BANK), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => mapQuestionBankFromDoc(d.id, d.data()));
    }
    const store = getLocalStorageData<{ bankQuestions: any[] }>('question-bank-store', { bankQuestions: [] });
    return (store.bankQuestions || []).map(q => ({
      ...q,
      createdAt: timestampToDate(q.createdAt),
      updatedAt: timestampToDate(q.updatedAt),
    }));
  },

  getByUser: async (userId: string): Promise<FirestoreQuestionBankItem[]> => {
    if (isFirebaseConfigured() && db) {
      const q = query(
        collection(db, COLLECTIONS.QUESTION_BANK),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => mapQuestionBankFromDoc(d.id, d.data()));
    }
    const items = await firestoreQuestionBankService.getAll();
    return items.filter(q => q.userId === userId);
  },

  create: async (item: Omit<FirestoreQuestionBankItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const id = generateIds.questionBank();
    if (isFirebaseConfigured() && db) {
      await setDoc(doc(db, COLLECTIONS.QUESTION_BANK, id), {
        ...item,
        id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return id;
    }
    const store = getLocalStorageData<{ bankQuestions: any[] }>('question-bank-store', { bankQuestions: [] });
    store.bankQuestions.push({
      ...item,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    saveLocalStorageData('question-bank-store', store);
    return id;
  },

  update: async (id: string, updates: Partial<FirestoreQuestionBankItem>): Promise<void> => {
    if (isFirebaseConfigured() && db) {
      await updateDoc(doc(db, COLLECTIONS.QUESTION_BANK, id), {
        ...updates,
        updatedAt: serverTimestamp(),
      });
      return;
    }
    const store = getLocalStorageData<{ bankQuestions: any[] }>('question-bank-store', { bankQuestions: [] });
    const index = store.bankQuestions.findIndex(q => q.id === id);
    if (index !== -1) {
      store.bankQuestions[index] = { ...store.bankQuestions[index], ...updates, updatedAt: new Date() };
      saveLocalStorageData('question-bank-store', store);
    }
  },

  delete: async (id: string): Promise<void> => {
    if (isFirebaseConfigured() && db) {
      await deleteDoc(doc(db, COLLECTIONS.QUESTION_BANK, id));
      return;
    }
    const store = getLocalStorageData<{ bankQuestions: any[] }>('question-bank-store', { bankQuestions: [] });
    store.bankQuestions = store.bankQuestions.filter(q => q.id !== id);
    saveLocalStorageData('question-bank-store', store);
  },
};

// ============================================================================
// FEEDBACK SERVICE
// ============================================================================

const mapFeedbackFromDoc = (id: string, data: Record<string, unknown>): FirestoreFeedback => {
  return {
    ...data,
    id,
    createdAt: timestampToDate(data.createdAt as any),
    updatedAt: data.updatedAt ? timestampToDate(data.updatedAt as any) : undefined,
  } as FirestoreFeedback;
};

export const firestoreFeedbackService = {
  getAll: async (): Promise<FirestoreFeedback[]> => {
    if (isFirebaseConfigured() && db) {
      const q = query(collection(db, COLLECTIONS.FEEDBACKS), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => mapFeedbackFromDoc(d.id, d.data()));
    }
    const store = getLocalStorageData<{ feedbacks: any[] }>('qgenesis-feedback-store', { feedbacks: [] });
    return (store.feedbacks || []).map(f => ({
      ...f,
      createdAt: timestampToDate(f.createdAt),
    }));
  },

  create: async (feedback: Omit<FirestoreFeedback, 'id' | 'createdAt'>): Promise<string> => {
    const id = generateIds.feedback();
    if (isFirebaseConfigured() && db) {
      await setDoc(doc(db, COLLECTIONS.FEEDBACKS, id), {
        ...feedback,
        id,
        createdAt: serverTimestamp(),
      });
      return id;
    }
    const store = getLocalStorageData<{ feedbacks: any[] }>('qgenesis-feedback-store', { feedbacks: [] });
    store.feedbacks.push({
      ...feedback,
      id,
      createdAt: new Date(),
    });
    saveLocalStorageData('qgenesis-feedback-store', store);
    return id;
  },
};

// ============================================================================
// CHAT SERVICE
// ============================================================================

const mapChatSessionFromDoc = (id: string, data: Record<string, unknown>): FirestoreChatSession => {
  return {
    ...data,
    id,
    createdAt: timestampToDate(data.createdAt as any),
    updatedAt: data.updatedAt ? timestampToDate(data.updatedAt as any) : undefined,
    lastMessageAt: data.lastMessageAt ? timestampToDate(data.lastMessageAt as any) : undefined,
  } as FirestoreChatSession;
};

const mapChatMessageFromDoc = (id: string, data: Record<string, unknown>): FirestoreChatMessage => {
  return {
    ...data,
    id,
    timestamp: timestampToDate(data.timestamp as any),
  } as FirestoreChatMessage;
};

export const firestoreChatService = {
  getSessionsByUser: async (userId: string): Promise<FirestoreChatSession[]> => {
    if (isFirebaseConfigured() && db) {
      const q = query(
        collection(db, COLLECTIONS.CHAT_SESSIONS),
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => mapChatSessionFromDoc(d.id, d.data()));
    }
    const store = getLocalStorageData<{ chatSessions: any[] }>('question-store', { chatSessions: [] });
    return (store.chatSessions || [])
      .filter(s => s.userId === userId)
      .map(s => ({
        ...s,
        createdAt: timestampToDate(s.createdAt),
        updatedAt: timestampToDate(s.updatedAt),
      }));
  },

  createSession: async (session: Omit<FirestoreChatSession, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const id = generateIds.chat();
    if (isFirebaseConfigured() && db) {
      await setDoc(doc(db, COLLECTIONS.CHAT_SESSIONS, id), {
        ...session,
        id,
        totalMessages: session.totalMessages ?? 0,
        totalQuestionsGenerated: session.totalQuestionsGenerated ?? 0,
        totalQuestionsSaved: session.totalQuestionsSaved ?? 0,
        status: session.status ?? 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return id;
    }
    const store = getLocalStorageData<{ chatSessions: any[] }>('question-store', { chatSessions: [] });
    if (!store.chatSessions) store.chatSessions = [];
    store.chatSessions.push({
      ...session,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    saveLocalStorageData('question-store', store);
    return id;
  },

  /**
   * Same as createSession, but uses a specific session id.
   * This allows the UI to keep stable ids and makes it easier to sync chat text reliably.
   */
  createSessionWithId: async (
    sessionId: string,
    session: Omit<FirestoreChatSession, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> => {
    if (isFirebaseConfigured() && db) {
      await setDoc(doc(db, COLLECTIONS.CHAT_SESSIONS, sessionId), stripUndefined({
        ...session,
        id: sessionId,
        totalMessages: session.totalMessages ?? 0,
        totalQuestionsGenerated: session.totalQuestionsGenerated ?? 0,
        totalQuestionsSaved: session.totalQuestionsSaved ?? 0,
        status: session.status ?? 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }) as any);
      return sessionId;
    }

    const store = getLocalStorageData<{ chatSessions: any[] }>('question-store', { chatSessions: [] });
    if (!store.chatSessions) store.chatSessions = [];
    store.chatSessions.push({
      ...session,
      id: sessionId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    saveLocalStorageData('question-store', store);
    return sessionId;
  },

  addMessage: async (
    sessionId: string,
    message: Omit<FirestoreChatMessage, 'id' | 'timestamp'>
  ): Promise<string> => {
    const id = generateIds.message();
    if (isFirebaseConfigured() && db) {
      const msgRef = doc(db, COLLECTIONS.CHAT_SESSIONS, sessionId, 'messages', id);
      await setDoc(msgRef, {
        ...message,
        id,
        timestamp: serverTimestamp(),
      });
      await updateDoc(doc(db, COLLECTIONS.CHAT_SESSIONS, sessionId), {
        updatedAt: serverTimestamp(),
        totalMessages: increment(1),
      });
      return id;
    }
    return id;
  },

  /** Same as addMessage but uses a specific message id. */
  addMessageWithId: async (
    sessionId: string,
    messageId: string,
    message: Omit<FirestoreChatMessage, 'id' | 'timestamp'>
  ): Promise<string> => {
    if (isFirebaseConfigured() && db) {
      const msgRef = doc(db, COLLECTIONS.CHAT_SESSIONS, sessionId, 'messages', messageId);
      await setDoc(msgRef, {
        ...stripUndefinedDeep(message as any),
        id: messageId,
        timestamp: serverTimestamp(),
      } as any);
      await updateDoc(doc(db, COLLECTIONS.CHAT_SESSIONS, sessionId), {
        updatedAt: serverTimestamp(),
        totalMessages: increment(1),
      });
      return messageId;
    }

    // local fallback: do not attempt full subcollection modeling; rely on persisted local store
    return messageId;
  },

  updateSession: async (
    sessionId: string,
    updates: Partial<Omit<FirestoreChatSession, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<void> => {
    if (isFirebaseConfigured() && db) {
      await updateDoc(doc(db, COLLECTIONS.CHAT_SESSIONS, sessionId), stripUndefined({
        ...updates,
        updatedAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
      }) as any);
      return;
    }

    const store = getLocalStorageData<{ chatSessions: any[] }>('question-store', { chatSessions: [] });
    store.chatSessions = (store.chatSessions || []).map((s) =>
      s.id === sessionId
        ? { ...s, ...updates, updatedAt: new Date(), lastMessageAt: new Date() }
        : s
    );
    saveLocalStorageData('question-store', store);
  },

  getMessages: async (sessionId: string): Promise<FirestoreChatMessage[]> => {
    if (isFirebaseConfigured() && db) {
      const q = query(
        collection(db, COLLECTIONS.CHAT_SESSIONS, sessionId, 'messages'),
        orderBy('timestamp', 'asc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => mapChatMessageFromDoc(d.id, d.data()));
    }
    return [];
  },

  /** Delete a single chat message from the chat session subcollection. */
  deleteMessage: async (sessionId: string, messageId: string): Promise<void> => {
    if (isFirebaseConfigured() && db) {
      await deleteDoc(doc(db, COLLECTIONS.CHAT_SESSIONS, sessionId, 'messages', messageId));
      return;
    }
  },

  /** Delete an entire chat session AND all messages inside chat_sessions/{sessionId}/messages. */
  deleteSessionAndMessages: async (sessionId: string): Promise<void> => {
    if (isFirebaseConfigured() && db) {
      // Delete messages first because security rules for message deletes read the parent session's userId.
      const messages = await firestoreChatService.getMessages(sessionId);
      for (const m of messages) {
        await deleteDoc(doc(db, COLLECTIONS.CHAT_SESSIONS, sessionId, 'messages', m.id));
      }
      await deleteDoc(doc(db, COLLECTIONS.CHAT_SESSIONS, sessionId));
      return;
    }

    // local fallback handled by zustand state in the UI
  },

  /** Delete all chat sessions (and their messages) for a user. */
  deleteAllSessionsByUser: async (userId: string): Promise<void> => {
    if (isFirebaseConfigured() && db) {
      const sessions = await firestoreChatService.getSessionsByUser(userId);
      for (const s of sessions) {
        await firestoreChatService.deleteSessionAndMessages(s.id);
      }
      return;
    }

    // local fallback handled by zustand state in the UI
  },
};

// ============================================================================
// CHAT SHARE SERVICE (public share links)
// ============================================================================

export const firestoreChatShareService = {
  createShare: async (share: Omit<FirestoreChatShare, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const id = generateIds.chat();
    if (isFirebaseConfigured() && db) {
      await setDoc(doc(db, COLLECTIONS.CHAT_SHARES, id), stripUndefined({
        ...share,
        id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }) as any);
      return id;
    }

    // Local fallback (not globally shareable)
    const store = getLocalStorageData<{ chatShares: any[] }>('question-store', { chatShares: [] });
    if (!store.chatShares) store.chatShares = [];
    store.chatShares.push({
      ...share,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    saveLocalStorageData('question-store', store);
    return id;
  },

  getShare: async (shareId: string): Promise<FirestoreChatShare | null> => {
    if (isFirebaseConfigured() && db) {
      const ref = doc(db, COLLECTIONS.CHAT_SHARES, shareId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return null;
      const data = snap.data() as any;
      return {
        ...data,
        id: snap.id,
        createdAt: timestampToDate(data.createdAt),
        updatedAt: data.updatedAt ? timestampToDate(data.updatedAt) : undefined,
      } as FirestoreChatShare;
    }
    const store = getLocalStorageData<{ chatShares: any[] }>('question-store', { chatShares: [] });
    const found = (store.chatShares || []).find((s) => s.id === shareId);
    if (!found) return null;
    return {
      ...found,
      createdAt: timestampToDate(found.createdAt),
      updatedAt: timestampToDate(found.updatedAt),
    } as FirestoreChatShare;
  },
};

// ============================================================================
// USER SERVICE
// ============================================================================

const mapUserFromDoc = (id: string, data: Record<string, unknown>): FirestoreUser => {
  return {
    ...data,
    id,
    createdAt: timestampToDate(data.createdAt as any),
    updatedAt: data.updatedAt ? timestampToDate(data.updatedAt as any) : undefined,
  } as FirestoreUser;
};

export const firestoreUserService = {
  getAll: async (): Promise<FirestoreUser[]> => {
    if (isFirebaseConfigured() && db) {
      const snapshot = await getDocs(collection(db, COLLECTIONS.USERS));
      return snapshot.docs.map(d => mapUserFromDoc(d.id, d.data()));
    }
    return getLocalStorageData<FirestoreUser[]>('qgenesis-managed-users', []);
  },

  onUsersChange: (callback: (users: FirestoreUser[]) => void): (() => void) => {
    if (isFirebaseConfigured() && db) {
      const unsub = onSnapshot(collection(db, COLLECTIONS.USERS), (snapshot) => {
        callback(snapshot.docs.map((d) => mapUserFromDoc(d.id, d.data())));
      });
      return unsub;
    }
    const interval = setInterval(async () => {
      callback(await firestoreUserService.getAll());
    }, 1000);
    return () => clearInterval(interval);
  },

  getById: async (id: string): Promise<FirestoreUser | null> => {
    if (isFirebaseConfigured() && db) {
      const snap = await getDoc(doc(db, COLLECTIONS.USERS, id));
      if (!snap.exists()) return null;
      return mapUserFromDoc(snap.id, snap.data() ?? {});
    }
    const users = await firestoreUserService.getAll();
    return users.find(u => u.id === id) || null;
  },

  getByDepartment: async (
    department: string,
    institution?: string,
    place?: string
  ): Promise<FirestoreUser[]> => {
    if (isFirebaseConfigured() && db) {
      const q = query(
        collection(db, COLLECTIONS.USERS),
        where('department', '==', department)
      );
      const snapshot = await getDocs(q);
      let results = snapshot.docs.map(d => mapUserFromDoc(d.id, d.data()));
      if (institution != null) results = results.filter(u => u.institution === institution);
      if (place != null) results = results.filter(u => u.place === place);
      return results;
    }
    const users = await firestoreUserService.getAll();
    return users.filter(u => {
      if (u.department !== department) return false;
      if (institution && u.institution !== institution) return false;
      if (place && u.place !== place) return false;
      return true;
    });
  },

  update: async (id: string, updates: Partial<FirestoreUser>): Promise<void> => {
    if (isFirebaseConfigured() && db) {
      await updateDoc(doc(db, COLLECTIONS.USERS, id), {
        ...updates,
        updatedAt: serverTimestamp(),
      });
      return;
    }
    const users = getLocalStorageData<FirestoreUser[]>('qgenesis-managed-users', []);
    const index = users.findIndex(u => u.id === id);
    if (index !== -1) {
      users[index] = { ...users[index], ...updates };
      saveLocalStorageData('qgenesis-managed-users', users);
    }
  },

  delete: async (id: string): Promise<void> => {
    if (isFirebaseConfigured() && db) {
      await deleteDoc(doc(db, COLLECTIONS.USERS, id));
      return;
    }
    const users = getLocalStorageData<FirestoreUser[]>('qgenesis-managed-users', []);
    saveLocalStorageData('qgenesis-managed-users', users.filter(u => u.id !== id));
  },
};

// ============================================================================
// BATCH SERVICE
// ============================================================================

export const firestoreBatchService = {
  batchCreateQuestions: async (questions: Omit<FirestoreQuestion, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<string[]> => {
    const ids: string[] = [];
    for (const q of questions) {
      const id = await firestoreQuestionService.create(q);
      ids.push(id);
    }
    return ids;
  },

  batchUpdateQuestions: async (updates: { id: string; data: Partial<FirestoreQuestion> }[]): Promise<void> => {
    for (const { id, data } of updates) {
      await firestoreQuestionService.update(id, data);
    }
  },

  batchDeleteQuestions: async (ids: string[]): Promise<void> => {
    for (const id of ids) {
      await firestoreQuestionService.delete(id);
    }
  },
};

// ============================================================================
// GENERATED QUESTIONS SERVICE
// ============================================================================

export const firestoreGeneratedQuestionService = {
  updatePublicGeneratedCount: async (delta: number): Promise<void> => {
    if (!isFirebaseConfigured() || !db || !delta) return;
    try {
      await setDoc(
        doc(db, COLLECTIONS.APP_SETTINGS, 'public_stats'),
        {
          totalQuestionsGenerated: increment(delta),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch {
      // Best effort only; generation should never fail due to stats update.
    }
  },

  getAll: async (): Promise<FirestoreGeneratedQuestion[]> => {
    if (isFirebaseConfigured() && db) {
      const q = query(collection(db, COLLECTIONS.GENERATED_QUESTIONS), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ ...d.data(), id: d.id } as FirestoreGeneratedQuestion));
    }
    const store = getLocalStorageData<{ generatedQuestions: any[] }>('generated-questions-store', { generatedQuestions: [] });
    return (store.generatedQuestions || []).map(q => ({
      ...q,
      createdAt: timestampToDate(q.createdAt),
      updatedAt: timestampToDate(q.updatedAt),
    }));
  },

  getById: async (id: string): Promise<FirestoreGeneratedQuestion | null> => {
    const questions = await firestoreGeneratedQuestionService.getAll();
    return questions.find(q => q.id === id) || null;
  },

  getByStaffId: async (staffId: string): Promise<FirestoreGeneratedQuestion[]> => {
    if (isFirebaseConfigured() && db) {
      const q = query(
        collection(db, COLLECTIONS.GENERATED_QUESTIONS),
        where('staffId', '==', staffId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ ...d.data(), id: d.id } as FirestoreGeneratedQuestion));
    }
    const questions = await firestoreGeneratedQuestionService.getAll();
    return questions.filter(q => q.staffId === staffId);
  },

  getByMaterialId: async (materialId: string): Promise<FirestoreGeneratedQuestion[]> => {
    if (isFirebaseConfigured() && db) {
      const q = query(
        collection(db, COLLECTIONS.GENERATED_QUESTIONS),
        where('materialId', '==', materialId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ ...d.data(), id: d.id } as FirestoreGeneratedQuestion));
    }
    const questions = await firestoreGeneratedQuestionService.getAll();
    return questions.filter(q => q.materialId === materialId);
  },

  getByStatus: async (status: string): Promise<FirestoreGeneratedQuestion[]> => {
    const questions = await firestoreGeneratedQuestionService.getAll();
    return questions.filter(q => q.status === status);
  },

  getByDepartment: async (
    department: string,
    institution?: string,
    place?: string
  ): Promise<FirestoreGeneratedQuestion[]> => {
    if (isFirebaseConfigured() && db) {
      const q = query(
        collection(db, COLLECTIONS.GENERATED_QUESTIONS),
        where('department', '==', department),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      let results = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as FirestoreGeneratedQuestion));
      if (institution != null) results = results.filter(q => q.institution === institution);
      if (place != null) results = results.filter(q => q.place === place);
      return results;
    }
    const questions = await firestoreGeneratedQuestionService.getAll();
    return questions.filter(q => {
      if (q.department !== department) return false;
      if (institution && q.institution !== institution) return false;
      if (place && q.place !== place) return false;
      return true;
    });
  },

  create: async (question: Omit<FirestoreGeneratedQuestion, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const id = generateIds.generatedQuestion();
    if (isFirebaseConfigured() && db) {
      const payload = stripUndefined({
        ...question,
        id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      } as Record<string, unknown>);
      await setDoc(doc(db, COLLECTIONS.GENERATED_QUESTIONS, id), payload);
      await firestoreGeneratedQuestionService.updatePublicGeneratedCount(1);
      return id;
    }
    const store = getLocalStorageData<{ generatedQuestions: any[] }>('generated-questions-store', { generatedQuestions: [] });
    if (!store.generatedQuestions) store.generatedQuestions = [];
    store.generatedQuestions.unshift({
      ...question,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    saveLocalStorageData('generated-questions-store', store);
    return id;
  },

  batchCreate: async (questions: Omit<FirestoreGeneratedQuestion, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<string[]> => {
    if (isFirebaseConfigured() && db) {
      const batch = writeBatch(db);
      const ids: string[] = [];
      for (const q of questions) {
        const id = generateIds.generatedQuestion();
        ids.push(id);
        const payload = stripUndefined({
          ...q,
          id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        } as Record<string, unknown>);
        batch.set(doc(db, COLLECTIONS.GENERATED_QUESTIONS, id), payload);
      }
      await batch.commit();
      await firestoreGeneratedQuestionService.updatePublicGeneratedCount(ids.length);
      return ids;
    }
    const ids: string[] = [];
    const store = getLocalStorageData<{ generatedQuestions: any[] }>('generated-questions-store', { generatedQuestions: [] });
    if (!store.generatedQuestions) store.generatedQuestions = [];
    for (const q of questions) {
      const id = generateIds.generatedQuestion();
      ids.push(id);
      store.generatedQuestions.unshift({
        ...q,
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    saveLocalStorageData('generated-questions-store', store);
    return ids;
  },

  update: async (id: string, updates: Partial<FirestoreGeneratedQuestion>): Promise<void> => {
    if (isFirebaseConfigured() && db) {
      const payload = stripUndefined({
        ...updates,
        updatedAt: serverTimestamp(),
      } as Record<string, unknown>);
      await updateDoc(doc(db, COLLECTIONS.GENERATED_QUESTIONS, id), payload);
      return;
    }
    const store = getLocalStorageData<{ generatedQuestions: any[] }>('generated-questions-store', { generatedQuestions: [] });
    const index = (store.generatedQuestions || []).findIndex(q => q.id === id);
    if (index !== -1) {
      store.generatedQuestions[index] = { ...store.generatedQuestions[index], ...updates, updatedAt: new Date() };
      saveLocalStorageData('generated-questions-store', store);
    }
  },

  delete: async (id: string): Promise<void> => {
    if (isFirebaseConfigured() && db) {
      await deleteDoc(doc(db, COLLECTIONS.GENERATED_QUESTIONS, id));
      await firestoreGeneratedQuestionService.updatePublicGeneratedCount(-1);
      return;
    }
    const store = getLocalStorageData<{ generatedQuestions: any[] }>('generated-questions-store', { generatedQuestions: [] });
    store.generatedQuestions = (store.generatedQuestions || []).filter(q => q.id !== id);
    saveLocalStorageData('generated-questions-store', store);
  },

  onGeneratedQuestionsChange: (
    callback: (questions: FirestoreGeneratedQuestion[]) => void,
    filters?: { staffId?: string; materialId?: string; status?: string }
  ): (() => void) => {
    if (isFirebaseConfigured() && db) {
      const constraints: QueryConstraint[] = [];
      if (filters?.staffId) constraints.push(where('staffId', '==', filters.staffId));
      if (filters?.materialId) constraints.push(where('materialId', '==', filters.materialId));
      if (filters?.status) constraints.push(where('status', '==', filters.status));
      constraints.push(orderBy('createdAt', 'desc'));
      const q = query(collection(db, COLLECTIONS.GENERATED_QUESTIONS), ...constraints);
      return onSnapshot(q, (snapshot) => {
        const questions = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as FirestoreGeneratedQuestion));
        callback(questions);
      });
    }
    const interval = setInterval(async () => {
      const questions = await firestoreGeneratedQuestionService.getAll();
      let filtered = questions;
      if (filters?.staffId) filtered = filtered.filter(q => q.staffId === filters.staffId);
      if (filters?.materialId) filtered = filtered.filter(q => q.materialId === filters.materialId);
      if (filters?.status) filtered = filtered.filter(q => q.status === filters.status);
      callback(filtered);
    }, 1000);
    return () => clearInterval(interval);
  },
};

// ============================================================================
// CONFIG: EXAM TYPES, QUESTION TYPES, DEPARTMENTS
// ============================================================================

const CONFIG_STORAGE_KEYS = {
  examTypes: 'qgenesis-exam-types',
  questionTypes: 'qgenesis-question-types',
  departments: 'qgenesis-departments',
} as const;

export interface FirestoreExamType {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

export interface FirestoreQuestionType {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

export interface FirestoreDepartment {
  id: string;
  name: string;
  code: string;
  description: string;
  headOfDepartment?: string;
  createdAt: Date | ReturnType<typeof serverTimestamp>;
}

export const firestoreExamTypeService = {
  getAll: async (): Promise<FirestoreExamType[]> => {
    if (isFirebaseConfigured() && db) {
      const snapshot = await getDocs(collection(db, COLLECTIONS.EXAM_TYPES));
      return snapshot.docs.map(d => ({ ...d.data(), id: d.id } as FirestoreExamType));
    }
    const raw = getLocalStorageData<FirestoreExamType[]>(CONFIG_STORAGE_KEYS.examTypes, []);
    return raw.length ? raw : getLocalStorageData<{ examTypes: FirestoreExamType[] }>('qgenesis-store', { examTypes: [] }).examTypes || [];
  },
  create: async (item: Omit<FirestoreExamType, 'id'> & { id?: string }): Promise<string> => {
    const id = item.id ?? `exam_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    if (isFirebaseConfigured() && db) {
      await setDoc(doc(db, COLLECTIONS.EXAM_TYPES, id), { ...item, id });
      return id;
    }
    const key = CONFIG_STORAGE_KEYS.examTypes;
    const list = getLocalStorageData<FirestoreExamType[]>(key, []);
    list.push({ ...item, id } as FirestoreExamType);
    saveLocalStorageData(key, list);
    return id;
  },
  update: async (id: string, updates: Partial<FirestoreExamType>): Promise<void> => {
    if (isFirebaseConfigured() && db) {
      await updateDoc(doc(db, COLLECTIONS.EXAM_TYPES, id), updates);
      return;
    }
    const key = CONFIG_STORAGE_KEYS.examTypes;
    const list = getLocalStorageData<FirestoreExamType[]>(key, []);
    const idx = list.findIndex(e => e.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates };
      saveLocalStorageData(key, list);
    }
  },
  delete: async (id: string): Promise<void> => {
    if (isFirebaseConfigured() && db) {
      await deleteDoc(doc(db, COLLECTIONS.EXAM_TYPES, id));
      return;
    }
    const key = CONFIG_STORAGE_KEYS.examTypes;
    const list = getLocalStorageData<FirestoreExamType[]>(key, []).filter(e => e.id !== id);
    saveLocalStorageData(key, list);
  },
};

export const firestoreQuestionTypeService = {
  getAll: async (): Promise<FirestoreQuestionType[]> => {
    if (isFirebaseConfigured() && db) {
      const snapshot = await getDocs(collection(db, COLLECTIONS.QUESTION_TYPES));
      return snapshot.docs.map(d => ({ ...d.data(), id: d.id } as FirestoreQuestionType));
    }
    const raw = getLocalStorageData<FirestoreQuestionType[]>(CONFIG_STORAGE_KEYS.questionTypes, []);
    return raw.length ? raw : getLocalStorageData<{ questionTypes: FirestoreQuestionType[] }>('qgenesis-store', { questionTypes: [] }).questionTypes || [];
  },
  create: async (item: Omit<FirestoreQuestionType, 'id'> & { id?: string }): Promise<string> => {
    const id = item.id ?? `qtype_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    if (isFirebaseConfigured() && db) {
      await setDoc(doc(db, COLLECTIONS.QUESTION_TYPES, id), { ...item, id });
      return id;
    }
    const key = CONFIG_STORAGE_KEYS.questionTypes;
    const list = getLocalStorageData<FirestoreQuestionType[]>(key, []);
    list.push({ ...item, id } as FirestoreQuestionType);
    saveLocalStorageData(key, list);
    return id;
  },
  update: async (id: string, updates: Partial<FirestoreQuestionType>): Promise<void> => {
    if (isFirebaseConfigured() && db) {
      await updateDoc(doc(db, COLLECTIONS.QUESTION_TYPES, id), updates);
      return;
    }
    const key = CONFIG_STORAGE_KEYS.questionTypes;
    const list = getLocalStorageData<FirestoreQuestionType[]>(key, []);
    const idx = list.findIndex(q => q.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates };
      saveLocalStorageData(key, list);
    }
  },
  delete: async (id: string): Promise<void> => {
    if (isFirebaseConfigured() && db) {
      await deleteDoc(doc(db, COLLECTIONS.QUESTION_TYPES, id));
      return;
    }
    const key = CONFIG_STORAGE_KEYS.questionTypes;
    const list = getLocalStorageData<FirestoreQuestionType[]>(key, []).filter(q => q.id !== id);
    saveLocalStorageData(key, list);
  },
};

const mapDepartmentFromDoc = (id: string, data: Record<string, unknown>): FirestoreDepartment => ({
  id,
  name: (data.name as string) ?? '',
  code: (data.code as string) ?? '',
  description: (data.description as string) ?? '',
  headOfDepartment: data.headOfDepartment as string | undefined,
  createdAt: data.createdAt ? timestampToDate(data.createdAt as any) : new Date(),
});

export const firestoreDepartmentService = {
  getAll: async (): Promise<FirestoreDepartment[]> => {
    if (isFirebaseConfigured() && db) {
      const snapshot = await getDocs(collection(db, COLLECTIONS.DEPARTMENTS));
      return snapshot.docs.map(d => mapDepartmentFromDoc(d.id, d.data()));
    }
    const key = CONFIG_STORAGE_KEYS.departments;
    const raw = getLocalStorageData<any[]>(key, []);
    return raw.map((d: any) => ({
      id: d.id,
      name: d.name ?? '',
      code: d.code ?? '',
      description: d.description ?? '',
      headOfDepartment: d.headOfDepartment,
      createdAt: d.createdAt ? (d.createdAt instanceof Date ? d.createdAt : new Date(d.createdAt)) : new Date(),
    }));
  },
  onDepartmentsChange: (callback: (departments: FirestoreDepartment[]) => void): (() => void) => {
    if (isFirebaseConfigured() && db) {
      const unsub = onSnapshot(collection(db, COLLECTIONS.DEPARTMENTS), (snapshot) => {
        callback(snapshot.docs.map((d) => mapDepartmentFromDoc(d.id, d.data())));
      });
      return unsub;
    }
    // Local mode: poll localStorage key
    const interval = setInterval(async () => {
      callback(await firestoreDepartmentService.getAll());
    }, 1000);
    return () => clearInterval(interval);
  },
  create: async (item: Omit<FirestoreDepartment, 'id' | 'createdAt'> & { id?: string }): Promise<string> => {
    const id = item.id ?? `dept_${Date.now()}`;
    const createdAt = new Date();
    if (isFirebaseConfigured() && db) {
      await setDoc(doc(db, COLLECTIONS.DEPARTMENTS, id), {
        ...item,
        id,
        createdAt: Timestamp.fromDate(createdAt),
      });
      return id;
    }
    const key = CONFIG_STORAGE_KEYS.departments;
    const list = getLocalStorageData<any[]>(key, []);
    list.push({ ...item, id, createdAt });
    saveLocalStorageData(key, list);
    return id;
  },
  update: async (id: string, updates: Partial<Omit<FirestoreDepartment, 'id' | 'createdAt'>>): Promise<void> => {
    if (isFirebaseConfigured() && db) {
      const payload: Record<string, unknown> = { ...updates };
      await updateDoc(doc(db, COLLECTIONS.DEPARTMENTS, id), payload);
      return;
    }
    const key = CONFIG_STORAGE_KEYS.departments;
    const list = getLocalStorageData<any[]>(key, []);
    const idx = list.findIndex(d => d.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates };
      saveLocalStorageData(key, list);
    }
  },
  delete: async (id: string): Promise<void> => {
    if (isFirebaseConfigured() && db) {
      await deleteDoc(doc(db, COLLECTIONS.DEPARTMENTS, id));
      return;
    }
    const key = CONFIG_STORAGE_KEYS.departments;
    const list = getLocalStorageData<any[]>(key, []).filter((d: any) => d.id !== id);
    saveLocalStorageData(key, list);
  },
};

// ============================================================================
// USER ACTIVITIES (admin monitoring)
// ============================================================================

export interface FirestoreUserActivity {
  id?: string;
  userId: string;
  userName: string;
  email?: string;
  role?: string;
  action: string;
  timestamp: Date | ReturnType<typeof serverTimestamp>;
}

export const firestoreUserActivityService = {
  create: async (activity: Omit<FirestoreUserActivity, 'id'>): Promise<string> => {
    if (!isFirebaseConfigured() || !db) {
      return '';
    }
    const id = `act_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const payload = {
      userId: activity.userId,
      userName: activity.userName,
      email: activity.email ?? null,
      role: activity.role ?? null,
      action: activity.action,
      timestamp: activity.timestamp instanceof Date ? Timestamp.fromDate(activity.timestamp) : serverTimestamp(),
    };
    await setDoc(doc(db, COLLECTIONS.USER_ACTIVITIES, id), payload);
    return id;
  },

  getAll: async (): Promise<FirestoreUserActivity[]> => {
    if (!isFirebaseConfigured() || !db) return [];
    const q = query(
      collection(db, COLLECTIONS.USER_ACTIVITIES),
      orderBy('timestamp', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        userId: data.userId,
        userName: data.userName,
        email: data.email,
        role: data.role,
        action: data.action,
        timestamp: data.timestamp ? timestampToDate(data.timestamp) : new Date(),
      } as FirestoreUserActivity;
    });
  },
  onActivitiesChange: (callback: (activities: FirestoreUserActivity[]) => void): (() => void) => {
    if (!isFirebaseConfigured() || !db) {
      const interval = setInterval(async () => callback(await firestoreUserActivityService.getAll()), 2000);
      return () => clearInterval(interval);
    }
    const qRef = query(collection(db, COLLECTIONS.USER_ACTIVITIES), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(qRef, (snapshot) => {
      callback(
        snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            userId: data.userId,
            userName: data.userName,
            email: data.email,
            role: data.role,
            action: data.action,
            timestamp: data.timestamp ? timestampToDate(data.timestamp) : new Date(),
          } as FirestoreUserActivity;
        })
      );
    });
    return unsub;
  },
};

// ============================================================================
// APP SETTINGS / LOGO
// ============================================================================

const LOGO_SETTINGS_DOC_ID = 'logo';

export const firestoreLogoSettingsService = {
  get: async (): Promise<Record<string, unknown> | null> => {
    if (!isFirebaseConfigured() || !db) return null;
    try {
      const snap = await getDoc(doc(db, COLLECTIONS.APP_SETTINGS, LOGO_SETTINGS_DOC_ID));
      return snap.exists() ? (snap.data() as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  },
  set: async (settings: Record<string, unknown>): Promise<void> => {
    if (!isFirebaseConfigured() || !db) return;
    await setDoc(doc(db, COLLECTIONS.APP_SETTINGS, LOGO_SETTINGS_DOC_ID), {
      ...settings,
      updatedAt: serverTimestamp(),
    });
  },
};

// ============================================================================
// EXPORT ALL
// ============================================================================

export const firestoreServices = {
  questions: firestoreQuestionService,
  generatedQuestions: firestoreGeneratedQuestionService,
  materials: firestoreMaterialService,
  papers: firestorePaperService,
  notifications: firestoreNotificationService,
  securityHistory: firestoreSecurityHistoryService,
  questionBank: firestoreQuestionBankService,
  feedback: firestoreFeedbackService,
  chat: firestoreChatService,
  users: firestoreUserService,
  userActivities: firestoreUserActivityService,
  batch: firestoreBatchService,
  examTypes: firestoreExamTypeService,
  questionTypes: firestoreQuestionTypeService,
  departments: firestoreDepartmentService,
};

export default firestoreServices;
