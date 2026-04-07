import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Trash2, Eye, Edit, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useQuestionPaperStore, QuestionPaper } from '@/stores/questionPaperStore';
import PaperPreview from './PaperPreview';
import { toast } from 'sonner';
import { format } from 'date-fns';

const PaperHistory: React.FC = () => {
  const { 
    deletedPapers, 
    undoDeletePaper, 
    undoAllDeletedPapers, 
    clearDeletedPapers,
    setActivePaper 
  } = useQuestionPaperStore();
  
  const [previewPaper, setPreviewPaper] = useState<QuestionPaper | null>(null);
  const [showClearAllDialog, setShowClearAllDialog] = useState(false);
  
  const handleRestore = (paper: QuestionPaper) => {
    undoDeletePaper(paper.id);
    toast.success(`"${paper.title}" restored`);
  };
  
  const handleRestoreAll = () => {
    undoAllDeletedPapers();
    toast.success('All papers restored');
  };
  
  const handleClearAll = () => {
    clearDeletedPapers();
    setShowClearAllDialog(false);
    toast.success('History cleared');
  };
  
  if (deletedPapers.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Deleted Papers</h3>
          <p className="text-muted-foreground">
            Deleted question papers will appear here for recovery
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {deletedPapers.length} paper(s) in history
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRestoreAll}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Restore All
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setShowClearAllDialog(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        </div>
      </div>
      
      {/* Paper List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {deletedPapers.map((paper) => (
          <motion.div
            key={paper.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-muted/30">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base line-through opacity-70">{paper.title}</CardTitle>
                    <CardDescription>{paper.courseName} - {paper.courseCode}</CardDescription>
                  </div>
                  <Badge variant="outline" className="opacity-70">{paper.examType}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground mb-3">
                  <p>Deleted: {format(new Date(paper.updatedAt), 'MMM dd, yyyy HH:mm')}</p>
                  <p>{paper.sections.length} sections, {paper.sections.reduce((acc, s) => acc + s.questions.length, 0)} questions</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => setPreviewPaper(paper)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  <Button 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleRestore(paper)}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Restore
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
      
      {/* Preview Dialog */}
      <Dialog open={!!previewPaper} onOpenChange={() => setPreviewPaper(null)}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Paper Preview (Deleted)</DialogTitle>
          </DialogHeader>
          {previewPaper && <PaperPreview paper={previewPaper} />}
        </DialogContent>
      </Dialog>
      
      {/* Clear All Confirmation */}
      <AlertDialog open={showClearAllDialog} onOpenChange={setShowClearAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All History?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all papers in history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PaperHistory;
