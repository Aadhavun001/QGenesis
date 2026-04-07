import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  Eye,
  Send,
  Printer,
  Edit3,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useQuestionPaperStore, QuestionPaper } from '@/stores/questionPaperStore';
import { useQuestionStore } from '@/stores/questionStore';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import PaperPreview from '@/components/staff/paper-builder/PaperPreview';

const PaperReview: React.FC = () => {
  const { user } = useAuth();
  const { papers, updatePaper } = useQuestionPaperStore();
  const { addNotification } = useQuestionStore();
  
  const [selectedPaper, setSelectedPaper] = useState<QuestionPaper | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [feedback, setFeedback] = useState('');

  // Filter papers by department/institution/place for HOD (staff submit with status 'submitted')
  const hodDepartment = user?.department;
  const hodInstitution = (user as any)?.institution;
  const hodPlace = (user as any)?.place;
  const pendingPapers = papers.filter(p => {
    const departmentMatch = !hodDepartment || !p.department || p.department === hodDepartment;
    const institutionMatch = !hodInstitution || !(p as any).institution || (p as any).institution === hodInstitution;
    const placeMatch = !hodPlace || !(p as any).place || (p as any).place === hodPlace;
    // Staff submit to HOD with status 'submitted'; treat as pending review (legacy: also allow 'pending')
    const statusMatch = p.status === 'submitted' || p.status === 'pending';
    return statusMatch && departmentMatch && institutionMatch && placeMatch;
  });

  const approvedPapers = papers.filter(p => {
    const departmentMatch = !hodDepartment || !p.department || p.department === hodDepartment;
    const institutionMatch = !hodInstitution || !(p as any).institution || (p as any).institution === hodInstitution;
    const placeMatch = !hodPlace || !(p as any).place || (p as any).place === hodPlace;
    return (p.status === 'approved' || p.status === 'print-ready') && departmentMatch && institutionMatch && placeMatch;
  });

  const handleApprovePaper = (paper: QuestionPaper) => {
    updatePaper(paper.id, { status: 'approved' });
    addNotification({
      type: 'approval',
      title: 'Question Paper Approved',
      message: `Your question paper "${paper.title}" has been approved by HOD`,
      paperId: paper.id,
      fromRole: 'hod',
      toRole: 'staff',
      department: paper.department,
    });
    toast.success('Paper approved successfully');
  };

  const handleMarkPrintReady = (paper: QuestionPaper) => {
    updatePaper(paper.id, { status: 'print-ready' });
    addNotification({
      type: 'print-ready',
      title: 'Paper Ready for Print',
      message: `Your question paper "${paper.title}" is ready for printing. Please proceed with printing for the exam.`,
      paperId: paper.id,
      fromRole: 'hod',
      toRole: 'staff',
      department: paper.department,
    });
    toast.success('Paper marked as print-ready. Staff notified.');
  };

  const handleRejectWithFeedback = () => {
    if (!feedback.trim() || !selectedPaper) {
      toast.error('Please provide feedback');
      return;
    }

    updatePaper(selectedPaper.id, { 
      status: 'rejected',
      feedback 
    });
    
    addNotification({
      type: 'rejection',
      title: 'Paper Needs Revision',
      message: `Your question paper "${selectedPaper.title}" needs changes: ${feedback}`,
      paperId: selectedPaper.id,
      fromRole: 'hod',
      toRole: 'staff',
      department: selectedPaper.department,
    });
    
    toast.success('Feedback sent to staff');
    setShowFeedbackDialog(false);
    setFeedback('');
    setSelectedPaper(null);
  };

  const openRejectDialog = (paper: QuestionPaper) => {
    setSelectedPaper(paper);
    setShowFeedbackDialog(true);
  };

  const openPreview = (paper: QuestionPaper) => {
    setSelectedPaper(paper);
    setShowPreview(true);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getTotalQuestions = (paper: QuestionPaper) => {
    return paper.sections.reduce((sum, section) => sum + section.questions.length, 0);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Question Paper Review</h2>
        <p className="text-muted-foreground">
          Review and approve question papers from {hodDepartment || 'your department'} staff
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-border/50 bg-gradient-to-br from-amber-500/10 to-orange-500/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <Clock className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-3xl font-bold text-amber-600">{pendingPapers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-gradient-to-br from-green-500/10 to-emerald-500/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-3xl font-bold text-green-600">{approvedPapers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Papers */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Pending Papers
          </CardTitle>
          <CardDescription>Question papers awaiting your review</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {pendingPapers.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
                <p className="text-muted-foreground">No pending papers to review!</p>
              </div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence>
                  {pendingPapers.map((paper, index) => (
                    <motion.div
                      key={paper.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="border-border/50 hover:shadow-md transition-all">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-2">
                                <Badge variant="secondary">{paper.examType}</Badge>
                                <Badge variant="outline">{paper.maxMarks} marks</Badge>
                                <Badge variant="outline">{paper.duration}</Badge>
                                <Badge variant="outline">{getTotalQuestions(paper)} questions</Badge>
                              </div>
                              <p className="font-medium text-foreground mb-1">{paper.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {paper.courseName} ({paper.courseCode}) • {paper.semester}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {paper.sections.length} sections • Created: {formatDate(paper.createdAt)}
                              </p>
                            </div>
                            
                            <div className="flex flex-col gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openPreview(paper)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
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
                                onClick={() => openRejectDialog(paper)}
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
        </CardContent>
      </Card>

      {/* Approved Papers - Mark Print Ready */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Approved Papers
          </CardTitle>
          <CardDescription>Notify staff to print approved papers</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            {approvedPapers.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No approved papers yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {approvedPapers.map((paper) => (
                  <Card key={paper.id} className="border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge 
                              variant={paper.status === 'print-ready' ? 'default' : 'secondary'}
                              className={paper.status === 'print-ready' ? 'bg-green-500' : ''}
                            >
                              {paper.status === 'print-ready' ? 'Print Ready' : 'Approved'}
                            </Badge>
                            <Badge variant="outline">{paper.examType}</Badge>
                          </div>
                          <p className="font-medium text-foreground">{paper.title}</p>
                          <p className="text-sm text-muted-foreground">{paper.courseName}</p>
                        </div>
                        
                        {paper.status !== 'print-ready' && (
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                            onClick={() => handleMarkPrintReady(paper)}
                          >
                            <Printer className="w-4 h-4 mr-2" />
                            Notify to Print
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Paper Preview Dialog - Full Preview */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Full Paper Preview - {selectedPaper?.title}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {selectedPaper?.courseName} ({selectedPaper?.courseCode}) • {selectedPaper?.examType}
            </p>
          </DialogHeader>
          <div className="p-2">
            {selectedPaper && (
              <div className="border rounded-lg overflow-hidden shadow-inner">
                <PaperPreview paper={selectedPaper} />
              </div>
            )}
          </div>
          <DialogFooter className="p-4 border-t">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feedback Dialog */}
      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Provide Feedback for Revision</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter suggestions for changes or improvements..."
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
              Send Feedback & Request Revision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaperReview;