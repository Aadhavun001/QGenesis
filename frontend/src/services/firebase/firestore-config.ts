/**
 * ============================================================================
 * FIREBASE FIRESTORE CONFIGURATION
 * ============================================================================
 */

import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
import {
  getAuth,
  setPersistence,
  browserSessionPersistence,
  type Auth,
} from 'firebase/auth';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

console.log('[QGenesis] Firebase config module loaded');

// Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyC5v8ytUhPcaUP0Tq5oF4dl3MTz_f7OW38",
  authDomain: "qgenesis-32a36.firebaseapp.com",
  projectId: "qgenesis-32a36",
  storageBucket: "qgenesis-32a36.firebasestorage.app",
  messagingSenderId: "249319950394",
  appId: "1:249319950394:web:0bc5f53aa8d3eb55c78d03"
};

// Environment configuration
export const isProduction = import.meta.env.PROD;
export const useEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true';

/**
 * Check if Firebase is properly configured
 */
export const isFirebaseConfigured = (): boolean => {
  return firebaseConfig.apiKey !== "YOUR_API_KEY" &&
         firebaseConfig.projectId !== "YOUR_PROJECT_ID";
};

export let app: FirebaseApp | null = null;
export let db: Firestore | null = null;
export let auth: Auth | null = null;
export let storage: FirebaseStorage | null = null;

const initializeFirebaseApp = (): void => {
  console.log('[QGenesis] initializeFirebaseApp called', { configured: isFirebaseConfigured() });
  if (!isFirebaseConfigured()) {
    console.warn('[QGenesis] Firebase not configured. Using localStorage mode.');
    return;
  }

  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    // Per-tab session persistence allows different users in different tabs/windows.
    setPersistence(auth, browserSessionPersistence);
    storage = getStorage(app);

    /**
     * Firestore 12.10.0 can intermittently throw INTERNAL ASSERTION FAILED
     * in watch stream transitions when persistent multi-tab cache is enabled,
     * especially during rapid mount/unmount in dev. Use default Firestore in
     * development for stability; keep persistence in production with fallback.
     */
    if (isProduction) {
      try {
        db = initializeFirestore(app, {
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager(),
          }),
        });
      } catch (firestoreError) {
        console.warn('Firestore persistence failed, using default:', firestoreError);
        db = getFirestore(app);
      }
    } else {
      db = getFirestore(app);
    }

    console.log('[QGenesis] Firebase initialized successfully', { hasDb: !!db, hasAuth: !!auth });
  } catch (error) {
    console.error('[QGenesis] Firebase initialization error:', error);
  }
};

initializeFirebaseApp();
console.log('[QGenesis] Firebase init complete', { hasApp: !!app, hasDb: !!db, hasAuth: !!auth });

export default { app, db, auth, storage, isFirebaseConfigured, firebaseConfig };
