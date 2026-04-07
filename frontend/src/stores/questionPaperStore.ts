import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { isFirebaseConfigured } from '@/services/firebase/firestore-config';
import { firestorePaperService } from '@/services/firebase/firestore-database';

/** Persist current paper sections to Firestore after section/question changes so data is not lost on navigate. */
function persistPaperSectionsToFirestore(paperId: string, get: () => { papers: QuestionPaper[] }) {
  if (!isFirebaseConfigured()) return;
  const paper = get().papers.find((p) => p.id === paperId);
  if (!paper) return;
  firestorePaperService.update(paperId, { sections: paper.sections }).catch(() => {
    // Upsert fallback prevents section/OR loss if the paper doc is missing or update fails.
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = paper as any;
    firestorePaperService.createWithId(paperId, rest).catch(() => {});
  });
}

export interface SecurityHistoryEntry {
  id: string;
  action: 'locked' | 'unlocked' | 'unlock_requested' | 'unlock_approved' | 'unlock_denied' | 'relocked';
  itemType: 'question' | 'paper';
  itemId: string;
  itemTitle: string;
  performedBy: string;
  performedByRole: 'staff' | 'hod' | 'admin';
  reason?: string;
  timestamp: Date;
  department?: string;
  institution?: string;
  place?: string;
}

export interface PaperQuestion {
  id: string;
  questionNo: number;
  subDivision: string;
  content: string;
  marks: number;
  btl: string;
  type: string;
  answer?: string;
  alternativeId?: string; // Links to alternative question
  isAlternative?: boolean;
}

export interface PaperSection {
  id: string;
  name: string;
  instructions?: string;
  questions: PaperQuestion[];
}

export interface CourseOutcome {
  code: string;
  description: string;
}

export interface QuestionPaper {
  id: string;
  title: string;
  examType: string;
  collegeName: string;
  departmentName: string;
  courseName: string;
  courseCode: string;
  semester: string;
  duration: string;
  maxMarks: number;
  date?: string;
  instructions: string[];
  courseOutcomes: CourseOutcome[];
  coMapping: { [key: string]: string }; // Question to CO mapping
  sections: PaperSection[];
  paperColor: string;
  textColor: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'print-ready' | 'submitted';
  feedback?: string;
  createdAt: Date;
  updatedAt: Date;
  staffId?: string;
  staffName?: string;
  department?: string;
  institution?: string;
  place?: string;
  submittedAt?: Date;
  // Lock system
  isLocked?: boolean;
  lockedAt?: Date;
  lockedBy?: string;
  hasUnlockRequest?: boolean;
  unlockRequestReason?: string;
  unlockedAt?: Date;
  unlockedBy?: string;
  printedAt?: Date;
  unlockApprovalCount?: number; // Max 2 approvals allowed from HOD
  deletedByStaff?: boolean;
}

interface QuestionPaperStore {
  papers: QuestionPaper[];
  deletedPapers: QuestionPaper[];
  /** IDs of papers user deleted this session; sync must not re-add them (restore only via History) */
  deletedPaperIds: string[];
  viewer: { role: 'staff' | 'hod' | 'admin'; userId: string } | null;
  activePaperId: string | null;
  securityHistory: SecurityHistoryEntry[];

  // Paper actions
  setViewer: (viewer: { role: 'staff' | 'hod' | 'admin'; userId: string } | null) => void;
  setPapers: (papers: QuestionPaper[]) => void;
  createPaper: (paper: Omit<QuestionPaper, 'id' | 'createdAt' | 'updatedAt' | 'sections' | 'status'>) => string;
  updatePaper: (id: string, updates: Partial<QuestionPaper>) => void;
  deletePaper: (id: string) => void;
  deleteAllPapers: () => void;
  /** Permanent delete (e.g. by HOD); removes from Firestore and store. */
  deletePaperPermanently: (id: string) => void;
  undoDeletePaper: (id: string) => void;
  undoAllDeletedPapers: () => void;
  clearDeletedPapers: () => void;
  setActivePaper: (id: string | null) => void;
  
  // Section actions
  addSection: (paperId: string, section: Omit<PaperSection, 'id'>) => string;
  updateSection: (paperId: string, sectionId: string, updates: Partial<PaperSection>) => void;
  deleteSection: (paperId: string, sectionId: string) => void;
  
