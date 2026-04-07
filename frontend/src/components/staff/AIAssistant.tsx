import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Plus, 
  Trash2, 
  MessageSquare,
  Loader2,
  Sparkles,
  History,
  X,
  FileText,
  Edit3,
  Check,
  Share2,
  Mail,
  SlidersHorizontal,
  Facebook,
  Twitter,
  Linkedin,
  Copy,
  Download,
  MessageCircle,
  Mic,
  MicOff,
  RefreshCw,
  HelpCircle,
  Save,
  Pencil,
  BookmarkPlus,
  SquareCheck,
  Square,
  CloudUpload
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { useQuestionStore, ChatSession, ChatMessage, UploadedMaterial, AIAssistantQuestion } from '@/stores/questionStore';
import { useQuestionBankStore } from '@/stores/questionBankStore';
import { useAuth } from '@/contexts/AuthContext';
import { getSmartResponse, GeneratedQuestion, ConversationContext, clearQuestionCache } from '@/services/smartAI';
import { getChatResponse } from '@/services/gemini/assistantChat';
import { isGeminiConfigured } from '@/services/gemini/config';
import { retrieveRelevantChunks } from '@/services/gemini/ragService';
import { generateQuestionsWithAI } from '@/services/gemini/questionGenerator';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { aiSecurity } from '@/services/aiSecurityService';
import { firestoreQuestionService, firestoreGeneratedQuestionService, firestoreChatShareService, firestoreChatService } from '@/services/firebase/firestore-database';
import { isFirebaseConfigured } from '@/services/firebase/firestore-config';
import { toDateSafe } from '@/services/firebase/converters';
import { regenerateAnswer } from '@/services/questionGenerationService';
import type { BloomsLevel } from '@/services/gemini/types';

