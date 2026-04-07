import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Star, 
  FileText, 
  CheckCircle, 
  XCircle,
  BarChart3,
  Users,
  ThumbsUp,
  MessageSquare,
  Download,
  Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuestionStore } from '@/stores/questionStore';
import { useQuestionPaperStore } from '@/stores/questionPaperStore';
import { useFeedbackStore, type Feedback } from '@/stores/feedbackStore';
import { toast } from 'sonner';
import { firestoreFeedbackService } from '@/services/firebase/firestore-database';

const AdminAnalytics: React.FC = () => {
  const { questions } = useQuestionStore();
  const { papers } = useQuestionPaperStore();
  const { feedbacks: localFeedbacks } = useFeedbackStore();
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [feedbacks, setFeedbacks] = useState<Feedback[]>(localFeedbacks);

  React.useEffect(() => {
    firestoreFeedbackService.getAll().then(data => {
      if (data && data.length > 0) {
        setFeedbacks(data as unknown as Feedback[]);
      }
    }).catch(console.error);
  }, []);

  // Get unique departments
  const departments = [...new Set([
    ...questions.map(q => q.department).filter(Boolean),
    ...papers.map(p => p.department).filter(Boolean),
  ])] as string[];

  // Filter by department
  const filteredQuestions = departmentFilter === 'all' 
    ? questions 
    : questions.filter(q => q.department === departmentFilter);
  
  const filteredPapers = departmentFilter === 'all'
    ? papers
    : papers.filter(p => p.department === departmentFilter);

  // Calculate stats
  const totalQuestions = filteredQuestions.length;
  const approvedQuestions = filteredQuestions.filter(q => q.status === 'approved').length;
  const rejectedQuestions = filteredQuestions.filter(q => q.status === 'rejected').length;
  const pendingQuestions = filteredQuestions.filter(q => q.status === 'pending').length;

  const totalPapers = filteredPapers.length;
  const approvedPapers = filteredPapers.filter(p => p.status === 'approved').length;
  const rejectedPapers = filteredPapers.filter(p => p.status === 'rejected').length;

  const approvalRate = totalQuestions > 0 ? Math.round((approvedQuestions / totalQuestions) * 100) : 0;

  // Feedback stats
  const staffFeedbacks = feedbacks.filter(f => f.userType === 'staff');
  const hodFeedbacks = feedbacks.filter(f => f.userType === 'hod');
  const publicFeedbacks = feedbacks.filter(f => !f.userType || f.userType === 'public');

  const avgRating = feedbacks.length > 0 
    ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1)
    : '0.0';

  // Questions by difficulty
  const easyQuestions = filteredQuestions.filter(q => q.difficulty === 'easy').length;
  const mediumQuestions = filteredQuestions.filter(q => q.difficulty === 'medium').length;
  const hardQuestions = filteredQuestions.filter(q => q.difficulty === 'hard').length;

  // Questions by source
  const uploadQuestions = filteredQuestions.filter(q => q.source === 'upload').length;
  const aiQuestions = filteredQuestions.filter(q => q.source === 'ai-assistant').length;

  // Export to CSV
  const exportToCSV = (type: 'questions' | 'papers' | 'feedbacks' | 'all') => {
    let csvContent = '';
    let filename = '';

    if (type === 'questions' || type === 'all') {
      csvContent += 'QUESTIONS DATA\n';
      csvContent += 'ID,Content,Type,Difficulty,Status,Department,Source,Created At\n';
      filteredQuestions.forEach(q => {
        csvContent += `"${q.id}","${q.content.replace(/"/g, '""')}","${q.type}","${q.difficulty}","${q.status}","${q.department || 'N/A'}","${q.source}","${new Date(q.createdAt).toISOString()}"\n`;
      });
      csvContent += '\n';
    }

    if (type === 'papers' || type === 'all') {
      csvContent += 'PAPERS DATA\n';
      csvContent += 'ID,Title,Course Name,Course Code,Exam Type,Status,Department,Max Marks,Created At\n';
      filteredPapers.forEach(p => {
        csvContent += `"${p.id}","${p.title.replace(/"/g, '""')}","${p.courseName}","${p.courseCode}","${p.examType}","${p.status}","${p.department || 'N/A'}","${p.maxMarks}","${new Date(p.createdAt).toISOString()}"\n`;
      });
      csvContent += '\n';
    }

    if (type === 'feedbacks' || type === 'all') {
      csvContent += 'FEEDBACKS DATA\n';
      csvContent += 'ID,User Type,Rating,Comment,Institute,Created At\n';
      feedbacks.forEach(f => {
        csvContent += `"${f.id}","${f.userType || 'Public'}","${f.rating}","${f.comment.replace(/"/g, '""')}","${f.instituteName || 'N/A'}","${new Date(f.createdAt).toISOString()}"\n`;
      });
    }

    filename = type === 'all' ? 'analytics_export.csv' : `${type}_export.csv`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    
    toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} exported successfully`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Analytics Dashboard</h2>
          <p className="text-muted-foreground">Monitor platform performance, feedback trends, and usage statistics</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Department Filter */}
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map(dept => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Export Buttons */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => exportToCSV('questions')}>
              <Download className="w-4 h-4 mr-2" />
              Questions
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportToCSV('papers')}>
              <Download className="w-4 h-4 mr-2" />
              Papers
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportToCSV('feedbacks')}>
              <Download className="w-4 h-4 mr-2" />
              Feedbacks
            </Button>
            <Button size="sm" onClick={() => exportToCSV('all')}>
              <Download className="w-4 h-4 mr-2" />
              Export All
            </Button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Questions</p>
                <p className="text-3xl font-bold text-foreground">{totalQuestions}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approval Rate</p>
                <p className="text-3xl font-bold text-foreground">{approvalRate}%</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Rating</p>
                <p className="text-3xl font-bold text-foreground flex items-center gap-1">
                  {avgRating} <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                <Star className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Feedbacks</p>
                <p className="text-3xl font-bold text-foreground">{feedbacks.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Question Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Question Status Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Approved</span>
                <span className="text-sm font-medium text-green-600">{approvedQuestions}</span>
              </div>
              <Progress value={totalQuestions > 0 ? (approvedQuestions / totalQuestions) * 100 : 0} className="h-2 bg-muted [&>div]:bg-green-500" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pending</span>
                <span className="text-sm font-medium text-amber-600">{pendingQuestions}</span>
              </div>
              <Progress value={totalQuestions > 0 ? (pendingQuestions / totalQuestions) * 100 : 0} className="h-2 bg-muted [&>div]:bg-amber-500" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Rejected</span>
                <span className="text-sm font-medium text-red-600">{rejectedQuestions}</span>
              </div>
              <Progress value={totalQuestions > 0 ? (rejectedQuestions / totalQuestions) * 100 : 0} className="h-2 bg-muted [&>div]:bg-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              Feedback by User Type
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm font-medium">Staff Feedback</span>
              <Badge variant="secondary">{staffFeedbacks.length}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm font-medium">HOD Feedback</span>
              <Badge variant="secondary">{hodFeedbacks.length}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm font-medium">Public Feedback</span>
              <Badge variant="secondary">{publicFeedbacks.length}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Questions by Difficulty & Source */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Questions by Difficulty</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-xl bg-green-500/10">
                <p className="text-3xl font-bold text-green-600">{easyQuestions}</p>
                <p className="text-sm text-muted-foreground">Easy</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-amber-500/10">
                <p className="text-3xl font-bold text-amber-600">{mediumQuestions}</p>
                <p className="text-sm text-muted-foreground">Medium</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-red-500/10">
                <p className="text-3xl font-bold text-red-600">{hardQuestions}</p>
                <p className="text-sm text-muted-foreground">Hard</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Questions by Source</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 rounded-xl bg-blue-500/10">
                <p className="text-3xl font-bold text-blue-600">{uploadQuestions}</p>
                <p className="text-sm text-muted-foreground">From Uploads</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-purple-500/10">
                <p className="text-3xl font-bold text-purple-600">{aiQuestions}</p>
                <p className="text-sm text-muted-foreground">AI Generated</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Feedbacks */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Recent Feedbacks</CardTitle>
          <CardDescription>Latest feedback from users</CardDescription>
        </CardHeader>
        <CardContent>
          {feedbacks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No feedback received yet
            </div>
          ) : (
            <div className="space-y-3">
                {feedbacks.slice(0, 5).map((feedback) => (
                  <motion.div
                    key={feedback.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-muted/30 border border-border/50"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {feedback.userType || 'Public'}
                        </Badge>
                        {feedback.instituteName && (
                          <span className="text-xs text-muted-foreground">{feedback.instituteName}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${star <= feedback.rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted'}`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-foreground">{feedback.comment}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(feedback.createdAt).toLocaleDateString()}
                    </p>
                  </motion.div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAnalytics;
