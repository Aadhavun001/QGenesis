# Firebase/Firestore Integration Guide

This directory contains all the service layer code needed for Firebase Firestore integration. The app is now **ready for Firestore integration**.

## Quick Start

When you're ready to integrate with Firebase, run these commands in your terminal:

```bash
# Install Firebase
npm install firebase

# Or with yarn
yarn add firebase
```

Then follow the steps below.

---

## Files Overview

| File | Purpose |
|------|---------|
| `config.ts` | Firebase initialization and configuration |
| `collections.ts` | Firestore collection names and schema definitions |
| `types.ts` | TypeScript types for Firestore documents |
| `converters.ts` | Data conversion utilities (timestamps, IDs) |
| `dataService.ts` | CRUD operations for all collections |
| `authService.ts` | Authentication operations |
| `hooks.ts` | React hooks for real-time data |
| `index.ts` | Central export file |

---

## Integration Steps

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable **Firestore Database**
4. Enable **Authentication** (Email/Password, Phone, Google)
5. Copy your Firebase configuration

### Step 2: Update Configuration

Edit `src/services/firebase/config.ts`:

```typescript
export const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

Then uncomment the initialization code in the same file.

### Step 3: Update Data Service

In `src/services/firebase/dataService.ts`, change:

```typescript
const USE_FIRESTORE = true; // Change from false to true
```

### Step 4: Uncomment Firestore Operations

In each service file, uncomment the Firestore-specific code. For example:

```typescript
// Before (localStorage)
const getFromStorage = <T>(key: string, defaultValue: T): T => {
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : defaultValue;
};

// After (Firestore)
const getFromFirestore = async <T>(collectionName: string): Promise<T[]> => {
  const snapshot = await getDocs(collection(db, collectionName));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
};
```

### Step 5: Update Authentication

Replace localStorage-based auth with Firebase Auth in `authService.ts`:

```typescript
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from './config';

export const authService = {
  login: async ({ email, password }) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: result.user };
  },
  // ... etc
};
```

### Step 6: Enable Real-time Listeners

In `hooks.ts`, uncomment the `onSnapshot` listeners for real-time updates:

```typescript
useEffect(() => {
  const q = query(collection(db, COLLECTIONS.QUESTIONS));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const docs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setQuestions(docs);
  });
  return () => unsubscribe();
}, []);
```

---

## Firestore Security Rules

Add these security rules to your Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check user role
    function hasRole(role) {
      return request.auth != null && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == role;
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId || hasRole('admin');
    }
    
    // Questions collection
    match /questions/{questionId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
        (resource.data.staffId == request.auth.uid || hasRole('hod') || hasRole('admin'));
    }
    
    // Papers collection
    match /papers/{paperId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null &&
        (resource.data.staffId == request.auth.uid || hasRole('hod') || hasRole('admin'));
    }
    
    // Notifications - users can read their own
    match /notifications/{notificationId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
    }
    
    // Materials - staff can manage their own
    match /materials/{materialId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null &&
        resource.data.uploadedBy == request.auth.uid;
    }
    
    // Admin-only collections
    match /app_settings/{document=**} {
      allow read: if request.auth != null;
      allow write: if hasRole('admin');
    }
    
    // Security history - HOD and Admin can read
    match /security_history/{document=**} {
      allow read: if request.auth != null && (hasRole('hod') || hasRole('admin'));
      allow write: if request.auth != null;
    }
  }
}
```

---

## Data Migration

To migrate existing localStorage data to Firestore:

```typescript
import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from './config';

const migrateData = async () => {
  // Migrate questions
  const questionStore = JSON.parse(localStorage.getItem('question-store') || '{}');
  for (const question of questionStore.questions || []) {
    await setDoc(doc(db, 'questions', question.id), question);
  }
  
  // Migrate papers
  const paperStore = JSON.parse(localStorage.getItem('question-paper-store') || '{}');
  for (const paper of paperStore.papers || []) {
    await setDoc(doc(db, 'papers', paper.id), paper);
  }
  
  // Migrate users
  const users = JSON.parse(localStorage.getItem('qgenesis-managed-users') || '[]');
  for (const user of users) {
    await setDoc(doc(db, 'users', user.id), user);
  }
  
  console.log('Migration complete!');
};
```

---

## Collection Structure

```
firestore/
├── users/
│   └── {userId}
├── questions/
│   └── {questionId}
├── deleted_questions/
│   └── {questionId}
├── materials/
│   └── {materialId}
├── papers/
│   └── {paperId}
├── deleted_papers/
│   └── {paperId}
├── notifications/
│   └── {notificationId}
├── chat_sessions/
│   └── {sessionId}
│       └── messages/
│           └── {messageId}
├── security_history/
│   └── {entryId}
├── question_bank/
│   └── {questionId}
├── feedbacks/
│   └── {feedbackId}
├── exam_types/
│   └── {examTypeId}
├── departments/
│   └── {departmentId}
└── app_settings/
    └── global
```

---

## Need Help?

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Getting Started](https://firebase.google.com/docs/firestore/quickstart)
- [Firebase Auth](https://firebase.google.com/docs/auth)
