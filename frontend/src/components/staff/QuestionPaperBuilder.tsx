import React, { useState, useRef } from 'react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, FileText, Settings, Eye, Printer, Download, Send, 
  Trash2, Edit, History, RotateCcw, GripVertical, Copy,
  ChevronDown, ChevronRight, Palette, Type, X, Check, Database,
  Lock, ShieldAlert, Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useQuestionStore } from '@/stores/questionStore';
import { useQuestionPaperStore, QuestionPaper, PaperSection, PaperQuestion } from '@/stores/questionPaperStore';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import PaperEditor from './paper-builder/PaperEditor';
import PaperPreview, { WatermarkConfig } from './paper-builder/PaperPreview';
import PaperHistory from './paper-builder/PaperHistory';
import QuestionSourcePanel from './paper-builder/QuestionSourcePanel';
import QuestionBank from './paper-builder/QuestionBank';
import PrintablePaper from './paper-builder/PrintablePaper';
import WatermarkSettings from './paper-builder/WatermarkSettings';
import PaperFormatUploader from './PaperFormatUploader';
import LockedOverlay from '@/components/common/LockedOverlay';
import { firestorePaperService, firestoreUserActivityService } from '@/services/firebase/firestore-database';
import { firestoreStorageService, STORAGE_PATHS } from '@/services/firebase/firestore-storage';
import { isFirebaseConfigured } from '@/services/firebase/firestore-config';
import { generatePaperPdfBlob } from '@/services/paperPdfService';

