import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, Reorder } from 'framer-motion';
import { 
  Settings, 
  Save, 
  RotateCcw, 
  Globe, 
  Users, 
  Shield, 
  Palette,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Eye,
  GripVertical,
  EyeOff,
  ExternalLink,
  Undo2,
  AlertCircle,
  Database
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
import { useAppSettingsStore, LandingSettings } from '@/stores/appSettingsStore';
import { toast } from 'sonner';
import DataMigrationPanel from './DataMigrationPanel';

// Deep comparison helper
const deepEqual = (a: any, b: any): boolean => {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object' || a === null || b === null) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every(key => deepEqual(a[key], b[key]));
};

interface LandingSection {
  id: string;
  name: string;
  enabled: boolean;
}

const DEFAULT_SECTIONS: LandingSection[] = [
  { id: 'hero', name: 'Hero Section', enabled: true },
  { id: 'features', name: 'Features Section', enabled: true },
  { id: 'blooms', name: "Bloom's Taxonomy Section", enabled: true },
  { id: 'howItWorks', name: 'How It Works Section', enabled: true },
  { id: 'roles', name: 'Roles Section', enabled: true },
  { id: 'aiAssistant', name: 'AI Assistant Section', enabled: true },
  { id: 'testimonials', name: 'Testimonials Section', enabled: true },
  { id: 'faq', name: 'FAQ Section', enabled: true },
  { id: 'contact', name: 'Contact Section', enabled: true },
  { id: 'pricing', name: 'Pricing Section', enabled: true },
];

const AppSettings: React.FC = () => {
  const { settings, updatePageSettings, updateLandingSection, resetSettings } = useAppSettingsStore();
  const [activeTab, setActiveTab] = useState('landing');
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  
  // Local form states
  const [landingForm, setLandingForm] = useState<LandingSettings>(settings.landing);
  const [staffForm, setStaffForm] = useState(settings.staff);
  const [hodForm, setHodForm] = useState(settings.hod);
  const [adminForm, setAdminForm] = useState(settings.admin);
  const [brandingForm, setBrandingForm] = useState(settings.branding);
  
  // Landing sections order state
  const [landingSections, setLandingSections] = useState<LandingSection[]>(() => {
    const stored = localStorage.getItem('qgenesis-landing-sections-order');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return DEFAULT_SECTIONS;
      }
    }
    return DEFAULT_SECTIONS;
  });

  // Track unsaved changes per tab
  const hasLandingChanges = useMemo(() => !deepEqual(landingForm, settings.landing), [landingForm, settings.landing]);
  const hasStaffChanges = useMemo(() => !deepEqual(staffForm, settings.staff), [staffForm, settings.staff]);
  const hasHodChanges = useMemo(() => !deepEqual(hodForm, settings.hod), [hodForm, settings.hod]);
  const hasAdminChanges = useMemo(() => !deepEqual(adminForm, settings.admin), [adminForm, settings.admin]);
  const hasBrandingChanges = useMemo(() => !deepEqual(brandingForm, settings.branding), [brandingForm, settings.branding]);
  
  const hasAnyUnsavedChanges = hasLandingChanges || hasStaffChanges || hasHodChanges || hasAdminChanges || hasBrandingChanges;

  // Warn on browser navigation/close with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasAnyUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasAnyUnsavedChanges]);

  // Keyboard shortcuts: Ctrl+S to save, Ctrl+Z to undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S or Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        switch (activeTab) {
          case 'landing':
            handleSaveLanding();
            break;
          case 'staff':
            handleSaveStaff();
            break;
          case 'hod':
            handleSaveHod();
            break;
          case 'admin':
            handleSaveAdmin();
            break;
          case 'branding':
            handleSaveBranding();
            break;
        }
      }
      
      // Ctrl+Z or Cmd+Z to undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        switch (activeTab) {
          case 'landing':
            if (hasLandingChanges) handleUndoLanding();
            break;
          case 'staff':
            if (hasStaffChanges) handleUndoStaff();
            break;
          case 'hod':
            if (hasHodChanges) handleUndoHod();
            break;
          case 'admin':
            if (hasAdminChanges) handleUndoAdmin();
            break;
          case 'branding':
            if (hasBrandingChanges) handleUndoBranding();
            break;
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, hasLandingChanges, hasStaffChanges, hasHodChanges, hasAdminChanges, hasBrandingChanges]);

  // Handle tab change with unsaved changes warning
  const handleTabChange = (newTab: string) => {
    const currentTabHasChanges = 
      (activeTab === 'landing' && hasLandingChanges) ||
      (activeTab === 'staff' && hasStaffChanges) ||
      (activeTab === 'hod' && hasHodChanges) ||
      (activeTab === 'admin' && hasAdminChanges) ||
      (activeTab === 'branding' && hasBrandingChanges);
    
    if (currentTabHasChanges) {
      setPendingTab(newTab);
      setShowLeaveDialog(true);
    } else {
      setActiveTab(newTab);
    }
  };

  const handleConfirmLeave = () => {
    // Revert current tab changes
    if (activeTab === 'landing') setLandingForm(settings.landing);
    if (activeTab === 'staff') setStaffForm(settings.staff);
    if (activeTab === 'hod') setHodForm(settings.hod);
    if (activeTab === 'admin') setAdminForm(settings.admin);
    if (activeTab === 'branding') setBrandingForm(settings.branding);
    
    if (pendingTab) {
      setActiveTab(pendingTab);
      setPendingTab(null);
    }
    setShowLeaveDialog(false);
  };

  // Sync form with store when settings change
  useEffect(() => {
    setLandingForm(settings.landing);
    setStaffForm(settings.staff);
    setHodForm(settings.hod);
    setAdminForm(settings.admin);
    setBrandingForm(settings.branding);
  }, [settings]);
  
  // Save sections order
  const handleSaveSectionsOrder = () => {
    localStorage.setItem('qgenesis-landing-sections-order', JSON.stringify(landingSections));
    window.dispatchEvent(new CustomEvent('landing-sections-updated'));
    toast.success('Landing page sections order saved');
  };
  
  const handleToggleSection = (id: string, enabled: boolean) => {
    setLandingSections(prev => prev.map(s => s.id === id ? { ...s, enabled } : s));
  };

  const handleSaveLanding = () => {
    updatePageSettings('landing', landingForm);
    toast.success('Landing page settings saved');
  };

  const handleSaveStaff = () => {
    updatePageSettings('staff', staffForm);
    toast.success('Staff dashboard settings saved');
  };

  const handleSaveHod = () => {
    updatePageSettings('hod', hodForm);
    toast.success('HOD dashboard settings saved');
  };

  const handleSaveAdmin = () => {
    updatePageSettings('admin', adminForm);
    toast.success('Admin dashboard settings saved');
  };

  const handleSaveBranding = () => {
    updatePageSettings('branding', brandingForm);
    toast.success('Branding settings saved');
  };

  const handleResetAll = () => {
    resetSettings();
    toast.success('All settings reset to defaults');
  };

  // Undo handlers - revert to last saved settings
  const handleUndoLanding = () => {
    setLandingForm(settings.landing);
    toast.info('Landing page changes reverted');
  };

  const handleUndoStaff = () => {
    setStaffForm(settings.staff);
    toast.info('Staff dashboard changes reverted');
  };

  const handleUndoHod = () => {
    setHodForm(settings.hod);
    toast.info('HOD dashboard changes reverted');
  };

  const handleUndoAdmin = () => {
    setAdminForm(settings.admin);
    toast.info('Admin dashboard changes reverted');
  };

  const handleUndoBranding = () => {
    setBrandingForm(settings.branding);
    toast.info('Branding changes reverted');
  };

  // Helper functions for managing arrays
  const addFeature = () => {
    setLandingForm(prev => ({
      ...prev,
      features: [...prev.features, { title: '', description: '' }]
    }));
  };

  const removeFeature = (index: number) => {
    setLandingForm(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  const addFaqItem = () => {
    setLandingForm(prev => ({
      ...prev,
      faq: {
        ...prev.faq,
        items: [...prev.faq.items, { question: '', answer: '' }]
      }
    }));
  };

  const removeFaqItem = (index: number) => {
    setLandingForm(prev => ({
      ...prev,
      faq: {
        ...prev.faq,
        items: prev.faq.items.filter((_, i) => i !== index)
      }
    }));
  };

  const addHowItWorksStep = () => {
    setLandingForm(prev => ({
      ...prev,
      howItWorks: {
        ...prev.howItWorks,
        steps: [...prev.howItWorks.steps, { title: '', description: '' }]
      }
    }));
  };

  const removeHowItWorksStep = (index: number) => {
    setLandingForm(prev => ({
      ...prev,
      howItWorks: {
        ...prev.howItWorks,
        steps: prev.howItWorks.steps.filter((_, i) => i !== index)
      }
    }));
  };

  const addNavItem = () => {
    setLandingForm(prev => ({
      ...prev,
      navbar: {
        ...prev.navbar,
        items: [...prev.navbar.items, { label: '', href: '' }]
      }
    }));
  };

  const removeNavItem = (index: number) => {
    setLandingForm(prev => ({
      ...prev,
      navbar: {
        ...prev.navbar,
        items: prev.navbar.items.filter((_, i) => i !== index)
      }
    }));
  };

  const handleOpenPreview = () => {
    // Save current settings first
    handleSaveLanding();
    // Open landing page in new tab
    window.open('/', '_blank');
  };

  const handleOpenStaffPreview = () => {
    handleSaveStaff();
    window.open('/staff', '_blank');
  };

  const handleOpenHodPreview = () => {
    handleSaveHod();
    window.open('/hod', '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Unsaved Changes Warning Dialog */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Unsaved Changes
            </AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in this tab. Are you sure you want to leave? Your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingTab(null)}>Stay</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmLeave} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">App Settings</h2>
          <p className="text-muted-foreground">Customize app content and branding for all pages</p>
          {hasAnyUnsavedChanges && (
            <div className="flex items-center gap-2 mt-2 text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">You have unsaved changes</span>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px]">Ctrl+S</kbd> Save • <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px]">Ctrl+Z</kbd> Undo
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleOpenPreview}>
            <Eye className="w-4 h-4 mr-2" />
            Live Preview
          </Button>
          <Button variant="outline" onClick={handleResetAll}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset All
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="landing" className="gap-2 relative">
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline">Landing</span>
            {hasLandingChanges && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse" />
            )}
          </TabsTrigger>
          <TabsTrigger value="staff" className="gap-2 relative">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Staff</span>
            {hasStaffChanges && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse" />
            )}
          </TabsTrigger>
          <TabsTrigger value="hod" className="gap-2 relative">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">HOD</span>
            {hasHodChanges && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse" />
            )}
          </TabsTrigger>
          <TabsTrigger value="admin" className="gap-2 relative">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Admin</span>
            {hasAdminChanges && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse" />
            )}
          </TabsTrigger>
          <TabsTrigger value="branding" className="gap-2 relative">
            <Palette className="w-4 h-4" />
            <span className="hidden sm:inline">Branding</span>
            {hasBrandingChanges && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse" />
            )}
          </TabsTrigger>
          <TabsTrigger value="migration" className="gap-2 relative">
            <Database className="w-4 h-4" />
            <span className="hidden sm:inline">Migration</span>
          </TabsTrigger>
        </TabsList>

        {/* Landing Page Settings - Full Content */}
        <TabsContent value="landing" className="mt-6 space-y-6">
          {/* Draggable Sections Order */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GripVertical className="w-5 h-5" />
                Sections Order & Visibility
              </CardTitle>
              <CardDescription>Drag and drop to reorder sections. Toggle visibility for each section.</CardDescription>
            </CardHeader>
            <CardContent>
              <Reorder.Group
                axis="y"
                values={landingSections}
                onReorder={setLandingSections}
                className="space-y-2"
              >
                {landingSections.map((section) => (
                  <Reorder.Item
                    key={section.id}
                    value={section}
                    className="cursor-grab active:cursor-grabbing"
                  >
                    <motion.div
                      className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                        section.enabled
                          ? 'bg-muted/50 border-border'
                          : 'bg-muted/20 border-border/50 opacity-60'
                      }`}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      layout
                    >
                      <GripVertical className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{section.name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {section.enabled ? (
                          <Eye className="w-4 h-4 text-green-500" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-muted-foreground" />
                        )}
                        <Switch
                          checked={section.enabled}
                          onCheckedChange={(checked) => handleToggleSection(section.id, checked)}
                        />
                      </div>
                    </motion.div>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
              
              <div className="flex justify-end mt-4">
                <Button onClick={handleSaveSectionsOrder}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Order
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Landing Page Content
              </CardTitle>
              <CardDescription>Edit all sections of the public landing page</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full space-y-2">
                {/* Navbar Section */}
                <AccordionItem value="navbar" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="font-semibold">Navigation Bar</span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Sign In Button Text</Label>
                        <Input
                          value={landingForm.navbar.signInText}
                          onChange={(e) => setLandingForm(prev => ({
                            ...prev,
                            navbar: { ...prev.navbar, signInText: e.target.value }
                          }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Get Started Button Text</Label>
                        <Input
                          value={landingForm.navbar.getStartedText}
                          onChange={(e) => setLandingForm(prev => ({
                            ...prev,
                            navbar: { ...prev.navbar, getStartedText: e.target.value }
                          }))}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Navigation Items</Label>
                        <Button variant="outline" size="sm" onClick={addNavItem}>
                          <Plus className="w-3 h-3 mr-1" /> Add Item
                        </Button>
                      </div>
                      {landingForm.navbar.items.map((item, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={item.label}
                            onChange={(e) => {
                              const updated = [...landingForm.navbar.items];
                              updated[index] = { ...updated[index], label: e.target.value };
                              setLandingForm(prev => ({ ...prev, navbar: { ...prev.navbar, items: updated } }));
                            }}
                            placeholder="Label"
                            className="flex-1"
                          />
                          <Input
                            value={item.href}
                            onChange={(e) => {
                              const updated = [...landingForm.navbar.items];
                              updated[index] = { ...updated[index], href: e.target.value };
                              setLandingForm(prev => ({ ...prev, navbar: { ...prev.navbar, items: updated } }));
                            }}
                            placeholder="#section-id"
                            className="flex-1"
                          />
                          <Button variant="ghost" size="icon" onClick={() => removeNavItem(index)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Hero Section */}
                <AccordionItem value="hero" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="font-semibold">Hero Section</span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label>Hero Title</Label>
                      <Input
                        value={landingForm.heroTitle}
                        onChange={(e) => setLandingForm(prev => ({ ...prev, heroTitle: e.target.value }))}
                        placeholder="Main headline"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Hero Subtitle</Label>
                      <Input
                        value={landingForm.heroSubtitle}
                        onChange={(e) => setLandingForm(prev => ({ ...prev, heroSubtitle: e.target.value }))}
                        placeholder="Subtitle text"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Hero Description</Label>
                      <Textarea
                        value={landingForm.heroDescription}
                        onChange={(e) => setLandingForm(prev => ({ ...prev, heroDescription: e.target.value }))}
                        placeholder="Description text"
                        rows={3}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Features Section */}
                <AccordionItem value="features" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="font-semibold">Features Section</span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <Label>Features</Label>
                      <Button variant="outline" size="sm" onClick={addFeature}>
                        <Plus className="w-3 h-3 mr-1" /> Add Feature
                      </Button>
                    </div>
                    {landingForm.features.map((feature, index) => (
                      <div key={index} className="p-4 border border-border rounded-lg space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Feature {index + 1}</span>
                          <Button variant="ghost" size="icon" onClick={() => removeFeature(index)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                        <Input
                          value={feature.title}
                          onChange={(e) => {
                            const updated = [...landingForm.features];
                            updated[index] = { ...updated[index], title: e.target.value };
                            setLandingForm(prev => ({ ...prev, features: updated }));
                          }}
                          placeholder="Feature title"
                        />
                        <Textarea
                          value={feature.description}
                          onChange={(e) => {
                            const updated = [...landingForm.features];
                            updated[index] = { ...updated[index], description: e.target.value };
                            setLandingForm(prev => ({ ...prev, features: updated }));
                          }}
                          placeholder="Feature description"
                          rows={2}
                        />
                      </div>
                    ))}
                  </AccordionContent>
                </AccordionItem>

                {/* Bloom's Taxonomy Section */}
                <AccordionItem value="blooms" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="font-semibold">Bloom's Taxonomy Section</span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label>Section Title</Label>
                      <Input
                        value={landingForm.bloomsTaxonomy.title}
                        onChange={(e) => setLandingForm(prev => ({
                          ...prev,
                          bloomsTaxonomy: { ...prev.bloomsTaxonomy, title: e.target.value }
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Section Description</Label>
                      <Textarea
                        value={landingForm.bloomsTaxonomy.description}
                        onChange={(e) => setLandingForm(prev => ({
                          ...prev,
                          bloomsTaxonomy: { ...prev.bloomsTaxonomy, description: e.target.value }
                        }))}
                        rows={2}
                      />
                    </div>
                    <Label>Taxonomy Levels</Label>
                    {landingForm.bloomsTaxonomy.levels.map((level, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <Input
                          value={level.name}
                          onChange={(e) => {
                            const updated = [...landingForm.bloomsTaxonomy.levels];
                            updated[index] = { ...updated[index], name: e.target.value };
                            setLandingForm(prev => ({ ...prev, bloomsTaxonomy: { ...prev.bloomsTaxonomy, levels: updated } }));
                          }}
                          placeholder="Level name"
                          className="w-32"
                        />
                        <Input
                          value={level.description}
                          onChange={(e) => {
                            const updated = [...landingForm.bloomsTaxonomy.levels];
                            updated[index] = { ...updated[index], description: e.target.value };
                            setLandingForm(prev => ({ ...prev, bloomsTaxonomy: { ...prev.bloomsTaxonomy, levels: updated } }));
                          }}
                          placeholder="Description"
                          className="flex-1"
                        />
                        <Input
                          type="color"
                          value={level.color}
                          onChange={(e) => {
                            const updated = [...landingForm.bloomsTaxonomy.levels];
                            updated[index] = { ...updated[index], color: e.target.value };
                            setLandingForm(prev => ({ ...prev, bloomsTaxonomy: { ...prev.bloomsTaxonomy, levels: updated } }));
                          }}
                          className="w-12 h-10 p-1"
                        />
                      </div>
                    ))}
                  </AccordionContent>
                </AccordionItem>

                {/* How It Works Section */}
                <AccordionItem value="howitworks" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="font-semibold">How It Works Section</span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Section Title</Label>
                        <Input
                          value={landingForm.howItWorks.title}
                          onChange={(e) => setLandingForm(prev => ({
                            ...prev,
                            howItWorks: { ...prev.howItWorks, title: e.target.value }
                          }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Section Subtitle</Label>
                        <Input
                          value={landingForm.howItWorks.subtitle}
                          onChange={(e) => setLandingForm(prev => ({
                            ...prev,
                            howItWorks: { ...prev.howItWorks, subtitle: e.target.value }
                          }))}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Steps</Label>
                      <Button variant="outline" size="sm" onClick={addHowItWorksStep}>
                        <Plus className="w-3 h-3 mr-1" /> Add Step
                      </Button>
                    </div>
                    {landingForm.howItWorks.steps.map((step, index) => (
                      <div key={index} className="p-4 border border-border rounded-lg space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Step {index + 1}</span>
                          <Button variant="ghost" size="icon" onClick={() => removeHowItWorksStep(index)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                        <Input
                          value={step.title}
                          onChange={(e) => {
                            const updated = [...landingForm.howItWorks.steps];
                            updated[index] = { ...updated[index], title: e.target.value };
                            setLandingForm(prev => ({ ...prev, howItWorks: { ...prev.howItWorks, steps: updated } }));
                          }}
                          placeholder="Step title"
                        />
                        <Textarea
                          value={step.description}
                          onChange={(e) => {
                            const updated = [...landingForm.howItWorks.steps];
                            updated[index] = { ...updated[index], description: e.target.value };
                            setLandingForm(prev => ({ ...prev, howItWorks: { ...prev.howItWorks, steps: updated } }));
                          }}
                          placeholder="Step description"
                          rows={2}
                        />
                      </div>
                    ))}
                  </AccordionContent>
                </AccordionItem>

                {/* AI Assistant Section */}
                <AccordionItem value="aiassistant" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="font-semibold">AI Assistant Section</span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Section Title</Label>
                        <Input
                          value={landingForm.aiAssistant.title}
                          onChange={(e) => setLandingForm(prev => ({
                            ...prev,
                            aiAssistant: { ...prev.aiAssistant, title: e.target.value }
                          }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Section Subtitle</Label>
                        <Input
                          value={landingForm.aiAssistant.subtitle}
                          onChange={(e) => setLandingForm(prev => ({
                            ...prev,
                            aiAssistant: { ...prev.aiAssistant, subtitle: e.target.value }
                          }))}
                        />
                      </div>
                    </div>
                    <Label>AI Features</Label>
                    {landingForm.aiAssistant.features.map((feature, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={feature.title}
                          onChange={(e) => {
                            const updated = [...landingForm.aiAssistant.features];
                            updated[index] = { ...updated[index], title: e.target.value };
                            setLandingForm(prev => ({ ...prev, aiAssistant: { ...prev.aiAssistant, features: updated } }));
                          }}
                          placeholder="Feature title"
                          className="flex-1"
                        />
                        <Input
                          value={feature.description}
                          onChange={(e) => {
                            const updated = [...landingForm.aiAssistant.features];
                            updated[index] = { ...updated[index], description: e.target.value };
                            setLandingForm(prev => ({ ...prev, aiAssistant: { ...prev.aiAssistant, features: updated } }));
                          }}
                          placeholder="Description"
                          className="flex-1"
                        />
                      </div>
                    ))}
                  </AccordionContent>
                </AccordionItem>

                {/* FAQ Section */}
                <AccordionItem value="faq" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="font-semibold">FAQ Section</span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Section Title</Label>
                        <Input
                          value={landingForm.faq.title}
                          onChange={(e) => setLandingForm(prev => ({
                            ...prev,
                            faq: { ...prev.faq, title: e.target.value }
                          }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Section Subtitle</Label>
                        <Input
                          value={landingForm.faq.subtitle}
                          onChange={(e) => setLandingForm(prev => ({
                            ...prev,
                            faq: { ...prev.faq, subtitle: e.target.value }
                          }))}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>FAQ Items</Label>
                      <Button variant="outline" size="sm" onClick={addFaqItem}>
                        <Plus className="w-3 h-3 mr-1" /> Add FAQ
                      </Button>
                    </div>
                    {landingForm.faq.items.map((item, index) => (
                      <div key={index} className="p-4 border border-border rounded-lg space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">FAQ {index + 1}</span>
                          <Button variant="ghost" size="icon" onClick={() => removeFaqItem(index)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                        <Input
                          value={item.question}
                          onChange={(e) => {
                            const updated = [...landingForm.faq.items];
                            updated[index] = { ...updated[index], question: e.target.value };
                            setLandingForm(prev => ({ ...prev, faq: { ...prev.faq, items: updated } }));
                          }}
                          placeholder="Question"
                        />
                        <Textarea
                          value={item.answer}
                          onChange={(e) => {
                            const updated = [...landingForm.faq.items];
                            updated[index] = { ...updated[index], answer: e.target.value };
                            setLandingForm(prev => ({ ...prev, faq: { ...prev.faq, items: updated } }));
                          }}
                          placeholder="Answer"
                          rows={2}
                        />
                      </div>
                    ))}
                  </AccordionContent>
                </AccordionItem>

                {/* Contact Section */}
                <AccordionItem value="contact" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="font-semibold">Contact Section</span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Section Title</Label>
                        <Input
                          value={landingForm.contact.title}
                          onChange={(e) => setLandingForm(prev => ({
                            ...prev,
                            contact: { ...prev.contact, title: e.target.value }
                          }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Section Subtitle</Label>
                        <Input
                          value={landingForm.contact.subtitle}
                          onChange={(e) => setLandingForm(prev => ({
                            ...prev,
                            contact: { ...prev.contact, subtitle: e.target.value }
                          }))}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        value={landingForm.contact.email}
                        onChange={(e) => setLandingForm(prev => ({
                          ...prev,
                          contact: { ...prev.contact, email: e.target.value }
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        value={landingForm.contact.phone}
                        onChange={(e) => setLandingForm(prev => ({
                          ...prev,
                          contact: { ...prev.contact, phone: e.target.value }
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Address</Label>
                      <Textarea
                        value={landingForm.contact.address}
                        onChange={(e) => setLandingForm(prev => ({
                          ...prev,
                          contact: { ...prev.contact, address: e.target.value }
                        }))}
                        rows={2}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Feedback Section */}
                <AccordionItem value="feedback" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="font-semibold">Feedback Section</span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label>Section Title</Label>
                      <Input
                        value={landingForm.feedback.title}
                        onChange={(e) => setLandingForm(prev => ({
                          ...prev,
                          feedback: { ...prev.feedback, title: e.target.value }
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Section Subtitle</Label>
                      <Input
                        value={landingForm.feedback.subtitle}
                        onChange={(e) => setLandingForm(prev => ({
                          ...prev,
                          feedback: { ...prev.feedback, subtitle: e.target.value }
                        }))}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Footer Section */}
                <AccordionItem value="footer" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="font-semibold">Footer Section</span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label>Footer Description</Label>
                      <Textarea
                        value={landingForm.footer.description}
                        onChange={(e) => setLandingForm(prev => ({
                          ...prev,
                          footer: { ...prev.footer, description: e.target.value }
                        }))}
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Copyright Text</Label>
                      <Input
                        value={landingForm.footer.copyright}
                        onChange={(e) => setLandingForm(prev => ({
                          ...prev,
                          footer: { ...prev.footer, copyright: e.target.value }
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Made With Text</Label>
                      <Input
                        value={landingForm.footer.madeWith}
                        onChange={(e) => setLandingForm(prev => ({
                          ...prev,
                          footer: { ...prev.footer, madeWith: e.target.value }
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Social Links</Label>
                      {landingForm.footer.socialLinks.map((link, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={link.platform}
                            onChange={(e) => {
                              const updated = [...landingForm.footer.socialLinks];
                              updated[index] = { ...updated[index], platform: e.target.value };
                              setLandingForm(prev => ({ ...prev, footer: { ...prev.footer, socialLinks: updated } }));
                            }}
                            placeholder="Platform (x, linkedin, github, email)"
                            className="w-40"
                          />
                          <Input
                            value={link.url}
                            onChange={(e) => {
                              const updated = [...landingForm.footer.socialLinks];
                              updated[index] = { ...updated[index], url: e.target.value };
                              setLandingForm(prev => ({ ...prev, footer: { ...prev.footer, socialLinks: updated } }));
                            }}
                            placeholder="URL"
                            className="flex-1"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <Label>Product Links</Label>
                      {landingForm.footer.productLinks.map((link, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={link.label}
                            onChange={(e) => {
                              const updated = [...landingForm.footer.productLinks];
                              updated[index] = { ...updated[index], label: e.target.value };
                              setLandingForm(prev => ({ ...prev, footer: { ...prev.footer, productLinks: updated } }));
                            }}
                            placeholder="Label"
                            className="flex-1"
                          />
                          <Input
                            value={link.href}
                            onChange={(e) => {
                              const updated = [...landingForm.footer.productLinks];
                              updated[index] = { ...updated[index], href: e.target.value };
                              setLandingForm(prev => ({ ...prev, footer: { ...prev.footer, productLinks: updated } }));
                            }}
                            placeholder="Link"
                            className="flex-1"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <Label>Company Links</Label>
                      {landingForm.footer.companyLinks.map((link, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={link.label}
                            onChange={(e) => {
                              const updated = [...landingForm.footer.companyLinks];
                              updated[index] = { ...updated[index], label: e.target.value };
                              setLandingForm(prev => ({ ...prev, footer: { ...prev.footer, companyLinks: updated } }));
                            }}
                            placeholder="Label"
                            className="flex-1"
                          />
                          <Input
                            value={link.href}
                            onChange={(e) => {
                              const updated = [...landingForm.footer.companyLinks];
                              updated[index] = { ...updated[index], href: e.target.value };
                              setLandingForm(prev => ({ ...prev, footer: { ...prev.footer, companyLinks: updated } }));
                            }}
                            placeholder="Link"
                            className="flex-1"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <Label>Legal Links</Label>
                      {landingForm.footer.legalLinks.map((link, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={link.label}
                            onChange={(e) => {
                              const updated = [...landingForm.footer.legalLinks];
                              updated[index] = { ...updated[index], label: e.target.value };
                              setLandingForm(prev => ({ ...prev, footer: { ...prev.footer, legalLinks: updated } }));
                            }}
                            placeholder="Label"
                            className="flex-1"
                          />
                          <Input
                            value={link.href}
                            onChange={(e) => {
                              const updated = [...landingForm.footer.legalLinks];
                              updated[index] = { ...updated[index], href: e.target.value };
                              setLandingForm(prev => ({ ...prev, footer: { ...prev.footer, legalLinks: updated } }));
                            }}
                            placeholder="Link"
                            className="flex-1"
                          />
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="flex gap-3 mt-6">
                <Button onClick={handleSaveLanding} className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  Save Landing Page Settings
                </Button>
                <Button variant="outline" onClick={handleUndoLanding}>
                  <Undo2 className="w-4 h-4 mr-2" />
                  Undo Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Staff Dashboard Settings */}
        <TabsContent value="staff" className="mt-6 space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Staff Dashboard Content
              </CardTitle>
              <CardDescription>Customize all content visible on the staff dashboard</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full space-y-2">
                {/* Welcome Section */}
                <AccordionItem value="welcome" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="font-semibold">Welcome Section</span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label>Dashboard Title</Label>
                      <Input
                        value={staffForm.dashboardTitle}
                        onChange={(e) => setStaffForm({ ...staffForm, dashboardTitle: e.target.value })}
                        placeholder="Dashboard title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Welcome Message</Label>
                      <Input
                        value={staffForm.welcomeMessage}
                        onChange={(e) => setStaffForm({ ...staffForm, welcomeMessage: e.target.value })}
                        placeholder="Welcome message greeting"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Welcome Subtitle</Label>
                      <Textarea
                        value={staffForm.welcomeSubtitle}
                        onChange={(e) => setStaffForm({ ...staffForm, welcomeSubtitle: e.target.value })}
                        placeholder="Subtitle text below welcome"
                        rows={2}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Quick Actions */}
                <AccordionItem value="quickActions" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="font-semibold">Quick Actions</span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    {staffForm.quickActions?.map((action, index) => (
                      <div key={index} className="p-3 border rounded-lg space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Action {index + 1}</span>
                        </div>
                        <Input
                          value={action.label}
                          onChange={(e) => {
                            const updated = [...(staffForm.quickActions || [])];
                            updated[index] = { ...updated[index], label: e.target.value };
                            setStaffForm({ ...staffForm, quickActions: updated });
                          }}
                          placeholder="Button label"
                        />
                        <Input
                          value={action.path}
                          onChange={(e) => {
                            const updated = [...(staffForm.quickActions || [])];
                            updated[index] = { ...updated[index], path: e.target.value };
                            setStaffForm({ ...staffForm, quickActions: updated });
                          }}
                          placeholder="Navigation path (e.g., /staff/upload)"
                        />
                      </div>
                    ))}
                  </AccordionContent>
                </AccordionItem>

                {/* Statistics Labels */}
                <AccordionItem value="stats" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="font-semibold">Statistics Cards Labels</span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Total Questions Label</Label>
                        <Input
                          value={staffForm.stats?.totalQuestionsLabel}
                          onChange={(e) => setStaffForm({ 
                            ...staffForm, 
                            stats: { ...staffForm.stats, totalQuestionsLabel: e.target.value } 
                          })}
                          placeholder="Total Questions"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Approved Label</Label>
                        <Input
                          value={staffForm.stats?.approvedLabel}
                          onChange={(e) => setStaffForm({ 
                            ...staffForm, 
                            stats: { ...staffForm.stats, approvedLabel: e.target.value } 
                          })}
                          placeholder="Approved"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Pending Label</Label>
                        <Input
                          value={staffForm.stats?.pendingLabel}
                          onChange={(e) => setStaffForm({ 
                            ...staffForm, 
                            stats: { ...staffForm.stats, pendingLabel: e.target.value } 
                          })}
                          placeholder="Pending Review"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Revisions Label</Label>
                        <Input
                          value={staffForm.stats?.revisionsLabel}
                          onChange={(e) => setStaffForm({ 
                            ...staffForm, 
                            stats: { ...staffForm.stats, revisionsLabel: e.target.value } 
                          })}
                          placeholder="Needs Revision"
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Question Management Section */}
                <AccordionItem value="questionManagement" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="font-semibold">Question Management Section</span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label>Section Title</Label>
                      <Input
                        value={staffForm.questionManagementTitle}
                        onChange={(e) => setStaffForm({ ...staffForm, questionManagementTitle: e.target.value })}
                        placeholder="Question Management"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Recent Questions Tab</Label>
                        <Input
                          value={staffForm.recentQuestionsTab}
                          onChange={(e) => setStaffForm({ ...staffForm, recentQuestionsTab: e.target.value })}
                          placeholder="Recent Questions"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Question History Tab</Label>
                        <Input
                          value={staffForm.questionHistoryTab}
                          onChange={(e) => setStaffForm({ ...staffForm, questionHistoryTab: e.target.value })}
                          placeholder="Question History"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Empty State Message</Label>
                      <Textarea
                        value={staffForm.emptyStateMessage}
                        onChange={(e) => setStaffForm({ ...staffForm, emptyStateMessage: e.target.value })}
                        placeholder="Message when no questions exist"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Empty State Button Text</Label>
                      <Input
                        value={staffForm.emptyStateButtonText}
                        onChange={(e) => setStaffForm({ ...staffForm, emptyStateButtonText: e.target.value })}
                        placeholder="Generate Questions"
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="flex gap-3 mt-6">
                <Button onClick={handleSaveStaff} className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  Save Staff Dashboard Settings
                </Button>
                <Button variant="outline" onClick={handleUndoStaff}>
                  <Undo2 className="w-4 h-4 mr-2" />
                  Undo
                </Button>
                <Button variant="outline" onClick={handleOpenStaffPreview}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Preview
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HOD Dashboard Settings */}
        <TabsContent value="hod" className="mt-6 space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                HOD Dashboard Content
              </CardTitle>
              <CardDescription>Customize all content visible on the HOD dashboard</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full space-y-2">
                {/* Welcome Section */}
                <AccordionItem value="welcome" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="font-semibold">Welcome Section</span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label>Dashboard Title</Label>
                      <Input
                        value={hodForm.dashboardTitle}
                        onChange={(e) => setHodForm({ ...hodForm, dashboardTitle: e.target.value })}
                        placeholder="Dashboard title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Welcome Greeting</Label>
                      <Input
                        value={hodForm.welcomeMessage}
                        onChange={(e) => setHodForm({ ...hodForm, welcomeMessage: e.target.value })}
                        placeholder="Hello"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Welcome Subtitle</Label>
                      <Textarea
                        value={hodForm.welcomeSubtitle}
                        onChange={(e) => setHodForm({ ...hodForm, welcomeSubtitle: e.target.value })}
                        placeholder="questions and papers waiting for review"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Review Button Text</Label>
                      <Input
                        value={hodForm.reviewButtonText}
                        onChange={(e) => setHodForm({ ...hodForm, reviewButtonText: e.target.value })}
                        placeholder="Review All"
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Statistics Labels */}
                <AccordionItem value="stats" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="font-semibold">Statistics Cards Labels</span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Pending Questions Label</Label>
                        <Input
                          value={hodForm.stats?.pendingLabel}
                          onChange={(e) => setHodForm({ 
                            ...hodForm, 
                            stats: { ...hodForm.stats, pendingLabel: e.target.value } 
                          })}
                          placeholder="Pending Questions"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Approved Label</Label>
                        <Input
                          value={hodForm.stats?.approvedLabel}
                          onChange={(e) => setHodForm({ 
                            ...hodForm, 
                            stats: { ...hodForm.stats, approvedLabel: e.target.value } 
                          })}
                          placeholder="Approved"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Rejected Label</Label>
                        <Input
                          value={hodForm.stats?.rejectedLabel}
                          onChange={(e) => setHodForm({ 
                            ...hodForm, 
                            stats: { ...hodForm.stats, rejectedLabel: e.target.value } 
                          })}
                          placeholder="Rejected"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Total Papers Label</Label>
                        <Input
                          value={hodForm.stats?.totalPapersLabel}
                          onChange={(e) => setHodForm({ 
                            ...hodForm, 
                            stats: { ...hodForm.stats, totalPapersLabel: e.target.value } 
                          })}
                          placeholder="Total Papers"
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Review Section */}
                <AccordionItem value="review" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="font-semibold">Review Section</span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label>Section Title</Label>
                      <Input
                        value={hodForm.reviewSectionTitle}
                        onChange={(e) => setHodForm({ ...hodForm, reviewSectionTitle: e.target.value })}
                        placeholder="Pending Reviews"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Section Subtitle</Label>
                      <Textarea
                        value={hodForm.reviewSectionSubtitle}
                        onChange={(e) => setHodForm({ ...hodForm, reviewSectionSubtitle: e.target.value })}
                        placeholder="Review and approve questions and question papers"
                        rows={2}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Questions Tab Label</Label>
                        <Input
                          value={hodForm.questionsTabLabel}
                          onChange={(e) => setHodForm({ ...hodForm, questionsTabLabel: e.target.value })}
                          placeholder="Questions"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Papers Tab Label</Label>
                        <Input
                          value={hodForm.papersTabLabel}
                          onChange={(e) => setHodForm({ ...hodForm, papersTabLabel: e.target.value })}
                          placeholder="Papers"
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Action Buttons */}
                <AccordionItem value="actions" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="font-semibold">Action Button Labels</span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Approve Button</Label>
                        <Input
                          value={hodForm.approveButtonText}
                          onChange={(e) => setHodForm({ ...hodForm, approveButtonText: e.target.value })}
                          placeholder="Approve"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Reject Button</Label>
                        <Input
                          value={hodForm.rejectButtonText}
                          onChange={(e) => setHodForm({ ...hodForm, rejectButtonText: e.target.value })}
                          placeholder="Reject"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Bulk Approve Button</Label>
                        <Input
                          value={hodForm.bulkApproveText}
                          onChange={(e) => setHodForm({ ...hodForm, bulkApproveText: e.target.value })}
                          placeholder="Approve All"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Bulk Reject Button</Label>
                        <Input
                          value={hodForm.bulkRejectText}
                          onChange={(e) => setHodForm({ ...hodForm, bulkRejectText: e.target.value })}
                          placeholder="Reject All"
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Empty State Messages */}
                <AccordionItem value="emptyStates" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="font-semibold">Empty State Messages</span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label>No Questions Message</Label>
                      <Textarea
                        value={hodForm.noQuestionsMessage}
                        onChange={(e) => setHodForm({ ...hodForm, noQuestionsMessage: e.target.value })}
                        placeholder="No pending questions to review!"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>No Papers Message</Label>
                      <Textarea
                        value={hodForm.noPapersMessage}
                        onChange={(e) => setHodForm({ ...hodForm, noPapersMessage: e.target.value })}
                        placeholder="No pending papers to review!"
                        rows={2}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="flex gap-3 mt-6">
                <Button onClick={handleSaveHod} className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  Save HOD Dashboard Settings
                </Button>
                <Button variant="outline" onClick={handleUndoHod}>
                  <Undo2 className="w-4 h-4 mr-2" />
                  Undo
                </Button>
                <Button variant="outline" onClick={handleOpenHodPreview}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Preview
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Admin Dashboard Settings */}
        <TabsContent value="admin" className="mt-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Admin Dashboard Content
              </CardTitle>
              <CardDescription>Customize admin dashboard messages</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Dashboard Title</Label>
                <Input
                  value={adminForm.dashboardTitle}
                  onChange={(e) => setAdminForm({ ...adminForm, dashboardTitle: e.target.value })}
                  placeholder="Dashboard title"
                />
              </div>
              <div className="space-y-2">
                <Label>Welcome Message</Label>
                <Textarea
                  value={adminForm.welcomeMessage}
                  onChange={(e) => setAdminForm({ ...adminForm, welcomeMessage: e.target.value })}
                  placeholder="Welcome message for admin"
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <Button onClick={handleSaveAdmin} className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  Save Admin Settings
                </Button>
                <Button variant="outline" onClick={handleUndoAdmin}>
                  <Undo2 className="w-4 h-4 mr-2" />
                  Undo Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding Settings */}
        <TabsContent value="branding" className="mt-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Branding & Theme
              </CardTitle>
              <CardDescription>Customize app branding and colors</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>App Name</Label>
                <Input
                  value={brandingForm.appName}
                  onChange={(e) => setBrandingForm({ ...brandingForm, appName: e.target.value })}
                  placeholder="Application name"
                />
              </div>
              <div className="space-y-2">
                <Label>Tagline</Label>
                <Input
                  value={brandingForm.tagline}
                  onChange={(e) => setBrandingForm({ ...brandingForm, tagline: e.target.value })}
                  placeholder="App tagline"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={brandingForm.primaryColor}
                      onChange={(e) => setBrandingForm({ ...brandingForm, primaryColor: e.target.value })}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={brandingForm.primaryColor}
                      onChange={(e) => setBrandingForm({ ...brandingForm, primaryColor: e.target.value })}
                      placeholder="#6366f1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Accent Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={brandingForm.accentColor}
                      onChange={(e) => setBrandingForm({ ...brandingForm, accentColor: e.target.value })}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={brandingForm.accentColor}
                      onChange={(e) => setBrandingForm({ ...brandingForm, accentColor: e.target.value })}
                      placeholder="#8b5cf6"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <Button onClick={handleSaveBranding} className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  Save Branding Settings
                </Button>
                <Button variant="outline" onClick={handleUndoBranding}>
                  <Undo2 className="w-4 h-4 mr-2" />
                  Undo Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Migration Tab */}
        <TabsContent value="migration" className="mt-6">
          <DataMigrationPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AppSettings;