  // Question actions within paper
  addQuestionToPaper: (paperId: string, sectionId: string, question: Omit<PaperQuestion, 'id'>) => string;
  updatePaperQuestion: (paperId: string, sectionId: string, questionId: string, updates: Partial<PaperQuestion>) => void;
  deletePaperQuestion: (paperId: string, sectionId: string, questionId: string) => void;
  reorderQuestions: (paperId: string, sectionId: string, questions: PaperQuestion[]) => void;
  
  // Alternative question
  addAlternativeQuestion: (paperId: string, sectionId: string, originalQuestionId: string, question: Omit<PaperQuestion, 'id' | 'alternativeId' | 'isAlternative'>) => string;
  
  // Send for approval
  sendPaperForApproval: (paperId: string) => void;
  
  // Submit paper to HOD (final submission)
  submitPaperToHod: (paperId: string, staffName?: string) => void;
  
  // Security history
  addSecurityHistoryEntry: (entry: Omit<SecurityHistoryEntry, 'id' | 'timestamp'>) => void;
  clearSecurityHistory: () => void;
}

export const useQuestionPaperStore = create<QuestionPaperStore>()(
  persist(
    (set, get) => ({
      papers: [],
      deletedPapers: [],
      deletedPaperIds: [],
      viewer: null,
      activePaperId: null,
      securityHistory: [],

      setViewer: (viewer) => set({ viewer }),

      setPapers: (papers) => {
        set((state) => {
          // IMPORTANT: staff delete/hide is per-device + per-user.
          // Never hide papers for HOD/Admin views.
          const deletedSet = state.viewer?.role === 'staff' ? new Set(state.deletedPaperIds) : new Set<string>();
          const byId = new Map<string, QuestionPaper>();
          state.papers.forEach((p) => byId.set(p.id, p));
          papers.forEach((incoming) => {
            if (deletedSet.has(incoming.id)) return;
            const existing = byId.get(incoming.id);
            const existingUpdated = existing?.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
            const incomingUpdated = incoming?.updatedAt ? new Date(incoming.updatedAt).getTime() : 0;
            if (existing && existingUpdated > incomingUpdated) return;
            byId.set(incoming.id, incoming);
          });
          return { papers: Array.from(byId.values()) };
        });
      },

      createPaper: (paper) => {
        const id = `paper_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newPaper: QuestionPaper = {
          ...paper,
          id,
          sections: [],
          status: 'draft',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        set((state) => ({ 
          papers: [...state.papers, newPaper],
          activePaperId: id 
        }));
        return id;
      },
      
      updatePaper: (id, updates) => {
        set((state) => ({
          papers: state.papers.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p
          ),
        }));
        if (isFirebaseConfigured()) {
          const paper = get().papers.find((p) => p.id === id);
          firestorePaperService.update(id, updates).catch(() => {
            // If the doc doesn't exist yet (or update fails), upsert the full paper so lock/status cannot "snap back".
            if (!paper) return;
            const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = paper as any;
            firestorePaperService.createWithId(id, rest).catch(() => {});
          });
        }
      },
      
      deletePaper: (id) => {
        const paper = get().papers.find(p => p.id === id);
        if (paper) {
          set((state) => ({
            papers: state.papers.filter((p) => p.id !== id),
            deletedPapers: [...state.deletedPapers, paper],
            // Staff cannot update/delete submitted/approved in Firestore (rules allow only draft updates).
            // Persistently hide so it never reappears after sync/login unless restored from History.
            deletedPaperIds: state.deletedPaperIds.includes(id) ? state.deletedPaperIds : [...state.deletedPaperIds, id],
            activePaperId: state.activePaperId === id ? null : state.activePaperId,
          }));
          if (isFirebaseConfigured()) {
            // Best-effort only (will fail for submitted/approved due to rules).
            firestorePaperService.update(id, { deletedByStaff: true }).catch(() => {});
          }
        }
      },

      deleteAllPapers: () => {
        const toDelete = get().papers;
        const ids = toDelete.map((p) => p.id);
        set((state) => ({
          deletedPapers: [...state.deletedPapers, ...state.papers],
          papers: [],
          deletedPaperIds: [...state.deletedPaperIds, ...ids],
          activePaperId: null,
        }));
        if (isFirebaseConfigured()) {
          toDelete.forEach((p) => firestorePaperService.update(p.id, { deletedByStaff: true }).catch(() => {}));
        }
      },

      deletePaperPermanently: (id) => {
        set((state) => ({
          papers: state.papers.filter((p) => p.id !== id),
          deletedPapers: state.deletedPapers.filter((p) => p.id !== id),
          activePaperId: state.activePaperId === id ? null : state.activePaperId,
        }));
        if (isFirebaseConfigured()) {
          firestorePaperService.delete(id).catch(() => {});
        }
      },

      undoDeletePaper: (id) => {
        const paper = get().deletedPapers.find(p => p.id === id);
        if (paper) {
          set((state) => ({
            deletedPapers: state.deletedPapers.filter((p) => p.id !== id),
            papers: [...state.papers, paper],
            deletedPaperIds: state.deletedPaperIds.filter((x) => x !== id),
          }));
          if (isFirebaseConfigured()) {
            firestorePaperService.update(id, { deletedByStaff: false }).catch(() => {});
          }
        }
      },

      undoAllDeletedPapers: () => {
        const restored = get().deletedPapers;
        const restoredIds = restored.map((p) => p.id);
        set((state) => ({
          papers: [...state.papers, ...state.deletedPapers],
          deletedPapers: [],
          deletedPaperIds: state.deletedPaperIds.filter((id) => !restoredIds.includes(id)),
        }));
        if (isFirebaseConfigured()) {
          restored.forEach((p) => firestorePaperService.update(p.id, { deletedByStaff: false }).catch(() => {}));
        }
      },

      clearDeletedPapers: () => {
        const toRemove = get().deletedPapers;
        const ids = new Set(toRemove.map((p) => p.id));
        if (isFirebaseConfigured()) {
          toRemove.forEach((p) => firestorePaperService.delete(p.id).catch(() => {}));
        }
        set((state) => ({
          deletedPapers: [],
          // If a paper cannot be deleted in Firestore (submitted/approved), keep it hidden forever.
          // Removing ids here would cause it to reappear after login/sync.
          deletedPaperIds: state.deletedPaperIds,
        }));
      },
      
      setActivePaper: (id) => {
        set({ activePaperId: id });
      },
      
      addSection: (paperId, section) => {
        const id = `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        set((state) => ({
          papers: state.papers.map((p) =>
            p.id === paperId
              ? { ...p, sections: [...p.sections, { ...section, id }], updatedAt: new Date() }
              : p
          ),
        }));
        persistPaperSectionsToFirestore(paperId, get);
        return id;
      },
      
      updateSection: (paperId, sectionId, updates) => {
        set((state) => ({
          papers: state.papers.map((p) =>
            p.id === paperId
              ? {
                  ...p,
                  sections: p.sections.map((s) =>
                    s.id === sectionId ? { ...s, ...updates } : s
                  ),
                  updatedAt: new Date(),
                }
              : p
          ),
        }));
        persistPaperSectionsToFirestore(paperId, get);
      },
      
      deleteSection: (paperId, sectionId) => {
        set((state) => ({
          papers: state.papers.map((p) =>
            p.id === paperId
              ? { ...p, sections: p.sections.filter((s) => s.id !== sectionId), updatedAt: new Date() }
              : p
          ),
        }));
        persistPaperSectionsToFirestore(paperId, get);
      },
      
      addQuestionToPaper: (paperId, sectionId, question) => {
        const id = `pq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        set((state) => ({
          papers: state.papers.map((p) =>
            p.id === paperId
              ? {
                  ...p,
                  sections: p.sections.map((s) =>
                    s.id === sectionId
                      ? { ...s, questions: [...s.questions, { ...question, id }] }
                      : s
                  ),
                  updatedAt: new Date(),
                }
              : p
          ),
        }));
        persistPaperSectionsToFirestore(paperId, get);
        return id;
      },
      
      updatePaperQuestion: (paperId, sectionId, questionId, updates) => {
        set((state) => ({
          papers: state.papers.map((p) =>
            p.id === paperId
              ? {
                  ...p,
                  sections: p.sections.map((s) =>
                    s.id === sectionId
                      ? {
                          ...s,
                          questions: s.questions.map((q) =>
                            q.id === questionId ? { ...q, ...updates } : q
                          ),
                        }
                      : s
                  ),
                  updatedAt: new Date(),
                }
              : p
          ),
        }));
        persistPaperSectionsToFirestore(paperId, get);
      },
      
      deletePaperQuestion: (paperId, sectionId, questionId) => {
        set((state) => ({
          papers: state.papers.map((p) =>
            p.id === paperId
              ? {
                  ...p,
                  sections: p.sections.map((s) =>
                    s.id === sectionId
                      ? { ...s, questions: s.questions.filter((q) => q.id !== questionId && q.alternativeId !== questionId) }
                      : s
                  ),
                  updatedAt: new Date(),
                }
              : p
          ),
        }));
        persistPaperSectionsToFirestore(paperId, get);
      },
      
      reorderQuestions: (paperId, sectionId, questions) => {
        set((state) => ({
          papers: state.papers.map((p) =>
            p.id === paperId
              ? {
                  ...p,
                  sections: p.sections.map((s) =>
                    s.id === sectionId ? { ...s, questions } : s
                  ),
                  updatedAt: new Date(),
                }
              : p
          ),
        }));
        persistPaperSectionsToFirestore(paperId, get);
      },
      
      addAlternativeQuestion: (paperId, sectionId, originalQuestionId, question) => {
        const id = `pq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        set((state) => ({
          papers: state.papers.map((p) =>
            p.id === paperId
              ? {
                  ...p,
                  sections: p.sections.map((s) => {
                    if (s.id === sectionId) {
                      const originalIndex = s.questions.findIndex(q => q.id === originalQuestionId);
                      if (originalIndex !== -1) {
                        const newQuestions = [...s.questions];
                        const altQuestion: PaperQuestion = {
                          ...question,
                          id,
                          alternativeId: originalQuestionId,
                          isAlternative: true,
                        };
                        // Insert after original question
                        newQuestions.splice(originalIndex + 1, 0, altQuestion);
                        return { ...s, questions: newQuestions };
                      }
                    }
                    return s;
                  }),
                  updatedAt: new Date(),
                }
              : p
          ),
        }));
        persistPaperSectionsToFirestore(paperId, get);
        return id;
      },
      
      sendPaperForApproval: (paperId) => {
        set((state) => ({
          papers: state.papers.map((p) =>
            p.id === paperId ? { 
              ...p, 
              status: 'pending' as const, 
              isLocked: true,
              lockedAt: new Date(),
              updatedAt: new Date() 
            } : p
          ),
        }));
        if (isFirebaseConfigured()) {
          const paper = get().papers.find((p) => p.id === paperId);
          const updates = { status: 'pending', isLocked: true, lockedAt: new Date() } as any;
          firestorePaperService.update(paperId, updates).catch(() => {
            if (!paper) return;
            const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = paper as any;
            firestorePaperService.createWithId(paperId, rest).catch(() => {});
          });
        }
      },
      
      submitPaperToHod: (paperId, staffName) => {
        set((state) => ({
          papers: state.papers.map((p) =>
            p.id === paperId ? { 
              ...p, 
              status: 'submitted' as const, 
              isLocked: true,
              lockedAt: new Date(),
              submittedAt: new Date(),
              staffName: staffName || p.staffName,
              updatedAt: new Date() 
            } : p
          ),
        }));
        if (isFirebaseConfigured()) {
          const paper = get().papers.find((p) => p.id === paperId);
          const updates = { status: 'submitted', isLocked: true, lockedAt: new Date(), submittedAt: new Date(), staffName } as any;
          firestorePaperService.update(paperId, updates).catch(() => {
            if (!paper) return;
            const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = paper as any;
            firestorePaperService.createWithId(paperId, rest).catch(() => {});
          });
        }
      },
      
      addSecurityHistoryEntry: (entry) => {
        const id = `sh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        set((state) => ({
          securityHistory: [
            { ...entry, id, timestamp: new Date() },
            ...state.securityHistory,
          ],
        }));
      },
      
      clearSecurityHistory: () => {
        set({ securityHistory: [] });
      },
    }),
    {
      name: 'question-paper-store',
    }
  )
);
