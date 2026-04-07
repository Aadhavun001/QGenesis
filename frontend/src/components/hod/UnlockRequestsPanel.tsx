import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { 
  Unlock, 
  Lock, 
  ShieldCheck, 
  ShieldAlert,
  Check,
  X,
  FileText,
  MessageSquare,
  Clock,
  User,
  Sparkles,
  KeyRound,
  History,
  Filter,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  CheckSquare,
  Square,
  Download,
  FileSpreadsheet,
  CalendarIcon
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useQuestionStore } from '@/stores/questionStore';
import { useQuestionPaperStore, SecurityHistoryEntry } from '@/stores/questionPaperStore';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface UnlockRequest {
  id: string;
  type: 'question' | 'paper';
  itemId: string;
  itemTitle: string;
  reason: string;
  requestedBy: string;
  requestedAt: Date;
  department?: string;
}

const UnlockRequestsPanel: React.FC = () => {
  const { user } = useAuth();
  const { 
    notifications, 
    questions,
    updateQuestion, 
    addNotification, 
    deleteNotification 
  } = useQuestionStore();
  const { papers, updatePaper, securityHistory, addSecurityHistoryEntry, clearSecurityHistory } = useQuestionPaperStore();

  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<{ notificationId: string; itemId: string; type: 'question' | 'paper' } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'requested' | 'approved' | 'denied' | 'relocked'>('all');
  const [showClearHistoryDialog, setShowClearHistoryDialog] = useState(false);
  
  // Date range state for export
  const [exportDateRange, setExportDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  });
  const [showExportDatePicker, setShowExportDatePicker] = useState(false);
  
  // Bulk selection state
  const [selectedRequests, setSelectedRequests] = useState<Set<string>>(new Set());
  const [showBulkRejectDialog, setShowBulkRejectDialog] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState('');

  const hodDepartment = user?.department;
  const hodInstitution = user?.institution;
  const hodPlace = user?.place;

  // FIXED ACCESS CONTROL: Match unlock requests properly
  // Check for "Unlock Request" in title (handles both "Unlock Request:" and "Unlock Request" patterns)
  const unlockRequests = notifications.filter(n => {
    // Match both "Unlock Request:" and "Unlock Request" patterns
    const isUnlockRequest = n.type === 'request' && n.toRole === 'hod' && 
      (n.title.toLowerCase().includes('unlock request') || n.title.toLowerCase().includes('unlock'));
    
    if (!isUnlockRequest) return false;
    
    // If HOD has no department set, show all requests (for testing/development)
    if (!hodDepartment) {
      console.log('HOD department not set - showing request for visibility');
      return true;
    }
    
    // If request has no department, show it (legacy data compatibility)
    if (!n.department) {
      console.log('Request has no department - showing for visibility', n.id);
      return true;
    }
    
    // Check department match (required)
    if (n.department !== hodDepartment) return false;
    
    // Check institution match (if both are set)
    if (hodInstitution && n.institution && n.institution !== hodInstitution) return false;
    
    // Check place match (if both are set)  
    if (hodPlace && n.place && n.place !== hodPlace) return false;
    
    return true;
  });

  const handleApproveUnlock = (notificationId: string, itemId: string, itemType: 'question' | 'paper') => {
    if (itemType === 'question') {
      const question = questions.find(q => q.id === itemId);
      updateQuestion(itemId, { 
        isLocked: false, 
        hasUnlockRequest: false,
        unlockedAt: new Date(),
        unlockedBy: user?.id
      } as any);
      
      // Add to security history
      addSecurityHistoryEntry({
        action: 'unlock_approved',
        itemType: 'question',
        itemId,
        itemTitle: question?.content.substring(0, 50) || 'Question',
        performedBy: user?.displayName || 'HOD',
        performedByRole: 'hod',
        department: question?.department,
      });
      
      addNotification({
        type: 'approval',
        title: 'Unlock Approved',
        message: `Your question "${question?.content.substring(0, 50) || 'Question'}..." has been unlocked by HOD`,
        questionId: itemId,
        fromRole: 'hod',
        toRole: 'staff',
        department: question?.department,
      });
    } else {
      const paper = papers.find(p => p.id === itemId);
      updatePaper(itemId, { 
        status: 'draft',
        isLocked: false, 
        hasUnlockRequest: false,
        unlockedAt: new Date(),
        unlockedBy: user?.id
      } as any);
      
      // Add to security history
      addSecurityHistoryEntry({
        action: 'unlock_approved',
        itemType: 'paper',
        itemId,
        itemTitle: paper?.title || 'Paper',
        performedBy: user?.displayName || 'HOD',
        performedByRole: 'hod',
        department: paper?.department,
      });
      
      addNotification({
        type: 'approval',
        title: 'Unlock Approved',
        message: `Your question paper "${paper?.title || 'Paper'}" has been unlocked by HOD`,
        paperId: itemId,
        fromRole: 'hod',
        toRole: 'staff',
        department: paper?.department,
      });
    }

    deleteNotification(notificationId);
    toast.success('Item unlocked successfully');
  };

  const handleRejectUnlock = () => {
    if (!selectedRequest || !rejectReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    const { notificationId, itemId, type } = selectedRequest;

    if (type === 'question') {
      const question = questions.find(q => q.id === itemId);
      updateQuestion(itemId, { hasUnlockRequest: false } as any);
      
      // Add to security history
      addSecurityHistoryEntry({
        action: 'unlock_denied',
        itemType: 'question',
        itemId,
        itemTitle: question?.content.substring(0, 50) || 'Question',
        performedBy: user?.displayName || 'HOD',
        performedByRole: 'hod',
        reason: rejectReason,
        department: question?.department,
      });
      
      addNotification({
        type: 'rejection',
        title: 'Unlock Request Denied',
        message: `Your unlock request for question "${question?.content.substring(0, 50) || 'Question'}..." was denied: ${rejectReason}`,
        questionId: itemId,
        fromRole: 'hod',
        toRole: 'staff',
        department: question?.department,
      });
    } else {
      const paper = papers.find(p => p.id === itemId);
      updatePaper(itemId, { hasUnlockRequest: false } as any);
      
      // Add to security history
      addSecurityHistoryEntry({
        action: 'unlock_denied',
        itemType: 'paper',
        itemId,
        itemTitle: paper?.title || 'Paper',
        performedBy: user?.displayName || 'HOD',
        performedByRole: 'hod',
        reason: rejectReason,
        department: paper?.department,
      });
      
      addNotification({
        type: 'rejection',
        title: 'Unlock Request Denied',
        message: `Your unlock request for paper "${paper?.title || 'Paper'}" was denied: ${rejectReason}`,
        paperId: itemId,
        fromRole: 'hod',
        toRole: 'staff',
        department: paper?.department,
      });
    }

    deleteNotification(notificationId);
    setShowRejectDialog(false);
    setSelectedRequest(null);
    setRejectReason('');
    toast.success('Request rejected');
  };

  const handleRelockItem = (itemId: string, itemType: 'question' | 'paper') => {
    if (itemType === 'question') {
      const question = questions.find(q => q.id === itemId);
      updateQuestion(itemId, { 
        isLocked: true,
        lockedAt: new Date(),
        lockedBy: user?.id
      } as any);
      
      // Add to security history
      addSecurityHistoryEntry({
        action: 'relocked',
        itemType: 'question',
        itemId,
        itemTitle: question?.content.substring(0, 50) || 'Question',
        performedBy: user?.displayName || 'HOD',
        performedByRole: 'hod',
        department: question?.department,
      });
      
      addNotification({
        type: 'info',
        title: 'Item Re-Locked',
        message: `Your question "${question?.content.substring(0, 50) || 'Question'}..." has been re-locked by HOD`,
        questionId: itemId,
        fromRole: 'hod',
        toRole: 'staff',
        department: question?.department,
      });
    } else {
      const paper = papers.find(p => p.id === itemId);
      updatePaper(itemId, { 
        isLocked: true,
        lockedAt: new Date(),
        lockedBy: user?.id
      } as any);
      
      // Add to security history
      addSecurityHistoryEntry({
        action: 'relocked',
        itemType: 'paper',
        itemId,
        itemTitle: paper?.title || 'Paper',
        performedBy: user?.displayName || 'HOD',
        performedByRole: 'hod',
        department: paper?.department,
      });
      
      addNotification({
        type: 'info',
        title: 'Paper Re-Locked',
        message: `Your question paper "${paper?.title || 'Paper'}" has been re-locked by HOD`,
        paperId: itemId,
        fromRole: 'hod',
        toRole: 'staff',
        department: paper?.department,
      });
    }
    toast.success('Item locked successfully');
  };

  const openRejectDialog = (notificationId: string, itemId: string, type: 'question' | 'paper') => {
    setSelectedRequest({ notificationId, itemId, type });
    setShowRejectDialog(true);
  };

  // Bulk actions handlers
  const toggleSelectRequest = (requestId: string) => {
    const newSelected = new Set(selectedRequests);
    if (newSelected.has(requestId)) {
      newSelected.delete(requestId);
    } else {
      newSelected.add(requestId);
    }
    setSelectedRequests(newSelected);
  };

  const selectAllRequests = () => {
    if (selectedRequests.size === unlockRequests.length) {
      setSelectedRequests(new Set());
    } else {
      setSelectedRequests(new Set(unlockRequests.map(r => r.id)));
    }
  };

  const handleBulkApprove = () => {
    let approvedCount = 0;
    
    selectedRequests.forEach(requestId => {
      const request = unlockRequests.find(r => r.id === requestId);
      if (!request) return;
      
      const isQuestion = request.questionId != null;
      const itemId = isQuestion ? request.questionId! : request.paperId!;
      
      handleApproveUnlock(requestId, itemId, isQuestion ? 'question' : 'paper');
      approvedCount++;
    });
    
    setSelectedRequests(new Set());
    toast.success(`${approvedCount} item(s) unlocked successfully`);
  };

  const handleBulkReject = () => {
    if (!bulkRejectReason.trim()) {
      toast.error('Please provide a reason for bulk rejection');
      return;
    }
    
    let rejectedCount = 0;
    
    selectedRequests.forEach(requestId => {
      const request = unlockRequests.find(r => r.id === requestId);
      if (!request) return;
      
      const isQuestion = request.questionId != null;
      const itemId = isQuestion ? request.questionId! : request.paperId!;
      const itemType = isQuestion ? 'question' : 'paper';
      
      if (itemType === 'question') {
        const question = questions.find(q => q.id === itemId);
        updateQuestion(itemId, { hasUnlockRequest: false } as any);
        
        addSecurityHistoryEntry({
          action: 'unlock_denied',
          itemType: 'question',
          itemId,
          itemTitle: question?.content.substring(0, 50) || 'Question',
          performedBy: user?.displayName || 'HOD',
          performedByRole: 'hod',
          reason: bulkRejectReason,
          department: question?.department,
        });
        
        addNotification({
          type: 'rejection',
          title: 'Unlock Request Denied',
          message: `Your unlock request was denied: ${bulkRejectReason}`,
          questionId: itemId,
          fromRole: 'hod',
          toRole: 'staff',
          department: question?.department,
        });
      } else {
        const paper = papers.find(p => p.id === itemId);
        updatePaper(itemId, { hasUnlockRequest: false } as any);
        
        addSecurityHistoryEntry({
          action: 'unlock_denied',
          itemType: 'paper',
          itemId,
          itemTitle: paper?.title || 'Paper',
          performedBy: user?.displayName || 'HOD',
          performedByRole: 'hod',
          reason: bulkRejectReason,
          department: paper?.department,
        });
        
        addNotification({
          type: 'rejection',
          title: 'Unlock Request Denied',
          message: `Your unlock request was denied: ${bulkRejectReason}`,
          paperId: itemId,
          fromRole: 'hod',
          toRole: 'staff',
          department: paper?.department,
        });
      }
      
      deleteNotification(requestId);
      rejectedCount++;
    });
    
    setSelectedRequests(new Set());
    setShowBulkRejectDialog(false);
    setBulkRejectReason('');
    toast.success(`${rejectedCount} request(s) rejected`);
  };

  // Get recently unlocked items (for re-lock option) - STRICT ACCESS CONTROL
  const unlockedQuestions = questions.filter(q => {
    if (!(q as any).printedAt || (q as any).isLocked) return false;
    // Strict matching: must have department, institution, and place set and match
    if (!hodDepartment || !q.department) return false;
    if (!hodInstitution || !(q as any).institution) return false;
    if (!hodPlace || !(q as any).place) return false;
    return q.department === hodDepartment && (q as any).institution === hodInstitution && (q as any).place === hodPlace;
  });
  
  const unlockedPapers = papers.filter(p => {
    if (!(p as any).printedAt || (p as any).isLocked) return false;
    // Strict matching: must have department, institution, and place set and match
    if (!hodDepartment || !p.department) return false;
    if (!hodInstitution || !(p as any).institution) return false;
    if (!hodPlace || !(p as any).place) return false;
    return p.department === hodDepartment && (p as any).institution === hodInstitution && (p as any).place === hodPlace;
  });

  // History visibility should match the same access-control principles used for requests.
  // If the HOD profile is missing department/institution/place, we still show history for usability
  // (and to avoid the "badge count shows X but list is empty" issue).
  const questionIds = new Set(questions.map((q) => q.id));
  const paperIds = new Set(papers.map((p) => p.id));
  const accessibleHistory = securityHistory.filter((entry) => {
    // Department: if HOD department is set, enforce match; otherwise show.
    if (hodDepartment && entry.department && entry.department !== hodDepartment) return false;

    // Institution/place: only enforce when both sides are present.
    if (hodInstitution && entry.institution && entry.institution !== hodInstitution) return false;
    if (hodPlace && entry.place && entry.place !== hodPlace) return false;

    // Hide history for items that no longer exist (deleted papers/questions)
    if (entry.itemType === 'question' && !questionIds.has(entry.itemId)) return false;
    if (entry.itemType === 'paper' && !paperIds.has(entry.itemId)) return false;

    return true;
  });

  // Calculate filter counts for badges
  const filterCounts = useMemo(() => ({
    all: accessibleHistory.length,
    requested: accessibleHistory.filter(e => e.action === 'unlock_requested').length,
    approved: accessibleHistory.filter(e => e.action === 'unlock_approved' || e.action === 'unlocked').length,
    denied: accessibleHistory.filter(e => e.action === 'unlock_denied').length,
    relocked: accessibleHistory.filter(e => e.action === 'relocked' || e.action === 'locked').length,
  }), [accessibleHistory]);

  const filteredHistory = accessibleHistory.filter((entry) => {
    const entryDate = new Date(entry.timestamp);
    if (exportDateRange.from) {
      const startOfDay = new Date(exportDateRange.from);
      startOfDay.setHours(0, 0, 0, 0);
      if (entryDate < startOfDay) return false;
    }
    if (exportDateRange.to) {
      const endOfDay = new Date(exportDateRange.to);
      endOfDay.setHours(23, 59, 59, 999);
      if (entryDate > endOfDay) return false;
    }

    if (historyFilter === 'all') return true;
    if (historyFilter === 'requested') return entry.action === 'unlock_requested';
    if (historyFilter === 'approved') return entry.action === 'unlock_approved' || entry.action === 'unlocked';
    if (historyFilter === 'denied') return entry.action === 'unlock_denied';
    if (historyFilter === 'relocked') return entry.action === 'relocked' || entry.action === 'locked';
    return true;
  });

  const sortedHistory = useMemo(() => {
    return [...filteredHistory].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [filteredHistory]);

  // Get date-filtered history for export
  const getExportHistory = () => {
    if (!exportDateRange.from && !exportDateRange.to) {
      return sortedHistory;
    }
    return sortedHistory.filter(entry => {
      const entryDate = new Date(entry.timestamp);
      if (exportDateRange.from && entryDate < exportDateRange.from) return false;
      if (exportDateRange.to) {
        const endOfDay = new Date(exportDateRange.to);
        endOfDay.setHours(23, 59, 59, 999);
        if (entryDate > endOfDay) return false;
      }
      return true;
    });
  };

  // Export functions
  const exportToCSV = () => {
    const exportData = getExportHistory();
    const headers = ['Date', 'Action', 'Item Type', 'Item Title', 'Performed By', 'Role', 'Reason', 'Department'];
    const rows = exportData.map(entry => [
      new Date(entry.timestamp).toLocaleString(),
      entry.action,
      entry.itemType,
      entry.itemTitle,
      entry.performedBy,
      entry.performedByRole,
      entry.reason || '',
      entry.department || ''
    ]);
    
    const dateRangeStr = exportDateRange.from || exportDateRange.to 
      ? `-${exportDateRange.from ? format(exportDateRange.from, 'yyyy-MM-dd') : 'start'}-to-${exportDateRange.to ? format(exportDateRange.to, 'yyyy-MM-dd') : 'now'}`
      : '';
    
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-history${dateRangeStr}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${exportData.length} records as CSV`);
  };

  const exportToPDF = () => {
    const exportData = getExportHistory();
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to export PDF');
      return;
    }
    
    const dateRangeLabel = exportDateRange.from || exportDateRange.to 
      ? `Date Range: ${exportDateRange.from ? format(exportDateRange.from, 'PPP') : 'Start'} to ${exportDateRange.to ? format(exportDateRange.to, 'PPP') : 'Now'}`
      : 'All Records';
    
    const tableRows = exportData.map(entry => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${new Date(entry.timestamp).toLocaleString()}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${entry.action}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${entry.itemType}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${entry.itemTitle}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${entry.performedBy}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${entry.reason || '-'}</td>
      </tr>
    `).join('');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Security History Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #f5f5f5; padding: 10px; border: 1px solid #ddd; text-align: left; }
            td { padding: 8px; border: 1px solid #ddd; }
            .header { display: flex; justify-content: space-between; align-items: center; }
            .date { color: #666; }
            .date-range { color: #333; margin-top: 10px; font-weight: 500; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Security History Report</h1>
            <span class="date">Generated: ${new Date().toLocaleString()}</span>
          </div>
          <p class="date-range">${dateRangeLabel}</p>
          <p>Total Records: ${exportData.length}</p>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Action</th>
                <th>Type</th>
                <th>Item</th>
                <th>Performed By</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
    toast.success(`PDF export ready - ${exportData.length} records`);
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionBadge = (action: SecurityHistoryEntry['action']) => {
    switch (action) {
      case 'locked':
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Locked</Badge>;
      case 'unlocked':
      case 'unlock_approved':
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Unlocked</Badge>;
      case 'unlock_requested':
        return <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30">Request</Badge>;
      case 'unlock_denied':
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Denied</Badge>;
      case 'relocked':
        return <Badge className="bg-purple-500/20 text-purple-500 border-purple-500/30">Re-Locked</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const getActionIcon = (action: SecurityHistoryEntry['action']) => {
    switch (action) {
      case 'locked':
        return <Lock className="w-4 h-4 text-red-500" />;
      case 'unlocked':
      case 'unlock_approved':
        return <Unlock className="w-4 h-4 text-green-500" />;
      case 'unlock_requested':
        return <ArrowUpRight className="w-4 h-4 text-amber-500" />;
      case 'unlock_denied':
        return <X className="w-4 h-4 text-red-500" />;
      case 'relocked':
        return <RefreshCw className="w-4 h-4 text-purple-500" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with animated icon */}
      <div className="flex items-center gap-3">
        <motion.div
          className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg"
          animate={{ 
            boxShadow: [
              '0 0 0 0 rgba(245, 158, 11, 0.4)',
              '0 0 0 10px rgba(245, 158, 11, 0)',
            ]
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <KeyRound className="w-6 h-6 text-white" />
        </motion.div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Security & Unlock</h2>
          <p className="text-sm text-muted-foreground">
            Manage lock/unlock requests and view security history
          </p>
        </div>
      </div>

      <Tabs defaultValue="requests" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            Requests
            {unlockRequests.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {unlockRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            History
            {accessibleHistory.length > 0 && (
              <Badge variant="outline" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {accessibleHistory.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4 mt-4">
          {/* Pending Requests */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-amber-500" />
                    Pending Unlock Requests
                    {unlockRequests.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {unlockRequests.length}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Staff members requesting to unlock printed items
                  </CardDescription>
                </div>
                
                {/* Bulk Actions */}
                {unlockRequests.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectAllRequests}
                      className="text-xs"
                    >
                      {selectedRequests.size === unlockRequests.length ? (
                        <>
                          <CheckSquare className="w-4 h-4 mr-1" />
                          Deselect All
                        </>
                      ) : (
                        <>
                          <Square className="w-4 h-4 mr-1" />
                          Select All
                        </>
                      )}
                    </Button>
                    
                    {selectedRequests.size > 0 && (
                      <>
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-xs"
                          onClick={handleBulkApprove}
                        >
                          <Unlock className="w-4 h-4 mr-1" />
                          Approve ({selectedRequests.size})
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-500 border-red-500/20 hover:bg-red-500/10 text-xs"
                          onClick={() => setShowBulkRejectDialog(true)}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Deny ({selectedRequests.size})
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {unlockRequests.length === 0 ? (
                <div className="text-center py-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring" }}
                  >
                    <ShieldCheck className="w-12 h-12 mx-auto text-green-500 mb-3" />
                  </motion.div>
                  <p className="text-muted-foreground">No pending unlock requests</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-3">
                    <AnimatePresence>
                      {unlockRequests.map((request, index) => {
                        const isQuestion = request.questionId != null;
                        const item = isQuestion 
                          ? questions.find(q => q.id === request.questionId)
                          : papers.find(p => p.id === request.paperId);

                        return (
                          <motion.div
                            key={request.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <Card className={`border-amber-500/20 bg-amber-500/5 ${selectedRequests.has(request.id) ? 'ring-2 ring-primary' : ''}`}>
                              <CardContent className="p-4">
                                <div className="flex items-start gap-4">
                                  {/* Checkbox for bulk selection */}
                                  <Checkbox
                                    checked={selectedRequests.has(request.id)}
                                    onCheckedChange={() => toggleSelectRequest(request.id)}
                                    className="mt-1"
                                  />
                                  
                                  <motion.div
                                    className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0"
                                    animate={{ rotate: [0, 5, -5, 0] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                  >
                                    {isQuestion ? (
                                      <MessageSquare className="w-5 h-5 text-white" />
                                    ) : (
                                      <FileText className="w-5 h-5 text-white" />
                                    )}
                                  </motion.div>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge variant="outline" className="text-amber-600 border-amber-500/30">
                                        {isQuestion ? 'Question' : 'Paper'}
                                      </Badge>
                                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {formatDate(request.createdAt)}
                                      </span>
                                    </div>
                                    
                                    <p className="text-sm font-medium text-foreground truncate">
                                      {isQuestion 
                                        ? (item as any)?.content?.substring(0, 60) + '...'
                                        : (item as any)?.title
                                      }
                                    </p>

                                    <div className="mt-2 p-2 rounded bg-muted/50 border border-border/50">
                                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                        <User className="w-3 h-3" />
                                        Reason for request:
                                      </p>
                                      <p className="text-sm">{request.message}</p>
                                    </div>

                                    <div className="flex items-center gap-2 mt-3">
                                      <Button
                                        size="sm"
                                        className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                                        onClick={() => handleApproveUnlock(
                                          request.id, 
                                          isQuestion ? request.questionId! : request.paperId!,
                                          isQuestion ? 'question' : 'paper'
                                        )}
                                      >
                                        <Unlock className="w-4 h-4 mr-1" />
                                        Approve Unlock
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-red-500 border-red-500/20 hover:bg-red-500/10"
                                        onClick={() => openRejectDialog(
                                          request.id,
                                          isQuestion ? request.questionId! : request.paperId!,
                                          isQuestion ? 'question' : 'paper'
                                        )}
                                      >
                                        <X className="w-4 h-4 mr-1" />
                                        Deny
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Recently Unlocked Items (Re-lock option) */}
          {(unlockedQuestions.length > 0 || unlockedPapers.length > 0) && (
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Unlock className="w-5 h-5 text-green-500" />
                  Unlocked Items
                </CardTitle>
                <CardDescription>
                  Previously printed items that are currently unlocked
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[300px]">
                  <div className="space-y-2">
                    {unlockedQuestions.map((question) => (
                      <motion.div
                        key={question.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center justify-between p-3 rounded-lg bg-green-500/5 border border-green-500/20"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-green-500/20 flex items-center justify-center">
                            <MessageSquare className="w-4 h-4 text-green-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium truncate max-w-[300px]">
                              {question.content.substring(0, 50)}...
                            </p>
                            <p className="text-xs text-muted-foreground">Question</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-500 border-red-500/20 hover:bg-red-500/10"
                          onClick={() => handleRelockItem(question.id, 'question')}
                        >
                          <Lock className="w-4 h-4 mr-1" />
                          Re-Lock
                        </Button>
                      </motion.div>
                    ))}
                    
                    {unlockedPapers.map((paper) => (
                      <motion.div
                        key={paper.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center justify-between p-3 rounded-lg bg-green-500/5 border border-green-500/20"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-green-500/20 flex items-center justify-center">
                            <FileText className="w-4 h-4 text-green-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{paper.title}</p>
                            <p className="text-xs text-muted-foreground">Question Paper</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-500 border-red-500/20 hover:bg-red-500/10"
                          onClick={() => handleRelockItem(paper.id, 'paper')}
                        >
                          <Lock className="w-4 h-4 mr-1" />
                          Re-Lock
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <History className="w-5 h-5 text-blue-500" />
                    Security History
                  </CardTitle>
                  <CardDescription>
                    Track all lock and unlock actions
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={historyFilter} onValueChange={(v) => setHistoryFilter(v as any)}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border border-border">
                      <SelectItem value="all">
                        <span className="flex items-center justify-between w-full gap-3">
                          All Actions
                          <Badge variant="secondary" className="ml-auto h-5 min-w-5 px-1.5">{filterCounts.all}</Badge>
                        </span>
                      </SelectItem>
                      <SelectItem value="requested">
                        <span className="flex items-center justify-between w-full gap-3">
                          Requested
                          <Badge className="ml-auto h-5 min-w-5 px-1.5 bg-amber-500/20 text-amber-600 border-amber-500/30">{filterCounts.requested}</Badge>
                        </span>
                      </SelectItem>
                      <SelectItem value="approved">
                        <span className="flex items-center justify-between w-full gap-3">
                          Approved
                          <Badge className="ml-auto h-5 min-w-5 px-1.5 bg-green-500/20 text-green-600 border-green-500/30">{filterCounts.approved}</Badge>
                        </span>
                      </SelectItem>
                      <SelectItem value="denied">
                        <span className="flex items-center justify-between w-full gap-3">
                          Denied
                          <Badge className="ml-auto h-5 min-w-5 px-1.5 bg-red-500/20 text-red-600 border-red-500/30">{filterCounts.denied}</Badge>
                        </span>
                      </SelectItem>
                      <SelectItem value="relocked">
                        <span className="flex items-center justify-between w-full gap-3">
                          Locked/Re-locked
                          <Badge className="ml-auto h-5 min-w-5 px-1.5 bg-purple-500/20 text-purple-600 border-purple-500/30">{filterCounts.relocked}</Badge>
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {/* Date Range Picker for Export */}
                  <Popover open={showExportDatePicker} onOpenChange={setShowExportDatePicker}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn(
                        "gap-1 text-xs",
                        (exportDateRange.from || exportDateRange.to) && "border-primary text-primary"
                      )}>
                        <CalendarIcon className="w-4 h-4" />
                        {exportDateRange.from ? (
                          exportDateRange.to ? (
                            <>
                              {format(exportDateRange.from, "MMM d")} - {format(exportDateRange.to, "MMM d")}
                            </>
                          ) : (
                            format(exportDateRange.from, "MMM d, yyyy")
                          )
                        ) : (
                          "Date Range"
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-background border border-border" align="end">
                      <div className="p-3 space-y-3">
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-xs"
                            onClick={() => {
                              const today = new Date();
                              const lastWeek = new Date(today);
                              lastWeek.setDate(lastWeek.getDate() - 7);
                              setExportDateRange({ from: lastWeek, to: today });
                            }}
                          >
                            Last 7 Days
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-xs"
                            onClick={() => {
                              const today = new Date();
                              const lastMonth = new Date(today);
                              lastMonth.setMonth(lastMonth.getMonth() - 1);
                              setExportDateRange({ from: lastMonth, to: today });
                            }}
                          >
                            Last 30 Days
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-xs text-muted-foreground"
                            onClick={() => setExportDateRange({ from: undefined, to: undefined })}
                          >
                            Clear
                          </Button>
                        </div>
                        <Calendar
                          mode="range"
                          selected={{ from: exportDateRange.from, to: exportDateRange.to }}
                          onSelect={(range) => setExportDateRange({ from: range?.from, to: range?.to })}
                          numberOfMonths={2}
                          className="pointer-events-auto"
                        />
                        <div className="flex justify-end">
                          <Button size="sm" onClick={() => setShowExportDatePicker(false)}>
                            Done
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  
                  {/* Export Buttons */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1">
                        <Download className="w-4 h-4" />
                        Export
                        {(exportDateRange.from || exportDateRange.to) && (
                          <Badge variant="secondary" className="ml-1 h-4 text-[10px] px-1">
                            {getExportHistory().length}
                          </Badge>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-background border border-border">
                      <DropdownMenuItem onClick={exportToCSV} className="cursor-pointer">
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Export as CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={exportToPDF} className="cursor-pointer">
                        <FileText className="w-4 h-4 mr-2" />
                        Export as PDF
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {securityHistory.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-500 border-red-500/20 hover:bg-red-500/10"
                      onClick={() => setShowClearHistoryDialog(true)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredHistory.length === 0 ? (
                <div className="text-center py-12">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", duration: 0.6 }}
                  >
                    <History className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                  </motion.div>
                  <p className="text-muted-foreground">No security history yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Lock and unlock actions will appear here
                  </p>
                </div>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500/50 via-purple-500/30 to-transparent" />
                    
                    <div className="space-y-4">
                      <AnimatePresence>
                        {filteredHistory.map((entry, index) => (
                          <motion.div
                            key={entry.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ delay: index * 0.03 }}
                            className="relative pl-12"
                          >
                            {/* Timeline dot */}
                            <motion.div
                              className="absolute left-2.5 top-3 w-5 h-5 rounded-full bg-background border-2 border-blue-500 flex items-center justify-center"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: index * 0.03 + 0.1 }}
                            >
                              {getActionIcon(entry.action)}
                            </motion.div>

                            <Card className="border-border/50 hover:border-blue-500/30 transition-colors">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                      {getActionBadge(entry.action)}
                                      <Badge variant="outline" className="text-xs">
                                        {entry.itemType === 'question' ? (
                                          <><MessageSquare className="w-3 h-3 mr-1" /> Question</>
                                        ) : (
                                          <><FileText className="w-3 h-3 mr-1" /> Paper</>
                                        )}
                                      </Badge>
                                    </div>
                                    
                                    <p className="text-sm font-medium text-foreground truncate">
                                      {entry.itemTitle}
                                    </p>
                                    
                                    {entry.reason && (
                                      <p className="text-xs text-muted-foreground mt-1 italic">
                                        Reason: {entry.reason}
                                      </p>
                                    )}
                                    
                                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        <User className="w-3 h-3" />
                                        {entry.performedBy}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {formatDate(entry.timestamp)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <ShieldAlert className="w-5 h-5" />
              Deny Unlock Request
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for denying this unlock request.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter reason for denial..."
              className="min-h-[100px]"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleRejectUnlock}
              disabled={!rejectReason.trim()}
            >
              <X className="w-4 h-4 mr-2" />
              Deny Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear History Confirmation Dialog */}
      <Dialog open={showClearHistoryDialog} onOpenChange={setShowClearHistoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <Trash2 className="w-5 h-5" />
              Clear Security History
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to clear all security history? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearHistoryDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                clearSecurityHistory();
                setShowClearHistoryDialog(false);
                toast.success('Security history cleared');
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear History
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Reject Dialog */}
      <Dialog open={showBulkRejectDialog} onOpenChange={setShowBulkRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <ShieldAlert className="w-5 h-5" />
              Deny Multiple Unlock Requests
            </DialogTitle>
            <DialogDescription>
              You are about to deny {selectedRequests.size} unlock request(s). Please provide a reason.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Textarea
              value={bulkRejectReason}
              onChange={(e) => setBulkRejectReason(e.target.value)}
              placeholder="Enter reason for denial (applies to all selected requests)..."
              className="min-h-[100px]"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkRejectDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleBulkReject}
              disabled={!bulkRejectReason.trim()}
            >
              <X className="w-4 h-4 mr-2" />
              Deny {selectedRequests.size} Request(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UnlockRequestsPanel;
