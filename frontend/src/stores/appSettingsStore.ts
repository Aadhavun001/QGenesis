import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PageContent {
  title: string;
  subtitle?: string;
  description?: string;
  sections?: {
    id: string;
    title: string;
    content: string;
  }[];
}

export interface LandingSettings {
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
  features: { title: string; description: string; icon?: string }[];
  bloomsTaxonomy: {
    title: string;
    description: string;
    levels: { name: string; description: string; color: string }[];
  };
  howItWorks: {
    title: string;
    subtitle: string;
    steps: { title: string; description: string }[];
  };
  aiAssistant: {
    title: string;
    subtitle: string;
    features: { title: string; description: string }[];
  };
  faq: {
    title: string;
    subtitle: string;
    items: { question: string; answer: string }[];
  };
  contact: {
    title: string;
    subtitle: string;
    email: string;
    phone: string;
    address: string;
  };
  feedback: {
    title: string;
    subtitle: string;
  };
  footer: {
    description: string;
    copyright: string;
    madeWith: string;
    socialLinks: { platform: string; url: string }[];
    productLinks: { label: string; href: string }[];
    companyLinks: { label: string; href: string }[];
    legalLinks: { label: string; href: string }[];
  };
  navbar: {
    items: { label: string; href: string }[];
    signInText: string;
    getStartedText: string;
  };
}

export interface StaffSettings {
  welcomeMessage: string;
  dashboardTitle: string;
  welcomeSubtitle: string;
  quickActions: { label: string; icon: string; path: string }[];
  stats: {
    totalQuestionsLabel: string;
    approvedLabel: string;
    pendingLabel: string;
    revisionsLabel: string;
  };
  emptyStateMessage: string;
  emptyStateButtonText: string;
  questionManagementTitle: string;
  recentQuestionsTab: string;
  questionHistoryTab: string;
}

export interface HodSettings {
  welcomeMessage: string;
  dashboardTitle: string;
  welcomeSubtitle: string;
  reviewButtonText: string;
  stats: {
    pendingLabel: string;
    approvedLabel: string;
    rejectedLabel: string;
    totalPapersLabel: string;
  };
  reviewSectionTitle: string;
  reviewSectionSubtitle: string;
  questionsTabLabel: string;
  papersTabLabel: string;
  approveButtonText: string;
  rejectButtonText: string;
  bulkApproveText: string;
  bulkRejectText: string;
  noQuestionsMessage: string;
  noPapersMessage: string;
}

export interface AppSettings {
  landing: LandingSettings;
  staff: StaffSettings;
  hod: HodSettings;
  admin: {
    welcomeMessage: string;
    dashboardTitle: string;
  };
  branding: {
    appName: string;
    tagline: string;
    primaryColor: string;
    accentColor: string;
  };
}

export interface UserActivity {
  id: string;
  userId: string;
  userName: string;
  email: string;
  role: 'staff' | 'hod' | 'admin';
  department?: string;
  status: 'online' | 'offline' | 'away';
  lastActive: Date;
  screenTime: number;
  sessionsToday: number;
  actionsToday: number;
}

interface AppSettingsStore {
  settings: AppSettings;
  userActivities: UserActivity[];
  
  updateSettings: (path: string, value: any) => void;
  updatePageSettings: (page: keyof AppSettings, updates: Partial<any>) => void;
  updateLandingSection: (section: keyof LandingSettings, updates: any) => void;
  resetSettings: () => void;
  
  updateUserActivity: (activity: Omit<UserActivity, 'id'>) => void;
  getUserActivities: (role?: string, department?: string) => UserActivity[];
}