const AIAssistant: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { 
    chatSessions, 
    activeChatId, 
    createChatSession, 
    addMessageToChat,
    deleteChatMessage,
    removeMessageAndAllAfter,
    deleteChatSession,
    deleteAllChatSessions,
    setActiveChatId,
    updateChatTitle,
    materials,
    addQuestion,
    setChatSelectedMaterial,
    setChatGeneratedQuestions,
    setChatSessions,
    updateChatGeneratedQuestion,
    deleteChatGeneratedQuestion,
    setChatGeneratedQuestionSelection,
    setAllChatGeneratedQuestionSelection,
    setChatLastQuestionsMessageId,
  } = useQuestionStore();

  const { addToBank } = useQuestionBankStore();

  // When signed in: show only this user's materials. When logged out: show all in store so library doesn't clear.
  const myMaterials = useMemo(
    () => (user?.id ? materials.filter((m) => m.staffId === user.id) : materials),
    [materials, user?.id]
  );

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastSuggestions, setLastSuggestions] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareMessageId, setShareMessageId] = useState<string | null>(null);
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);
  const [showAnswerRegenConfirm, setShowAnswerRegenConfirm] = useState<string | null>(null);
  const [pendingQuestionEdits, setPendingQuestionEdits] = useState<Map<string, string>>(new Map());
  const [showPerQuestionConfigDialog, setShowPerQuestionConfigDialog] = useState(false);
  const [perQuestionConfigQuestionId, setPerQuestionConfigQuestionId] = useState<string | null>(null);
  const [perQuestionConfigDraft, setPerQuestionConfigDraft] = useState<{
    type: 'mcq' | 'short' | 'long' | 'descriptive';
    difficulty: 'easy' | 'medium' | 'hard';
    bloomsLevel: BloomsLevel;
    marks: number;
  }>({
    type: 'long',
    difficulty: 'medium',
    bloomsLevel: 'Understand',
    marks: 10,
  });
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingChatTitle, setEditingChatTitle] = useState('');
  const [regeneratingAnswerId, setRegeneratingAnswerId] = useState<string | null>(null);
  const [editingUserMessageId, setEditingUserMessageId] = useState<string | null>(null);
  const [regeneratingMessageId, setRegeneratingMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [viewKeptQuestion, setViewKeptQuestion] = useState<AIAssistantQuestion | null>(null);
  const [showViewKeptQuestionDialog, setShowViewKeptQuestionDialog] = useState(false);
  // Voice UX: auto-send when user stops speaking + allow undo/delete
  const voiceStopAutoSendRef = useRef(false);
  const sendSourceRef = useRef<'text' | 'voice'>('text');

  // Chat-based question configuration (wizard)
  const [pendingGenPrompt, setPendingGenPrompt] = useState<string | null>(null);
  const [showGenConfigDialog, setShowGenConfigDialog] = useState(false);
  const [genConfig, setGenConfig] = useState<{
    topic: string;
    count: number;
    type: 'mcq' | 'short' | 'long' | 'descriptive';
    difficulty: 'easy' | 'medium' | 'hard';
    bloomsLevel: BloomsLevel;
    marks: number;
  }>({
    topic: 'the selected topic',
    count: 8,
    type: 'long',
    difficulty: 'medium',
    bloomsLevel: 'Understand',
    marks: 10,
  });

  // Prevent setState warnings/errors if the user navigates away mid-generation.
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const isQuestionGenerationRequest = (msg: string): boolean => {
    const m = msg.toLowerCase();
    if (!/\b(generate|create|make|give|get|provide|write|produce)\b/.test(m)) return false;
    if (!/\b(question|questions|mcq|mcqs|short answer|long answer|descriptive|quiz|answers)\b/.test(m)) return false;
    return true;
  };

  const hasExplicitConfigChoice = (msg: string): boolean => {
    const m = msg.toLowerCase();
    return (
      /\b(with|using)\s*configuration\b/.test(m) ||
      /\bwithout\s*configuration\b/.test(m) ||
      /\bcontinue\s+with\s+configuration\b/.test(m) ||
      /\bcontinue\s+without\s+configuration\b/.test(m)
    );
  };

  const BLOOMS_MAP: Record<string, BloomsLevel> = {
    remember: 'Remember',
    understand: 'Understand',
    apply: 'Apply',
    analyze: 'Analyze',
    evaluate: 'Evaluate',
    create: 'Create',
    mixed: 'Mixed',
  };

  const parseQuestionGenConfig = (msg: string) => {
    const m = msg.toLowerCase();

    // Count
    const numberMatch = msg.match(/(\d+)\s*(?:question|questions|mcq|mcqs|short|long|descriptive)?/i);
    const numberWords: Record<string, number> = {
      one: 1,
      two: 2,
      three: 3,
      four: 4,
      five: 5,
      six: 6,
      seven: 7,
      eight: 8,
      nine: 9,
      ten: 10,
      eleven: 11,
      twelve: 12,
      thirteen: 13,
      fourteen: 14,
      fifteen: 15,
    };
    let count = numberMatch ? parseInt(numberMatch[1], 10) : NaN;
    if (Number.isNaN(count)) {
      const wordMatch = msg.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen)\b/i);
      if (wordMatch) count = numberWords[wordMatch[1].toLowerCase()];
    }
    count = Number.isFinite(count) ? Math.min(50, Math.max(1, count)) : genConfig.count;

    // Type
    let type: typeof genConfig.type = genConfig.type;
    if (/\b(mcq|multiple\s+choice)\b/.test(m)) type = 'mcq';
    else if (/\b(short\s*answer|short)\b/.test(m)) type = 'short';
    else if (/\b(long\s*answer|long)\b/.test(m)) type = 'long';
    else if (/\b(descriptive|descriptive\s+question)\b/.test(m)) type = 'descriptive';

    // Difficulty
    let difficulty: typeof genConfig.difficulty = genConfig.difficulty;
    if (/\b(easy|simple|basic)\b/.test(m)) difficulty = 'easy';
    else if (/\b(hard|difficult|complex|challenging)\b/.test(m)) difficulty = 'hard';
    else if (/\b(medium)\b/.test(m)) difficulty = 'medium';

    // Marks
    let marks = genConfig.marks;
    const marksMatch = msg.match(/(\d+)\s*marks?/i);
    if (marksMatch) marks = Math.min(50, Math.max(1, parseInt(marksMatch[1], 10)));

    // Bloom's level
    let bloomsLevel: BloomsLevel = genConfig.bloomsLevel;
    const bloomsHint = Object.keys(BLOOMS_MAP).find((k) => new RegExp(`\\b${k}\\b`, 'i').test(m));
    if (bloomsHint) bloomsLevel = BLOOMS_MAP[bloomsHint];

    // Topic
    const topicMatch =
      msg.match(/(?:topic|on|about|from|regarding)\s+["']?(.+?)["']?(?=(?:\s+(?:difficulty|easy|medium|hard|mcq|short|long|descriptive|bloom|marks|question|questions)\b|$))/i) ||
      msg.match(/(?:topic|on|about|from|regarding)\s+["']?([^"'\n]+?)["']?\s*$/i);
    let topic = topicMatch ? topicMatch[1].trim() : genConfig.topic;
    if (!topic) topic = genConfig.topic;

    return { topic, count, type, difficulty, bloomsLevel, marks };
  };

  const shouldAskForChatConfig = (msg: string): boolean => {
    // Always offer configuration choice for question generation requests,
    // unless the user explicitly already chose with/without configuration.
    if (!isQuestionGenerationRequest(msg)) return false;
    return !hasExplicitConfigChoice(msg);
  };

  /** Strip "[Using material: ...]" prefix so we get the actual prompt for edit/regenerate. */
  const getRawUserContent = (displayContent: string) => {
    const match = displayContent.match(/\[Using material:[^\]]+\]\s*\n\n([\s\S]*)/);
    return match ? match[1].trim() : displayContent;
  };

  const activeSession = chatSessions.find(s => s.id === activeChatId);

  // Get persisted state from active session; only treat as selected if it exists in current user's materials
  const rawSelectedMaterial = activeSession?.selectedMaterialId || '';
  const selectedMaterialIdForUI = rawSelectedMaterial;
  const selectedMaterial = rawSelectedMaterial && myMaterials.some((m) => m.id === rawSelectedMaterial)
    ? rawSelectedMaterial
    : '';
  const generatedQuestions = activeSession?.generatedQuestions || [];

  // Questions that were "kept in chat" and attached to a specific user prompt message.
  const keptQuestionsInChat = (() => {
    const lastAssistantMessageId = activeSession?.lastQuestionsMessageId;
    if (!lastAssistantMessageId) return [];
    const msgs = activeSession?.messages ?? [];
    const idx = msgs.findIndex((m) => m.id === lastAssistantMessageId);
    if (idx <= 0) return [];
    const userMsg = msgs[idx - 1];
    return (userMsg?.role === 'user' ? (userMsg.generatedQuestions ?? []) : []) as AIAssistantQuestion[];
  })();
  const keptQuestionIdSet = new Set(keptQuestionsInChat.map((q) => q.id));

  // ============================================================
  // Firestore chat hydration (load chat sessions for this user)
  // ============================================================
  useEffect(() => {
    if (!isFirebaseConfigured() || !user?.id) return;
    let cancelled = false;

    (async () => {
      try {
        const sessions = await firestoreChatService.getSessionsByUser(user.id);
        const top = (sessions || []).slice(0, 25);

        const enriched = await Promise.all(
          top.map(async (s) => {
            const messages = await firestoreChatService.getMessages(s.id);
            return { session: s, messages };
          })
        );

        if (cancelled) return;

        const mappedSessions = enriched.map(({ session, messages }) => {
          let lastGeneratedQuestions: AIAssistantQuestion[] | undefined;
          let lastQuestionsMessageId: string | null = null;
          const chatMessages: ChatMessage[] = messages.map((m) => {
            const generatedQuestionsFromMsg = (m.generatedQuestions || []).map((q) => ({
              id: q.id,
              content: q.content,
              answer: q.answer,
              type: q.type as any,
              difficulty: q.difficulty as any,
              bloomsLevel: q.bloomsLevel || 'Understand',
              marks: q.marks,
              topic: q.topic,
              options: q.options,
              correctOption: q.correctOption,
              isEditing: false,
              isSelected: false,
              wasEdited: q.wasEdited,
              isSavedToMyQuestions: q.savedToMyQuestions,
              isSavedToBank: q.savedToQuestionBank,
              isSavedToCloud: false,
              originalContent: q.originalContent,
              originalAnswer: q.originalAnswer,
            }));
            if (generatedQuestionsFromMsg.length > 0) {
              lastGeneratedQuestions = generatedQuestionsFromMsg as any;
              lastQuestionsMessageId = m.id;
            }
            return {
              id: m.id,
              role: m.role,
              content: m.content,
              timestamp: m.timestamp as any,
              generatedQuestions: generatedQuestionsFromMsg.length > 0 ? (generatedQuestionsFromMsg as any) : undefined,
            };
          });

          return {
            id: session.id,
            title: session.title,
            messages: chatMessages,
            createdAt: session.createdAt as any,
            updatedAt: session.updatedAt as any,
            selectedMaterialId: session.materialId ?? null,
            selectedMaterialTitle: session.materialTitle ?? null,
            generatedQuestions: lastGeneratedQuestions,
            lastQuestionsMessageId,
          } as any;
        });

        setChatSessions(mappedSessions, mappedSessions[0]?.id ?? null);
        if (mappedSessions.length > 0) {
          setActiveChatId(mappedSessions[0].id);
        }
      } catch {
        // Best effort only: if hydration fails, local persisted state still works.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Voice input hook
  const {
    isListening,
    isSupported: isVoiceSupported,
    transcript,
    toggleListening,
    stopListening,
    resetTranscript,
  } = useVoiceInput({
    onResult: (result) => {
      setInputMessage(prev => prev + (prev ? ' ' : '') + result);
    },
    onError: (error) => {
      toast({
        title: 'Voice Input Error',
        description: error,
        variant: 'destructive',
      });
    },
    continuous: true,
  });

  // Sync input with voice: while listening show live transcript; when voice stops, set final transcript so user can edit/send
  const wasListening = useRef(false);
  useEffect(() => {
    if (isListening) {
      wasListening.current = true;
      if (transcript.trim()) setInputMessage(transcript);
    } else if (wasListening.current && transcript.trim()) {
      wasListening.current = false;
      setInputMessage(transcript);
    }
  }, [transcript, isListening]);

  // Auto-send voice message after user stops speaking (mic button).
  useEffect(() => {
    if (isListening) return;
    if (!voiceStopAutoSendRef.current) return;
    voiceStopAutoSendRef.current = false;

    const voiceText = transcript.trim();
    if (!voiceText) return;
    // Send as voice so we can show an Undo action for the last voice message
    sendSourceRef.current = 'voice';
    void handleSendMessage(voiceText);
  }, [isListening, transcript]);

  // Silence detection: if the speech recognition stops due to silence,
  // or if the transcript stops updating while listening, auto-send.
  const silenceTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isListening) return;
    if (!transcript.trim()) return;

    if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = window.setTimeout(() => {
      voiceStopAutoSendRef.current = true;
      stopListening();
    }, 1200);

    return () => {
      if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
    };
  }, [transcript, isListening, stopListening]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeSession?.messages]);

  const setSelectedMaterial = (materialId: string) => {
    const id = materialId === 'none' || !materialId ? null : materialId;
    const title = id ? myMaterials.find((m) => m.id === id)?.fileName : null;
    if (activeChatId) {
      setChatSelectedMaterial(activeChatId, id, title);
      // Persist selected material for this chat session so it survives logout.
      if (isFirebaseConfigured() && user?.id) {
        void (async () => {
          try {
            const selectedMat = id ? myMaterials.find((m) => m.id === id) : undefined;
            await firestoreChatService.updateSession(activeChatId, {
              materialId: selectedMat?.id,
              materialTitle: selectedMat?.fileName,
            } as any);
          } catch {
            // best-effort only
          }
        })();
      }
    } else if (id) {
      // No active chat yet: create one so the selection can be stored
      const newId = createChatSession('New Conversation');
      setChatSelectedMaterial(newId, id, title);
    }
  };

  // Intentionally do not auto-clear a stored `selectedMaterialId` here.
  // During async hydration, `myMaterials` may be temporarily incomplete, and clearing
  // can cause the selected material to not appear immediately.

  const setGeneratedQuestions = (questions: AIAssistantQuestion[]) => {
    if (activeChatId) {
      setChatGeneratedQuestions(activeChatId, questions);
    }
  };

  const handleNewChat = () => {
    // Persist the last selected material into the new chat so the selector shows immediately.
    const lastSelectedMaterialId = selectedMaterial || null;
    const lastSelectedMaterialTitle = activeSession?.selectedMaterialTitle ?? null;

    const id = createChatSession('New Conversation');
    setActiveChatId(id);
    clearQuestionCache();

    if (lastSelectedMaterialId) {
      setChatSelectedMaterial(id, lastSelectedMaterialId, lastSelectedMaterialTitle);
    }
  };

  const sendConfiguredGeneration = async (sessionId: string) => {
    const selectedMat = myMaterials.find((m) => m.id === selectedMaterial);
    if (!selectedMat) {
      const assistantMessageId = addMessageToChat(sessionId, {
        role: 'assistant',
        content: 'Select a material first, and then I’ll generate questions from it.',
      });
      if (isFirebaseConfigured() && user?.id) {
        void (async () => {
          try {
            await firestoreChatService.addMessageWithId(sessionId, assistantMessageId, {
              role: 'assistant',
              content: 'Select a material first, and then I’ll generate questions from it.',
              detectedIntent: 'question_generation_requires_material',
              materialId: selectedMaterial || undefined,
            } as any);
          } catch {
            // best-effort only
          }
        })();
      }
      return;
    }

    setIsLoading(true);
    try {
      const MAX_MATERIAL_CHARS = 400_000;
      const materialForGen =
        selectedMat.content.length <= MAX_MATERIAL_CHARS
          ? selectedMat.content
          : selectedMat.content.slice(0, MAX_MATERIAL_CHARS) + '\n\n[... material truncated for length ...]';

      const ragContext = retrieveRelevantChunks(
        genConfig.topic,
        myMaterials,
        selectedMaterial || null,
        { topK: 6, maxContextTokens: 8000 }
      );

      const prev = (generatedQuestions || []).map((q) => ({ content: q.content, topic: q.topic }));

      const result = await generateQuestionsWithAI({
        topics: [genConfig.topic],
        difficulty: genConfig.difficulty,
        questionType: genConfig.type,
        bloomsLevel: genConfig.bloomsLevel,
        marks: genConfig.marks,
        numberOfQuestions: genConfig.count,
        materialContent: materialForGen,
        materialContext: ragContext.contextText || undefined,
        previousQuestions: prev.length > 0 ? prev : undefined,
      });

      const mapped: AIAssistantQuestion[] = result.questions.map((q) => ({
        id: q.id,
        content: q.content,
        answer: q.answer,
        type: q.type,
        difficulty: q.difficulty,
        bloomsLevel: q.bloomsLevel,
        marks: q.marks,
        topic: q.topic,
        options: q.options,
        correctOption: q.correctOption,
        isSelected: false,
        isEditing: false,
        wasEdited: false,
        isSavedToMyQuestions: false,
        isSavedToBank: false,
      }));

      setChatGeneratedQuestions(sessionId, mapped);

      const assistantMessageId = addMessageToChat(sessionId, {
        role: 'assistant',
        content: `Done. I generated ${mapped.length} ${genConfig.type.toUpperCase()} questions on "${genConfig.topic}" at ${genConfig.difficulty} difficulty (Bloom's: ${genConfig.bloomsLevel}).`,
      });
      // Track the assistant message that contains this question set (used by "Keep in chat").
      setChatLastQuestionsMessageId(sessionId, assistantMessageId);
      // Persist question generation result in Firestore so chat survives logout.
      if (isFirebaseConfigured() && user?.id) {
        void (async () => {
          try {
            await firestoreChatService.addMessageWithId(sessionId, assistantMessageId, {
              role: 'assistant',
              content: `Done. I generated ${mapped.length} ${genConfig.type.toUpperCase()} questions on "${genConfig.topic}" at ${genConfig.difficulty} difficulty (Bloom's: ${genConfig.bloomsLevel}).`,
              materialId: selectedMaterial || undefined,
              detectedIntent: 'question_generation',
              questionConfig: {
                topic: genConfig.topic,
                questionType: genConfig.type,
                difficulty: genConfig.difficulty,
                bloomsLevel: genConfig.bloomsLevel,
                marks: genConfig.marks,
                count: genConfig.count,
              } as any,
              generatedQuestions: mapped.map((q: any) => ({
                id: q.id,
                content: q.content,
                answer: q.answer,
                type: q.type,
                difficulty: q.difficulty,
                bloomsLevel: q.bloomsLevel,
                topic: q.topic,
                unit: q.unit,
                marks: q.marks,
                options: q.options,
                correctOption: q.correctOption,
                isTwisted: q.isTwisted ?? false,
                wasEdited: q.wasEdited ?? false,
                savedToMyQuestions: q.isSavedToMyQuestions ?? false,
                savedToQuestionBank: q.isSavedToBank ?? false,
              })),
            } as any);
          } catch {
            // best-effort only
          }
        })();
      }

      setLastSuggestions([
        `Generate more ${genConfig.type.toUpperCase()} questions on "${genConfig.topic}"`,
        `Make these harder`,
        `Make these easier`,
        `Change to MCQ / Short / Long (your choice)`,
      ]);
    } catch (e) {
      const assistantMessageId = addMessageToChat(sessionId, {
        role: 'assistant',
        content: 'I couldn’t generate questions right now. Please try again.',
      });
      if (isFirebaseConfigured() && user?.id) {
        void (async () => {
          try {
            await firestoreChatService.addMessageWithId(sessionId, assistantMessageId, {
              role: 'assistant',
              content: 'I couldn’t generate questions right now. Please try again.',
              detectedIntent: 'question_generation_error',
              materialId: selectedMaterial || undefined,
            } as any);
          } catch {
            // best-effort only
          }
        })();
      }
    } finally {
      if (isMountedRef.current) setIsLoading(false);
      if (isMountedRef.current) setPendingGenPrompt(null);
    }
  };

  const handleSendMessage = async (overrideTextOrEvent?: unknown) => {
    // `onClick={handleSendMessage}` will pass a MouseEvent; ignore it and use the input text.
    const raw = typeof overrideTextOrEvent === 'string' ? overrideTextOrEvent : inputMessage;
    const rawTextToSend = typeof raw === 'string' ? raw.trim() : '';
    if (!rawTextToSend) return;
    const isVoiceSend = sendSourceRef.current === 'voice';
    // Reset immediately so later sends don't inherit voice mode
    sendSourceRef.current = 'text';

    // ── SECURITY: Validate staff access ──
    const accessCheck = aiSecurity.validateAccess(user);
    if (!accessCheck.allowed) {
      toast({ title: 'Access Denied', description: accessCheck.reason, variant: 'destructive' });
      aiSecurity.logInteraction({
        staffId: user?.id || 'unknown',
        staffEmail: user?.email || 'unknown',
        staffRole: user?.role || 'unknown',
        action: 'access_denied',
        prompt: rawTextToSend,
        promptLength: rawTextToSend.length,
        status: 'blocked',
        blockReason: accessCheck.reason,
      });
      return;
    }

    // ── SECURITY: Validate & sanitize prompt ──
    const promptCheck = aiSecurity.validatePrompt(rawTextToSend, user!, selectedMaterial || null, materials);
    if (!promptCheck.allowed) {
      toast({ title: 'Validation Error', description: promptCheck.reason, variant: 'destructive' });
      aiSecurity.logInteraction({
        staffId: user!.id,
        staffEmail: user!.email,
        staffRole: user!.role,
        action: 'chat_message',
        prompt: rawTextToSend,
        promptLength: rawTextToSend.length,
        status: 'blocked',
        blockReason: promptCheck.reason,
      });
      return;
    }

    let sanitizedInput = promptCheck.sanitizedPrompt || rawTextToSend;
    const lowerSanitized = sanitizedInput.toLowerCase().trim();

    // Stop listening if active
    if (isListening) {
      toggleListening();
      resetTranscript();
    }

    let sessionId = activeChatId;
    
    if (!sessionId) {
      sessionId = createChatSession(sanitizedInput.slice(0, 30) + '...');
    }

    if (editingUserMessageId) {
      removeMessageAndAllAfter(sessionId, editingUserMessageId);
      setEditingUserMessageId(null);
    }

    let bypassChatConfigChoice = false;

    // If we are waiting for "with config / without config" choice, handle it here (without hitting Gemini yet)
    if (pendingGenPrompt && sessionId) {
      if (/\b(with|using)\s*configuration\b/.test(lowerSanitized) || /\bcontinue\s+with\s+configuration\b/.test(lowerSanitized) || lowerSanitized === 'with configuration') {
        setShowGenConfigDialog(true);
        setInputMessage('');
        return;
      }
      if (/\b(without)\s*configuration\b/.test(lowerSanitized) || /\bcontinue\s+without\s+configuration\b/.test(lowerSanitized) || lowerSanitized === 'without configuration') {
        // proceed with the original prompt as-is
        const original = pendingGenPrompt;
        setPendingGenPrompt(null);
        setInputMessage('');
        sanitizedInput = original;
        bypassChatConfigChoice = true;
      }
    }

    // Include material context if selected
    let displayMessage = sanitizedInput;
    if (selectedMaterial) {
      const material = myMaterials.find(m => m.id === selectedMaterial);
      if (material) {
        displayMessage = `[Using material: ${material.fileName}]\n\n${sanitizedInput}`;
      }
    }

    const userMessageId = addMessageToChat(sessionId, {
      role: 'user',
      content: displayMessage,
    });

    // Persist to Firestore so chat history survives logout
    if (isFirebaseConfigured() && user?.id) {
      try {
        const selectedMat = myMaterials.find((m) => m.id === selectedMaterial);
        await firestoreChatService.createSessionWithId(sessionId, {
          userId: user.id,
          staffName: user.displayName || user.email || 'Staff',
          title: activeSession?.title || (sanitizedInput.slice(0, 30) + '...'),
          materialId: selectedMat?.id,
          materialTitle: selectedMat?.fileName,
          status: 'active',
          department: user.department,
          institution: user.institution,
          place: user.place,
          totalMessages: 0,
          totalQuestionsGenerated: 0,
          totalQuestionsSaved: 0,
        });

        await firestoreChatService.addMessageWithId(sessionId, userMessageId, {
          role: 'user',
          content: displayMessage,
          staffPrompt: sanitizedInput,
          materialId: selectedMaterial || undefined,
        });
      } catch {
        // Best-effort persistence only
      }
    }
    
    if (isVoiceSend) {
      toast({
        title: 'Voice message sent',
        description: 'Undo by deleting this message and the reply.',
        action: (
          <ToastAction altText="Undo" onClick={() => removeMessageAndAllAfter(sessionId, userMessageId)}>
            Undo
          </ToastAction>
        ),
      });
    }

    const userMessage = sanitizedInput;
    setInputMessage('');
    setIsLoading(true);

    try {
      // Intercept question generation requests: ask whether to configure or generate directly
      if (!bypassChatConfigChoice && shouldAskForChatConfig(userMessage) && sessionId) {
        const parsed = parseQuestionGenConfig(userMessage);
        setGenConfig((p) => ({
          ...p,
          ...parsed,
        }));
        setPendingGenPrompt(userMessage);
        const assistantConfigMessageId = addMessageToChat(sessionId, {
          role: 'assistant',
          content: `Want to generate questions with configuration (count, type, difficulty, Bloom's, marks, topic) or without configuration?\n\nReply with:\n- with configuration\n- without configuration`,
        });
        // Persist the config-choice prompt so chat history survives logout.
        if (isFirebaseConfigured() && user?.id) {
          void (async () => {
            try {
              await firestoreChatService.addMessageWithId(sessionId, assistantConfigMessageId, {
                role: 'assistant',
                content: `Want to generate questions with configuration (count, type, difficulty, Bloom's, marks, topic) or without configuration?\n\nReply with:\n- with configuration\n- without configuration`,
                materialId: selectedMaterial || undefined,
                detectedIntent: 'question_generation_config_choice',
                questionConfig: {
                  topic: parsed.topic,
                  questionType: parsed.type,
                  difficulty: parsed.difficulty,
                  bloomsLevel: parsed.bloomsLevel,
                  marks: parsed.marks,
                  count: parsed.count,
                },
              } as any);
            } catch {
              // best-effort only
            }
          })();
        }
        if (isMountedRef.current) setIsLoading(false);
        return;
      }

      // RAG: Use current user's materials so selection and chunks stay in sync
      const ragContext = retrieveRelevantChunks(
        userMessage,
        myMaterials,
        selectedMaterial || null,
        { topK: 6, maxContextTokens: 8000 }
      );

      // Build conversation context with RAG-retrieved chunks
      const context: ConversationContext = {
        materials: myMaterials,
        selectedMaterialId: selectedMaterial || null,
        generatedQuestions: generatedQuestions as GeneratedQuestion[],
        conversationHistory: activeSession?.messages.map(m => ({
          role: m.role,
          content: m.content,
        })) || [],
        materialChunksContext: ragContext.contextText || undefined,
      };

      let response: string;
      let questions: GeneratedQuestion[] | undefined;
      let action: string;
      let suggestions: string[] | undefined;

      // Direct, strictly-config-driven question generation (Gemini)
      if (isQuestionGenerationRequest(userMessage) && isGeminiConfigured()) {
        // If user explicitly asked for configuration UI in this same message, don't generate now
        if (/\b(with|using)\s*configuration\b/.test(lowerSanitized) || /\bcontinue\s+with\s+configuration\b/.test(lowerSanitized)) {
          const parsedNow = parseQuestionGenConfig(userMessage);
          setGenConfig((p) => ({ ...p, ...parsedNow }));
          setShowGenConfigDialog(true);
          if (isMountedRef.current) setIsLoading(false);
          return;
        }

        const cfg = parseQuestionGenConfig(userMessage);
        const selectedMat = myMaterials.find((m) => m.id === selectedMaterial);
        if (!selectedMat) {
          response = 'Select a material first, and then I can generate questions from it.';
          questions = undefined;
          action = 'question_generation';
          suggestions = ['Select a material', 'Generate 5 MCQ questions'];
        } else {
          const MAX_MATERIAL_CHARS = 400_000;
          const materialForGen =
            selectedMat.content.length <= MAX_MATERIAL_CHARS
              ? selectedMat.content
              : selectedMat.content.slice(0, MAX_MATERIAL_CHARS) + '\n\n[... material truncated for length ...]';

          const prev = (generatedQuestions || []).map((q) => ({ content: q.content, topic: q.topic }));

          // Guard: if we couldn’t find a meaningful topic, ask for it
          const topicLooksUnspecified = cfg.topic.trim().toLowerCase() === 'the selected topic';
          const topicHintPresent = /\b(topic|on|about|from|regarding)\b/i.test(userMessage);
          if (topicLooksUnspecified && !topicHintPresent) {
            response = 'Tell me the topic you want questions on (for example: "generate 5 easy MCQs on cloud computing").';
            questions = undefined;
            action = 'question_generation';
            suggestions = ['Add topic and retry', 'Analyze my material'];
          } else {
            const genResult = await generateQuestionsWithAI({
              topics: [cfg.topic],
              difficulty: cfg.difficulty,
              questionType: cfg.type,
              bloomsLevel: cfg.bloomsLevel,
              marks: cfg.marks,
              numberOfQuestions: cfg.count,
              materialContent: materialForGen,
              materialContext: ragContext.contextText || undefined,
              previousQuestions: prev.length > 0 ? prev : undefined,
            });

            const mapped: AIAssistantQuestion[] = genResult.questions.map((q) => ({
              id: q.id,
              content: q.content,
              answer: q.answer,
              type: q.type,
              difficulty: q.difficulty,
              bloomsLevel: q.bloomsLevel,
              marks: q.marks,
              topic: q.topic,
              options: q.options,
              correctOption: q.correctOption,
              isSelected: false,
              isEditing: false,
              wasEdited: false,
              isSavedToMyQuestions: false,
              isSavedToBank: false,
            }));

            setChatGeneratedQuestions(sessionId, mapped);
            response = `Done. I generated ${mapped.length} ${cfg.type.toUpperCase()} questions on "${cfg.topic}" at ${cfg.difficulty} difficulty (Bloom's: ${cfg.bloomsLevel}).`;
            questions = mapped as any;
            action = 'generate';
            suggestions = [
              `Edit question(s) and regenerate answers`,
              `Generate more ${cfg.type.toUpperCase()} questions on "${cfg.topic}"`,
              `Make these harder`,
              `Make these easier`,
            ];
          }
        }
      } else
      if (isGeminiConfigured()) {
        const chatContext = {
          messages: (activeSession?.messages || []).map((m, i) => ({
            id: m.id || `msg_${i}`,
            role: m.role,
            content: m.content,
            timestamp: new Date().toISOString(),
          })),
          selectedMaterialId: selectedMaterial || undefined,
          selectedMaterialContent: myMaterials.find(m => m.id === selectedMaterial)?.content,
          generatedQuestions: generatedQuestions as GeneratedQuestion[],
          materialChunksContext: ragContext.contextText || undefined,
        };
        const result = await getChatResponse(userMessage, chatContext);
        response = result.message;
        questions = result.generatedQuestions;
        action = result.action;
        suggestions = result.suggestions;
      } else {
        const smart = await getSmartResponse(userMessage, context);
        response = smart.response;
        questions = smart.questions;
        action = smart.action;
        suggestions = smart.suggestions;
      }
      
      // ── SECURITY: Audit log the interaction ──
      const auditAction = action === 'generate_twisted' ? 'twisted_generation'
        : action === 'generate' ? 'question_generation'
        : action === 'modification' ? 'question_modification'
        : action === 'regenerate_single' || action === 'regenerate_all' ? 'question_regeneration'
        : action === 'analyze_material' ? 'material_analysis'
        : 'chat_message';
      
      aiSecurity.logInteraction({
        staffId: user!.id,
        staffEmail: user!.email,
        staffRole: user!.role,
        action: auditAction as any,
        materialId: selectedMaterial || undefined,
        materialName: myMaterials.find(m => m.id === selectedMaterial)?.fileName,
        prompt: userMessage,
        promptLength: userMessage.length,
        responseLength: response.length,
        questionsGenerated: questions?.length || 0,
        isTwisted: action === 'generate_twisted',
        sessionId,
        status: 'success',
      });

      // Store AI suggestions for follow-up chips
      setLastSuggestions(suggestions || []);
      const assistantMessageId = addMessageToChat(sessionId, {
        role: 'assistant',
        content: response,
      });
      if (questions && questions.length > 0) {
        setChatLastQuestionsMessageId(sessionId, assistantMessageId);
      }
      // Persist assistant reply (and generated questions if any) so chat survives logout.
      if (isFirebaseConfigured() && user?.id) {
        void (async () => {
          try {
            await firestoreChatService.addMessageWithId(sessionId, assistantMessageId, {
              role: 'assistant',
              content: response,
              materialId: selectedMaterial || undefined,
              suggestions: suggestions || undefined,
              detectedIntent: action,
              questionConfig: questions
                ? ({
                    topic: genConfig.topic,
                    questionType: genConfig.type,
                    difficulty: genConfig.difficulty,
                    bloomsLevel: genConfig.bloomsLevel,
                    marks: genConfig.marks,
                    count: genConfig.count,
                  } as any)
                : undefined,
              generatedQuestions: questions
                ? (questions as any[]).map((q) => ({
                    id: q.id,
                    content: q.content,
                    answer: q.answer,
                    type: q.type,
                    difficulty: q.difficulty,
                    bloomsLevel: q.bloomsLevel,
                    topic: q.topic,
                    marks: q.marks,
                    options: q.options,
                    correctOption: q.correctOption,
                    isTwisted: q.isTwisted ?? false,
                    wasEdited: false,
                    savedToMyQuestions: false,
                    savedToQuestionBank: false,
                  }))
                : undefined,
            } as any);
          } catch {
            // best-effort only
          }
        })();
      }

      // Update generated questions if returned (persist to store)
      if (questions) {
        setChatGeneratedQuestions(sessionId, questions as AIAssistantQuestion[]);
      }

      // Show helpful toast for certain actions
      if (action === 'generate') {
        toast({
          title: 'Questions Generated',
          description: `${questions?.length || 0} unique questions created. You can edit or regenerate them.`,
        });
      }
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : 'Unknown error';
      // ── SECURITY: Log errors ──
      aiSecurity.logInteraction({
        staffId: user?.id,
        staffEmail: user?.email,
        staffRole: user?.role,
        action: 'chat_message',
        prompt: userMessage,
        promptLength: userMessage.length,
        status: 'error',
        metadata: { error: errMessage },
      });

      toast({
        title: 'Error',
        description: errMessage.includes('API_KEY') || errMessage.includes('API key')
          ? 'Gemini API key missing or invalid. Set VITE_GEMINI_API_KEY in .env and restart.'
          : errMessage.length > 80
            ? `Failed to get AI response: ${errMessage.slice(0, 80)}…`
            : errMessage || 'Failed to get AI response. Please try again.',
        variant: 'destructive',
      });
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  };

  const handleRegenerateResponse = async (assistantMessageId: string) => {
    if (!activeChatId || !activeSession) return;
    const sessionId = activeChatId;
    const idx = activeSession.messages.findIndex((m) => m.id === assistantMessageId);
    if (idx <= 0 || activeSession.messages[idx].role !== 'assistant') return;
    const userMsg = activeSession.messages[idx - 1];
    if (userMsg.role !== 'user') return;
    const userMsgContent = getRawUserContent(userMsg.content);
    const truncatedMessages = activeSession.messages.slice(0, idx);
    removeMessageAndAllAfter(sessionId, assistantMessageId);
    setRegeneratingMessageId(assistantMessageId);
    setIsLoading(true);
    try {
      // If the previous user prompt was a question-generation request, regenerate questions using
      // the same Gemini question-generation path (so answers match the selected config).
      if (isGeminiConfigured() && isQuestionGenerationRequest(userMsgContent)) {
        const selectedMat = myMaterials.find(m => m.id === selectedMaterial);
        if (!selectedMat) {
          const assistantMessageId2 = addMessageToChat(sessionId, {
            role: 'assistant',
            content: 'Select a material first, and then I’ll generate questions from it.',
          });
          // Best-effort persistence
          if (isFirebaseConfigured() && user?.id) {
            void firestoreChatService.addMessageWithId(sessionId, assistantMessageId2, {
              role: 'assistant',
              content: 'Select a material first, and then I’ll generate questions from it.',
            } as any).catch(() => {});
          }
          return;
        }

        const prev = (generatedQuestions || []).map((q) => ({ content: q.content, topic: q.topic }));
        const inferredTopic = generatedQuestions[0]?.topic || parseQuestionGenConfig(userMsgContent).topic;
        const inferredType = (generatedQuestions[0]?.type as any) || parseQuestionGenConfig(userMsgContent).type;
        const inferredDifficulty = (generatedQuestions[0]?.difficulty as any) || parseQuestionGenConfig(userMsgContent).difficulty;
        const inferredBlooms = (generatedQuestions[0]?.bloomsLevel as any) || parseQuestionGenConfig(userMsgContent).bloomsLevel;
        const inferredMarks = generatedQuestions[0]?.marks ?? parseQuestionGenConfig(userMsgContent).marks;
        const inferredCount = generatedQuestions.length > 0 ? generatedQuestions.length : parseQuestionGenConfig(userMsgContent).count;

        const ragContext = retrieveRelevantChunks(
          userMsgContent,
          myMaterials,
          selectedMaterial || null,
          { topK: 6, maxContextTokens: 8000 }
        );

        const MAX_MATERIAL_CHARS = 400_000;
        const materialForGen =
          selectedMat.content.length <= MAX_MATERIAL_CHARS
            ? selectedMat.content
            : selectedMat.content.slice(0, MAX_MATERIAL_CHARS) + '\n\n[... material truncated for length ...]';

        const genResult = await generateQuestionsWithAI({
          topics: [inferredTopic],
          difficulty: inferredDifficulty,
          questionType: inferredType,
          bloomsLevel: inferredBlooms,
          marks: inferredMarks,
          numberOfQuestions: inferredCount,
          materialContent: materialForGen,
          materialContext: ragContext.contextText || undefined,
          previousQuestions: prev.length > 0 ? prev : undefined,
        });

        const mapped: AIAssistantQuestion[] = genResult.questions.map((q) => ({
          id: q.id,
          content: q.content,
          answer: q.answer,
          type: q.type,
          difficulty: q.difficulty,
          bloomsLevel: q.bloomsLevel,
          marks: q.marks,
          topic: q.topic,
          options: q.options,
          correctOption: q.correctOption,
          isSelected: false,
          isEditing: false,
          wasEdited: false,
          isSavedToMyQuestions: false,
          isSavedToBank: false,
        }));

        setChatGeneratedQuestions(sessionId, mapped);

        const assistantMessageId2 = addMessageToChat(sessionId, {
          role: 'assistant',
          content: `Done. I generated ${mapped.length} ${String(inferredType).toUpperCase()} questions on "${inferredTopic}" at ${String(inferredDifficulty)} difficulty (Bloom's: ${String(inferredBlooms)}).`,
        });
        setChatLastQuestionsMessageId(sessionId, assistantMessageId2);

        setLastSuggestions([
          `Generate more ${String(inferredType).toUpperCase()} questions on "${inferredTopic}"`,
          `Make these harder`,
          `Make these easier`,
          `Change to MCQ / Short / Long (your choice)`,
        ]);

        if (isFirebaseConfigured() && user?.id) {
          void firestoreChatService.addMessageWithId(sessionId, assistantMessageId2, {
            role: 'assistant',
            content: `Done. I generated ${mapped.length} ${String(inferredType).toUpperCase()} questions on "${inferredTopic}" at ${String(inferredDifficulty)} difficulty (Bloom's: ${String(inferredBlooms)}).`,
            materialId: selectedMaterial || undefined,
            detectedIntent: 'question_generation',
            questionConfig: {
              topic: inferredTopic,
              questionType: inferredType as any,
              difficulty: inferredDifficulty as any,
              bloomsLevel: inferredBlooms as any,
              marks: inferredMarks as any,
              count: inferredCount as any,
            } as any,
            generatedQuestions: mapped.map((q) => ({
              id: q.id,
              content: q.content,
              answer: q.answer,
              type: q.type,
              difficulty: q.difficulty,
              bloomsLevel: q.bloomsLevel,
              topic: q.topic,
              marks: q.marks,
              options: q.options,
              correctOption: q.correctOption,
              isTwisted: false,
              wasEdited: false,
              savedToMyQuestions: false,
              savedToQuestionBank: false,
            })),
          } as any).catch(() => {});
        }

        return;
      }

      const ragContext = retrieveRelevantChunks(
        userMsgContent,
        myMaterials,
        selectedMaterial || null,
        { topK: 6, maxContextTokens: 8000 }
      );
      const context: ConversationContext = {
        materials: myMaterials,
        selectedMaterialId: selectedMaterial || null,
        generatedQuestions: generatedQuestions as GeneratedQuestion[],
        conversationHistory: truncatedMessages.map((m) => ({ role: m.role, content: m.content })),
        materialChunksContext: ragContext.contextText || undefined,
      };
      let response: string;
      let questions: GeneratedQuestion[] | undefined;
      let action: string;
      let suggestions: string[] | undefined;
      if (isGeminiConfigured()) {
        const chatContext = {
          messages: truncatedMessages.map((m, i) => ({
            id: m.id || `msg_${i}`,
            role: m.role,
            content: m.content,
            timestamp: new Date().toISOString(),
          })),
          selectedMaterialId: selectedMaterial || undefined,
          selectedMaterialContent: myMaterials.find((m) => m.id === selectedMaterial)?.content,
          generatedQuestions: generatedQuestions as GeneratedQuestion[],
          materialChunksContext: ragContext.contextText || undefined,
        };
        const result = await getChatResponse(userMsgContent, chatContext);
        response = result.message;
        questions = result.generatedQuestions;
        action = result.action;
        suggestions = result.suggestions;
      } else {
        const smart = await getSmartResponse(userMsgContent, context);
        response = smart.response;
        questions = smart.questions;
        action = smart.action;
        suggestions = smart.suggestions;
      }
      setLastSuggestions(suggestions || []);
      const assistantMessageId = addMessageToChat(sessionId, { role: 'assistant', content: response });
      if (questions && questions.length > 0) {
        setChatLastQuestionsMessageId(sessionId, assistantMessageId);
      }
      // Persist regenerated assistant reply so chat survives logout.
      if (isFirebaseConfigured() && user?.id) {
        void (async () => {
          try {
            await firestoreChatService.addMessageWithId(sessionId, assistantMessageId, {
              role: 'assistant',
              content: response,
              materialId: selectedMaterial || undefined,
              suggestions: suggestions || undefined,
              detectedIntent: action,
              questionConfig: questions
                ? ({
                    topic: genConfig.topic,
                    questionType: genConfig.type,
                    difficulty: genConfig.difficulty,
                    bloomsLevel: genConfig.bloomsLevel,
                    marks: genConfig.marks,
                    count: genConfig.count,
                  } as any)
                : undefined,
              generatedQuestions: questions
                ? (questions as any[]).map((q) => ({
                    id: q.id,
                    content: q.content,
                    answer: q.answer,
                    type: q.type,
                    difficulty: q.difficulty,
                    bloomsLevel: q.bloomsLevel,
                    topic: q.topic,
                    marks: q.marks,
                    options: q.options,
                    correctOption: q.correctOption,
                    isTwisted: q.isTwisted ?? false,
                    wasEdited: false,
                    savedToMyQuestions: false,
                    savedToQuestionBank: false,
                  }))
                : undefined,
            } as any);
          } catch {
            // best-effort only
          }
        })();
      }
      if (questions) setChatGeneratedQuestions(sessionId, questions as AIAssistantQuestion[]);
      toast({ title: 'Response regenerated', description: 'New response has been generated.' });
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Regenerate failed',
        description: errMessage.length > 80 ? `${errMessage.slice(0, 80)}…` : errMessage,
        variant: 'destructive',
      });
    } finally {
      if (isMountedRef.current) setIsLoading(false);
      setRegeneratingMessageId(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleDeleteChat = (sessionId: string) => {
    deleteChatSession(sessionId);
    setDeleteConfirmId(null);
    if (isFirebaseConfigured() && user?.id) {
      void firestoreChatService.deleteSessionAndMessages(sessionId).catch(() => {});
    }
    toast({
      title: 'Chat Deleted',
      description: 'The conversation has been removed',
    });
  };

  const handleClearAllChats = () => {
    deleteAllChatSessions();
    setShowClearAllConfirm(false);
    clearQuestionCache();
    if (isFirebaseConfigured() && user?.id) {
      void firestoreChatService.deleteAllSessionsByUser(user.id).catch(() => {});
    }
    toast({
      title: 'All Chats Cleared',
      description: 'All conversations have been removed',
    });
  };

  // Delete individual message
  const handleDeleteMessage = (messageId: string) => {
    if (activeChatId) {
      deleteChatMessage(activeChatId, messageId);
      if (isFirebaseConfigured() && user?.id) {
        void firestoreChatService.deleteMessage(activeChatId, messageId).catch(() => {});
      }
      setDeleteMessageId(null);
      toast({
        title: 'Message Deleted',
        description: 'The message has been removed',
      });
    }
  };

  // Share single message or entire chat
  const buildShareText = (): string => {
    if (!activeSession) return;
    
    let shareContent: string;
    
    if (shareMessageId) {
      // Share single message
      const message = activeSession.messages.find(m => m.id === shareMessageId);
      if (message) {
        shareContent = `${message.role === 'user' ? 'You' : 'AI'}: ${message.content}`;
      } else {
        return;
      }
    } else {
      // Share entire conversation
      shareContent = activeSession.messages
        .map(m => `${m.role === 'user' ? 'You' : 'AI'}: ${m.content}`)
        .join('\n\n');
    }
    return shareContent;
  };

  const buildShareHtml = (): string => {
    if (!activeSession) return '';
    const title = activeSession.title || 'QGenesis Chat';
    const selectedMat = myMaterials.find(m => m.id === selectedMaterial);
    const materialLabel = selectedMat?.fileName ? `Material: ${selectedMat.fileName}` : '';
    const rows = (shareMessageId
      ? activeSession.messages.filter(m => m.id === shareMessageId)
      : activeSession.messages
    ).map((m) => {
      const who = m.role === 'user' ? 'You' : 'AI';
      const ts = toDateSafe(m.timestamp as any)?.toLocaleString?.() ?? '';
      const safe = (m.content || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br/>');
      return `<div class="msg ${m.role}"><div class="meta"><span class="who">${who}</span>${ts ? `<span class="ts">${ts}</span>` : ''}</div><div class="body">${safe}</div></div>`;
    }).join('\n');

    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      :root{color-scheme:light dark;}
      body{margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;line-height:1.5;background:#0b0b0f;color:#e9e9f1}
      .wrap{max-width:900px;margin:0 auto;padding:28px}
      .header{display:flex;flex-direction:column;gap:6px;margin-bottom:18px}
      .title{font-size:20px;font-weight:700}
      .sub{font-size:12px;opacity:.75}
      .msg{padding:14px 16px;border-radius:14px;margin:10px 0;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08)}
      .msg.user{background:rgba(82,126,255,.14);border-color:rgba(82,126,255,.22)}
      .meta{display:flex;gap:10px;align-items:center;margin-bottom:6px;font-size:12px;opacity:.8}
      .who{font-weight:700}
      .ts{opacity:.8}
      .body{white-space:normal;font-size:14px}
      @media (prefers-color-scheme: light){
        body{background:#f8f8fb;color:#141420}
        .msg{background:#fff;border-color:#e9e9f1}
        .msg.user{background:#eef3ff;border-color:#d7e2ff}
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="header">
        <div class="sub">QGenesis AI • Shared chat</div>
        <div class="title">${title.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
        ${materialLabel ? `<div class="sub">${materialLabel.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>` : ''}
      </div>
      ${rows}
    </div>
  </body>
</html>`;
  };

  const downloadExport = (kind: 'txt' | 'html') => {
    const text = buildShareText();
    const html = buildShareHtml();
    const blob = new Blob([kind === 'txt' ? text : html], { type: kind === 'txt' ? 'text/plain;charset=utf-8' : 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = kind === 'txt' ? 'qgenesis-chat.txt' : 'qgenesis-chat.html';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  };

  const createShareLink = async (): Promise<string | null> => {
    if (!activeSession) return null;
    const text = buildShareText();
    const html = buildShareHtml();
    const selectedMat = myMaterials.find(m => m.id === selectedMaterial);
    // Always prefer the authenticated owner/session owner id for Firestore ownership checks.
    const ownerUserId = activeSession.userId || user?.id || null;
    if (!ownerUserId) {
      throw new Error('No authenticated user found for share creation');
    }
    const shareId = await firestoreChatShareService.createShare({
      userId: ownerUserId,
      sessionId: activeSession.id,
      title: activeSession.title || 'QGenesis Chat',
      materialId: selectedMat?.id,
      materialTitle: selectedMat?.fileName,
      text,
      html,
      isPublic: true,
    });
    return `${window.location.origin}/share/chat/${shareId}`;
  };

  const handleShareMessage = async (platform: string) => {
    if (!activeSession) return;

    // Copy should always copy full content (no link needed)
    if (platform === 'copy') {
      const shareContent = buildShareText();
      if (!shareContent) return;
      await navigator.clipboard.writeText(shareContent);
      toast({
        title: 'Copied!',
        description: shareMessageId ? 'Message copied to clipboard' : 'Chat content copied to clipboard',
      });
      setShowShareDialog(false);
      setShareMessageId(null);
      return;
    }

    if (platform === 'copy_link') {
      try {
        const link = await createShareLink();
        if (!link) return;
        await navigator.clipboard.writeText(link);
        toast({ title: 'Copied!', description: 'Share link copied to clipboard' });
      } catch {
        const fallback = buildShareText();
        if (fallback) {
          await navigator.clipboard.writeText(fallback);
          toast({
            title: 'Link unavailable',
            description: 'Could not create share link. Chat text was copied instead.',
          });
        } else {
          toast({ title: 'Copy failed', description: 'Could not create/copy share link. Try again.', variant: 'destructive' });
        }
      } finally {
        setShowShareDialog(false);
        setShareMessageId(null);
      }
      return;
    }

    // Export/download
    if (platform === 'download_txt') {
      downloadExport('txt');
      return;
    }
    if (platform === 'download_html') {
      downloadExport('html');
      return;
    }

    // Social sharing needs a real URL. Create a public share link first.
    let shareUrl = window.location.href;
    try {
      const link = await createShareLink();
      if (link) shareUrl = link;
    } catch (e) {
      toast({
        title: 'Share link failed',
        description: 'Could not create a share link. You can still copy or download the chat.',
        variant: 'destructive',
      });
    }
    const shareContent = buildShareText() || '';
    
    // For social: short preview. For copy: always full conversation or full message.
    const sharePreview = shareContent.slice(0, 500) + (shareContent.length > 500 ? '...' : '');
    const shareText = `Check out ${shareMessageId ? 'this message' : 'my conversation'} from QGenesis AI!\n\n${sharePreview}`;
    
    let shareLink = '';
    
    switch (platform) {
      case 'facebook':
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
        break;
      case 'twitter':
        shareLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'linkedin':
        shareLink = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'mail':
        shareLink = `mailto:?subject=${encodeURIComponent('QGenesis AI • Shared Chat')}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`;
        break;
      case 'whatsapp':
        shareLink = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`;
        break;
    }
    
    if (shareLink) {
      window.open(shareLink, '_blank', 'width=600,height=400');
    }
    setShowShareDialog(false);
    setShareMessageId(null);
  };

  const handleEditQuestion = (id: string, field: 'content' | 'answer', value: string) => {
    if (activeChatId) {
      updateChatGeneratedQuestion(activeChatId, id, { [field]: value });
      // Track content edits for dynamic answer regeneration
      if (field === 'content') {
        setPendingQuestionEdits(prev => new Map(prev).set(id, value));
      }
    }
  };

  // Regenerate answer using a per-question configuration override.
  const regenerateAnswerForQuestionWithConfig = async (
    questionId: string,
    configOverrides: {
      type?: 'mcq' | 'short' | 'long' | 'descriptive';
      difficulty?: 'easy' | 'medium' | 'hard';
      bloomsLevel?: BloomsLevel;
      marks?: number;
    }
  ) => {
    const question = generatedQuestions.find(q => q.id === questionId);
    if (!question || !activeChatId) return;

    const contentToUse = pendingQuestionEdits.get(questionId) ?? question.content;
    const selectedMat = myMaterials.find(m => m.id === selectedMaterial);
    const materialContent = selectedMat?.content || '';

    const effectiveType = configOverrides.type ?? question.type;
    const effectiveDifficulty = configOverrides.difficulty ?? question.difficulty;
    const effectiveBloomsLevel = (configOverrides.bloomsLevel ?? question.bloomsLevel ?? 'Understand') as BloomsLevel;
    const effectiveMarks = configOverrides.marks ?? question.marks ?? 5;

    setRegeneratingAnswerId(questionId);
    try {
      if (isGeminiConfigured()) {
        const { answer } = await regenerateAnswer({
          questionContent: contentToUse,
          questionType: effectiveType,
          difficulty: effectiveDifficulty,
          bloomsLevel: effectiveBloomsLevel || 'Understand',
          topic: question.topic || 'General',
          marks: effectiveMarks,
          materialContent: materialContent || undefined,
          options: question.options,
          correctOption: question.correctOption,
        });

        updateChatGeneratedQuestion(activeChatId, questionId, {
          type: effectiveType,
          difficulty: effectiveDifficulty,
          bloomsLevel: effectiveBloomsLevel,
          marks: effectiveMarks,
          answer,
          content: contentToUse,
        });
        persistCurrentGeneratedPanelFromStore(activeChatId);

        toast({
          title: 'Answer Regenerated',
          description: 'Answer updated from the material using the updated question configuration.',
        });
      } else {
        // Local fallback: re-extract using updated configuration (approximate).
        let newAnswer = '';
        if (materialContent) {
          const queryWords = contentToUse.toLowerCase().split(/\s+/).filter(w => w.length > 4);
          const sentences = materialContent.split(/[.!?]+/).filter(s => s.trim());
          const relevantSentences = sentences.filter(s => queryWords.some(w => s.toLowerCase().includes(w)));

          const takeCount =
            effectiveType === 'long' || effectiveType === 'descriptive'
              ? effectiveDifficulty === 'hard' ? 8 : effectiveDifficulty === 'medium' ? 6 : 4
              : effectiveType === 'short'
                ? effectiveDifficulty === 'hard' ? 5 : effectiveDifficulty === 'medium' ? 4 : 3
                : 2;

          newAnswer = relevantSentences.slice(0, Math.max(2, takeCount)).join('. ').trim();
        }

        if (!newAnswer) {
          newAnswer = `Based on the material, the answer for the updated question is available in the relevant sections.`;
        }

        updateChatGeneratedQuestion(activeChatId, questionId, {
          type: effectiveType,
          difficulty: effectiveDifficulty,
          bloomsLevel: effectiveBloomsLevel,
          marks: effectiveMarks,
          answer: newAnswer,
          content: contentToUse,
        });
        persistCurrentGeneratedPanelFromStore(activeChatId);
      }
    } catch (err) {
      toast({
        title: 'Regeneration failed',
        description: err instanceof Error ? err.message : 'Could not regenerate answer. Try again.',
        variant: 'destructive',
      });
    } finally {
      setRegeneratingAnswerId(null);
      setPendingQuestionEdits(prev => {
        const next = new Map(prev);
        next.delete(questionId);
        return next;
      });
    }
  };

  // Regenerate the selected question AND its answer (only for this question),
  // using the per-question configuration provided in the dialog.
  const regenerateQuestionAndAnswerForQuestionWithConfig = async (
    questionId: string,
    configOverrides: {
      type?: 'mcq' | 'short' | 'long' | 'descriptive';
      difficulty?: 'easy' | 'medium' | 'hard';
      bloomsLevel?: BloomsLevel;
      marks?: number;
    }
  ) => {
    const question = generatedQuestions.find(q => q.id === questionId);
    if (!question || !activeChatId) return;

    const selectedMat = myMaterials.find(m => m.id === selectedMaterial);
    const materialContent = selectedMat?.content || '';

    const effectiveType = configOverrides.type ?? question.type;
    const effectiveDifficulty = configOverrides.difficulty ?? question.difficulty;
    const effectiveBloomsLevel = (configOverrides.bloomsLevel ?? question.bloomsLevel ?? 'Understand') as BloomsLevel;
    const effectiveMarks = configOverrides.marks ?? question.marks ?? 5;
    const effectiveTopic = question.topic || selectedMat?.topics?.[0] || 'the selected topic';

    setRegeneratingAnswerId(questionId);
    try {
      const previousQuestions = generatedQuestions
        .filter(q => q.id !== questionId)
        .map(q => ({ content: q.content, topic: q.topic }));

      const runSingleRegeneration = async (usePrevious: boolean) =>
        generateQuestionsWithAI({
          topics: [effectiveTopic],
          difficulty: effectiveDifficulty,
          questionType: effectiveType,
          bloomsLevel: effectiveBloomsLevel,
          marks: effectiveMarks,
          numberOfQuestions: 1,
          materialContent,
          previousQuestions: usePrevious ? previousQuestions : undefined,
        });

      let result = await runSingleRegeneration(true);
      let newQuestion = result.questions[0];
      const isMcqInvalid = (q: any) =>
        effectiveType === 'mcq' &&
        (!Array.isArray(q?.options) ||
          q.options.length !== 4 ||
          !Number.isInteger(q?.correctOption) ||
          q.correctOption < 0 ||
          q.correctOption > 3);
      const questionLooksIncomplete =
        !newQuestion?.content ||
        newQuestion.content.trim().split(/\s+/).length < 8 ||
        /[,;:-]\s*$/.test(newQuestion.content.trim()) ||
        isMcqInvalid(newQuestion);
      if (questionLooksIncomplete) {
        // Retry once without previous-question constraint if the first result is truncated/partial.
        result = await runSingleRegeneration(false);
        newQuestion = result.questions[0];
      }
      if (!newQuestion) {
        toast({
          title: 'Failed to regenerate',
          description: 'Could not generate a replacement question. Try again.',
          variant: 'destructive',
        });
        return;
      }

      let finalAnswer = (newQuestion.answer || '').trim();
      if (!finalAnswer) {
        try {
          const regenerated = await regenerateAnswer({
            questionContent: newQuestion.content,
            questionType: effectiveType,
            difficulty: effectiveDifficulty,
            bloomsLevel: effectiveBloomsLevel || 'Understand',
            topic: newQuestion.topic || effectiveTopic,
            marks: effectiveMarks,
            materialContent: materialContent || undefined,
            options: newQuestion.options,
            correctOption: newQuestion.correctOption,
          });
          finalAnswer = (regenerated.answer || '').trim();
        } catch {
          // Fallback below
        }
      }
      if (!finalAnswer) {
        finalAnswer = 'Answer generation failed for this attempt. Please regenerate again.';
      }

      updateChatGeneratedQuestion(activeChatId, questionId, {
        type: effectiveType,
        difficulty: effectiveDifficulty,
        bloomsLevel: effectiveBloomsLevel,
        marks: effectiveMarks,
        topic: newQuestion.topic || effectiveTopic,
        content: newQuestion.content,
        answer: finalAnswer,
        options: newQuestion.options,
        correctOption: newQuestion.correctOption,
      });
      persistCurrentGeneratedPanelFromStore(activeChatId);
      persistTranscriptForQuestion(activeChatId, questionId);

      toast({
        title: 'Question and answer regenerated',
        description: 'Updated this exact question using your configuration.',
      });
    } catch (err) {
      toast({
        title: 'Regeneration failed',
        description: err instanceof Error ? err.message : 'Could not regenerate question. Try again.',
        variant: 'destructive',
      });
    } finally {
      setRegeneratingAnswerId(null);
      setPendingQuestionEdits(prev => {
        const next = new Map(prev);
        next.delete(questionId);
        return next;
      });
    }
  };

  // Regenerate answer from material when question content is edited (uses Gemini when configured)
  const regenerateAnswerForQuestion = async (questionId: string) => {
    const question = generatedQuestions.find(q => q.id === questionId);
    if (!question || !activeChatId) return;

    // Use modified content if user just edited (pending edit) so answer matches the edited question
    const contentToUse = pendingQuestionEdits.get(questionId) ?? question.content;

    const selectedMat = myMaterials.find(m => m.id === selectedMaterial);
    const materialContent = selectedMat?.content || '';

    setRegeneratingAnswerId(questionId);
    try {
      if (isGeminiConfigured()) {
        const { answer } = await regenerateAnswer({
          questionContent: contentToUse,
          questionType: question.type,
          difficulty: question.difficulty,
          bloomsLevel: question.bloomsLevel || 'Understand',
          topic: question.topic || 'General',
          marks: question.marks || 5,
          materialContent: materialContent || undefined,
          options: question.options,
          correctOption: question.correctOption,
        });
        updateChatGeneratedQuestion(activeChatId, questionId, { answer, content: contentToUse });
        persistCurrentGeneratedPanelFromStore(activeChatId);
        persistTranscriptForQuestion(activeChatId, questionId);
        toast({
          title: 'Answer Regenerated',
          description: 'Answer updated from the material using AI.',
        });
      } else {
        // Fallback: simple extraction from material or template
        let newAnswer = '';
        if (materialContent) {
          const queryWords = contentToUse.toLowerCase().split(/\s+/).filter(w => w.length > 4);
          const sentences = materialContent.split(/[.!?]+/).filter(s => s.trim());
          const relevantSentences = sentences.filter(s =>
            queryWords.some(w => s.toLowerCase().includes(w))
          ).slice(0, 3);
          if (relevantSentences.length > 0) {
            newAnswer = relevantSentences.join('. ').trim();
          }
        }
        if (!newAnswer) {
          newAnswer = `Based on the material: ${contentToUse.replace(/[?.]$/g, '')} is addressed in the relevant sections. Refer to the material for the precise answer.`;
        }
        updateChatGeneratedQuestion(activeChatId, questionId, { answer: newAnswer, content: contentToUse });
        persistCurrentGeneratedPanelFromStore(activeChatId);
        persistTranscriptForQuestion(activeChatId, questionId);
        toast({
          title: 'Answer Regenerated',
          description: 'Answer updated to match the modified question.',
        });
      }
    } catch (err) {
      toast({
        title: 'Regeneration failed',
        description: err instanceof Error ? err.message : 'Could not regenerate answer. Try again.',
        variant: 'destructive',
      });
    } finally {
      setRegeneratingAnswerId(null);
      setPendingQuestionEdits(prev => {
        const next = new Map(prev);
        next.delete(questionId);
        return next;
      });
    }
  };

  const toggleEditQuestion = (id: string) => {
    if (activeChatId) {
      const question = generatedQuestions.find(q => q.id === id);
      const wasEditing = question?.isEditing;
      
      // When finishing edit and question content was changed, prompt for answer regen
      if (wasEditing && pendingQuestionEdits.has(id)) {
        setShowAnswerRegenConfirm(id);
      }
      
      updateChatGeneratedQuestion(activeChatId, id, { isEditing: !question?.isEditing });
      if (wasEditing) {
        persistCurrentGeneratedPanelFromStore(activeChatId);
        persistTranscriptForQuestion(activeChatId, id);
      }
    }
  };

  const handleDeleteQuestion = (id: string) => {
    if (activeChatId) {
      deleteChatGeneratedQuestion(activeChatId, id);
      const next = generatedQuestions.filter((q) => q.id !== id);
      persistCurrentGeneratedPanel(activeChatId, next);
      toast({
        title: 'Question Deleted',
        description: 'The question has been removed',
      });
    }
  };

  const toggleSelectQuestion = (id: string) => {
    if (activeChatId) {
      const question = generatedQuestions.find(q => q.id === id);
      setChatGeneratedQuestionSelection(activeChatId, id, !question?.isSelected);
    }
  };

  const toggleSelectAll = () => {
    if (activeChatId) {
      const allSelected = generatedQuestions.every(q => q.isSelected);
      setAllChatGeneratedQuestionSelection(activeChatId, !allSelected);
    }
  };

  // Build Firestore generated_questions payload for one or more AI Assistant questions
  const buildGeneratedQuestionPayloads = (questions: AIAssistantQuestion[]) => {
    const staffId = user?.id || '';
    return questions.map((q) => ({
      content: q.content,
      answer: q.answer,
      explanation: '',
      type: q.type,
      difficulty: q.difficulty,
      bloomsLevel: q.bloomsLevel ?? 'Understand',
      marks: q.marks ?? 5,
      topic: q.topic ?? 'General',
      unit: '',
      subject: '',
      source: 'ai-assistant' as const,
      generationSource: 'ai-chat' as const,
      materialId: selectedMaterial || undefined,
      staffId,
      department: user?.department,
      institution: user?.institution,
      place: user?.place,
      status: 'draft' as const,
      options: q.options,
      correctOption: q.correctOption,
      examType: q.examType ?? 'SEM',
    }));
  };

  const persistQuestionToMyQuestions = (question: AIAssistantQuestion) => {
    const payload = {
      content: question.content,
      answer: question.answer,
      type: question.type,
      difficulty: question.difficulty,
      bloomsLevel: question.bloomsLevel || 'L2',
      marks: question.marks || 5,
      topic: question.topic || 'General',
      source: 'ai-assistant' as const,
      generatedBy: isGeminiConfigured() ? ('gemini' as const) : ('local' as const),
      status: 'draft' as const,
      options: question.options,
      correctOption: question.correctOption,
      examType: question.examType || 'SEM',
      materialId: selectedMaterial || undefined,
      department: user?.department,
      institution: user?.institution,
      place: user?.place,
      staffId: user?.id || '',
    };
    // Always add to local store so My Questions updates immediately with all details (like before)
    addQuestion(payload);
    // When Firebase is configured, also persist to database for permanent role-based storage
    if (isFirebaseConfigured()) {
      firestoreQuestionService.create(payload).catch((err) =>
        console.error('[AIAssistant] Firestore create failed:', err)
      );
    }
  };

  // Save a single question to Firestore generated_questions (cloud)
  const handleSaveQuestionToCloud = async (question: AIAssistantQuestion) => {
    if (!user?.id) {
      toast({ title: 'Sign in required', description: 'Sign in to save to cloud', variant: 'destructive' });
      return;
    }
    if (!isFirebaseConfigured()) {
      toast({ title: 'Cloud not available', description: 'Firebase is not configured.', variant: 'destructive' });
      return;
    }
    try {
      const payloads = buildGeneratedQuestionPayloads([question]);
      await firestoreGeneratedQuestionService.batchCreate(payloads);
      if (activeChatId) {
        updateChatGeneratedQuestion(activeChatId, question.id, { isSavedToCloud: true });
      }
      toast({ title: 'Saved to cloud', description: 'Question saved to your generated questions.' });
    } catch (err) {
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Could not save to cloud',
        variant: 'destructive',
      });
    }
  };

  // Save selected questions to Firestore generated_questions (cloud)
  const handleSaveSelectedToCloud = async () => {
    const toSave = generatedQuestions.filter((q) => q.isSelected && !q.isSavedToCloud);
    if (toSave.length === 0) {
      toast({
        title: 'Nothing to save',
        description: 'Select questions that are not already saved to cloud.',
        variant: 'destructive',
      });
      return;
    }
    if (!user?.id) {
      toast({ title: 'Sign in required', description: 'Sign in to save to cloud', variant: 'destructive' });
      return;
    }
    if (!isFirebaseConfigured()) {
      toast({ title: 'Cloud not available', description: 'Firebase is not configured.', variant: 'destructive' });
      return;
    }
    try {
      const payloads = buildGeneratedQuestionPayloads(toSave);
      await firestoreGeneratedQuestionService.batchCreate(payloads);
      if (activeChatId) {
        toSave.forEach((q) => updateChatGeneratedQuestion(activeChatId, q.id, { isSavedToCloud: true }));
      }
      toast({ title: 'Saved to cloud', description: `${toSave.length} question(s) saved to generated questions.` });
    } catch (err) {
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Could not save to cloud',
        variant: 'destructive',
      });
    }
  };

  // Save individual question to My Questions only
  const handleSaveToMyQuestions = (question: AIAssistantQuestion) => {
    persistQuestionToMyQuestions(question);

    if (activeChatId) {
      updateChatGeneratedQuestion(activeChatId, question.id, { isSavedToMyQuestions: true });
    }

    toast({
      title: 'Saved to My Questions',
      description: 'Question added to My Questions',
    });
  };

  // Save individual question to bank and My Questions
  const handleSaveToBank = (question: AIAssistantQuestion) => {
    addToBank({
      content: question.content,
      answer: question.answer,
      marks: question.marks || 5,
      btl: question.bloomsLevel || 'L2',
      type: question.type,
      topic: question.topic || 'General',
      difficulty: question.difficulty,
      examType: 'SEM',
      tags: [],
    });

    persistQuestionToMyQuestions(question);

    if (activeChatId) {
      updateChatGeneratedQuestion(activeChatId, question.id, { isSavedToMyQuestions: true, isSavedToBank: true });
    }

    toast({
      title: 'Question Saved',
      description: 'Added to Question Bank and My Questions',
    });
  };

  // Save all questions to bank and My Questions
  const handleSaveAllToBank = () => {
    const unsavedQuestions = generatedQuestions.filter(q => !q.isSavedToMyQuestions);
    
    if (unsavedQuestions.length === 0) {
      toast({
        title: 'No New Questions',
        description: 'All questions have already been saved',
        variant: 'destructive',
      });
      return;
    }

    unsavedQuestions.forEach(question => {
      addToBank({
        content: question.content,
        answer: question.answer,
        marks: question.marks || 5,
        btl: question.bloomsLevel || 'L2',
        type: question.type,
        topic: question.topic || 'General',
        difficulty: question.difficulty,
        examType: 'SEM',
        tags: [],
      });

      persistQuestionToMyQuestions(question);
    });

    // Mark all as saved
    if (activeChatId) {
      generatedQuestions.forEach(q => {
        updateChatGeneratedQuestion(activeChatId, q.id, { isSavedToMyQuestions: true, isSavedToBank: true });
      });
    }

    toast({
      title: 'All Questions Saved',
      description: `${unsavedQuestions.length} questions added to Question Bank and My Questions`,
    });
  };

  // Save selected questions
  const handleSaveSelectedToBank = () => {
    const selectedQuestions = generatedQuestions.filter(q => q.isSelected && !q.isSavedToMyQuestions);
    
    if (selectedQuestions.length === 0) {
      toast({
        title: 'No Questions Selected',
        description: 'Please select questions to save',
        variant: 'destructive',
      });
      return;
    }

    selectedQuestions.forEach(question => {
      addToBank({
        content: question.content,
        answer: question.answer,
        marks: question.marks || 5,
        btl: question.bloomsLevel || 'L2',
        type: question.type,
        topic: question.topic || 'General',
        difficulty: question.difficulty,
        examType: 'SEM',
        tags: [],
      });

      persistQuestionToMyQuestions(question);

      if (activeChatId) {
        updateChatGeneratedQuestion(activeChatId, question.id, { isSavedToMyQuestions: true, isSavedToBank: true, isSelected: false });
      }
    });

    toast({
      title: 'Selected Questions Saved',
      description: `${selectedQuestions.length} questions added to Question Bank and My Questions`,
    });
  };

  // Persist the current generated question set into the chat (Firestore),
  // and attach it to the actual *user prompt message* that triggered generation,
  // so staff can see it under that prompt in chat history/hydration.
  const resolveGenerationPromptUserMessage = (session: ChatSession | null | undefined): ChatMessage | null => {
    if (!session) return null;
    const messages = session.messages ?? [];
    const lastQMsgId = session.lastQuestionsMessageId;
    if (lastQMsgId) {
      const idx = messages.findIndex((m) => m.id === lastQMsgId);
      if (idx >= 0) {
        if (messages[idx]?.role === 'user') return messages[idx];
        for (let i = idx - 1; i >= 0; i--) {
          if (messages[i]?.role === 'user') return messages[i];
        }
      }
    }
    // Fallback: use latest user message in this chat.
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]?.role === 'user') return messages[i];
    }
    return null;
  };

  const handleKeepGeneratedQuestionsInChat = async () => {
    if (!activeChatId || !user?.id) {
      toast({ title: 'Sign in required', description: 'Please sign in to keep chat questions.', variant: 'destructive' });
      return;
    }
    if (!isFirebaseConfigured()) {
      toast({ title: 'Cloud not available', description: 'Firebase is not configured.', variant: 'destructive' });
      return;
    }

    const messageIdToUpdate = activeSession?.lastQuestionsMessageId ?? null;
    if (!messageIdToUpdate) {
      toast({
        title: 'Keep in chat not available yet',
        description: 'Generate questions first, then try again.',
        variant: 'destructive',
      });
      return;
    }

    const userMsg = resolveGenerationPromptUserMessage(activeSession);
    const userMessageIdToUpdate = userMsg?.id;

    if (!userMessageIdToUpdate) {
      toast({
        title: 'Keep in chat not available yet',
        description: 'Could not locate the generation prompt message.',
        variant: 'destructive',
      });
      return;
    }

    const userPromptContent = userMsg?.content ?? '';

    // Keep selected questions only; if none selected, keep all
    const selected = generatedQuestions.filter((q) => (q as any).isSelected);
    const toSave = selected.length > 0 ? selected : generatedQuestions;
    const firstQ = toSave[0];
    const questionConfig = firstQ
      ? ({
          topic: firstQ.topic,
          questionType: firstQ.type,
          difficulty: firstQ.difficulty,
          bloomsLevel: firstQ.bloomsLevel || 'Understand',
          marks: firstQ.marks ?? 5,
        } as any)
      : undefined;

    try {
      // 1) Save generated questions onto the USER prompt message
      await firestoreChatService.addMessageWithId(activeChatId, userMessageIdToUpdate, {
        role: 'user',
        content: userPromptContent,
        materialId: selectedMaterial || undefined,
        detectedIntent: 'question_generation',
        questionConfig,
        generatedQuestions: toSave.map((q) => ({
          id: q.id,
          content: q.content,
          answer: q.answer,
          type: q.type,
          difficulty: q.difficulty,
          bloomsLevel: q.bloomsLevel || 'Understand',
          topic: q.topic,
          marks: q.marks ?? 5,
          options: q.options,
          correctOption: q.correctOption,
          // These fields are stored in Firestore; keep defaults if UI didn't set them.
          isTwisted: (q as any).isTwisted ?? false,
          wasEdited: (q as any).wasEdited ?? false,
          originalContent: (q as any).originalContent,
          originalAnswer: (q as any).originalAnswer,
          savedToMyQuestions: q.isSavedToMyQuestions ?? false,
          savedToQuestionBank: q.isSavedToBank ?? false,
        })) as any,
      } as any);

      // 2) Also keep the session-level state consistent right now (no refresh needed).
      setChatGeneratedQuestions(activeChatId, generatedQuestions as any);
      setChatLastQuestionsMessageId(activeChatId, messageIdToUpdate);
      // 3) Update the in-chat transcript so the kept questions appear immediately under the prompt.
      setChatSessions(
        chatSessions.map((s) => {
          if (s.id !== activeChatId) return s;
          return {
            ...s,
            messages: s.messages.map((msg) =>
              msg.id === userMessageIdToUpdate
                ? { ...msg, generatedQuestions: toSave as any }
                : msg
            ),
          };
        }),
        activeChatId
      );

      toast({ title: 'Kept in chat', description: 'Your generated questions are saved in this chat session.' });
    } catch (err) {
      toast({
        title: 'Keep in chat failed',
        description: err instanceof Error ? err.message : 'Could not save to chat.',
        variant: 'destructive',
      });
    }
  };

  // After regenerating a question/answer, persist the updated transcript to Firestore so it survives refresh.
  const persistTranscriptForQuestion = (chatId: string, questionId: string) => {
    if (!isFirebaseConfigured()) return;
    const session = useQuestionStore.getState().chatSessions.find((s) => s.id === chatId);
    const userMsg = session?.messages?.find(
      (m) => m.role === 'user' && m.generatedQuestions?.some((g) => g.id === questionId)
    );
    if (!userMsg?.generatedQuestions) return;
    const payload = {
      role: 'user' as const,
      content: userMsg.content,
      materialId: selectedMaterial || undefined,
      detectedIntent: 'question_generation' as const,
      questionConfig: undefined as any,
      generatedQuestions: userMsg.generatedQuestions.map((q) => ({
        id: q.id,
        content: q.content,
        answer: q.answer,
        type: q.type,
        difficulty: q.difficulty,
        bloomsLevel: (q.bloomsLevel as any) || 'Understand',
        topic: q.topic,
        marks: q.marks ?? 5,
        options: (q as any).options,
        correctOption: (q as any).correctOption,
        isTwisted: (q as any).isTwisted ?? false,
        wasEdited: (q as any).wasEdited ?? false,
        savedToMyQuestions: (q as any).isSavedToMyQuestions ?? false,
        savedToQuestionBank: (q as any).isSavedToBank ?? false,
        originalContent: (q as any).originalContent,
        originalAnswer: (q as any).originalAnswer,
      })) as any,
    };
    void firestoreChatService.addMessageWithId(chatId, userMsg.id, payload).catch(() => {});
  };

  const persistCurrentGeneratedPanel = (chatId: string, questions: AIAssistantQuestion[]) => {
    if (!isFirebaseConfigured()) return;
    const session = useQuestionStore.getState().chatSessions.find((s) => s.id === chatId);
    const msgId = session?.lastQuestionsMessageId;
    if (!msgId) return;
    const assistantMsg = session?.messages?.find((m) => m.id === msgId && m.role === 'assistant');
    if (!assistantMsg) return;

    const payload = {
      role: 'assistant' as const,
      content: assistantMsg.content,
      materialId: selectedMaterial || undefined,
      detectedIntent: 'question_generation' as const,
      generatedQuestions: questions.map((q) => ({
        id: q.id,
        content: q.content,
        answer: q.answer,
        type: q.type,
        difficulty: q.difficulty,
        bloomsLevel: (q.bloomsLevel as any) || 'Understand',
        topic: q.topic,
        marks: q.marks ?? 5,
        options: (q as any).options,
        correctOption: (q as any).correctOption,
        isTwisted: (q as any).isTwisted ?? false,
        wasEdited: (q as any).wasEdited ?? false,
        savedToMyQuestions: (q as any).isSavedToMyQuestions ?? false,
        savedToQuestionBank: (q as any).isSavedToBank ?? false,
        originalContent: (q as any).originalContent,
        originalAnswer: (q as any).originalAnswer,
      })) as any,
    };
    void firestoreChatService.addMessageWithId(chatId, msgId, payload).catch(() => {});
  };

  const persistCurrentGeneratedPanelFromStore = (chatId: string) => {
    const session = useQuestionStore.getState().chatSessions.find((s) => s.id === chatId);
    persistCurrentGeneratedPanel(chatId, (session?.generatedQuestions ?? []) as AIAssistantQuestion[]);
  };

  // Keep Firestore synced with generated-question panel edits/deletes/regenerations in near-real time.
  const panelSyncTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (!activeChatId || !isFirebaseConfigured()) return;
    const hasQuestionPanelMessage = !!activeSession?.lastQuestionsMessageId;
    if (!hasQuestionPanelMessage) return;

    if (panelSyncTimerRef.current) window.clearTimeout(panelSyncTimerRef.current);
    panelSyncTimerRef.current = window.setTimeout(() => {
      persistCurrentGeneratedPanelFromStore(activeChatId);
    }, 300);

    return () => {
      if (panelSyncTimerRef.current) window.clearTimeout(panelSyncTimerRef.current);
    };
  }, [activeChatId, activeSession?.lastQuestionsMessageId, generatedQuestions]);

  const handleClearGeneratedQuestions = () => {
    if (!activeChatId) return;
    persistCurrentGeneratedPanel(activeChatId, []);
    setChatGeneratedQuestions(activeChatId, []);
    setChatLastQuestionsMessageId(activeChatId, null);
    toast({
      title: 'Cleared',
      description: 'Generated questions were cleared for this chat.',
    });
  };

  const handleKeepSingleQuestionInChat = async (questionId: string) => {
    if (!activeChatId || !user?.id) {
      toast({ title: 'Sign in required', description: 'Please sign in to keep chat questions.', variant: 'destructive' });
      return;
    }
    if (!isFirebaseConfigured()) {
      toast({ title: 'Cloud not available', description: 'Firebase is not configured.', variant: 'destructive' });
      return;
    }
    const session = activeSession;
    if (!session?.lastQuestionsMessageId) {
      toast({
        title: 'Keep in chat not available',
        description: 'Generate questions first, then try again.',
        variant: 'destructive',
      });
      return;
    }

    const userMsg = resolveGenerationPromptUserMessage(session);
    if (!userMsg) {
      toast({
        title: 'Keep in chat failed',
        description: 'Could not locate the generation prompt message.',
        variant: 'destructive',
      });
      return;
    }

    const question = generatedQuestions.find((q) => q.id === questionId);
    if (!question) {
      toast({
        title: 'Keep in chat failed',
        description: 'Could not find this question in the editor list.',
        variant: 'destructive',
      });
      return;
    }

    // Keep only this one question in the transcript (replace so user can "select one and keep")
    const updatedKept = [question];

    // Save updated list onto the USER prompt message.
    const userPromptContent = userMsg.content;
    const currentQuestionConfig = {
      topic: question.topic,
      questionType: question.type,
      difficulty: question.difficulty,
      bloomsLevel: (question.bloomsLevel as any) || 'Understand',
      marks: question.marks ?? 5,
    } as any;

    try {
      await firestoreChatService.addMessageWithId(activeChatId, userMsg.id, {
        role: 'user',
        content: userPromptContent,
        materialId: selectedMaterial || undefined,
        detectedIntent: 'question_generation',
        questionConfig: currentQuestionConfig,
        generatedQuestions: updatedKept.map((q) => ({
          id: q.id,
          content: q.content,
          answer: q.answer,
          type: q.type,
          difficulty: q.difficulty,
          bloomsLevel: (q.bloomsLevel as any) || 'Understand',
          topic: q.topic,
          marks: q.marks ?? 5,
          options: (q as any).options,
          correctOption: (q as any).correctOption,
          isTwisted: (q as any).isTwisted ?? false,
          wasEdited: (q as any).wasEdited ?? false,
          savedToMyQuestions: (q as any).isSavedToMyQuestions ?? false,
          savedToQuestionBank: (q as any).isSavedToBank ?? false,
          originalContent: (q as any).originalContent,
          originalAnswer: (q as any).originalAnswer,
        })) as any,
      } as any);

      // Update UI instantly
      setChatSessions(
        chatSessions.map((s) => {
          if (s.id !== activeChatId) return s;
          return {
            ...s,
            messages: s.messages.map((msg) =>
              msg.id === userMsg.id ? { ...msg, generatedQuestions: updatedKept as any } : msg
            ),
          };
        }),
        activeChatId
      );

      toast({ title: 'Kept question in chat', description: 'Saved under your generation prompt.' });
    } catch (err) {
      toast({
        title: 'Keep in chat failed',
        description: err instanceof Error ? err.message : 'Could not save to chat.',
        variant: 'destructive',
      });
    }
  };

  const handleRegenerateQuestion = async (index: number) => {
    const question = generatedQuestions[index];
    if (!question) return;

    setIsLoading(true);
    try {
      const context: ConversationContext = {
        materials,
        selectedMaterialId: selectedMaterial || null,
        generatedQuestions: generatedQuestions as GeneratedQuestion[],
        conversationHistory: [],
      };

      let questions: GeneratedQuestion[] | undefined;
      if (isGeminiConfigured()) {
        const chatContext = {
          messages: (activeSession?.messages || []).map((m, i) => ({
            id: m.id || `msg_${i}`,
            role: m.role,
            content: m.content,
            timestamp: new Date().toISOString(),
          })),
          selectedMaterialId: selectedMaterial || undefined,
          selectedMaterialContent: myMaterials.find(m => m.id === selectedMaterial)?.content,
          generatedQuestions: generatedQuestions as GeneratedQuestion[],
          materialChunksContext: undefined,
        };
        const result = await getChatResponse(`regenerate question ${index + 1}`, chatContext);
        questions = result.generatedQuestions;
      } else {
        const smart = await getSmartResponse(`regenerate question ${index + 1}`, context);
        questions = smart.questions;
      }
      if (questions && activeChatId) {
        setChatGeneratedQuestions(activeChatId, questions as AIAssistantQuestion[]);
        toast({
          title: 'Question Regenerated',
          description: `Question ${index + 1} has been regenerated with new content`,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to regenerate question',
        variant: 'destructive',
      });
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  };

  const formatTime = (date: Date | unknown) => {
    const d = toDateSafe(date);
    if (!d) return '—';
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const generateFromMaterial = () => {
    if (!selectedMaterial) {
      toast({
        title: 'Select Material',
        description: 'Please select a material first',
        variant: 'destructive',
      });
      return;
    }
    
    const material = myMaterials.find(m => m.id === selectedMaterial);
    if (material) {
      setInputMessage(`Generate 5 MCQ questions from the material "${material.fileName}" covering the topics: ${material.topics.join(', ')}`);
    }
  };

  const selectedCount = generatedQuestions.filter(q => q.isSelected).length;
  const allSelected = generatedQuestions.length > 0 && generatedQuestions.every(q => q.isSelected);

  return (
    <div className="h-[calc(100dvh-12rem)] md:h-[calc(100vh-12rem)] flex gap-4 min-h-0">
      {/* Chat History Sidebar */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="flex-shrink-0"
          >
            <Card className="h-full border border-border/50 shadow-sm">
              <CardHeader className="pb-3 border-b border-border/50">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm font-semibold">Chat History</CardTitle>
                  <div className="flex items-center gap-1">
                    {chatSessions.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-destructive hover:bg-destructive/10 text-xs"
                        onClick={() => setShowClearAllConfirm(true)}
                        title="Delete all conversations"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Delete all
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setShowHistory(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-2 pt-3">
                <Button
                  onClick={handleNewChat}
                  className="w-full mb-3 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Chat
                </Button>
                <ScrollArea className="h-[calc(100%-3.5rem)]">
                  <div className="space-y-1 pr-1">
                    {chatSessions.map((session) => (
                      <motion.div
                        key={session.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`group flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-colors border ${
                          activeChatId === session.id
                            ? 'bg-primary/10 border-primary/30'
                            : 'border-transparent hover:bg-muted/70'
                        }`}
                        onClick={() => { setActiveChatId(session.id); setEditingChatId(null); }}
                      >
                        <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        {editingChatId === session.id ? (
                          <Input
                            value={editingChatTitle}
                            onChange={(e) => setEditingChatTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const t = editingChatTitle.trim() || 'Chat';
                                updateChatTitle(session.id, t);
                                if (isFirebaseConfigured() && user?.id) {
                                  void firestoreChatService.updateSession(session.id, { title: t } as any).catch(() => {});
                                }
                                setEditingChatId(null);
                              }
                              if (e.key === 'Escape') setEditingChatId(null);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="h-7 text-sm flex-1 min-w-0"
                            autoFocus
                          />
                        ) : (
                          <span className="text-sm truncate flex-1 min-w-0" title={session.title}>{session.title}</span>
                        )}
                        {editingChatId === session.id ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              const t = editingChatTitle.trim() || 'Chat';
                              updateChatTitle(session.id, t);
                              if (isFirebaseConfigured() && user?.id) {
                                void firestoreChatService.updateSession(session.id, { title: t } as any).catch(() => {});
                              }
                              setEditingChatId(null);
                            }}
                            title="Save name"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0 opacity-60 hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingChatId(session.id);
                              setEditingChatTitle(session.title);
                            }}
                            title="Rename chat"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 opacity-60 hover:opacity-100 text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(session.id);
                            setEditingChatId(null);
                          }}
                          title="Delete this chat"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col min-w-0 border border-border/50 shadow-sm">
        <CardHeader className="border-b border-border/50 py-4 px-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => setShowHistory(!showHistory)}
                title="Chat history"
              >
                <History className="w-4 h-4" />
              </Button>
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-lg font-semibold tracking-tight">AI Question Assistant</CardTitle>
                  {isGeminiConfigured() && (
                    <Badge variant="secondary" className="text-[10px] font-normal bg-primary/10 text-primary border-primary/20">
                      Powered by Gemini
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Ask about your material, generate questions, and get answers
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {activeSession && (
                <Button variant="outline" size="sm" className="text-xs" onClick={() => { setShareMessageId(null); setShowShareDialog(true); }}>
                  <Share2 className="w-3.5 h-3.5 mr-1.5" />
                  Share
                </Button>
              )}
              <Button variant="outline" size="sm" className="text-xs" onClick={handleNewChat}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                New Chat
              </Button>
            </div>
          </div>

          {/* Material Selector */}
          {(activeSession || !!selectedMaterialIdForUI) && (
            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <Select value={selectedMaterialIdForUI ? selectedMaterialIdForUI : 'none'} onValueChange={(val) => setSelectedMaterial(val === 'none' ? '' : val)}>
                <SelectTrigger className="w-64 h-9 text-sm">
                  <FileText className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Select material" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No material</SelectItem>
                  {selectedMaterialIdForUI &&
                    activeSession?.selectedMaterialTitle &&
                    !myMaterials.some((m) => m.id === selectedMaterialIdForUI) && (
                      <SelectItem value={selectedMaterialIdForUI}>
                        {activeSession.selectedMaterialTitle}
                      </SelectItem>
                    )}
                  {myMaterials.map((material) => (
                    <SelectItem key={material.id} value={material.id}>
                      {material.fileName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedMaterial && (
                <Button variant="secondary" size="sm" className="text-xs h-9" onClick={generateFromMaterial}>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Generate from Material
                </Button>
              )}
            </div>
          )}
        </CardHeader>

        {/* Messages */}
        <CardContent className="flex-1 p-4 overflow-hidden flex flex-col min-h-0">
          <ScrollArea className="flex-1 pr-4">
            {!activeSession || activeSession.messages.length === 0 ? (
              <div className="min-h-[320px] flex flex-col items-center justify-center text-center py-8">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-1.5">How can I help you today?</h3>
                <p className="text-muted-foreground text-sm max-w-sm mb-5">
                  Ask anything about your material, request question generation, or use the mic to speak. I answer from your selected document only.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {[
                    'Ask anything about my material',
                    'Explain the main concepts in my material',
                    'What topics are in my material?',
                    'Generate 5 MCQ questions from my material',
                    'Create 3 hard twisted questions',
                  ].map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="text-xs rounded-full"
                      onClick={() => setInputMessage(suggestion)}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4 pb-2">
                {activeSession.messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`group flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div className={`max-w-[85%] sm:max-w-[78%] p-3.5 rounded-2xl relative ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : 'bg-muted/80 rounded-bl-sm border border-border/50'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>

                      <div className={`flex items-center justify-between mt-2 ${
                        message.role === 'user' ? 'text-white/70' : 'text-muted-foreground'
                      }`}>
                        <span className="text-xs">{formatTime(message.timestamp)}</span>
                        <div className="flex gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                          {message.role === 'user' && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => {
                                      setEditingUserMessageId(message.id);
                                      setInputMessage(getRawUserContent(message.content));
                                    }}
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit and regenerate</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {message.role === 'assistant' && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    disabled={isLoading && regeneratingMessageId === message.id}
                                    onClick={() => handleRegenerateResponse(message.id)}
                                  >
                                    {regeneratingMessageId === message.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <RefreshCw className="w-3 h-3" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Regenerate response</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => {
                                    setShareMessageId(message.id);
                                    setShowShareDialog(true);
                                  }}
                                >
                                  <Share2 className="w-3 h-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Share message</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-destructive"
                                  onClick={() => setDeleteMessageId(message.id)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete message</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    </div>
                    {/* Saved questions: separate card below user bubble so it's never inside purple (no ghost text) */}
                    {message.role === 'user' && message.generatedQuestions && message.generatedQuestions.length > 0 && (
                      <div className="w-full mt-2">
                        <div className="rounded-xl border border-border bg-muted/90 p-3 shadow-sm">
                          <div className="text-xs font-semibold text-foreground mb-2">
                            Saved questions
                          </div>
                          <div className="space-y-3">
                            {message.generatedQuestions.map((q, idx) => (
                              <div
                                key={q.id}
                                className="rounded-md border border-border bg-background p-2.5"
                              >
                                <div className="text-xs font-semibold text-foreground mb-1">
                                  {idx + 1}. {q.content}
                                </div>
                                <div className="mt-2 rounded border border-muted bg-muted/30 p-2">
                                  <div className="text-[11px] font-semibold text-foreground/80 mb-1">
                                    Answer
                                  </div>
                                  <div className="text-[12px] text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                    {q.answer}
                                  </div>
                                </div>
                                <div className="mt-2 flex gap-2 flex-wrap">
                                  <Button
                                    size="xs"
                                    variant="outline"
                                    className="text-xs"
                                    onClick={() => {
                                      setViewKeptQuestion(q);
                                      setShowViewKeptQuestionDialog(true);
                                    }}
                                  >
                                    Open
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
                
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="bg-muted p-4 rounded-2xl rounded-bl-md">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Thinking...</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* AI Follow-up Suggestions */}
                {!isLoading && lastSuggestions.length > 0 && activeSession && activeSession.messages.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-wrap gap-2 pt-2"
                  >
                    {lastSuggestions.map((suggestion, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        className="text-xs rounded-full border-primary/30 hover:bg-primary/10 hover:border-primary/50 transition-all"
                        onClick={() => {
                          setInputMessage(suggestion);
                          setLastSuggestions([]);
                        }}
                      >
                        <Sparkles className="w-3 h-3 mr-1 text-primary" />
                        {suggestion}
                      </Button>
                    ))}
                  </motion.div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>
        </CardContent>

        {/* Generated Questions Editor */}
        {generatedQuestions.length > 0 && (
          <div className="border-t border-border/50 p-4 max-h-80 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Edit3 className="w-4 h-4" />
                Generated Questions ({generatedQuestions.length})
              </h4>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectAll}
                  className="text-xs"
                >
                  {allSelected ? <SquareCheck className="w-4 h-4 mr-1" /> : <Square className="w-4 h-4 mr-1" />}
                  {allSelected ? 'Deselect All' : 'Select All'}
                </Button>
                {selectedCount > 0 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSaveSelectedToBank}
                      className="text-xs text-primary"
                    >
                      <BookmarkPlus className="w-4 h-4 mr-1" />
                      Save Selected ({selectedCount})
                    </Button>
                    {isFirebaseConfigured() && user?.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSaveSelectedToCloud}
                        className="text-xs"
                      >
                        <CloudUpload className="w-4 h-4 mr-1" />
                        Save selected to cloud
                      </Button>
                    )}
                  </>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveAllToBank}
                  className="text-primary"
                >
                  <BookmarkPlus className="w-4 h-4 mr-1" />
                  Save All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleKeepGeneratedQuestionsInChat}
                  className="text-xs"
                  disabled={!activeSession?.lastQuestionsMessageId || !isFirebaseConfigured()}
                  title={!activeSession?.lastQuestionsMessageId ? 'Generate questions first' : 'Save current set into this chat'}
                >
                  <MessageSquare className="w-4 h-4 mr-1" />
                  Keep in chat
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearGeneratedQuestions}
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear All
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              {generatedQuestions.map((q, idx) => (
                <motion.div 
                  key={q.id} 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-3 rounded-lg border ${q.isSelected ? 'bg-primary/5 border-primary/30' : 'bg-muted/50 border-border/50'}`}
                >
                  <div className="flex items-start gap-2">
                    <Checkbox
                      checked={q.isSelected || false}
                      onCheckedChange={() => toggleSelectQuestion(q.id)}
                      className="mt-1"
                    />
                    <Badge variant="outline" className="mt-1 shrink-0">{idx + 1}</Badge>
                    {q.isEditing ? (
                      <div className="flex-1 space-y-2">
                        <Textarea
                          value={q.content}
                          onChange={(e) => handleEditQuestion(q.id, 'content', e.target.value)}
                          className="text-sm"
                          rows={2}
                        />
                        <Input
                          value={q.answer}
                          onChange={(e) => handleEditQuestion(q.id, 'answer', e.target.value)}
                          placeholder="Answer..."
                          className="text-sm"
                        />
                      </div>
                    ) : (
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{q.content}</p>
                        {q.options && (
                          <div className="mt-2 space-y-1">
                            {q.options.map((opt, i) => (
                              <p key={i} className={`text-xs ${i === q.correctOption ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}>
                                {String.fromCharCode(65 + i)}) {opt}
                              </p>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          <span className="font-medium">Answer:</span> {(q.answer || '').slice(0, 100)}{(q.answer || '').length > 100 ? '...' : ''}
                        </p>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          <Badge variant="secondary" className="text-xs">{String(q.type || 'mcq').toUpperCase()}</Badge>
                          <Badge variant="outline" className="text-xs">{q.difficulty || 'medium'}</Badge>
                          {q.isSavedToMyQuestions && (
                            <Badge variant="outline" className="text-xs text-green-600 border-green-300">Saved</Badge>
                          )}
                          {q.isSavedToCloud && (
                            <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">In cloud</Badge>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="flex gap-1 shrink-0 flex-wrap">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-7 w-7 ${q.isSavedToCloud ? 'text-blue-500' : ''}`}
                              onClick={() => handleSaveQuestionToCloud(q)}
                              disabled={!!q.isSavedToCloud || !user?.id || !isFirebaseConfigured()}
                              title={q.isSavedToCloud ? 'Saved to cloud' : 'Save to cloud'}
                            >
                              <CloudUpload className="w-3 h-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Save to cloud</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-7 w-7 ${q.isSavedToMyQuestions ? 'text-green-500' : 'text-primary hover:bg-primary/10'}`}
                              onClick={() => handleSaveToMyQuestions(q)}
                              disabled={q.isSavedToMyQuestions}
                            >
                              <Save className="w-3 h-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{q.isSavedToMyQuestions ? 'Saved' : 'Save to My Questions'}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-7 w-7 ${q.isSavedToBank ? 'text-green-500' : 'hover:bg-primary/10'}`}
                              onClick={() => handleSaveToBank(q)}
                              disabled={q.isSavedToBank}
                            >
                              <BookmarkPlus className="w-3 h-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{q.isSavedToBank ? 'In Bank' : 'Save to Bank & My Questions'}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleRegenerateQuestion(idx)}
                              disabled={isLoading}
                            >
                              <RefreshCw className="w-3 h-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Regenerate</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                setPerQuestionConfigQuestionId(q.id);
                                setPerQuestionConfigDraft({
                                  type: q.type,
                                  difficulty: q.difficulty,
                                  bloomsLevel: (q.bloomsLevel ?? 'Understand') as BloomsLevel,
                                  marks: q.marks ?? 5,
                                });
                                setShowPerQuestionConfigDialog(true);
                              }}
                              disabled={isLoading || q.isEditing}
                            >
                              <SlidersHorizontal className="w-3 h-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Configure</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => toggleEditQuestion(q.id)}
                            >
                              {q.isEditing ? <Check className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{q.isEditing ? 'Save' : 'Edit'}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-7 w-7 ${keptQuestionIdSet.has(q.id) ? 'text-violet-500' : 'hover:bg-primary/10'}`}
                              onClick={() => handleKeepSingleQuestionInChat(q.id)}
                              disabled={isLoading || keptQuestionIdSet.has(q.id)}
                              title={keptQuestionIdSet.has(q.id) ? 'Kept in chat' : 'Keep in chat'}
                            >
                              <MessageSquare className="w-3 h-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{keptQuestionIdSet.has(q.id) ? 'Kept in chat' : 'Keep in chat'}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteQuestion(q.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Quick config buttons (no typing needed) */}
        {pendingGenPrompt && !showGenConfigDialog && activeChatId && (
          <div className="px-4 py-3 border-t border-border/50 bg-muted/10">
            <div className="text-xs text-muted-foreground mb-2">
              Configure question generation, or generate directly using your text?
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="default"
                disabled={!selectedMaterial || isLoading}
                onClick={() => {
                  const parsed = parseQuestionGenConfig(pendingGenPrompt);
                  setGenConfig((p) => ({ ...p, ...parsed }));
                  setPendingGenPrompt(null);
                  setShowGenConfigDialog(true);
                }}
              >
                Configure
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!selectedMaterial || isLoading}
                onClick={() => {
                  const parsed = parseQuestionGenConfig(pendingGenPrompt);
                  setGenConfig((p) => ({ ...p, ...parsed }));
                  const sid = activeChatId;
                  setPendingGenPrompt(null);
                  void sendConfiguredGeneration(sid);
                }}
              >
                Generate now
              </Button>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t border-border/50 bg-muted/20">
          <div className="flex gap-2 items-center">
            {isVoiceSupported && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isListening ? 'default' : 'outline'}
                      size="icon"
                      className={`h-9 w-9 shrink-0 ${isListening ? 'bg-red-500 hover:bg-red-600 animate-pulse' : ''}`}
                      onClick={() => {
                        if (isListening) {
                          voiceStopAutoSendRef.current = true;
                          toggleListening();
                        } else {
                          // Start fresh for voice input to avoid mixing with typed text
                          voiceStopAutoSendRef.current = true;
                          setInputMessage('');
                          resetTranscript();
                          toggleListening();
                        }
                      }}
                    >
                      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isListening ? 'Stop listening' : 'Voice input—speak your question'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <div className="flex-1 min-w-0 relative">
              <Input
                placeholder={isListening ? 'Listening… speak now' : 'Ask about your material, request questions, or type a doubt…'}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                className={`h-9 pr-9 text-sm ${isListening ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                disabled={isLoading}
              />
              {isListening && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-0.5">
                  <span className="w-1 h-3 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-4 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-2 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowHelpDialog(true)}
                  >
                    <HelpCircle className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Help &amp; tips</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              onClick={() => void handleSendMessage()}
              disabled={!inputMessage.trim() || isLoading}
              size="icon"
              className="h-9 w-9 shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          {isListening && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              🎤 Voice input active — speak clearly, then tap the mic again to stop and send
            </p>
          )}
        </div>
      </Card>

      {/* Delete Single Chat Confirmation */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Chat</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this conversation? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && handleDeleteChat(deleteConfirmId)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Message Confirmation */}
      <Dialog open={!!deleteMessageId} onOpenChange={() => setDeleteMessageId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Message</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this message? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteMessageId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => deleteMessageId && handleDeleteMessage(deleteMessageId)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear All Chats Confirmation */}
      <Dialog open={showClearAllConfirm} onOpenChange={setShowClearAllConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear All Chats</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete all {chatSessions.length} conversations? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearAllConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClearAllChats}>
              Delete All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Help Dialog */}
      <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              Help with AI Assistant & Question Generation
            </DialogTitle>
            <DialogDescription>
              Tips to get the most out of the assistant and create better questions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 text-sm">
            <section>
              <h4 className="font-semibold text-foreground mb-2">Getting started</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Select a material from the dropdown so the assistant can answer from your content.</li>
                <li>Ask anything about the material—definitions, explanations, or doubts—and get answers based only on your document.</li>
                <li>Use the microphone to speak your request; the assistant will use your words to generate or refine questions.</li>
                <li>If you ask for question generation, the assistant will first ask: “with configuration” or “without configuration” so you control the exam settings.</li>
              </ul>
            </section>
            <section>
              <h4 className="font-semibold text-foreground mb-2">Question generation</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><strong>Start with a generation request:</strong> say something like “Generate 8 long answer questions on cloud computing”.</li>
                <li><strong>Choose configuration mode:</strong> reply “with configuration” to set Topic, Count, Type, Difficulty, Bloom’s level, and Marks in the chat dialog; reply “without configuration” to generate immediately using what you wrote.</li>
                <li><strong>Be precise about type:</strong> “MCQ”, “short answer”, “long answer”, or “descriptive”.</li>
                <li><strong>Mention difficulty:</strong> easy, medium, or hard (difficulty changes how the answers are elaborated from the material).</li>
                <li><strong>Bloom&apos;s level:</strong> Remember, Understand, Apply, Analyze, Evaluate, Create (optional—used for exam depth).</li>
                <li>After generation, edit any question/answer, then save to My Questions or the Question Bank.</li>
              </ul>
            </section>
            <section>
              <h4 className="font-semibold text-foreground mb-2">Using the assistant</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Ask follow-ups: &quot;Make question 2 harder&quot;, &quot;Explain that concept again&quot;, or &quot;Generate 3 more on the same topic.&quot;</li>
                <li>Request analysis: &quot;What topics are in my material?&quot; or &quot;Suggest question types for this document.&quot;</li>
                <li>Clarify doubts: Ask &quot;What does X mean here?&quot; or &quot;Where in the material is Y explained?&quot;—answers are based only on your selected material.</li>
              </ul>
            </section>
            <section>
              <h4 className="font-semibold text-foreground mb-2">Voice input (microphone)</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Click the microphone icon and allow browser access when prompted.</li>
                <li>Speak clearly; your words appear in the input box. Click again to stop; the assistant will auto-send. If it was a mistake, use Undo from the toast.</li>
                <li>Works best in Chrome, Edge, or Safari with a stable connection. If nothing appears, check that the mic is allowed and try again.</li>
              </ul>
            </section>
            <section>
              <h4 className="font-semibold text-foreground mb-2">Chat history</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Open the history panel with the History icon to see all conversations.</li>
                <li>Click a chat to select and continue it. Use the trash icon on a chat to delete that conversation only.</li>
                <li>Use &quot;Delete all&quot; (trash in the history header) to clear every chat at once.</li>
              </ul>
            </section>
          </div>
          <DialogFooter>
            <Button onClick={() => { setShowHelpDialog(false); setInputMessage('Help me with question generation'); }}>
              Try in chat
            </Button>
            <Button onClick={() => setShowHelpDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={(open) => {
        setShowShareDialog(open);
        if (!open) setShareMessageId(null);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share {shareMessageId ? 'Message' : 'Conversation'}</DialogTitle>
            <DialogDescription>
              {shareMessageId
                ? 'Share this message via social media or copy to clipboard.'
                : 'Share the full conversation: Copy puts the entire chat on your clipboard. Social sharing uses a short preview.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-4 py-4">
            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-4"
              onClick={() => handleShareMessage('copy')}
            >
              <Copy className="w-5 h-5" />
              <span className="text-xs">Copy</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-4"
              onClick={() => handleShareMessage('copy_link')}
            >
              <Share2 className="w-5 h-5" />
              <span className="text-xs">Copy Share Link</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-4"
              onClick={() => handleShareMessage('download_txt')}
            >
              <Download className="w-5 h-5" />
              <span className="text-xs">TXT</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-4"
              onClick={() => handleShareMessage('download_html')}
            >
              <Download className="w-5 h-5" />
              <span className="text-xs">HTML</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-4"
              onClick={() => handleShareMessage('facebook')}
            >
              <Facebook className="w-5 h-5 text-blue-600" />
              <span className="text-xs">Facebook</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-4"
              onClick={() => handleShareMessage('twitter')}
            >
              <Twitter className="w-5 h-5 text-sky-500" />
              <span className="text-xs">Twitter</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-4"
              onClick={() => handleShareMessage('linkedin')}
            >
              <Linkedin className="w-5 h-5 text-blue-700" />
              <span className="text-xs">LinkedIn</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-4"
              onClick={() => handleShareMessage('mail')}
            >
              <Mail className="w-5 h-5 text-gray-700" />
              <span className="text-xs">Mail</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-4"
              onClick={() => handleShareMessage('whatsapp')}
            >
              <MessageCircle className="w-5 h-5 text-green-600" />
              <span className="text-xs">WhatsApp</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Answer Regeneration Confirmation */}
      <Dialog open={!!showAnswerRegenConfirm} onOpenChange={() => {
        if (showAnswerRegenConfirm) {
          setPendingQuestionEdits(prev => {
            const next = new Map(prev);
            next.delete(showAnswerRegenConfirm);
            return next;
          });
        }
        setShowAnswerRegenConfirm(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate Answer?</DialogTitle>
            <DialogDescription>
              You've modified the question content. Would you like the answer to be dynamically regenerated to match the updated question? This will replace the current answer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setPendingQuestionEdits(prev => {
                const next = new Map(prev);
                if (showAnswerRegenConfirm) next.delete(showAnswerRegenConfirm);
                return next;
              });
              setShowAnswerRegenConfirm(null);
            }}>
              Keep Current Answer
            </Button>
            <Button onClick={async () => {
              if (showAnswerRegenConfirm) {
                await regenerateAnswerForQuestion(showAnswerRegenConfirm);
              }
              setShowAnswerRegenConfirm(null);
            }} className="bg-gradient-to-r from-primary to-accent text-primary-foreground" disabled={!!regeneratingAnswerId}>
              {regeneratingAnswerId ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Regenerating…
                </>
              ) : (
                'Regenerate Answer'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Per-question configuration */}
      <Dialog open={showPerQuestionConfigDialog} onOpenChange={(open) => {
        setShowPerQuestionConfigDialog(open);
        if (!open) setPerQuestionConfigQuestionId(null);
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Configure question</DialogTitle>
            <DialogDescription>
              Update type, difficulty, Bloom's level, and marks for this question. Then regenerate this question and its answer using the configuration.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select value={perQuestionConfigDraft.type} onValueChange={(v: any) => setPerQuestionConfigDraft((p) => ({ ...p, type: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mcq">MCQ</SelectItem>
                  <SelectItem value="short">Short</SelectItem>
                  <SelectItem value="long">Long</SelectItem>
                  <SelectItem value="descriptive">Descriptive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Difficulty</label>
              <Select value={perQuestionConfigDraft.difficulty} onValueChange={(v: any) => setPerQuestionConfigDraft((p) => ({ ...p, difficulty: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Bloom's level</label>
              <Select value={perQuestionConfigDraft.bloomsLevel} onValueChange={(v: any) => setPerQuestionConfigDraft((p) => ({ ...p, bloomsLevel: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Remember">Remember</SelectItem>
                  <SelectItem value="Understand">Understand</SelectItem>
                  <SelectItem value="Apply">Apply</SelectItem>
                  <SelectItem value="Analyze">Analyze</SelectItem>
                  <SelectItem value="Evaluate">Evaluate</SelectItem>
                  <SelectItem value="Create">Create</SelectItem>
                  <SelectItem value="Mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Marks</label>
              <Input
                type="number"
                min={1}
                max={50}
                value={perQuestionConfigDraft.marks}
                onChange={(e) => setPerQuestionConfigDraft((p) => ({ ...p, marks: Math.min(50, Math.max(1, Number(e.target.value || 1))) }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPerQuestionConfigDialog(false);
                setPerQuestionConfigQuestionId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={!activeChatId || isLoading || !perQuestionConfigQuestionId}
              onClick={async () => {
                if (!activeChatId || !perQuestionConfigQuestionId) return;
                const qid = perQuestionConfigQuestionId;

                await regenerateQuestionAndAnswerForQuestionWithConfig(qid, {
                  type: perQuestionConfigDraft.type,
                  difficulty: perQuestionConfigDraft.difficulty,
                  bloomsLevel: perQuestionConfigDraft.bloomsLevel,
                  marks: perQuestionConfigDraft.marks,
                });

                setShowPerQuestionConfigDialog(false);
                setPerQuestionConfigQuestionId(null);
              }}
            >
              Save & regenerate question + answer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View kept question full */}
      <Dialog open={showViewKeptQuestionDialog} onOpenChange={(open) => {
        setShowViewKeptQuestionDialog(open);
        if (!open) setViewKeptQuestion(null);
      }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Saved question</DialogTitle>
            <DialogDescription>
              Full question and answer as generated (material-grounded).
            </DialogDescription>
          </DialogHeader>
          {viewKeptQuestion ? (
            <div className="space-y-4">
              <div className="rounded border border-border/50 bg-muted/10 p-3">
                <div className="text-xs font-semibold text-foreground/70 mb-2">Question</div>
                <div className="text-sm whitespace-pre-wrap leading-relaxed">{viewKeptQuestion.content}</div>
              </div>
              <div className="rounded border border-border/50 bg-muted/10 p-3">
                <div className="text-xs font-semibold text-foreground/70 mb-2">Answer</div>
                <div className="text-sm whitespace-pre-wrap leading-relaxed">{viewKeptQuestion.answer}</div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowViewKeptQuestionDialog(false); setViewKeptQuestion(null); }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Chat Question Configuration (in-chat wizard) */}
      <Dialog open={showGenConfigDialog} onOpenChange={(open) => setShowGenConfigDialog(open)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Question configuration</DialogTitle>
            <DialogDescription>
              Set what you want to generate. This will generate questions only from the selected material.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Topic</label>
              <Input value={genConfig.topic} onChange={(e) => setGenConfig((p) => ({ ...p, topic: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Number of questions</label>
              <Input
                type="number"
                min={1}
                max={50}
                value={genConfig.count}
                onChange={(e) => setGenConfig((p) => ({ ...p, count: Math.min(50, Math.max(1, Number(e.target.value || 1))) }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select value={genConfig.type} onValueChange={(v: any) => setGenConfig((p) => ({ ...p, type: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mcq">MCQ</SelectItem>
                  <SelectItem value="short">Short</SelectItem>
                  <SelectItem value="long">Long</SelectItem>
                  <SelectItem value="descriptive">Descriptive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Difficulty</label>
              <Select value={genConfig.difficulty} onValueChange={(v: any) => setGenConfig((p) => ({ ...p, difficulty: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Bloom's level</label>
              <Select value={genConfig.bloomsLevel} onValueChange={(v: any) => setGenConfig((p) => ({ ...p, bloomsLevel: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Remember">Remember</SelectItem>
                  <SelectItem value="Understand">Understand</SelectItem>
                  <SelectItem value="Apply">Apply</SelectItem>
                  <SelectItem value="Analyze">Analyze</SelectItem>
                  <SelectItem value="Evaluate">Evaluate</SelectItem>
                  <SelectItem value="Create">Create</SelectItem>
                  <SelectItem value="Mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Marks / question</label>
              <Input
                type="number"
                min={1}
                max={50}
                value={genConfig.marks}
                onChange={(e) => setGenConfig((p) => ({ ...p, marks: Math.min(50, Math.max(1, Number(e.target.value || 1))) }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowGenConfigDialog(false); setPendingGenPrompt(null); }}>
              Cancel
            </Button>
            <Button
              disabled={!activeChatId || isLoading}
              onClick={async () => {
                if (!activeChatId) return;
                setShowGenConfigDialog(false);
                await sendConfiguredGeneration(activeChatId);
              }}
            >
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AIAssistant;
