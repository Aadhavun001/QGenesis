import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  Trash2, 
  CheckCheck, 
  Eye,
  Filter,
  Building,
  Users,
  FileText,
  MessageSquare,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useQuestionStore, Notification, GeneratedQuestion } from '@/stores/questionStore';
import { useQuestionPaperStore, QuestionPaper } from '@/stores/questionPaperStore';
import { toast } from 'sonner';

const AdminNotifications: React.FC = () => {
  const { 
    notifications, 
    questions,
    markNotificationRead, 
    markAllNotificationsRead, 
    deleteNotification, 
    deleteAllNotifications 
  } = useQuestionStore();
  const { papers } = useQuestionPaperStore();
  
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [showPaperDialog, setShowPaperDialog] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<GeneratedQuestion | null>(null);
  const [selectedPaper, setSelectedPaper] = useState<QuestionPaper | null>(null);

  // Get unique departments from notifications
  const departments = [...new Set(notifications.filter(n => n.department).map(n => n.department!))];

  // Filter notifications - admin sees all
  const filteredNotifications = notifications.filter(n => {
    if (roleFilter !== 'all' && n.fromRole !== roleFilter) return false;
    if (departmentFilter !== 'all' && n.department !== departmentFilter) return false;
    return true;
  });

  const unreadCount = filteredNotifications.filter(n => !n.isRead).length;

  const handleMarkAllRead = () => {
    // Mark all visible notifications as read
    filteredNotifications.forEach(n => markNotificationRead(n.id));
    toast.success('All notifications marked as read');
  };

  const handleDeleteAll = () => {
    // Delete all visible notifications
    filteredNotifications.forEach(n => deleteNotification(n.id));
    toast.success('All notifications deleted');
  };

  const viewQuestion = (notification: Notification) => {
    if (notification.questionId) {
      const question = questions.find(q => q.id === notification.questionId);
      if (question) {
        setSelectedQuestion(question);
        setShowQuestionDialog(true);
      }
    }
    markNotificationRead(notification.id);
  };

  const viewPaper = (notification: Notification) => {
    if (notification.paperId) {
      const paper = papers.find(p => p.id === notification.paperId);
      if (paper) {
        setSelectedPaper(paper);
        setShowPaperDialog(true);
      }
    }
    markNotificationRead(notification.id);
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeIcon = (type: Notification['type']) => {
    switch (type) {
      case 'approval': return <CheckCheck className="w-4 h-4 text-green-500" />;
      case 'rejection': return <Trash2 className="w-4 h-4 text-red-500" />;
      case 'request': return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'print-ready': return <FileText className="w-4 h-4 text-purple-500" />;
      case 'reply': return <MessageSquare className="w-4 h-4 text-cyan-500" />;
      default: return <Bell className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-orange-500/10 text-orange-600';
      case 'hod': return 'bg-purple-500/10 text-purple-600';
      default: return 'bg-blue-500/10 text-blue-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 pb-4">
        <div className="pb-4">
          <h2 className="text-2xl font-bold text-foreground">All Notifications</h2>
          <p className="text-muted-foreground mt-2">
            View all notifications across the platform ({unreadCount} unread)
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handleMarkAllRead} disabled={unreadCount === 0}>
            <CheckCheck className="w-4 h-4 mr-2" />
            Mark All Read
          </Button>
          <Button variant="outline" className="text-destructive" onClick={handleDeleteAll} disabled={filteredNotifications.length === 0}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete All
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="hod">HOD</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-muted-foreground" />
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </CardTitle>
          <CardDescription>
            {filteredNotifications.length} notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No notifications found
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {filteredNotifications.map((notification, index) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: index * 0.03 }}
                      className={`p-4 rounded-xl border transition-all ${
                        notification.isRead 
                          ? 'bg-muted/20 border-border/50' 
                          : 'bg-primary/5 border-primary/20'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          {getTypeIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-medium text-foreground">{notification.title}</p>
                            {!notification.isRead && (
                              <Badge variant="default" className="text-xs">New</Badge>
                            )}
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={getRoleBadgeColor(notification.fromRole)}>
                              From: {notification.fromRole.toUpperCase()}
                            </Badge>
                            <Badge className={getRoleBadgeColor(notification.toRole)}>
                              To: {notification.toRole.toUpperCase()}
                            </Badge>
                            {notification.department && (
                              <Badge variant="outline">
                                <Building className="w-3 h-3 mr-1" />
                                {notification.department}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(notification.createdAt)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {notification.questionId && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => viewQuestion(notification)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Question
                            </Button>
                          )}
                          {notification.paperId && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => viewPaper(notification)}
                            >
                              <FileText className="w-4 h-4 mr-1" />
                              Paper
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              deleteNotification(notification.id);
                              toast.success('Notification deleted');
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Question View Dialog */}
      <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Question Details</DialogTitle>
            <DialogDescription>View generated question with answer</DialogDescription>
          </DialogHeader>
          {selectedQuestion && (
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <Badge variant="secondary">{selectedQuestion.type}</Badge>
                <Badge variant="outline">{selectedQuestion.marks} marks</Badge>
                <Badge variant="outline">{selectedQuestion.difficulty}</Badge>
                <Badge variant="outline">{selectedQuestion.bloomsLevel}</Badge>
                <Badge variant={selectedQuestion.status === 'approved' ? 'default' : 'secondary'}>
                  {selectedQuestion.status}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold">Question:</h4>
                <p className="text-sm p-3 bg-muted/30 rounded-lg">{selectedQuestion.content}</p>
              </div>

              {selectedQuestion.options && selectedQuestion.options.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Options:</h4>
                  <div className="space-y-1">
                    {selectedQuestion.options.map((opt, i) => (
                      <p key={i} className={`text-sm p-2 rounded ${
                        selectedQuestion.correctOption === i 
                          ? 'bg-green-500/10 text-green-600 font-medium' 
                          : 'bg-muted/30'
                      }`}>
                        {String.fromCharCode(65 + i)}. {opt}
                        {selectedQuestion.correctOption === i && ' ✓'}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h4 className="font-semibold">Answer:</h4>
                <p className="text-sm p-3 bg-green-500/10 rounded-lg text-green-700 dark:text-green-400">
                  {selectedQuestion.answer}
                </p>
              </div>

              <div className="text-xs text-muted-foreground">
                Topic: {selectedQuestion.topic} • Source: {selectedQuestion.source}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuestionDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Paper View Dialog */}
      <Dialog open={showPaperDialog} onOpenChange={setShowPaperDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Question Paper</DialogTitle>
            <DialogDescription>View question paper with all sections</DialogDescription>
          </DialogHeader>
          {selectedPaper && (
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <Badge variant="secondary">{selectedPaper.examType}</Badge>
                <Badge variant="outline">{selectedPaper.maxMarks} marks</Badge>
                <Badge variant="outline">{selectedPaper.duration}</Badge>
                <Badge variant={selectedPaper.status === 'approved' ? 'default' : 'secondary'}>
                  {selectedPaper.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Course:</span> {selectedPaper.courseName}</div>
                <div><span className="text-muted-foreground">Code:</span> {selectedPaper.courseCode}</div>
                <div><span className="text-muted-foreground">Semester:</span> {selectedPaper.semester}</div>
                <div><span className="text-muted-foreground">College:</span> {selectedPaper.collegeName}</div>
              </div>

              {selectedPaper.sections.map((section, sIndex) => (
                <div key={section.id} className="border border-border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">{section.name}</h4>
                  {section.instructions && (
                    <p className="text-sm text-muted-foreground mb-3">{section.instructions}</p>
                  )}
                  <div className="space-y-2">
                    {section.questions.map((q) => (
                      <div key={q.id} className="p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-start gap-2">
                          <span className="font-medium">{q.questionNo}.</span>
                          <div className="flex-1">
                            <p className="text-sm">{q.content}</p>
                            {q.answer && (
                              <div className="mt-2 p-2 bg-green-500/10 rounded text-sm text-green-700 dark:text-green-400">
                                <span className="font-medium">Answer:</span> {q.answer}
                              </div>
                            )}
                            <div className="flex gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">{q.marks} marks</Badge>
                              <Badge variant="outline" className="text-xs">BTL: {q.btl}</Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaperDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminNotifications;