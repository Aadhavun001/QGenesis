import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database,
  Cloud,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Upload,
  RefreshCw,
  FileJson,
  Users,
  FileText,
  Bell,
  BookOpen,
  HardDrive,
  Loader2,
  Play,
  Pause,
  RotateCcw,
  Eye,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { isFirebaseConfigured } from '@/services/firebase/firestore-config';
import { 
  migrationService, 
  extractLocalData,
  MigrationStatus 
} from '@/services/firebase/migrationUtility';

// Local types for the panel
interface LocalStorageData {
  users: any[];
  questions: any[];
  papers: any[];
  notifications: any[];
  questionBank: any[];
  chatSessions: any[];
  appSettings: any | null;
}

interface CollectionPreview {
  name: string;
  icon: React.ReactNode;
  count: number;
  size: string;
  status: 'pending' | 'migrating' | 'completed' | 'failed' | 'skipped';
  details?: any[];
}

const DataMigrationPanel: React.FC = () => {
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState<MigrationStatus | null>(null);
  const [localData, setLocalData] = useState<LocalStorageData | null>(null);
  const [collections, setCollections] = useState<CollectionPreview[]>([]);
  const [expandedPreview, setExpandedPreview] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    setFirebaseReady(isFirebaseConfigured());
    loadLocalStoragePreview();
  }, []);

  const loadLocalStoragePreview = () => {
    // Extract data using the migrationService
    const users = extractLocalData.users();
    const questions = extractLocalData.questions();
    const papers = extractLocalData.papers();
    const notifications = extractLocalData.notifications();
    const questionBank = extractLocalData.questionBank();
    const appSettings = extractLocalData.appSettings();

    const data: LocalStorageData = {
      users,
      questions,
      papers,
      notifications,
      questionBank,
      chatSessions: [], // Chat sessions handled separately
      appSettings,
    };
    setLocalData(data);

    const collectionsList: CollectionPreview[] = [
      {
        name: 'Users',
        icon: <Users className="w-5 h-5" />,
        count: data.users.length,
        size: formatBytes(JSON.stringify(data.users).length),
        status: 'pending',
        details: data.users.slice(0, 5)
      },
      {
        name: 'Questions',
        icon: <FileText className="w-5 h-5" />,
        count: data.questions.length,
        size: formatBytes(JSON.stringify(data.questions).length),
        status: 'pending',
        details: data.questions.slice(0, 5)
      },
      {
        name: 'Papers',
        icon: <BookOpen className="w-5 h-5" />,
        count: data.papers.length,
        size: formatBytes(JSON.stringify(data.papers).length),
        status: 'pending',
        details: data.papers.slice(0, 5)
      },
      {
        name: 'Notifications',
        icon: <Bell className="w-5 h-5" />,
        count: data.notifications.length,
        size: formatBytes(JSON.stringify(data.notifications).length),
        status: 'pending',
        details: data.notifications.slice(0, 5)
      },
      {
        name: 'Question Bank',
        icon: <Database className="w-5 h-5" />,
        count: data.questionBank.length,
        size: formatBytes(JSON.stringify(data.questionBank).length),
        status: 'pending',
        details: data.questionBank.slice(0, 5)
      },
      {
        name: 'Chat Sessions',
        icon: <FileJson className="w-5 h-5" />,
        count: data.chatSessions.length,
        size: formatBytes(JSON.stringify(data.chatSessions).length),
        status: 'pending',
        details: data.chatSessions.slice(0, 5)
      },
      {
        name: 'App Settings',
        icon: <HardDrive className="w-5 h-5" />,
        count: data.appSettings ? 1 : 0,
        size: formatBytes(JSON.stringify(data.appSettings || {}).length),
        status: 'pending',
        details: data.appSettings ? [data.appSettings] : []
      },
    ];

    setCollections(collectionsList);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getTotalRecords = (): number => {
    return collections.reduce((sum, col) => sum + col.count, 0);
  };

  const getTotalSize = (): string => {
    if (!localData) return '0 B';
    const totalBytes = JSON.stringify(localData).length;
    return formatBytes(totalBytes);
  };

  const handleDownloadBackup = () => {
    try {
      // Create a backup JSON file from the current localStorage data
      if (!localData) {
        toast.error('No data to backup');
        return;
      }
      const backup = JSON.stringify(localData, null, 2);
      const blob = new Blob([backup], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qgenesis-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Backup downloaded successfully');
    } catch (error) {
      toast.error('Failed to download backup');
    }
  };

  const handleStartMigration = async () => {
    if (!firebaseReady) {
      toast.error('Firebase is not configured. Please set up Firebase first.');
      return;
    }

    setShowConfirmDialog(false);
    setIsMigrating(true);

    try {
      // Update collection statuses as migration progresses
      const updateCollectionStatus = (name: string, status: CollectionPreview['status']) => {
        setCollections(prev => prev.map(col => 
          col.name === name ? { ...col, status } : col
        ));
      };

      // Simulate migration progress for each collection
      for (const collection of collections) {
        if (collection.count === 0) {
          updateCollectionStatus(collection.name, 'skipped');
          continue;
        }

        updateCollectionStatus(collection.name, 'migrating');
        
        // Simulate migration delay (in real scenario, this would be actual Firestore writes)
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
        
        updateCollectionStatus(collection.name, 'completed');
      }

      // Run actual migration using the migrationService
      const result = await migrationService.migrateAllData((status) => {
        setMigrationProgress(status);
      });
      setMigrationProgress(result);

      if (result.isComplete && result.failedItems === 0) {
        toast.success('Data migration completed successfully!');
      } else if (result.isComplete) {
        toast.error('Migration completed with some errors. Check the logs.');
      }
    } catch (error) {
      console.error('Migration error:', error);
      toast.error('Migration failed. Please try again.');
    } finally {
      setIsMigrating(false);
    }
  };

  const handleResetMigration = () => {
    setMigrationProgress(null);
    loadLocalStoragePreview();
  };

  const getStatusIcon = (status: CollectionPreview['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'migrating':
        return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
      case 'skipped':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />;
    }
  };

  const getStatusBadge = (status: CollectionPreview['status']) => {
    const variants: Record<string, string> = {
      pending: 'bg-muted text-muted-foreground',
      migrating: 'bg-primary/20 text-primary',
      completed: 'bg-green-500/20 text-green-600 dark:text-green-400',
      failed: 'bg-red-500/20 text-red-600 dark:text-red-400',
      skipped: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
    };
    return variants[status] || variants.pending;
  };

  const completedCount = collections.filter(c => c.status === 'completed').length;
  const progressPercent = collections.length > 0 
    ? (completedCount / collections.length) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Database className="w-7 h-7 text-primary" />
            Data Migration
          </h2>
          <p className="text-muted-foreground mt-1">
            Migrate your localStorage data to Firebase Firestore
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadBackup}>
            <Download className="w-4 h-4 mr-2" />
            Download Backup
          </Button>
          <Button variant="outline" onClick={loadLocalStoragePreview}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Firebase Status */}
      <Card className={`border-2 ${firebaseReady ? 'border-green-500/30 bg-green-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${firebaseReady ? 'bg-green-500/20' : 'bg-amber-500/20'}`}>
              <Cloud className={`w-6 h-6 ${firebaseReady ? 'text-green-500' : 'text-amber-500'}`} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">
                {firebaseReady ? 'Firebase Connected' : 'Firebase Not Configured'}
              </h3>
              <p className="text-muted-foreground text-sm">
                {firebaseReady 
                  ? 'Your app is connected to Firebase and ready for data migration.' 
                  : 'Please configure Firebase credentials in firestore-config.ts before migrating.'}
              </p>
            </div>
            {firebaseReady ? (
              <Badge variant="outline" className="bg-green-500/20 text-green-600 border-green-500/30">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Ready
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-500/20 text-amber-600 border-amber-500/30">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Setup Required
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Migration Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <HardDrive className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{getTotalRecords()}</p>
                <p className="text-sm text-muted-foreground">Total Records</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <FileJson className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{getTotalSize()}</p>
                <p className="text-sm text-muted-foreground">Data Size</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Database className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{collections.length}</p>
                <p className="text-sm text-muted-foreground">Collections</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Migration Progress (when migrating) */}
      {isMigrating && (
        <Card className="border-primary/30">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  Migration in Progress
                </h3>
                <span className="text-sm text-muted-foreground">
                  {completedCount} / {collections.length} collections
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Collections Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Collections Preview
          </CardTitle>
          <CardDescription>
            Review the data that will be migrated to Firestore
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {collections.map((collection) => (
              <motion.div
                key={collection.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border rounded-xl overflow-hidden"
              >
                <div 
                  className={`p-4 flex items-center gap-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                    collection.status === 'migrating' ? 'bg-primary/5' : ''
                  }`}
                  onClick={() => setExpandedPreview(
                    expandedPreview === collection.name ? null : collection.name
                  )}
                >
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    {collection.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{collection.name}</h4>
                      <Badge variant="outline" className={getStatusBadge(collection.status)}>
                        {collection.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {collection.count} records • {collection.size}
                    </p>
                  </div>
                  {getStatusIcon(collection.status)}
                  {collection.count > 0 && (
                    expandedPreview === collection.name 
                      ? <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      : <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>

                <AnimatePresence>
                  {expandedPreview === collection.name && collection.details && collection.details.length > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t"
                    >
                      <ScrollArea className="h-[200px]">
                        <div className="p-4 bg-muted/30">
                          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                            <Info className="w-3 h-3" />
                            Showing first {collection.details.length} records
                          </p>
                          <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words">
                            {JSON.stringify(collection.details, null, 2)}
                          </pre>
                        </div>
                      </ScrollArea>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Migration Actions */}
      <Card className="border-primary/30">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-lg">Ready to Migrate?</h3>
              <p className="text-muted-foreground text-sm mt-1">
                This will copy all your localStorage data to Firestore. Your local data will remain intact.
              </p>
            </div>
            <div className="flex gap-2">
              {migrationProgress && (
                <Button variant="outline" onClick={handleResetMigration}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              )}
              <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <AlertDialogTrigger asChild>
                  <Button 
                    disabled={!firebaseReady || isMigrating || getTotalRecords() === 0}
                    className="bg-gradient-to-r from-primary to-purple-600"
                  >
                    {isMigrating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Migrating...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Start Migration
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <Database className="w-5 h-5 text-primary" />
                      Confirm Data Migration
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                      <p>You are about to migrate:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li><strong>{getTotalRecords()}</strong> total records</li>
                        <li><strong>{collections.length}</strong> collections</li>
                        <li><strong>{getTotalSize()}</strong> of data</li>
                      </ul>
                      <p className="text-amber-600 dark:text-amber-400">
                        ⚠️ It's recommended to download a backup before proceeding.
                      </p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleStartMigration}>
                      Start Migration
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Migration Results */}
      {migrationProgress && (
        <Card className={migrationProgress.isComplete && migrationProgress.failedItems === 0 ? 'border-green-500/30' : 'border-red-500/30'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {migrationProgress.isComplete && migrationProgress.failedItems === 0 ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              Migration {migrationProgress.isComplete && migrationProgress.failedItems === 0 ? 'Completed' : 'Failed'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-green-500">{migrationProgress.migratedItems}</p>
                  <p className="text-xs text-muted-foreground">Migrated</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-red-500">{migrationProgress.errors.length}</p>
                  <p className="text-xs text-muted-foreground">Errors</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">{migrationProgress.totalItems}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">
                    {migrationProgress.totalItems > 0 
                      ? Math.round((migrationProgress.migratedItems / migrationProgress.totalItems) * 100) 
                      : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">Success Rate</p>
                </div>
              </div>

              {migrationProgress.errors.length > 0 && (
                <Accordion type="single" collapsible>
                  <AccordionItem value="errors">
                    <AccordionTrigger className="text-red-500">
                      View Errors ({migrationProgress.errors.length})
                    </AccordionTrigger>
                    <AccordionContent>
                      <ScrollArea className="h-[150px]">
                        <div className="space-y-2">
                          {migrationProgress.errors.map((error, index) => (
                            <div key={index} className="p-2 bg-red-500/10 rounded text-sm text-red-600 dark:text-red-400">
                              {error}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DataMigrationPanel;
