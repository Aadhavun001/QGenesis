import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Settings2, 
  Loader2,
  Plus,
  Minus,
  Pencil,
  Trash2,
  X,
  Check,
  ArrowUpDown,
  SlidersHorizontal,
  Calendar,
  Brain,
  CloudUpload
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useQuestionStore } from '@/stores/questionStore';
import { useAuth } from '@/contexts/AuthContext';
import { generateQuestions, type GeneratedQuestionResult } from '@/services/questionGenerationService';
import { validateQuestionConfig, buildAIReadyConfig, type QuestionConfigInput } from '@/services/questionConfigService';
import { isGeminiConfigured } from '@/services/gemini/config';
import { generateQuestionsWithAI } from '@/services/gemini/questionGenerator';
import type { BloomsLevel } from '@/services/gemini/types';
import { firestoreGeneratedQuestionService } from '@/services/firebase';
import { firestoreExamTypeService, firestoreQuestionTypeService, firestoreBatchService, firestoreUserActivityService } from '@/services/firebase/firestore-database';
import { isFirebaseConfigured } from '@/services/firebase/firestore-config';
import { materialStorageService } from '@/services/firebase/materialStorageService';
import type { NLPChunk, NLPTopic } from '@/stores/questionStore';
import GeneratedQuestionCard from './GeneratedQuestionCard';
import NLPAnalysisPanel from './NLPAnalysisPanel';

