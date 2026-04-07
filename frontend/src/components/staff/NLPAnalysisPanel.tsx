import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  ChevronDown, 
  ChevronRight, 
  FileText, 
  Tag, 
  BookOpen,
  Beaker,
  GraduationCap,
  CheckSquare,
  Square,
  Info
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { NLPChunk, NLPTopic } from '@/stores/questionStore';

interface NLPAnalysisPanelProps {
  chunks: NLPChunk[];
  topics: NLPTopic[];
  keywords: string[];
  academicLevel?: string;
  selectedChunkIds: number[];
  selectedTopicNames: string[];
  onChunkToggle: (chunkId: number) => void;
  onTopicToggle: (topicName: string) => void;
  onSelectAllChunks: () => void;
  onDeselectAllChunks: () => void;
}

const difficultyColors: Record<string, string> = {
  easy: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  hard: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
};

const NLPAnalysisPanel: React.FC<NLPAnalysisPanelProps> = ({
  chunks,
  topics,
  keywords,
  academicLevel,
  selectedChunkIds,
  selectedTopicNames,
  onChunkToggle,
  onTopicToggle,
  onSelectAllChunks,
  onDeselectAllChunks,
}) => {
  const [showTopics, setShowTopics] = useState(true);
  const [showChunks, setShowChunks] = useState(true);
  const [expandedChunks, setExpandedChunks] = useState<Set<number>>(new Set());

  const toggleChunkExpand = (id: number) => {
    setExpandedChunks(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allSelected = chunks.length > 0 && selectedChunkIds.length === chunks.length;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">NLP Analysis</span>
        </div>
        {academicLevel && (
          <Badge variant="outline" className="text-xs gap-1">
            <GraduationCap className="w-3 h-3" />
            {academicLevel}
          </Badge>
        )}
      </div>

      {/* Global Keywords */}
      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {keywords.slice(0, 12).map(kw => (
            <Badge key={kw} variant="secondary" className="text-[10px] px-1.5 py-0">
              {kw}
            </Badge>
          ))}
          {keywords.length > 12 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              +{keywords.length - 12}
            </Badge>
          )}
        </div>
      )}

      {/* Topics Section */}
      <div className="border border-border/50 rounded-lg overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors"
          onClick={() => setShowTopics(!showTopics)}
        >
          <div className="flex items-center gap-2">
            <Tag className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium">Topics ({topics.length})</span>
          </div>
          {showTopics ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
        <AnimatePresence>
          {showTopics && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <ScrollArea className="max-h-40 p-2 space-y-1">
                {topics.map(topic => (
                  <div
                    key={topic.name}
                    className="flex items-start gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer"
                    onClick={() => onTopicToggle(topic.name)}
                  >
                    <Checkbox
                      checked={selectedTopicNames.includes(topic.name)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium truncate">{topic.name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {Math.round(topic.relevance * 100)}%
                        </span>
                      </div>
                      {topic.subtopics.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {topic.subtopics.slice(0, 3).map(st => (
                            <span key={st} className="text-[10px] text-muted-foreground">• {st}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Chunks Section */}
      <div className="border border-border/50 rounded-lg overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors"
          onClick={() => setShowChunks(!showChunks)}
        >
          <div className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium">Content Chunks ({chunks.length})</span>
          </div>
          <div className="flex items-center gap-2">
            {chunks.length > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {selectedChunkIds.length}/{chunks.length} selected
              </span>
            )}
            {showChunks ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </div>
        </button>
        <AnimatePresence>
          {showChunks && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="px-2 pt-1 pb-0.5 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[10px] h-6 px-2"
                  onClick={allSelected ? onDeselectAllChunks : onSelectAllChunks}
                >
                  {allSelected ? (
                    <><Square className="w-3 h-3 mr-1" /> Deselect All</>
                  ) : (
                    <><CheckSquare className="w-3 h-3 mr-1" /> Select All</>
                  )}
                </Button>
              </div>
              <ScrollArea className="max-h-60 p-2 space-y-1">
                {chunks.map(chunk => {
                  const isExpanded = expandedChunks.has(chunk.chunkId);
                  const meta = chunk.metadata;
                  return (
                    <div key={chunk.chunkId} className="border border-border/30 rounded-md mb-1.5 overflow-hidden">
                      <div
                        className="flex items-start gap-2 p-2 hover:bg-muted/30 cursor-pointer"
                        onClick={() => onChunkToggle(chunk.chunkId)}
                      >
                        <Checkbox
                          checked={selectedChunkIds.includes(chunk.chunkId)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-medium truncate">
                              {chunk.title || `Chunk ${chunk.chunkId + 1}`}
                            </span>
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                              {chunk.chunkType}
                            </Badge>
                            <Badge className={`text-[10px] px-1 py-0 border ${difficultyColors[meta.estimatedDifficulty]}`}>
                              {meta.estimatedDifficulty}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                            <span>{meta.wordCount} words</span>
                            <span>{meta.sentenceCount} sentences</span>
                            {meta.hasDefinitions && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger><BookOpen className="w-3 h-3 text-blue-400" /></TooltipTrigger>
                                  <TooltipContent><p className="text-xs">Contains definitions</p></TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {meta.hasFormulas && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger><Beaker className="w-3 h-3 text-purple-400" /></TooltipTrigger>
                                  <TooltipContent><p className="text-xs">Contains formulas</p></TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {meta.hasExamples && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger><Info className="w-3 h-3 text-green-400" /></TooltipTrigger>
                                  <TooltipContent><p className="text-xs">Contains examples</p></TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 shrink-0"
                          onClick={(e) => { e.stopPropagation(); toggleChunkExpand(chunk.chunkId); }}
                        >
                          {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        </Button>
                      </div>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: 'auto' }}
                            exit={{ height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-3 pb-2 pt-0 text-[11px] text-muted-foreground border-t border-border/20">
                              <p className="line-clamp-4 mt-1.5">{chunk.text.slice(0, 300)}…</p>
                              {meta.keywords.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {meta.keywords.slice(0, 6).map(kw => (
                                    <Badge key={kw} variant="secondary" className="text-[9px] px-1 py-0">{kw}</Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default NLPAnalysisPanel;
