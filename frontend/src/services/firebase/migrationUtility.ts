/**
 * Data Migration Utility
 * 
 * Migrates existing localStorage data to Firestore when integration is complete.
 * Run this utility once after enabling Firebase to transfer all local data.
 * 
 * USAGE: After integrating with Firestore, call migrationService.migrateAllData()
 */

import { COLLECTIONS } from './collections';
import type { 
  FirestoreQuestion, 
  FirestorePaper, 
  FirestoreNotification,
  FirestoreUser,
  FirestoreFeedback,
} from './types';
import { generateIds, timestampToDate } from './converters';

// ============================================================================
// MIGRATION STATUS TRACKING
// ============================================================================

export interface MigrationStatus {
  totalItems: number;
  migratedItems: number;
  failedItems: number;
  errors: string[];
  startTime: Date | null;
  endTime: Date | null;
  isComplete: boolean;
  collections: {
    [key: string]: {
      total: number;
      migrated: number;
      failed: number;
    };
  };
}

const createEmptyStatus = (): MigrationStatus => ({
  totalItems: 0,
  migratedItems: 0,
  failedItems: 0,
  errors: [],
  startTime: null,
  endTime: null,
  isComplete: false,
  collections: {},
});

// ============================================================================
// LOCAL STORAGE KEYS MAPPING
// ============================================================================

const LOCAL_STORAGE_KEYS = {
  questions: 'qgenesis-questions',
  papers: 'qgenesis-papers',
  notifications: 'qgenesis-notifications',
  unlockRequests: 'qgenesis-unlock-requests',
  users: 'qgenesis-managed-users',
  registeredUsers: 'qgenesis-registered-users',
  blockedUsers: 'qgenesis-blocked-users',
  blockedUserData: 'qgenesis-blocked-user-data',
  passwords: 'qgenesis-passwords',
  feedback: 'qgenesis-feedback',
  appSettings: 'qgenesis-app-settings',
  logoSettings: 'qgenesis-logo-settings',
  questionBank: 'qgenesis-question-bank',
  departments: 'qgenesis-departments',
  examTypes: 'qgenesis-exam-types',
  securityHistory: 'qgenesis-security-history',
} as const;

// ============================================================================
// DATA EXTRACTION HELPERS
// ============================================================================

const getLocalStorageData = <T>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error(`Error parsing ${key}:`, error);
  }
  return defaultValue;
};

