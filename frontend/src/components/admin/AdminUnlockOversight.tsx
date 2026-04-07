import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  Lock, 
  Unlock,
  Building2,
  Building,
  MapPin,
  Clock,
  User,
  FileText,
  Filter,
  Search,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Eye,
  History,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuestionStore } from '@/stores/questionStore';
import { useQuestionPaperStore, SecurityHistoryEntry } from '@/stores/questionPaperStore';

const AdminUnlockOversight: React.FC = () => {
  const { notifications, questions } = useQuestionStore();
  const { papers, securityHistory } = useQuestionPaperStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [institutionFilter, setInstitutionFilter] = useState<string>('all');
  const [placeFilter, setPlaceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Get all pending unlock requests (no department filtering - admin sees all)
  const allUnlockRequests = notifications.filter(n => 
    n.type === 'request' && 
    n.toRole === 'hod' && 
    n.title?.includes('Unlock Request')
  );

  // Extract unique values for filters
  const uniqueDepartments = useMemo(() => {
    const depts = new Set<string>();
    allUnlockRequests.forEach(r => r.department && depts.add(r.department));
    securityHistory.forEach(h => h.department && depts.add(h.department));
    return Array.from(depts).sort();
  }, [allUnlockRequests, securityHistory]);

  const uniqueInstitutions = useMemo(() => {
    const insts = new Set<string>();
    allUnlockRequests.forEach(r => (r as any).institution && insts.add((r as any).institution));
    securityHistory.forEach(h => (h as any).institution && insts.add((h as any).institution));
    return Array.from(insts).sort();
  }, [allUnlockRequests, securityHistory]);

  const uniquePlaces = useMemo(() => {
    const places = new Set<string>();
    allUnlockRequests.forEach(r => (r as any).place && places.add((r as any).place));
    securityHistory.forEach(h => (h as any).place && places.add((h as any).place));
    return Array.from(places).sort();
  }, [allUnlockRequests, securityHistory]);

  // Apply filters to unlock requests
  const filteredUnlockRequests = useMemo(() => {
    return allUnlockRequests.filter(req => {
      if (departmentFilter !== 'all' && req.department !== departmentFilter) return false;
      if (institutionFilter !== 'all' && (req as any).institution !== institutionFilter) return false;
      if (placeFilter !== 'all' && (req as any).place !== placeFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = req.title?.toLowerCase().includes(query);
        const matchesMessage = req.message?.toLowerCase().includes(query);
        const matchesDepartment = req.department?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesMessage && !matchesDepartment) return false;
      }
      return true;
    });
  }, [allUnlockRequests, departmentFilter, institutionFilter, placeFilter, searchQuery]);

  // Apply filters to security history
  const filteredHistory = useMemo(() => {
    const questionIds = new Set(questions.map((q) => q.id));
    const paperIds = new Set(papers.map((p) => p.id));
    return securityHistory.filter(entry => {
      if (entry.itemType === 'question' && !questionIds.has(entry.itemId)) return false;
      if (entry.itemType === 'paper' && !paperIds.has(entry.itemId)) return false;
      if (departmentFilter !== 'all' && entry.department !== departmentFilter) return false;
      if (institutionFilter !== 'all' && (entry as any).institution !== institutionFilter) return false;
      if (placeFilter !== 'all' && (entry as any).place !== placeFilter) return false;
      if (statusFilter !== 'all') {
        if (statusFilter === 'locked' && entry.action !== 'locked') return false;
        if (statusFilter === 'unlocked' && entry.action !== 'unlock_approved' && entry.action !== 'unlocked') return false;
        if (statusFilter === 'denied' && entry.action !== 'unlock_denied') return false;
        if (statusFilter === 'relocked' && entry.action !== 'relocked') return false;
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = entry.itemTitle?.toLowerCase().includes(query);
        const matchesPerformer = entry.performedBy?.toLowerCase().includes(query);
        const matchesDepartment = entry.department?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesPerformer && !matchesDepartment) return false;
      }
      return true;
    });
  }, [securityHistory, questions, papers, departmentFilter, institutionFilter, placeFilter, statusFilter, searchQuery]);

  // Stats
  const stats = useMemo(() => ({
    totalPending: allUnlockRequests.length,
    totalApproved: securityHistory.filter(h => h.action === 'unlock_approved' || h.action === 'unlocked').length,
    totalDenied: securityHistory.filter(h => h.action === 'unlock_denied').length,
    totalRelocked: securityHistory.filter(h => h.action === 'relocked').length,
  }), [allUnlockRequests, securityHistory]);

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
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
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Approved</Badge>;
      case 'unlock_requested':
        return <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30">Pending</Badge>;
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

  const clearFilters = () => {
    setSearchQuery('');
    setDepartmentFilter('all');
    setInstitutionFilter('all');
    setPlaceFilter('all');
    setStatusFilter('all');
  };

  const hasActiveFilters = searchQuery || departmentFilter !== 'all' || institutionFilter !== 'all' || placeFilter !== 'all' || statusFilter !== 'all';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <motion.div
          className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center shadow-lg"
          animate={{ 
            boxShadow: [
              '0 0 0 0 rgba(139, 92, 246, 0.4)',
              '0 0 0 10px rgba(139, 92, 246, 0)',
            ]
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <ShieldCheck className="w-6 h-6 text-white" />
        </motion.div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Unlock Oversight</h2>
          <p className="text-sm text-muted-foreground">
            Monitor all unlock requests across departments, institutions, and locations
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalPending}</p>
                <p className="text-xs text-muted-foreground">Pending Requests</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Unlock className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalApproved}</p>
                <p className="text-xs text-muted-foreground">Total Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <X className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalDenied}</p>
                <p className="text-xs text-muted-foreground">Total Denied</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-500/30 bg-purple-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalRelocked}</p>
                <p className="text-xs text-muted-foreground">Re-Locked Items</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search requests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[180px]">
                <Building2 className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {uniqueDepartments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={institutionFilter} onValueChange={setInstitutionFilter}>
              <SelectTrigger className="w-[180px]">
                <Building className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Institution" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Institutions</SelectItem>
                {uniqueInstitutions.map(inst => (
                  <SelectItem key={inst} value={inst}>{inst}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={placeFilter} onValueChange={setPlaceFilter}>
              <SelectTrigger className="w-[180px]">
                <MapPin className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Place" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Places</SelectItem>
                {uniquePlaces.map(place => (
                  <SelectItem key={place} value={place}>{place}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters} className="gap-2">
                <X className="w-4 h-4" />
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Requests and History */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Pending Requests
            {filteredUnlockRequests.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {filteredUnlockRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Security History
            {filteredHistory.length > 0 && (
              <Badge variant="outline" className="ml-1">
                {filteredHistory.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">All Pending Unlock Requests</CardTitle>
              <CardDescription>
                Cross-department view of all pending unlock requests awaiting HOD approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredUnlockRequests.length === 0 ? (
                <div className="text-center py-12">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring" }}
                  >
                    <ShieldCheck className="w-16 h-16 mx-auto text-green-500 mb-4" />
                  </motion.div>
                  <p className="text-lg font-medium text-foreground mb-2">All Clear!</p>
                  <p className="text-muted-foreground">
                    {hasActiveFilters 
                      ? 'No pending requests match your filters'
                      : 'No pending unlock requests across any department'
                    }
                  </p>
                </div>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <div className="space-y-3">
                    <AnimatePresence>
                      {filteredUnlockRequests.map((request, index) => {
                        const isQuestion = request.questionId != null;
                        const item = isQuestion 
                          ? questions.find(q => q.id === request.questionId)
                          : papers.find(p => p.id === request.paperId);

                        return (
                          <motion.div
                            key={request.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                          >
                            <Card className="border-amber-500/20 bg-amber-500/5">
                              <CardContent className="p-4">
                                <div className="flex items-start gap-4">
                                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                                    {isQuestion ? (
                                      <FileText className="w-5 h-5 text-amber-500" />
                                    ) : (
                                      <FileText className="w-5 h-5 text-amber-500" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                      <Badge variant="outline" className="bg-background">
                                        {isQuestion ? 'Question' : 'Paper'}
                                      </Badge>
                                      <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30">
                                        Pending HOD Approval
                                      </Badge>
                                    </div>
                                    <p className="font-medium text-foreground truncate">
                                      {request.title}
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {request.message}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
                                      {request.department && (
                                        <span className="flex items-center gap-1">
                                          <Building2 className="w-3 h-3" />
                                          {request.department}
                                        </span>
                                      )}
                                      {(request as any).institution && (
                                        <span className="flex items-center gap-1">
                                          <Building className="w-3 h-3" />
                                          {(request as any).institution}
                                        </span>
                                      )}
                                      {(request as any).place && (
                                        <span className="flex items-center gap-1">
                                          <MapPin className="w-3 h-3" />
                                          {(request as any).place}
                                        </span>
                                      )}
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {formatDate(request.createdAt)}
                                      </span>
                                    </div>
                                  </div>
                                  <Button variant="outline" size="sm" className="gap-2">
                                    <Eye className="w-4 h-4" />
                                    View
                                  </Button>
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
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card className="border-border/50">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Security History</CardTitle>
                <CardDescription>
                  Complete audit trail of all lock/unlock actions across the platform
                </CardDescription>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="locked">Locked</SelectItem>
                  <SelectItem value="unlocked">Unlocked</SelectItem>
                  <SelectItem value="denied">Denied</SelectItem>
                  <SelectItem value="relocked">Re-Locked</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {filteredHistory.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-foreground mb-2">No History</p>
                  <p className="text-muted-foreground">
                    {hasActiveFilters 
                      ? 'No history entries match your filters'
                      : 'No security actions have been recorded yet'
                    }
                  </p>
                </div>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <div className="space-y-2">
                    {filteredHistory
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .map((entry, index) => (
                        <motion.div
                          key={entry.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            {getActionIcon(entry.action)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              {getActionBadge(entry.action)}
                              <Badge variant="outline" className="text-xs">
                                {entry.itemType}
                              </Badge>
                            </div>
                            <p className="text-sm text-foreground truncate mt-1">
                              {entry.itemTitle}
                            </p>
                            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {entry.performedBy} ({entry.performedByRole})
                              </span>
                              {entry.department && (
                                <span className="flex items-center gap-1">
                                  <Building2 className="w-3 h-3" />
                                  {entry.department}
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(entry.timestamp)}
                          </p>
                        </motion.div>
                      ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminUnlockOversight;
