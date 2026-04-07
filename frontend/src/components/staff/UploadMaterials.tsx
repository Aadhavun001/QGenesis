import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Upload, 
  FileText, 
  X, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Search,
  BookOpen,
  Sparkles,
  Database,
  ArrowRight,
  Trash2,
  Clock,
  Zap,
  Scan,
  CloudUpload,
  Cloud
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useQuestionStore, type UploadedMaterial } from '@/stores/questionStore';
import { extractMaterialContent, isBackendAvailable, type ExtractionResult } from '@/services/materialExtraction';
import { extractTopicsFromContent } from '@/services/mockAI';
import { materialStorageService } from '@/services/firebase/materialStorageService';
import { isFirebaseConfigured } from '@/services/firebase/firestore-config';
import { useAuth } from '@/contexts/AuthContext';

interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  progress: number;
  status: 'uploading' | 'reading' | 'analyzing' | 'extracting' | 'completed' | 'error';
  topics?: string[];
  currentStep: number;
  extractionResult?: ExtractionResult;
  extractionMethod?: string;
  startedAt?: number;
  completedAt?: number;
}

const PROCESSING_STEPS = [
  { label: 'Uploading', icon: Upload, description: 'Uploading file to server...' },
  { label: 'Reading', icon: BookOpen, description: 'Reading document content...' },
  { label: 'Analyzing', icon: Search, description: 'Analyzing document structure...' },
  { label: 'Extracting', icon: Sparkles, description: 'Extracting topics with AI...' },
  { label: 'Saving', icon: Database, description: 'Saving to database...' },
];

