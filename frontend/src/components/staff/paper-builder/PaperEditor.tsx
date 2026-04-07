import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Trash2, Edit, GripVertical, ChevronDown, ChevronRight,
  Settings, Palette, Type, Save, X, Check, Copy, ArrowUpDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuestionPaperStore, QuestionPaper, PaperSection, PaperQuestion } from '@/stores/questionPaperStore';
import { toast } from 'sonner';

interface PaperEditorProps {
  paper: QuestionPaper;
  onOpenQuestionSource?: () => void;
}

const BLOOMS_LEVELS = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'];

const PaperEditor: React.FC<PaperEditorProps> = ({ paper, onOpenQuestionSource }) => {
  const { 
    updatePaper, addSection, updateSection, deleteSection,
    addQuestionToPaper, updatePaperQuestion, deletePaperQuestion, reorderQuestions,
    addAlternativeQuestion
  } = useQuestionPaperStore();
  
  const [showSettings, setShowSettings] = useState(false);
  const [showAddSection, setShowAddSection] = useState(false);
  const [showAddQuestion, setShowAddQuestion] = useState<string | null>(null);
  const [showAddAlternative, setShowAddAlternative] = useState<{sectionId: string, question: PaperQuestion} | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<{sectionId: string, question: PaperQuestion} | null>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>(paper.sections.map(s => s.id));
  
  // Drag state
  const [draggedQuestion, setDraggedQuestion] = useState<{sectionId: string, questionId: string, index: number} | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionInstructions, setNewSectionInstructions] = useState('');
  
  const [newQuestion, setNewQuestion] = useState<Partial<PaperQuestion>>({
    questionNo: 1,
    subDivision: 'a)',
    content: '',
    marks: 3,
    btl: 'L2',
    type: 'short',
  });
  
  const [alternativeQuestion, setAlternativeQuestion] = useState({
    content: '',
    answer: '',
  });
  
  const [paperSettings, setPaperSettings] = useState({
    collegeName: paper.collegeName,
    departmentName: paper.departmentName,
    courseName: paper.courseName,
    courseCode: paper.courseCode,
    semester: paper.semester,
    duration: paper.duration,
    maxMarks: paper.maxMarks,
    paperColor: paper.paperColor,
    textColor: paper.textColor,
    instructions: paper.instructions.join('\n'),
  });

  // Listen for format changes from PaperFormatUploader
  useEffect(() => {
    const handleFormatChange = (event: CustomEvent<{ sections: Array<{ id: string; name: string; instructions?: string; questionType?: string; numberOfQuestions?: number; marksPerQuestion?: number }> }>) => {
      const formatSections = event.detail.sections;
      if (formatSections && formatSections.length > 0) {
        // Get current paper from store to ensure we have latest state
        const currentPaper = useQuestionPaperStore.getState().papers.find(p => p.id === paper.id);
        if (!currentPaper) return;
        
        // Clear existing sections
        currentPaper.sections.forEach(section => {
          deleteSection(paper.id, section.id);
        });
        
        // Add new sections from format
        formatSections.forEach(formatSection => {
          addSection(paper.id, {
            name: formatSection.name,
            instructions: formatSection.instructions || '',
            questions: [],
          });
        });
        
        // Update expanded sections state
        setTimeout(() => {
          const updatedPaper = useQuestionPaperStore.getState().papers.find(p => p.id === paper.id);
          if (updatedPaper) {
            setExpandedSections(updatedPaper.sections.map(s => s.id));
          }
        }, 100);
        
        toast.success('Paper sections updated from format');
      }
    };

    window.addEventListener('paper-format-changed', handleFormatChange as EventListener);
    return () => {
      window.removeEventListener('paper-format-changed', handleFormatChange as EventListener);
    };
  }, [paper.id, deleteSection, addSection]);
  
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };
  
  const handleAddSection = () => {
    if (!newSectionName.trim()) {
      toast.error('Section name is required');
      return;
    }
    
    const sectionId = addSection(paper.id, {
      name: newSectionName,
      instructions: newSectionInstructions,
      questions: [],
    });
    
    setExpandedSections(prev => [...prev, sectionId]);
    setNewSectionName('');
    setNewSectionInstructions('');
    setShowAddSection(false);
    toast.success('Section added');
  };
  
  const handleAddQuestion = (sectionId: string) => {
    if (!newQuestion.content?.trim()) {
      toast.error('Question content is required');
      return;
    }
    
    addQuestionToPaper(paper.id, sectionId, {
      questionNo: newQuestion.questionNo || 1,
      subDivision: newQuestion.subDivision || 'a)',
      content: newQuestion.content,
      marks: newQuestion.marks || 3,
      btl: newQuestion.btl || 'L2',
      type: newQuestion.type || 'short',
      answer: newQuestion.answer,
    });
    
    setNewQuestion({
      questionNo: newQuestion.questionNo,
      subDivision: getNextSubdivision(newQuestion.subDivision || 'a)'),
      content: '',
      marks: 3,
      btl: 'L2',
      type: 'short',
    });
    setShowAddQuestion(null);
    toast.success('Question added');
  };
  
  const handleAddAlternativeQuestion = () => {
    if (!showAddAlternative || !alternativeQuestion.content.trim()) {
      toast.error('Alternative question content is required');
      return;
    }
    
    addAlternativeQuestion(paper.id, showAddAlternative.sectionId, showAddAlternative.question.id, {
      questionNo: showAddAlternative.question.questionNo,
      subDivision: showAddAlternative.question.subDivision,
      content: alternativeQuestion.content,
      marks: showAddAlternative.question.marks,
      btl: showAddAlternative.question.btl,
      type: showAddAlternative.question.type,
      answer: alternativeQuestion.answer || undefined,
    });
    
    setShowAddAlternative(null);
    setAlternativeQuestion({ content: '', answer: '' });
    toast.success('Alternative (OR) question added');
  };
  
  const handleSaveSettings = () => {
    updatePaper(paper.id, {
      ...paperSettings,
      instructions: paperSettings.instructions.split('\n').filter(i => i.trim()),
    });
    setShowSettings(false);
    toast.success('Settings saved');
  };
  
  const handleSaveQuestionEdit = () => {
    if (!editingQuestion) return;
    
    updatePaperQuestion(
      paper.id, 
      editingQuestion.sectionId, 
      editingQuestion.question.id, 
      editingQuestion.question
    );
    setEditingQuestion(null);
    toast.success('Question updated');
  };
  
  const getNextSubdivision = (current: string): string => {
    const match = current.match(/([a-z])/);
    if (match) {
      const nextChar = String.fromCharCode(match[1].charCodeAt(0) + 1);
      if (current.includes('-')) {
        const parts = current.split('-');
        const romanMatch = parts[1]?.match(/([i]+)/);
        if (romanMatch) {
          return `${parts[0]}-${romanMatch[1]}i)`;
        }
        return `${match[1]}-i)`;
      }
      return `${nextChar})`;
    }
    return 'a)';
  };
  
  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, sectionId: string, questionId: string, index: number) => {
    setDraggedQuestion({ sectionId, questionId, index });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', questionId);
  };
  
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };
  
  const handleDragLeave = () => {
    setDragOverIndex(null);
  };
  
  const handleDrop = (e: React.DragEvent, sectionId: string, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    
    if (!draggedQuestion || draggedQuestion.sectionId !== sectionId) {
      setDraggedQuestion(null);
      return;
    }
    
    const section = paper.sections.find(s => s.id === sectionId);
    if (!section) return;
    
    const newQuestions = [...section.questions];
    const [draggedItem] = newQuestions.splice(draggedQuestion.index, 1);
    
    // Adjust drop index if dragging down
    const adjustedDropIndex = dropIndex > draggedQuestion.index ? dropIndex - 1 : dropIndex;
    newQuestions.splice(adjustedDropIndex, 0, draggedItem);
    
    reorderQuestions(paper.id, sectionId, newQuestions);
    setDraggedQuestion(null);
    toast.success('Question reordered');
  };
  
  const handleDragEnd = () => {
    setDraggedQuestion(null);
    setDragOverIndex(null);
  };
  
  return (
    <div className="space-y-4">
      {/* Paper Header Preview */}
      <Card style={{ backgroundColor: paper.paperColor, color: paper.textColor }}>
        <CardContent className="py-4">
          <div className="text-center space-y-1 mb-4">
            <h2 className="text-lg font-bold">{paper.collegeName}</h2>
            <p className="text-sm">{paper.departmentName}</p>
            <p className="text-sm">Master of Computer Applications Semester: {paper.semester}</p>
            <p className="text-sm font-semibold">CONTINUOUS ASSESSMENT TEST – {paper.examType}</p>
          </div>
          
          <div className="flex justify-between items-center border-t border-b py-2 my-2" style={{ borderColor: paper.textColor }}>
            <div className="text-center flex-1">
              <p className="font-semibold">{paper.courseCode} – {paper.courseName}</p>
            </div>
          </div>
          
          <div className="flex justify-between text-sm">
            <span>Time: {paper.duration}</span>
            <span>Maximum Marks: {paper.maxMarks}</span>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-3 text-foreground border-border bg-background/80 hover:bg-muted"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            <span>Edit Paper Settings</span>
          </Button>
        </CardContent>
      </Card>
      
      {/* Instructions */}
      {paper.instructions.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Instructions</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ol className="list-decimal list-inside text-sm space-y-1">
              {paper.instructions.map((inst, idx) => (
                <li key={idx}>{inst}</li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
      
      {/* Sections */}
      <div className="space-y-4">
        {paper.sections.map((section, sectionIdx) => (
          <Card key={section.id}>
            <Collapsible 
              open={expandedSections.includes(section.id)}
              onOpenChange={() => toggleSection(section.id)}
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {expandedSections.includes(section.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <CardTitle className="text-base">
                        {section.name}
                        <Badge variant="secondary" className="ml-2">
                          {section.questions.length} questions
                        </Badge>
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAddQuestion(section.id);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Question
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSection(paper.id, section.id);
                          toast.success('Section deleted');
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <CardContent className="pt-0">
                  {section.instructions && (
                    <p className="text-sm text-muted-foreground mb-4 italic">{section.instructions}</p>
                  )}
                  
                  {section.questions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                      <p>No questions yet. Add questions manually or drag from source panel.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {section.questions.map((question, qIdx) => (
                        <motion.div
                          key={question.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          draggable={!question.isAlternative}
                          onDragStart={(e) => handleDragStart(e as any, section.id, question.id, qIdx)}
                          onDragOver={(e) => handleDragOver(e as any, qIdx)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e as any, section.id, qIdx)}
                          onDragEnd={handleDragEnd}
                          className={`border rounded-lg p-3 transition-all ${
                            question.isAlternative 
                              ? 'ml-8 border-dashed bg-muted/30 border-orange-300' 
                              : 'cursor-grab active:cursor-grabbing'
                          } ${
                            draggedQuestion?.questionId === question.id ? 'opacity-50 border-primary' : ''
                          } ${
                            dragOverIndex === qIdx && !question.isAlternative ? 'border-t-4 border-t-primary' : ''
                          }`}
                        >
                          {question.isAlternative && (
                            <div className="text-center text-sm font-bold text-orange-600 mb-2 bg-orange-50 dark:bg-orange-900/20 py-1 rounded">
                              (OR)
                            </div>
                          )}
                          
                          <div className="flex items-start gap-3">
                            {!question.isAlternative && (
                              <div className="p-1 hover:bg-muted rounded cursor-grab">
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                {!question.isAlternative && (
                                  <span className="text-sm font-bold bg-primary/10 px-2 py-0.5 rounded">
                                    Q{question.questionNo}
                                  </span>
                                )}
                                <Badge variant="outline">{question.subDivision}</Badge>
                                <Badge>{question.marks} marks</Badge>
                                <Badge variant="secondary">{question.btl}</Badge>
                              </div>
                              
                              <p className="text-sm">{question.content}</p>
                              
                              {question.answer && (
                                <p className="text-xs text-muted-foreground mt-2 bg-muted p-2 rounded">
                                  <strong>Answer:</strong> {question.answer}
                                </p>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingQuestion({ sectionId: section.id, question })}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {!question.isAlternative && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setShowAddAlternative({ sectionId: section.id, question })}
                                  title="Add alternative question (OR)"
                                  className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                >
                                  <Copy className="h-4 w-4" />
                                  <span className="ml-1 text-xs">OR</span>
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  deletePaperQuestion(paper.id, section.id, question.id);
                                  toast.success('Question removed');
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
        
        {/* Add Section Button */}
        <Button
          variant="outline"
          className="w-full border-dashed"
          onClick={() => setShowAddSection(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Section
        </Button>
      </div>
      
      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Paper Settings</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2">
              <Label>College Name</Label>
              <Input
                value={paperSettings.collegeName}
                onChange={(e) => setPaperSettings({ ...paperSettings, collegeName: e.target.value })}
              />
            </div>
            
            <div className="col-span-2">
              <Label>Department Name</Label>
              <Input
                value={paperSettings.departmentName}
                onChange={(e) => setPaperSettings({ ...paperSettings, departmentName: e.target.value })}
              />
            </div>
            
            <div>
              <Label>Course Name</Label>
              <Input
                value={paperSettings.courseName}
                onChange={(e) => setPaperSettings({ ...paperSettings, courseName: e.target.value })}
              />
            </div>
            
            <div>
              <Label>Course Code</Label>
              <Input
                value={paperSettings.courseCode}
                onChange={(e) => setPaperSettings({ ...paperSettings, courseCode: e.target.value })}
              />
            </div>
            
            <div>
              <Label>Semester</Label>
              <Input
                value={paperSettings.semester}
                onChange={(e) => setPaperSettings({ ...paperSettings, semester: e.target.value })}
              />
            </div>
            
            <div>
              <Label>Duration</Label>
              <Input
                value={paperSettings.duration}
                onChange={(e) => setPaperSettings({ ...paperSettings, duration: e.target.value })}
              />
            </div>
            
            <div>
              <Label>Maximum Marks</Label>
              <Input
                type="number"
                value={paperSettings.maxMarks}
                onChange={(e) => setPaperSettings({ ...paperSettings, maxMarks: Number(e.target.value) })}
              />
            </div>
            
            <div>
              <Label className="flex items-center gap-2">
                <Palette className="h-4 w-4" /> Paper Color
              </Label>
              <div className="flex items-center gap-2 p-2 rounded-md bg-background border border-input">
                <input
                  type="color"
                  value={paperSettings.paperColor}
                  onChange={(e) => setPaperSettings({ ...paperSettings, paperColor: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer border-2 border-input bg-background"
                />
                <Input
                  value={paperSettings.paperColor}
                  onChange={(e) => setPaperSettings({ ...paperSettings, paperColor: e.target.value })}
                  className="flex-1 bg-background text-foreground"
                />
              </div>
            </div>
            
            <div>
              <Label className="flex items-center gap-2">
                <Type className="h-4 w-4" /> Text Color
              </Label>
              <div className="flex items-center gap-2 p-2 rounded-md bg-background border border-input">
                <input
                  type="color"
                  value={paperSettings.textColor}
                  onChange={(e) => setPaperSettings({ ...paperSettings, textColor: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer border-2 border-input bg-background"
                />
                <Input
                  value={paperSettings.textColor}
                  onChange={(e) => setPaperSettings({ ...paperSettings, textColor: e.target.value })}
                  className="flex-1 bg-background text-foreground"
                />
              </div>
            </div>
            
            <div className="col-span-2">
              <Label>Instructions (one per line)</Label>
              <Textarea
                value={paperSettings.instructions}
                onChange={(e) => setPaperSettings({ ...paperSettings, instructions: e.target.value })}
                rows={4}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettings(false)}>Cancel</Button>
            <Button onClick={handleSaveSettings}>Save Settings</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Section Dialog */}
      <Dialog open={showAddSection} onOpenChange={setShowAddSection}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Section</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label>Section Name *</Label>
              <Input
                placeholder="e.g., Part A - Short Questions"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
              />
            </div>
            
            <div>
              <Label>Instructions (optional)</Label>
              <Textarea
                placeholder="e.g., Answer any 5 questions"
                value={newSectionInstructions}
                onChange={(e) => setNewSectionInstructions(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSection(false)}>Cancel</Button>
            <Button onClick={handleAddSection}>Add Section</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Question Dialog */}
      <Dialog open={!!showAddQuestion} onOpenChange={() => setShowAddQuestion(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Add Question Manually</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Q. No.</Label>
                <Input
                  type="number"
                  value={newQuestion.questionNo}
                  onChange={(e) => setNewQuestion({ ...newQuestion, questionNo: Number(e.target.value) })}
                />
              </div>
              
              <div>
                <Label>Sub Division</Label>
                <Input
                  placeholder="e.g., a), b-i)"
                  value={newQuestion.subDivision}
                  onChange={(e) => setNewQuestion({ ...newQuestion, subDivision: e.target.value })}
                />
              </div>
              
              <div>
                <Label>Marks</Label>
                <Input
                  type="number"
                  value={newQuestion.marks}
                  onChange={(e) => setNewQuestion({ ...newQuestion, marks: Number(e.target.value) })}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
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
                <Label>Type</Label>
                <Select value={newQuestion.type} onValueChange={(v) => setNewQuestion({ ...newQuestion, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short Answer</SelectItem>
                    <SelectItem value="long">Long Answer</SelectItem>
                    <SelectItem value="mcq">MCQ</SelectItem>
                    <SelectItem value="descriptive">Descriptive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
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
                value={newQuestion.answer || ''}
                onChange={(e) => setNewQuestion({ ...newQuestion, answer: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddQuestion(null)}>Cancel</Button>
            <Button onClick={() => showAddQuestion && handleAddQuestion(showAddQuestion)}>Add Question</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Alternative Question Dialog */}
      <Dialog open={!!showAddAlternative} onOpenChange={() => setShowAddAlternative(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="bg-orange-100 text-orange-600 px-2 py-1 rounded text-sm font-bold">(OR)</span>
              Add Alternative Question
            </DialogTitle>
          </DialogHeader>
          
          {showAddAlternative && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Original Question:</p>
                <p className="text-sm font-medium">{showAddAlternative.question.content}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline">{showAddAlternative.question.marks} marks</Badge>
                  <Badge variant="secondary">{showAddAlternative.question.btl}</Badge>
                </div>
              </div>
              
              <div>
                <Label>Alternative Question Content *</Label>
                <Textarea
                  placeholder="Enter the alternative question..."
                  value={alternativeQuestion.content}
                  onChange={(e) => setAlternativeQuestion({ ...alternativeQuestion, content: e.target.value })}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This question will have the same marks ({showAddAlternative.question.marks}) and BTL level ({showAddAlternative.question.btl})
                </p>
              </div>
              
              <div>
                <Label>Answer (optional)</Label>
                <Textarea
                  placeholder="Enter the expected answer..."
                  value={alternativeQuestion.answer}
                  onChange={(e) => setAlternativeQuestion({ ...alternativeQuestion, answer: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setShowAddAlternative(null);
                onOpenQuestionSource?.();
              }}
            >
              Add from Question Source
            </Button>
            <Button variant="outline" onClick={() => setShowAddAlternative(null)}>Cancel</Button>
            <Button onClick={handleAddAlternativeQuestion} className="bg-orange-600 hover:bg-orange-700">
              Add Alternative (OR)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Question Dialog */}
      <Dialog open={!!editingQuestion} onOpenChange={() => setEditingQuestion(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
          </DialogHeader>
          
          {editingQuestion && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Q. No.</Label>
                  <Input
                    type="number"
                    value={editingQuestion.question.questionNo}
                    onChange={(e) => setEditingQuestion({
                      ...editingQuestion,
                      question: { ...editingQuestion.question, questionNo: Number(e.target.value) }
                    })}
                  />
                </div>
                
                <div>
                  <Label>Sub Division</Label>
                  <Input
                    value={editingQuestion.question.subDivision}
                    onChange={(e) => setEditingQuestion({
                      ...editingQuestion,
                      question: { ...editingQuestion.question, subDivision: e.target.value }
                    })}
                  />
                </div>
                
                <div>
                  <Label>Marks</Label>
                  <Input
                    type="number"
                    value={editingQuestion.question.marks}
                    onChange={(e) => setEditingQuestion({
                      ...editingQuestion,
                      question: { ...editingQuestion.question, marks: Number(e.target.value) }
                    })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>BTL Level</Label>
                  <Select 
                    value={editingQuestion.question.btl} 
                    onValueChange={(v) => setEditingQuestion({
                      ...editingQuestion,
                      question: { ...editingQuestion.question, btl: v }
                    })}
                  >
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
                  <Label>Type</Label>
                  <Select 
                    value={editingQuestion.question.type} 
                    onValueChange={(v) => setEditingQuestion({
                      ...editingQuestion,
                      question: { ...editingQuestion.question, type: v }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Short Answer</SelectItem>
                      <SelectItem value="long">Long Answer</SelectItem>
                      <SelectItem value="mcq">MCQ</SelectItem>
                      <SelectItem value="descriptive">Descriptive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label>Question Content</Label>
                <Textarea
                  value={editingQuestion.question.content}
                  onChange={(e) => setEditingQuestion({
                    ...editingQuestion,
                    question: { ...editingQuestion.question, content: e.target.value }
                  })}
                  rows={4}
                />
              </div>
              
              <div>
                <Label>Answer</Label>
                <Textarea
                  value={editingQuestion.question.answer || ''}
                  onChange={(e) => setEditingQuestion({
                    ...editingQuestion,
                    question: { ...editingQuestion.question, answer: e.target.value }
                  })}
                  rows={3}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingQuestion(null)}>Cancel</Button>
            <Button onClick={handleSaveQuestionEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaperEditor;
