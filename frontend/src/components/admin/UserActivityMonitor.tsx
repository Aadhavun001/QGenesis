import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Users, 
  Clock, 
  Monitor,
  Filter,
  Building,
  RefreshCw,
  Circle,
  MapPin,
  Shield,
  ShieldOff,
  Trash2,
  Edit,
  MoreVertical
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppSettingsStore, UserActivity } from '@/stores/appSettingsStore';
import { toast } from 'sonner';
import { useFirestoreUsers } from '@/services/firebase/firestore-hooks';
import { isFirebaseConfigured } from '@/services/firebase/firestore-config';
import { firestoreAuthService } from '@/services/firebase/firestore-auth';
import { firestoreUserActivityService } from '@/services/firebase/firestore-database';

const STORAGE_KEY = 'qgenesis-managed-users';

interface ManagedUser {
  id: string;
  displayName: string;
  email: string;
  phone?: string;
  role: 'staff' | 'hod' | 'admin';
  department?: string;
  institution?: string;
  place?: string;
  status?: 'active' | 'blocked';
  createdAt: Date;
}

interface MockUserActivity extends UserActivity {
  institution?: string;
  place?: string;
  userStatus?: 'active' | 'blocked';
  phone?: string;
}

const UserActivityMonitor: React.FC = () => {
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [institutionFilter, setInstitutionFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showUnblockDialog, setShowUnblockDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [placeFilter, setPlaceFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<MockUserActivity | null>(null);
  const [editForm, setEditForm] = useState({ institution: '', place: '' });

  const { users: firestoreUsers, loading, refetch, update: updateUser, delete: deleteUser } = useFirestoreUsers();
  const [localActivities, setLocalActivities] = useState<MockUserActivity[]>([]);
  const [recentActivities, setRecentActivities] = useState<{ userId: string; timestamp: Date }[]>([]);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    const unsubscribe = firestoreUserActivityService.onActivitiesChange((list) => {
      setRecentActivities(
        list.map((a) => ({
          userId: a.userId,
          timestamp: a.timestamp instanceof Date ? a.timestamp : new Date(),
        }))
      );
    });
    return () => unsubscribe();
  }, [firestoreUsers.length]);

  const lastActiveByUser = useMemo(() => {
    const map: Record<string, Date> = {};
    recentActivities.forEach(({ userId, timestamp }) => {
      if (!map[userId] || timestamp > map[userId]) map[userId] = timestamp;
    });
    return map;
  }, [recentActivities]);

  const generateActivitiesFromStorage = (): MockUserActivity[] => {
    const storedUsers = localStorage.getItem(STORAGE_KEY);
    if (!storedUsers) return [];
    const users = JSON.parse(storedUsers);
    const blockedUsers = JSON.parse(localStorage.getItem('qgenesis-blocked-users') || '[]');
    return users.map((user: any) => ({
      id: `activity_${user.id}`,
      userId: user.id,
      userName: user.displayName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      department: user.department,
      institution: user.institution || 'Not specified',
      place: user.place || 'Not specified',
      status: Math.random() > 0.6 ? 'online' : Math.random() > 0.5 ? 'away' : 'offline',
      userStatus: blockedUsers.includes(user.id) ? 'blocked' : 'active',
      lastActive: new Date(Date.now() - Math.random() * 86400000),
      screenTime: Math.floor(Math.random() * 480),
      sessionsToday: Math.floor(Math.random() * 10),
      actionsToday: Math.floor(Math.random() * 100),
    }));
  };

  const activitiesFromFirestore = useMemo((): MockUserActivity[] => {
    const getStatusFromLastActive = (lastActive: Date) => {
      const diffMs = Date.now() - new Date(lastActive).getTime();
      if (diffMs <= 5 * 60 * 1000) return 'online' as const;
      if (diffMs <= 30 * 60 * 1000) return 'away' as const;
      return 'offline' as const;
    };
    return firestoreUsers.map((user) => ({
      id: `activity_${user.id}`,
      userId: user.id,
      userName: user.displayName,
      email: user.email,
      phone: user.phone ?? '',
      role: user.role,
      department: user.department,
      institution: user.institution || 'Not specified',
      place: user.place || 'Not specified',
      status: getStatusFromLastActive(lastActiveByUser[user.id] ?? (user.createdAt ? new Date(user.createdAt) : new Date(0))),
      userStatus: user.status === 'blocked' ? 'blocked' : 'active',
      lastActive: lastActiveByUser[user.id] ?? (user.createdAt ? new Date(user.createdAt) : new Date(0)),
      screenTime: 0,
      sessionsToday: 0,
      actionsToday: 0,
    }));
  }, [firestoreUsers, lastActiveByUser]);

  useEffect(() => {
    if (isFirebaseConfigured()) return;
    const load = () => setLocalActivities(generateActivitiesFromStorage());
    load();
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === 'qgenesis-blocked-users' || e.key === 'qgenesis-blocked-user-data') load();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const activities = isFirebaseConfigured() ? activitiesFromFirestore : localActivities;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (isFirebaseConfigured()) {
      await refetch();
      firestoreUserActivityService.getAll().then((list) => {
        setRecentActivities(
          list.map((a) => ({
            userId: a.userId,
            timestamp: a.timestamp instanceof Date ? a.timestamp : new Date(),
          }))
        );
      }).catch(() => {});
    } else {
      setTimeout(() => {
        setLocalActivities(generateActivitiesFromStorage());
      }, 500);
    }
    setIsRefreshing(false);
  };

  const handleBlockUser = async () => {
    if (!selectedUser) return;
    if (isFirebaseConfigured()) {
      const res = await firestoreAuthService.blockUser(selectedUser.userId);
      if (res.success) {
        await refetch();
        toast.success(`User ${selectedUser.userName} has been blocked`);
      } else {
        toast.error(res.error || 'Failed to block user');
      }
      setShowBlockDialog(false);
      return;
    }
    const blockedUsers = JSON.parse(localStorage.getItem('qgenesis-blocked-users') || '[]');
    if (!blockedUsers.includes(selectedUser.userId)) {
      blockedUsers.push(selectedUser.userId);
      localStorage.setItem('qgenesis-blocked-users', JSON.stringify(blockedUsers));
      const blockedUserData = JSON.parse(localStorage.getItem('qgenesis-blocked-user-data') || '{}');
      blockedUserData[selectedUser.userId] = { email: selectedUser.email, phone: selectedUser.phone };
      localStorage.setItem('qgenesis-blocked-user-data', JSON.stringify(blockedUserData));
      const managedUsers = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const updatedUsers = managedUsers.map((u: ManagedUser) =>
        u.id === selectedUser.userId ? { ...u, status: 'blocked' } : u
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUsers));
    }
    toast.success(`User ${selectedUser.userName} has been blocked`);
    setShowBlockDialog(false);
    handleRefresh();
  };

  const handleUnblockUser = async () => {
    if (!selectedUser) return;
    if (isFirebaseConfigured()) {
      const res = await firestoreAuthService.unblockUser(selectedUser.userId);
      if (res.success) {
        await refetch();
        toast.success(`User ${selectedUser.userName} has been unblocked`);
      } else {
        toast.error(res.error || 'Failed to unblock user');
      }
      setShowUnblockDialog(false);
      return;
    }
    const blockedUsers = JSON.parse(localStorage.getItem('qgenesis-blocked-users') || '[]');
    const updatedBlockedUsers = blockedUsers.filter((id: string) => id !== selectedUser.userId);
    localStorage.setItem('qgenesis-blocked-users', JSON.stringify(updatedBlockedUsers));
    const blockedUserData = JSON.parse(localStorage.getItem('qgenesis-blocked-user-data') || '{}');
    delete blockedUserData[selectedUser.userId];
    localStorage.setItem('qgenesis-blocked-user-data', JSON.stringify(blockedUserData));
    const managedUsers = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const updatedUsers = managedUsers.map((u: ManagedUser) =>
      u.id === selectedUser.userId ? { ...u, status: 'active' } : u
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUsers));
    toast.success(`User ${selectedUser.userName} has been unblocked`);
    setShowUnblockDialog(false);
    handleRefresh();
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    if (isFirebaseConfigured()) {
      const result = await firestoreAuthService.deleteUserByAdmin(selectedUser.userId);
      if (!result.success) {
        toast.error(result.error || 'Failed to delete user');
        return;
      }
      await refetch();
      toast.success(`User ${selectedUser.userName} has been deleted`);
      setShowDeleteDialog(false);
      return;
    }
    const managedUsers = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const updatedUsers = managedUsers.filter((u: ManagedUser) => u.id !== selectedUser.userId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUsers));
    const passwords = JSON.parse(localStorage.getItem('qgenesis-passwords') || '{}');
    delete passwords[selectedUser.userId];
    localStorage.setItem('qgenesis-passwords', JSON.stringify(passwords));
    const registeredUsers = JSON.parse(localStorage.getItem('qgenesis-registered-users') || '[]');
    const updatedRegistered = registeredUsers.filter((u: any) => u.id !== selectedUser.userId);
    localStorage.setItem('qgenesis-registered-users', JSON.stringify(updatedRegistered));
    toast.success(`User ${selectedUser.userName} has been deleted`);
    setShowDeleteDialog(false);
    handleRefresh();
  };

  const handleEditInstitution = async () => {
    if (!selectedUser) return;
    if (isFirebaseConfigured()) {
      await updateUser(selectedUser.userId, {
        institution: editForm.institution || undefined,
        place: editForm.place || undefined,
      });
      toast.success(`Institution & place updated for ${selectedUser.userName}`);
      setShowEditDialog(false);
      return;
    }
    const managedUsers = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const updatedUsers = managedUsers.map((u: ManagedUser) =>
      u.id === selectedUser.userId ? { ...u, institution: editForm.institution, place: editForm.place } : u
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUsers));
    toast.success(`Institution & place updated for ${selectedUser.userName}`);
    setShowEditDialog(false);
    handleRefresh();
  };

  // Get unique departments and institutions
  const departments = [...new Set(activities.filter(a => a.department).map(a => a.department!))];
  const institutions = [...new Set(activities.filter(a => a.institution).map(a => a.institution!))];
  const places = [...new Set(activities.filter(a => a.place).map(a => a.place!))];

  // Filter activities
  const filteredActivities = activities.filter(a => {
    if (roleFilter !== 'all' && a.role !== roleFilter) return false;
    if (departmentFilter !== 'all' && a.department !== departmentFilter) return false;
    if (institutionFilter !== 'all' && a.institution !== institutionFilter) return false;
    if (placeFilter !== 'all' && a.place !== placeFilter) return false;
    return true;
  });

  // Stats
  const onlineCount = filteredActivities.filter(a => a.status === 'online').length;
  const awayCount = filteredActivities.filter(a => a.status === 'away').length;
  const offlineCount = filteredActivities.filter(a => a.status === 'offline').length;
  const blockedCount = filteredActivities.filter(a => a.userStatus === 'blocked').length;
  const avgScreenTime = filteredActivities.length > 0 
    ? Math.round(filteredActivities.reduce((sum, a) => sum + a.screenTime, 0) / filteredActivities.length)
    : 0;

  const formatScreenTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatLastActive = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-500';
      case 'away': return 'text-yellow-500';
      default: return 'text-muted-foreground';
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">User Activity Monitor</h2>
          <p className="text-muted-foreground">Track user status, manage accounts by institution</p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Circle className="w-5 h-5 text-green-500 fill-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{onlineCount}</p>
              <p className="text-sm text-muted-foreground">Online</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <Circle className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{awayCount}</p>
              <p className="text-sm text-muted-foreground">Away</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <Circle className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{offlineCount}</p>
              <p className="text-sm text-muted-foreground">Offline</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <ShieldOff className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{blockedCount}</p>
              <p className="text-sm text-muted-foreground">Blocked</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatScreenTime(avgScreenTime)}</p>
              <p className="text-sm text-muted-foreground">Avg Time</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filter by:</span>
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
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All Depts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-muted-foreground" />
              <Select value={institutionFilter} onValueChange={setInstitutionFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Institutions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Institutions</SelectItem>
                  {institutions.map(inst => (
                    <SelectItem key={inst} value={inst}>{inst}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <Select value={placeFilter} onValueChange={setPlaceFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Places" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Places</SelectItem>
                  {places.map(place => (
                    <SelectItem key={place} value={place}>{place}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Table */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            User Activity
          </CardTitle>
          <CardDescription>
            {filteredActivities.length} users • Group by institution for easy recognition
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredActivities.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No users found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Institution</TableHead>
                    <TableHead>Place</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filteredActivities.map((activity, index) => (
                      <motion.tr
                        key={activity.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className={`group ${activity.userStatus === 'blocked' ? 'bg-red-500/5' : ''}`}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                              activity.userStatus === 'blocked' 
                                ? 'bg-red-500' 
                                : 'bg-gradient-to-br from-primary to-purple-600'
                            }`}>
                              {activity.userName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium">{activity.userName}</p>
                              <p className="text-xs text-muted-foreground">{activity.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getRoleBadgeColor(activity.role)}>
                            {activity.role.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Building className="w-3 h-3 text-muted-foreground" />
                            <span className="text-sm">{activity.institution || 'Not specified'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-muted-foreground" />
                            <span className="text-sm">{activity.place || '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {activity.department || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Circle className={`w-3 h-3 ${getStatusColor(activity.status)} ${activity.status === 'online' ? 'fill-green-500' : activity.status === 'away' ? 'fill-yellow-500' : ''}`} />
                            <span className="capitalize">{activity.status}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {activity.userStatus === 'blocked' ? (
                            <Badge variant="destructive">Blocked</Badge>
                          ) : (
                            <Badge variant="outline" className="text-green-600 border-green-500/50">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(activity);
                                  setEditForm({ institution: activity.institution || '', place: activity.place || '' });
                                  setShowEditDialog(true);
                                }}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Institution
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {activity.userStatus === 'blocked' ? (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedUser(activity);
                                    setShowUnblockDialog(true);
                                  }}
                                  className="text-green-600"
                                >
                                  <Shield className="w-4 h-4 mr-2" />
                                  Unblock User
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedUser(activity);
                                    setShowBlockDialog(true);
                                  }}
                                  className="text-orange-600"
                                >
                                  <ShieldOff className="w-4 h-4 mr-2" />
                                  Block User
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(activity);
                                  setShowDeleteDialog(true);
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Block Dialog */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <ShieldOff className="w-5 h-5" />
              Block User
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to block <strong>{selectedUser?.userName}</strong>?
              <br /><br />
              This will prevent the user from logging in with their current email, phone number, and password. They will need to register with completely different credentials.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlockDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleBlockUser}>Block User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unblock Dialog */}
      <Dialog open={showUnblockDialog} onOpenChange={setShowUnblockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Shield className="w-5 h-5" />
              Unblock User
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to unblock <strong>{selectedUser?.userName}</strong>?
              <br /><br />
              This will allow the user to log in again with their original credentials.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnblockDialog(false)}>Cancel</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleUnblockUser}>Unblock User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Delete User
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete <strong>{selectedUser?.userName}</strong>?
              <br /><br />
              This action cannot be undone. All user data will be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteUser}>Delete User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Institution Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Edit Institution & Place
            </DialogTitle>
            <DialogDescription>
              Update institution and place for <strong>{selectedUser?.userName}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Institution Name</Label>
              <Input
                value={editForm.institution}
                onChange={(e) => setEditForm({ ...editForm, institution: e.target.value })}
                placeholder="Enter institution name"
              />
            </div>
            <div className="space-y-2">
              <Label>Place</Label>
              <Input
                value={editForm.place}
                onChange={(e) => setEditForm({ ...editForm, place: e.target.value })}
                placeholder="Enter place"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={handleEditInstitution}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserActivityMonitor;
