/**
 * AI Security & Validation Service
 * ==================================
 * Enforces access control, material-based context validation,
 * audit logging, and API key security for all AI interactions.
 */

import { User } from '@/types';
import { UploadedMaterial } from '@/stores/questionStore';

// ─── Types ───────────────────────────────────────────────────

export interface AIAuditLogEntry {
  id: string;
  timestamp: Date;
  staffId: string;
  staffEmail: string;
  staffRole: string;
  action: AIAuditAction;
  materialId?: string;
  materialName?: string;
  prompt: string;
  promptLength: number;
  responseLength?: number;
  questionsGenerated?: number;
  isTwisted?: boolean;
  sessionId?: string;
  status: 'success' | 'blocked' | 'error';
  blockReason?: string;
  metadata?: Record<string, unknown>;
}

export type AIAuditAction =
  | 'chat_message'
  | 'question_generation'
  | 'twisted_generation'
  | 'material_analysis'
  | 'question_modification'
  | 'question_regeneration'
  | 'answer_regeneration'
  | 'question_save'
  | 'access_denied';

export interface AISecurityConfig {
  maxPromptLength: number;
  maxQuestionsPerRequest: number;
  maxRequestsPerMinute: number;
  allowedRoles: string[];
  requireMaterialForGeneration: boolean;
  enableAuditLogging: boolean;
  enableRateLimiting: boolean;
  enableInputSanitization: boolean;
}

export interface SecurityValidationResult {
  allowed: boolean;
  reason?: string;
  sanitizedPrompt?: string;
}

// ─── Default Config ──────────────────────────────────────────

const DEFAULT_CONFIG: AISecurityConfig = {
  maxPromptLength: 5000,
  maxQuestionsPerRequest: 20,
  maxRequestsPerMinute: 30,
  allowedRoles: ['staff', 'hod', 'admin'],
  requireMaterialForGeneration: false, // true when strict material-only mode needed
  enableAuditLogging: true,
  enableRateLimiting: true,
  enableInputSanitization: true,
};

// ─── Audit Log Storage ──────────────────────────────────────

const AUDIT_LOG_KEY = 'qgenesis-ai-audit-log';
const MAX_AUDIT_ENTRIES = 1000;

function getAuditLog(): AIAuditLogEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAuditLog(entries: AIAuditLogEntry[]) {
  // Keep only the most recent entries
  const trimmed = entries.slice(-MAX_AUDIT_ENTRIES);
  localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(trimmed));
}

// ─── Rate Limiting ──────────────────────────────────────────

const rateLimitMap = new Map<string, number[]>();

function checkRateLimit(userId: string, config: AISecurityConfig): boolean {
  if (!config.enableRateLimiting) return true;

  const now = Date.now();
  const windowMs = 60_000;
  const timestamps = (rateLimitMap.get(userId) || []).filter(t => now - t < windowMs);

  if (timestamps.length >= config.maxRequestsPerMinute) {
    return false;
  }

  timestamps.push(now);
  rateLimitMap.set(userId, timestamps);
  return true;
}

// ─── Input Sanitization ─────────────────────────────────────

function sanitizePrompt(prompt: string, config: AISecurityConfig): string {
  if (!config.enableInputSanitization) return prompt;

  let sanitized = prompt;

  // Remove potential injection patterns (prompt injection defense)
  sanitized = sanitized.replace(/\b(ignore previous|disregard above|forget instructions|system prompt|you are now)\b/gi, '[filtered]');

  // Remove HTML/script tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // Truncate to max length
  if (sanitized.length > config.maxPromptLength) {
    sanitized = sanitized.slice(0, config.maxPromptLength);
  }

  return sanitized.trim();
}

// ─── Material Context Validation ─────────────────────────────

function validateMaterialContext(
  materialId: string | null,
  materials: UploadedMaterial[],
  user: User
): { valid: boolean; reason?: string } {
  if (!materialId) {
    return { valid: true }; // No material selected is ok for general chat
  }

  const material = materials.find(m => m.id === materialId);

  if (!material) {
    return { valid: false, reason: 'Selected material not found. It may have been deleted.' };
  }

  // Staff can only access materials uploaded within their session
  // (UploadedMaterial uses uploadedAt, not uploadedBy — no cross-user material sharing in local mode)
  // When Firebase is connected, add ownership/department checks here

  // Validate material has content
  if (!material.content || material.content.trim().length === 0) {
    return { valid: false, reason: 'Selected material has no extractable content. Please re-upload or select a different material.' };
  }

  return { valid: true };
}

// ─── Core Security Service ──────────────────────────────────

export class AISecurityService {
  private config: AISecurityConfig;

