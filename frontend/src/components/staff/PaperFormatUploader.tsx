import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Upload, 
  FileText, 
  X, 
  Check, 
  AlertCircle,
  FileImage,
  Scan,
  Layout,
  Edit3,
  Plus,
  Trash2,
  Save,
  RotateCcw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface UploadedFormat {
  id: string;
  fileName: string;
  fileType: string;
  uploadedAt: Date;
  status: 'analyzing' | 'ready' | 'error';
  analysis?: FormatAnalysis;
  isActive?: boolean;
}

interface FormatAnalysis {
  headerStyle: string;
  questionFormat: string;
  sectionsDetected: number;
  marksFormat: string;
  logoPosition?: string;
  fontStyle?: string;
  sections: SectionFormat[];
}

interface SectionFormat {
  id: string;
  name: string;
  questionType: string;
  numberOfQuestions: number;
  marksPerQuestion: number;
  instructions?: string;
}

interface Question {
  id: string;
  content: string;
  type: string;
  marks: number;
  sectionId: string;
}

const DEFAULT_SECTIONS: SectionFormat[] = [
  { id: 's1', name: 'Part A', questionType: 'Short Answer', numberOfQuestions: 5, marksPerQuestion: 2, instructions: 'Answer all questions' },
  { id: 's2', name: 'Part B', questionType: 'Long Answer', numberOfQuestions: 3, marksPerQuestion: 5, instructions: 'Answer any 3 out of 5' },
  { id: 's3', name: 'Part C', questionType: 'Essay', numberOfQuestions: 2, marksPerQuestion: 10, instructions: 'Answer any 2 out of 3' },
];

// Custom event to notify paper builder of format changes
const dispatchFormatChange = (sections: SectionFormat[]) => {
  window.dispatchEvent(new CustomEvent('paper-format-changed', { detail: { sections } }));
};

