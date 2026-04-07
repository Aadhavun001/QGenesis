/**
 * Subscribes to Firestore questions for the current staff user and keeps
 * the question store in sync for real-time stats and list updates.
 */
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuestionStore } from '@/stores/questionStore';
import { isFirebaseConfigured } from '@/services/firebase/firestore-config';
import { firestoreQuestionService } from '@/services/firebase/firestore-database';
import { timestampToDate } from '@/services/firebase/converters';
import type { GeneratedQuestion } from '@/stores/questionStore';
import type { FirestoreQuestion } from '@/services/firebase/types';

function mapFirestoreToStore(q: FirestoreQuestion): GeneratedQuestion {
  const raw = q as any;
  const editHistory = raw.editHistory?.map((entry: any) => ({
    ...entry,
    timestamp: timestampToDate(entry?.timestamp ?? entry?.createdAt),
  })) ?? raw.editHistory;
  return {
    ...q,
    id: q.id,
    createdAt: timestampToDate(raw.createdAt),
    updatedAt: timestampToDate(raw.updatedAt),
    editHistory,
  } as GeneratedQuestion;
}

export function FirestoreQuestionsSync() {
  const { user } = useAuth();
  const setQuestions = useQuestionStore((s) => s.setQuestions);

  useEffect(() => {
    if (!isFirebaseConfigured() || !user?.id) return;

    // Staff: only their questions. HOD: get all then filter client-side so we don't miss items with missing department.
    const filters =
      user.role === 'staff'
        ? { staffId: user.id }
        : user.role === 'hod'
          ? undefined
          : undefined;

    const unsubscribe = firestoreQuestionService.onQuestionsChange(
      (questions) => {
        let list = questions;
        if (user.role === 'hod') {
          if (user.department != null && user.department !== '') list = list.filter((q: any) => !q.department || q.department === user.department);
          if (user.institution != null) list = list.filter((q: any) => !q.institution || q.institution === user.institution);
          if (user.place != null) list = list.filter((q: any) => !q.place || q.place === user.place);
        }
        const mapped = list.map(mapFirestoreToStore);
        setQuestions(mapped);
      },
      filters
    );

    return () => unsubscribe();
  }, [user?.id, user?.role, user?.department, user?.institution, user?.place, setQuestions]);

  return null;
}
