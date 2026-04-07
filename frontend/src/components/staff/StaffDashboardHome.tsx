import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  Clock, 
  XCircle, 
  MessageSquare,
  TrendingUp,
  ArrowRight,
  Sparkles,
  History,
  Edit3,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  Save,
  X,
  Undo2,
  Copy
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useQuestionStore, GeneratedQuestion } from '@/stores/questionStore';
import { useQuestionBankStore } from '@/stores/questionBankStore';
import { useAppSettingsStore } from '@/stores/appSettingsStore';
import { useToast } from '@/hooks/use-toast';
import { useNotificationAlerts } from '@/hooks/useNotificationAlerts';
import FeedbackWidget from '@/components/common/FeedbackWidget';
import ProfileCompletenessIndicator from './ProfileCompletenessIndicator';

const StaffDashboardHome: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { settings } = useAppSettingsStore();
  const staffSettings = settings.staff;
  const { 
    questions, 
    deletedQuestions,
    notifications,
    updateQuestion, 
    deleteQuestion,
    deleteAllQuestions,
    undoDeleteQuestion,
    undoAllDeletedQuestions
  } = useQuestionStore();

  // Role-based access: staff see only their own questions for stats and lists
  const myQuestions = user?.role === 'staff' && user?.id
    ? questions.filter(q => q.staffId === user.id)
    : questions;

  // Get notifications for staff
  const staffNotifications = notifications.filter(n => n.toRole === 'staff');
  const unreadCount = staffNotifications.filter(n => !n.isRead).length;
  
  // Play sound and show toast when new notifications arrive
  useNotificationAlerts({ notifications, role: 'staff' });

  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [editedAnswer, setEditedAnswer] = useState('');
  const [activeTab, setActiveTab] = useState('recent');
  
  // Listen for user updates to refresh dashboard color
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
    
    return { className: colorMap[dashboardColor] || 'from-blue-500 via-purple-500 to-pink-500' };
  };

  const gradientStyle = getDashboardGradient();

  const stats = [
    { 
      icon: FileText, 
      label: staffSettings.stats?.totalQuestionsLabel || 'Total Questions', 
      value: myQuestions.length.toString(), 
      change: `${myQuestions.filter(q => {
        const today = new Date();
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        return new Date(q.createdAt) > weekAgo;
      }).length} this week`,
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-500/10 to-cyan-500/10'
    },
    { 
      icon: CheckCircle, 
      label: staffSettings.stats?.approvedLabel || 'Approved', 
      value: myQuestions.filter(q => q.status === 'approved').length.toString(), 
      change: myQuestions.length > 0 
        ? `${Math.round((myQuestions.filter(q => q.status === 'approved').length / myQuestions.length) * 100)}% approval rate`
        : '0% approval rate',
      gradient: 'from-green-500 to-emerald-500',
      bgGradient: 'from-green-500/10 to-emerald-500/10'
    },
    { 
      icon: Clock, 
      label: staffSettings.stats?.pendingLabel || 'Pending Review', 
      value: myQuestions.filter(q => q.status === 'pending').length.toString(), 
      change: 'Awaiting HOD',
      gradient: 'from-amber-500 to-orange-500',
      bgGradient: 'from-amber-500/10 to-orange-500/10'
    },
    { 
      icon: XCircle, 
      label: staffSettings.stats?.revisionsLabel || 'Needs Revision', 
      value: myQuestions.filter(q => q.status === 'rejected').length.toString(), 
      change: 'Check feedback',
      gradient: 'from-red-500 to-rose-500',
      bgGradient: 'from-red-500/10 to-rose-500/10'
    },
  ];

  // Get quick actions from settings or use defaults
  const quickActionsData = staffSettings.quickActions || [
    { label: 'Upload Material', icon: 'Upload', path: '/staff/upload' },
    { label: 'Generate Questions', icon: 'Sparkles', path: '/staff/generate' },
    { label: 'AI Assistant', icon: 'MessageSquare', path: '/staff/chat' },
  ];

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'Upload': return Upload;
      case 'Sparkles': return Sparkles;
      case 'MessageSquare': return MessageSquare;
      default: return FileText;
    }
  };

  const quickActions = quickActionsData.map(action => ({
    icon: getIconComponent(action.icon),
    label: action.label,
    path: action.path,
    gradient: action.icon === 'Upload' ? 'from-purple-500 to-pink-500' 
      : action.icon === 'Sparkles' ? 'from-blue-500 to-cyan-500' 
      : 'from-green-500 to-emerald-500'
  }));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'pending': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'rejected': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500/10 text-green-500';
      case 'medium': return 'bg-amber-500/10 text-amber-500';
      case 'hard': return 'bg-red-500/10 text-red-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Sort questions by date, most recent first
  const sortedQuestions = [...myQuestions].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const recentQuestions = sortedQuestions.slice(0, 6);

  const handleStartEdit = (question: GeneratedQuestion) => {
    setEditingQuestion(question.id);
    setEditedContent(question.content);
    setEditedAnswer(question.answer);
  };

  const handleSaveEdit = (id: string) => {
    updateQuestion(id, {
      content: editedContent,
      answer: editedAnswer
    });
    setEditingQuestion(null);
    toast({
      title: 'Question Updated',
      description: 'Your changes have been saved to My Questions',
    });
  };

  const handleCancelEdit = () => {
    setEditingQuestion(null);
    setEditedContent('');
    setEditedAnswer('');
  };

  const handleDelete = (id: string) => {
    deleteQuestion(id);
    toast({
      title: 'Question Moved to History',
      description: 'You can restore it from the Question History tab',
    });
  };

  const handleRestore = (id: string) => {
    undoDeleteQuestion(id);
    toast({
      title: 'Question Restored',
      description: 'The question has been restored to your questions',
    });
  };

  const handleRestoreAll = () => {
    undoAllDeletedQuestions();
    toast({
      title: 'All Questions Restored',
      description: 'All deleted questions have been restored',
    });
  };

  const handleDeleteAllHistory = () => {
    // Clear all deleted questions permanently
    useQuestionStore.getState().clearDeletedQuestions();
    toast({
      title: 'History Cleared',
      description: 'All deleted questions have been permanently removed',
    });
  };

  const handleAddToPaperBuilder = (question: GeneratedQuestion) => {
    toast({
      title: 'Added to Paper Builder',
      description: `Question "${question.content.substring(0, 30)}..." added to paper`,
    });
  };

  const handleCopyToQuestionBank = (question: GeneratedQuestion) => {
    const { addToBank } = useQuestionBankStore.getState();
    addToBank({
      content: question.content,
      answer: question.answer,
      marks: question.marks,
      btl: question.bloomsLevel,
      type: question.type,
      topic: question.topic,
      difficulty: question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1),
      examType: question.examType || '',
      tags: [],
    });
    toast({
      title: 'Copied to Question Bank',
      description: 'Question has been added to the Question Bank for reuse',
    });
  };

  return (
    <div className="space-y-8">
      {/* Profile Completeness Indicator */}
      <ProfileCompletenessIndicator />

      {/* Welcome Section */}
      <div 
        className={`relative overflow-hidden rounded-3xl p-8 text-white ${gradientStyle.className ? `bg-gradient-to-br ${gradientStyle.className}` : ''}`}
        style={gradientStyle.background ? { background: gradientStyle.background } : undefined}
      >
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="relative">
          <h1 className="text-3xl font-bold mb-2">{staffSettings.welcomeMessage || 'Welcome back'}, {user?.displayName}! 👋</h1>
          <p className="text-white/80 mb-6">{staffSettings.welcomeSubtitle || 'Ready to create some amazing questions today?'}</p>
          <div className="flex flex-wrap gap-4">
            {quickActions.map((action, index) => (
              <Link key={index} to={action.path}>
                <Button 
                  variant="secondary" 
                  className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm"
                >
                  <action.icon className="w-4 h-4 mr-2" />
                  {action.label}
                </Button>
              </Link>
            ))}
            <FeedbackWidget userType="staff" />
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

      {/* Questions & History Tabs */}
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">{staffSettings.questionManagementTitle || 'Question Management'}</CardTitle>
          <Link to="/staff/questions">
            <Button variant="ghost" size="sm" className="gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="recent" className="gap-2">
                <FileText className="w-4 h-4" />
                {staffSettings.recentQuestionsTab || 'Recent Questions'} ({recentQuestions.length})
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <History className="w-4 h-4" />
                {staffSettings.questionHistoryTab || 'Question History'} ({deletedQuestions.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="recent">
              {recentQuestions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground mb-4">{staffSettings.emptyStateMessage || 'No questions yet. Start by generating some!'}</p>
                  <Link to="/staff/generate">
                    <Button className="bg-gradient-to-r from-primary to-accent text-white">
                      <Sparkles className="w-4 h-4 mr-2" />
                      {staffSettings.emptyStateButtonText || 'Generate Questions'}
                    </Button>
                  </Link>
                </div>
              ) : (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3">
                    <AnimatePresence>
                      {recentQuestions.map((question, index) => (
                        <motion.div
                          key={question.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <Card className="border-border/50 hover:shadow-md transition-all">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  {editingQuestion === question.id ? (
                                    <div className="space-y-3">
                                      <Textarea
                                        value={editedContent}
                                        onChange={(e) => setEditedContent(e.target.value)}
                                        placeholder="Question content..."
                                        className="min-h-[80px]"
                                      />
                                      <Textarea
                                        value={editedAnswer}
                                        onChange={(e) => setEditedAnswer(e.target.value)}
                                        placeholder="Answer..."
                                        className="min-h-[60px]"
                                      />
                                      <div className="flex gap-2">
                                        <Button size="sm" onClick={() => handleSaveEdit(question.id)}>
                                          <Save className="w-4 h-4 mr-1" />
                                          Save
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                                          <X className="w-4 h-4 mr-1" />
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <Badge className={`${getStatusColor(question.status)} border`}>
                                          {question.status}
                                        </Badge>
                                        <Badge className={getDifficultyColor(question.difficulty)}>
                                          {question.difficulty}
                                        </Badge>
                                        <Badge variant="outline">{question.type}</Badge>
                                        <Badge variant="outline">{question.marks} marks</Badge>
                                      </div>
                                      <p className="text-sm text-foreground mb-1">{question.content}</p>
                                      <p className="text-xs text-muted-foreground">Topic: {question.topic}</p>
                                      
                                      {expandedQuestion === question.id && (
                                        <motion.div
                                          initial={{ opacity: 0, height: 0 }}
                                          animate={{ opacity: 1, height: 'auto' }}
                                          exit={{ opacity: 0, height: 0 }}
                                          className="mt-3 p-3 rounded-lg bg-muted/50"
                                        >
                                          <p className="text-sm font-medium text-foreground mb-1">Answer:</p>
                                          <p className="text-sm text-muted-foreground">{question.answer}</p>
                                          {question.options && question.options.length > 0 && (
                                            <div className="mt-2">
                                              <p className="text-sm font-medium text-foreground mb-1">Options:</p>
                                              <ul className="list-disc list-inside text-sm text-muted-foreground">
                                                {question.options.map((opt, i) => (
                                                  <li key={i} className={question.correctOption === i ? 'text-green-500 font-medium' : ''}>
                                                    {opt} {question.correctOption === i && '✓'}
                                                  </li>
                                                ))}
                                              </ul>
                                            </div>
                                          )}
                                        </motion.div>
                                      )}
                                    </>
                                  )}
                                </div>
                                
                                {editingQuestion !== question.id && (
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setExpandedQuestion(
                                        expandedQuestion === question.id ? null : question.id
                                      )}
                                      title={expandedQuestion === question.id ? 'Hide Answer' : 'View Answer'}
                                    >
                                      {expandedQuestion === question.id ? (
                                        <EyeOff className="w-4 h-4" />
                                      ) : (
                                        <Eye className="w-4 h-4" />
                                      )}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleStartEdit(question)}
                                      title="Edit Question"
                                    >
                                      <Edit3 className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleCopyToQuestionBank(question)}
                                      title="Copy to Question Bank"
                                    >
                                      <Copy className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleAddToPaperBuilder(question)}
                                      title="Add to Paper Builder"
                                    >
                                      <Plus className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-destructive hover:bg-destructive/10"
                                      onClick={() => handleDelete(question.id)}
                                      title="Delete Question"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            <TabsContent value="history">
              {deletedQuestions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                    <History className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">No deleted questions in history</p>
                </div>
              ) : (
                <>
                  <div className="flex gap-2 mb-4">
                    <Button variant="outline" onClick={handleRestoreAll}>
                      <Undo2 className="w-4 h-4 mr-2" />
                      Restore All ({deletedQuestions.length})
                    </Button>
                    <Button 
                      variant="outline" 
                      className="text-destructive hover:bg-destructive/10"
                      onClick={handleDeleteAllHistory}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear History
                    </Button>
                  </div>
                  <ScrollArea className="h-[350px] pr-4">
                    <div className="space-y-3">
                      <AnimatePresence>
                        {deletedQuestions.map((question, index) => (
                          <motion.div
                            key={question.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <Card className="border-border/50 opacity-75 hover:opacity-100 transition-all">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                      <Badge variant="outline" className="opacity-50">Deleted</Badge>
                                      <Badge className={getDifficultyColor(question.difficulty)}>
                                        {question.difficulty}
                                      </Badge>
                                      <Badge variant="outline">{question.type}</Badge>
                                    </div>
                                    <p className="text-sm text-foreground mb-1">{question.content}</p>
                                    <p className="text-xs text-muted-foreground">Topic: {question.topic}</p>
                                  </div>
                                  
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRestore(question.id)}
                                    >
                                      <Undo2 className="w-4 h-4 mr-1" />
                                      Restore
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </ScrollArea>
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Progress Card */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/50">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-6">
              <div className="text-center p-4 rounded-xl bg-muted/30">
                <p className="text-3xl font-bold text-foreground">
                  {myQuestions.filter(q => q.status === 'draft').length}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Draft Questions</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-muted/30">
                <p className="text-3xl font-bold text-foreground">
                  {myQuestions.filter(q => q.source === 'upload').length}
                </p>
                <p className="text-sm text-muted-foreground mt-1">From Materials</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-muted/30">
                <p className="text-3xl font-bold text-foreground">
                  {myQuestions.filter(q => q.source === 'ai-assistant').length}
                </p>
                <p className="text-sm text-muted-foreground mt-1">From AI Chat</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Monthly Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Questions Generated</span>
                <span className="font-medium">{myQuestions.length}/50</span>
              </div>
              <Progress value={Math.min((myQuestions.length / 50) * 100, 100)} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Approval Rate</span>
                <span className="font-medium">
                  {myQuestions.length > 0 
                    ? Math.round((myQuestions.filter(q => q.status === 'approved').length / myQuestions.length) * 100) 
                    : 0}%
                </span>
              </div>
              <Progress value={myQuestions.length > 0 ? (myQuestions.filter(q => q.status === 'approved').length / myQuestions.length) * 100 : 0} className="h-2" />
            </div>
            
            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground mb-4">Keep up the great work! Start generating more questions.</p>
              <Link to="/staff/upload">
                <Button className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload New Material
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StaffDashboardHome;