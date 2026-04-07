/**
 * Firebase Configuration
 *
 * Central config; real initialization is in firestore-config.ts
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: "AIzaSyC5v8ytUhPcaUP0Tq5oF4dl3MTz_f7OW38",
  authDomain: "qgenesis-32a36.firebaseapp.com",
  projectId: "qgenesis-32a36",
  storageBucket: "qgenesis-32a36.firebasestorage.app",
  messagingSenderId: "249319950394",
  appId: "1:249319950394:web:0bc5f53aa8d3eb55c78d03"
};

let appInstance: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;
let storageInstance: FirebaseStorage | null = null;

try {
  if (firebaseConfig.apiKey !== "YOUR_API_KEY" && firebaseConfig.projectId !== "YOUR_PROJECT_ID") {
    appInstance = initializeApp(firebaseConfig);
    dbInstance = getFirestore(appInstance);
    authInstance = getAuth(appInstance);
    storageInstance = getStorage(appInstance);
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
}

export const app = appInstance;
export const db = dbInstance;
export const auth = authInstance;
export const storage = storageInstance;

export const isFirebaseConfigured = (): boolean => {
  return firebaseConfig.apiKey !== "YOUR_API_KEY" &&
         firebaseConfig.projectId !== "YOUR_PROJECT_ID";
};

export const isProduction = import.meta.env.PROD;
