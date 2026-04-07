/**
 * ============================================================================
 * FIREBASE AUTHENTICATION SERVICE
 * ============================================================================
 * 
 * Complete authentication service with localStorage fallback.
 * Firebase imports are commented out until Firebase is installed.
 * 
 * CURSOR INTEGRATION: After running `npm install firebase`, uncomment the
 * Firebase imports and implementation blocks marked with FIREBASE_IMPL.
 * 
 * ============================================================================
 */

import { generateIds } from './converters';
import { COLLECTIONS } from './collections';
import type { FirestoreUser } from './types';
import { isFirebaseConfigured } from './firestore-config';

// ============================================================================
// TYPES
// ============================================================================

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: FirestoreUser;
}

export interface RegisterData {
  email: string;
  password: string;
  displayName: string;
  role: 'staff' | 'hod';
  phone?: string;
  department?: string;
  institution?: string;
  place?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

// ============================================================================
// LOCALSTORAGE HELPERS
// ============================================================================

const getRegisteredUsers = (): (FirestoreUser & { password: string })[] => {
  try {
    return JSON.parse(localStorage.getItem('qgenesis-registered-users') || '[]');
  } catch {
    return [];
  }
};

const saveRegisteredUsers = (users: (FirestoreUser & { password: string })[]) => {
  localStorage.setItem('qgenesis-registered-users', JSON.stringify(users));
};

const getBlockedUsers = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem('qgenesis-blocked-users') || '[]');
  } catch {
    return [];
  }
};

const getBlockedUserData = (): Record<string, { email?: string; phone?: string }> => {
  try {
    return JSON.parse(localStorage.getItem('qgenesis-blocked-user-data') || '{}');
  } catch {
    return {};
  }
};

const getManagedUsers = (): FirestoreUser[] => {
  try {
    return JSON.parse(localStorage.getItem('qgenesis-managed-users') || '[]');
  } catch {
    return [];
  }
};

const getPasswords = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem('qgenesis-passwords') || '{}');
  } catch {
    return {};
  }
};

const getStoredUserRaw = (): string | null =>
  sessionStorage.getItem('qgenesis_user') ?? localStorage.getItem('qgenesis_user');

const setStoredUser = (user: unknown) => {
  sessionStorage.setItem('qgenesis_user', JSON.stringify(user));
};

const clearStoredUser = () => {
  sessionStorage.removeItem('qgenesis_user');
  localStorage.removeItem('qgenesis_user');
};