const DEFAULT_SETTINGS: AppSettings = {
  landing: {
    heroTitle: 'QGenesis',
    heroSubtitle: 'Intelligent Academic Question Generation System',
    heroDescription: 'Transform your educational content into intelligent questions using advanced AI technology',
    features: [
      { title: 'AI Question Generation', description: 'Generate questions from any content using advanced AI algorithms' },
      { title: "Bloom's Taxonomy", description: 'Questions aligned with cognitive levels for comprehensive assessment' },
      { title: 'Multi-format Support', description: 'MCQ, Short Answer, Essay, and more question types' },
    ],
    bloomsTaxonomy: {
      title: "Bloom's Taxonomy Integration",
      description: 'Generate questions across all cognitive levels',
      levels: [
        { name: 'Remember', description: 'Recall facts and basic concepts', color: '#ef4444' },
        { name: 'Understand', description: 'Explain ideas or concepts', color: '#f97316' },
        { name: 'Apply', description: 'Use information in new situations', color: '#eab308' },
        { name: 'Analyze', description: 'Draw connections among ideas', color: '#22c55e' },
        { name: 'Evaluate', description: 'Justify a decision or course of action', color: '#3b82f6' },
        { name: 'Create', description: 'Produce new or original work', color: '#8b5cf6' },
      ]
    },
    howItWorks: {
      title: 'How QGenesis Works',
      subtitle: 'Simple steps to generate quality questions',
      steps: [
        { title: 'Upload Content', description: 'Upload your study materials, notes, or textbooks' },
        { title: 'Configure Settings', description: 'Choose question types, difficulty levels, and cognitive domains' },
        { title: 'Generate Questions', description: 'AI analyzes content and generates relevant questions' },
        { title: 'Review & Export', description: 'Review, edit, and export your question paper' },
      ]
    },
    aiAssistant: {
      title: 'AI-Powered Assistant',
      subtitle: 'Your intelligent question generation partner',
      features: [
        { title: 'Smart Analysis', description: 'AI understands context and generates relevant questions' },
        { title: 'Quality Assurance', description: 'Built-in quality checks for generated questions' },
        { title: 'Continuous Learning', description: 'Improves over time based on feedback' },
      ]
    },
    faq: {
      title: 'Frequently Asked Questions',
      subtitle: 'Find answers to common questions',
      items: [
        { question: 'What question types can I generate in QGenesis?', answer: 'You can generate MCQ, short, long, and descriptive questions. Each set can be configured with difficulty, Bloom\'s level, marks, and topic focus.' },
        { question: 'Does QGenesis generate questions only from uploaded material?', answer: 'Yes. When a material is selected, generation and regeneration are grounded to that content so outputs stay aligned with your syllabus.' },
        { question: 'Can I regenerate only one question or one answer?', answer: 'Yes. You can regenerate a specific question with custom configuration, regenerate only the answer, or edit and regenerate for that single item.' },
        { question: 'How does “Keep in chat” work?', answer: 'You can keep one question or selected/all questions under the original user prompt. The transcript block is saved and restored with chat history.' },
        { question: 'Is data stored in Firebase in real time?', answer: 'Yes. Chat messages, generated question sets, kept transcript blocks, and chat title updates are persisted and rehydrated on reload.' },
        { question: 'Can I use QGenesis on mobile, tablet, and desktop?', answer: 'Yes. QGenesis uses responsive layouts and breakpoints for phones, tablets, laptops, and larger screens, including adaptive spacing and controls.' },
        { question: 'What should I do if an output looks incomplete?', answer: 'Use regenerate for that item. The app includes retry and repair handling for partial model outputs, especially for strict MCQ formatting.' },
        { question: 'Can I edit questions before saving to bank/cloud?', answer: 'Absolutely. All generated questions and answers are editable before saving to Question Bank, cloud, or keeping in chat.' },
      ]
    },
    contact: {
      title: 'Get in Touch',
      subtitle: 'Have questions? We are here to help',
      email: 'support@qgenesis.com',
      phone: '+1 (555) 123-4567',
      address: '123 Education Street, Learning City, ED 12345'
    },
    feedback: {
      title: 'Share Your Feedback',
      subtitle: 'Help us improve QGenesis'
    },
    footer: {
      description: 'Transforming academic assessment with AI-powered question bank generation. Trusted by leading educational institutions worldwide.',
      copyright: '© 2026 QGenesis. All rights reserved.',
      madeWith: 'Made with ❤️ for educators worldwide',
      socialLinks: [
        { platform: 'x', url: 'https://x.com/qgenesis' },
        { platform: 'linkedin', url: 'https://linkedin.com/company/qgenesis' },
        { platform: 'github', url: 'https://github.com/qgenesis' },
        { platform: 'email', url: 'mailto:support@qgenesis.com' },
      ],
      productLinks: [
        { label: 'Features', href: '#features' },
        { label: 'How It Works', href: '#how-it-works' },
        { label: 'AI Assistant', href: '#ai-assistant' },
        { label: 'FAQ', href: '#faq' },
      ],
      companyLinks: [
        { label: 'About Us', href: '/about-us' },
        { label: 'Contact', href: '#contact' },
      ],
      legalLinks: [
        { label: 'Privacy Policy', href: '/legal/privacy-policy' },
        { label: 'Terms of Service', href: '/legal/terms-of-service' },
        { label: 'Cookie Policy', href: '/legal/cookie-policy' },
      ]
    },
    navbar: {
      items: [
        { label: 'Home', href: '#home' },
        { label: 'Features', href: '#features' },
        { label: 'Blooms', href: '#blooms-taxonomy' },
        { label: 'How It Works', href: '#how-it-works' },
        { label: 'AI Assistant', href: '#ai-assistant' },
        { label: 'FAQ', href: '#faq' },
        { label: 'Contact', href: '#contact' },
      ],
      signInText: 'Sign In',
      getStartedText: 'Get Started'
    }
  },
  staff: {
    welcomeMessage: 'Welcome back',
    dashboardTitle: 'Staff Dashboard',
    welcomeSubtitle: 'Ready to create some amazing questions today?',
    quickActions: [
      { label: 'Upload Material', icon: 'Upload', path: '/staff/upload' },
      { label: 'Generate Questions', icon: 'Sparkles', path: '/staff/generate' },
      { label: 'AI Assistant', icon: 'MessageSquare', path: '/staff/chat' },
    ],
    stats: {
      totalQuestionsLabel: 'Total Questions',
      approvedLabel: 'Approved',
      pendingLabel: 'Pending Review',
      revisionsLabel: 'Needs Revision',
    },
    emptyStateMessage: 'No questions yet. Start by generating some!',
    emptyStateButtonText: 'Generate Questions',
    questionManagementTitle: 'Question Management',
    recentQuestionsTab: 'Recent Questions',
    questionHistoryTab: 'Question History',
  },
  hod: {
    welcomeMessage: 'Hello',
    dashboardTitle: 'HOD Dashboard',
    welcomeSubtitle: 'questions and papers waiting for review',
    reviewButtonText: 'Review All',
    stats: {
      pendingLabel: 'Pending Questions',
      approvedLabel: 'Approved',
      rejectedLabel: 'Rejected',
      totalPapersLabel: 'Total Papers',
    },
    reviewSectionTitle: 'Pending Reviews',
    reviewSectionSubtitle: 'Review and approve questions and question papers',
    questionsTabLabel: 'Questions',
    papersTabLabel: 'Papers',
    approveButtonText: 'Approve',
    rejectButtonText: 'Reject',
    bulkApproveText: 'Approve All',
    bulkRejectText: 'Reject All',
    noQuestionsMessage: 'No pending questions to review!',
    noPapersMessage: 'No pending papers to review!',
  },
  admin: {
    welcomeMessage: 'Full control over QGenesis platform',
    dashboardTitle: 'Admin Dashboard',
  },
  branding: {
    appName: 'QGenesis',
    tagline: 'Intelligent Question Generation',
    primaryColor: '#6366f1',
    accentColor: '#8b5cf6',
  },
};

