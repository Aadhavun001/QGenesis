import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Plus, 
  Edit2, 
  Trash2, 
  Shield, 
  Save,
  X,
  Search,
  Eye,
  EyeOff
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useFirestoreUsers } from '@/services/firebase/firestore-hooks';
import { isFirebaseConfigured } from '@/services/firebase/config';
import { firestoreAuthService } from '@/services/firebase/firestore-auth';

interface ManagedUser {
  id: string;
  email: string;
  phone: string;
  displayName: string;
  role: 'staff' | 'hod' | 'admin';
  department?: string;
  institution?: string;
  place?: string;
  createdAt: Date;
}

const STORAGE_KEY = 'qgenesis-managed-users';

const firestoreUserToManaged = (u: { id: string; email: string; phone?: string; displayName: string; role: string; department?: string; institution?: string; place?: string; createdAt?: Date }): ManagedUser => ({
  id: u.id,
  email: u.email,
  phone: u.phone ?? '',
  displayName: u.displayName,
  role: u.role as 'staff' | 'hod' | 'admin',
  department: u.department,
  institution: u.institution,
  place: u.place,
  createdAt: u.createdAt ? new Date(u.createdAt as any) : new Date(),
});

const RoleManagement: React.FC = () => {
  const { users: firestoreUsers, loading, refetch, update: updateUser, delete: deleteUser } = useFirestoreUsers();
  const managedUsers = useMemo(() => firestoreUsers.map(firestoreUserToManaged), [firestoreUsers]);

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    displayName: '',
    role: 'staff' as 'staff' | 'hod' | 'admin',
    department: '',
    institution: '',
    place: '',
    password: ''
  });

  // Seed default users when not using Firebase and localStorage is empty
  useEffect(() => {
    if (isFirebaseConfigured()) return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return;
    const defaultUsers: ManagedUser[] = [
      { id: 'u1', email: 'staff@demo.com', phone: '+91 98765 43210', displayName: 'Dr. John Smith', role: 'staff', department: 'Computer Science', createdAt: new Date() },
      { id: 'u2', email: 'hod@demo.com', phone: '+91 98765 43211', displayName: 'Prof. Jane Doe', role: 'hod', department: 'Computer Science', createdAt: new Date() },
      { id: 'u3', email: 'admin@demo.com', phone: '+91 98765 43212', displayName: 'Admin User', role: 'admin', createdAt: new Date() },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultUsers));
    refetch();
  }, [refetch]);

  const filteredUsers = managedUsers.filter(user => {
    const matchesSearch = user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleAddUser = async () => {
    if (!formData.email || !formData.displayName || !formData.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (isFirebaseConfigured()) {
      const result = await firestoreAuthService.createUserByAdmin({
        email: formData.email,
        password: formData.password,
        displayName: formData.displayName,
        role: formData.role,
        phone: formData.phone || undefined,
        department: formData.department || undefined,
        institution: formData.institution || undefined,
        place: formData.place || undefined,
      });
      if (!result.success) {
        toast.error(result.error || 'Failed to add user');
        return;
      }
      await refetch();
      setShowAddDialog(false);
      resetForm();
      toast.success('User added successfully. They can sign in with email and password.');
      return;
    }

    const newUser: ManagedUser = {
      id: `user_${Date.now()}`,
      email: formData.email,
      phone: formData.phone,
      displayName: formData.displayName,
      role: formData.role,
      department: formData.department,
      institution: formData.institution,
      place: formData.place,
      createdAt: new Date()
    };

    const passwords = JSON.parse(localStorage.getItem('qgenesis-passwords') || '{}');
    passwords[newUser.id] = formData.password;
    localStorage.setItem('qgenesis-passwords', JSON.stringify(passwords));

    const stored = localStorage.getItem(STORAGE_KEY);
    const list = stored ? JSON.parse(stored) : [];
    list.push(newUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    await refetch();
    setShowAddDialog(false);
    resetForm();
    toast.success('User added successfully');
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;

    await updateUser(selectedUser.id, {
      email: formData.email,
      phone: formData.phone || undefined,
      displayName: formData.displayName,
      role: formData.role,
      department: formData.department || undefined,
      institution: formData.institution || undefined,
      place: formData.place || undefined,
    });

    if (!isFirebaseConfigured() && formData.password) {
      const passwords = JSON.parse(localStorage.getItem('qgenesis-passwords') || '{}');
      passwords[selectedUser.id] = formData.password;
      localStorage.setItem('qgenesis-passwords', JSON.stringify(passwords));
    }

    setShowEditDialog(false);
    resetForm();
    toast.success('User updated successfully');
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    if (isFirebaseConfigured()) {
      const result = await firestoreAuthService.deleteUserByAdmin(selectedUser.id);
      if (!result.success) {
        toast.error(result.error || 'Failed to delete user');
        return;
      }
      await refetch();
    } else {
      await deleteUser(selectedUser.id);
      const passwords = JSON.parse(localStorage.getItem('qgenesis-passwords') || '{}');
      delete passwords[selectedUser.id];
      localStorage.setItem('qgenesis-passwords', JSON.stringify(passwords));
    }

    setShowDeleteDialog(false);
    setSelectedUser(null);
    toast.success('User deleted successfully');
  };

  const openEditDialog = (user: ManagedUser) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      phone: user.phone,
      displayName: user.displayName,
      role: user.role,
      department: user.department || '',
      institution: user.institution || '',
      place: user.place || '',
      password: ''
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (user: ManagedUser) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  const resetForm = () => {
    setFormData({
      email: '',
      phone: '',
      displayName: '',
      role: 'staff',
      department: '',
      institution: '',
      place: '',
      password: ''
    });
    setShowPassword(false);
    setSelectedUser(null);
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
          <h2 className="text-2xl font-bold text-foreground mb-2">Role Management</h2>
          <p className="text-muted-foreground">Manage users, assign roles, and update credentials</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add New User
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[150px]">
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

      {/* User Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{managedUsers.filter(u => u.role === 'staff').length}</p>
              <p className="text-sm text-muted-foreground">Staff Members</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{managedUsers.filter(u => u.role === 'hod').length}</p>
              <p className="text-sm text-muted-foreground">HODs</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{managedUsers.filter(u => u.role === 'admin').length}</p>
              <p className="text-sm text-muted-foreground">Admins</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>{filteredUsers.length} users found</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading users...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users found
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {filteredUsers.map((user) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/50"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-medium">
                      {user.displayName.charAt(0)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{user.displayName}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      {user.phone && (
                        <p className="text-xs text-muted-foreground">{user.phone}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {user.department && (
                        <Badge variant="outline" className="hidden sm:inline-flex">
                          {user.department}
                        </Badge>
                      )}
                      <Badge className={getRoleBadgeColor(user.role)}>
                        {user.role.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(user)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => openDeleteDialog(user)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>Create a new user account with role assignment</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Display Name *</Label>
              <Input
                placeholder="Dr. John Smith"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                placeholder="+91 98765 43210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Password *</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Role *</Label>
              <Select value={formData.role} onValueChange={(v: 'staff' | 'hod' | 'admin') => setFormData({ ...formData, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="hod">HOD</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Department</Label>
              <Input
                placeholder="Computer Science"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Institution</Label>
              <Input
                placeholder="PSG College of Technology"
                value={formData.institution}
                onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Place</Label>
              <Input
                placeholder="Coimbatore"
                value={formData.place}
                onChange={(e) => setFormData({ ...formData, place: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleAddUser}>
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => { setShowEditDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information and credentials</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Display Name *</Label>
              <Input
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>New Password (leave blank to keep current)</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Role *</Label>
              <Select value={formData.role} onValueChange={(v: 'staff' | 'hod' | 'admin') => setFormData({ ...formData, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="hod">HOD</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Department</Label>
              <Input
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Institution</Label>
              <Input
                value={formData.institution}
                onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Place</Label>
              <Input
                value={formData.place}
                onChange={(e) => setFormData({ ...formData, place: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditDialog(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleEditUser}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedUser?.displayName}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedUser(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RoleManagement;