const BLOOMS_LEVELS = ['All', 'Mixed', 'Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];

const DIFFICULTIES = [
  { value: 'easy', label: 'Easy', color: 'text-green-500' },
  { value: 'medium', label: 'Medium', color: 'text-amber-500' },
  { value: 'hard', label: 'Hard', color: 'text-red-500' },
];

const QuestionGenerator: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const {
    materials, 
    addQuestion, 
    questions: storeQuestions, 
    examTypes, 
    questionTypes,
    addExamType,
    updateExamType,
    deleteExamType,
    addQuestionType,
    deleteQuestionType,
    generatedQuestionIds,
    addGeneratedQuestionIds,
    clearGeneratedQuestionIds,
    lastQuestionConfigByMaterialKey,
    setLastQuestionConfig,
  } = useQuestionStore();

  // When signed in: show only this user's materials. When logged out: show all in store so library doesn't clear.
  const myMaterials = useMemo(
    () => (user?.id ? materials.filter((m) => m.staffId === user.id) : materials),
    [materials, user?.id]
  );

  const [isGenerating, setIsGenerating] = useState(false);
  // Use persisted store instead of local state
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  
  // Form state
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>(['']);
  const [questionType, setQuestionType] = useState<string>('mcq');
  const [difficulty, setDifficulty] = useState<string>('medium');
  const [bloomsLevel, setBloomsLevel] = useState<string>('Understand');
  const [marks, setMarks] = useState<number[]>([5]);
  const [numberOfQuestions, setNumberOfQuestions] = useState<number[]>([5]);
  const [examType, setExamType] = useState<string>('');
  
  // Config dialogs
  const [showExamTypeConfig, setShowExamTypeConfig] = useState(false);
  const [showQuestionTypeConfig, setShowQuestionTypeConfig] = useState(false);
  const [newExamTypeName, setNewExamTypeName] = useState('');
  const [newExamTypeCode, setNewExamTypeCode] = useState('');
  const [editingExamType, setEditingExamType] = useState<string | null>(null);
  const [newQuestionTypeName, setNewQuestionTypeName] = useState('');
  const [newQuestionTypeCode, setNewQuestionTypeCode] = useState('');
  
  // NLP chunk/topic selection
  const [selectedChunkIds, setSelectedChunkIds] = useState<number[]>([]);
  const [selectedTopicNames, setSelectedTopicNames] = useState<string[]>([]);
  // Fetched NLP from Firestore when materials don't have nlpChunks (e.g. after hydrate)
  const [fetchedAnalysisByMaterialId, setFetchedAnalysisByMaterialId] = useState<Record<string, { chunks: NLPChunk[]; topics: NLPTopic[]; keywords: string[]; academicLevel?: string }>>({});
  const [nlpLoading, setNlpLoading] = useState(false);
  /** True when the current batch was saved to Firestore; false when generated locally only (e.g. Firebase not configured). */
  const [lastBatchSavedToCloud, setLastBatchSavedToCloud] = useState(true);

  // Fetch NLP from Firestore for selected materials that don't have nlpChunks
  useEffect(() => {
    if (!user?.id || selectedMaterials.length === 0) return;
    const missing = selectedMaterials.filter(id => {
      const m = myMaterials.find(mat => mat.id === id);
      return m && (!m.nlpChunks || m.nlpChunks.length === 0);
    });
    if (missing.length === 0) return;
    setNlpLoading(true);
    Promise.all(missing.map(id => materialStorageService.getMaterialWithAnalysis(id, user.id)))
      .then(results => {
        const next: Record<string, { chunks: NLPChunk[]; topics: NLPTopic[]; keywords: string[]; academicLevel?: string }> = {};
        results.forEach((r, i) => {
          if (!r || missing[i] === undefined) return;
          const mid = missing[i];
          const academicLevel = (r.material as { academicLevel?: string }).academicLevel;
          const globalKeywords = (r.material as { globalKeywords?: string[] }).globalKeywords || [];
          next[mid] = {
            chunks: r.chunks.map((c: { chunkId: number; chunkType?: string; title?: string; text: string; sentences?: string[]; keywords?: string[]; keyPhrases?: string[]; estimatedDifficulty?: string; wordCount?: number; sentenceCount?: number; hasDefinitions?: boolean; hasFormulas?: boolean; hasExamples?: boolean; namedEntities?: string[] }) => ({
              chunkId: c.chunkId,
              chunkType: c.chunkType || 'paragraph',
              title: c.title || `Section ${c.chunkId + 1}`,
              text: c.text,
              sentences: c.sentences || [],
              metadata: {
                keywords: c.keywords || [],
                keyPhrases: c.keyPhrases || [],
                estimatedDifficulty: (c.estimatedDifficulty as 'easy' | 'medium' | 'hard') || 'medium',
                sentenceCount: c.sentenceCount ?? 0,
                wordCount: c.wordCount ?? 0,
                hasDefinitions: c.hasDefinitions ?? false,
                hasFormulas: c.hasFormulas ?? false,
                hasExamples: c.hasExamples ?? false,
                namedEntities: c.namedEntities || [],
              },
            })),
            topics: r.topics.map((t: { name: string; relevance?: number; subtopics?: string[]; keywords?: string[]; chunkIds?: number[] }) => ({
              name: t.name,
              relevance: t.relevance ?? 0.8,
              subtopics: t.subtopics || [],
              keywords: t.keywords || [],
              chunkIds: t.chunkIds || [],
            })),
            keywords: globalKeywords,
            academicLevel,
          };
        });
        setFetchedAnalysisByMaterialId(prev => ({ ...prev, ...next }));
      })
      .catch(() => {})
      .finally(() => setNlpLoading(false));
  }, [selectedMaterials, user?.id, myMaterials]);

  // Aggregate NLP data from selected materials (store + fetched from Firestore)
  const nlpData = useMemo(() => {
    const selectedMats = myMaterials.filter(m => selectedMaterials.includes(m.id));
    const fromStore = selectedMats.flatMap(m => m.nlpChunks || []);
    const fromFetched = selectedMaterials.flatMap(id => fetchedAnalysisByMaterialId[id]?.chunks || []);
    const chunks = fromStore.length > 0 ? fromStore : fromFetched;
    const topicsFromStore = selectedMats.flatMap(m => m.nlpTopics || []);
    const topicsFromFetched = selectedMaterials.flatMap(id => fetchedAnalysisByMaterialId[id]?.topics || []);
    const topicsList = topicsFromStore.length > 0 ? topicsFromStore : topicsFromFetched;
    const uniqueTopics = topicsList.reduce((acc: NLPTopic[], t) => {
      if (!acc.find(x => x.name === t.name)) acc.push(t);
      return acc;
    }, []);
    const keywordsFromStore = [...new Set(selectedMats.flatMap(m => m.nlpKeywords || []))];
    const keywordsFromFetched = [...new Set(selectedMaterials.flatMap(id => fetchedAnalysisByMaterialId[id]?.keywords || []))];
    const keywords = keywordsFromStore.length > 0 ? keywordsFromStore : keywordsFromFetched;
    const academicLevel = selectedMats.find(m => m.nlpAcademicLevel)?.nlpAcademicLevel
      ?? selectedMaterials.map(id => fetchedAnalysisByMaterialId[id]?.academicLevel).find(Boolean);
    if (chunks.length === 0 && uniqueTopics.length === 0 && !nlpLoading) return null;
    return { chunks, topics: uniqueTopics, keywords, academicLevel };
  }, [selectedMaterials, myMaterials, fetchedAnalysisByMaterialId, nlpLoading]);

  // Restore last-used config when same material(s) are selected again
  const materialConfigKey = useMemo(() => selectedMaterials.slice().sort().join(','), [selectedMaterials]);
  useEffect(() => {
    if (selectedMaterials.length === 0 || !materialConfigKey) return;
    const saved = lastQuestionConfigByMaterialKey[materialConfigKey];
    if (!saved) return;
    setDifficulty(saved.difficulty);
    setQuestionType(saved.questionType);
    setTopics(saved.topics.length > 0 ? saved.topics : ['']);
    setMarks(saved.marks.length > 0 ? saved.marks : [5]);
    setNumberOfQuestions(saved.numberOfQuestions.length > 0 ? saved.numberOfQuestions : [5]);
    setBloomsLevel(saved.bloomsLevel);
    setExamType(saved.examType);
  }, [materialConfigKey]); // eslint-disable-line react-hooks/exhaustive-deps -- only restore when material key changes

  const saveCurrentConfig = useCallback(() => {
    if (selectedMaterials.length === 0) return;
    const key = selectedMaterials.slice().sort().join(',');
    setLastQuestionConfig(key, {
      difficulty,
      questionType,
      topics: topics.filter(Boolean),
      marks,
      numberOfQuestions,
      bloomsLevel,
      examType,
    });
  }, [selectedMaterials, difficulty, questionType, topics, marks, numberOfQuestions, bloomsLevel, examType, setLastQuestionConfig]);

  const handleChunkToggle = (chunkId: number) => {
    setSelectedChunkIds(prev => 
      prev.includes(chunkId) ? prev.filter(id => id !== chunkId) : [...prev, chunkId]
    );
  };

  const handleTopicToggle = (topicName: string) => {
    setSelectedTopicNames(prev => {
      const updated = prev.includes(topicName) 
        ? prev.filter(n => n !== topicName) 
        : [...prev, topicName];
      
      // Auto-populate topics input from selected NLP topics
      if (nlpData) {
        const selectedNlpTopics = nlpData.topics.filter(t => updated.includes(t.name));
        if (selectedNlpTopics.length > 0) {
          setTopics(selectedNlpTopics.map(t => t.name));
        }
      }
      return updated;
    });
  };
  const handleAddTopic = () => {
    setTopics([...topics, '']);
  };

  const handleRemoveTopic = (index: number) => {
    if (topics.length > 1) {
      setTopics(topics.filter((_, i) => i !== index));
    }
  };

  const handleTopicChange = (index: number, value: string) => {
    const newTopics = [...topics];
    newTopics[index] = value;
    setTopics(newTopics);
  };

  const handleMaterialToggle = (materialId: string) => {
    setSelectedMaterials(prev => {
      const updated = prev.includes(materialId)
        ? prev.filter(id => id !== materialId)
        : [...prev, materialId];
      
      // Auto-populate topics from selected materials
      const selectedMats = myMaterials.filter(m => updated.includes(m.id));
      const allTopics = selectedMats.flatMap(m => m.topics);
      const uniqueTopics = [...new Set(allTopics)];
      if (uniqueTopics.length > 0) {
        setTopics(uniqueTopics);
      } else {
        setTopics(['']);
      }
      
      return updated;
    });
  };

  const handleMaterialSelect = (materialId: string) => {
    if (materialId === 'none') {
      setSelectedMaterials([]);
      return;
    }
    handleMaterialToggle(materialId);
    
    // Get topics from selected materials
    const selectedMats = myMaterials.filter(m => selectedMaterials.includes(m.id) || m.id === materialId);
    const allTopics = selectedMats.flatMap(m => m.topics);
    const uniqueTopics = [...new Set(allTopics)];
    if (uniqueTopics.length > 0) {
      setTopics(uniqueTopics);
    }
  };

  const handleAddExamType = () => {
    if (newExamTypeName && newExamTypeCode) {
      addExamType({ name: newExamTypeName, code: newExamTypeCode, isActive: true });
      setNewExamTypeName('');
      setNewExamTypeCode('');
      toast({ title: 'Exam Type Added', description: `${newExamTypeName} has been added` });
    }
  };

  const handleDeleteExamType = (id: string) => {
    deleteExamType(id);
    if (isFirebaseConfigured()) firestoreExamTypeService.delete(id).catch(() => {});
    toast({ title: 'Exam Type Deleted' });
  };

  const handleAddQuestionType = () => {
    if (newQuestionTypeName && newQuestionTypeCode) {
      const id = addQuestionType({ name: newQuestionTypeName, code: newQuestionTypeCode, isActive: true });
      if (isFirebaseConfigured()) firestoreQuestionTypeService.create({ name: newQuestionTypeName, code: newQuestionTypeCode, isActive: true, id }).catch(() => {});
      setNewQuestionTypeName('');
      setNewQuestionTypeCode('');
      toast({ title: 'Question Type Added', description: `${newQuestionTypeName} has been added` });
    }
  };

  const handleDeleteQuestionType = (id: string) => {
    deleteQuestionType(id);
    if (isFirebaseConfigured()) firestoreQuestionTypeService.delete(id).catch(() => {});
    toast({ title: 'Question Type Deleted' });
  };

  const handleGenerate = async () => {
    saveCurrentConfig();
    // ── Step 1: Validate via questionConfigService ──
    const configInput: QuestionConfigInput = {
      materialIds: selectedMaterials,
      topics: topics.filter(t => t.trim()),
      examType: examType || '',
      questionType,
      difficulty: difficulty as 'easy' | 'medium' | 'hard',
      bloomsLevel: bloomsLevel as any,
      marksPerQuestion: marks[0],
      numberOfQuestions: numberOfQuestions[0],
      selectedChunkIds: selectedChunkIds.length > 0 ? selectedChunkIds : undefined,
      selectedTopicNames: selectedTopicNames.length > 0 ? selectedTopicNames : undefined,
      staffId: user?.id || '',
      department: user?.department,
      institution: user?.institution,
      place: user?.place,
    };

    const validation = validateQuestionConfig(configInput);

    if (!validation.success) {
      const firstError = Object.values(validation.errors!)[0];
      toast({
        title: 'Invalid Configuration',
        description: firstError,
        variant: 'destructive',
      });
      return;
    }

    // ACCESS CONTROL: Warn if department, institution, or place is not set
    if (!user?.department || !user?.institution || !user?.place) {
      toast({
        title: 'Profile Incomplete',
        description: 'Your department, institution, or place is not configured. Questions may not be properly accessible by your HOD.',
        variant: 'destructive',
      });
    }

    // ── Step 2: Build AI-ready config. For local generator: use chunk/topic selection. For Gemini: always pass FULL material below. ──
    const materialContentMap: Record<string, string> = {};
    const selectedTopicNamesFromConfig = validation.config!.selectedTopicNames || [];
    const topicNames = selectedTopicNames.length > 0 ? selectedTopicNames : selectedTopicNamesFromConfig;
    const chunkIdsFromTopics = nlpData
      ? topicNames.length > 0
        ? nlpData.topics
            .filter(t => topicNames.includes(t.name))
            .flatMap(t => t.chunkIds || [])
        : []
      : [];
    const effectiveChunkIds = new Set([
      ...selectedChunkIds,
      ...chunkIdsFromTopics,
    ]);

    for (const m of materials) {
      if (validation.config!.materialIds.includes(m.id)) {
        if (nlpData && (effectiveChunkIds.size > 0 || nlpData.chunks.length > 0)) {
          const chunksToUse =
            effectiveChunkIds.size > 0
              ? nlpData.chunks.filter(c => effectiveChunkIds.has(c.chunkId))
              : nlpData.chunks;
          materialContentMap[m.id] =
            chunksToUse.length > 0
              ? chunksToUse
                  .map(c => (c.title ? `## ${c.title}\n` : '') + c.text)
                  .join('\n\n')
              : m.content;
        } else {
          materialContentMap[m.id] = m.content;
        }
      }
    }

    const aiConfig = buildAIReadyConfig(validation.config!, materialContentMap);

    // Gemini always gets FULL material (all selected materials' content) so it analyzes the whole upload—not only chunks—for accurate questions/answers.
    const fullMaterialForGemini = isGeminiConfigured()
      ? materials
          .filter(m => validation.config!.materialIds.includes(m.id))
          .map(m => m.content)
          .filter(Boolean)
          .join('\n\n') || aiConfig.materialContent
      : undefined;

    console.log('[QuestionGenerator] AI-ready config:', aiConfig);

    // ── Step 3: Generate questions (Gemini when configured, else local) ──
    setIsGenerating(true);

    try {
      let results: GeneratedQuestionResult[];

      const usedGemini = isGeminiConfigured();
      if (usedGemini) {
        const previousQuestions = (storeQuestions || [])
          .filter(q => q.content?.trim())
          .slice(-25)
          .map(q => ({ content: q.content, topic: q.topic }));
        const geminiResult = await generateQuestionsWithAI({
          topics: aiConfig.topics,
          difficulty: aiConfig.difficulty,
          questionType: aiConfig.questionType as 'mcq' | 'short' | 'long' | 'descriptive',
          bloomsLevel: aiConfig.bloomsLevel as BloomsLevel,
          marks: aiConfig.marksPerQuestion,
          numberOfQuestions: aiConfig.numberOfQuestions,
          examType: aiConfig.examType,
          materialContent: fullMaterialForGemini || aiConfig.materialContent,
          previousQuestions: previousQuestions.length > 0 ? previousQuestions : undefined,
        });
        results = geminiResult.questions.map(q => ({
          content: q.content,
          answer: q.answer,
          explanation: q.explanation ?? '',
          type: q.type,
          difficulty: q.difficulty,
          bloomsLevel: q.bloomsLevel,
          marks: q.marks,
          topic: q.topic,
          keywords: q.keywords ?? [],
          estimatedTime: q.estimatedTime ?? (q.type === 'mcq' ? 2 : q.type === 'short' ? 5 : 15),
          options: q.options,
          correctOption: q.correctOption,
        }));
      } else {
        results = await generateQuestions({
          topics: aiConfig.topics,
          difficulty: aiConfig.difficulty,
          questionType: aiConfig.questionType as 'mcq' | 'short' | 'long' | 'descriptive',
          bloomsLevel: aiConfig.bloomsLevel,
          marks: aiConfig.marksPerQuestion,
          numberOfQuestions: aiConfig.numberOfQuestions,
          materialContent: aiConfig.materialContent,
        });
      }

      // Build Firestore-ready question objects (generated_questions + questions collections)
      const generatedBy = usedGemini ? ('gemini' as const) : ('local' as const);
      const firestoreQuestions = results.map(result => ({
        content: result.content,
        answer: result.answer,
        explanation: '',
        type: result.type,
        difficulty: result.difficulty as 'easy' | 'medium' | 'hard',
        bloomsLevel: result.bloomsLevel,
        marks: result.marks,
        topic: result.topic,
        unit: '',
        subject: '',
        source: 'upload' as const,
        generationSource: 'config' as const,
        generatedBy,
        materialId: selectedMaterials[0] || undefined,
        staffId: aiConfig.staffId,
        department: aiConfig.department,
        institution: aiConfig.institution,
        place: aiConfig.place,
        status: 'draft' as const,
        options: result.options,
        correctOption: result.correctOption,
        examType: aiConfig.examType || undefined,
      }));

      const questionsForApproval = results.map(result => ({
        content: result.content,
        answer: result.answer,
        type: result.type,
        difficulty: result.difficulty as 'easy' | 'medium' | 'hard',
        bloomsLevel: result.bloomsLevel,
        marks: result.marks,
        topic: result.topic,
        source: 'upload' as const,
        generatedBy,
        materialId: selectedMaterials[0] || undefined,
        status: 'draft' as const,
        options: result.options,
        correctOption: result.correctOption,
        examType: aiConfig.examType || undefined,
        department: aiConfig.department,
        institution: aiConfig.institution,
        place: aiConfig.place,
        staffId: aiConfig.staffId,
      }));

      if (isFirebaseConfigured()) {
        // Persist to Firestore questions collection (role-based); listener will update store for real-time stats
        const ids = await firestoreBatchService.batchCreateQuestions(questionsForApproval);
        addGeneratedQuestionIds(ids);
        // Also write to generated_questions for provenance
        firestoreGeneratedQuestionService.batchCreate(firestoreQuestions).catch(err =>
          console.error('[QuestionGenerator] Firestore batchCreate failed:', err)
        );
        setLastBatchSavedToCloud(true);
        if (user?.id) {
          firestoreUserActivityService.create({
            userId: user.id,
            userName: user.displayName ?? 'Staff',
            email: user.email,
            role: user.role,
            action: 'questions_generated',
            timestamp: new Date(),
          }).catch(() => {});
        }
      } else {
        // Local-only: add to store and track ids
        const newQuestionIds: string[] = [];
        for (const result of results) {
          const id = addQuestion({
            content: result.content,
            answer: result.answer,
            type: result.type,
            difficulty: result.difficulty,
            bloomsLevel: result.bloomsLevel,
            marks: result.marks,
            topic: result.topic,
            source: 'upload',
            generatedBy,
            materialId: selectedMaterials[0] || undefined,
            status: 'draft',
            options: result.options,
            correctOption: result.correctOption,
            examType: aiConfig.examType || undefined,
            department: aiConfig.department,
            institution: aiConfig.institution,
            place: aiConfig.place,
            staffId: aiConfig.staffId,
          });
          newQuestionIds.push(id);
        }
        addGeneratedQuestionIds(newQuestionIds);
        setLastBatchSavedToCloud(false);
      }

      toast({
        title: 'Questions Generated',
        description: `Successfully generated ${results.length} questions`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate questions. Please try again.';
      toast({
        title: 'Generation Failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToCloud = async () => {
    const list = storeQuestions.filter(q => generatedQuestionIds.includes(q.id));
    if (list.length === 0) return;
    const staffId = user?.id ?? list[0]?.staffId;
    if (!staffId) {
      toast({
        title: 'Sign in required',
        description: 'Sign in to save questions to the cloud',
        variant: 'destructive',
      });
      return;
    }
    if (!isFirebaseConfigured()) {
      toast({
        title: 'Cloud not available',
        description: 'Firebase is not configured. Questions are stored locally only.',
        variant: 'destructive',
      });
      return;
    }
    try {
      const firestorePayload = list.map(q => ({
        content: q.content,
        answer: q.answer,
        explanation: q.explanation ?? '',
        type: q.type,
        difficulty: q.difficulty,
        bloomsLevel: q.bloomsLevel,
        marks: q.marks,
        topic: q.topic,
        unit: q.unit ?? '',
        subject: q.subject ?? '',
        source: q.source,
        generationSource: (q.generationSource ?? (q.source === 'ai-assistant' ? 'ai-chat' : 'config')) as 'config' | 'ai-chat',
        materialId: q.materialId,
        staffId,
        department: q.department,
        institution: q.institution,
        place: q.place,
        status: q.status,
        options: q.options,
        correctOption: q.correctOption,
        examType: q.examType,
      }));
      const questionsForApproval = list.map(q => ({
        content: q.content,
        answer: q.answer,
        type: q.type,
        difficulty: q.difficulty,
        bloomsLevel: q.bloomsLevel,
        marks: q.marks,
        topic: q.topic,
        source: q.source,
        generatedBy: q.generatedBy,
        materialId: q.materialId,
        status: q.status,
        options: q.options,
        correctOption: q.correctOption,
        examType: q.examType,
        department: q.department,
        institution: q.institution,
        place: q.place,
        staffId,
      }));
      await firestoreBatchService.batchCreateQuestions(questionsForApproval);
      await firestoreGeneratedQuestionService.batchCreate(firestorePayload);
      setLastBatchSavedToCloud(true);
      toast({
        title: 'Saved to cloud',
        description: `${list.length} questions saved under your account.`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save to cloud';
      toast({
        title: 'Save failed',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const recentlyGenerated = storeQuestions
    .filter(q => generatedQuestionIds.includes(q.id))
    .filter(q => filterDifficulty === 'all' || q.difficulty === filterDifficulty)
    .sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
  const activeQuestionTypes = questionTypes.filter(qt => qt.isActive);
  const activeExamTypes = examTypes.filter(et => et.isActive);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Generate Questions</h2>
        <p className="text-muted-foreground">Configure your question parameters and generate AI-powered questions</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-primary" />
              Question Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Material Selection - Multiple */}
            {myMaterials.length > 0 && (
              <div className="space-y-2">
                <Label>Select Materials (Multiple)</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-border rounded-lg p-3">
                  {myMaterials.map(material => (
                    <div key={material.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedMaterials.includes(material.id)}
                        onCheckedChange={() => handleMaterialToggle(material.id)}
                      />
                      <span className="text-sm truncate">{material.fileName}</span>
                      <span className="text-xs text-muted-foreground">({material.topics.length} topics)</span>
                    </div>
                  ))}
                </div>
                {selectedMaterials.length > 0 && (
                  <p className="text-xs text-muted-foreground">{selectedMaterials.length} materials selected</p>
                )}
              </div>
            )}

            {/* NLP Analysis — always show when materials selected so users see how content was analysed */}
            {selectedMaterials.length > 0 && (
              <div className="space-y-2">
                {nlpLoading && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading analysis…
                  </p>
                )}
                {!nlpLoading && nlpData && (
                  <NLPAnalysisPanel
                    chunks={nlpData.chunks}
                    topics={nlpData.topics}
                    keywords={nlpData.keywords}
                    academicLevel={nlpData.academicLevel}
                    selectedChunkIds={selectedChunkIds}
                    selectedTopicNames={selectedTopicNames}
                    onChunkToggle={handleChunkToggle}
                    onTopicToggle={handleTopicToggle}
                    onSelectAllChunks={() => setSelectedChunkIds(nlpData.chunks.map(c => c.chunkId))}
                    onDeselectAllChunks={() => setSelectedChunkIds([])}
                  />
                )}
                {!nlpLoading && !nlpData && (
                  <p className="text-sm text-muted-foreground">No analysis data for selected materials. Re-upload materials to see chunks, topics, and academic level here.</p>
                )}
              </div>
            )}

            {/* Topics */}
            <div className="space-y-3">
              <Label>Topics (from selected materials)</Label>
              {topics.map((topic, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder={`Topic ${index + 1}`}
                    value={topic}
                    onChange={(e) => handleTopicChange(index, e.target.value)}
                    className="flex-1"
                  />
                  {topics.length > 1 && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleRemoveTopic(index)}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddTopic}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Topic
              </Button>
            </div>

            {/* Exam Type */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Exam Type</Label>
                <Button variant="ghost" size="sm" onClick={() => setShowExamTypeConfig(true)}>
                  <Settings2 className="w-3 h-3 mr-1" />
                  Manage
                </Button>
              </div>
              <Select value={examType} onValueChange={setExamType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select exam type" />
                </SelectTrigger>
                <SelectContent>
                  {activeExamTypes.map(et => (
                    <SelectItem key={et.id} value={et.code}>
                      {et.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Question Type */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Question Type</Label>
                <Button variant="ghost" size="sm" onClick={() => setShowQuestionTypeConfig(true)}>
                  <Settings2 className="w-3 h-3 mr-1" />
                  Manage
                </Button>
              </div>
              <Select value={questionType} onValueChange={setQuestionType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {activeQuestionTypes.map(type => (
                    <SelectItem key={type.id} value={type.code}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Difficulty with nested options */}
            <div className="space-y-4">
              <Label>Difficulty</Label>
              <div className="flex gap-2">
                {DIFFICULTIES.map(d => (
                  <Button
                    key={d.value}
                    variant={difficulty === d.value ? 'default' : 'outline'}
                    className={`flex-1 ${difficulty === d.value ? 'bg-gradient-to-r from-primary to-accent' : ''}`}
                    onClick={() => setDifficulty(d.value)}
                  >
                    {d.label}
                  </Button>
                ))}
              </div>

              {/* Nested options under difficulty */}
              <div className="pl-4 border-l-2 border-primary/20 space-y-4">
                {/* Bloom's Taxonomy */}
                <div className="space-y-2">
                  <Label className="text-sm">Bloom's Taxonomy Level</Label>
                  <Select value={bloomsLevel} onValueChange={setBloomsLevel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BLOOMS_LEVELS.map(level => (
                        <SelectItem key={level} value={level}>
                          {level === 'All' ? 'All (Mixed Levels)' : level === 'Mixed' ? 'Mixed (variety)' : level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Marks */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-sm">Marks per Question</Label>
                    <span className="text-sm text-muted-foreground">{marks[0]} marks</span>
                  </div>
                  <Slider
                    value={marks}
                    onValueChange={setMarks}
                    min={1}
                    max={100}
                    step={1}
                  />
                </div>

                {/* Number of Questions */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-sm">Number of Questions</Label>
                    <span className="text-sm text-muted-foreground">{numberOfQuestions[0]}</span>
                  </div>
                  <Slider
                    value={numberOfQuestions}
                    onValueChange={setNumberOfQuestions}
                    min={1}
                    max={50}
                    step={1}
                  />
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full h-12 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating Questions...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate Questions
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold">Generated Questions</h3>
            {generatedQuestionIds.length > 0 && (
              <div className="flex items-center gap-2">
                {!lastBatchSavedToCloud && isFirebaseConfigured() && user?.id && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSaveToCloud}
                    className="text-xs bg-primary"
                  >
                    <CloudUpload className="w-3 h-3 mr-1" />
                    Save to Cloud
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
                  className="text-xs"
                >
                  <ArrowUpDown className="w-3 h-3 mr-1" />
                  {sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
                </Button>
                <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                  <SelectTrigger className="w-[120px] h-8 text-xs">
                    <SlidersHorizontal className="w-3 h-3 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearGeneratedQuestionIds}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  title="Close generated questions"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
          
          {recentlyGenerated.length === 0 ? (
            <Card className="border-border/50 border-dashed">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  Generated questions will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {recentlyGenerated.map((question, index) => (
                <GeneratedQuestionCard
                  key={question.id}
                  question={question}
                  index={index + 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Exam Type Config Dialog */}
      <Dialog open={showExamTypeConfig} onOpenChange={setShowExamTypeConfig}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Exam Types</DialogTitle>
            <DialogDescription>Add, edit, or delete exam types for question generation.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Add new */}
            <div className="flex gap-2">
              <Input
                placeholder="Exam name (e.g., Mid Term)"
                value={newExamTypeName}
                onChange={(e) => setNewExamTypeName(e.target.value)}
              />
              <Input
                placeholder="Code (e.g., MID)"
                value={newExamTypeCode}
                onChange={(e) => setNewExamTypeCode(e.target.value)}
                className="w-24"
              />
              <Button onClick={handleAddExamType} size="icon">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            {/* List */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {examTypes.map(et => (
                <div key={et.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div>
                    <span className="font-medium">{et.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">({et.code})</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => handleDeleteExamType(et.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Question Type Config Dialog */}
      <Dialog open={showQuestionTypeConfig} onOpenChange={setShowQuestionTypeConfig}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Question Types</DialogTitle>
            <DialogDescription>Add or delete question types for generation.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Add new */}
            <div className="flex gap-2">
              <Input
                placeholder="Type name (e.g., Fill in Blanks)"
                value={newQuestionTypeName}
                onChange={(e) => setNewQuestionTypeName(e.target.value)}
              />
              <Input
                placeholder="Code"
                value={newQuestionTypeCode}
                onChange={(e) => setNewQuestionTypeCode(e.target.value)}
                className="w-24"
              />
              <Button onClick={handleAddQuestionType} size="icon">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            {/* List */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {questionTypes.map(qt => (
                <div key={qt.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div>
                    <span className="font-medium">{qt.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">({qt.code})</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => handleDeleteQuestionType(qt.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuestionGenerator;