const UploadMaterials: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { addMaterial, materials, deleteMaterial, setMaterials, updateMaterial } = useQuestionStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [backendAvailable, setBackendAvailable] = useState(false);
  const [timerNow, setTimerNow] = useState(Date.now());
  const [extractionMode, setExtractionMode] = useState<'quick' | 'full'>('quick');
  const [savingToCloudId, setSavingToCloudId] = useState<string | null>(null);

  // Check if Python backend is available on mount
  React.useEffect(() => {
    isBackendAvailable().then(setBackendAvailable);
  }, []);

  // Hydrate materials from Firestore when signed in so users/{userId}/materials is the source of truth
  React.useEffect(() => {
    if (!user?.id || !isFirebaseConfigured()) return;
    materialStorageService.getMaterialsByStaff(user.id).then((list) => {
      const mapped = list.map((m) => {
        const processedAt = m.processedAt as unknown;
        const createdAt = m.createdAt as unknown;
        const toDate = (v: unknown): Date => {
          if (v && typeof v === 'object' && 'toDate' in (v as object)) return (v as { toDate: () => Date }).toDate();
          if (v instanceof Date) return v;
          return v ? new Date(v as string | number) : new Date();
        };
        return {
          id: m.id,
          fileName: m.fileName,
          fileSize: m.fileSize,
          fileType: m.fileType,
          content: m.content ?? '',
          topics: (m as { topicNames?: string[] }).topicNames ?? [],
          uploadedAt: toDate(processedAt ?? createdAt),
          processedAt: toDate(processedAt),
          totalPages: m.totalPages ?? 0,
          extractionType: (m as { extractionType?: 'quick' | 'full' }).extractionType ?? 'quick',
          wordCount: m.wordCount,
          extractionMethod: m.extractionMethod,
          processingTimeMs: m.processingTimeMs,
          staffId: user.id,
          syncedToFirestore: true,
        };
      });
      setMaterials(mapped);
    }).catch((err) => console.warn('[UploadMaterials] Load materials from Firestore failed:', err));
  }, [user?.id, setMaterials]);

  const hasFileInProgress = files.some(f => f.status !== 'completed' && f.status !== 'error');

  // Update elapsed-time ticker every second while any file is in progress
  React.useEffect(() => {
    if (!hasFileInProgress) return;
    const interval = setInterval(() => setTimerNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [hasFileInProgress]);

  const formatElapsed = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`;
  };

  const processFile = useCallback(async (uploadedFile: UploadedFile) => {
    try {
      // startedAt is set when file is added (handleFileSelect) so elapsed-time UI shows immediately
      // Step 1: Uploading
      for (let i = 0; i <= 100; i += 20) {
        await new Promise(resolve => setTimeout(resolve, 80));
        setFiles(prev => prev.map(f => 
          f.id === uploadedFile.id ? { ...f, progress: i, status: 'uploading', currentStep: 0 } : f
        ));
      }
      
      // Step 2: Reading (brief so user sees the step)
      setFiles(prev => prev.map(f => 
        f.id === uploadedFile.id ? { ...f, status: 'reading', currentStep: 1, progress: 20 } : f
      ));
      await new Promise(resolve => setTimeout(resolve, 80));

      // Step 3: Analyzing — run actual extraction (backend does extract + NLP; no artificial delay)
      setFiles(prev => prev.map(f => 
        f.id === uploadedFile.id ? { ...f, status: 'analyzing', currentStep: 2, progress: 30 } : f
      ));
      const result = await extractMaterialContent(uploadedFile.file, {
        fullExtraction: extractionMode === 'full',
      });

      // Step 4: Extracting topics (from result — no extra work, no delay)
      setFiles(prev => prev.map(f => 
        f.id === uploadedFile.id ? { ...f, status: 'extracting', currentStep: 3, progress: 85 } : f
      ));
      const topics = result.topics.length > 0
        ? result.topics
        : extractTopicsFromContent(result.extractedText || '');

      // Step 5: Saving (Firestore first when signed in, then add to store with same id)
      setFiles(prev => prev.map(f => 
        f.id === uploadedFile.id ? { ...f, currentStep: 4, progress: 90 } : f
      ));

      const staffId = user?.id || '';
      const materialPayload = {
        fileName: uploadedFile.name,
        fileSize: uploadedFile.size,
        fileType: uploadedFile.file.type,
        content: result.extractedText.slice(0, 2_000_000),
        topics,
        processedAt: new Date(),
        totalPages: result.totalPages ?? 0,
        extractionType: extractionMode,
        wordCount: result.metadata.wordCount,
        extractionMethod: result.metadata.extractionMethod,
        processingTimeMs: result.metadata.processingTimeMs,
        nlpChunks: result.nlpAnalysis?.chunks?.map(c => ({
          chunkId: c.chunkId,
          chunkType: c.chunkType,
          title: c.title,
          text: c.text,
          sentences: c.sentences,
          metadata: {
            keywords: c.metadata.keywords,
            keyPhrases: c.metadata.keyPhrases,
            estimatedDifficulty: c.metadata.estimatedDifficulty,
            sentenceCount: c.metadata.sentenceCount,
            wordCount: c.metadata.wordCount,
            hasDefinitions: c.metadata.hasDefinitions,
            hasFormulas: c.metadata.hasFormulas,
            hasExamples: c.metadata.hasExamples,
            namedEntities: c.metadata.namedEntities,
          },
        })),
        nlpTopics: result.nlpAnalysis?.topics?.map(t => ({
          name: t.name,
          relevance: t.relevance,
          subtopics: t.subtopics,
          keywords: t.keywords,
          chunkIds: t.chunkIds,
        })),
        nlpKeywords: result.nlpAnalysis?.globalKeywords,
        nlpAcademicLevel: result.nlpAnalysis?.estimatedAcademicLevel,
      };

      // Save to Firestore first when signed in so materials appear under users/{userId}/materials
      let materialId: string | undefined;
      try {
        materialId = await materialStorageService.saveMaterial({
          fileName: uploadedFile.name,
          fileSize: uploadedFile.size,
          fileType: uploadedFile.file.type,
          totalPages: result.totalPages ?? 0,
          extractionType: extractionMode,
          storageUrl: '',
          title: uploadedFile.name.replace(/\.[^/.]+$/, ''),
          subject: '',
          department: user?.department || '',
          institution: user?.institution,
          place: user?.place,
          staffId,
          wordCount: result.metadata.wordCount,
          extractionMethod: result.metadata.extractionMethod,
          processingTimeMs: result.metadata.processingTimeMs,
          content: result.extractedText?.slice(0, 2_000_000) ?? '',
          nlpChunks: result.nlpAnalysis?.chunks?.map(c => ({
            chunkId: c.chunkId,
            chunkType: c.chunkType,
            title: c.title,
            text: c.text,
            sentences: c.sentences,
            metadata: {
              keywords: c.metadata.keywords,
              keyPhrases: c.metadata.keyPhrases,
              estimatedDifficulty: c.metadata.estimatedDifficulty,
              sentenceCount: c.metadata.sentenceCount,
              wordCount: c.metadata.wordCount,
              hasDefinitions: c.metadata.hasDefinitions,
              hasFormulas: c.metadata.hasFormulas,
              hasExamples: c.metadata.hasExamples,
              namedEntities: c.metadata.namedEntities,
            },
          })),
          nlpTopics: result.nlpAnalysis?.topics?.map(t => ({
            name: t.name,
            relevance: t.relevance,
            subtopics: t.subtopics,
            keywords: t.keywords,
            chunkIds: t.chunkIds,
          })),
          nlpKeywords: result.nlpAnalysis?.globalKeywords,
          nlpKeyPhrases: result.nlpAnalysis?.globalKeyPhrases,
          nlpAcademicLevel: result.nlpAnalysis?.estimatedAcademicLevel,
          vocabularyRichness: result.nlpAnalysis?.vocabularyRichness,
        });

        // Upload original file to Cloud Storage under users/{userId}/materials/{materialId} so it is not lost
        if (staffId && materialId) {
          try {
            const storageUrl = await materialStorageService.uploadMaterialFile(
              staffId,
              materialId,
              uploadedFile.file
            );
            await materialStorageService.updateMaterial(materialId, { storageUrl }, staffId);
          } catch (fileErr) {
            console.warn('[UploadMaterials] File upload to Storage failed (material content already saved):', fileErr);
          }
        }
      } catch (storageError: unknown) {
        const code = (storageError as { code?: string })?.code;
        const msg = storageError instanceof Error ? storageError.message : String(storageError);
        console.warn('[UploadMaterials] Firestore storage failed (non-blocking):', code ?? msg, storageError);
        if (code === 'permission-denied' || /permission|denied/i.test(msg))
          toast({ title: 'Save to cloud failed', description: 'Not saved to Firestore (check you are signed in with Firebase). Material is in this device only.', variant: 'destructive' });
      }

      addMaterial(
        { ...materialPayload, staffId: staffId || '', syncedToFirestore: !!materialId },
        materialId
      );

      setFiles(prev => prev.map(f => 
        f.id === uploadedFile.id ? { 
          ...f, 
          status: 'completed',
          progress: 100, 
          topics, 
          currentStep: 5,
          extractionResult: result,
          extractionMethod: result.metadata.extractionMethod,
          completedAt: Date.now(),
        } : f
      ));
      
      if (materialId) {
        toast({
          title: 'Material saved to cloud',
          description: `${uploadedFile.name} is stored in Firestore under your account.`,
        });
      } else {
        toast({
          title: 'Material saved on this device',
          description: 'Use "Save to cloud" below to store it in Firestore.',
        });
      }
    } catch (error) {
      setFiles(prev => prev.map(f => 
        f.id === uploadedFile.id ? { ...f, status: 'error' } : f
      ));
      
      toast({
        title: 'Upload Failed',
        description: `Failed to process ${uploadedFile.name}`,
        variant: 'destructive',
      });
    }
  }, [addMaterial, toast, extractionMode, user?.id]);

  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    const now = Date.now();
    const newFiles: UploadedFile[] = Array.from(selectedFiles).map((file, i) => ({
      id: `file_${now}_${Math.random().toString(36).substr(2, 9)}`,
      file,
      name: file.name,
      size: file.size,
      progress: 0,
      status: 'uploading' as const,
      currentStep: 0,
      startedAt: now,
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
    newFiles.forEach(processFile);
  }, [processFile]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleRemoveMaterial = (id: string) => {
    if (user?.id) materialStorageService.deleteMaterial(id, user.id).catch((err) => console.warn('[UploadMaterials] Firestore delete failed:', err));
    deleteMaterial(id);
    toast({
      title: 'Material Removed',
      description: 'The material has been removed from your library',
    });
  };

  // When signed in: show only this user's materials. When logged out: show all in store so library doesn't clear.
  const myMaterials = user?.id
    ? materials.filter((m) => m.staffId === user.id)
    : materials;

  const handleSaveToCloud = useCallback(
    async (material: UploadedMaterial) => {
      if (!user?.id || !isFirebaseConfigured()) {
        toast({ title: 'Sign in required', description: 'Sign in to save materials to the cloud.', variant: 'destructive' });
        return;
      }
      setSavingToCloudId(material.id);
      try {
        const newId = await materialStorageService.saveMaterial({
          fileName: material.fileName,
          fileSize: material.fileSize,
          fileType: material.fileType,
          totalPages: material.totalPages ?? 0,
          extractionType: material.extractionType ?? 'quick',
          storageUrl: '',
          title: material.fileName.replace(/\.[^/.]+$/, ''),
          subject: '',
          department: user.department ?? '',
          institution: user.institution,
          place: user.place,
          staffId: user.id,
          wordCount: material.wordCount ?? 0,
          extractionMethod: material.extractionMethod,
          processingTimeMs: material.processingTimeMs,
          content: material.content?.slice(0, 2_000_000),
          nlpChunks: material.nlpChunks,
          nlpTopics: material.nlpTopics,
          nlpKeywords: material.nlpKeywords,
          nlpAcademicLevel: material.nlpAcademicLevel,
        });
        updateMaterial(material.id, { id: newId, staffId: user.id, syncedToFirestore: true });
        toast({ title: 'Saved to cloud', description: 'Material is now stored in Firestore under your account.' });
      } catch (err) {
        console.warn('[UploadMaterials] Save to cloud failed:', err);
        toast({ title: 'Save to cloud failed', description: (err as Error)?.message ?? 'Try again.', variant: 'destructive' });
      } finally {
        setSavingToCloudId(null);
      }
    },
    [user, updateMaterial, toast]
  );

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
      case 'reading':
      case 'analyzing':
      case 'extracting':
        return <Loader2 className="w-5 h-5 animate-spin text-primary" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-destructive" />;
    }
  };

  const allCompleted = files.length > 0 && files.every(f => f.status === 'completed');

  const handleGoToGenerate = () => {
    navigate('/staff/generate');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Upload Materials</h2>
        <p className="text-muted-foreground">Upload your study materials to generate questions automatically</p>
      </div>

      {isFirebaseConfigured() && !user?.id && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="py-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Sign in to save materials to the cloud. Right now they will only be saved on this device.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Extraction mode: Quick (default) vs Full */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Extraction mode</CardTitle>
          <p className="text-sm text-muted-foreground">Choose how thoroughly to analyze your files. Quick is recommended for most materials.</p>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={extractionMode}
            onValueChange={(v) => setExtractionMode(v as 'quick' | 'full')}
            className="grid gap-3 sm:grid-cols-2"
          >
            <Label
              htmlFor="mode-quick"
              className={`flex cursor-pointer items-start gap-4 rounded-xl border-2 p-4 transition-colors ${
                extractionMode === 'quick'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/30 hover:bg-muted/30'
              }`}
            >
              <RadioGroupItem value="quick" id="mode-quick" className="mt-0.5" />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 font-medium">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Quick extraction
                </div>
                <p className="text-xs text-muted-foreground">
                  Faster upload. Full text for question generation and AI assistant. Recommended for most materials.
                </p>
              </div>
            </Label>
            <Label
              htmlFor="mode-full"
              className={`flex cursor-pointer items-start gap-4 rounded-xl border-2 p-4 transition-colors ${
                extractionMode === 'full'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/30 hover:bg-muted/30'
              }`}
            >
              <RadioGroupItem value="full" id="mode-full" className="mt-0.5" />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 font-medium">
                  <Scan className="h-4 w-4 text-blue-500" />
                  Full extraction
                </div>
                <p className="text-xs text-muted-foreground">
                  Slower, time-consuming. Includes images, tables, and diagrams (OCR). Use only when you need figures analyzed.
                </p>
              </div>
            </Label>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Drop Zone */}
      <Card 
        className={`border-2 border-dashed transition-all duration-300 ${
          isDragging 
            ? 'border-primary bg-primary/5 scale-[1.02]' 
            : 'border-border hover:border-primary/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="p-12 flex flex-col items-center justify-center text-center">
          <motion.div
            animate={{ 
              scale: isDragging ? 1.1 : 1,
              y: isDragging ? -10 : 0 
            }}
            className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-6"
          >
            <Upload className="w-10 h-10 text-primary" />
          </motion.div>
          
          <h3 className="text-xl font-semibold mb-2">
            {isDragging ? 'Drop your files here' : 'Drag & Drop your materials'}
          </h3>
          <p className="text-muted-foreground mb-6">
            Supports PDF, DOC, DOCX, PPTX, TXT, JPG, PNG files up to 50MB • Upload multiple files at once
            {backendAvailable && <span className="block text-xs text-primary mt-1">✓ Python extraction backend connected</span>}
          </p>
          
          <Button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90"
          >
            <Upload className="w-4 h-4 mr-2" />
            Browse Files
          </Button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.pptx,.txt,.jpg,.jpeg,.png,.bmp,.tiff,.md,.csv"
            multiple
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />
        </CardContent>
      </Card>

      {/* Processing Files */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Processing Files</CardTitle>
                {allCompleted && (
                  <Button 
                    onClick={handleGoToGenerate}
                    className="bg-gradient-to-r from-primary to-accent text-primary-foreground"
                  >
                    Generate Questions
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {files.map((file) => (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="p-4 rounded-xl bg-muted/30 border border-border/50"
                  >
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-primary" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium truncate">{file.name}</p>
                          <span className="text-xs text-muted-foreground ml-2">
                            {formatFileSize(file.size)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {getStatusIcon(file.status)}
                        {file.status === 'completed' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeFile(file.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {/* Processing Steps + Wait time */}
                    {file.status !== 'completed' && file.status !== 'error' && (
                      <div className="space-y-3">
                        {/* Elapsed time & expected wait */}
                        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border border-primary/10 px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                              <Clock className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Elapsed</p>
                              <p className="text-lg font-semibold tabular-nums text-foreground">
                                {file.startedAt ? formatElapsed(timerNow - file.startedAt) : '0s'}
                              </p>
                            </div>
                          </div>
                          <div className="h-8 w-px bg-border hidden sm:block" />
                          <p className="text-xs text-muted-foreground max-w-xs">
                            Large files typically finish in <span className="font-medium text-foreground">30–90 seconds</span>. You can stay on this page.
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {PROCESSING_STEPS.map((step, idx) => (
                            <React.Fragment key={idx}>
                              <motion.div
                                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                                  idx < file.currentStep 
                                    ? 'bg-green-500/10 text-green-500' 
                                    : idx === file.currentStep 
                                      ? 'bg-primary/10 text-primary' 
                                      : 'bg-muted text-muted-foreground'
                                }`}
                                animate={idx === file.currentStep ? { scale: [1, 1.05, 1] } : {}}
                                transition={{ repeat: Infinity, duration: 1 }}
                              >
                                {idx < file.currentStep ? (
                                  <CheckCircle className="w-3 h-3" />
                                ) : idx === file.currentStep ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <step.icon className="w-3 h-3" />
                                )}
                                <span className="hidden sm:inline">{step.label}</span>
                              </motion.div>
                              {idx < PROCESSING_STEPS.length - 1 && (
                                <div className={`flex-1 h-0.5 ${idx < file.currentStep ? 'bg-green-500' : 'bg-muted'}`} />
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                        
                        <div className="space-y-1">
                          <Progress value={file.progress} className="h-1.5" />
                          <p className="text-xs text-muted-foreground">
                            {PROCESSING_STEPS[file.currentStep]?.description}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {file.status === 'completed' && (
                      <div className="mt-2 space-y-2">
                        {file.startedAt != null && file.completedAt != null && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                            Completed in <span className="font-medium tabular-nums text-foreground">{formatElapsed(file.completedAt - file.startedAt)}</span>
                          </p>
                        )}
                        {file.topics && file.topics.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {file.topics.map((topic, idx) => (
                              <span 
                                key={idx}
                                className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary"
                              >
                                {topic}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {file.status === 'error' && (
                      <p className="text-xs text-destructive mt-2">
                        Failed to process file
                      </p>
                    )}
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Uploaded Materials Library — only current user's materials */}
      {myMaterials.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              Your Materials ({myMaterials.length})
            </CardTitle>
            <p className="text-sm text-muted-foreground">Materials you uploaded; stored in Firestore under your account when saved to cloud.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {myMaterials.map((material) => (
              <motion.div
                key={material.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-4 p-3 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-sm">{material.fileName}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {material.syncedToFirestore ? (
                      <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                        <Cloud className="h-3.5 w-3.5" />
                        Stored in cloud
                      </span>
                    ) : (
                      <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        This device only
                      </span>
                    )}
                    <span className="text-xs px-1.5 py-0.5 rounded bg-muted font-medium text-muted-foreground" title={material.extractionType === 'full' ? 'Full extraction: tables, images, diagrams, OCR' : 'Quick extraction: text only'}>
                      {material.extractionType === 'full' ? 'Full' : 'Quick'}
                    </span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(material.fileSize)}
                    </span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">
                      {material.topics.length} topics
                    </span>
                    {material.wordCount != null && (
                      <>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {material.wordCount.toLocaleString()} words
                        </span>
                      </>
                    )}
                    {material.extractionMethod && (
                      <>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs font-mono text-muted-foreground/70">
                          {material.extractionMethod}
                        </span>
                      </>
                    )}
                    {material.processingTimeMs != null && (
                      <>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {material.processingTimeMs < 1000
                            ? `${Math.round(material.processingTimeMs)}ms`
                            : `${(material.processingTimeMs / 1000).toFixed(1)}s`}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 max-w-[200px]">
                  {material.topics.slice(0, 2).map((topic, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary"
                    >
                      {topic}
                    </span>
                  ))}
                  {material.topics.length > 2 && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
                      +{material.topics.length - 2}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {!material.syncedToFirestore && user?.id && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      disabled={savingToCloudId === material.id}
                      onClick={() => handleSaveToCloud(material)}
                    >
                      {savingToCloudId === material.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CloudUpload className="h-4 w-4" />
                      )}
                      {savingToCloudId === material.id ? 'Saving…' : 'Save to cloud'}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleRemoveMaterial(material.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UploadMaterials;