  constructor(config?: Partial<AISecurityConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Validate whether a user is authorized to use the AI assistant
   */
  validateAccess(user: User | null): SecurityValidationResult {
    if (!user) {
      return { allowed: false, reason: 'Authentication required. Please log in to use the AI Assistant.' };
    }

    if (!this.config.allowedRoles.includes(user.role)) {
      return { allowed: false, reason: `Your role (${user.role}) does not have access to the AI Assistant.` };
    }

    if (user.status === 'blocked') {
      return { allowed: false, reason: 'Your account has been blocked. Contact your administrator.' };
    }

    // Staff must have profile completed (department, institution, place)
    if (user.role === 'staff' && (!user.department || !user.institution)) {
      return { allowed: false, reason: 'Please complete your profile (department & institution) before using the AI Assistant.' };
    }

    return { allowed: true };
  }

  /**
   * Validate and sanitize an AI prompt before processing
   */
  validatePrompt(
    prompt: string,
    user: User,
    materialId: string | null,
    materials: UploadedMaterial[]
  ): SecurityValidationResult {
    // Check rate limit
    if (!checkRateLimit(user.id, this.config)) {
      return { allowed: false, reason: 'Rate limit exceeded. Please wait a moment before sending another message.' };
    }

    // Sanitize input
    const sanitizedPrompt = sanitizePrompt(prompt, this.config);

    if (!sanitizedPrompt || sanitizedPrompt.length === 0) {
      return { allowed: false, reason: 'Message cannot be empty.' };
    }

    // Validate material context
    const materialValidation = validateMaterialContext(materialId, materials, user);
    if (!materialValidation.valid) {
      return { allowed: false, reason: materialValidation.reason };
    }

    return { allowed: true, sanitizedPrompt };
  }

  /**
   * Log an AI interaction for auditing
   */
  logInteraction(entry: Omit<AIAuditLogEntry, 'id' | 'timestamp'>): void {
    if (!this.config.enableAuditLogging) return;

    const logEntry: AIAuditLogEntry = {
      ...entry,
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date(),
    };

    const log = getAuditLog();
    log.push(logEntry);
    saveAuditLog(log);
  }

  /**
   * Get audit log entries (for admin viewing)
   */
  getAuditLog(filters?: {
    staffId?: string;
    action?: AIAuditAction;
    status?: 'success' | 'blocked' | 'error';
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
  }): AIAuditLogEntry[] {
    let entries = getAuditLog();

    if (filters) {
      if (filters.staffId) entries = entries.filter(e => e.staffId === filters.staffId);
      if (filters.action) entries = entries.filter(e => e.action === filters.action);
      if (filters.status) entries = entries.filter(e => e.status === filters.status);
      if (filters.fromDate) entries = entries.filter(e => new Date(e.timestamp) >= filters.fromDate!);
      if (filters.toDate) entries = entries.filter(e => new Date(e.timestamp) <= filters.toDate!);
    }

    // Most recent first
    entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (filters?.limit) entries = entries.slice(0, filters.limit);

    return entries;
  }

  /**
   * Clear audit log (admin only)
   */
  clearAuditLog(): void {
    localStorage.removeItem(AUDIT_LOG_KEY);
  }

  /**
   * Get security stats for admin dashboard
   */
  getSecurityStats(): {
    totalRequests: number;
    blockedRequests: number;
    questionsGenerated: number;
    uniqueStaff: number;
    topActions: { action: string; count: number }[];
  } {
    const entries = getAuditLog();
    const actionCounts = new Map<string, number>();
    const staffSet = new Set<string>();
    let blocked = 0;
    let questions = 0;

    for (const entry of entries) {
      staffSet.add(entry.staffId);
      if (entry.status === 'blocked') blocked++;
      if (entry.questionsGenerated) questions += entry.questionsGenerated;
      actionCounts.set(entry.action, (actionCounts.get(entry.action) || 0) + 1);
    }

    const topActions = Array.from(actionCounts.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalRequests: entries.length,
      blockedRequests: blocked,
      questionsGenerated: questions,
      uniqueStaff: staffSet.size,
      topActions,
    };
  }

  /**
   * Validate OpenAI API key configuration (no exposure check)
   */
  validateAPIKeyConfig(): { secure: boolean; warnings: string[] } {
    const warnings: string[] = [];

    // Check if API key is accidentally exposed in client code
    if (typeof window !== 'undefined') {
      const dangerousKeys = ['OPENAI_API_KEY', 'sk-'];
      for (const key of dangerousKeys) {
        if (document.documentElement.innerHTML.includes(key)) {
          warnings.push(`Potential API key exposure detected (${key}). Ensure keys are only used server-side.`);
        }
      }
    }

    return {
      secure: warnings.length === 0,
      warnings,
    };
  }
}

// ─── Singleton Instance ─────────────────────────────────────

export const aiSecurity = new AISecurityService();
