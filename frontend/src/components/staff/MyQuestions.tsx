import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Upload, 
  MessageSquare,
  Search,
  Filter,
  SortAsc,
  Send,
  Trash2,
  Undo2,
  AlertTriangle,
  BookmarkPlus,
  SquareCheck,
  Square,
  CloudUpload,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useQuestionStore, GeneratedQuestion } from '@/stores/questionStore';
import { useQuestionBankStore } from '@/stores/questionBankStore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { firestoreGeneratedQuestionService } from '@/services/firebase';
import { isFirebaseConfigured } from '@/services/firebase/firestore-config';
import GeneratedQuestionCard from './GeneratedQuestionCard';

const MyQuestions: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { 
    questions, 
    materials,
    deletedQuestions,
    sendAllDraftsToHOD, 
    deleteAllQuestions,
    deleteQuestion,
    updateQuestion,
    undoDeleteQuestion,
    undoAllDeletedQuestions,
    clearDeletedQuestions
  } = useQuestionStore();

  const { addToBank } = useQuestionBankStore();

  // Role-based access: staff see only their own questions
  const myQuestions = user?.role === 'staff' && user?.id
    ? questions.filter(q => q.staffId === user.id)
    : questions;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterMaterial, setFilterMaterial] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeletedQuestions, setShowDeletedQuestions] = useState(false);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('all');
  const [savingToCloud, setSavingToCloud] = useState(false);
  const [savingQuestionId, setSavingQuestionId] = useState<string | null>(null);

  const myMaterials = user?.id ? materials.filter(m => m.staffId === user.id) : materials;

  const filteredQuestions = myQuestions
    .filter(q => {
      if (searchQuery && !q.content.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (filterStatus !== 'all' && q.status !== filterStatus) {
        return false;
      }
      if (filterSource !== 'all' && q.source !== filterSource) {
        return false;
      }
      if (filterMaterial !== 'all' && q.materialId !== filterMaterial) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'difficulty':
          const diffOrder = { easy: 1, medium: 2, hard: 3 };
          return diffOrder[a.difficulty] - diffOrder[b.difficulty];
        default:
          return 0;
      }
    });

  const uploadQuestions = filteredQuestions.filter(q => q.source === 'upload');
  const aiQuestions = filteredQuestions.filter(q => q.source === 'ai-assistant');
  const draftCount = myQuestions.filter(q => q.status === 'draft').length;

  const stats = {
    total: myQuestions.length,
    approved: myQuestions.filter(q => q.status === 'approved').length,
    pending: myQuestions.filter(q => q.status === 'pending').length,
    rejected: myQuestions.filter(q => q.status === 'rejected').length,
    draft: myQuestions.filter(q => q.status === 'draft').length,
  };

  const handleSendAllDrafts = () => {
    const count = sendAllDraftsToHOD();
    if (count > 0) {
      toast({
        title: 'Questions Sent',
        description: `${count} draft questions sent to HOD for approval`,
      });
    } else {
      toast({
        title: 'No Drafts',
        description: 'No draft questions to send',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAll = () => {
    deleteAllQuestions();
    setShowDeleteConfirm(false);
    setSelectedQuestionIds(new Set());
    toast({
      title: 'Questions Deleted',
      description: `All questions have been deleted. You can undo this action.`,
    });
  };

  const handleUndoAll = () => {
    undoAllDeletedQuestions();
    toast({
      title: 'Questions Restored',
      description: 'All deleted questions have been restored',
    });
  };

  const handleUndoSingle = (id: string) => {
    undoDeleteQuestion(id);
    toast({
      title: 'Question Restored',
      description: 'The question has been restored',
    });
  };

  const handleClearDeleted = () => {
    clearDeletedQuestions();
    setShowDeletedQuestions(false);
    toast({
      title: 'Cleared',
      description: 'Deleted questions have been permanently removed',
    });
  };

  // Selection handlers
  const toggleSelectQuestion = (id: string) => {
    setSelectedQuestionIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = (questionList: GeneratedQuestion[]) => {
    const allIds = questionList.map(q => q.id);
    const allSelected = allIds.every(id => selectedQuestionIds.has(id));
    
    if (allSelected) {
      setSelectedQuestionIds(prev => {
        const newSet = new Set(prev);
        allIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    } else {
      setSelectedQuestionIds(prev => {
        const newSet = new Set(prev);
        allIds.forEach(id => newSet.add(id));
        return newSet;
      });
    }
  };

  const handleDeleteSelected = (questionList: GeneratedQuestion[]) => {
    const idsToDelete = questionList.filter(q => selectedQuestionIds.has(q.id)).map(q => q.id);
    if (idsToDelete.length === 0) return;
    idsToDelete.forEach((id) => deleteQuestion(id));
    setSelectedQuestionIds(prev => {
      const next = new Set(prev);
      idsToDelete.forEach(id => next.delete(id));
      return next;
    });
    toast({
      title: 'Selected Questions Deleted',
      description: `${idsToDelete.length} question(s) deleted.`,
    });
  };

  const handleSendSelectedDrafts = async (questionList: GeneratedQuestion[]) => {
    const selectedDrafts = questionList.filter(q => selectedQuestionIds.has(q.id) && q.status === 'draft');
    if (selectedDrafts.length === 0) {
      toast({
        title: 'No Drafts Selected',
        description: 'Select draft questions in this section to send for approval.',
        variant: 'destructive',
      });
      return;
    }
    const department = user?.department;
    const institution = (user as any)?.institution;
    const place = (user as any)?.place;
    if (!department || !institution || !place) {
      toast({
        title: 'Profile incomplete',
        description: 'Set your Department, Institution, and Place in Profile Settings before sending to HOD.',
        variant: 'destructive',
      });
      return;
    }
    for (const q of selectedDrafts) {
      const updates = { status: 'pending' as const, department, institution, place, staffName: user?.displayName || undefined };
      updateQuestion(q.id, updates);
      if (isFirebaseConfigured()) {
        try {
          await firestoreGeneratedQuestionService.update(q.id, updates);
        } catch {
          // best-effort; local status is already updated
        }
      }
    }
    toast({
      title: 'Selected Drafts Sent',
      description: `${selectedDrafts.length} selected draft question(s) sent for approval.`,
    });
  };

  const handleAddSelectedToBank = () => {
    const selectedQuestions = myQuestions.filter(q => selectedQuestionIds.has(q.id));
    
    if (selectedQuestions.length === 0) {
      toast({
        title: 'No Questions Selected',
        description: 'Please select questions to add to the bank',
        variant: 'destructive',
      });
      return;
    }

    selectedQuestions.forEach(question => {
      addToBank({
        content: question.content,
        answer: question.answer,
        marks: question.marks,
        btl: question.bloomsLevel,
        type: question.type,
        topic: question.topic,
        difficulty: question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1),
        examType: question.examType || 'SEM',
        tags: [],
      });
    });

    setSelectedQuestionIds(new Set());
    toast({
      title: 'Added to Question Bank',
      description: `${selectedQuestions.length} questions added to the Question Bank`,
    });
  };

  const getSelectedCount = (questionList: GeneratedQuestion[]) => {
    return questionList.filter(q => selectedQuestionIds.has(q.id)).length;
  };

  const questionsToSaveByTab = activeTab === 'all' ? filteredQuestions : activeTab === 'upload' ? uploadQuestions : aiQuestions;

  const handleSaveAllToCloud = async () => {
    const list = questionsToSaveByTab;
    if (list.length === 0) {
      toast({
        title: 'No questions to save',
        description: activeTab === 'all' ? 'Add questions first.' : `No ${activeTab === 'upload' ? 'upload' : 'AI assistant'} questions in this tab.`,
        variant: 'destructive',
      });
      return;
    }
    const staffId = user?.id ?? list[0]?.staffId;
    if (!staffId) {
      toast({
        title: 'Sign in required',
        description: 'Sign in to save questions to the cloud',
        variant: 'destructive',
      });
      return;
    }
    if (!isFirebaseConfigured()) {
      toast({
        title: 'Cloud not available',
        description: 'Firebase is not configured. Questions are stored locally only.',
        variant: 'destructive',
      });
      return;
    }
    setSavingToCloud(true);
    try {
      const payload = list.map(q => ({
        content: q.content,
        answer: q.answer,
        explanation: q.explanation ?? '',
        type: q.type,
        difficulty: q.difficulty,
        bloomsLevel: q.bloomsLevel,
        marks: q.marks,
        topic: q.topic,
        unit: q.unit ?? '',
        subject: q.subject ?? '',
        source: q.source,
        generationSource: (q.generationSource ?? (q.source === 'ai-assistant' ? 'ai-chat' : 'config')) as 'config' | 'ai-chat',
        materialId: q.materialId,
        staffId,
        department: q.department,
        institution: q.institution,
        place: q.place,
        status: q.status,
        options: q.options,
        correctOption: q.correctOption,
        examType: q.examType,
      }));
      await firestoreGeneratedQuestionService.batchCreate(payload);
      toast({
        title: 'Saved to cloud',
        description: `${list.length} questions saved to generated_questions under your account (${activeTab === 'upload' ? 'upload' : activeTab === 'ai' ? 'AI Assistant' : 'all'} source).`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save to cloud';
      toast({
        title: 'Save failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setSavingToCloud(false);
    }
  };

  const handleSaveSingleQuestionToCloud = async (q: GeneratedQuestion) => {
    const staffId = user?.id ?? q.staffId;
    if (!staffId || !isFirebaseConfigured()) {
      toast({
        title: staffId ? 'Cloud not available' : 'Sign in required',
        description: staffId ? 'Firebase is not configured.' : 'Sign in to save to cloud.',
        variant: 'destructive',
      });
      return;
    }
    setSavingQuestionId(q.id);
    try {
      const payload = [{
        content: q.content,
        answer: q.answer,
        explanation: q.explanation ?? '',
        type: q.type,
        difficulty: q.difficulty,
        bloomsLevel: q.bloomsLevel,
        marks: q.marks,
        topic: q.topic,
        unit: q.unit ?? '',
        subject: q.subject ?? '',
        source: q.source,
        generationSource: (q.generationSource ?? (q.source === 'ai-assistant' ? 'ai-chat' : 'config')) as 'config' | 'ai-chat',
        materialId: q.materialId,
        staffId,
        department: q.department,
        institution: q.institution,
        place: q.place,
        status: q.status,
        options: q.options,
        correctOption: q.correctOption,
        examType: q.examType,
      }];
      await firestoreGeneratedQuestionService.batchCreate(payload);
      toast({ title: 'Saved to cloud', description: 'Question saved to generated_questions.' });
    } catch (err) {
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Could not save to cloud',
        variant: 'destructive',
      });
    } finally {
      setSavingQuestionId(null);
    }
  };

  const isAllSelected = (questionList: GeneratedQuestion[]) => {
    return questionList.length > 0 && questionList.every(q => selectedQuestionIds.has(q.id));
  };

  const getRecentAndOlder = (questionList: GeneratedQuestion[]) => {
    if (questionList.length === 0) return { recentBatch: [] as GeneratedQuestion[], older: [] as GeneratedQuestion[] };
    const sortedByNewest = [...questionList].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const newestMs = new Date(sortedByNewest[0].createdAt).getTime();
    const RECENT_BATCH_WINDOW_MS = 10 * 60 * 1000;
    const recentBatch = sortedByNewest.filter(
      q => newestMs - new Date(q.createdAt).getTime() <= RECENT_BATCH_WINDOW_MS
    );
    const recentIds = new Set(recentBatch.map(q => q.id));
    const older = sortedByNewest.filter(q => !recentIds.has(q.id));
    return { recentBatch, older };
  };

  // Render question list with selection
  const renderQuestionList = (questionList: GeneratedQuestion[], emptyMessage: string) => {
    if (questionList.length === 0) {
      return <EmptyState message={emptyMessage} />;
    }

    const selectedCount = getSelectedCount(questionList);
    const allSelected = isAllSelected(questionList);

    const { recentBatch, older } = getRecentAndOlder(questionList);
    const sections: Array<{ key: string; title: string; items: GeneratedQuestion[] }> = [
      { key: 'recent', title: `Recent Batch (${recentBatch.length})`, items: recentBatch },
      { key: 'older', title: `Older Questions (${older.length})`, items: older },
    ];

    return (
      <div className="space-y-6">
        {sections.map(section => {
          if (section.items.length === 0) return null;
          const sectionSelectedCount = getSelectedCount(section.items);
          const sectionAllSelected = isAllSelected(section.items);
          const sectionDraftSelectedCount = section.items.filter(q => selectedQuestionIds.has(q.id) && q.status === 'draft').length;
          return (
            <div key={section.key} className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{section.title}</h3>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={sectionAllSelected}
                    onCheckedChange={() => toggleSelectAll(section.items)}
                  />
                  <span className="text-sm text-muted-foreground">
                    {sectionAllSelected ? 'Deselect All' : 'Select All'} ({section.items.length})
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {sectionSelectedCount > 0 && (
                    <>
                      <Button
                        size="sm"
                        onClick={handleAddSelectedToBank}
                        className="bg-gradient-to-r from-primary to-accent text-primary-foreground"
                      >
                        <BookmarkPlus className="w-4 h-4 mr-2" />
                        Add {sectionSelectedCount} to Bank
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDeleteSelected(section.items)} className="text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Selected
                      </Button>
                    </>
                  )}
                  {sectionDraftSelectedCount > 0 && (
                    <Button size="sm" variant="outline" onClick={() => handleSendSelectedDrafts(section.items)}>
                      <Send className="w-4 h-4 mr-2" />
                      Send Selected Drafts ({sectionDraftSelectedCount})
                    </Button>
                  )}
                </div>
              </div>
              {section.items.map((question, index) => (
                <div key={question.id} className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedQuestionIds.has(question.id)}
                    onCheckedChange={() => toggleSelectQuestion(question.id)}
                    className="mt-4"
                  />
                  <div className="flex-1 min-w-0">
                    <GeneratedQuestionCard
                      question={question}
                      index={index + 1}
                    />
                  </div>
                  {isFirebaseConfigured() && user?.id && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 mt-2"
                      onClick={() => handleSaveSingleQuestionToCloud(question)}
                      disabled={savingQuestionId === question.id}
                    >
                      {savingQuestionId === question.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CloudUpload className="w-4 h-4 mr-1" />
                      )}
                      Save to cloud
                    </Button>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">My Questions</h2>
          <p className="text-muted-foreground">View and manage all your generated questions</p>
        </div>
        
        {/* Bulk Actions */}
        <div className="flex flex-wrap gap-2">
          {selectedQuestionIds.size > 0 && (
            <Badge variant="secondary" className="px-3 py-1">
              {selectedQuestionIds.size} selected
            </Badge>
          )}
          {draftCount > 0 && (
            <Button 
              onClick={handleSendAllDrafts}
              className="bg-gradient-to-r from-primary to-accent text-primary-foreground"
            >
              <Send className="w-4 h-4 mr-2" />
              Send All Drafts ({draftCount})
            </Button>
          )}
          {questionsToSaveByTab.length > 0 && isFirebaseConfigured() && user?.id && (
            <Button
              variant="outline"
              onClick={handleSaveAllToCloud}
              disabled={savingToCloud}
            >
              {savingToCloud ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CloudUpload className="w-4 h-4 mr-2" />}
              {savingToCloud ? 'Saving…' : `Save all to cloud (${questionsToSaveByTab.length})`}
            </Button>
          )}
          {questions.length > 0 && (
            <Button 
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete All
            </Button>
          )}
          {deletedQuestions.length > 0 && (
            <Button 
              variant="outline"
              onClick={() => setShowDeletedQuestions(true)}
            >
              <Undo2 className="w-4 h-4 mr-2" />
              Deleted ({deletedQuestions.length})
            </Button>
          )}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'from-blue-500 to-cyan-500' },
          { label: 'Draft', value: stats.draft, color: 'from-gray-500 to-slate-500' },
          { label: 'Pending', value: stats.pending, color: 'from-amber-500 to-orange-500' },
          { label: 'Approved', value: stats.approved, color: 'from-green-500 to-emerald-500' },
          { label: 'Rejected', value: stats.rejected, color: 'from-red-500 to-rose-500' },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="border-border/50">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className={`text-2xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                  {stat.value}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Search and Filters */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterSource} onValueChange={setFilterSource}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="upload">From Upload</SelectItem>
                  <SelectItem value="ai-assistant">AI Assistant</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterMaterial} onValueChange={setFilterMaterial}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Upload className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Material" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Materials</SelectItem>
                  {myMaterials.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.fileName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SortAsc className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="difficulty">By Difficulty</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all" className="gap-2">
            <FileText className="w-4 h-4" />
            All ({filteredQuestions.length})
          </TabsTrigger>
          <TabsTrigger value="upload" className="gap-2">
            <Upload className="w-4 h-4" />
            From Upload ({uploadQuestions.length})
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            AI Assistant ({aiQuestions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {renderQuestionList(filteredQuestions, "No questions found")}
        </TabsContent>

        <TabsContent value="upload" className="mt-6">
          {renderQuestionList(uploadQuestions, "No questions generated from uploaded materials yet")}
        </TabsContent>

        <TabsContent value="ai" className="mt-6">
          {renderQuestionList(aiQuestions, "No questions generated from AI Assistant yet")}
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Delete All Questions
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete all {questions.length} questions? You can undo this action from the "Deleted" section.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAll}>
              Delete All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deleted Questions Dialog */}
      <Dialog open={showDeletedQuestions} onOpenChange={setShowDeletedQuestions}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Deleted Questions ({deletedQuestions.length})
            </DialogTitle>
            <DialogDescription>
              Restore individual questions or restore all at once.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto space-y-3">
            {deletedQuestions.map((question) => (
              <div key={question.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{question.content}</p>
                  <p className="text-xs text-muted-foreground">
                    {question.type} • {question.difficulty} • {question.topic}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleUndoSingle(question.id)}
                >
                  <Undo2 className="w-4 h-4 mr-1" />
                  Restore
                </Button>
              </div>
            ))}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleClearDeleted} className="text-destructive">
              Clear All Permanently
            </Button>
            <Button onClick={handleUndoAll} className="bg-gradient-to-r from-primary to-accent">
              <Undo2 className="w-4 h-4 mr-2" />
              Restore All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const EmptyState: React.FC<{ message?: string }> = ({ message = "No questions found" }) => (
  <Card className="border-border/50 border-dashed">
    <CardContent className="p-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
        <FileText className="w-8 h-8 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground">{message}</p>
    </CardContent>
  </Card>
);

export default MyQuestions;
