import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  History, 
  CheckCircle, 
  XCircle,
  Search,
  Calendar,
  MessageSquare
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuestionStore } from '@/stores/questionStore';

const ApprovalHistory: React.FC = () => {
  const { questions } = useQuestionStore();
  const [searchQuery, setSearchQuery] = useState('');

  const approvedQuestions = questions.filter(q => q.status === 'approved');
  const rejectedQuestions = questions.filter(q => q.status === 'rejected');
  const allProcessed = [...approvedQuestions, ...rejectedQuestions].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const filterBySearch = (items: typeof questions) => {
    if (!searchQuery) return items;
    return items.filter(q => 
      q.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.topic.toLowerCase().includes(searchQuery.toLowerCase())
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Approval History</h2>
        <p className="text-muted-foreground">Track the status of your submitted questions</p>
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
                  <p className="text-3xl font-bold text-green-500">{approvedQuestions.length}</p>
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
                  <p className="text-3xl font-bold text-red-500">{rejectedQuestions.length}</p>
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
          placeholder="Search by question content or topic..."
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
            All ({allProcessed.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-2">
            <CheckCircle className="w-4 h-4" />
            Approved ({approvedQuestions.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-2">
            <XCircle className="w-4 h-4" />
            Rejected ({rejectedQuestions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <HistoryList items={filterBySearch(allProcessed)} formatDate={formatDate} />
        </TabsContent>

        <TabsContent value="approved" className="mt-6">
          <HistoryList items={filterBySearch(approvedQuestions)} formatDate={formatDate} />
        </TabsContent>

        <TabsContent value="rejected" className="mt-6">
          <HistoryList items={filterBySearch(rejectedQuestions)} formatDate={formatDate} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

interface HistoryListProps {
  items: Array<{
    id: string;
    content: string;
    topic: string;
    status: string;
    feedback?: string;
    updatedAt: Date;
  }>;
  formatDate: (date: Date) => string;
}

const HistoryList: React.FC<HistoryListProps> = ({ items, formatDate }) => {
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
      {items.map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Card className="border-border/50 hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  item.status === 'approved' 
                    ? 'bg-green-500/10' 
                    : 'bg-red-500/10'
                }`}>
                  {item.status === 'approved' ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge 
                      variant="outline" 
                      className={item.status === 'approved' 
                        ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                        : 'bg-red-500/10 text-red-500 border-red-500/20'
                      }
                    >
                      {item.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(item.updatedAt)}
                    </span>
                  </div>
                  
                  <p className="text-foreground">{item.content}</p>
                  
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    {item.topic}
                  </Badge>
                  
                  {item.feedback && (
                    <div className="p-3 rounded-lg bg-muted/50 border border-border/50 mt-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <MessageSquare className="w-4 h-4" />
                        HOD Feedback
                      </div>
                      <p className="text-sm">{item.feedback}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

export default ApprovalHistory;