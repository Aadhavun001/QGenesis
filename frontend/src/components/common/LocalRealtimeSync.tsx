/**
 * Local (non-Firebase) realtime sync.
 *
 * Zustand persist writes to localStorage, but other tabs/pages won't update in-memory state automatically.
 * This component listens for storage changes and rehydrates key slices so Staff/HOD/Admin flows work
 * immediately even without Firebase.
 */
import { useEffect } from 'react';
import { isFirebaseConfigured } from '@/services/firebase/firestore-config';
import { useQuestionStore } from '@/stores/questionStore';
import { useQuestionPaperStore } from '@/stores/questionPaperStore';
import { timestampToDate } from '@/services/firebase/converters';
import type { GeneratedQuestion, Notification, UploadedMaterial } from '@/stores/questionStore';
import type { QuestionPaper } from '@/stores/questionPaperStore';

function readPersistedState<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return (parsed?.state ?? null) as T | null;
  } catch {
    return null;
  }
}

function reviveQuestionDates(q: any): GeneratedQuestion {
  return {
    ...q,
    createdAt: timestampToDate(q.createdAt),
    updatedAt: timestampToDate(q.updatedAt),
    editHistory: q.editHistory?.map((e: any) => ({
      ...e,
      timestamp: timestampToDate(e.timestamp ?? e.createdAt),
    })),
  } as GeneratedQuestion;
}

function reviveNotificationDates(n: any): Notification {
  return {
    ...n,
    createdAt: timestampToDate(n.createdAt),
    updatedAt: n.updatedAt ? timestampToDate(n.updatedAt) : undefined,
  } as Notification;
}

function reviveMaterialDates(m: any): UploadedMaterial {
  return {
    ...m,
    uploadedAt: timestampToDate(m.uploadedAt ?? m.createdAt),
    processedAt: m.processedAt ? timestampToDate(m.processedAt) : undefined,
  } as UploadedMaterial;
}

function revivePaperDates(p: any): QuestionPaper {
  return {
    ...p,
    createdAt: timestampToDate(p.createdAt),
    updatedAt: timestampToDate(p.updatedAt),
    submittedAt: p.submittedAt ? timestampToDate(p.submittedAt) : undefined,
    lockedAt: p.lockedAt ? timestampToDate(p.lockedAt) : undefined,
    unlockedAt: p.unlockedAt ? timestampToDate(p.unlockedAt) : undefined,
    printedAt: p.printedAt ? timestampToDate(p.printedAt) : undefined,
  } as QuestionPaper;
}

export function LocalRealtimeSync() {
  const setQuestions = useQuestionStore((s) => s.setQuestions);
  const setMaterials = useQuestionStore((s) => s.setMaterials);
  const setNotifications = useQuestionStore((s) => s.setNotifications);
  const setPapers = useQuestionPaperStore((s) => s.setPapers);

  useEffect(() => {
    if (isFirebaseConfigured()) return;

    const hydrateQuestionsStore = () => {
      const state = readPersistedState<any>('qgenesis-store');
      if (!state) return;
      if (Array.isArray(state.questions)) setQuestions(state.questions.map(reviveQuestionDates));
      if (Array.isArray(state.materials)) setMaterials(state.materials.map(reviveMaterialDates));
      if (Array.isArray(state.notifications)) setNotifications(state.notifications.map(reviveNotificationDates));
    };

    const hydratePapersStore = () => {
      const state = readPersistedState<any>('question-paper-store');
      if (!state) return;
      if (Array.isArray(state.papers)) setPapers(state.papers.map(revivePaperDates));
    };

    // Initial hydrate on mount
    hydrateQuestionsStore();
    hydratePapersStore();

    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key === 'qgenesis-store') hydrateQuestionsStore();
      if (e.key === 'question-paper-store') hydratePapersStore();
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [setQuestions, setMaterials, setNotifications, setPapers]);

  return null;
}

