import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckSquare, 
  Users, 
  Clock, 
  CheckCircle,
  XCircle,
  TrendingUp,
  ArrowRight,
  Bell,
  FileText,
  MessageSquare,
  Eye,
  Edit3,
  Send,
  CheckCheck,
  Square,
  Shield,
  Lock,
  Unlock,
  Ban,
  Check,
  X,
  KeyRound
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs as TabsUI, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useQuestionStore, GeneratedQuestion } from '@/stores/questionStore';
import { useQuestionPaperStore, QuestionPaper } from '@/stores/questionPaperStore';
import { useAppSettingsStore } from '@/stores/appSettingsStore';
import { toast } from 'sonner';
import { useNotificationAlerts } from '@/hooks/useNotificationAlerts';
import FeedbackWidget from '@/components/common/FeedbackWidget';
import { firestoreFeedbackService } from '@/services/firebase/firestore-database';

const HodDashboardContent: React.FC = () => {
  const { user } = useAuth();
  const { settings } = useAppSettingsStore();
  const hodSettings = settings.hod;
  const { 
    questions, 
    notifications,
    updateQuestion, 
    addNotification,
    deleteNotification,
    getNotificationsForRole 
  } = useQuestionStore();
  const { 
    papers, 
    updatePaper,
    securityHistory,
    addSecurityHistoryEntry
  } = useQuestionPaperStore();
  
  const hodDepartment = user?.department;
  const hodInstitution = (user as any)?.institution;
  const hodPlace = (user as any)?.place;

  const [activeTab, setActiveTab] = useState('questions');
  const [selectedQuestion, setSelectedQuestion] = useState<GeneratedQuestion | null>(null);
  const [selectedPaper, setSelectedPaper] = useState<QuestionPaper | null>(null);
  const [feedback, setFeedback] = useState('');
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'question' | 'paper'>('question');
  
  // Bulk selection state
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [showBulkActionDialog, setShowBulkActionDialog] = useState(false);
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject'>('approve');
  const [bulkFeedback, setBulkFeedback] = useState('');

  // Quick unlock action state
  const [showQuickRejectDialog, setShowQuickRejectDialog] = useState(false);
  const [quickRejectReason, setQuickRejectReason] = useState('');
  const [selectedUnlockRequest, setSelectedUnlockRequest] = useState<{ notificationId: string; itemId: string; type: 'question' | 'paper'; title: string } | null>(null);

  // Re-lock confirmation state
  const [showRelockDialog, setShowRelockDialog] = useState(false);
  const [selectedRelockItem, setSelectedRelockItem] = useState<{ id: string; type: 'question' | 'paper'; title: string } | null>(null);

  // Bulk re-lock state
  const [selectedRelockItems, setSelectedRelockItems] = useState<{ id: string; type: 'question' | 'paper'; title: string }[]>([]);
  const [showBulkRelockDialog, setShowBulkRelockDialog] = useState(false);

  // Play sound and show toast when new notifications arrive
  useNotificationAlerts({ notifications, role: 'hod' });

  // Get pending unlock requests
  const pendingUnlockRequests = useMemo(() => {
    const questionIds = new Set(questions.map((q) => q.id));
    const paperIds = new Set(papers.map((p) => p.id));
    return notifications.filter(n => {
      const isUnlockRequest = n.type === 'request' && n.toRole === 'hod' && 
        (n.title.toLowerCase().includes('unlock request') || n.title.toLowerCase().includes('unlock'));
      
      if (!isUnlockRequest) return false;

      // Do not show requests for deleted/missing items
      if (n.questionId && !questionIds.has(n.questionId)) return false;
      if (n.paperId && !paperIds.has(n.paperId)) return false;
      
      // Access control filtering
      if (!hodDepartment) return true;
      if (!n.department) return true;
      if (n.department !== hodDepartment) return false;
      if (hodInstitution && n.institution && n.institution !== hodInstitution) return false;
      if (hodPlace && n.place && n.place !== hodPlace) return false;
      
      return true;
    }).slice(0, 3); // Show only first 3 in widget
  }, [notifications, questions, papers, hodDepartment, hodInstitution, hodPlace]);

  // Quick unlock handlers
  const handleQuickApproveUnlock = (notificationId: string, itemId: string, itemType: 'question' | 'paper') => {
    if (itemType === 'question') {
      const question = questions.find(q => q.id === itemId);
      updateQuestion(itemId, { 
        isLocked: false, 
        hasUnlockRequest: false,
        unlockedAt: new Date(),
        unlockedBy: user?.id
      } as any);
      
      addSecurityHistoryEntry({
        action: 'unlock_approved',
        itemType: 'question',
        itemId,
        itemTitle: question?.content.substring(0, 50) || 'Question',
        performedBy: user?.displayName || 'HOD',
        performedByRole: 'hod',
        department: question?.department,
      });
      
      addNotification({
        type: 'approval',
        title: 'Unlock Approved',
        message: `Your question "${question?.content.substring(0, 50) || 'Question'}..." has been unlocked by HOD`,
        questionId: itemId,
        fromRole: 'hod',
        toRole: 'staff',
        department: question?.department,
      });
    } else {
      const paper = papers.find(p => p.id === itemId);
      updatePaper(itemId, { 
        status: 'draft',
        isLocked: false, 
        hasUnlockRequest: false,
        unlockedAt: new Date(),
        unlockedBy: user?.id
      } as any);
      
      addSecurityHistoryEntry({
        action: 'unlock_approved',
        itemType: 'paper',
        itemId,
        itemTitle: paper?.title || 'Paper',
        performedBy: user?.displayName || 'HOD',
        performedByRole: 'hod',
        department: paper?.department,
      });
      
      addNotification({
        type: 'approval',
        title: 'Unlock Approved',
        message: `Your question paper "${paper?.title || 'Paper'}" has been unlocked by HOD`,
        paperId: itemId,
        fromRole: 'hod',
        toRole: 'staff',
        department: paper?.department,
      });
    }

    deleteNotification(notificationId);
    toast.success('Unlock approved');
  };

  const handleQuickRejectUnlock = () => {
    if (!selectedUnlockRequest || !quickRejectReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    const { notificationId, itemId, type, title } = selectedUnlockRequest;

    if (type === 'question') {
      const question = questions.find(q => q.id === itemId);
      updateQuestion(itemId, { hasUnlockRequest: false } as any);
      
      addSecurityHistoryEntry({
        action: 'unlock_denied',
        itemType: 'question',
        itemId,
        itemTitle: question?.content.substring(0, 50) || 'Question',
        performedBy: user?.displayName || 'HOD',
        performedByRole: 'hod',
        reason: quickRejectReason,
        department: question?.department,
      });
      
      addNotification({
        type: 'rejection',
        title: 'Unlock Denied',
        message: `Your unlock request was denied: ${quickRejectReason}`,
        questionId: itemId,
        fromRole: 'hod',
        toRole: 'staff',
        department: question?.department,
      });
    } else {
      const paper = papers.find(p => p.id === itemId);
      updatePaper(itemId, { hasUnlockRequest: false } as any);
      
      addSecurityHistoryEntry({
        action: 'unlock_denied',
        itemType: 'paper',
        itemId,
        itemTitle: paper?.title || 'Paper',
        performedBy: user?.displayName || 'HOD',
        performedByRole: 'hod',
        reason: quickRejectReason,
        department: paper?.department,
      });
      
      addNotification({
        type: 'rejection',
        title: 'Unlock Denied',
        message: `Your unlock request was denied: ${quickRejectReason}`,
        paperId: itemId,
        fromRole: 'hod',
        toRole: 'staff',
        department: paper?.department,
      });
    }

    deleteNotification(notificationId);
    setShowQuickRejectDialog(false);
    setQuickRejectReason('');
    setSelectedUnlockRequest(null);
    toast.success('Unlock request denied');
  };

  const openQuickRejectDialog = (notificationId: string, itemId: string, type: 'question' | 'paper', title: string) => {
    setSelectedUnlockRequest({ notificationId, itemId, type, title });
    setShowQuickRejectDialog(true);
  };

  // Get recently unlocked items for re-lock functionality (show more for bulk)
  const recentlyUnlockedItems = useMemo(() => {
    const unlockedQuestions = questions.filter(q => {
      if (q.isLocked) return false;
      if (hodDepartment && q.department && q.department !== hodDepartment) return false;
      if (hodInstitution && (q as any).institution && (q as any).institution !== hodInstitution) return false;
      if (hodPlace && (q as any).place && (q as any).place !== hodPlace) return false;
      return (q as any).unlockedAt;
    }).map(q => ({
      id: q.id,
      type: 'question' as const,
      title: q.content.substring(0, 50),
      unlockedAt: (q as any).unlockedAt
    }));

    const unlockedPapers = papers.filter(p => {
      if (p.isLocked) return false;
      if (hodDepartment && p.department && p.department !== hodDepartment) return false;
      if (hodInstitution && (p as any).institution && (p as any).institution !== hodInstitution) return false;
      if (hodPlace && (p as any).place && (p as any).place !== hodPlace) return false;
      return (p as any).unlockedAt;
    }).map(p => ({
      id: p.id,
      type: 'paper' as const,
      title: p.title,
      unlockedAt: (p as any).unlockedAt
    }));

    return [...unlockedQuestions, ...unlockedPapers]
      .sort((a, b) => new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime());
  }, [questions, papers, hodDepartment, hodInstitution, hodPlace]);

  // Items shown in widget (limit to 5)
  const displayedUnlockedItems = recentlyUnlockedItems.slice(0, 5);

  // Toggle item selection for bulk re-lock
  const toggleRelockSelection = (item: { id: string; type: 'question' | 'paper'; title: string }) => {
    setSelectedRelockItems(prev => {
      const exists = prev.some(i => i.id === item.id && i.type === item.type);
      if (exists) {
        return prev.filter(i => !(i.id === item.id && i.type === item.type));
      }
      return [...prev, item];
    });
  };

  // Select/deselect all for bulk re-lock
  const toggleAllRelockItems = () => {
    if (selectedRelockItems.length === displayedUnlockedItems.length) {
      setSelectedRelockItems([]);
    } else {
      setSelectedRelockItems(displayedUnlockedItems.map(i => ({ id: i.id, type: i.type, title: i.title })));
    }
  };

  // Check if item is selected
  const isRelockItemSelected = (id: string, type: 'question' | 'paper') => {
    return selectedRelockItems.some(i => i.id === id && i.type === type);
  };

  // Bulk re-lock handler
  const handleBulkRelock = () => {
    selectedRelockItems.forEach(({ id, type, title }) => {
      if (type === 'question') {
        const question = questions.find(q => q.id === id);
        updateQuestion(id, { 
          isLocked: true,
          unlockedAt: undefined,
          unlockedBy: undefined
        } as any);
        
        addSecurityHistoryEntry({
          action: 'relocked',
          itemType: 'question',
          itemId: id,
          itemTitle: title,
          performedBy: user?.displayName || 'HOD',
          performedByRole: 'hod',
          department: question?.department,
        });
        
        addNotification({
          type: 'info',
          title: 'Question Re-locked',
          message: `Question "${title}..." has been re-locked by HOD for security`,
          questionId: id,
          fromRole: 'hod',
          toRole: 'staff',
          department: question?.department,
        });
      } else {
        const paper = papers.find(p => p.id === id);
        updatePaper(id, { 
          isLocked: true,
          unlockedAt: undefined,
          unlockedBy: undefined
        } as any);
        
        addSecurityHistoryEntry({
          action: 'relocked',
          itemType: 'paper',
          itemId: id,
          itemTitle: title,
          performedBy: user?.displayName || 'HOD',
          performedByRole: 'hod',
          department: paper?.department,
        });
        
        addNotification({
          type: 'info',
          title: 'Paper Re-locked',
          message: `Question paper "${title}" has been re-locked by HOD for security`,
          paperId: id,
          fromRole: 'hod',
          toRole: 'staff',
          department: paper?.department,
        });
      }
    });

    toast.success(`${selectedRelockItems.length} items have been re-locked`);
    setSelectedRelockItems([]);
    setShowBulkRelockDialog(false);
  };

  // Re-lock handler
  const handleRelock = () => {
    if (!selectedRelockItem) return;

    const { id, type, title } = selectedRelockItem;

    if (type === 'question') {
      const question = questions.find(q => q.id === id);
      updateQuestion(id, { 
        isLocked: true,
        unlockedAt: undefined,
        unlockedBy: undefined
      } as any);
      
      addSecurityHistoryEntry({
        action: 'relocked',
        itemType: 'question',
        itemId: id,
        itemTitle: title,
        performedBy: user?.displayName || 'HOD',
        performedByRole: 'hod',
        department: question?.department,
      });
      
      addNotification({
        type: 'info',
        title: 'Question Re-locked',
        message: `Question "${title}..." has been re-locked by HOD for security`,
        questionId: id,
        fromRole: 'hod',
        toRole: 'staff',
        department: question?.department,
      });
    } else {
      const paper = papers.find(p => p.id === id);
      updatePaper(id, { 
        isLocked: true,
        unlockedAt: undefined,
        unlockedBy: undefined
      } as any);
      
      addSecurityHistoryEntry({
        action: 'relocked',
        itemType: 'paper',
        itemId: id,
        itemTitle: title,
        performedBy: user?.displayName || 'HOD',
        performedByRole: 'hod',
        department: paper?.department,
      });
      
      addNotification({
        type: 'info',
        title: 'Paper Re-locked',
        message: `Question paper "${title}" has been re-locked by HOD for security`,
        paperId: id,
        fromRole: 'hod',
        toRole: 'staff',
        department: paper?.department,
      });
    }

    setShowRelockDialog(false);
    setSelectedRelockItem(null);
    toast.success('Item has been re-locked');
  };

  const openRelockDialog = (id: string, type: 'question' | 'paper', title: string) => {
    setSelectedRelockItem({ id, type, title });
    setShowRelockDialog(true);
  };

  // Calculate security history stats for this week
  const securityStats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Filter by HOD's department/institution/place
    const questionIds = new Set(questions.map((q) => q.id));
    const paperIds = new Set(papers.map((p) => p.id));
    const accessibleHistory = securityHistory.filter((entry) => {
      if (hodDepartment && entry.department && entry.department !== hodDepartment) return false;
      if (hodInstitution && entry.institution && entry.institution !== hodInstitution) return false;
      if (hodPlace && entry.place && entry.place !== hodPlace) return false;
      if (entry.itemType === 'question' && !questionIds.has(entry.itemId)) return false;
      if (entry.itemType === 'paper' && !paperIds.has(entry.itemId)) return false;
      return true;
    });
    
    const thisWeekHistory = accessibleHistory.filter(entry => 
      new Date(entry.timestamp) >= weekAgo
    );
    
    return {
      totalRequests: thisWeekHistory.filter(e => e.action === 'unlock_requested').length,
      approved: thisWeekHistory.filter(e => e.action === 'unlock_approved' || e.action === 'unlocked').length,
      denied: thisWeekHistory.filter(e => e.action === 'unlock_denied').length,
      relocked: thisWeekHistory.filter(e => e.action === 'relocked' || e.action === 'locked').length,
      pendingRequests: accessibleHistory.filter(e => e.action === 'unlock_requested').length,
    };
  }, [securityHistory, questions, papers, hodDepartment, hodInstitution, hodPlace]);
  const [userColorSettings, setUserColorSettings] = useState({
    dashboardColor: (user as any)?.dashboardColor || 'default',
    customGradientStart: (user as any)?.customGradientStart || '',
    customGradientEnd: (user as any)?.customGradientEnd || '',
  });

  React.useEffect(() => {
    const handleUserUpdate = () => {
      const storedUser = sessionStorage.getItem('qgenesis_user') ?? localStorage.getItem('qgenesis_user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          setUserColorSettings({
            dashboardColor: parsed.dashboardColor || 'default',
            customGradientStart: parsed.customGradientStart || '',
            customGradientEnd: parsed.customGradientEnd || '',
          });
        } catch {}
      }
    };
    
    handleUserUpdate();
    window.addEventListener('user-updated', handleUserUpdate);
    window.addEventListener('storage', handleUserUpdate);
    
    return () => {
      window.removeEventListener('user-updated', handleUserUpdate);
      window.removeEventListener('storage', handleUserUpdate);
    };
  }, []);

  // Get dashboard gradient style
  const getDashboardGradient = () => {
    const { dashboardColor, customGradientStart, customGradientEnd } = userColorSettings;
    
    // Custom gradient takes priority
    if (dashboardColor === 'custom' && customGradientStart && customGradientEnd) {
      return { background: `linear-gradient(to bottom right, ${customGradientStart}, ${customGradientEnd})` };
    }
    
    // Preset colors
    const colorMap: Record<string, string> = {
      purple: 'from-purple-500 via-pink-500 to-rose-500',
      blue: 'from-blue-500 via-cyan-500 to-teal-500',
      green: 'from-green-500 via-emerald-500 to-teal-500',
      orange: 'from-orange-500 via-amber-500 to-yellow-500',
      rose: 'from-rose-500 via-pink-500 to-fuchsia-500',
      indigo: 'from-indigo-500 via-violet-500 to-purple-500',
      teal: 'from-teal-500 via-cyan-500 to-blue-500',
    };
    
    return { className: colorMap[dashboardColor] || 'from-purple-500 via-pink-500 to-rose-500' };
  };

  const gradientStyle = getDashboardGradient();

  // Filter by department - only show items from matching department
  const departmentFilteredQuestions = hodDepartment 
    ? questions.filter(q => !q.department || q.department === hodDepartment)
    : questions;
  
  const departmentFilteredPapers = hodDepartment
    ? papers.filter(p => !p.department || p.department === hodDepartment)
    : papers;

  // Get pending items (papers: staff submit with 'submitted'; questions: sent for approval with 'pending')
  const pendingQuestions = departmentFilteredQuestions.filter(q => q.status === 'pending');
  const pendingPapers = departmentFilteredPapers.filter(p => p.status === 'submitted' || p.status === 'pending');
  const approvedQuestions = departmentFilteredQuestions.filter(q => q.status === 'approved');
  const rejectedQuestions = departmentFilteredQuestions.filter(q => q.status === 'rejected');
  const submittedPapers = departmentFilteredPapers.filter(p => p.status === 'submitted');
  
  const stats = [
    { 
      icon: Clock, 
      label: hodSettings.stats?.pendingLabel || 'Pending Questions', 
      value: pendingQuestions.length.toString(), 
      change: `${pendingPapers.length} papers pending review`,
      gradient: 'from-amber-500 to-orange-500',
      bgGradient: 'from-amber-500/10 to-orange-500/10'
    },
    { 
      icon: CheckCircle, 
      label: hodSettings.stats?.approvedLabel || 'Approved', 
      value: approvedQuestions.length.toString(), 
      change: departmentFilteredQuestions.length > 0 
        ? `${Math.round((approvedQuestions.length / departmentFilteredQuestions.length) * 100)}% rate`
        : '0% rate',
      gradient: 'from-green-500 to-emerald-500',
      bgGradient: 'from-green-500/10 to-emerald-500/10'
    },
    { 
      icon: XCircle, 
      label: hodSettings.stats?.rejectedLabel || 'Rejected', 
      value: rejectedQuestions.length.toString(), 
      change: 'Feedback sent',
      gradient: 'from-red-500 to-rose-500',
      bgGradient: 'from-red-500/10 to-rose-500/10'
    },
    { 
      icon: FileText, 
      label: hodSettings.stats?.totalPapersLabel || 'Total Papers', 
      value: departmentFilteredPapers.length.toString(), 
      change: `${departmentFilteredPapers.filter(p => p.status === 'approved').length} approved`,
      gradient: 'from-purple-500 to-pink-500',
      bgGradient: 'from-purple-500/10 to-pink-500/10'
    },
    { 
      icon: Send, 
      label: 'Submitted Papers', 
      value: submittedPapers.length.toString(), 
      change: 'Ready for review',
      gradient: 'from-blue-500 to-indigo-500',
      bgGradient: 'from-blue-500/10 to-indigo-500/10'
    },
  ];

  // Bulk selection handlers
  const toggleQuestionSelection = (id: string) => {
    setSelectedQuestionIds(prev => 
      prev.includes(id) ? prev.filter(qId => qId !== id) : [...prev, id]
    );
  };

  const selectAllQuestions = () => {
    if (selectedQuestionIds.length === pendingQuestions.length) {
      setSelectedQuestionIds([]);
    } else {
      setSelectedQuestionIds(pendingQuestions.map(q => q.id));
    }
  };

  const handleBulkApprove = () => {
    selectedQuestionIds.forEach(id => {
      const question = pendingQuestions.find(q => q.id === id);
      if (question) {
        updateQuestion(id, { status: 'approved' });
        addNotification({
          type: 'approval',
          title: 'Question Approved',
          message: `Your question "${question.content.substring(0, 50)}..." has been approved by HOD`,
          questionId: id,
          fromRole: 'hod',
          toRole: 'staff',
          department: question.department,
        });
      }
    });
    toast.success(`${selectedQuestionIds.length} questions approved`);
    setSelectedQuestionIds([]);
    setShowBulkActionDialog(false);
  };

  const handleBulkReject = () => {
    if (!bulkFeedback.trim()) {
      toast.error('Please provide feedback for rejection');
      return;
    }
    
    selectedQuestionIds.forEach(id => {
      const question = pendingQuestions.find(q => q.id === id);
      if (question) {
        updateQuestion(id, { status: 'rejected', feedback: bulkFeedback });
        void firestoreFeedbackService.create({
          rating: 0,
          comment: bulkFeedback,
          userType: 'hod',
          userName: user?.displayName,
          userEmail: user?.email,
          submittedByUserId: user?.id,
          submittedByRole: 'hod',
          targetRole: 'staff',
          sourceModule: 'hod-question-review',
          itemType: 'question',
          itemId: id,
          department: question.department,
          institution: (question as any).institution,
          place: (question as any).place,
        }).catch(() => {});
        addNotification({
          type: 'rejection',
          title: 'Question Needs Revision',
          message: `Your question needs revision: ${bulkFeedback}`,
          questionId: id,
          fromRole: 'hod',
          toRole: 'staff',
          department: question.department,
        });
      }
    });
    toast.success(`${selectedQuestionIds.length} questions rejected with feedback`);
    setSelectedQuestionIds([]);
    setBulkFeedback('');
    setShowBulkActionDialog(false);
  };

  const openBulkActionDialog = (action: 'approve' | 'reject') => {
    setBulkAction(action);
    setShowBulkActionDialog(true);
  };

  const handleApproveQuestion = (question: GeneratedQuestion) => {
    updateQuestion(question.id, { status: 'approved' });
    addNotification({
      type: 'approval',
      title: 'Question Approved',
      message: `Your question "${question.content.substring(0, 50)}..." has been approved by HOD`,
      questionId: question.id,
      fromRole: 'hod',
      toRole: 'staff',
      department: question.department,
    });
    toast.success('Question approved');
  };

  const handleRejectWithFeedback = () => {
    if (!feedback.trim()) {
      toast.error('Please provide feedback');
      return;
    }
    
    if (feedbackType === 'question' && selectedQuestion) {
      updateQuestion(selectedQuestion.id, { 
        status: 'rejected',
        feedback 
      });
      void firestoreFeedbackService.create({
        rating: 0,
        comment: feedback,
        userType: 'hod',
        userName: user?.displayName,
        userEmail: user?.email,
        submittedByUserId: user?.id,
        submittedByRole: 'hod',
        targetRole: 'staff',
        sourceModule: 'hod-question-review',
        itemType: 'question',
        itemId: selectedQuestion.id,
        department: selectedQuestion.department,
        institution: (selectedQuestion as any).institution,
        place: (selectedQuestion as any).place,
      }).catch(() => {});
      addNotification({
        type: 'rejection',
        title: 'Question Needs Revision',
        message: `Your question needs revision: ${feedback}`,
        questionId: selectedQuestion.id,
        fromRole: 'hod',
        toRole: 'staff',
        department: selectedQuestion.department,
      });
      toast.success('Feedback sent to staff');
    } else if (feedbackType === 'paper' && selectedPaper) {
      updatePaper(selectedPaper.id, { 
        status: 'rejected',
        feedback 
      });
      void firestoreFeedbackService.create({
        rating: 0,
        comment: feedback,
        userType: 'hod',
        userName: user?.displayName,
        userEmail: user?.email,
        submittedByUserId: user?.id,
        submittedByRole: 'hod',
        targetRole: 'staff',
        sourceModule: 'hod-paper-review',
        itemType: 'paper',
        itemId: selectedPaper.id,
        department: selectedPaper.department,
        institution: (selectedPaper as any).institution,
        place: (selectedPaper as any).place,
      }).catch(() => {});
      addNotification({
        type: 'rejection',
        title: 'Question Paper Needs Revision',
        message: `Paper "${selectedPaper.title}" needs revision: ${feedback}`,
        fromRole: 'hod',
        toRole: 'staff',
        department: selectedPaper.department,
      });
      toast.success('Paper feedback sent to staff');
    }
    
    setShowFeedbackDialog(false);
    setFeedback('');
    setSelectedQuestion(null);
    setSelectedPaper(null);
  };

  const handleApprovePaper = (paper: QuestionPaper) => {
    updatePaper(paper.id, { status: 'approved' });
    addNotification({
      type: 'approval',
      title: 'Question Paper Approved',
      message: `Your question paper "${paper.title}" has been approved by HOD`,
      fromRole: 'hod',
      toRole: 'staff',
      department: paper.department,
    });
    toast.success('Question paper approved');
  };

  const openRejectDialog = (item: GeneratedQuestion | QuestionPaper, type: 'question' | 'paper') => {
    if (type === 'question') {
      setSelectedQuestion(item as GeneratedQuestion);
    } else {
      setSelectedPaper(item as QuestionPaper);
    }
    setFeedbackType(type);
    setShowFeedbackDialog(true);
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div 
        className={`relative overflow-hidden rounded-3xl p-8 text-white ${gradientStyle.className ? `bg-gradient-to-br ${gradientStyle.className}` : ''}`}
        style={gradientStyle.background ? { background: gradientStyle.background } : undefined}
      >
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{hodSettings.welcomeMessage || 'Hello'}, {user?.displayName}! 👋</h1>
            <p className="text-white/80 mb-2">
              You have {pendingQuestions.length} questions and {pendingPapers.length} papers {hodSettings.welcomeSubtitle || 'waiting for review'}
            </p>
            {hodDepartment && (
              <p className="text-white/60 text-sm mb-6">
                Viewing items from {hodDepartment} department
              </p>
            )}
            <div className="flex flex-wrap gap-4">
              <Button variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm">
                <CheckSquare className="w-4 h-4 mr-2" />
                {hodSettings.reviewButtonText || 'Review All'}
              </Button>
              <FeedbackWidget userType="hod" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="relative overflow-hidden border-border/50 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient} opacity-50`} />
              <CardContent className="relative p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {stat.change}
                    </p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Security History Widget */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="border-border/50 overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center shadow-lg">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">Security History</CardTitle>
                  <CardDescription>This week's unlock activity summary</CardDescription>
                </div>
              </div>
              <Link to="/hod/security">
                <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                  View All
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-medium text-muted-foreground">Requests</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{securityStats.totalRequests}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {securityStats.pendingRequests > 0 && (
                    <Badge variant="secondary" className="text-xs bg-amber-500/20 text-amber-600 border-0">
                      {securityStats.pendingRequests} pending
                    </Badge>
                  )}
                </p>
              </div>
              
              <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Unlock className="w-4 h-4 text-green-500" />
                  <span className="text-xs font-medium text-muted-foreground">Approved</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{securityStats.approved}</p>
                <p className="text-xs text-green-600 mt-1">Unlocked this week</p>
              </div>
              
              <div className="p-4 rounded-xl bg-gradient-to-br from-red-500/10 to-rose-500/10 border border-red-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Ban className="w-4 h-4 text-red-500" />
                  <span className="text-xs font-medium text-muted-foreground">Denied</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{securityStats.denied}</p>
                <p className="text-xs text-red-600 mt-1">Rejected requests</p>
              </div>
              
              <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-4 h-4 text-purple-500" />
                  <span className="text-xs font-medium text-muted-foreground">Re-locked</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{securityStats.relocked}</p>
                <p className="text-xs text-purple-600 mt-1">Secured again</p>
              </div>
            </div>

            {/* Quick Actions for Pending Unlock Requests */}
            {pendingUnlockRequests.length > 0 && (
              <>
                <Separator className="my-4" />
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-amber-500" />
                      Pending Unlock Requests
                    </h4>
                    <Badge variant="secondary" className="bg-amber-500/20 text-amber-600 border-0">
                      {pendingUnlockRequests.length} awaiting action
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {pendingUnlockRequests.map((request) => {
                      // Extract item details from notification
                      const itemId = request.questionId || request.paperId || '';
                      const itemType: 'question' | 'paper' = request.questionId ? 'question' : 'paper';
                      const itemTitle = request.message?.substring(0, 60) || 'Item';
                      
                      return (
                        <motion.div
                          key={request.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                              {itemType === 'question' ? (
                                <MessageSquare className="w-4 h-4 text-amber-500" />
                              ) : (
                                <FileText className="w-4 h-4 text-amber-500" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{request.title}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {request.message?.substring(0, 50)}...
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                              onClick={() => handleQuickApproveUnlock(request.id, itemId, itemType)}
                              title="Approve"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                              onClick={() => openQuickRejectDialog(request.id, itemId, itemType, request.title)}
                              title="Deny"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                  {notifications.filter(n => 
                    n.type === 'request' && n.toRole === 'hod' && 
                    n.title.toLowerCase().includes('unlock')
                  ).length > 3 && (
                    <Link to="/hod/security" className="block mt-2">
                      <Button variant="link" size="sm" className="text-xs p-0 h-auto text-muted-foreground hover:text-primary">
                        View all requests →
                      </Button>
                    </Link>
                  )}
                </div>
              </>
            )}

            {/* Quick Re-lock Section with Bulk Selection */}
            {displayedUnlockedItems.length > 0 && (
              <>
                <Separator className="my-4" />
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedRelockItems.length === displayedUnlockedItems.length && displayedUnlockedItems.length > 0}
                        onCheckedChange={toggleAllRelockItems}
                        className="border-purple-500/50"
                      />
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <Lock className="w-4 h-4 text-purple-500" />
                        Recently Unlocked Items
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedRelockItems.length > 0 && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 text-xs bg-purple-600 hover:bg-purple-700"
                          onClick={() => setShowBulkRelockDialog(true)}
                        >
                          <Lock className="w-3 h-3 mr-1" />
                          Re-lock {selectedRelockItems.length} selected
                        </Button>
                      )}
                      <Badge variant="secondary" className="bg-purple-500/20 text-purple-600 border-0">
                        {recentlyUnlockedItems.length} unlocked
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {displayedUnlockedItems.map((item) => (
                      <motion.div
                        key={`${item.type}-${item.id}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          isRelockItemSelected(item.id, item.type)
                            ? 'bg-purple-500/10 border-purple-500/30'
                            : 'bg-muted/30 border-border/50 hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Checkbox
                            checked={isRelockItemSelected(item.id, item.type)}
                            onCheckedChange={() => toggleRelockSelection({ id: item.id, type: item.type, title: item.title })}
                            className="border-purple-500/50"
                          />
                          <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                            {item.type === 'question' ? (
                              <MessageSquare className="w-4 h-4 text-green-500" />
                            ) : (
                              <FileText className="w-4 h-4 text-green-500" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{item.title}...</p>
                            <p className="text-xs text-muted-foreground">
                              <Unlock className="w-3 h-3 inline mr-1" />
                              Currently unlocked
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-purple-500 border-purple-500/20 hover:bg-purple-500/10 flex-shrink-0 ml-2"
                          onClick={() => openRelockDialog(item.id, item.type, item.title)}
                        >
                          <Lock className="w-4 h-4 mr-1" />
                          Re-lock
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                  {recentlyUnlockedItems.length > 5 && (
                    <Link to="/hod/security" className="block mt-2">
                      <Button variant="link" size="sm" className="text-xs p-0 h-auto text-muted-foreground hover:text-primary">
                        View all {recentlyUnlockedItems.length} unlocked items →
                      </Button>
                    </Link>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Reject Dialog */}
      <Dialog open={showQuickRejectDialog} onOpenChange={setShowQuickRejectDialog}>
        <DialogContent className="sm:max-w-md bg-background">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <X className="w-5 h-5 text-red-500" />
              Deny Unlock Request
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for denying this unlock request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
              <p className="text-sm font-medium">{selectedUnlockRequest?.title}</p>
            </div>
            <Textarea
              placeholder="Enter reason for denial..."
              value={quickRejectReason}
              onChange={(e) => setQuickRejectReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => {
              setShowQuickRejectDialog(false);
              setQuickRejectReason('');
              setSelectedUnlockRequest(null);
            }}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleQuickRejectUnlock}
              disabled={!quickRejectReason.trim()}
            >
              Deny Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Re-lock Confirmation Dialog */}
      <Dialog open={showRelockDialog} onOpenChange={setShowRelockDialog}>
        <DialogContent className="sm:max-w-md bg-background">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-purple-500" />
              Re-lock Item
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to re-lock this item? The staff member will need to request unlock again to access it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  {selectedRelockItem?.type === 'question' ? (
                    <MessageSquare className="w-5 h-5 text-purple-500" />
                  ) : (
                    <FileText className="w-5 h-5 text-purple-500" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">{selectedRelockItem?.title}...</p>
                  <p className="text-xs text-muted-foreground capitalize">{selectedRelockItem?.type}</p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => {
              setShowRelockDialog(false);
              setSelectedRelockItem(null);
            }}>
              Cancel
            </Button>
            <Button 
              className="bg-purple-500 hover:bg-purple-600 text-white"
              onClick={handleRelock}
            >
              <Lock className="w-4 h-4 mr-2" />
              Re-lock Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Re-lock Confirmation Dialog */}
      <Dialog open={showBulkRelockDialog} onOpenChange={setShowBulkRelockDialog}>
        <DialogContent className="sm:max-w-md bg-background">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-purple-500" />
              Bulk Re-lock Items
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to re-lock {selectedRelockItems.length} selected items? Staff members will need to request unlock again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20 max-h-48 overflow-y-auto">
              <div className="space-y-2">
                {selectedRelockItems.map((item, index) => (
                  <div key={`${item.type}-${item.id}`} className="flex items-center gap-3 p-2 rounded bg-background/50">
                    <div className="w-6 h-6 rounded bg-purple-500/20 flex items-center justify-center text-xs font-medium text-purple-600">
                      {index + 1}
                    </div>
                    {item.type === 'question' ? (
                      <MessageSquare className="w-4 h-4 text-purple-500" />
                    ) : (
                      <FileText className="w-4 h-4 text-purple-500" />
                    )}
                    <span className="text-sm truncate flex-1">{item.title}...</span>
                    <Badge variant="outline" className="text-xs capitalize">{item.type}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => {
              setShowBulkRelockDialog(false);
            }}>
              Cancel
            </Button>
            <Button 
              className="bg-purple-500 hover:bg-purple-600 text-white"
              onClick={handleBulkRelock}
            >
              <Lock className="w-4 h-4 mr-2" />
              Re-lock {selectedRelockItems.length} Items
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Tabs */}
      <Card id="pending-reviews" className="border-border/50 scroll-mt-24">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{hodSettings.reviewSectionTitle || 'Pending Reviews'}</CardTitle>
          <CardDescription>{hodSettings.reviewSectionSubtitle || 'Review and approve questions and question papers'}</CardDescription>
        </CardHeader>
        <CardContent>
          <TabsUI value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="questions" className="gap-2">
                <MessageSquare className="w-4 h-4" />
                {hodSettings.questionsTabLabel || 'Questions'} ({pendingQuestions.length})
              </TabsTrigger>
              <TabsTrigger value="papers" className="gap-2">
                <FileText className="w-4 h-4" />
                {hodSettings.papersTabLabel || 'Papers'} ({pendingPapers.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="questions">
              {/* Bulk Actions Bar */}
              {pendingQuestions.length > 0 && (
                <div className="flex items-center justify-between p-3 mb-4 bg-muted/30 rounded-lg border border-border/50">
                  <div className="flex items-center gap-3">
                    <Checkbox 
                      checked={selectedQuestionIds.length === pendingQuestions.length && pendingQuestions.length > 0}
                      onCheckedChange={selectAllQuestions}
                    />
                    <span className="text-sm text-muted-foreground">
                      {selectedQuestionIds.length > 0 
                        ? `${selectedQuestionIds.length} selected`
                        : 'Select all'}
                    </span>
                  </div>
                  {selectedQuestionIds.length > 0 && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-500 border-green-500/20 hover:bg-green-500/10"
                        onClick={() => openBulkActionDialog('approve')}
                      >
                        <CheckCheck className="w-4 h-4 mr-1" />
                        {hodSettings.bulkApproveText || 'Approve All'} ({selectedQuestionIds.length})
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-500 border-red-500/20 hover:bg-red-500/10"
                        onClick={() => openBulkActionDialog('reject')}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        {hodSettings.bulkRejectText || 'Reject All'} ({selectedQuestionIds.length})
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <ScrollArea className="h-[400px]">
                {pendingQuestions.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
                    <p className="text-muted-foreground">{hodSettings.noQuestionsMessage || 'No pending questions to review!'}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <AnimatePresence>
                      {pendingQuestions.map((question) => (
                        <motion.div
                          key={question.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                        >
                          <Card className={`border-border/50 transition-all ${
                            selectedQuestionIds.includes(question.id) ? 'ring-2 ring-primary/50' : ''
                          }`}>
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <Checkbox 
                                  checked={selectedQuestionIds.includes(question.id)}
                                  onCheckedChange={() => toggleQuestionSelection(question.id)}
                                  className="mt-1"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap mb-2">
                                    <Badge variant="secondary">{question.type}</Badge>
                                    <Badge variant="outline">{question.marks} marks</Badge>
                                    <Badge variant="outline">{question.difficulty}</Badge>
                                    <Badge variant="outline">{question.bloomsLevel}</Badge>
                                  </div>
                                  <p className="text-sm mb-2">{question.content}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Topic: {question.topic} • Source: {question.source}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-green-500 border-green-500/20 hover:bg-green-500/10"
                                    onClick={() => handleApproveQuestion(question)}
                                  >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    {hodSettings.approveButtonText || 'Approve'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-500 border-red-500/20 hover:bg-red-500/10"
                                    onClick={() => openRejectDialog(question, 'question')}
                                  >
                                    <XCircle className="w-4 h-4 mr-1" />
                                    {hodSettings.rejectButtonText || 'Reject'}
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="papers">
              <ScrollArea className="h-[400px]">
                {pendingPapers.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
                    <p className="text-muted-foreground">{hodSettings.noPapersMessage || 'No pending papers to review!'}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <AnimatePresence>
                      {pendingPapers.map((paper) => (
                        <motion.div
                          key={paper.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                        >
                          <Card className="border-border/50">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap mb-2">
                                    <Badge variant="secondary">{paper.examType}</Badge>
                                    <Badge variant="outline">{paper.maxMarks} marks</Badge>
                                    <Badge variant="outline">{paper.duration}</Badge>
                                  </div>
                                  <p className="font-medium mb-1">{paper.title}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {paper.courseName} ({paper.courseCode}) • {paper.sections.length} sections
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-green-500 border-green-500/20 hover:bg-green-500/10"
                                    onClick={() => handleApprovePaper(paper)}
                                  >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-500 border-red-500/20 hover:bg-red-500/10"
                                    onClick={() => openRejectDialog(paper, 'paper')}
                                  >
                                    <XCircle className="w-4 h-4 mr-1" />
                                    Reject
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </TabsUI>
        </CardContent>
      </Card>

      {/* Feedback Dialog */}
      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Provide Feedback for {feedbackType === 'question' ? 'Question' : 'Paper'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter your feedback for the staff member..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFeedbackDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRejectWithFeedback}>
              <Send className="w-4 h-4 mr-2" />
              Send Feedback & Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Action Dialog */}
      <Dialog open={showBulkActionDialog} onOpenChange={setShowBulkActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkAction === 'approve' ? 'Approve' : 'Reject'} {selectedQuestionIds.length} Questions
            </DialogTitle>
            <DialogDescription>
              {bulkAction === 'approve' 
                ? 'All selected questions will be approved and staff will be notified.'
                : 'Please provide feedback for all rejected questions.'}
            </DialogDescription>
          </DialogHeader>
          {bulkAction === 'reject' && (
            <div className="py-4">
              <Textarea
                placeholder="Enter feedback for all rejected questions..."
                value={bulkFeedback}
                onChange={(e) => setBulkFeedback(e.target.value)}
                rows={4}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkActionDialog(false)}>
              Cancel
            </Button>
            {bulkAction === 'approve' ? (
              <Button className="bg-green-500 hover:bg-green-600" onClick={handleBulkApprove}>
                <CheckCheck className="w-4 h-4 mr-2" />
                Approve All
              </Button>
            ) : (
              <Button variant="destructive" onClick={handleBulkReject}>
                <Send className="w-4 h-4 mr-2" />
                Reject All with Feedback
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HodDashboardContent;
