import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  History, 
  CheckCircle, 
  XCircle,
  Search,
  Calendar,
  MessageSquare,
  Trash2,
  CheckCheck,
  Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuestionStore, GeneratedQuestion } from '@/stores/questionStore';
import { useQuestionPaperStore, QuestionPaper } from '@/stores/questionPaperStore';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface HistoryItem {
  id: string;
  type: 'question' | 'paper';
  title: string;
  content: string;
  status: string;
  feedback?: string;
  department?: string;
  updatedAt: Date;
  isRead?: boolean;
}

const HodApprovalHistory: React.FC = () => {
  const { user } = useAuth();
  const { questions, updateQuestion } = useQuestionStore();
  const { papers, updatePaper } = useQuestionPaperStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [readItems, setReadItems] = useState<Set<string>>(new Set());

  const hodDepartment = user?.department;

  // Combine questions and papers into history items
  const getHistoryItems = (): HistoryItem[] => {
    const items: HistoryItem[] = [];

    // Add processed questions
    questions
      .filter(q => {
        const departmentMatch = !hodDepartment || !q.department || q.department === hodDepartment;
        return (q.status === 'approved' || q.status === 'rejected') && departmentMatch;
      })
      .forEach(q => {
        items.push({
          id: q.id,
          type: 'question',
          title: q.topic,
          content: q.content,
          status: q.status,
          feedback: q.feedback,
          department: q.department,
          updatedAt: q.updatedAt,
          isRead: readItems.has(q.id),
        });
      });

    // Add processed papers
    papers
      .filter(p => {
        const departmentMatch = !hodDepartment || !p.department || p.department === hodDepartment;
        return (p.status === 'approved' || p.status === 'rejected' || p.status === 'print-ready') && departmentMatch;
      })
      .forEach(p => {
        items.push({
          id: p.id,
          type: 'paper',
          title: p.title,
          content: `${p.courseName} (${p.courseCode}) - ${p.examType}`,
          status: p.status,
          feedback: p.feedback,
          department: p.department,
          updatedAt: p.updatedAt,
          isRead: readItems.has(p.id),
        });
      });

    return items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  };

  const historyItems = getHistoryItems();
  const approvedItems = historyItems.filter(i => i.status === 'approved' || i.status === 'print-ready');
  const rejectedItems = historyItems.filter(i => i.status === 'rejected');
  const unreadCount = historyItems.filter(i => !i.isRead).length;

  const filterBySearch = (items: HistoryItem[]) => {
    if (!searchQuery) return items;
    return items.filter(i => 
      i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleMarkAsRead = (id: string) => {
    setReadItems(prev => new Set([...prev, id]));
  };

  const handleMarkAllAsRead = () => {
    const allIds = historyItems.map(i => i.id);
    setReadItems(new Set(allIds));
    toast.success('All items marked as read');
  };

  const handleDeleteItem = (item: HistoryItem) => {
    if (item.type === 'question') {
      // Reset question to draft status (effectively removing from history)
      updateQuestion(item.id, { status: 'draft', feedback: undefined });
    } else {
      updatePaper(item.id, { status: 'draft', feedback: undefined });
    }
    toast.success('Item removed from history');
  };

  const handleDeleteAll = () => {
    historyItems.forEach(item => {
      if (item.type === 'question') {
        updateQuestion(item.id, { status: 'draft', feedback: undefined });
      } else {
        updatePaper(item.id, { status: 'draft', feedback: undefined });
      }
    });
    toast.success('All history cleared');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Approval History</h2>
          <p className="text-muted-foreground">
            Track all approvals and rejections for {hodDepartment || 'your department'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
          >
            <CheckCheck className="w-4 h-4 mr-2" />
            Mark All Read
          </Button>
          <Button 
            variant="destructive" 
            size="sm"
            onClick={handleDeleteAll}
            disabled={historyItems.length === 0}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete All
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-border/50 bg-gradient-to-br from-green-500/10 to-emerald-500/10">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                  <CheckCircle className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Approved</p>
                  <p className="text-3xl font-bold text-green-500">{approvedItems.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-border/50 bg-gradient-to-br from-red-500/10 to-rose-500/10">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center">
                  <XCircle className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Rejected</p>
                  <p className="text-3xl font-bold text-red-500">{rejectedItems.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by title or content..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all" className="gap-2">
            <History className="w-4 h-4" />
            All ({historyItems.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-2">
            <CheckCircle className="w-4 h-4" />
            Approved ({approvedItems.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-2">
            <XCircle className="w-4 h-4" />
            Rejected ({rejectedItems.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <HistoryList 
            items={filterBySearch(historyItems)} 
            formatDate={formatDate}
            onMarkAsRead={handleMarkAsRead}
            onDelete={handleDeleteItem}
          />
        </TabsContent>

        <TabsContent value="approved" className="mt-6">
          <HistoryList 
            items={filterBySearch(approvedItems)} 
            formatDate={formatDate}
            onMarkAsRead={handleMarkAsRead}
            onDelete={handleDeleteItem}
          />
        </TabsContent>

        <TabsContent value="rejected" className="mt-6">
          <HistoryList 
            items={filterBySearch(rejectedItems)} 
            formatDate={formatDate}
            onMarkAsRead={handleMarkAsRead}
            onDelete={handleDeleteItem}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

interface HistoryListProps {
  items: HistoryItem[];
  formatDate: (date: Date) => string;
  onMarkAsRead: (id: string) => void;
  onDelete: (item: HistoryItem) => void;
}

const HistoryList: React.FC<HistoryListProps> = ({ items, formatDate, onMarkAsRead, onDelete }) => {
  if (items.length === 0) {
    return (
      <Card className="border-border/50 border-dashed">
        <CardContent className="p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <History className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">No history found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className={`border-border/50 hover:shadow-md transition-shadow ${!item.isRead ? 'bg-primary/5' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    item.status === 'approved' || item.status === 'print-ready'
                      ? 'bg-green-500/10' 
                      : 'bg-red-500/10'
                  }`}>
                    {item.status === 'approved' || item.status === 'print-ready' ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={item.status === 'approved' || item.status === 'print-ready'
                            ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                            : 'bg-red-500/10 text-red-500 border-red-500/20'
                          }
                        >
                          {item.status}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {item.type}
                        </Badge>
                        {!item.isRead && (
                          <span className="w-2 h-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(item.updatedAt)}
                      </span>
                    </div>
                    
                    <p className="font-medium text-foreground">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.content}</p>
                    
                    {item.department && (
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        {item.department}
                      </Badge>
                    )}
                    
                    {item.feedback && (
                      <div className="p-3 rounded-lg bg-muted/50 border border-border/50 mt-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <MessageSquare className="w-4 h-4" />
                          Feedback Provided
                        </div>
                        <p className="text-sm">{item.feedback}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {!item.isRead && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => onMarkAsRead(item.id)}
                        title="Mark as read"
                      >
                        <CheckCheck className="w-4 h-4 text-green-500" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => onDelete(item)}
                      title="Delete from history"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default HodApprovalHistory;