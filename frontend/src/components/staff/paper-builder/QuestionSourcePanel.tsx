import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FileUp, Bot, CheckCircle, GripVertical, Plus, Search,
  ChevronDown, ChevronRight, Filter, Database
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuestionStore, GeneratedQuestion } from '@/stores/questionStore';
import { useQuestionPaperStore, PaperQuestion } from '@/stores/questionPaperStore';
import { useQuestionBankStore, QuestionBankItem } from '@/stores/questionBankStore';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface QuestionSourcePanelProps {
  paperId: string;
}

const QuestionSourcePanel: React.FC<QuestionSourcePanelProps> = ({ paperId }) => {
  const { user } = useAuth();
  const { questions, materials } = useQuestionStore();
  const { papers, addQuestionToPaper, addSection, addAlternativeQuestion } = useQuestionPaperStore();
  const { bankQuestions } = useQuestionBankStore();

  // Role-based access: staff see only their own questions when adding to paper
  const myQuestions = user?.role === 'staff' && user?.id
    ? questions.filter(q => q.staffId === user.id)
    : questions;
  const paper = papers.find(p => p.id === paperId);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'upload' | 'ai-assistant'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'draft'>('all');
  const [expandedSources, setExpandedSources] = useState<string[]>(['approved', 'upload', 'ai', 'bank']);
  const [showAddDialog, setShowAddDialog] = useState<GeneratedQuestion | null>(null);
  const [showAddBankDialog, setShowAddBankDialog] = useState<QuestionBankItem | null>(null);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [addAsOr, setAddAsOr] = useState(false);
  const [selectedOriginalQuestionId, setSelectedOriginalQuestionId] = useState<string>('');
  const [questionNo, setQuestionNo] = useState(1);
  const [subDivision, setSubDivision] = useState('a)');

  const getEligibleOriginalQuestions = (): PaperQuestion[] => {
    if (!paper || !selectedSection) return [];
    const section = paper.sections.find((s) => s.id === selectedSection);
    if (!section) return [];
    return section.questions.filter((q) => !q.isAlternative);
  };
  
  const approvedQuestions = myQuestions.filter(q => q.status === 'approved');
  const uploadQuestions = myQuestions.filter(q => q.source === 'upload');
  const aiQuestions = myQuestions.filter(q => q.source === 'ai-assistant');
  
  const filterQuestions = (qs: GeneratedQuestion[]) => {
    return qs.filter(q => {
      const matchesSearch = q.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           q.topic.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSource = sourceFilter === 'all' || q.source === sourceFilter;
      const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
      return matchesSearch && matchesSource && matchesStatus;
    });
  };
  
  const filterBankQuestions = (qs: QuestionBankItem[]) => {
    return qs.filter(q => {
      const matchesSearch = q.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           q.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           q.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesSearch;
    });
  };
  
  const toggleSource = (source: string) => {
    setExpandedSources(prev => 
      prev.includes(source) 
        ? prev.filter(s => s !== source)
        : [...prev, source]
    );
  };
  
  const handleAddToPaper = (question: GeneratedQuestion) => {
    if (!paper || paper.sections.length === 0) {
      // Create a default section if none exists
      const sectionId = addSection(paperId, {
        name: 'Section 1',
        instructions: '',
        questions: [],
      });
      
      addQuestionToPaper(paperId, sectionId, {
        questionNo: 1,
        subDivision: 'a)',
        content: question.content,
        marks: question.marks,
        btl: question.bloomsLevel,
        type: question.type,
        answer: question.answer,
      });
      
      toast.success('Question added to paper');
      return;
    }
    
    setShowAddDialog(question);
    setSelectedSection(paper.sections[0]?.id || '');
    setAddAsOr(false);
    setSelectedOriginalQuestionId('');
  };
  
  const handleAddBankToPaper = (question: QuestionBankItem) => {
    if (!paper || paper.sections.length === 0) {
      // Create a default section if none exists
      const sectionId = addSection(paperId, {
        name: 'Section 1',
        instructions: '',
        questions: [],
      });
      
      addQuestionToPaper(paperId, sectionId, {
        questionNo: 1,
        subDivision: 'a)',
        content: question.content,
        marks: question.marks,
        btl: question.btl,
        type: question.type,
        answer: question.answer,
      });
      
      toast.success('Question added to paper from bank');
      return;
    }
    
    setShowAddBankDialog(question);
    setSelectedSection(paper.sections[0]?.id || '');
    setAddAsOr(false);
    setSelectedOriginalQuestionId('');
  };
  
  const handleConfirmAdd = () => {
    if (!showAddDialog || !selectedSection) return;
    if (addAsOr) {
      if (!selectedOriginalQuestionId) {
        toast.error('Select the original question to attach this OR question.');
        return;
      }
      addAlternativeQuestion(paperId, selectedSection, selectedOriginalQuestionId, {
        questionNo,
        subDivision,
        content: showAddDialog.content,
        marks: showAddDialog.marks,
        btl: showAddDialog.bloomsLevel,
        type: showAddDialog.type,
        answer: showAddDialog.answer,
      });
      setShowAddDialog(null);
      setAddAsOr(false);
      setSelectedOriginalQuestionId('');
      toast.success('Alternative (OR) question added from source');
      return;
    }
    
    addQuestionToPaper(paperId, selectedSection, {
      questionNo,
      subDivision,
      content: showAddDialog.content,
      marks: showAddDialog.marks,
      btl: showAddDialog.bloomsLevel,
      type: showAddDialog.type,
      answer: showAddDialog.answer,
    });
    
    setShowAddDialog(null);
    setQuestionNo(prev => prev);
    setSubDivision(getNextSubdivision(subDivision));
    toast.success('Question added to paper');
  };
  
  const handleConfirmAddBank = () => {
    if (!showAddBankDialog || !selectedSection) return;
    if (addAsOr) {
      if (!selectedOriginalQuestionId) {
        toast.error('Select the original question to attach this OR question.');
        return;
      }
      addAlternativeQuestion(paperId, selectedSection, selectedOriginalQuestionId, {
        questionNo,
        subDivision,
        content: showAddBankDialog.content,
        marks: showAddBankDialog.marks,
        btl: showAddBankDialog.btl,
        type: showAddBankDialog.type,
        answer: showAddBankDialog.answer,
      });
      setShowAddBankDialog(null);
      setAddAsOr(false);
      setSelectedOriginalQuestionId('');
      toast.success('Alternative (OR) question added from bank');
      return;
    }
    
    addQuestionToPaper(paperId, selectedSection, {
      questionNo,
      subDivision,
      content: showAddBankDialog.content,
      marks: showAddBankDialog.marks,
      btl: showAddBankDialog.btl,
      type: showAddBankDialog.type,
      answer: showAddBankDialog.answer,
    });
    
    setShowAddBankDialog(null);
    setQuestionNo(prev => prev);
    setSubDivision(getNextSubdivision(subDivision));
    toast.success('Question added from bank');
  };
  
  const getNextSubdivision = (current: string): string => {
    const match = current.match(/([a-z])/);
    if (match) {
      const nextChar = String.fromCharCode(match[1].charCodeAt(0) + 1);
      return `${nextChar})`;
    }
    return 'a)';
  };
  
  const QuestionItem = ({ question }: { question: GeneratedQuestion }) => {
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
      e.dataTransfer.setData('question', JSON.stringify(question));
    };
    
    return (
      <div
        className="p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors cursor-move group"
        draggable
        onDragStart={handleDragStart}
      >
        <div className="flex items-start gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground mt-1 opacity-50 group-hover:opacity-100" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 flex-wrap mb-1">
              <Badge variant="outline" className="text-xs">{question.marks}m</Badge>
              <Badge variant="secondary" className="text-xs">{question.bloomsLevel}</Badge>
              <Badge 
                variant={question.status === 'approved' ? 'default' : 'outline'} 
                className="text-xs"
              >
                {question.status}
              </Badge>
            </div>
            <p className="text-sm line-clamp-2">{question.content}</p>
            <p className="text-xs text-muted-foreground mt-1">{question.topic}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={() => handleAddToPaper(question)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };
  
  const BankQuestionItem = ({ question }: { question: QuestionBankItem }) => {
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
      e.dataTransfer.setData('bankQuestion', JSON.stringify(question));
    };
    
    return (
      <div
        className="p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors cursor-move group"
        draggable
        onDragStart={handleDragStart}
      >
        <div className="flex items-start gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground mt-1 opacity-50 group-hover:opacity-100" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 flex-wrap mb-1">
              <Badge variant="outline" className="text-xs">{question.marks}m</Badge>
              <Badge variant="secondary" className="text-xs">{question.btl}</Badge>
              <Badge 
                variant={
                  question.difficulty === 'Easy' ? 'default' :
                  question.difficulty === 'Medium' ? 'secondary' : 'destructive'
                } 
                className="text-xs"
              >
                {question.difficulty}
              </Badge>
            </div>
            <p className="text-sm line-clamp-2">{question.content}</p>
            <p className="text-xs text-muted-foreground mt-1">{question.topic}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={() => handleAddBankToPaper(question)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };
  
  const QuestionSection = ({ 
    title, 
    icon: Icon, 
    questions, 
    sourceKey 
  }: { 
    title: string; 
    icon: React.ElementType; 
    questions: GeneratedQuestion[]; 
    sourceKey: string;
  }) => {
    const filtered = filterQuestions(questions);
    
    return (
      <Collapsible
        open={expandedSources.includes(sourceKey)}
        onOpenChange={() => toggleSource(sourceKey)}
      >
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-2 hover:bg-muted rounded-lg cursor-pointer">
            <div className="flex items-center gap-2">
              {expandedSources.includes(sourceKey) ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <Icon className="h-4 w-4" />
              <span className="font-medium text-sm">{title}</span>
            </div>
            <Badge variant="secondary">{filtered.length}</Badge>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-2 pt-2 pl-6">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No questions found
              </p>
            ) : (
              filtered.slice(0, 10).map(q => (
                <QuestionItem key={q.id} question={q} />
              ))
            )}
            {filtered.length > 10 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                +{filtered.length - 10} more questions
              </p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };
  
  const BankSection = () => {
    const filtered = filterBankQuestions(bankQuestions);
    
    return (
      <Collapsible
        open={expandedSources.includes('bank')}
        onOpenChange={() => toggleSource('bank')}
      >
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-2 hover:bg-muted rounded-lg cursor-pointer">
            <div className="flex items-center gap-2">
              {expandedSources.includes('bank') ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <Database className="h-4 w-4" />
              <span className="font-medium text-sm">Question Bank</span>
            </div>
            <Badge variant="secondary">{filtered.length}</Badge>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-2 pt-2 pl-6">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No questions in bank
              </p>
            ) : (
              filtered.slice(0, 10).map(q => (
                <BankQuestionItem key={q.id} question={q} />
              ))
            )}
            {filtered.length > 10 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                +{filtered.length - 10} more questions
              </p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };
  
  return (
    <Card className="h-fit sticky top-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Question Sources</CardTitle>
        <p className="text-xs text-muted-foreground">
          Drag questions or click + to add
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-sm"
          />
        </div>
        
        {/* Filters */}
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger className="text-xs h-8">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Question Sources */}
        <ScrollArea className="h-[500px] pr-2">
          <div className="space-y-2">
            <QuestionSection
              title="Approved Questions"
              icon={CheckCircle}
              questions={approvedQuestions}
              sourceKey="approved"
            />
            
            <BankSection />
            
            <QuestionSection
              title="From Uploads"
              icon={FileUp}
              questions={uploadQuestions}
              sourceKey="upload"
            />
            
            <QuestionSection
              title="AI Generated"
              icon={Bot}
              questions={aiQuestions}
              sourceKey="ai"
            />
          </div>
        </ScrollArea>
      </CardContent>
      
      {/* Add to Section Dialog */}
      <Dialog open={!!showAddDialog} onOpenChange={() => setShowAddDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Question to Paper</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label>Select Section</Label>
              <Select
                value={selectedSection}
                onValueChange={(value) => {
                  setSelectedSection(value);
                  const first = (paper?.sections.find((s) => s.id === value)?.questions || []).find((q) => !q.isAlternative);
                  setSelectedOriginalQuestionId(first?.id || '');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {paper?.sections.map(section => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Question No.</Label>
                <Input
                  type="number"
                  value={questionNo}
                  onChange={(e) => setQuestionNo(Number(e.target.value))}
                />
              </div>
              <div>
                <Label>Sub Division</Label>
                <Input
                  value={subDivision}
                  onChange={(e) => setSubDivision(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center gap-2">
                <Checkbox checked={addAsOr} onCheckedChange={(v) => setAddAsOr(Boolean(v))} />
                <Label>Add as Alternative (OR) question</Label>
              </div>
              {addAsOr && (
                <div>
                  <Label>Attach OR to</Label>
                  <Select value={selectedOriginalQuestionId} onValueChange={setSelectedOriginalQuestionId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select original question" />
                    </SelectTrigger>
                    <SelectContent>
                      {getEligibleOriginalQuestions().map((q) => (
                        <SelectItem key={q.id} value={q.id}>
                          Q{q.questionNo} {q.subDivision} - {q.content.slice(0, 60)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            {showAddDialog && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-1">Question Preview:</p>
                <p className="text-sm text-muted-foreground">{showAddDialog.content}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline">{showAddDialog.marks} marks</Badge>
                  <Badge variant="secondary">{showAddDialog.bloomsLevel}</Badge>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(null)}>Cancel</Button>
            <Button onClick={handleConfirmAdd}>Add to Paper</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Bank Question to Section Dialog */}
      <Dialog open={!!showAddBankDialog} onOpenChange={() => setShowAddBankDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Bank Question to Paper</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label>Select Section</Label>
              <Select
                value={selectedSection}
                onValueChange={(value) => {
                  setSelectedSection(value);
                  const first = (paper?.sections.find((s) => s.id === value)?.questions || []).find((q) => !q.isAlternative);
                  setSelectedOriginalQuestionId(first?.id || '');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {paper?.sections.map(section => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Question No.</Label>
                <Input
                  type="number"
                  value={questionNo}
                  onChange={(e) => setQuestionNo(Number(e.target.value))}
                />
              </div>
              <div>
                <Label>Sub Division</Label>
                <Input
                  value={subDivision}
                  onChange={(e) => setSubDivision(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center gap-2">
                <Checkbox checked={addAsOr} onCheckedChange={(v) => setAddAsOr(Boolean(v))} />
                <Label>Add as Alternative (OR) question</Label>
              </div>
              {addAsOr && (
                <div>
                  <Label>Attach OR to</Label>
                  <Select value={selectedOriginalQuestionId} onValueChange={setSelectedOriginalQuestionId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select original question" />
                    </SelectTrigger>
                    <SelectContent>
                      {getEligibleOriginalQuestions().map((q) => (
                        <SelectItem key={q.id} value={q.id}>
                          Q{q.questionNo} {q.subDivision} - {q.content.slice(0, 60)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            {showAddBankDialog && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-1">Question Preview:</p>
                <p className="text-sm text-muted-foreground">{showAddBankDialog.content}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline">{showAddBankDialog.marks} marks</Badge>
                  <Badge variant="secondary">{showAddBankDialog.btl}</Badge>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddBankDialog(null)}>Cancel</Button>
            <Button onClick={handleConfirmAddBank}>Add to Paper</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default QuestionSourcePanel;