const PaperFormatUploader: React.FC = () => {
  const [uploadedFormats, setUploadedFormats] = useState<UploadedFormat[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [useDefaultFormat, setUseDefaultFormat] = useState(true);
  const [activeFormat, setActiveFormat] = useState<UploadedFormat | null>(null);
  const [sections, setSections] = useState<SectionFormat[]>(DEFAULT_SECTIONS);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingFormat, setPendingFormat] = useState<UploadedFormat | null>(null);
  const [pendingAction, setPendingAction] = useState<'apply' | 'toggle' | 'reset' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved format from localStorage
  useEffect(() => {
    const savedFormat = localStorage.getItem('qgenesis-paper-format');
    const savedSections = localStorage.getItem('qgenesis-paper-sections');
    const savedQuestions = localStorage.getItem('qgenesis-paper-questions');
    const savedUseDefault = localStorage.getItem('qgenesis-use-default-format');
    
    if (savedFormat) {
      try {
        const format = JSON.parse(savedFormat);
        setActiveFormat({ id: 'saved', fileName: 'Saved Format', fileType: 'saved', uploadedAt: new Date(), status: 'ready', analysis: format });
      } catch {}
    }
    
    if (savedSections) {
      try {
        setSections(JSON.parse(savedSections));
      } catch {}
    }
    
    if (savedQuestions) {
      try {
        setQuestions(JSON.parse(savedQuestions));
      } catch {}
    }
    
    if (savedUseDefault !== null) {
      setUseDefaultFormat(savedUseDefault === 'true');
    }
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a PDF or image file (PNG, JPG)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size should be less than 10MB');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const newFormat: UploadedFormat = {
      id: `format_${Date.now()}`,
      fileName: file.name,
      fileType: file.type,
      uploadedAt: new Date(),
      status: 'analyzing',
    };

    setUploadedFormats(prev => [...prev, newFormat]);

    // Simulate upload and analysis progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    // Simulate analysis - auto-detect sections from uploaded paper
    setTimeout(() => {
      const detectedSections: SectionFormat[] = [
        { id: 's1', name: 'Section A - Short Questions', questionType: 'Short Answer', numberOfQuestions: 10, marksPerQuestion: 2, instructions: 'Answer ALL questions' },
        { id: 's2', name: 'Section B - Long Questions', questionType: 'Long Answer', numberOfQuestions: 5, marksPerQuestion: 8, instructions: 'Answer any FOUR questions' },
        { id: 's3', name: 'Section C - Essay', questionType: 'Essay', numberOfQuestions: 2, marksPerQuestion: 15, instructions: 'Answer any ONE question' },
      ];

      const analysis: FormatAnalysis = {
        headerStyle: 'Centered with Institution Logo',
        questionFormat: 'Section-based with sub-questions',
        sectionsDetected: 3,
        marksFormat: 'Marks indicated in brackets',
        logoPosition: 'Top Center',
        fontStyle: 'Times New Roman, 12pt',
        sections: detectedSections,
      };

      setUploadedFormats(prev =>
        prev.map(f =>
          f.id === newFormat.id
            ? { ...f, status: 'ready', analysis, isActive: true }
            : { ...f, isActive: false }
        )
      );

      // Auto-apply the detected format
      setSections(detectedSections);
      setUseDefaultFormat(false);
      localStorage.setItem('qgenesis-paper-sections', JSON.stringify(detectedSections));
      localStorage.setItem('qgenesis-paper-format', JSON.stringify(analysis));
      localStorage.setItem('qgenesis-use-default-format', 'false');
      dispatchFormatChange(detectedSections);
      
      setIsUploading(false);
      setUploadProgress(100);
      toast.success('Format analyzed and applied automatically!');
    }, 2500);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFormat = (id: string) => {
    setUploadedFormats(prev => prev.filter(f => f.id !== id));
    toast.success('Format removed');
  };

  const applyFormat = (format: UploadedFormat) => {
    if (format.status !== 'ready' || !format.analysis?.sections) return;
    
    // Check if there are existing sections with questions
    const hasExistingSections = sections.length > 0 && questions.length > 0;
    
    if (hasExistingSections) {
      setPendingFormat(format);
      setPendingAction('apply');
      setShowConfirmDialog(true);
    } else {
      executeApplyFormat(format);
    }
  };
  
  const executeApplyFormat = (format: UploadedFormat) => {
    if (!format.analysis?.sections) return;
    
    setSections(format.analysis.sections);
    setUseDefaultFormat(false);
    localStorage.setItem('qgenesis-paper-format', JSON.stringify(format.analysis));
    localStorage.setItem('qgenesis-paper-sections', JSON.stringify(format.analysis.sections));
    localStorage.setItem('qgenesis-use-default-format', 'false');
    dispatchFormatChange(format.analysis.sections);
    
    setUploadedFormats(prev => prev.map(f => ({ ...f, isActive: f.id === format.id })));
    toast.success('Format applied to paper builder');
  };

  const handleDefaultFormatToggle = (checked: boolean) => {
    if (checked) {
      // Check if there are existing sections with questions
      const hasExistingSections = sections.length > 0 && questions.length > 0;
      
      if (hasExistingSections) {
        setPendingAction('toggle');
        setShowConfirmDialog(true);
      } else {
        executeDefaultFormatToggle();
      }
    } else {
      setUseDefaultFormat(false);
      localStorage.setItem('qgenesis-use-default-format', 'false');
    }
  };
  
  const executeDefaultFormatToggle = () => {
    setUseDefaultFormat(true);
    localStorage.setItem('qgenesis-use-default-format', 'true');
    setSections(DEFAULT_SECTIONS);
    localStorage.setItem('qgenesis-paper-sections', JSON.stringify(DEFAULT_SECTIONS));
    setUploadedFormats(prev => prev.map(f => ({ ...f, isActive: false })));
    dispatchFormatChange(DEFAULT_SECTIONS);
    toast.success('Switched to default format');
  };

  const updateSection = (sectionId: string, updates: Partial<SectionFormat>) => {
    const newSections = sections.map(s => 
      s.id === sectionId ? { ...s, ...updates } : s
    );
    setSections(newSections);
    localStorage.setItem('qgenesis-paper-sections', JSON.stringify(newSections));
  };

  const addSection = () => {
    const newSection: SectionFormat = {
      id: `s${Date.now()}`,
      name: `Section ${String.fromCharCode(65 + sections.length)}`,
      questionType: 'Short Answer',
      numberOfQuestions: 5,
      marksPerQuestion: 2,
      instructions: 'Answer all questions',
    };
    const newSections = [...sections, newSection];
    setSections(newSections);
    localStorage.setItem('qgenesis-paper-sections', JSON.stringify(newSections));
    setEditingSectionId(newSection.id);
  };

  const deleteSection = (sectionId: string) => {
    const newSections = sections.filter(s => s.id !== sectionId);
    setSections(newSections);
    localStorage.setItem('qgenesis-paper-sections', JSON.stringify(newSections));
    setQuestions(prev => prev.filter(q => q.sectionId !== sectionId));
  };

  const addQuestion = (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;
    
    const newQuestion: Question = {
      id: `q${Date.now()}`,
      content: '',
      type: section.questionType,
      marks: section.marksPerQuestion,
      sectionId,
    };
    const newQuestions = [...questions, newQuestion];
    setQuestions(newQuestions);
    localStorage.setItem('qgenesis-paper-questions', JSON.stringify(newQuestions));
  };

  const updateQuestion = (questionId: string, updates: Partial<Question>) => {
    const newQuestions = questions.map(q => 
      q.id === questionId ? { ...q, ...updates } : q
    );
    setQuestions(newQuestions);
    localStorage.setItem('qgenesis-paper-questions', JSON.stringify(newQuestions));
  };

  const deleteQuestion = (questionId: string) => {
    const newQuestions = questions.filter(q => q.id !== questionId);
    setQuestions(newQuestions);
    localStorage.setItem('qgenesis-paper-questions', JSON.stringify(newQuestions));
  };

  const resetToDefault = () => {
    // Check if there are existing sections with questions
    const hasExistingSections = sections.length > 0 && questions.length > 0;
    
    if (hasExistingSections) {
      setPendingAction('reset');
      setShowConfirmDialog(true);
    } else {
      executeResetToDefault();
    }
  };
  
  const executeResetToDefault = () => {
    setSections(DEFAULT_SECTIONS);
    setQuestions([]);
    setUseDefaultFormat(true);
    localStorage.setItem('qgenesis-paper-sections', JSON.stringify(DEFAULT_SECTIONS));
    localStorage.setItem('qgenesis-paper-questions', JSON.stringify([]));
    localStorage.setItem('qgenesis-use-default-format', 'true');
    dispatchFormatChange(DEFAULT_SECTIONS);
    toast.success('Reset to default format');
  };
  
  const handleConfirmFormatChange = () => {
    if (pendingAction === 'apply' && pendingFormat) {
      executeApplyFormat(pendingFormat);
    } else if (pendingAction === 'toggle') {
      executeDefaultFormatToggle();
    } else if (pendingAction === 'reset') {
      executeResetToDefault();
    }
    
    setShowConfirmDialog(false);
    setPendingFormat(null);
    setPendingAction(null);
  };
  
  const handleCancelFormatChange = () => {
    setShowConfirmDialog(false);
    setPendingFormat(null);
    setPendingAction(null);
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layout className="w-5 h-5" />
                Question Paper Format
              </CardTitle>
              <CardDescription>
                Upload your institution's question paper format to analyze and replicate the structure
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={useDefaultFormat}
                  onCheckedChange={handleDefaultFormatToggle}
                />
                <Label className="text-sm">Use Default Format</Label>
              </div>
              <Button variant="outline" size="sm" onClick={resetToDefault}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload Area */}
          <div
            className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            {isUploading ? (
              <div className="space-y-4">
                <Scan className="w-12 h-12 mx-auto text-primary animate-pulse" />
                <p className="text-foreground font-medium">Analyzing format...</p>
                <Progress value={uploadProgress} className="w-48 mx-auto" />
              </div>
            ) : (
              <>
                <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-foreground font-medium mb-2">
                  Upload Question Paper Sample
                </p>
                <p className="text-sm text-muted-foreground">
                  PDF or Image files (PNG, JPG) up to 10MB - Format will be auto-applied
                </p>
              </>
            )}
          </div>

          {/* Uploaded Formats */}
          {uploadedFormats.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Analyzed Formats</p>
              {uploadedFormats.map((format) => (
                <motion.div
                  key={format.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-xl border ${format.isActive ? 'bg-primary/5 border-primary/30' : 'bg-muted/50 border-border'}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {format.fileType.includes('pdf') ? (
                        <FileText className="w-8 h-8 text-red-500" />
                      ) : (
                        <FileImage className="w-8 h-8 text-blue-500" />
                      )}
                      <div>
                        <p className="font-medium text-foreground">{format.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          Uploaded {new Date(format.uploadedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {format.isActive && (
                        <Badge variant="default" className="bg-primary">Active</Badge>
                      )}
                      <Badge
                        variant={
                          format.status === 'ready'
                            ? 'default'
                            : format.status === 'analyzing'
                            ? 'secondary'
                            : 'destructive'
                        }
                      >
                        {format.status === 'ready' && <Check className="w-3 h-3 mr-1" />}
                        {format.status === 'analyzing' && <Scan className="w-3 h-3 mr-1 animate-spin" />}
                        {format.status === 'error' && <AlertCircle className="w-3 h-3 mr-1" />}
                        {format.status}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFormat(format.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {format.status === 'ready' && format.analysis && !format.isActive && (
                    <Button 
                      className="w-full mt-3"
                      onClick={() => applyFormat(format)}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Apply This Format
                    </Button>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section Editor */}
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Edit3 className="w-5 h-5" />
                Paper Sections
              </CardTitle>
              <CardDescription>
                {useDefaultFormat ? 'Default format sections' : 'Custom format sections from uploaded paper'}
              </CardDescription>
            </div>
            <Button onClick={addSection} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Section
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {sections.map((section, index) => (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-muted/30 border border-border space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{index + 1}</Badge>
                  {editingSectionId === section.id ? (
                    <Input
                      value={section.name}
                      onChange={(e) => updateSection(section.id, { name: e.target.value })}
                      className="w-48"
                      autoFocus
                      onBlur={() => setEditingSectionId(null)}
                    />
                  ) : (
                    <h4 className="font-medium text-foreground">{section.name}</h4>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingSectionId(section.id)}
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => deleteSection(section.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Question Type</Label>
                  <Select
                    value={section.questionType}
                    onValueChange={(value) => updateSection(section.id, { questionType: value })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MCQ">MCQ</SelectItem>
                      <SelectItem value="Short Answer">Short Answer</SelectItem>
                      <SelectItem value="Long Answer">Long Answer</SelectItem>
                      <SelectItem value="Essay">Essay</SelectItem>
                      <SelectItem value="Descriptive">Descriptive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">No. of Questions</Label>
                  <Input
                    type="number"
                    min={1}
                    value={section.numberOfQuestions}
                    onChange={(e) => updateSection(section.id, { numberOfQuestions: parseInt(e.target.value) || 1 })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Marks per Question</Label>
                  <Input
                    type="number"
                    min={1}
                    value={section.marksPerQuestion}
                    onChange={(e) => updateSection(section.id, { marksPerQuestion: parseInt(e.target.value) || 1 })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Total Marks</Label>
                  <div className="h-9 flex items-center px-3 bg-background rounded-md border border-input text-sm font-medium">
                    {section.numberOfQuestions * section.marksPerQuestion}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Instructions</Label>
                <Input
                  value={section.instructions || ''}
                  onChange={(e) => updateSection(section.id, { instructions: e.target.value })}
                  placeholder="e.g., Answer all questions"
                  className="h-9"
                />
              </div>

              {/* Questions for this section */}
              <div className="pt-3 border-t border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs text-muted-foreground">
                    Questions ({questions.filter(q => q.sectionId === section.id).length}/{section.numberOfQuestions})
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => addQuestion(section.id)}
                    disabled={questions.filter(q => q.sectionId === section.id).length >= section.numberOfQuestions}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {questions
                    .filter(q => q.sectionId === section.id)
                    .map((question, qIndex) => (
                      <div key={question.id} className="flex items-start gap-2 p-2 rounded bg-background border border-border/50">
                        <span className="text-xs text-muted-foreground mt-2 w-6">{qIndex + 1}.</span>
                        <Input
                          value={question.content}
                          onChange={(e) => updateQuestion(question.id, { content: e.target.value })}
                          placeholder="Enter question..."
                          className="flex-1 h-8 text-sm"
                        />
                        <Badge variant="outline" className="mt-1">{question.marks}m</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => deleteQuestion(question.id)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                </div>
              </div>
            </motion.div>
          ))}

          {/* Total Marks Summary */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
            <span className="font-medium text-foreground">Total Marks</span>
            <span className="text-2xl font-bold text-primary">
              {sections.reduce((sum, s) => sum + (s.numberOfQuestions * s.marksPerQuestion), 0)}
            </span>
          </div>
        </CardContent>
      </Card>
      
      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Paper Format?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear your existing sections and questions in the paper builder. 
              All changes made to the current paper structure will be lost. 
              Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelFormatChange}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmFormatChange}>
              Apply New Format
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PaperFormatUploader;