/** Normalize phone for phone_to_uid doc ID - must match Cloud Function getCustomTokenForPhone */
const normalizePhoneForStorage = (phone: string): string => {
  const cleaned = String(phone).replace(/\s/g, '').replace(/-/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  const digits = cleaned.replace(/\D/g, '');
  return digits.length <= 10 ? '+91' + digits.slice(-10) : '+' + digits;
};

// ============================================================================
// MOCK ADMIN
// ============================================================================

const MOCK_ADMIN: FirestoreUser & { password: string } = {
  id: 'admin-1',
  email: 'admin@qgenesis.com',
  displayName: 'System Administrator',
  role: 'admin',
  password: 'admin123',
  status: 'active',
  createdAt: new Date(),
};

// ============================================================================
// AUTH SERVICE (with Firebase-ready structure)
// ============================================================================

export const firestoreAuthService = {
  /**
   * Get current authenticated user
   */
  getCurrentUser: async (): Promise<FirestoreUser | null> => {
    if (isFirebaseConfigured()) {
      const { auth, db } = await import('./firestore-config');
      if (!auth || !db) return null;
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) return null;
      const { doc, getDoc } = await import('firebase/firestore');
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      return userDoc.exists() ? { ...userDoc.data(), id: firebaseUser.uid } as FirestoreUser : null;
    }
    const stored = getStoredUserRaw();
    if (stored) {
      try {
        const user = JSON.parse(stored);
        return {
          ...user,
          createdAt: new Date(user.createdAt),
        };
      } catch {
        return null;
      }
    }
    return null;
  },

  /**
   * Login with email and password
   */
  loginWithEmail: async (credentials: LoginCredentials): Promise<AuthResult> => {
    if (isFirebaseConfigured()) {
      try {
        const { signInWithEmailAndPassword, signOut } = await import('firebase/auth');
        const { auth, db } = await import('./firestore-config');
        if (!auth || !db) return firestoreAuthService.localStorageLogin(credentials);
        const { doc, getDoc } = await import('firebase/firestore');
        const userCredential = await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
        const uid = userCredential.user.uid;
        const blockedDoc = await getDoc(doc(db, 'blocked_users', uid));
        if (blockedDoc.exists()) {
          await signOut(auth);
          return { success: false, error: 'Your account has been blocked.' };
        }
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (!userDoc.exists()) {
          return { success: false, error: 'User profile not found' };
        }
        const userProfile = { ...userDoc.data(), id: uid } as FirestoreUser;
        setStoredUser(userProfile);
        return { success: true, user: userProfile };
      } catch (error: any) {
        let errorMessage = 'Login failed';
        if (error?.code === 'auth/user-not-found') errorMessage = 'No account found for this email.';
        if (error?.code === 'auth/wrong-password' || error?.code === 'auth/invalid-credential') errorMessage = 'Invalid password.';
        if (error?.code === 'permission-denied') errorMessage = 'Permission denied. Check Firestore rules (e.g. blocked_users read).';
        if (error?.message) console.error('[Firebase login]', error.code || error.message, error);
        return { success: false, error: errorMessage };
      }
    }
    // localStorage fallback
    return firestoreAuthService.localStorageLogin(credentials);
  },

  /**
   * Register with email and password
   */
  registerWithEmail: async (data: RegisterData): Promise<AuthResult> => {
    if (isFirebaseConfigured()) {
      try {
        const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
        const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
        const { auth, db } = await import('./firestore-config');
        if (!auth || !db) {
          console.warn('[Firebase register] auth or db not ready, using localStorage', { hasAuth: !!auth, hasDb: !!db });
          return firestoreAuthService.localStorageRegister(data);
        }
        const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
        const uid = userCredential.user.uid;
        await updateProfile(userCredential.user, { displayName: data.displayName });
        const userData = {
          id: uid,
          email: data.email,
          displayName: data.displayName,
          role: data.role,
          phone: data.phone,
          department: data.department,
          institution: data.institution,
          place: data.place,
          status: 'active',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await setDoc(doc(db, 'users', uid), userData);
        if (data.phone && data.phone.replace(/\D/g, '').length >= 10) {
          const phoneDocId = normalizePhoneForStorage(data.phone);
          await setDoc(doc(db, COLLECTIONS.PHONE_TO_UID, phoneDocId), { uid });
        }
        console.log('[Firebase register] User and phone_to_uid (if phone provided) created:', uid);
        return { success: true, user: userData as FirestoreUser };
      } catch (error: any) {
        let errorMessage = 'Registration failed';
        if (error?.code === 'auth/email-already-in-use') errorMessage = 'Email already exists';
        if (error?.code === 'auth/weak-password') errorMessage = 'Password too weak';
        if (error?.code === 'permission-denied') errorMessage = 'Permission denied. Check Firestore rules (users create: isOwner first).';
        if (error?.message) console.error('[Firebase register]', error.code || error.message, error);
        return { success: false, error: errorMessage };
      }
    }
    return firestoreAuthService.localStorageRegister(data);
  },

  /**
   * Login with Google
   */
  loginWithGoogle: async (): Promise<AuthResult> => {
    if (isFirebaseConfigured()) {
      try {
        const { GoogleAuthProvider, signInWithPopup, signOut } = await import('firebase/auth');
        const { doc, getDoc, setDoc, serverTimestamp } = await import('firebase/firestore');
        const { auth, db } = await import('./firestore-config');
        if (!auth || !db) return { success: false, error: 'Firebase not configured for Google login' };
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        const blockedDoc = await getDoc(doc(db, 'blocked_users', user.uid));
        if (blockedDoc.exists()) {
          await signOut(auth);
          return { success: false, error: 'Your account has been blocked.' };
        }
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        let userProfile: FirestoreUser;
        if (!userDoc.exists()) {
          userProfile = {
            id: user.uid,
            email: user.email || '',
            displayName: user.displayName || 'User',
            role: 'staff',
            avatar: user.photoURL || undefined,
            status: 'active',
            createdAt: new Date(),
          };
          await setDoc(userRef, { ...userProfile, createdAt: serverTimestamp() });
        } else {
          userProfile = { ...userDoc.data(), id: user.uid } as FirestoreUser;
        }
        setStoredUser(userProfile);
        return { success: true, user: userProfile };
      } catch (error: any) {
        const code = error?.code as string | undefined;
        if (code === 'auth/unauthorized-domain') {
          return {
            success: false,
            error: 'This domain is not authorized for Google sign-in. Add your domain (127.0.0.1 and localhost) in Firebase Console → Authentication → Settings → Authorized domains, then try again.',
          };
        }
        return { success: false, error: error?.message || 'Google sign-in failed' };
      }
    }
    return { success: false, error: 'Firebase not configured for Google login' };
  },

  /**
   * Send phone OTP
   */
  sendPhoneOTP: async (phoneNumber: string, recaptchaContainerId: string): Promise<AuthResult> => {
    if (isFirebaseConfigured()) {
      try {
        const { RecaptchaVerifier, signInWithPhoneNumber } = await import('firebase/auth');
        const { auth } = await import('./firestore-config');
        if (!auth) return { success: false, error: 'Auth not configured' };
        const recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerId, { size: 'invisible' });
        const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
        (window as any).__phoneAuthConfirmationResult = confirmationResult;
        return { success: true };
      } catch (error: any) {
        const code = error?.code || '';
        let message = error?.message || 'Failed to send OTP';
        if (code === 'auth/too-many-requests') {
          message = 'Too many attempts. Please wait 15–60 minutes before trying again, or add this number as a test number in Firebase Console (Authentication → Phone → Phone numbers for testing) to use a fixed OTP.';
        } else if (code === 'auth/invalid-phone-number') {
          message = 'Invalid phone number. Use country code, e.g. +91 8667034626';
        } else if (code === 'auth/captcha-check-failed' || code === 'auth/missing-client-identifier') {
          message = 'Security check failed. Refresh the page and try again.';
        } else if (code === 'auth/quota-exceeded') {
          message = 'SMS quota exceeded. Try again later or use Firebase test phone numbers for development.';
        }
        return { success: false, error: message };
      }
    }
    // Mock OTP send
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { success: true };
  },

  /**
   * Verify phone OTP and sign in; use existing account if phone was registered at signup, else create/fetch profile.
   */
  verifyPhoneOTP: async (otp: string): Promise<AuthResult> => {
    if (isFirebaseConfigured()) {
      try {
        const confirmationResult = (window as any).__phoneAuthConfirmationResult;
        if (!confirmationResult) {
          return { success: false, error: 'Please request OTP first' };
        }
        await confirmationResult.confirm(otp);
        const { app, auth, db } = await import('./firestore-config');
        if (!auth || !db) return { success: false, error: 'Auth not configured' };
        let firebaseUser = auth.currentUser;
        if (!firebaseUser) return { success: false, error: 'Sign-in failed' };

        const { signOut, signInWithCustomToken } = await import('firebase/auth');
        const { doc, getDoc, setDoc, serverTimestamp } = await import('firebase/firestore');
        const { getFunctions, httpsCallable } = await import('firebase/functions');

        if (app && firebaseUser.phoneNumber) {
          try {
            const functions = getFunctions(app, 'us-central1');
            const getCustomToken = httpsCallable<{ idToken: string }, { customToken?: string; error?: string }>(functions, 'getCustomTokenForPhone');
            const idToken = await firebaseUser.getIdToken();
            const result = await getCustomToken({ idToken });
            const data = result.data;
            if (data?.customToken) {
              await signOut(auth);
              const cred = await signInWithCustomToken(auth, data.customToken);
              firebaseUser = cred.user;
            }
          } catch (e) {
            if (process.env.NODE_ENV === 'development') {
              console.warn('[verifyPhoneOTP] getCustomTokenForPhone failed (will use phone uid):', e);
            }
          }
        }

        const blockedDoc = await getDoc(doc(db, 'blocked_users', firebaseUser.uid));
        if (blockedDoc.exists()) {
          await signOut(auth);
          return { success: false, error: 'Your account has been blocked.' };
        }
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userRef);
        let userProfile: FirestoreUser;
        if (!userDoc.exists()) {
          const normalizedPhone = firebaseUser.phoneNumber ? normalizePhoneForStorage(firebaseUser.phoneNumber) : undefined;
          userProfile = {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || 'User',
            role: 'staff',
            phone: normalizedPhone || firebaseUser.phoneNumber || undefined,
            status: 'active',
            createdAt: new Date(),
          };
          await setDoc(userRef, { ...userProfile, createdAt: serverTimestamp() });
          if (normalizedPhone) {
            await setDoc(doc(db, COLLECTIONS.PHONE_TO_UID, normalizedPhone), { uid: firebaseUser.uid });
          }
        } else {
          userProfile = { ...userDoc.data(), id: firebaseUser.uid } as FirestoreUser;
        }
        setStoredUser(userProfile);
        return { success: true, user: userProfile };
      } catch (error: any) {
        return { success: false, error: error?.message || 'Invalid OTP' };
      }
    }
    if (otp.length !== 6) return { success: false, error: 'Invalid OTP' };
    return { success: true };
  },

  /**
   * Logout
   */
  logout: async (): Promise<void> => {
    if (isFirebaseConfigured()) {
      const { signOut } = await import('firebase/auth');
      const { auth } = await import('./firestore-config');
      if (auth) await signOut(auth);
    }
    clearStoredUser();
    window.dispatchEvent(new Event('auth-logout'));
  },

  /**
   * Send password reset email
   */
  sendPasswordReset: async (email: string): Promise<AuthResult> => {
    if (isFirebaseConfigured()) {
      try {
        const { sendPasswordResetEmail } = await import('firebase/auth');
        const { auth } = await import('./firestore-config');
        if (!auth) return { success: false, error: 'Auth not configured' };
        await sendPasswordResetEmail(auth, email);
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { success: true };
  },

  /**
   * Update user profile. When phone is present (from updates or current user doc),
   * writes phone_to_uid so the user can log in with OTP using that number.
   */
  updateUserProfile: async (uid: string, updates: Partial<FirestoreUser>): Promise<AuthResult> => {
    if (isFirebaseConfigured()) {
      try {
        const { doc, updateDoc, setDoc, serverTimestamp, getDoc } = await import('firebase/firestore');
        const { db } = await import('./firestore-config');
        if (!db) return { success: false, error: 'DB not configured' };
        await updateDoc(doc(db, 'users', uid), {
          ...updates,
          updatedAt: serverTimestamp(),
        });
        const userDoc = await getDoc(doc(db, 'users', uid));
        const userProfile = { ...userDoc.data(), id: uid } as FirestoreUser;
        const phoneToSync = updates.phone ?? userProfile.phone;
        if (phoneToSync && String(phoneToSync).replace(/\D/g, '').length >= 10) {
          const phoneDocId = normalizePhoneForStorage(phoneToSync);
          await setDoc(doc(db, COLLECTIONS.PHONE_TO_UID, phoneDocId), { uid });
        }
        setStoredUser(userProfile);
        window.dispatchEvent(new Event('user-updated'));
        return { success: true, user: userProfile };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }
    // localStorage update
    const stored = getStoredUserRaw();
    if (stored) {
      const user = { ...JSON.parse(stored), ...updates };
      setStoredUser(user);
      window.dispatchEvent(new Event('user-updated'));
      return { success: true, user };
    }
    return { success: false, error: 'User not found' };
  },

  /**
   * Block user
   */
  blockUser: async (uid: string): Promise<AuthResult> => {
    if (isFirebaseConfigured()) {
      const { doc, setDoc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('./firestore-config');
      if (!db) return { success: false, error: 'DB not configured' };
      await setDoc(doc(db, 'blocked_users', uid), { blockedAt: serverTimestamp() });
      await updateDoc(doc(db, 'users', uid), { status: 'blocked', updatedAt: serverTimestamp() });
      return { success: true };
    }
    const blockedUsers = getBlockedUsers();
    if (!blockedUsers.includes(uid)) {
      blockedUsers.push(uid);
      localStorage.setItem('qgenesis-blocked-users', JSON.stringify(blockedUsers));
    }
    
    const managedUsers = getManagedUsers();
    const user = managedUsers.find(u => u.id === uid);
    if (user) {
      const blockedUserData = getBlockedUserData();
      blockedUserData[uid] = { email: user.email, phone: user.phone };
      localStorage.setItem('qgenesis-blocked-user-data', JSON.stringify(blockedUserData));
    }
    
    return { success: true };
  },

  /**
   * Unblock user
   */
  unblockUser: async (uid: string): Promise<AuthResult> => {
    if (isFirebaseConfigured()) {
      const { doc, deleteDoc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('./firestore-config');
      if (!db) return { success: false, error: 'DB not configured' };
      await deleteDoc(doc(db, 'blocked_users', uid));
      await updateDoc(doc(db, 'users', uid), { status: 'active', updatedAt: serverTimestamp() });
      return { success: true };
    }
    const blockedUsers = getBlockedUsers();
    const index = blockedUsers.indexOf(uid);
    if (index !== -1) {
      blockedUsers.splice(index, 1);
      localStorage.setItem('qgenesis-blocked-users', JSON.stringify(blockedUsers));
    }
    const blockedUserData = getBlockedUserData();
    delete blockedUserData[uid];
    localStorage.setItem('qgenesis-blocked-user-data', JSON.stringify(blockedUserData));
    return { success: true };
  },

  /**
   * Admin-only: delete user from Firebase Auth and Firestore (users, blocked_users, phone_to_uid).
   * Calls Cloud Function deleteUserByAdmin.
   */
  deleteUserByAdmin: async (uid: string): Promise<AuthResult> => {
    if (!isFirebaseConfigured()) {
      return { success: false, error: 'Firebase not configured' };
    }
    try {
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const { app } = await import('./firestore-config');
      if (!app) return { success: false, error: 'Firebase app not configured' };
      const functions = getFunctions(app);
      const deleteUserByAdminFn = httpsCallable<{ uid: string }, { success?: boolean; error?: string }>(functions, 'deleteUserByAdmin');
      const result = await deleteUserByAdminFn({ uid });
      const data = result.data;
      if (data?.success) return { success: true };
      return { success: false, error: data?.error || 'Delete failed' };
    } catch (error: any) {
      const code = error?.code || error?.details?.code;
      const msg = error?.message || error?.details?.message;
      if (code === 'functions/permission-denied') return { success: false, error: 'Only admins can delete users.' };
      if (code === 'functions/unauthenticated') return { success: false, error: 'You must be signed in.' };
      return { success: false, error: msg || 'Failed to delete user.' };
    }
  },

  /**
   * Admin-only: create user in Firebase Auth and Firestore (and phone_to_uid if phone provided).
   * Calls Cloud Function createUserByAdmin.
   */
  createUserByAdmin: async (data: {
    email: string;
    password: string;
    displayName: string;
    role: 'staff' | 'hod' | 'admin';
    phone?: string;
    department?: string;
    institution?: string;
    place?: string;
  }): Promise<AuthResult> => {
    if (!isFirebaseConfigured()) {
      return { success: false, error: 'Firebase not configured' };
    }
    try {
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const { app } = await import('./firestore-config');
      if (!app) return { success: false, error: 'Firebase app not configured' };
      const functions = getFunctions(app, 'us-central1');
      const createUserByAdminFn = httpsCallable<
        { email: string; password: string; displayName: string; role: string; phone?: string; department?: string; institution?: string; place?: string },
        { success?: boolean; uid?: string; error?: string }
      >(functions, 'createUserByAdmin');
      const result = await createUserByAdminFn({
        email: data.email,
        password: data.password,
        displayName: data.displayName,
        role: data.role,
        phone: data.phone || undefined,
        department: data.department || undefined,
        institution: data.institution || undefined,
        place: data.place || undefined,
      });
      const res = result.data;
      if (res?.success) return { success: true };
      return { success: false, error: res?.error || 'Create failed' };
    } catch (error: any) {
      const code = error?.code || error?.details?.code;
      const msg = error?.message || error?.details?.message;
      if (code === 'functions/permission-denied') return { success: false, error: 'Only admins can add users.' };
      if (code === 'functions/unauthenticated') return { success: false, error: 'You must be signed in.' };
      if (code === 'functions/already-exists') return { success: false, error: 'An account already exists with this email.' };
      return { success: false, error: msg || 'Failed to create user.' };
    }
  },

  // ============================================================================
  // LOCALSTORAGE METHODS
  // ============================================================================

  localStorageLogin: async (credentials: LoginCredentials): Promise<AuthResult> => {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const { email, password } = credentials;
    const blockedUsers = getBlockedUsers();
    const blockedUserData = getBlockedUserData();

    // Check if blocked
    for (const blockedId of blockedUsers) {
      if (blockedUserData[blockedId]?.email === email) {
        return { success: false, error: 'Your account has been blocked.' };
      }
    }

    // Check managed users
    const managedUsers = getManagedUsers();
    const passwords = getPasswords();
    const managedUser = managedUsers.find(u => u.email === email);
    
    if (managedUser) {
      if (blockedUsers.includes(managedUser.id)) {
        return { success: false, error: 'Your account has been blocked.' };
      }
      if (passwords[managedUser.id] === password) {
        setStoredUser(managedUser);
        return { success: true, user: managedUser };
      }
    }

    // Check registered users
    const registeredUsers = getRegisteredUsers();
    const registeredUser = registeredUsers.find(u => u.email === email && u.password === password);
    
    if (registeredUser) {
      if (blockedUsers.includes(registeredUser.id)) {
        return { success: false, error: 'Your account has been blocked.' };
      }
      const { password: _, ...userWithoutPassword } = registeredUser;
      setStoredUser(userWithoutPassword);
      return { success: true, user: userWithoutPassword };
    }

    // Check mock admin
    if (email === MOCK_ADMIN.email && password === MOCK_ADMIN.password) {
      const { password: _, ...adminWithoutPassword } = MOCK_ADMIN;
      setStoredUser(adminWithoutPassword);
      return { success: true, user: adminWithoutPassword };
    }

    return { success: false, error: 'Invalid email or password' };
  },

  localStorageRegister: async (data: RegisterData): Promise<AuthResult> => {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const { email, password, displayName, role, phone, department, institution, place } = data;

    // Check blocked
    const blockedUsers = getBlockedUsers();
    const blockedUserData = getBlockedUserData();
    for (const blockedId of blockedUsers) {
      const blocked = blockedUserData[blockedId];
      if (blocked?.email === email || blocked?.phone === phone) {
        return { success: false, error: 'This email or phone is blocked.' };
      }
    }

    // Check existing
    if (email === MOCK_ADMIN.email) {
      return { success: false, error: 'User already exists' };
    }

    const registeredUsers = getRegisteredUsers();
    if (registeredUsers.find(u => u.email === email)) {
      return { success: false, error: 'User already exists with this email' };
    }

    const managedUsers = getManagedUsers();
    if (managedUsers.find(u => u.email === email)) {
      return { success: false, error: 'User already exists with this email' };
    }

    // Create user
    const newUser: FirestoreUser & { password: string } = {
      id: generateIds.user(),
      email,
      displayName,
      role,
      phone,
      department,
      institution,
      place,
      password,
      status: 'active' as const,
      createdAt: new Date(),
    };

    registeredUsers.push(newUser);
    saveRegisteredUsers(registeredUsers);

    const { password: _, ...userWithoutPassword } = newUser;
    managedUsers.push(userWithoutPassword);
    localStorage.setItem('qgenesis-managed-users', JSON.stringify(managedUsers));

    const passwords = getPasswords();
    passwords[newUser.id] = password;
    localStorage.setItem('qgenesis-passwords', JSON.stringify(passwords));

    return { success: true, user: userWithoutPassword };
  },
};

export default firestoreAuthService;
