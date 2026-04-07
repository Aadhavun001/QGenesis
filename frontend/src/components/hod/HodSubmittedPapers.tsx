import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Eye, Edit, Printer, Download, FileText, Search, Share2, Trash2,
  Check, X, Save, ChevronDown, ChevronRight, Plus, GripVertical
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/contexts/AuthContext';
import { useQuestionPaperStore, QuestionPaper, PaperSection, PaperQuestion } from '@/stores/questionPaperStore';
import PaperPreview from '@/components/staff/paper-builder/PaperPreview';
import PrintablePaper from '@/components/staff/paper-builder/PrintablePaper';
import { toast } from 'sonner';
import { format } from 'date-fns';

const BLOOMS_LEVELS = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'];

const HodSubmittedPapers: React.FC = () => {
  const { user } = useAuth();
  const { papers, updatePaper, deletePaperPermanently } = useQuestionPaperStore();
  
  const hodDepartment = user?.department;
  const hodInstitution = (user as any)?.institution;
  const hodPlace = (user as any)?.place;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [previewPaper, setPreviewPaper] = useState<QuestionPaper | null>(null);
  const [editingPaper, setEditingPaper] = useState<QuestionPaper | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editedQuestion, setEditedQuestion] = useState<Partial<PaperQuestion>>({});
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [paperToDelete, setPaperToDelete] = useState<QuestionPaper | null>(null);

  // Filter submitted and approved papers for this HOD's department (and institution/place if set)
  const submittedPapers = useMemo(() => {
    return papers.filter(p => {
      if (p.status !== 'submitted' && p.status !== 'approved') return false;
      if (hodDepartment && p.department && p.department !== hodDepartment) return false;
      if (hodInstitution && (p as any).institution && (p as any).institution !== hodInstitution) return false;
      if (hodPlace && (p as any).place && (p as any).place !== hodPlace) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return p.title.toLowerCase().includes(q) || 
               p.courseName.toLowerCase().includes(q) || 
               p.courseCode.toLowerCase().includes(q) ||
               (p.staffName || '').toLowerCase().includes(q);
      }
      return true;
    }).sort((a, b) => new Date(b.submittedAt || b.updatedAt).getTime() - new Date(a.submittedAt || a.updatedAt).getTime());
  }, [papers, hodDepartment, hodInstitution, hodPlace, searchQuery]);

  const handleShare = async (paper: QuestionPaper) => {
    const title = `${paper.title} - ${paper.courseCode}`;
    const text = `${paper.title}\n${paper.courseName} (${paper.courseCode})\n${paper.examType} • ${paper.maxMarks} Marks`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title,
          text,
        });
        toast.success('Shared');
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          copyShareFallback(title, text);
        }
      }
    } else {
      copyShareFallback(title, text);
    }
  };

  const copyShareFallback = (title: string, text: string) => {
    const url = window.location.href;
    const copyText = `${title}\n\n${text}\n\n${url}`;
    navigator.clipboard?.writeText(copyText).then(() => toast.success('Link and details copied to clipboard')).catch(() => toast.info(text));
  };

  const handlePrint = (paper: QuestionPaper) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      // Create a temporary container
      const container = document.createElement('div');
      container.style.width = '210mm';
      document.body.appendChild(container);

      // Use a simple approach for printing
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${paper.title} - Question Paper</title>
          <style>
            @page { size: A4; margin: 15mm; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Times New Roman', Times, serif; 
              -webkit-print-color-adjust: exact !important; 
              print-color-adjust: exact !important; }
            table { border-collapse: collapse; width: 100%; }
            td, th { border: 1px solid #000; padding: 4px 8px; }
          </style>
        </head>
        <body>
          <div style="padding: 20px; background: ${paper.paperColor}; color: ${paper.textColor}; font-family: 'Times New Roman', serif;">
            <div style="text-align:center; margin-bottom:20px;">
              <h1 style="font-size:18px; text-transform:uppercase;">${paper.collegeName}</h1>
              <h2 style="font-size:14px;">${paper.departmentName}</h2>
              <p style="font-size:12px;">Semester: ${paper.semester}</p>
              <p style="font-size:14px; font-weight:bold; margin-top:8px;">CONTINUOUS ASSESSMENT TEST – ${paper.examType}</p>
            </div>
            <div style="border-top:2px solid ${paper.textColor}; border-bottom:2px solid ${paper.textColor}; padding:8px; text-align:center; font-weight:bold;">
              ${paper.courseCode} – ${paper.courseName}
            </div>
            <div style="display:flex; justify-content:space-between; margin:10px 0; font-size:12px;">
              <span><strong>Time:</strong> ${paper.duration}</span>
              <span><strong>Maximum Marks:</strong> ${paper.maxMarks}</span>
            </div>
            ${paper.sections.map(section => `
              <div style="margin:15px 0;">
                <h3 style="font-size:13px; font-weight:bold; margin-bottom:8px;">${section.name}</h3>
                ${section.instructions ? `<p style="font-size:12px; font-style:italic; margin-bottom:8px;">${section.instructions}</p>` : ''}
                <table>
                  <thead>
                    <tr style="background:#f5f5f5;">
                      <th style="width:40px;">Q.No.</th>
                      <th style="width:50px;">Sub</th>
                      <th>Question</th>
                      <th style="width:50px;">Marks</th>
                      <th style="width:40px;">BTL</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${section.questions.map(q => `
                      ${q.isAlternative ? '<tr><td colspan="5" style="text-align:center; font-weight:bold;">(OR)</td></tr>' : ''}
                      <tr>
                        <td style="text-align:center;">${!q.isAlternative ? q.questionNo : ''}</td>
                        <td style="text-align:center;">${q.subDivision}</td>
                        <td>${q.content}</td>
                        <td style="text-align:center;">${q.marks}</td>
                        <td style="text-align:center;">${q.btl}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `).join('')}
            <div style="text-align:center; margin-top:30px;">**********</div>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
      document.body.removeChild(container);
    }
  };

  const handleDownload = (paper: QuestionPaper, format: 'pdf' | 'word') => {
    if (format === 'pdf') {
      handlePrint(paper);
      toast.info('Use "Save as PDF" in the print dialog');
    } else {
      // Generate simple HTML for Word
      const html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
        <head><meta charset="utf-8"><title>${paper.title}</title></head>
        <body style="font-family:'Times New Roman',serif;">
          <h1 style="text-align:center;">${paper.collegeName}</h1>
          <h2 style="text-align:center;">${paper.departmentName}</h2>
          <p style="text-align:center;">Semester: ${paper.semester}</p>
          <p style="text-align:center;font-weight:bold;">CONTINUOUS ASSESSMENT TEST – ${paper.examType}</p>
          <hr/>
          <p style="text-align:center;font-weight:bold;">${paper.courseCode} – ${paper.courseName}</p>
          <hr/>
          <p>Time: ${paper.duration} &nbsp;&nbsp;&nbsp; Maximum Marks: ${paper.maxMarks}</p>
          ${paper.sections.map(s => `
            <h3>${s.name}</h3>
            ${s.instructions ? `<p><em>${s.instructions}</em></p>` : ''}
            <table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;width:100%;">
              <tr><th>Q.No.</th><th>Sub</th><th>Question</th><th>Marks</th><th>BTL</th></tr>
              ${s.questions.map(q => `
                ${q.isAlternative ? '<tr><td colspan="5" align="center"><b>(OR)</b></td></tr>' : ''}
                <tr>
                  <td align="center">${!q.isAlternative ? q.questionNo : ''}</td>
                  <td align="center">${q.subDivision}</td>
                  <td>${q.content}</td>
                  <td align="center">${q.marks}</td>
                  <td align="center">${q.btl}</td>
                </tr>
              `).join('')}
            </table>
          `).join('')}
          <p style="text-align:center;margin-top:30px;">**********</p>
        </body></html>
      `;
      const blob = new Blob([html], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${paper.title}.doc`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Downloaded as Word document');
    }
  };

  const startEditing = (paper: QuestionPaper) => {
    setEditingPaper(JSON.parse(JSON.stringify(paper)));
    setExpandedSections(paper.sections.map(s => s.id));
  };

  const handleSaveQuestionEdit = () => {
    if (!editingPaper || !editingSectionId || !editingQuestionId) return;
    
    const updatedSections = editingPaper.sections.map(s => {
      if (s.id !== editingSectionId) return s;
      return {
        ...s,
        questions: s.questions.map(q => 
          q.id === editingQuestionId ? { ...q, ...editedQuestion } : q
        )
      };
    });
    
    setEditingPaper({ ...editingPaper, sections: updatedSections });
    setEditingQuestionId(null);
    setEditingSectionId(null);
    setEditedQuestion({});
  };

  const handleSavePaperEdits = () => {
    if (!editingPaper) return;
    updatePaper(editingPaper.id, {
      sections: editingPaper.sections,
      collegeName: editingPaper.collegeName,
      departmentName: editingPaper.departmentName,
      courseName: editingPaper.courseName,
      courseCode: editingPaper.courseCode,
      instructions: editingPaper.instructions,
    });
    toast.success('Paper updated successfully');
    setEditingPaper(null);
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) ? prev.filter(id => id !== sectionId) : [...prev, sectionId]
    );
  };

  if (submittedPapers.length === 0 && !searchQuery) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Submitted Papers</h1>
          <p className="text-muted-foreground">Review question papers submitted by staff</p>
        </div>
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Submitted Papers</h3>
            <p className="text-muted-foreground">
              Papers submitted by staff will appear here for review
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Submitted Papers</h1>
          <p className="text-muted-foreground">{submittedPapers.length} paper(s) submitted for review</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search papers..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {submittedPapers.map((paper) => (
          <motion.div
            key={paper.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{paper.title}</CardTitle>
                    <CardDescription>{paper.courseName} - {paper.courseCode}</CardDescription>
                  </div>
                  <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Submitted</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground space-y-1 mb-3">
                  <p><strong>Staff:</strong> {paper.staffName || 'Unknown'}</p>
                  <p><strong>Exam:</strong> {paper.examType} | <strong>Marks:</strong> {paper.maxMarks}</p>
                  <p><strong>Submitted:</strong> {paper.submittedAt ? format(new Date(paper.submittedAt), 'MMM dd, yyyy HH:mm') : 'N/A'}</p>
                  <p>{paper.sections.length} sections, {paper.sections.reduce((a, s) => a + s.questions.length, 0)} questions</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPreviewPaper(paper)}>
                    <Eye className="h-4 w-4 mr-1" /> View
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => startEditing(paper)}>
                    <Edit className="h-4 w-4 mr-1" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handlePrint(paper)}>
                    <Printer className="h-4 w-4 mr-1" /> Print
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleShare(paper)}>
                    <Share2 className="h-4 w-4 mr-1" /> Share
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDownload(paper, 'pdf')}>
                    <Download className="h-4 w-4 mr-1" /> PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDownload(paper, 'word')}>
                    <Download className="h-4 w-4 mr-1" /> Word
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => setPaperToDelete(paper)}>
                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Full Paper Preview Dialog */}
      <Dialog open={!!previewPaper} onOpenChange={() => setPreviewPaper(null)}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Full Paper Preview - {previewPaper?.title}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Submitted by <strong>{previewPaper?.staffName || 'Unknown'}</strong> • {previewPaper?.courseName} ({previewPaper?.courseCode})
            </p>
          </DialogHeader>
          <div className="p-2">
            {previewPaper && (
              <div className="border rounded-lg overflow-hidden shadow-inner">
                <PaperPreview paper={previewPaper} />
              </div>
            )}
          </div>
          <DialogFooter className="p-4 border-t flex-wrap gap-2">
            <Button variant="outline" onClick={() => previewPaper && startEditing(previewPaper)}>
              <Edit className="h-4 w-4 mr-2" /> Edit Paper
            </Button>
            <Button variant="outline" onClick={() => previewPaper && handlePrint(previewPaper)}>
              <Printer className="h-4 w-4 mr-2" /> Print
            </Button>
            <Button variant="outline" onClick={() => previewPaper && handleShare(previewPaper)}>
              <Share2 className="h-4 w-4 mr-2" /> Share
            </Button>
            <Button variant="outline" onClick={() => previewPaper && handleDownload(previewPaper, 'pdf')}>
              <Download className="h-4 w-4 mr-2" /> Save as PDF
            </Button>
            <Button variant="outline" onClick={() => previewPaper && handleDownload(previewPaper, 'word')}>
              <Download className="h-4 w-4 mr-2" /> Save as Word
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingPaper} onOpenChange={() => { setEditingPaper(null); setEditingQuestionId(null); }}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Submitted Paper - {editingPaper?.title}</DialogTitle>
          </DialogHeader>
          
          {editingPaper && (
            <div className="space-y-4">
              {/* Paper header fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">College Name</Label>
                  <Input 
                    value={editingPaper.collegeName} 
                    onChange={e => setEditingPaper({...editingPaper, collegeName: e.target.value})}
                  />
                </div>
                <div>
                  <Label className="text-xs">Department</Label>
                  <Input 
                    value={editingPaper.departmentName} 
                    onChange={e => setEditingPaper({...editingPaper, departmentName: e.target.value})}
                  />
                </div>
                <div>
                  <Label className="text-xs">Course Name</Label>
                  <Input 
                    value={editingPaper.courseName} 
                    onChange={e => setEditingPaper({...editingPaper, courseName: e.target.value})}
                  />
                </div>
                <div>
                  <Label className="text-xs">Course Code</Label>
                  <Input 
                    value={editingPaper.courseCode} 
                    onChange={e => setEditingPaper({...editingPaper, courseCode: e.target.value})}
                  />
                </div>
              </div>

              {/* Sections & Questions */}
              <ScrollArea className="max-h-[50vh]">
                <div className="space-y-3">
                  {editingPaper.sections.map((section) => (
                    <Card key={section.id}>
                      <Collapsible open={expandedSections.includes(section.id)} onOpenChange={() => toggleSection(section.id)}>
                        <CollapsibleTrigger asChild>
                          <CardHeader className="cursor-pointer hover:bg-muted/50 py-3">
                            <div className="flex items-center gap-2">
                              {expandedSections.includes(section.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              <CardTitle className="text-sm">{section.name}</CardTitle>
                              <Badge variant="secondary" className="text-xs">{section.questions.length} questions</Badge>
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="pt-0 space-y-2">
                            {section.questions.map((question) => (
                              <div key={question.id} className={`border rounded-lg p-3 ${question.isAlternative ? 'ml-6 border-dashed border-orange-300' : ''}`}>
                                {question.isAlternative && (
                                  <div className="text-center text-xs font-bold text-orange-600 mb-2">(OR)</div>
                                )}
                                
                                {editingQuestionId === question.id && editingSectionId === section.id ? (
                                  <div className="space-y-2">
                                    <Textarea
                                      value={editedQuestion.content || ''}
                                      onChange={e => setEditedQuestion({...editedQuestion, content: e.target.value})}
                                      className="min-h-[60px] text-sm"
                                      placeholder="Question content..."
                                    />
                                    <div className="grid grid-cols-3 gap-2">
                                      <div>
                                        <Label className="text-xs">Marks</Label>
                                        <Input 
                                          type="number" 
                                          value={editedQuestion.marks || 0}
                                          onChange={e => setEditedQuestion({...editedQuestion, marks: Number(e.target.value)})}
                                        />
                                      </div>
                                      <div>
                                        <Label className="text-xs">BTL</Label>
                                        <Select value={editedQuestion.btl || 'L2'} onValueChange={v => setEditedQuestion({...editedQuestion, btl: v})}>
                                          <SelectTrigger><SelectValue /></SelectTrigger>
                                          <SelectContent>
                                            {BLOOMS_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div>
                                        <Label className="text-xs">Sub</Label>
                                        <Input 
                                          value={editedQuestion.subDivision || ''}
                                          onChange={e => setEditedQuestion({...editedQuestion, subDivision: e.target.value})}
                                        />
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button size="sm" onClick={handleSaveQuestionEdit} className="bg-green-500 hover:bg-green-600">
                                        <Check className="h-3 w-3 mr-1" /> Save
                                      </Button>
                                      <Button size="sm" variant="outline" onClick={() => { setEditingQuestionId(null); setEditingSectionId(null); }}>
                                        <X className="h-3 w-3 mr-1" /> Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        {!question.isAlternative && (
                                          <span className="text-xs font-bold bg-primary/10 px-1.5 py-0.5 rounded">Q{question.questionNo}</span>
                                        )}
                                        <Badge variant="outline" className="text-xs">{question.subDivision}</Badge>
                                        <Badge className="text-xs">{question.marks}m</Badge>
                                        <Badge variant="secondary" className="text-xs">{question.btl}</Badge>
                                      </div>
                                      <p className="text-sm">{question.content}</p>
                                    </div>
                                    <Button 
                                      size="sm" 
                                      variant="ghost"
                                      onClick={() => {
                                        setEditingSectionId(section.id);
                                        setEditingQuestionId(question.id);
                                        setEditedQuestion({ ...question });
                                      }}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </CardContent>
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPaper(null)}>Cancel</Button>
            <Button onClick={handleSavePaperEdits}>
              <Save className="h-4 w-4 mr-2" /> Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!paperToDelete} onOpenChange={(open) => !open && setPaperToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this submitted paper?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove &quot;{paperToDelete?.title}&quot; from the system. Staff will no longer see it; this cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (paperToDelete) {
                  deletePaperPermanently(paperToDelete.id);
                  setPaperToDelete(null);
                  toast.success('Paper deleted');
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default HodSubmittedPapers;
