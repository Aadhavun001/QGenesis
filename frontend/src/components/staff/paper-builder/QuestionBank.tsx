import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Trash2, Edit, Search, Filter, Database, 
  Tag, BookOpen, GripVertical, Save, X, Check, RefreshCw, Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useQuestionBankStore, QuestionBankItem } from '@/stores/questionBankStore';
import { useQuestionStore } from '@/stores/questionStore';
import { toast } from 'sonner';

const BLOOMS_LEVELS = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

const QuestionBank: React.FC = () => {
  const { bankQuestions, addToBank, updateBankQuestion, deleteBankQuestion, deleteAllBankQuestions } = useQuestionBankStore();
  const { examTypes, questions: generatedQuestions } = useQuestionStore();
  
  const [activeSource, setActiveSource] = useState<'bank' | 'generated'>('bank');
  const [searchQuery, setSearchQuery] = useState('');
  const [topicFilter, setTopicFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [examTypeFilter, setExamTypeFilter] = useState('all');
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionBankItem | null>(null);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  
  const [newQuestion, setNewQuestion] = useState({
    content: '',
    answer: '',
    marks: 3,
    btl: 'L2',
    type: 'short',
    topic: '',
    difficulty: 'Medium',
    examType: '',
    subject: '',
    tags: [] as string[],
    newTag: '',
  });
  
  // Get unique topics from bank and generated questions
  const topics = useMemo(() => {
    const bankTopics = bankQuestions.map(q => q.topic);
    const genTopics = generatedQuestions.map(q => q.topic);
    return [...new Set([...bankTopics, ...genTopics])].filter(Boolean);
  }, [bankQuestions, generatedQuestions]);
  
  // Filter bank questions
  const filteredBankQuestions = bankQuestions.filter(q => {
    const matchesSearch = q.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         q.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         q.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesTopic = topicFilter === 'all' || q.topic === topicFilter;
    const matchesDifficulty = difficultyFilter === 'all' || q.difficulty === difficultyFilter;
    const matchesExamType = examTypeFilter === 'all' || q.examType === examTypeFilter;
    return matchesSearch && matchesTopic && matchesDifficulty && matchesExamType;
  });
  
  // Filter generated questions
  const filteredGeneratedQuestions = generatedQuestions.filter(q => {
    const matchesSearch = q.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         q.topic.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTopic = topicFilter === 'all' || q.topic === topicFilter;
    const matchesDifficulty = difficultyFilter === 'all' || q.difficulty === difficultyFilter;
    const matchesExamType = examTypeFilter === 'all' || !q.examType || q.examType === examTypeFilter;
    return matchesSearch && matchesTopic && matchesDifficulty && matchesExamType;
  });
  
  const handleAddGeneratedToBank = (question: typeof generatedQuestions[0]) => {
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
    toast.success('Added to Question Bank');
  };
  
  const handleAddQuestion = () => {
    if (!newQuestion.content.trim()) {
      toast.error('Question content is required');
      return;
    }
    
    addToBank({
      content: newQuestion.content,
      answer: newQuestion.answer || undefined,
      marks: newQuestion.marks,
      btl: newQuestion.btl,
      type: newQuestion.type,
      topic: newQuestion.topic,
      difficulty: newQuestion.difficulty,
      examType: newQuestion.examType,
      subject: newQuestion.subject || undefined,
      tags: newQuestion.tags,
    });
    
    setNewQuestion({
      content: '',
      answer: '',
      marks: 3,
      btl: 'L2',
      type: 'short',
      topic: '',
      difficulty: 'Medium',
      examType: '',
      subject: '',
      tags: [],
      newTag: '',
    });
    setShowAddDialog(false);
    toast.success('Question added to bank');
  };
  
  const handleUpdateQuestion = () => {
    if (!editingQuestion) return;
    
    updateBankQuestion(editingQuestion.id, {
      content: editingQuestion.content,
      answer: editingQuestion.answer,
      marks: editingQuestion.marks,
      btl: editingQuestion.btl,
      type: editingQuestion.type,
      topic: editingQuestion.topic,
      difficulty: editingQuestion.difficulty,
      examType: editingQuestion.examType,
      subject: editingQuestion.subject,
      tags: editingQuestion.tags,
    });
    
    setEditingQuestion(null);
    toast.success('Question updated');
  };
  
  const handleAddTag = () => {
    if (newQuestion.newTag.trim() && !newQuestion.tags.includes(newQuestion.newTag.trim())) {
      setNewQuestion({
        ...newQuestion,
        tags: [...newQuestion.tags, newQuestion.newTag.trim()],
        newTag: '',
      });
    }
  };
  
  const handleDeleteAll = () => {
    deleteAllBankQuestions();
    setShowDeleteAllDialog(false);
    toast.success('All questions deleted from bank');
  };
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Question Bank</h2>
          <Badge variant="secondary">{bankQuestions.length} questions</Badge>
        </div>
        <div className="flex items-center gap-2">
          {bankQuestions.length > 0 && (
            <Button variant="destructive" size="sm" onClick={() => setShowDeleteAllDialog(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete All
            </Button>
          )}
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Question
          </Button>
        </div>
      </div>
      
      {/* Source Toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant={activeSource === 'bank' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveSource('bank')}
        >
          <Database className="h-4 w-4 mr-2" />
          Saved Bank ({bankQuestions.length})
        </Button>
        <Button
          variant={activeSource === 'generated' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveSource('generated')}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Generated ({generatedQuestions.length})
        </Button>
      </div>
      
      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search questions, topics, or tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <Select value={topicFilter} onValueChange={setTopicFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Topic" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Topics</SelectItem>
                {topics.map(topic => (
                  <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {DIFFICULTIES.map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={examTypeFilter} onValueChange={setExamTypeFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Exam Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {examTypes.filter(e => e.isActive).map(type => (
                  <SelectItem key={type.id} value={type.code}>{type.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      {/* Questions List */}
      <ScrollArea className="h-[500px]">
        {activeSource === 'bank' ? (
          // Bank Questions
          filteredBankQuestions.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Questions in Bank</h3>
                <p className="text-muted-foreground mb-4">
                  Add frequently used questions for quick reuse
                </p>
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Question
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {filteredBankQuestions.map((question) => (
                  <motion.div
                    key={question.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <Card>
                      <CardContent className="py-4">
                        <div className="flex items-start gap-3">
                          <div className="cursor-grab p-1 hover:bg-muted rounded">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <Badge variant="outline">{question.marks} marks</Badge>
                              <Badge variant="secondary">{question.btl}</Badge>
                              <Badge variant={
                                question.difficulty === 'Easy' ? 'default' :
                                question.difficulty === 'Medium' ? 'secondary' : 'destructive'
                              }>
                                {question.difficulty}
                              </Badge>
                              {question.examType && (
                                <Badge variant="outline">{question.examType}</Badge>
                              )}
                            </div>
                            
                            <p className="text-sm mb-2">{question.content}</p>
                            
                            {question.answer && (
                              <p className="text-xs text-muted-foreground bg-muted p-2 rounded mb-2">
                                <strong>Answer:</strong> {question.answer}
                              </p>
                            )}
                            
                            <div className="flex items-center gap-2 flex-wrap">
                              {question.topic && (
                                <Badge variant="outline" className="text-xs">
                                  <BookOpen className="h-3 w-3 mr-1" />
                                  {question.topic}
                                </Badge>
                              )}
                              {question.tags.map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  <Tag className="h-3 w-3 mr-1" />
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingQuestion(question)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                deleteBankQuestion(question.id);
                                toast.success('Question removed from bank');
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )
        ) : (
          // Generated Questions
          filteredGeneratedQuestions.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Generated Questions</h3>
                <p className="text-muted-foreground mb-4">
                  Generate questions from Upload or AI Assistant first
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {filteredGeneratedQuestions.map((question) => (
                  <motion.div
                    key={question.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <Card>
                      <CardContent className="py-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <Badge variant="outline">{question.marks} marks</Badge>
                              <Badge variant="secondary">{question.bloomsLevel}</Badge>
                              <Badge variant={
                                question.difficulty === 'easy' ? 'default' :
                                question.difficulty === 'medium' ? 'secondary' : 'destructive'
                              }>
                                {question.difficulty}
                              </Badge>
                              <Badge variant={
                                question.status === 'approved' ? 'default' :
                                question.status === 'pending' ? 'secondary' : 'outline'
                              }>
                                {question.status}
                              </Badge>
                              <Badge variant="outline">{question.source}</Badge>
                            </div>
                            
                            <p className="text-sm mb-2">{question.content}</p>
                            
                            {question.answer && (
                              <p className="text-xs text-muted-foreground bg-muted p-2 rounded mb-2">
                                <strong>Answer:</strong> {question.answer}
                              </p>
                            )}
                            
                            <div className="flex items-center gap-2">
                              {question.topic && (
                                <Badge variant="outline" className="text-xs">
                                  <BookOpen className="h-3 w-3 mr-1" />
                                  {question.topic}
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddGeneratedToBank(question)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add to Bank
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )
        )}
      </ScrollArea>
      
      {/* Add Question Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Question to Bank</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label>Question Content *</Label>
              <Textarea
                placeholder="Enter the question..."
                value={newQuestion.content}
                onChange={(e) => setNewQuestion({ ...newQuestion, content: e.target.value })}
                rows={4}
              />
            </div>
            
            <div>
              <Label>Answer (optional)</Label>
              <Textarea
                placeholder="Enter the expected answer..."
                value={newQuestion.answer}
                onChange={(e) => setNewQuestion({ ...newQuestion, answer: e.target.value })}
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Marks</Label>
                <Input
                  type="number"
                  value={newQuestion.marks}
                  onChange={(e) => setNewQuestion({ ...newQuestion, marks: Number(e.target.value) })}
                />
              </div>
              
              <div>
                <Label>BTL Level</Label>
                <Select value={newQuestion.btl} onValueChange={(v) => setNewQuestion({ ...newQuestion, btl: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOOMS_LEVELS.map(level => (
                      <SelectItem key={level} value={level}>{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Difficulty</Label>
                <Select value={newQuestion.difficulty} onValueChange={(v) => setNewQuestion({ ...newQuestion, difficulty: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIFFICULTIES.map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Topic</Label>
                <Input
                  placeholder="e.g., Cloud Security"
                  value={newQuestion.topic}
                  onChange={(e) => setNewQuestion({ ...newQuestion, topic: e.target.value })}
                />
              </div>
              
              <div>
                <Label>Exam Type</Label>
                <Select value={newQuestion.examType} onValueChange={(v) => setNewQuestion({ ...newQuestion, examType: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {examTypes.filter(e => e.isActive).map(type => (
                      <SelectItem key={type.id} value={type.code}>{type.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label>Tags</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="Add a tag..."
                  value={newQuestion.newTag}
                  onChange={(e) => setNewQuestion({ ...newQuestion, newTag: e.target.value })}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                />
                <Button type="button" variant="outline" onClick={handleAddTag}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {newQuestion.tags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary" className="gap-1">
                    {tag}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => setNewQuestion({
                        ...newQuestion,
                        tags: newQuestion.tags.filter((_, i) => i !== idx)
                      })}
                    />
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddQuestion}>Add to Bank</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Question Dialog */}
      <Dialog open={!!editingQuestion} onOpenChange={() => setEditingQuestion(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
          </DialogHeader>
          
          {editingQuestion && (
            <div className="space-y-4 py-4">
              <div>
                <Label>Question Content</Label>
                <Textarea
                  value={editingQuestion.content}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, content: e.target.value })}
                  rows={4}
                />
              </div>
              
              <div>
                <Label>Answer</Label>
                <Textarea
                  value={editingQuestion.answer || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, answer: e.target.value })}
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Marks</Label>
                  <Input
                    type="number"
                    value={editingQuestion.marks}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, marks: Number(e.target.value) })}
                  />
                </div>
                
                <div>
                  <Label>BTL Level</Label>
                  <Select value={editingQuestion.btl} onValueChange={(v) => setEditingQuestion({ ...editingQuestion, btl: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BLOOMS_LEVELS.map(level => (
                        <SelectItem key={level} value={level}>{level}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Difficulty</Label>
                  <Select value={editingQuestion.difficulty} onValueChange={(v) => setEditingQuestion({ ...editingQuestion, difficulty: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIFFICULTIES.map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Topic</Label>
                  <Input
                    value={editingQuestion.topic}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, topic: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label>Exam Type</Label>
                  <Select value={editingQuestion.examType} onValueChange={(v) => setEditingQuestion({ ...editingQuestion, examType: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {examTypes.filter(e => e.isActive).map(type => (
                        <SelectItem key={type.id} value={type.code}>{type.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingQuestion(null)}>Cancel</Button>
            <Button onClick={handleUpdateQuestion}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete All Confirmation */}
      <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Questions?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove all {bankQuestions.length} questions from the bank. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive text-destructive-foreground">
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default QuestionBank;
