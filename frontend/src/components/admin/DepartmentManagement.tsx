import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  Users,
  Search
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { firestoreDepartmentService, firestoreUserService } from '@/services/firebase/firestore-database';
import { isFirebaseConfigured } from '@/services/firebase/firestore-config';

interface Department {
  id: string;
  name: string;
  code: string;
  description: string;
  headOfDepartment?: string;
  createdAt: Date;
  usersCount: number;
}

const DepartmentManagement: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [deleteConfirmDept, setDeleteConfirmDept] = useState<Department | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    headOfDepartment: ''
  });

  // Load departments from Firestore (or localStorage via service)
  useEffect(() => {
    let unsubscribe: null | (() => void) = null;
    let unsubscribeUsers: null | (() => void) = null;

    const computeCounts = (deptList: Department[], userList: any[]) => {
      const map = new Map<string, number>();
      userList.forEach((u) => {
        if (!u?.department) return;
        map.set(u.department, (map.get(u.department) ?? 0) + 1);
      });
      return deptList.map((d) => ({
        ...d,
        usersCount: map.get(d.name) ?? map.get(d.code) ?? map.get((d as any).department) ?? 0,
      }));
    };

    const departmentsFromUsers = (userList: any[]): Department[] => {
      const seen = new Set<string>();
      const result: Department[] = [];
      userList.forEach((u) => {
        const name = (u?.department ?? '').trim();
        if (!name) return;
        if (seen.has(name)) return;
        seen.add(name);
        result.push({
          id: `dept_user_${name}`,
          name,
          code: name,
          description: 'Auto-derived from existing users',
          headOfDepartment: '',
          createdAt: new Date(),
          usersCount: 0,
        });
      });
      return result;
    };

    const load = () => firestoreDepartmentService.getAll().then((list) => {
      if (list.length === 0 && !isFirebaseConfigured()) {
        setDepartments(getDefaultDepartments());
        return;
      }
      const withCount: Department[] = list.map((d) => ({
        id: d.id,
        name: d.name,
        code: d.code,
        description: d.description,
        headOfDepartment: d.headOfDepartment,
        createdAt: d.createdAt instanceof Date ? d.createdAt : new Date(d.createdAt as any),
        usersCount: 0,
      }));
      if (isFirebaseConfigured()) {
        firestoreUserService.getAll().then((u) => {
          setUsers(u as any[]);
          if (withCount.length === 0) {
            const derived = departmentsFromUsers(u as any[]);
            setDepartments(computeCounts(derived, u as any[]));
          } else {
            setDepartments(computeCounts(withCount, u as any[]));
          }
        }).catch(() => setDepartments(withCount));
      } else {
        withCount.forEach((d) => {
          d.usersCount = getUsersInDepartment(d.name);
        });
        setDepartments(withCount);
      }
    }).catch(() => setDepartments(getDefaultDepartments()));

    if (isFirebaseConfigured()) {
      unsubscribe = firestoreDepartmentService.onDepartmentsChange((list) => {
        const withCount: Department[] = list.map((d) => ({
          id: d.id,
          name: d.name,
          code: d.code,
          description: d.description,
          headOfDepartment: d.headOfDepartment,
          createdAt: d.createdAt instanceof Date ? d.createdAt : new Date(d.createdAt as any),
          usersCount: 0,
        }));
        const currentUsers = users;
        if (withCount.length === 0 && currentUsers.length > 0) {
          const derived = departmentsFromUsers(currentUsers);
          setDepartments(computeCounts(derived, currentUsers));
        } else {
          setDepartments(computeCounts(withCount, currentUsers));
        }
      });

      unsubscribeUsers = (firestoreUserService as any).onUsersChange?.((u: any[]) => {
        setUsers(u);
        setDepartments((prev) => {
          if (prev.length === 0) {
            const derived = departmentsFromUsers(u);
            return computeCounts(derived, u);
          }
          return computeCounts(prev, u);
        });
      }) ?? null;
    } else {
      load();
    }

    // In non-Firebase mode, keep departments live across tabs
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'qgenesis-departments' || e.key === 'qgenesis-managed-users') load();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      if (unsubscribe) unsubscribe();
      if (unsubscribeUsers) unsubscribeUsers();
    };
  }, []);

  const getDefaultDepartments = (): Department[] => [
    { id: 'dept_1', name: 'Computer Science', code: 'CS', description: 'Department of Computer Science and Engineering', createdAt: new Date(), usersCount: 5 },
    { id: 'dept_2', name: 'Electronics', code: 'ECE', description: 'Department of Electronics and Communication Engineering', createdAt: new Date(), usersCount: 3 },
    { id: 'dept_3', name: 'Mechanical', code: 'ME', description: 'Department of Mechanical Engineering', createdAt: new Date(), usersCount: 4 },
    { id: 'dept_4', name: 'Civil', code: 'CE', description: 'Department of Civil Engineering', createdAt: new Date(), usersCount: 2 },
  ];

  const getUsersInDepartment = (deptName: string): number => {
    try {
      const stored = localStorage.getItem('qgenesis-managed-users');
      if (stored) {
        const users = JSON.parse(stored);
        return users.filter((u: any) => u.department === deptName).length;
      }
    } catch {}
    return 0;
  };

  const handleAdd = () => {
    setFormData({ name: '', code: '', description: '', headOfDepartment: '' });
    setIsAddDialogOpen(true);
  };

  const handleEdit = (dept: Department) => {
    setEditingDepartment(dept);
    setFormData({
      name: dept.name,
      code: dept.code,
      description: dept.description,
      headOfDepartment: dept.headOfDepartment || ''
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      toast.error('Name and code are required');
      return;
    }

    if (editingDepartment) {
      await firestoreDepartmentService.update(editingDepartment.id, formData).catch(() => {
        toast.error('Failed to save to cloud');
        return;
      });
      setDepartments(prev => prev.map(d => 
        d.id === editingDepartment.id 
          ? { ...d, ...formData, usersCount: getUsersInDepartment(formData.name) }
          : d
      ));
      toast.success('Department updated successfully');
      setEditingDepartment(null);
    } else {
      const id = `dept_${Date.now()}`;
      await firestoreDepartmentService.create({ ...formData, id }).catch(() => {
        toast.error('Failed to save to cloud');
        return;
      });
      const newDept: Department = {
        id,
        ...formData,
        createdAt: new Date(),
        usersCount: getUsersInDepartment(formData.name),
      };
      setDepartments(prev => [...prev, newDept]);
      toast.success('Department added successfully');
      setIsAddDialogOpen(false);
    }
    
    setFormData({ name: '', code: '', description: '', headOfDepartment: '' });
  };

  const handleDelete = (dept: Department) => {
    setDeleteConfirmDept(dept);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmDept) return;
    await firestoreDepartmentService.delete(deleteConfirmDept.id).catch(() => {
      toast.error('Failed to delete from cloud');
      return;
    });
    setDepartments(prev => prev.filter(d => d.id !== deleteConfirmDept.id));
    toast.success('Department deleted successfully');
    setDeleteConfirmDept(null);
  };

  const filteredDepartments = departments.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Department Management</h2>
          <p className="text-muted-foreground">Create and manage departments for user assignment</p>
        </div>
        <Button onClick={handleAdd} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Department
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search departments..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Departments Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredDepartments.map((dept, index) => (
            <motion.div
              key={dept.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="h-full border-border/50 hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                        <Building2 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{dept.name}</CardTitle>
                        <Badge variant="outline" className="mt-1">{dept.code}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(dept)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(dept)} className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {dept.description || 'No description provided'}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{getUsersInDepartment(dept.name)} users assigned</span>
                  </div>
                  {dept.headOfDepartment && (
                    <p className="text-sm text-muted-foreground mt-2">
                      HOD: {dept.headOfDepartment}
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredDepartments.length === 0 && (
        <Card className="border-border/50">
          <CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No departments found</p>
          </CardContent>
        </Card>
      )}

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Department</DialogTitle>
            <DialogDescription>Create a new department for user assignment</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Department Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Computer Science"
              />
            </div>
            <div className="space-y-2">
              <Label>Department Code *</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g., CS"
                maxLength={10}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Department description..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Head of Department</Label>
              <Input
                value={formData.headOfDepartment}
                onChange={(e) => setFormData({ ...formData, headOfDepartment: e.target.value })}
                placeholder="HOD name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Add Department
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingDepartment} onOpenChange={() => setEditingDepartment(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
            <DialogDescription>Update department details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Department Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Computer Science"
              />
            </div>
            <div className="space-y-2">
              <Label>Department Code *</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g., CS"
                maxLength={10}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Department description..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Head of Department</Label>
              <Input
                value={formData.headOfDepartment}
                onChange={(e) => setFormData({ ...formData, headOfDepartment: e.target.value })}
                placeholder="HOD name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDepartment(null)}>Cancel</Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmDept} onOpenChange={() => setDeleteConfirmDept(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Department?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirmDept?.name}"? This action cannot be undone.
              Users assigned to this department will need to be reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DepartmentManagement;
