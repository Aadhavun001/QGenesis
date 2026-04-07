/**
 * Subscribes to Firestore papers for the current user (by role) and keeps
 * the question paper store in sync. Staff see only their own papers;
 * HOD see department papers; Admin see all.
 */
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuestionPaperStore } from '@/stores/questionPaperStore';
import { isFirebaseConfigured } from '@/services/firebase/firestore-config';
import { firestorePaperService } from '@/services/firebase/firestore-database';
import { timestampToDate } from '@/services/firebase/converters';
import type { QuestionPaper } from '@/stores/questionPaperStore';
import type { FirestorePaper } from '@/services/firebase/types';

function mapFirestoreToStore(p: FirestorePaper): QuestionPaper {
  const raw = p as any;
  return {
    ...p,
    id: p.id,
    createdAt: timestampToDate(raw.createdAt),
    updatedAt: timestampToDate(raw.updatedAt),
    submittedAt: raw.submittedAt ? timestampToDate(raw.submittedAt) : undefined,
    lockedAt: raw.lockedAt ? timestampToDate(raw.lockedAt) : undefined,
    unlockedAt: raw.unlockedAt ? timestampToDate(raw.unlockedAt) : undefined,
    printedAt: raw.printedAt ? timestampToDate(raw.printedAt) : undefined,
  } as QuestionPaper;
}

export function FirestorePapersSync() {
  const { user } = useAuth();
  const setPapers = useQuestionPaperStore((s) => s.setPapers);
  const setViewer = useQuestionPaperStore((s) => s.setViewer);

  useEffect(() => {
    if (!isFirebaseConfigured() || !user?.id) return;
    setViewer({ role: user.role, userId: user.id });

    // Staff: only their papers. HOD: get all then filter client-side so we don't miss papers with missing department.
    // Admin: no filter (all papers).
    const filters =
      user.role === 'staff'
        ? { staffId: user.id }
        : user.role === 'hod'
          ? undefined
          : undefined;

    const unsubscribe = firestorePaperService.onPapersChange(
      (papers) => {
        let list = papers;
        if (user.role === 'staff') {
          list = list.filter((p: any) => p.deletedByStaff !== true);
        }
        if (user.role === 'hod') {
          if (user.department != null && user.department !== '') list = list.filter((p: any) => !p.department || p.department === user.department);
          if (user.institution != null && user.institution !== '') list = list.filter((p: any) => !(p as any).institution || (p as any).institution === user.institution);
          if (user.place != null && user.place !== '') list = list.filter((p: any) => !(p as any).place || (p as any).place === user.place);
        }
        const mapped = list.map(mapFirestoreToStore);
        setPapers(mapped);
      },
      filters
    );

    return () => unsubscribe();
  }, [user?.id, user?.role, user?.department, user?.institution, user?.place, setPapers, setViewer]);

  return null;
}
