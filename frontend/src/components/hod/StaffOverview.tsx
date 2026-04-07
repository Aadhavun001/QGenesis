import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  FileText, 
  MessageSquare,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useQuestionStore } from '@/stores/questionStore';
import { useQuestionPaperStore } from '@/stores/questionPaperStore';
import { useAuth } from '@/contexts/AuthContext';
import { isFirebaseConfigured } from '@/services/firebase/firestore-config';
import { firestoreUserService } from '@/services/firebase/firestore-database';

interface StaffStats {
  staffId: string;
  staffName: string;
  department: string;
  totalQuestions: number;
  approvedQuestions: number;
  pendingQuestions: number;
  rejectedQuestions: number;
  totalPapers: number;
  approvedPapers: number;
}

const StaffOverview: React.FC = () => {
  const { user } = useAuth();
  const { questions } = useQuestionStore();
  const { papers } = useQuestionPaperStore();

  const [userNameById, setUserNameById] = useState<Record<string, string>>({});

  useEffect(() => {
    let mounted = true;
    if (isFirebaseConfigured()) {
      const dept = user?.department;
      const inst = (user as any)?.institution;
      const place = (user as any)?.place;

      const fetchUsers = dept
        ? firestoreUserService.getByDepartment(dept, inst, place)
        : firestoreUserService.getAll();

      fetchUsers.then((users) => {
        if (!mounted) return;
        const map: Record<string, string> = {};
        users.forEach((u: any) => {
          if (!u?.id) return;
          const displayName = (u.displayName || '').trim();
          const email = (u.email || '').trim();
          const emailName = email.includes('@') ? email.split('@')[0] : '';
          // If displayName looks like a generated username (e.g. staffuser1), prefer email prefix.
          const isGeneric = /^staff/i.test(displayName) && displayName.replace(/\s+/g, '').length <= 10;
          map[u.id] = (!isGeneric && displayName) ? displayName : (emailName || displayName || email || u.id);
        });
        setUserNameById(map);
      }).catch(() => {});
    } else {
      try {
        const managedUsers = JSON.parse(localStorage.getItem('qgenesis-managed-users') || '[]');
        const registeredUsers = JSON.parse(localStorage.getItem('qgenesis-registered-users') || '[]');
        const allUsers = [...managedUsers, ...registeredUsers];
        const map: Record<string, string> = {};
        allUsers.forEach((u: any) => {
          if (!u?.id) return;
          const displayName = (u.displayName || '').trim();
          const email = (u.email || '').trim();
          const emailName = email.includes('@') ? email.split('@')[0] : '';
          const isGeneric = /^staff/i.test(displayName) && displayName.replace(/\s+/g, '').length <= 10;
          map[u.id] = (!isGeneric && displayName) ? displayName : (emailName || displayName || email || u.id);
        });
        setUserNameById(map);
      } catch {}
    }
    return () => { mounted = false; };
  }, [user?.department, (user as any)?.institution, (user as any)?.place]);

  // Get unique staff from questions and papers matching HOD's department
  const getStaffStats = (): StaffStats[] => {
    const staffMap = new Map<string, StaffStats>();
    const hodDepartment = user?.department;

    const getStaffName = (staffId: string | undefined): string => {
      if (!staffId || staffId === 'unknown') return 'Unknown Staff';
      return userNameById[staffId] || `Staff ${staffId.slice(-4)}`;
    };

    // Process questions
    questions.forEach(q => {
      // Filter by department if HOD has a department
      if (hodDepartment && q.department && q.department !== hodDepartment) {
        return;
      }

      const staffId = q.staffId || 'unknown';
      const hintedName = ((q as any).staffName || (q as any).staffDisplayName || (q as any).createdByName) as string | undefined;
      const existing = staffMap.get(staffId);

      if (existing) {
        existing.totalQuestions++;
        if (q.status === 'approved') existing.approvedQuestions++;
        if (q.status === 'pending') existing.pendingQuestions++;
        if (q.status === 'rejected') existing.rejectedQuestions++;
        // If we previously only had a fallback id-based name, upgrade it when we see a real name.
        if (hintedName && hintedName.trim() && existing.staffName.startsWith('Staff ')) {
          existing.staffName = hintedName;
        }
      } else {
        staffMap.set(staffId, {
          staffId,
          staffName: (hintedName && hintedName.trim()) ? hintedName : getStaffName(staffId),
          department: q.department || hodDepartment || 'General',
          totalQuestions: 1,
          approvedQuestions: q.status === 'approved' ? 1 : 0,
          pendingQuestions: q.status === 'pending' ? 1 : 0,
          rejectedQuestions: q.status === 'rejected' ? 1 : 0,
          totalPapers: 0,
          approvedPapers: 0,
        });
      }
    });

    // Process papers
    papers.forEach(p => {
      // Filter by department if HOD has a department
      if (hodDepartment && p.department && p.department !== hodDepartment) {
        return;
      }

      const staffId = p.staffId || 'unknown';
      const hintedName = (p.staffName || (p as any).staffDisplayName) as string | undefined;
      const existing = staffMap.get(staffId);

      if (existing) {
        existing.totalPapers++;
        if (p.status === 'approved' || p.status === 'print-ready') existing.approvedPapers++;
        if (hintedName && hintedName.trim() && existing.staffName.startsWith('Staff ')) {
          existing.staffName = hintedName;
        }
      } else {
        staffMap.set(staffId, {
          staffId,
          staffName: (hintedName && hintedName.trim()) ? hintedName : getStaffName(staffId),
          department: p.department || hodDepartment || 'General',
          totalQuestions: 0,
          approvedQuestions: 0,
          pendingQuestions: 0,
          rejectedQuestions: 0,
          totalPapers: 1,
          approvedPapers: p.status === 'approved' || p.status === 'print-ready' ? 1 : 0,
        });
      }
    });

    return Array.from(staffMap.values());
  };

  const staffStats = getStaffStats();

  // Calculate totals
  const totals = staffStats.reduce(
    (acc, staff) => ({
      totalQuestions: acc.totalQuestions + staff.totalQuestions,
      totalPapers: acc.totalPapers + staff.totalPapers,
      approvedQuestions: acc.approvedQuestions + staff.approvedQuestions,
      pendingQuestions: acc.pendingQuestions + staff.pendingQuestions,
    }),
    { totalQuestions: 0, totalPapers: 0, approvedQuestions: 0, pendingQuestions: 0 }
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Staff Overview</h2>
        <p className="text-muted-foreground">
          Monitor staff performance in {user?.department || 'your'} department
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Staff</p>
                <p className="text-3xl font-bold text-foreground">{staffStats.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Questions</p>
                <p className="text-3xl font-bold text-foreground">{totals.totalQuestions}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Papers</p>
                <p className="text-3xl font-bold text-foreground">{totals.totalPapers}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-3xl font-bold text-foreground">{totals.pendingQuestions}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Staff Cards */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Staff Performance</CardTitle>
          <CardDescription>Individual staff statistics for {user?.department || 'all departments'}</CardDescription>
        </CardHeader>
        <CardContent>
          {staffStats.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No staff activity found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {staffStats.map((staff, index) => {
                const approvalRate = staff.totalQuestions > 0 
                  ? Math.round((staff.approvedQuestions / staff.totalQuestions) * 100) 
                  : 0;

                return (
                  <motion.div
                    key={staff.staffId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="border-border/50 hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
                              {staff.staffName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <p className="font-medium text-foreground">{staff.staffName}</p>
                                <Badge variant="outline" className="text-xs">
                                  {staff.department}
                                </Badge>
                              </div>
                              <Badge variant="secondary" className="text-xs">
                                {approvalRate}% approved
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2 text-center mt-4">
                              <div className="p-2 rounded-lg bg-muted/50">
                                <p className="text-lg font-bold text-foreground">{staff.totalQuestions}</p>
                                <p className="text-xs text-muted-foreground">Questions</p>
                              </div>
                              <div className="p-2 rounded-lg bg-muted/50">
                                <p className="text-lg font-bold text-foreground">{staff.totalPapers}</p>
                                <p className="text-xs text-muted-foreground">Papers</p>
                              </div>
                              <div className="p-2 rounded-lg bg-green-500/10">
                                <p className="text-lg font-bold text-green-600">{staff.approvedQuestions}</p>
                                <p className="text-xs text-muted-foreground">Approved</p>
                              </div>
                            </div>

                            <div className="mt-3">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-muted-foreground">Approval Rate</span>
                                <span className="font-medium">{approvalRate}%</span>
                              </div>
                              <Progress value={approvalRate} className="h-1.5" />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffOverview;