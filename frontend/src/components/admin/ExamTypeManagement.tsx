import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X,
  BookOpen,
  Check,
  XCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useQuestionStore, ExamTypeConfig } from '@/stores/questionStore';
import { firestoreExamTypeService } from '@/services/firebase/firestore-database';
import { isFirebaseConfigured } from '@/services/firebase/firestore-config';
import { toast } from 'sonner';

const ExamTypeManagement: React.FC = () => {
  const { examTypes, addExamType, updateExamType, deleteExamType } = useQuestionStore();
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedType, setSelectedType] = useState<ExamTypeConfig | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    isActive: true,
  });

  const handleAdd = () => {
    if (!formData.name || !formData.code) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    // Check for duplicate code
    if (examTypes.find(e => e.code.toLowerCase() === formData.code.toLowerCase())) {
      toast.error('Exam type code already exists');
      return;
    }
    
    const id = addExamType(formData);
    if (isFirebaseConfigured()) {
      firestoreExamTypeService.create({ ...formData, id }).catch(() => toast.error('Failed to save to cloud'));
    }
    setShowAddDialog(false);
    resetForm();
    toast.success('Exam type added successfully');
  };

  const handleEdit = () => {
    if (!selectedType) return;
    
    updateExamType(selectedType.id, formData);
    if (isFirebaseConfigured()) {
      firestoreExamTypeService.update(selectedType.id, formData).catch(() => toast.error('Failed to save to cloud'));
    }
    setShowEditDialog(false);
    resetForm();
    toast.success('Exam type updated');
  };

  const handleDelete = () => {
    if (!selectedType) return;
    
    deleteExamType(selectedType.id);
    if (isFirebaseConfigured()) {
      firestoreExamTypeService.delete(selectedType.id).catch(() => toast.error('Failed to delete from cloud'));
    }
    setShowDeleteDialog(false);
    setSelectedType(null);
    toast.success('Exam type deleted');
  };

  const openEditDialog = (type: ExamTypeConfig) => {
    setSelectedType(type);
    setFormData({
      name: type.name,
      code: type.code,
      isActive: type.isActive,
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (type: ExamTypeConfig) => {
    setSelectedType(type);
    setShowDeleteDialog(true);
  };

  const toggleActive = (type: ExamTypeConfig) => {
    const nextActive = !type.isActive;
    updateExamType(type.id, { isActive: nextActive });
    if (isFirebaseConfigured()) {
      firestoreExamTypeService.update(type.id, { isActive: nextActive }).catch(() => toast.error('Failed to save to cloud'));
    }
    toast.success(`Exam type ${nextActive ? 'activated' : 'deactivated'}`);
  };

  const resetForm = () => {
    setFormData({ name: '', code: '', isActive: true });
    setSelectedType(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Exam Types</h2>
          <p className="text-muted-foreground">Manage exam types used across the platform</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Exam Type
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{examTypes.filter(e => e.isActive).length}</p>
              <p className="text-sm text-muted-foreground">Active Types</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <XCircle className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{examTypes.filter(e => !e.isActive).length}</p>
              <p className="text-sm text-muted-foreground">Inactive Types</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Exam Types List */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            All Exam Types
          </CardTitle>
          <CardDescription>
            These exam types appear in question papers and generation options
          </CardDescription>
        </CardHeader>
        <CardContent>
          {examTypes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No exam types configured. Add your first exam type.
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {examTypes.map((type) => (
                  <motion.div
                    key={type.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        type.isActive 
                          ? 'bg-gradient-to-br from-primary to-purple-600' 
                          : 'bg-muted'
                      }`}>
                        <BookOpen className={`w-5 h-5 ${type.isActive ? 'text-white' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{type.name}</p>
                        <p className="text-sm text-muted-foreground">Code: {type.code}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <Badge variant={type.isActive ? 'default' : 'secondary'}>
                        {type.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={type.isActive}
                          onCheckedChange={() => toggleActive(type)}
                        />
                      </div>
                      
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(type)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => openDeleteDialog(type)}
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

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Exam Type</DialogTitle>
            <DialogDescription>Create a new exam type for question papers</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                placeholder="e.g., Semester Exam"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Code *</Label>
              <Input
                placeholder="e.g., SEM"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              />
              <p className="text-xs text-muted-foreground">Short code used in dropdowns and papers</p>
            </div>

            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Add Exam Type
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => { setShowEditDialog(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Exam Type</DialogTitle>
            <DialogDescription>Update exam type details</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Code *</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditDialog(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleEdit}>
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
            <AlertDialogTitle>Delete Exam Type?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove "{selectedType?.name}" from the system. Questions using this type will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedType(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ExamTypeManagement;