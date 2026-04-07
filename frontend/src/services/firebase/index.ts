/**
 * Firebase Services - Main Export
 * 
 * CURSOR INTEGRATION: After `npm install firebase`, update firestore-config.ts
 * with your credentials and uncomment Firebase imports in each service file.
 */

// Configuration
export * from './config';
export { isFirebaseConfigured, firebaseConfig } from './firestore-config';

// Collections & Types
export * from './collections';
export * from './types';
export * from './converters';

// Services
export * from './dataService';
export * from './authService';
export * from './migrationUtility';
export { materialStorageService } from './materialStorageService';
export type { MaterialSaveInput, MaterialWithAnalysis } from './materialStorageService';

// NEW: Firestore Services (Production-ready)
export { firestoreAuthService } from './firestore-auth';
export { firestoreServices, firestoreQuestionService, firestoreGeneratedQuestionService, firestorePaperService, firestoreNotificationService, firestoreUserService } from './firestore-database';
export { firestoreStorageService, STORAGE_PATHS } from './firestore-storage';
export { useFirestoreAuth, useFirestoreQuestions, useFirestorePapers, useFirestoreNotifications } from './firestore-hooks';
export { FIRESTORE_SECURITY_RULES, STORAGE_SECURITY_RULES, FIRESTORE_INDEXES } from './firestore-security-rules';
