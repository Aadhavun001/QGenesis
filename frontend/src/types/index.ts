export type UserRole = 'staff' | 'hod' | 'admin';

export interface User {
  id: string;
  email: string;
  phone?: string;
  displayName: string;
  role: UserRole;
  department?: string;
  institution?: string;
  place?: string;
  avatar?: string;
  avatarPosition?: { x: number; y: number };
  avatarZoom?: number;
  useDefaultAvatar?: boolean;
  dashboardColor?: string;
  status?: 'active' | 'blocked';
  createdAt: Date;
}

export type ExamType = 'ca1' | 'ca2' | 'sem' | string;
export type QuestionType = 'mcq' | 'short' | 'long' | 'descriptive';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type QuestionStatus = 'draft' | 'pending' | 'approved' | 'rejected';

export interface Question {
  id: string;
  content: string;
  type: QuestionType;
  difficulty: Difficulty;
  examType: ExamType;
  subject: string;
  unit: string;
  bloomsLevel: string;
  createdBy: string;
  status: QuestionStatus;
  approvedBy?: string;
  feedback?: string;
  options?: string[]; // For MCQ
  correctAnswer?: string;
  marks?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Material {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: 'pdf' | 'doc' | 'ppt';
  uploadedBy: string;
  subject: string;
  processedAt?: Date;
  createdAt: Date;
}

export interface Notification {
  id: string;
  fromUserId: string;
  toUserId: string;
  type: 'feedback' | 'approval' | 'rejection' | 'info';
  message: string;
  questionId?: string;
  isRead: boolean;
  createdAt: Date;
}

export interface ExamTypeConfig {
  id: string;
  name: string;
  code: string;
  description: string;
  isActive: boolean;
}
