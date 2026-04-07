import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Feedback {
  id: string;
  rating: number;
  comment: string;
  userType: 'staff' | 'hod' | 'admin' | 'public';
  instituteName?: string;
  userEmail?: string;
  userName?: string;
  createdAt: Date;
}

interface FeedbackStore {
  feedbacks: Feedback[];
  
  addFeedback: (feedback: Omit<Feedback, 'id' | 'createdAt'>) => void;
  deleteFeedback: (id: string) => void;
  getFeedbacksByType: (type: string) => Feedback[];
  getAverageRating: () => number;
}

export const useFeedbackStore = create<FeedbackStore>()(
  persist(
    (set, get) => ({
      feedbacks: [],
      
      addFeedback: (feedback) => {
        const id = `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newFeedback: Feedback = {
          ...feedback,
          id,
          createdAt: new Date(),
        };
        set((state) => ({ feedbacks: [newFeedback, ...state.feedbacks] }));
      },
      
      deleteFeedback: (id) => {
        set((state) => ({
          feedbacks: state.feedbacks.filter((f) => f.id !== id),
        }));
      },
      
      getFeedbacksByType: (type) => {
        return get().feedbacks.filter((f) => f.userType === type);
      },
      
      getAverageRating: () => {
        const feedbacks = get().feedbacks;
        if (feedbacks.length === 0) return 0;
        return feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length;
      },
    }),
    {
      name: 'qgenesis-feedback-store',
    }
  )
);