export const useAppSettingsStore = create<AppSettingsStore>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      userActivities: [],
      
      updateSettings: (path, value) => {
        set((state) => {
          const newSettings = JSON.parse(JSON.stringify(state.settings));
          const keys = path.split('.');
          let current: any = newSettings;
          
          for (let i = 0; i < keys.length - 1; i++) {
            current = current[keys[i]];
          }
          current[keys[keys.length - 1]] = value;
          
          return { settings: newSettings };
        });
      },
      
      updatePageSettings: (page, updates) => {
        set((state) => ({
          settings: {
            ...state.settings,
            [page]: {
              ...state.settings[page],
              ...updates,
            },
          },
        }));
      },

      updateLandingSection: (section, updates) => {
        set((state) => ({
          settings: {
            ...state.settings,
            landing: {
              ...state.settings.landing,
              [section]: updates,
            },
          },
        }));
      },
      
      resetSettings: () => {
        set({ settings: DEFAULT_SETTINGS });
      },
      
      updateUserActivity: (activity) => {
        set((state) => {
          const existingIndex = state.userActivities.findIndex(
            (a) => a.userId === activity.userId
          );
          
          if (existingIndex !== -1) {
            const updated = [...state.userActivities];
            updated[existingIndex] = {
              ...updated[existingIndex],
              ...activity,
              id: updated[existingIndex].id,
            };
            return { userActivities: updated };
          }
          
          return {
            userActivities: [
              ...state.userActivities,
              { ...activity, id: `ua_${Date.now()}` },
            ],
          };
        });
      },
      
      getUserActivities: (role, department) => {
        const { userActivities } = get();
        return userActivities.filter((a) => {
          if (role && a.role !== role) return false;
          if (department && a.department !== department) return false;
          return true;
        });
      },
    }),
    {
      name: 'app-settings-store',
    }
  )
);