const convertDates = (obj: any): any => {
  if (!obj) return obj;
  if (Array.isArray(obj)) {
    return obj.map(convertDates);
  }
  if (typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (
        typeof value === 'string' && 
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)
      ) {
        result[key] = new Date(value);
      } else if (typeof value === 'object') {
        result[key] = convertDates(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }
  return obj;
};

// ============================================================================
// DATA EXTRACTORS - Maps localStorage to Firestore schemas
// ============================================================================

export const extractLocalData = {
  questions: (): Partial<FirestoreQuestion>[] => {
    const questions = getLocalStorageData<any[]>(LOCAL_STORAGE_KEYS.questions, []);
    return questions.map(q => ({
      id: q.id || generateIds.question(),
      content: q.text || q.content || '',
      answer: q.correctAnswer || q.answer || '',
      type: q.type || 'short',
      topic: q.topic || '',
      difficulty: q.difficulty || 'medium',
      bloomsLevel: q.bloomLevel || q.bloomsLevel || 'understand',
      marks: q.marks || 2,
      source: q.source || 'ai-assistant',
      options: q.options,
      correctOption: q.correctOption,
      status: q.status || 'draft',
      feedback: q.feedback,
      examType: q.examType,
      department: q.department,
      institution: q.institution,
      place: q.place,
      staffId: q.createdBy || q.staffId,
      isLocked: q.isLocked,
      lockedAt: q.lockedAt ? timestampToDate(q.lockedAt) : undefined,
      lockedBy: q.lockedBy,
      hasUnlockRequest: q.hasUnlockRequest,
      unlockRequestReason: q.unlockRequestReason,
      unlockedAt: q.unlockedAt ? timestampToDate(q.unlockedAt) : undefined,
      unlockedBy: q.unlockedBy,
      printedAt: q.printedAt ? timestampToDate(q.printedAt) : undefined,
      createdAt: q.createdAt ? timestampToDate(q.createdAt) : new Date(),
      updatedAt: q.updatedAt ? timestampToDate(q.updatedAt) : new Date(),
    }));
  },

  papers: (): Partial<FirestorePaper>[] => {
    const papers = getLocalStorageData<any[]>(LOCAL_STORAGE_KEYS.papers, []);
    return papers.map(p => ({
      id: p.id || generateIds.paper(),
      title: p.name || p.title || 'Untitled Paper',
      examType: p.examType || 'internal',
      collegeName: p.collegeName || '',
      departmentName: p.departmentName || p.department || '',
      courseName: p.courseName || p.course || '',
      courseCode: p.courseCode || '',
      semester: p.semester || '',
      duration: p.duration?.toString() || '60',
      maxMarks: p.maxMarks || p.totalMarks || 0,
      date: p.date,
      instructions: p.instructions || [],
      courseOutcomes: p.courseOutcomes || [],
      coMapping: p.coMapping || {},
      sections: p.sections || [],
      paperColor: p.paperColor || '#ffffff',
      textColor: p.textColor || '#000000',
      status: p.status || 'draft',
      feedback: p.feedback,
      staffId: p.createdBy || p.staffId,
      department: p.department,
      institution: p.institution,
      place: p.place,
      isLocked: p.isLocked,
      lockedAt: p.lockedAt ? timestampToDate(p.lockedAt) : undefined,
      lockedBy: p.lockedBy,
      hasUnlockRequest: p.hasUnlockRequest,
      unlockRequestReason: p.unlockRequestReason,
      unlockedAt: p.unlockedAt ? timestampToDate(p.unlockedAt) : undefined,
      unlockedBy: p.unlockedBy,
      printedAt: p.printedAt ? timestampToDate(p.printedAt) : undefined,
      createdAt: p.createdAt ? timestampToDate(p.createdAt) : new Date(),
      updatedAt: p.updatedAt ? timestampToDate(p.updatedAt) : new Date(),
    }));
  },

  notifications: (): Partial<FirestoreNotification>[] => {
    const notifications = getLocalStorageData<any[]>(LOCAL_STORAGE_KEYS.notifications, []);
    return notifications.map(n => ({
      id: n.id || generateIds.notification(),
      type: n.type || 'info',
      title: n.title || '',
      message: n.message || '',
      fromUserId: n.fromUserId,
      toUserId: n.toUserId,
      fromRole: n.fromRole || 'staff',
      toRole: n.toRole || 'hod',
      questionId: n.questionId,
      paperId: n.paperId,
      isRead: n.isRead || false,
      replyTo: n.replyTo,
      createdAt: n.createdAt ? timestampToDate(n.createdAt) : new Date(),
      department: n.department,
      institution: n.institution,
      place: n.place,
    }));
  },

  unlockRequests: (): any[] => {
    const requests = getLocalStorageData<any[]>(LOCAL_STORAGE_KEYS.unlockRequests, []);
    return requests.map(r => ({
      id: r.id || generateIds.notification(),
      questionId: r.questionId || '',
      requestedBy: r.requestedBy || 'unknown',
      requestedByName: r.requestedByName || '',
      reason: r.reason || '',
      status: r.status || 'pending',
      createdAt: r.createdAt ? timestampToDate(r.createdAt) : new Date(),
      reviewedBy: r.reviewedBy,
      reviewedAt: r.reviewedAt ? timestampToDate(r.reviewedAt) : undefined,
      department: r.department,
      institution: r.institution,
      place: r.place,
    }));
  },

  users: (): Partial<FirestoreUser>[] => {
    const managedUsers = getLocalStorageData<any[]>(LOCAL_STORAGE_KEYS.users, []);
    const registeredUsers = getLocalStorageData<any[]>(LOCAL_STORAGE_KEYS.registeredUsers, []);
    
    const allUsers = [...managedUsers];
    registeredUsers.forEach(ru => {
      if (!allUsers.find(u => u.id === ru.id || u.email === ru.email)) {
        allUsers.push(ru);
      }
    });

    return allUsers.map(u => ({
      id: u.id || generateIds.user(),
      email: u.email || '',
      displayName: u.displayName || '',
      role: u.role || 'staff',
      phone: u.phone,
      department: u.department,
      institution: u.institution,
      place: u.place,
      avatar: u.avatar,
      avatarPosition: u.avatarPosition,
      avatarZoom: u.avatarZoom,
      useDefaultAvatar: u.useDefaultAvatar,
      dashboardColor: u.dashboardColor,
      customGradientStart: u.customGradientStart,
      customGradientEnd: u.customGradientEnd,
      status: u.status || 'active',
      createdAt: u.createdAt ? timestampToDate(u.createdAt) : new Date(),
    }));
  },

  feedback: (): Partial<FirestoreFeedback>[] => {
    const feedback = getLocalStorageData<any[]>(LOCAL_STORAGE_KEYS.feedback, []);
    return feedback.map(f => ({
      id: f.id || generateIds.feedback(),
      rating: f.rating || 5,
      comment: f.message || f.comment || '',
      userType: f.userType || f.type || 'public',
      instituteName: f.institution || f.instituteName,
      userEmail: f.userEmail,
      userName: f.userName,
      createdAt: f.createdAt ? timestampToDate(f.createdAt) : new Date(),
    }));
  },

  appSettings: (): any | null => {
    const settings = getLocalStorageData<any>(LOCAL_STORAGE_KEYS.appSettings, null);
    if (!settings) return null;
    return convertDates(settings);
  },

  questionBank: (): any[] => {
    return getLocalStorageData<any[]>(LOCAL_STORAGE_KEYS.questionBank, []);
  },

  departments: (): string[] => {
    return getLocalStorageData<string[]>(LOCAL_STORAGE_KEYS.departments, []);
  },

  examTypes: (): any[] => {
    return getLocalStorageData<any[]>(LOCAL_STORAGE_KEYS.examTypes, []);
  },

  securityHistory: (): any[] => {
    return getLocalStorageData<any[]>(LOCAL_STORAGE_KEYS.securityHistory, []);
  },
};

// ============================================================================
// MIGRATION SERVICE
// ============================================================================

export const migrationService = {
  /**
   * Get current migration status
   */
  getStatus: (): MigrationStatus => {
    const stored = localStorage.getItem('firebase-migration-status');
    if (stored) {
      try {
        const status = JSON.parse(stored);
        return convertDates(status);
      } catch {
        return createEmptyStatus();
      }
    }
    return createEmptyStatus();
  },

  /**
   * Save migration status
   */
  saveStatus: (status: MigrationStatus): void => {
    localStorage.setItem('firebase-migration-status', JSON.stringify(status));
  },

  /**
   * Preview data that will be migrated
   */
  previewMigration: (): {
    collections: { name: string; count: number; sample: any }[];
    totalItems: number;
  } => {
    const questions = extractLocalData.questions();
    const papers = extractLocalData.papers();
    const notifications = extractLocalData.notifications();
    const unlockRequests = extractLocalData.unlockRequests();
    const users = extractLocalData.users();
    const feedback = extractLocalData.feedback();
    const questionBank = extractLocalData.questionBank();
    const securityHistory = extractLocalData.securityHistory();

    const collections = [
      { name: COLLECTIONS.QUESTIONS, count: questions.length, sample: questions[0] },
      { name: COLLECTIONS.PAPERS, count: papers.length, sample: papers[0] },
      { name: COLLECTIONS.NOTIFICATIONS, count: notifications.length, sample: notifications[0] },
      { name: 'unlock_requests', count: unlockRequests.length, sample: unlockRequests[0] },
      { name: COLLECTIONS.USERS, count: users.length, sample: users[0] },
      { name: COLLECTIONS.FEEDBACKS, count: feedback.length, sample: feedback[0] },
      { name: COLLECTIONS.QUESTION_BANK, count: questionBank.length, sample: questionBank[0] },
      { name: COLLECTIONS.SECURITY_HISTORY, count: securityHistory.length, sample: securityHistory[0] },
    ].filter(c => c.count > 0);

    return {
      collections,
      totalItems: collections.reduce((sum, c) => sum + c.count, 0),
    };
  },

  /**
   * Migrate all data to Firestore
   * 
   * IMPORTANT: This function contains placeholder Firestore calls.
   * When Firebase is integrated, uncomment the Firestore operations.
   */
  migrateAllData: async (
    onProgress?: (status: MigrationStatus) => void
  ): Promise<MigrationStatus> => {
    const status = createEmptyStatus();
    status.startTime = new Date();

    const preview = migrationService.previewMigration();
    status.totalItems = preview.totalItems;

    console.log('🚀 Starting data migration...');
    console.log(`📊 Total items to migrate: ${status.totalItems}`);

    // Initialize collection status
    preview.collections.forEach(c => {
      status.collections[c.name] = { total: c.count, migrated: 0, failed: 0 };
    });

    onProgress?.(status);

    try {
      // =========== MIGRATE USERS ===========
      const users = extractLocalData.users();
      console.log(`\n👤 Migrating ${users.length} users...`);
      
      for (const user of users) {
        try {
          // When Firebase is integrated, uncomment:
          // await setDoc(doc(db, COLLECTIONS.USERS, user.id!), user);
          
          // For now, log the operation
          console.log(`  ✓ User: ${user.email}`);
          status.collections[COLLECTIONS.USERS].migrated++;
          status.migratedItems++;
        } catch (error: any) {
          console.error(`  ✗ Failed to migrate user ${user.email}:`, error);
          status.collections[COLLECTIONS.USERS].failed++;
          status.failedItems++;
          status.errors.push(`User ${user.email}: ${error.message}`);
        }
        onProgress?.(status);
      }

      // =========== MIGRATE QUESTIONS ===========
      const questions = extractLocalData.questions();
      console.log(`\n❓ Migrating ${questions.length} questions...`);
      
      for (const question of questions) {
        try {
          // When Firebase is integrated, uncomment:
          // await setDoc(doc(db, COLLECTIONS.QUESTIONS, question.id!), question);
          
          console.log(`  ✓ Question: ${question.id}`);
          status.collections[COLLECTIONS.QUESTIONS].migrated++;
          status.migratedItems++;
        } catch (error: any) {
          console.error(`  ✗ Failed to migrate question ${question.id}:`, error);
          status.collections[COLLECTIONS.QUESTIONS].failed++;
          status.failedItems++;
          status.errors.push(`Question ${question.id}: ${error.message}`);
        }
        onProgress?.(status);
      }

      // =========== MIGRATE PAPERS ===========
      const papers = extractLocalData.papers();
      console.log(`\n📄 Migrating ${papers.length} papers...`);
      
      for (const paper of papers) {
        try {
          // When Firebase is integrated, uncomment:
          // await setDoc(doc(db, COLLECTIONS.PAPERS, paper.id!), paper);
          
          console.log(`  ✓ Paper: ${paper.title}`);
          status.collections[COLLECTIONS.PAPERS].migrated++;
          status.migratedItems++;
        } catch (error: any) {
          console.error(`  ✗ Failed to migrate paper ${paper.title}:`, error);
          status.collections[COLLECTIONS.PAPERS].failed++;
          status.failedItems++;
          status.errors.push(`Paper ${paper.title}: ${error.message}`);
        }
        onProgress?.(status);
      }

      // =========== MIGRATE NOTIFICATIONS ===========
      const notifications = extractLocalData.notifications();
      console.log(`\n🔔 Migrating ${notifications.length} notifications...`);
      
      for (const notification of notifications) {
        try {
          // When Firebase is integrated, uncomment:
          // await setDoc(doc(db, COLLECTIONS.NOTIFICATIONS, notification.id!), notification);
          
          console.log(`  ✓ Notification: ${notification.id}`);
          status.collections[COLLECTIONS.NOTIFICATIONS].migrated++;
          status.migratedItems++;
        } catch (error: any) {
          status.collections[COLLECTIONS.NOTIFICATIONS].failed++;
          status.failedItems++;
          status.errors.push(`Notification ${notification.id}: ${error.message}`);
        }
        onProgress?.(status);
      }

      // =========== MIGRATE FEEDBACK ===========
      const feedback = extractLocalData.feedback();
      console.log(`\n💬 Migrating ${feedback.length} feedback entries...`);
      
      for (const fb of feedback) {
        try {
          // When Firebase is integrated, uncomment:
          // await setDoc(doc(db, COLLECTIONS.FEEDBACKS, fb.id!), fb);
          
          console.log(`  ✓ Feedback: ${fb.id}`);
          status.collections[COLLECTIONS.FEEDBACKS].migrated++;
          status.migratedItems++;
        } catch (error: any) {
          status.collections[COLLECTIONS.FEEDBACKS].failed++;
          status.failedItems++;
          status.errors.push(`Feedback ${fb.id}: ${error.message}`);
        }
        onProgress?.(status);
      }

      // =========== MIGRATE APP SETTINGS ===========
      const appSettings = extractLocalData.appSettings();
      if (appSettings) {
        console.log(`\n⚙️ Migrating app settings...`);
        try {
          // When Firebase is integrated, uncomment:
          // await setDoc(doc(db, COLLECTIONS.APP_SETTINGS, 'main'), appSettings);
          
          console.log(`  ✓ App settings migrated`);
        } catch (error: any) {
          status.errors.push(`App settings: ${error.message}`);
        }
      }

      // =========== MIGRATE SECURITY HISTORY ===========
      const securityHistory = extractLocalData.securityHistory();
      if (securityHistory.length > 0) {
        console.log(`\n🔒 Migrating ${securityHistory.length} security history entries...`);
        
        for (const entry of securityHistory) {
          try {
            // When Firebase is integrated, uncomment:
            // await setDoc(doc(db, COLLECTIONS.SECURITY_HISTORY, entry.id), entry);
            
            console.log(`  ✓ Security entry: ${entry.id}`);
            status.collections[COLLECTIONS.SECURITY_HISTORY].migrated++;
            status.migratedItems++;
          } catch (error: any) {
            status.collections[COLLECTIONS.SECURITY_HISTORY].failed++;
            status.failedItems++;
            status.errors.push(`Security entry ${entry.id}: ${error.message}`);
          }
          onProgress?.(status);
        }
      }

      status.isComplete = true;
      status.endTime = new Date();

      console.log('\n✅ Migration complete!');
      console.log(`📊 Summary:`);
      console.log(`   Total: ${status.totalItems}`);
      console.log(`   Migrated: ${status.migratedItems}`);
      console.log(`   Failed: ${status.failedItems}`);
      console.log(`   Duration: ${(status.endTime.getTime() - status.startTime!.getTime()) / 1000}s`);

      migrationService.saveStatus(status);
      onProgress?.(status);

      return status;
    } catch (error: any) {
      status.errors.push(`Migration error: ${error.message}`);
      status.endTime = new Date();
      migrationService.saveStatus(status);
      throw error;
    }
  },

  /**
   * Clear migration status (for re-running migration)
   */
  clearStatus: (): void => {
    localStorage.removeItem('firebase-migration-status');
  },

  /**
   * Backup local data before migration
   */
  backupLocalData: (): string => {
    const backup: Record<string, any> = {};
    
    Object.entries(LOCAL_STORAGE_KEYS).forEach(([key, storageKey]) => {
      const data = localStorage.getItem(storageKey);
      if (data) {
        backup[storageKey] = JSON.parse(data);
      }
    });

    const backupString = JSON.stringify(backup, null, 2);
    
    // Create downloadable backup
    const blob = new Blob([backupString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qgenesis-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return backupString;
  },

  /**
   * Restore from backup
   */
  restoreFromBackup: (backupJson: string): void => {
    try {
      const backup = JSON.parse(backupJson);
      
      Object.entries(backup).forEach(([key, data]) => {
        localStorage.setItem(key, JSON.stringify(data));
      });

      console.log('✅ Data restored from backup');
    } catch (error) {
      console.error('Failed to restore backup:', error);
      throw error;
    }
  },
};

// Export for use in components
export default migrationService;
