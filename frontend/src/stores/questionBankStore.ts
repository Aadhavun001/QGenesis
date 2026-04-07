import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface QuestionBankItem {
  id: string;
  content: string;
  answer?: string;
  marks: number;
  btl: string;
  type: string;
  topic: string;
  difficulty: string;
  examType: string;
  subject?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface QuestionBankStore {
  bankQuestions: QuestionBankItem[];
  
  // Actions
  addToBank: (question: Omit<QuestionBankItem, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateBankQuestion: (id: string, updates: Partial<QuestionBankItem>) => void;
  deleteBankQuestion: (id: string) => void;
  deleteAllBankQuestions: () => void;
  
  // Get filtered questions
  getByTopic: (topic: string) => QuestionBankItem[];
  getByDifficulty: (difficulty: string) => QuestionBankItem[];
  getByExamType: (examType: string) => QuestionBankItem[];
}

export const useQuestionBankStore = create<QuestionBankStore>()(
  persist(
    (set, get) => ({
      bankQuestions: [],
      
      addToBank: (question) => {
        const id = `qb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newQuestion: QuestionBankItem = {
          ...question,
          id,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        set((state) => ({
          bankQuestions: [...state.bankQuestions, newQuestion],
        }));
        return id;
      },
      
      updateBankQuestion: (id, updates) => {
        set((state) => ({
          bankQuestions: state.bankQuestions.map((q) =>
            q.id === id ? { ...q, ...updates, updatedAt: new Date() } : q
          ),
        }));
      },
      
      deleteBankQuestion: (id) => {
        set((state) => ({
          bankQuestions: state.bankQuestions.filter((q) => q.id !== id),
        }));
      },
      
      deleteAllBankQuestions: () => {
        set({ bankQuestions: [] });
      },
      
      getByTopic: (topic) => {
        return get().bankQuestions.filter(q => 
          q.topic.toLowerCase().includes(topic.toLowerCase())
        );
      },
      
      getByDifficulty: (difficulty) => {
        return get().bankQuestions.filter(q => q.difficulty === difficulty);
      },
      
      getByExamType: (examType) => {
        return get().bankQuestions.filter(q => q.examType === examType);
      },
    }),
    {
      name: 'question-bank-store',
    }
  )
);
