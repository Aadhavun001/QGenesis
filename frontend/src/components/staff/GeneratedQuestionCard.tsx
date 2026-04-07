import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Edit2, 
  Trash2, 
  Send, 
  FileText,
  Check,
  X,
  GripVertical,
  Copy,
  RefreshCw,
  History,
  ArrowLeftRight
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useQuestionStore, GeneratedQuestion } from '@/stores/questionStore';
import { useQuestionBankStore } from '@/stores/questionBankStore';
import { firestoreQuestionService } from '@/services/firebase/firestore-database';
import { isFirebaseConfigured } from '@/services/firebase/firestore-config';
import { materialStorageService } from '@/services/firebase/materialStorageService';
import { regenerateAnswer } from '@/services/questionGenerationService';
import { format } from 'date-fns';
import { toDateSafe } from '@/services/firebase/converters';

const formatTimeAgo = (date: Date | unknown) => {
  const d = toDateSafe(date);
  if (!d) return '—';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
};

interface GeneratedQuestionCardProps {
  question: GeneratedQuestion;
  index: number;
}

const GeneratedQuestionCard: React.FC<GeneratedQuestionCardProps> = ({ question, index }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { updateQuestion, deleteQuestion, addNotification, materials } = useQuestionStore();
  const { addToBank } = useQuestionBankStore();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isRegeneratingAnswer, setIsRegeneratingAnswer] = useState(false);
  const [editedContent, setEditedContent] = useState(question.content);
  const [editedAnswer, setEditedAnswer] = useState(question.answer);
  const [answerEditable, setAnswerEditable] = useState(false);
  const [showAnswerEditConfirm, setShowAnswerEditConfirm] = useState(false);
  const [showBeforeAfter, setShowBeforeAfter] = useState(false);
  const [showEditHistory, setShowEditHistory] = useState(false);

  const getMaterialContentForQuestion = async (): Promise<string | undefined> => {
    if (!question.materialId) return undefined;
    const local = materials?.find(m => m.id === question.materialId)?.content;
    if (typeof local === 'string' && local.trim().length > 0) return local;
    // Fallback: if local content missing, fetch from Firestore/local material storage.
    try {
      const staffId = user?.id;
      const fetched = await materialStorageService.getMaterialWithAnalysis(question.materialId, staffId);
      return fetched?.material?.content || undefined;
    } catch {
      return undefined;
    }
  };

  const materialName = question.materialId
    ? (materials?.find(m => m.id === question.materialId)?.fileName || 'Unknown material')
    : null;

  const handleSaveEdit = async () => {
    const contentChanged = editedContent !== question.content;
    const answerChanged = editedAnswer !== question.answer;
    
    // Track edit history
    const editEntry = {
      timestamp: new Date(),
      previousContent: question.content,
      previousAnswer: question.answer,
      newContent: editedContent,
      newAnswer: editedAnswer,
    };
    
    const existingHistory = question.editHistory || [];
    const originalContent = question.originalContent || question.content;
    const originalAnswer = question.originalAnswer || question.answer;
    
    if (contentChanged) {
      setIsRegeneratingAnswer(true);
      try {
        const materialContent = await getMaterialContentForQuestion();
        const { answer, explanation } = await regenerateAnswer({
          questionContent: editedContent,
          questionType: (question.type as 'mcq' | 'short' | 'long' | 'descriptive') || 'short',
          difficulty: question.difficulty,
          bloomsLevel: question.bloomsLevel,
          topic: question.topic,
          marks: question.marks,
          materialContent,
          options: question.options,
          correctOption: question.correctOption,
        });
        const finalAnswer = answerEditable ? editedAnswer : answer;
        setEditedAnswer(finalAnswer);
        editEntry.newAnswer = finalAnswer;
        updateQuestion(question.id, {
          content: editedContent,
          answer: finalAnswer,
          originalContent,
          originalAnswer,
          wasEdited: true,
          editHistory: [...existingHistory, editEntry],
        });
        toast({
          title: 'Question Updated',
          description: 'Question and answer have been dynamically updated',
        });
      } catch {
        updateQuestion(question.id, {
          content: editedContent,
          answer: editedAnswer,
          originalContent,
          originalAnswer,
          wasEdited: true,
          editHistory: [...existingHistory, editEntry],
        });
        toast({
          title: 'Question Updated',
          description: 'Saved with your manual answer (auto-regeneration failed)',
        });
      } finally {
        setIsRegeneratingAnswer(false);
      }
    } else if (answerChanged) {
      updateQuestion(question.id, {
        content: editedContent,
        answer: editedAnswer,
        originalContent,
        originalAnswer,
        wasEdited: true,
        editHistory: [...existingHistory, editEntry],
      });
      toast({
        title: 'Question Updated',
        description: 'Your changes have been saved',
      });
    } else {
      toast({ title: 'No Changes', description: 'No modifications detected' });
    }
    setIsEditing(false);
  };

  const handleRegenerateAnswer = async () => {
    setIsRegeneratingAnswer(true);
    try {
      const materialContent = await getMaterialContentForQuestion();
      const { answer } = await regenerateAnswer({
        questionContent: editedContent,
        questionType: (question.type as 'mcq' | 'short' | 'long' | 'descriptive') || 'short',
        difficulty: question.difficulty,
        bloomsLevel: question.bloomsLevel,
        topic: question.topic,
        marks: question.marks,
        materialContent,
        options: question.options,
        correctOption: question.correctOption,
      });
      setEditedAnswer(answer);
      toast({ title: 'Answer Regenerated', description: 'A new answer has been generated for the edited question' });
    } catch {
      toast({ title: 'Regeneration Failed', variant: 'destructive' });
    } finally {
      setIsRegeneratingAnswer(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedContent(question.content);
    setEditedAnswer(question.answer);
    setAnswerEditable(false);
    setIsEditing(false);
  };

  const handleDelete = () => {
    deleteQuestion(question.id);
    toast({ title: 'Question Deleted', description: 'The question has been removed' });
  };

  const handleSendForApproval = async () => {
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
    const updates = { status: 'pending' as const, department, institution, place, staffName: user?.displayName || undefined } as any;
    updateQuestion(question.id, updates);
    if (isFirebaseConfigured()) {
      try {
        // Update first (works when the question already exists in Firestore as draft).
        // If the doc does not exist yet, updateDoc throws not-found; then we create with id.
        try {
          await firestoreQuestionService.update(question.id, updates);
        } catch (err: any) {
          const code = err?.code || err?.name || '';
          if (String(code).includes('not-found')) {
            await firestoreQuestionService.createWithId(question.id, {
              content: question.content,
              answer: question.answer,
              explanation: question.explanation ?? '',
              type: question.type,
              difficulty: question.difficulty,
              bloomsLevel: question.bloomsLevel,
              marks: question.marks,
              topic: question.topic,
              unit: question.unit ?? '',
              subject: question.subject ?? '',
              source: question.source,
              generationSource: (question.generationSource as any) ?? 'config',
              materialId: question.materialId,
              staffId: user?.id ?? question.staffId ?? '',
              staffName: user?.displayName ?? (question as any).staffName ?? '',
              status: 'pending',
              options: question.options,
              correctOption: question.correctOption,
              examType: question.examType,
              department,
              institution,
              place,
            });
          } else {
            throw err;
          }
        }
      } catch (e) {
        console.error('[GeneratedQuestionCard] Firestore sync failed:', e);
      }
    }
    addNotification({
      type: 'request',
      title: 'New Question for Review',
      message: `A staff member has submitted a question for approval: "${question.content.slice(0, 50)}..."`,
      questionId: question.id,
      fromRole: 'staff',
      toRole: 'hod',
      department,
      institution,
      place,
    });
    toast({ title: 'Sent for Approval', description: 'The question has been sent to HOD for review' });
  };

  const handleAddToBuilder = () => {
    toast({ title: 'Added to Question Paper', description: 'The question has been added to your question paper builder' });
  };

  const handleAddToQuestionBank = () => {
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
    toast({ title: 'Added to Question Bank', description: 'You can now reuse this question in the paper builder' });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'medium': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'hard': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'pending': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'rejected': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const hasEditHistory = question.wasEdited && question.originalContent;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="border-border/50 hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <GripVertical className="w-4 h-4" />
              <span className="text-sm font-medium">Q{index}</span>
            </div>
            
            <div className="flex-1 space-y-3">
              {/* Header */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={getDifficultyColor(question.difficulty)}>
                  {question.difficulty}
                </Badge>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  {question.type.toUpperCase()}
                </Badge>
                <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">
                  {question.bloomsLevel}
                </Badge>
                <Badge variant="outline" className={getStatusColor(question.status)}>
                  {question.status}
                </Badge>
                {hasEditHistory && (
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                    <Edit2 className="w-3 h-3 mr-1" />
                    Edited
                  </Badge>
                )}
                {question.generatedBy === 'gemini' && (
                  <Badge variant="outline" className="bg-violet-500/10 text-violet-600 border-violet-500/30" title="Generated by Gemini AI">
                    Gemini
                  </Badge>
                )}
                {materialName && (
                  <Badge variant="outline" className="bg-sky-500/10 text-sky-600 border-sky-500/30" title={materialName}>
                    Material: {materialName.length > 32 ? `${materialName.slice(0, 32)}...` : materialName}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground ml-auto flex items-center gap-2">
                  <span>{question.marks} marks</span>
                  <span className="text-muted-foreground/60">•</span>
                  <span title={toDateSafe(question.createdAt)?.toLocaleString() ?? '—'}>
                    {formatTimeAgo(question.createdAt)}
                  </span>
                </span>
              </div>

              {/* Question Content */}
              {isEditing ? (
                <div className="space-y-3">
                  <Textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="min-h-[80px]"
                    placeholder="Question content..."
                  />
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Answer</Label>
                      {!answerEditable && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs h-6 px-2"
                          onClick={() => setShowAnswerEditConfirm(true)}
                        >
                          <Edit2 className="w-3 h-3 mr-1" />
                          Edit Answer
                        </Button>
                      )}
                    </div>
                    <Textarea
                      value={editedAnswer}
                      onChange={(e) => setEditedAnswer(e.target.value)}
                      className={`min-h-[60px] flex-1 ${!answerEditable ? 'opacity-60 cursor-not-allowed' : ''}`}
                      placeholder="Answer..."
                      readOnly={!answerEditable}
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRegenerateAnswer}
                    disabled={isRegeneratingAnswer}
                    className="w-full"
                  >
                    <RefreshCw className={`w-4 h-4 mr-1 ${isRegeneratingAnswer ? 'animate-spin' : ''}`} />
                    {isRegeneratingAnswer ? 'Regenerating...' : 'Regenerate Answer for Edited Question'}
                  </Button>
                </div>
              ) : (
                <>
                  <p className="text-foreground">{question.content}</p>
                  
                  {question.options && (
                    <div className="space-y-1 pl-4">
                      {question.options.map((opt, idx) => (
                        <div 
                          key={idx}
                          className={`text-sm ${idx === question.correctOption ? 'text-green-500 font-medium' : 'text-muted-foreground'}`}
                        >
                          {String.fromCharCode(65 + idx)}. {opt}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Answer: </span>
                      {question.answer}
                    </p>
                  </div>
                </>
              )}

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
                {isEditing ? (
                  <>
                    <Button size="sm" onClick={handleSaveEdit} className="bg-green-500 hover:bg-green-600">
                      <Check className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                      <Edit2 className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    {hasEditHistory && (
                      <Button size="sm" variant="outline" onClick={() => setShowBeforeAfter(true)} className="text-blue-500">
                        <ArrowLeftRight className="w-4 h-4 mr-1" />
                        Before / After
                      </Button>
                    )}
                    {question.editHistory && question.editHistory.length > 0 && (
                      <Button size="sm" variant="outline" onClick={() => setShowEditHistory(true)} className="text-purple-500">
                        <History className="w-4 h-4 mr-1" />
                        History ({question.editHistory.length})
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={handleDelete} className="text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleAddToBuilder}>
                      <FileText className="w-4 h-4 mr-1" />
                      Add to Paper
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleAddToQuestionBank}>
                      <Copy className="w-4 h-4 mr-1" />
                      Add to Bank
                    </Button>
                    {question.status === 'draft' && (
                      <Button 
                        size="sm" 
                        onClick={handleSendForApproval}
                        className="bg-gradient-to-r from-primary to-accent text-primary-foreground ml-auto"
                      >
                        <Send className="w-4 h-4 mr-1" />
                        Send for Approval
                      </Button>
                    )}
                    {question.status === 'pending' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={handleSendForApproval}
                        className="border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 ml-auto"
                        title="Resend request to HOD if they didn't receive it"
                      >
                        <Send className="w-4 h-4 mr-1" />
                        Resend for Approval
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Before / After Dialog */}
      <Dialog open={showBeforeAfter} onOpenChange={setShowBeforeAfter}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-blue-500" />
              Before & After Comparison
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Before */}
            <div className="space-y-3">
              <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Before (Original)</Badge>
              <div className="p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
                <Label className="text-xs text-muted-foreground mb-1 block">Question</Label>
                <p className="text-sm">{question.originalContent || question.content}</p>
              </div>
              <div className="p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
                <Label className="text-xs text-muted-foreground mb-1 block">Answer</Label>
                <p className="text-sm">{question.originalAnswer || question.answer}</p>
              </div>
            </div>
            {/* After */}
            <div className="space-y-3">
              <Badge className="bg-green-500/10 text-green-500 border-green-500/20">After (Current)</Badge>
              <div className="p-3 rounded-lg border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
                <Label className="text-xs text-muted-foreground mb-1 block">Question</Label>
                <p className="text-sm">{question.content}</p>
              </div>
              <div className="p-3 rounded-lg border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
                <Label className="text-xs text-muted-foreground mb-1 block">Answer</Label>
                <p className="text-sm">{question.answer}</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit History Dialog */}
      <Dialog open={showEditHistory} onOpenChange={setShowEditHistory}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-purple-500" />
              Edit History ({question.editHistory?.length || 0} edits)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {question.editHistory?.map((entry, idx) => (
              <div key={idx} className="border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">Edit #{idx + 1}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(entry.timestamp), 'MMM dd, yyyy HH:mm')}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-2 rounded bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                    <Label className="text-xs text-red-500">Before</Label>
                    <p className="mt-1">{entry.previousContent}</p>
                  </div>
                  <div className="p-2 rounded bg-green-50/50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                    <Label className="text-xs text-green-500">After</Label>
                    <p className="mt-1">{entry.newContent}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Answer Edit Confirmation Dialog */}
      <AlertDialog open={showAnswerEditConfirm} onOpenChange={setShowAnswerEditConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Answer Manually?</AlertDialogTitle>
            <AlertDialogDescription>
              Answers are automatically regenerated when you edit the question, ensuring accuracy. 
              Manual editing may result in inconsistencies. Are you sure you want to edit the answer directly?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Auto-Generated</AlertDialogCancel>
            <AlertDialogAction onClick={() => setAnswerEditable(true)}>
              Yes, Edit Manually
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default GeneratedQuestionCard;