const QuestionPaperBuilder: React.FC = () => {
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { examTypes, questions, materials, addNotification: addStoreNotification } = useQuestionStore();
  const { 
    papers, deletedPapers, deletedPaperIds, activePaperId, 
    createPaper, updatePaper, deletePaper, setActivePaper,
    deleteAllPapers, undoDeletePaper, undoAllDeletedPapers, clearDeletedPapers,
    sendPaperForApproval, submitPaperToHod, addSecurityHistoryEntry
  } = useQuestionPaperStore();
  
  const [activeTab, setActiveTab] = useState('builder');
  const [selectedExamType, setSelectedExamType] = useState<string>('all');
  const [showNewPaperDialog, setShowNewPaperDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [paperToDelete, setPaperToDelete] = useState<QuestionPaper | null>(null);
  const [showWatermarkSettings, setShowWatermarkSettings] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isSubmittingToHod, setIsSubmittingToHod] = useState(false);
  
  // Watermark state
  const [watermarkConfig, setWatermarkConfig] = useState<WatermarkConfig>({
    enabled: false,
    type: 'draft',
    customText: '',
    opacity: 25,
    position: 'diagonal',
    fontSize: 'large',
  });
  
  // New paper form state
  const [newPaperForm, setNewPaperForm] = useState({
    title: '',
    examType: '',
    collegeName: 'PSG COLLEGE OF TECHNOLOGY',
    departmentName: 'Department of Computer Applications',
    courseName: '',
    courseCode: '',
    semester: '',
    duration: '1 hour 30 min',
    maxMarks: 50,
    instructions: ['Answer ALL questions. Each question carries 25 Marks.', 'Subdivision (a) carries 3 marks, subdivision (b) carries 10 marks and subdivision (c) carries 12 marks.'],
    paperColor: '#ffffff',
    textColor: '#000000',
  });
  
  // Role-based access: staff see only their own papers; never show deleted (avoids re-add from sync)
  const deletedSet = new Set(deletedPaperIds ?? []);
  const myPapers = (user?.role === 'staff' && user?.id
    ? papers.filter(p => p.staffId === user.id)
    : papers
  ).filter(p => !deletedSet.has(p.id));
  // Builder section: everything except submitted (submitted is the only view-only state).
  const builderPapers = myPapers.filter(p => p.status !== 'submitted');
  const filteredPapers = selectedExamType === 'all'
    ? builderPapers
    : builderPapers.filter(p => p.examType === selectedExamType);
  const submittedPapersList = myPapers.filter(p => p.status === 'submitted');
  const filteredSubmittedPapers = selectedExamType === 'all'
    ? submittedPapersList
    : submittedPapersList.filter(p => p.examType === selectedExamType);
  const activePaper = myPapers.find(p => p.id === activePaperId);
  
  const handleCreatePaper = () => {
    if (!newPaperForm.title || !newPaperForm.examType) {
      toast.error('Please fill in required fields');
      return;
    }
    
    // ACCESS CONTROL: Validate department, institution, and place are set
    if (!user?.department || !user?.institution || !user?.place) {
      toast.error('Your department, institution, or place is not set. Please update your profile.');
      return;
    }
    
    const id = createPaper({
      ...newPaperForm,
      courseOutcomes: [],
      coMapping: {},
      // ACCESS CONTROL: Always set department, institution, and place from logged-in user
      department: user.department,
      institution: user.institution,
      place: user.place,
      staffId: user.id,
    });

    // Persist draft to Firestore so paper exists in papers collection (owned by this staff)
    if (isFirebaseConfigured()) {
      const draftForFirestore = {
        title: newPaperForm.title,
        examType: newPaperForm.examType,
        collegeName: newPaperForm.collegeName,
        departmentName: newPaperForm.departmentName,
        courseName: newPaperForm.courseName,
        courseCode: newPaperForm.courseCode,
        semester: newPaperForm.semester,
        duration: newPaperForm.duration,
        maxMarks: newPaperForm.maxMarks,
        date: newPaperForm.date,
        instructions: newPaperForm.instructions,
        courseOutcomes: [],
        coMapping: {},
        sections: [],
        paperColor: newPaperForm.paperColor,
        textColor: newPaperForm.textColor,
        status: 'draft' as const,
        staffId: user.id,
        staffName: user?.displayName,
        department: user.department,
        institution: user.institution,
        place: user.place,
      };
      firestorePaperService.createWithId(id, draftForFirestore).catch((err) => {
        console.error('[QuestionPaperBuilder] Failed to save draft to cloud:', err);
        toast.error('Paper created locally; could not save to cloud.');
      });
    }
    
    setShowNewPaperDialog(false);
    setNewPaperForm({
      title: '',
      examType: '',
      collegeName: 'PSG COLLEGE OF TECHNOLOGY',
      departmentName: 'Department of Computer Applications',
      courseName: '',
      courseCode: '',
      semester: '',
      duration: '1 hour 30 min',
      maxMarks: 50,
      instructions: ['Answer ALL questions. Each question carries 25 Marks.'],
      paperColor: '#ffffff',
      textColor: '#000000',
    });
    toast.success('Question paper created');
  };
  
  const handleSendForApproval = () => {
    if (!activePaper) return;

    if (!activePaper.department || !(activePaper as any).institution || !(activePaper as any).place) {
      toast.error('Paper scope missing. Please ensure Department/Institution/Place are set in your profile and paper.');
      return;
    }
    
    sendPaperForApproval(activePaper.id);
    
    // Add security history entry for locking
    addSecurityHistoryEntry({
      action: 'locked',
      itemType: 'paper',
      itemId: activePaper.id,
      itemTitle: activePaper.title,
      performedBy: user?.displayName || 'Staff',
      performedByRole: 'staff',
      reason: 'Sent for approval',
      department: activePaper.department,
      institution: (activePaper as any).institution,
      place: (activePaper as any).place,
    });
    
    addStoreNotification({
      type: 'request',
      title: 'Question Paper Approval Request',
      message: `Question paper "${activePaper.title}" has been sent for approval by ${user?.displayName || 'Staff'}`,
      fromRole: 'staff',
      toRole: 'hod',
      department: activePaper.department,
      institution: (activePaper as any).institution,
      place: (activePaper as any).place,
    });
    toast.success('Question paper sent to HOD for approval & locked immediately', {
      description: '⚠️ Note: Only 2 edit approvals are allowed from HOD. Once the 2/2 limit is reached, HOD will no longer approve unlock requests. You will only be able to submit the paper and view it in the Papers section.',
      duration: 8000,
    });
  };

  const handleSubmitToHod = async () => {
    if (!activePaper) return;

    if (!activePaper.department || !(activePaper as any).institution || !(activePaper as any).place) {
      toast.error('Paper scope missing. Please ensure Department/Institution/Place are set in your profile and paper.');
      return;
    }

    // Lock immediately so there's no "unlock then lock" flicker during async work
    submitPaperToHod(activePaper.id, user?.displayName ?? undefined);

    setIsSubmittingToHod(true);
    try {
      let pdfUrl: string | undefined;

      if (isFirebaseConfigured()) {
        // 1. Generate PDF from preview (same layout, colors, alignment)
        const container = document.getElementById('printable-paper-container');
        if (container) {
          try {
            const blob = await generatePaperPdfBlob(container);
            const file = new File([blob], 'question-paper.pdf', { type: 'application/pdf' });
            const path = STORAGE_PATHS.paperPdf(activePaper.id);
            const result = await firestoreStorageService.uploadFile(path, file);
            if (result.success && result.url) pdfUrl = result.url;
          } catch (e) {
            console.error('[QuestionPaperBuilder] PDF generation or upload failed:', e);
            toast.error('PDF could not be generated. Paper will still be saved.');
          }
        }

        // 2. Save paper to Firestore (papers collection)
        const firestorePaper = {
          title: activePaper.title,
          examType: activePaper.examType,
          collegeName: activePaper.collegeName,
          departmentName: activePaper.departmentName,
          courseName: activePaper.courseName,
          courseCode: activePaper.courseCode,
          semester: activePaper.semester,
          duration: activePaper.duration,
          maxMarks: activePaper.maxMarks,
          date: activePaper.date,
          instructions: activePaper.instructions,
          courseOutcomes: activePaper.courseOutcomes,
          coMapping: activePaper.coMapping,
          sections: activePaper.sections,
          paperColor: activePaper.paperColor,
          textColor: activePaper.textColor,
          status: 'submitted' as const,
          staffId: activePaper.staffId ?? user?.id,
          staffName: user?.displayName ?? activePaper.staffName,
          department: activePaper.department,
          institution: activePaper.institution,
          place: activePaper.place,
          isLocked: true,
          lockedAt: new Date(),
          submittedAt: new Date(),
          pdfUrl,
        };
        await firestorePaperService.createWithId(activePaper.id, firestorePaper);
      }

      if (isFirebaseConfigured() && user?.id) {
        firestoreUserActivityService.create({
          userId: user.id,
          userName: user.displayName ?? 'Staff',
          email: user.email,
          role: user.role,
          action: 'paper_submitted',
          timestamp: new Date(),
        }).catch(() => {});
      }
      addStoreNotification({
        type: 'request',
        title: 'Question Paper Submitted',
        message: `Question paper "${activePaper.title}" has been finalized and submitted by ${user?.displayName || 'Staff'}`,
        fromRole: 'staff',
        toRole: 'hod',
        department: activePaper.department,
        institution: (activePaper as any).institution,
        place: (activePaper as any).place,
      });
      setShowPreview(false);
      setShowSubmitConfirm(false);
      setActivePaper(null);
      setActiveTab('papers');
      toast.success(
        isFirebaseConfigured()
          ? 'Question paper saved to cloud, PDF generated, and submitted to HOD.'
          : 'Question paper submitted to HOD and locked. You can view it in the Papers tab.'
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit paper.');
    } finally {
      setIsSubmittingToHod(false);
    }
  };
  
  const handlePrint = () => {
    if (!activePaper) return;
    
    // Check if locked
    if (activePaper.isLocked) {
      toast.error('This paper is locked. Request unlock from HOD to print again.');
      return;
    }
    
    setIsPrinting(true);
    
    // Wait for state to update, then print
    setTimeout(() => {
      const printContent = document.getElementById('printable-paper-container');
      if (printContent) {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>${activePaper.title} - Question Paper</title>
              <style>
                @page {
                  size: A4;
                  margin: 15mm;
                }
                * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
                }
                body {
                  font-family: 'Times New Roman', Times, serif;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  color-adjust: exact !important;
                }
                @media print {
                  body {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    color-adjust: exact !important;
                  }
                }
              </style>
            </head>
            <body>
              ${printContent.innerHTML}
            </body>
            </html>
          `);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
            setIsPrinting(false);
            
            // Lock the paper after printing
            updatePaper(activePaper.id, {
              isLocked: true,
              lockedAt: new Date(),
              printedAt: new Date(),
              status: 'print-ready'
            });
            
            toast.success('Paper printed and locked for security', {
              description: 'Request unlock from HOD if you need to modify or reprint.',
              icon: <Lock className="h-4 w-4" />
            });
          }, 250);
        }
      }
    }, 100);
  };
  
  const handleExportPDF = () => {
    if (!activePaper) return;
    
    // Check if locked
    if (activePaper.isLocked) {
      toast.error('This paper is locked. Request unlock from HOD to export.');
      return;
    }
    
    toast.info('Opening print dialog - save as PDF');
    handlePrint();
  };
  
  const handleDeleteAll = () => {
    deleteAllPapers();
    setShowDeleteAllDialog(false);
    toast.success('All question papers removed from this device and the cloud.');
  };

  const handleConfirmDeletePaper = () => {
    if (paperToDelete) {
      deletePaper(paperToDelete.id);
      setPaperToDelete(null);
      toast.success('Paper removed from everywhere it was stored.');
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Hidden Printable Paper */}
      {activePaper && (
        <div 
          id="printable-paper-container" 
          className="fixed left-[-9999px] top-0"
          style={{ width: '210mm' }}
        >
          <PrintablePaper paper={activePaper} />
        </div>
      )}
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Question Paper Builder</h1>
          <p className="text-muted-foreground">Build, customize and manage exam question papers</p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedExamType} onValueChange={setSelectedExamType}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Exam Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {examTypes.filter(e => e.isActive).map(type => (
                <SelectItem key={type.id} value={type.code}>{type.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button onClick={() => setShowNewPaperDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Paper
          </Button>
        </div>
      </div>
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 lg:w-[600px] h-auto">
          <TabsTrigger value="builder" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Builder
          </TabsTrigger>
          <TabsTrigger value="format" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Format
          </TabsTrigger>
          <TabsTrigger value="bank" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Bank
          </TabsTrigger>
          <TabsTrigger value="papers" className="flex items-center gap-2">
            <Copy className="h-4 w-4" />
            Papers ({filteredPapers.length + filteredSubmittedPapers.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History ({deletedPapers.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="builder" className="mt-6">
          {activePaper && activePaper.status === 'submitted' ? (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground mb-2">This paper is {activePaper.status}. It is view-only and cannot be edited here.</p>
              <Button onClick={() => { setShowPreview(true); }} variant="outline" className="mr-2">Preview</Button>
              <Button onClick={() => setActiveTab('papers')}>Open in Papers</Button>
            </Card>
          ) : activePaper ? (
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
              {/* Question Source Panel */}
              <div id="question-source-panel" className="xl:col-span-1">
                <QuestionSourcePanel paperId={activePaper.id} />
              </div>
              
              {/* Paper Editor */}
              <div className="xl:col-span-3 relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{activePaper.examType}</Badge>
                    <span className="font-medium">{activePaper.title}</span>
                    <Badge variant={
                      activePaper.status === 'approved' ? 'default' :
                      activePaper.status === 'pending' ? 'secondary' :
                      activePaper.status === 'rejected' ? 'destructive' :
                      activePaper.status === 'print-ready' ? 'default' : 'outline'
                    } className={activePaper.status === 'print-ready' ? 'bg-green-500' : ''}>
                      {activePaper.status}
                    </Badge>
                    {activePaper.isLocked && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 border border-red-500/30"
                      >
                        <Lock className="h-3 w-3 text-red-500" />
                        <span className="text-xs text-red-500 font-medium">Locked</span>
                      </motion.div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowWatermarkSettings(true)} disabled={activePaper.isLocked}>
                      <Palette className="h-4 w-4 mr-2" />
                      Watermark
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowPreview(true)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handlePrint} 
                      disabled={isPrinting || activePaper.isLocked}
                      className={activePaper.isLocked ? 'opacity-50' : ''}
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      {isPrinting ? 'Printing...' : 'Print'}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleExportPDF} 
                      disabled={isPrinting || activePaper.isLocked}
                      className={activePaper.isLocked ? 'opacity-50' : ''}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                    <Button size="sm" onClick={handleSendForApproval} disabled={activePaper.isLocked || activePaper.status === 'submitted'}>
                      <Send className="h-4 w-4 mr-2" />
                      Send for Approval
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => {
                        setShowPreview(true);
                      }} 
                      disabled={activePaper.isLocked || activePaper.status === 'submitted'}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Submit to HOD
                    </Button>
                  </div>
                </div>
                
                {/* Locked Overlay */}
                <div className="relative">
                  <AnimatePresence>
                    {activePaper.isLocked && (
                      <LockedOverlay
                        isLocked={true}
                        itemType="paper"
                        itemId={activePaper.id}
                        itemTitle={activePaper.title}
                        hasPendingRequest={activePaper.hasUnlockRequest}
                        onRequestUnlock={(reason) => {
                          if (!activePaper.department || !(activePaper as any).institution || !(activePaper as any).place) {
                            toast.error('Paper scope missing. Set Department/Institution/Place before requesting unlock.');
                            return;
                          }
                          updatePaper(activePaper.id, { hasUnlockRequest: true, unlockRequestReason: reason });
                          
                          // Add to security history
                          addSecurityHistoryEntry({
                            action: 'unlock_requested',
                            itemType: 'paper',
                            itemId: activePaper.id,
                            itemTitle: activePaper.title,
                            performedBy: user?.displayName || 'Staff',
                            performedByRole: 'staff',
                            reason: reason,
                            department: activePaper.department,
                            institution: (activePaper as any).institution,
                            place: (activePaper as any).place,
                          });
                          
                          addStoreNotification({
                            type: 'request',
                            title: 'Unlock Request: Question Paper',
                            message: reason,
                            paperId: activePaper.id,
                            fromRole: 'staff',
                            toRole: 'hod',
                            department: activePaper.department,
                            institution: (activePaper as any).institution,
                            place: (activePaper as any).place,
                            staffId: user?.id,
                          });
                        }}
                        onResendRequest={() => {
                          if (!activePaper.department || !(activePaper as any).institution || !(activePaper as any).place) {
                            toast.error('Paper scope missing. Set Department/Institution/Place before resending unlock request.');
                            return;
                          }
                          // Resend the unlock request notification
                          addStoreNotification({
                            type: 'request',
                            title: 'Unlock Request: Question Paper (Resent)',
                            message: activePaper.unlockRequestReason || 'Request resent - original reason unavailable',
                            paperId: activePaper.id,
                            fromRole: 'staff',
                            toRole: 'hod',
                            department: activePaper.department,
                            institution: (activePaper as any).institution,
                            place: (activePaper as any).place,
                            staffId: user?.id,
                          });
                        }}
                      />
                    )}
                  </AnimatePresence>
                  <PaperEditor
                    paper={activePaper}
                    onOpenQuestionSource={() => {
                      setActiveTab('builder');
                      setTimeout(() => {
                        document.getElementById('question-source-panel')?.scrollIntoView({
                          behavior: 'smooth',
                          block: 'start',
                        });
                      }, 0);
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Paper Selected</h3>
                <p className="text-muted-foreground mb-4">
                  Create a new question paper or select one from the Papers tab
                </p>
                <Button onClick={() => setShowNewPaperDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Paper
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="format" className="mt-6">
          <PaperFormatUploader />
        </TabsContent>
        
        <TabsContent value="bank" className="mt-6">
          <QuestionBank />
        </TabsContent>
        
        <TabsContent value="papers" className="mt-6">
          <div className="space-y-4">
            {(filteredPapers.length > 0 || filteredSubmittedPapers.length > 0) && (
              <div className="flex justify-end">
                <Button variant="destructive" size="sm" onClick={() => setShowDeleteAllDialog(true)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete All
                </Button>
              </div>
            )}

            {filteredPapers.length === 0 ? (
              filteredSubmittedPapers.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-16 text-center">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Question Papers</h3>
                    <p className="text-muted-foreground mb-4">
                      Create your first question paper to get started
                    </p>
                    <Button onClick={() => setShowNewPaperDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Paper
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex items-center gap-2 py-2">
                  <p className="text-sm text-muted-foreground">No draft or pending papers.</p>
                  <Button variant="outline" size="sm" onClick={() => setShowNewPaperDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Paper
                  </Button>
                </div>
              )
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPapers.map((paper) => (
                  <motion.div
                    key={paper.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group"
                  >
                    <Card className={`cursor-pointer transition-all hover:shadow-md ${activePaperId === paper.id ? 'ring-2 ring-primary' : ''}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base">{paper.title}</CardTitle>
                            <CardDescription>{paper.courseName} - {paper.courseCode}</CardDescription>
                          </div>
                          <Badge variant={paper.status === 'pending' ? 'secondary' : paper.status === 'rejected' ? 'destructive' : 'outline'}>
                            {paper.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                          <span>{paper.examType}</span>
                          <span>{paper.maxMarks} Marks</span>
                          <span>{paper.duration}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              setActivePaper(paper.id);
                              setActiveTab('builder');
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPaperToDelete(paper);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}

            {filteredSubmittedPapers.length > 0 && (
              <>
                <h3 className="text-sm font-medium text-muted-foreground pt-4">Submitted papers</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSubmittedPapers.map((paper) => (
                    <motion.div
                      key={paper.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group"
                    >
                      <Card className={`transition-all hover:shadow-md ${activePaperId === paper.id ? 'ring-2 ring-primary' : ''}`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-base">{paper.title}</CardTitle>
                              <CardDescription>{paper.courseName} - {paper.courseCode}</CardDescription>
                            </div>
                            <Badge className={paper.status === 'approved' ? 'bg-green-600' : 'bg-blue-500'}>{paper.status === 'approved' ? 'approved' : 'submitted'}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                            <span>{paper.examType}</span>
                            <span>{paper.maxMarks} Marks</span>
                            <span>{paper.duration}</span>
                          </div>
                          {paper.submittedAt && (
                            <p className="text-xs text-muted-foreground mb-2">
                              Submitted: {format(new Date(paper.submittedAt), 'MMM dd, yyyy HH:mm')}
                            </p>
                          )}
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => {
                                setActivePaper(paper.id);
                                setShowPreview(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Only
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPaperToDelete(paper);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="history" className="mt-6">
          <PaperHistory />
        </TabsContent>
      </Tabs>
      
      {/* New Paper Dialog */}
      <Dialog open={showNewPaperDialog} onOpenChange={setShowNewPaperDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Question Paper</DialogTitle>
            <DialogDescription>Set up the basic details for your question paper</DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2">
              <Label>Paper Title *</Label>
              <Input
                placeholder="e.g., Cloud Computing CA-II"
                value={newPaperForm.title}
                onChange={(e) => setNewPaperForm({ ...newPaperForm, title: e.target.value })}
              />
            </div>
            
            <div>
              <Label>Exam Type *</Label>
              <Select 
                value={newPaperForm.examType} 
                onValueChange={(v) => setNewPaperForm({ ...newPaperForm, examType: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select exam type" />
                </SelectTrigger>
                <SelectContent>
                  {examTypes.filter(e => e.isActive).map(type => (
                    <SelectItem key={type.id} value={type.code}>{type.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Semester</Label>
              <Input
                placeholder="e.g., 3"
                value={newPaperForm.semester}
                onChange={(e) => setNewPaperForm({ ...newPaperForm, semester: e.target.value })}
              />
            </div>
            
            <div>
              <Label>College Name</Label>
              <Input
                value={newPaperForm.collegeName}
                onChange={(e) => setNewPaperForm({ ...newPaperForm, collegeName: e.target.value })}
              />
            </div>
            
            <div>
              <Label>Department Name</Label>
              <Input
                value={newPaperForm.departmentName}
                onChange={(e) => setNewPaperForm({ ...newPaperForm, departmentName: e.target.value })}
              />
            </div>
            
            <div>
              <Label>Course Name</Label>
              <Input
                placeholder="e.g., Cloud Computing"
                value={newPaperForm.courseName}
                onChange={(e) => setNewPaperForm({ ...newPaperForm, courseName: e.target.value })}
              />
            </div>
            
            <div>
              <Label>Course Code</Label>
              <Input
                placeholder="e.g., 23MX31"
                value={newPaperForm.courseCode}
                onChange={(e) => setNewPaperForm({ ...newPaperForm, courseCode: e.target.value })}
              />
            </div>
            
            <div>
              <Label>Duration</Label>
              <Input
                placeholder="e.g., 1 hour 30 min"
                value={newPaperForm.duration}
                onChange={(e) => setNewPaperForm({ ...newPaperForm, duration: e.target.value })}
              />
            </div>
            
            <div>
              <Label>Maximum Marks</Label>
              <Input
                type="number"
                value={newPaperForm.maxMarks}
                onChange={(e) => setNewPaperForm({ ...newPaperForm, maxMarks: Number(e.target.value) })}
              />
            </div>
            
            <div className="col-span-2">
              <Label className="flex items-center gap-2">
                <Palette className="h-4 w-4" /> Paper Color
              </Label>
              <div className="flex items-center gap-2 mt-1 p-2 rounded-md bg-background border border-input">
                <input
                  type="color"
                  value={newPaperForm.paperColor}
                  onChange={(e) => setNewPaperForm({ ...newPaperForm, paperColor: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer border-2 border-input bg-background"
                />
                <Input
                  value={newPaperForm.paperColor}
                  onChange={(e) => setNewPaperForm({ ...newPaperForm, paperColor: e.target.value })}
                  className="flex-1 bg-background text-foreground"
                />
              </div>
            </div>
            
            <div className="col-span-2">
              <Label className="flex items-center gap-2">
                <Type className="h-4 w-4" /> Text Color
              </Label>
              <div className="flex items-center gap-2 mt-1 p-2 rounded-md bg-background border border-input">
                <input
                  type="color"
                  value={newPaperForm.textColor}
                  onChange={(e) => setNewPaperForm({ ...newPaperForm, textColor: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer border-2 border-input bg-background"
                />
                <Input
                  value={newPaperForm.textColor}
                  onChange={(e) => setNewPaperForm({ ...newPaperForm, textColor: e.target.value })}
                  className="flex-1 bg-background text-foreground"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewPaperDialog(false)}>Cancel</Button>
            <Button onClick={handleCreatePaper}>Create Paper</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Preview Dialog - removed Print and PDF buttons to avoid accidental clicks */}
      {activePaper && (
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-0">
            <DialogHeader className="p-4 border-b">
              <DialogTitle>Paper Preview {watermarkConfig.enabled && `(Watermark: ${watermarkConfig.type === 'custom' ? watermarkConfig.customText : watermarkConfig.type.toUpperCase()})`}</DialogTitle>
            </DialogHeader>
            <div className="p-4">
              <div className="relative">
                {/* Submitted papers: view-only, no overlay. Pending/print-ready locked: show overlay for unlock request. */}
                <AnimatePresence>
                  {activePaper.isLocked && activePaper.status !== 'submitted' && (
                    <LockedOverlay
                      isLocked={true}
                      itemType="paper"
                      itemId={activePaper.id}
                      itemTitle={activePaper.title}
                      hasPendingRequest={activePaper.hasUnlockRequest}
                      onRequestUnlock={(reason) => {
                        if (!activePaper.department || !(activePaper as any).institution || !(activePaper as any).place) {
                          toast.error('Paper scope missing. Set Department/Institution/Place before requesting unlock.');
                          return;
                        }
                        updatePaper(activePaper.id, { hasUnlockRequest: true, unlockRequestReason: reason });
                        addSecurityHistoryEntry({
                          action: 'unlock_requested',
                          itemType: 'paper',
                          itemId: activePaper.id,
                          itemTitle: activePaper.title,
                          performedBy: user?.displayName || 'Staff',
                          performedByRole: 'staff',
                          reason: reason,
                          department: activePaper.department,
                          institution: (activePaper as any).institution,
                          place: (activePaper as any).place,
                        });
                        addStoreNotification({
                          type: 'request',
                          title: 'Unlock Request: Question Paper',
                          message: reason,
                          paperId: activePaper.id,
                          fromRole: 'staff',
                          toRole: 'hod',
                          department: activePaper.department,
                          institution: (activePaper as any).institution,
                          place: (activePaper as any).place,
                          staffId: user?.id,
                        });
                      }}
                      onResendRequest={() => {
                        if (!activePaper.department || !(activePaper as any).institution || !(activePaper as any).place) {
                          toast.error('Paper scope missing. Set Department/Institution/Place before resending unlock request.');
                          return;
                        }
                        addStoreNotification({
                          type: 'request',
                          title: 'Unlock Request: Question Paper (Resent)',
                          message: activePaper.unlockRequestReason || 'Request resent - original reason unavailable',
                          paperId: activePaper.id,
                          fromRole: 'staff',
                          toRole: 'hod',
                          department: activePaper.department,
                          institution: (activePaper as any).institution,
                          place: (activePaper as any).place,
                          staffId: user?.id,
                        });
                      }}
                    />
                  )}
                </AnimatePresence>
                <PaperPreview paper={activePaper} watermark={watermarkConfig} />
              </div>
              {activePaper.status === 'submitted' && (
                <p className="text-sm text-muted-foreground text-center py-2 border-t">View only — submitted to HOD</p>
              )}
            </div>
            {activePaper.status === 'submitted' ? (
              <div className="p-4 border-t flex justify-end">
                <Button variant="outline" onClick={() => setShowPreview(false)}>Close</Button>
              </div>
            ) : !activePaper.isLocked && (
              <div className="p-4 border-t flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowPreview(false)}>Close</Button>
                <Button 
                  onClick={() => setShowSubmitConfirm(true)}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Submit to HOD
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Watermark Settings Dialog */}
      <Dialog open={showWatermarkSettings} onOpenChange={setShowWatermarkSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Watermark Settings</DialogTitle>
            <DialogDescription>
              Add watermarks like DRAFT, CONFIDENTIAL, or APPROVED to your question paper
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <WatermarkSettings config={watermarkConfig} onChange={setWatermarkConfig} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWatermarkSettings(false)}>
              Close
            </Button>
            <Button onClick={() => { setShowWatermarkSettings(false); setShowPreview(true); }}>
              Preview with Watermark
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete single paper Confirmation */}
      <AlertDialog open={!!paperToDelete} onOpenChange={(open) => !open && setPaperToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this question paper?</AlertDialogTitle>
            <AlertDialogDescription>
              This paper will be removed from everywhere it is stored, including the cloud (Firestore). This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeletePaper} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Confirmation */}
      <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all question papers?</AlertDialogTitle>
            <AlertDialogDescription>
              All papers will be removed from everywhere they are stored, including the cloud (Firestore). This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Submit to HOD Confirmation */}
      <AlertDialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Question Paper to HOD?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Once submitted, this question paper will be <strong className="text-foreground">locked permanently</strong> and you will 
                  <strong className="text-foreground"> not be able to edit</strong> it anymore. The paper will be sent to your HOD for review.
                </p>
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <p className="text-amber-600 dark:text-amber-400 font-medium text-xs">
                    ⚠️ Important: Only 2 edit approvals are allowed from HOD. Once the 2/2 limit is reached, 
                    HOD will no longer approve your unlock request to edit. You can only submit the paper and 
                    view it for reference in the Papers section.
                  </p>
                </div>
                <p>Please make sure the preview looks correct before confirming.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmittingToHod}>Go Back & Check</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleSubmitToHod()}
              disabled={isSubmittingToHod}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              {isSubmittingToHod && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isSubmittingToHod ? 'Saving PDF & submitting…' : 'Confirm & Submit'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default QuestionPaperBuilder;
