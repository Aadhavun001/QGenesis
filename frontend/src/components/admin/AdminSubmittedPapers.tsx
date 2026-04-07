import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Eye, Printer, Download, FileText, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuestionPaperStore, QuestionPaper } from '@/stores/questionPaperStore';
import PaperPreview from '@/components/staff/paper-builder/PaperPreview';
import { toast } from 'sonner';
import { format } from 'date-fns';

const AdminSubmittedPapers: React.FC = () => {
  const { papers } = useQuestionPaperStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [previewPaper, setPreviewPaper] = useState<QuestionPaper | null>(null);

  const submittedPapers = useMemo(() => {
    return papers.filter(p => {
      if (p.status !== 'submitted' && p.status !== 'approved') return false;
      if (departmentFilter !== 'all' && p.department !== departmentFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return p.title.toLowerCase().includes(q) || 
               p.courseName.toLowerCase().includes(q) || 
               p.courseCode.toLowerCase().includes(q) ||
               (p.staffName || '').toLowerCase().includes(q) ||
               (p.department || '').toLowerCase().includes(q);
      }
      return true;
    }).sort((a, b) => new Date(b.submittedAt || b.updatedAt).getTime() - new Date(a.submittedAt || a.updatedAt).getTime());
  }, [papers, departmentFilter, searchQuery]);

  const departments = useMemo(() => {
    const depts = new Set(
      papers
        .filter(p => (p.status === 'submitted' || p.status === 'approved') && p.department)
        .map(p => p.department!)
    );
    return Array.from(depts);
  }, [papers]);

  const handlePrint = (paper: QuestionPaper) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>${paper.title}</title>
      <style>@page{size:A4;margin:15mm}*{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Times New Roman',serif;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
      table{border-collapse:collapse;width:100%}td,th{border:1px solid #000;padding:4px 8px}</style></head>
      <body><div style="padding:20px;background:${paper.paperColor};color:${paper.textColor};font-family:'Times New Roman',serif;">
      <div style="text-align:center;margin-bottom:20px;">
        <h1 style="font-size:18px;text-transform:uppercase;">${paper.collegeName}</h1>
        <h2 style="font-size:14px;">${paper.departmentName}</h2>
        <p style="font-size:14px;font-weight:bold;margin-top:8px;">CONTINUOUS ASSESSMENT TEST – ${paper.examType}</p>
      </div>
      <div style="border-top:2px solid ${paper.textColor};border-bottom:2px solid ${paper.textColor};padding:8px;text-align:center;font-weight:bold;">
        ${paper.courseCode} – ${paper.courseName}
      </div>
      <div style="display:flex;justify-content:space-between;margin:10px 0;font-size:12px;">
        <span><strong>Time:</strong> ${paper.duration}</span>
        <span><strong>Maximum Marks:</strong> ${paper.maxMarks}</span>
      </div>
      ${paper.sections.map(s => `<div style="margin:15px 0;">
        <h3 style="font-size:13px;font-weight:bold;margin-bottom:8px;">${s.name}</h3>
        ${s.instructions ? `<p style="font-size:12px;font-style:italic;margin-bottom:8px;">${s.instructions}</p>` : ''}
        <table><thead><tr style="background:#f5f5f5;"><th style="width:40px;">Q.No.</th><th style="width:50px;">Sub</th><th>Question</th><th style="width:50px;">Marks</th><th style="width:40px;">BTL</th></tr></thead>
        <tbody>${s.questions.map(q => `${q.isAlternative ? '<tr><td colspan="5" style="text-align:center;font-weight:bold;">(OR)</td></tr>' : ''}
        <tr><td style="text-align:center;">${!q.isAlternative ? q.questionNo : ''}</td><td style="text-align:center;">${q.subDivision}</td><td>${q.content}</td><td style="text-align:center;">${q.marks}</td><td style="text-align:center;">${q.btl}</td></tr>`).join('')}</tbody></table></div>`).join('')}
      <div style="text-align:center;margin-top:30px;">**********</div></div></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
  };

  const handleDownloadWord = (paper: QuestionPaper) => {
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
    <head><meta charset="utf-8"><title>${paper.title}</title></head>
    <body style="font-family:'Times New Roman',serif;">
      <h1 style="text-align:center;">${paper.collegeName}</h1>
      <h2 style="text-align:center;">${paper.departmentName}</h2>
      <p style="text-align:center;font-weight:bold;">CONTINUOUS ASSESSMENT TEST – ${paper.examType}</p>
      <hr/><p style="text-align:center;font-weight:bold;">${paper.courseCode} – ${paper.courseName}</p><hr/>
      <p>Time: ${paper.duration} &nbsp;&nbsp;&nbsp; Maximum Marks: ${paper.maxMarks}</p>
      ${paper.sections.map(s => `<h3>${s.name}</h3>${s.instructions ? `<p><em>${s.instructions}</em></p>` : ''}
      <table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;width:100%;">
      <tr><th>Q.No.</th><th>Sub</th><th>Question</th><th>Marks</th><th>BTL</th></tr>
      ${s.questions.map(q => `${q.isAlternative ? '<tr><td colspan="5" align="center"><b>(OR)</b></td></tr>' : ''}
      <tr><td align="center">${!q.isAlternative ? q.questionNo : ''}</td><td align="center">${q.subDivision}</td><td>${q.content}</td><td align="center">${q.marks}</td><td align="center">${q.btl}</td></tr>`).join('')}
      </table>`).join('')}
      <p style="text-align:center;margin-top:30px;">**********</p></body></html>`;
    const blob = new Blob([html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${paper.title}.doc`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded as Word document');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Submitted Papers (Admin View)</h1>
          <p className="text-muted-foreground">{submittedPapers.length} paper(s) submitted across all departments</p>
        </div>
        <div className="flex gap-3">
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search papers..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
        </div>
      </div>

      {submittedPapers.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Submitted Papers</h3>
            <p className="text-muted-foreground">Papers submitted by staff will appear here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {submittedPapers.map(paper => (
            <motion.div key={paper.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
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
                    <p><strong>Dept:</strong> {paper.department || paper.departmentName}</p>
                    <p><strong>Exam:</strong> {paper.examType} | <strong>Marks:</strong> {paper.maxMarks}</p>
                    <p><strong>Submitted:</strong> {paper.submittedAt ? format(new Date(paper.submittedAt), 'MMM dd, yyyy HH:mm') : 'N/A'}</p>
                    <p>{paper.sections.length} sections, {paper.sections.reduce((a, s) => a + s.questions.length, 0)} questions</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPreviewPaper(paper)}>
                      <Eye className="h-4 w-4 mr-1" /> View
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handlePrint(paper)}>
                      <Printer className="h-4 w-4 mr-1" /> Print
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handlePrint(paper)}>
                      <Download className="h-4 w-4 mr-1" /> PDF
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDownloadWord(paper)}>
                      <Download className="h-4 w-4 mr-1" /> Word
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Full Paper Preview Dialog */}
      <Dialog open={!!previewPaper} onOpenChange={() => setPreviewPaper(null)}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Paper Preview - {previewPaper?.title}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Submitted by <strong>{previewPaper?.staffName || 'Unknown'}</strong> • Dept: {previewPaper?.department || previewPaper?.departmentName}
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
            <Button variant="outline" onClick={() => previewPaper && handlePrint(previewPaper)}>
              <Printer className="h-4 w-4 mr-2" /> Print
            </Button>
            <Button variant="outline" onClick={() => { previewPaper && handlePrint(previewPaper); toast.info('Use "Save as PDF" in print dialog'); }}>
              <Download className="h-4 w-4 mr-2" /> Save as PDF
            </Button>
            <Button variant="outline" onClick={() => previewPaper && handleDownloadWord(previewPaper)}>
              <Download className="h-4 w-4 mr-2" /> Save as Word
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSubmittedPapers;
