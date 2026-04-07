import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { User, UserRole } from '@/types';
import { isFirebaseConfigured, auth } from '@/services/firebase/firestore-config';
import { firestoreAuthService } from '@/services/firebase/firestore-auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthReady: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  refreshUser: () => void;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  sendPhoneOTP: (phoneNumber: string, recaptchaContainerId: string) => Promise<{ success: boolean; error?: string }>;
  verifyPhoneOTP: (otp: string) => Promise<{ success: boolean; error?: string }>;
}

interface RegisterData {
  email: string;
  password: string;
  displayName: string;
  role: 'staff' | 'hod';
  phone?: string;
  department?: string;
  institution?: string;
  place?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users database
const mockUsers: (User & { password: string })[] = [
  {
    id: 'admin-1',
    email: 'admin@qgenesis.com',
    displayName: 'System Administrator',
    role: 'admin',
    password: 'admin123',
    createdAt: new Date(),
  },
];

// Get registered users from localStorage
const getRegisteredUsers = (): (User & { password: string })[] => {
  try {
    return JSON.parse(localStorage.getItem('qgenesis-registered-users') || '[]');
  } catch {
    return [];
  }
};

// Save registered users to localStorage
const saveRegisteredUsers = (users: (User & { password: string })[]) => {
  localStorage.setItem('qgenesis-registered-users', JSON.stringify(users));
};

// Get blocked users
const getBlockedUsers = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem('qgenesis-blocked-users') || '[]');
  } catch {
    return [];
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

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const refreshUser = useCallback(async () => {
    if (isFirebaseConfigured()) {
      try {
        const firebaseUser = await firestoreAuthService.getCurrentUser();
        if (firebaseUser) {
          const u = firebaseUser as User;
          if (u.createdAt && typeof (u.createdAt as any).toDate === 'function') {
            u.createdAt = (u.createdAt as any).toDate();
          } else if (u.createdAt && !(u.createdAt instanceof Date)) {
            u.createdAt = new Date(u.createdAt as any);
          }
          setUser(u);
        } else {
          setUser(null);
        }
      } catch (e) {
        console.error('Firebase getCurrentUser failed:', e);
        setUser(null);
      }
    } else {
      const storedUser = getStoredUserRaw();
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed.createdAt) parsed.createdAt = new Date(parsed.createdAt);
          setUser(parsed);
        } catch (e) {
          console.error('Failed to parse user data:', e);
          clearStoredUser();
          setUser(null);
        }
      } else {
        setUser(null);
      }
    }
    setIsAuthReady(true);
  }, []);

  useEffect(() => {
    if (isFirebaseConfigured()) {
      if (!auth) {
        setIsAuthReady(true);
        return;
      }
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (!firebaseUser) {
          setUser(null);
          setIsAuthReady(true);
          return;
        }
        try {
          const u = await firestoreAuthService.getCurrentUser();
          if (u) {
            const asUser = u as User;
            if (asUser.createdAt && typeof (asUser.createdAt as any)?.toDate === 'function') {
              asUser.createdAt = (asUser.createdAt as any).toDate();
            } else if (asUser.createdAt && !(asUser.createdAt instanceof Date)) {
              asUser.createdAt = new Date(asUser.createdAt as any);
            }
            setUser(asUser);
          } else {
            setUser(null);
          }
        } catch (e) {
          console.error('Auth state: getCurrentUser failed', e);
          setUser(null);
        }
        setIsAuthReady(true);
      });
      // Fallback: ensure app never stays on blank/loading if Firebase is slow or offline
      const fallback = setTimeout(() => setIsAuthReady(true), 2500);
      const handleUserUpdated = () => refreshUser();
      window.addEventListener('user-updated', handleUserUpdated);
      return () => {
        clearTimeout(fallback);
        unsubscribe();
        window.removeEventListener('user-updated', handleUserUpdated);
      };
    }

    // Non-Firebase: restore from localStorage
    refreshUser();
    const handleStorageChange = () => refreshUser();
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('user-updated', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('user-updated', handleStorageChange);
    };
  }, [refreshUser]);

  const updateUser = useCallback(async (updates: Partial<User>) => {
    try {
      const storedUser = getStoredUserRaw();
      const parsedUser = storedUser ? JSON.parse(storedUser) : user;
      if (!parsedUser?.id) return;
      const updatedUser = { ...parsedUser, ...updates };

      if (isFirebaseConfigured() && parsedUser.id) {
        const result = await firestoreAuthService.updateUserProfile(parsedUser.id, updates as any);
        if (result.success && result.user) {
          const u = result.user as User;
          if (u.createdAt && typeof (u.createdAt as any)?.toDate === 'function') u.createdAt = (u.createdAt as any).toDate();
          else if (u.createdAt && !(u.createdAt instanceof Date)) u.createdAt = new Date(u.createdAt as any);
          setUser(u);
          setStoredUser(u);
          window.dispatchEvent(new Event('user-updated'));
          return;
        }
      }
      setStoredUser(updatedUser);
      setUser(updatedUser);
      window.dispatchEvent(new Event('user-updated'));
    } catch (e) {
      console.error('Failed to update user:', e);
    }
  }, [user]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);

    if (isFirebaseConfigured()) {
      try {
        const result = await firestoreAuthService.loginWithEmail({ email, password });
        if (result.success && result.user) {
          const u = result.user as User;
          if (u.createdAt && typeof (u.createdAt as any)?.toDate === 'function') {
            u.createdAt = (u.createdAt as any).toDate();
          } else if (u.createdAt && !(u.createdAt instanceof Date)) {
            u.createdAt = new Date(u.createdAt as any);
          }
          setUser(u);
          setStoredUser(u);
          setIsLoading(false);
          return { success: true };
        }
        setIsLoading(false);
        return { success: false, error: result.error };
      } catch (e: any) {
        setIsLoading(false);
        return { success: false, error: e?.message || 'Login failed' };
      }
    }

    // localStorage fallback
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if user is blocked
    const blockedUsers = getBlockedUsers();
    const blockedUserData = JSON.parse(localStorage.getItem('qgenesis-blocked-user-data') || '{}');
    
    // Check if email or phone is blocked
    for (const blockedId of blockedUsers) {
      const blockedData = blockedUserData[blockedId];
      if (blockedData && (blockedData.email === email)) {
        setIsLoading(false);
        return { success: false, error: 'Your account has been blocked. Please contact administrator.' };
      }
    }
    
    // Check managed users from localStorage first
    const managedUsers = JSON.parse(localStorage.getItem('qgenesis-managed-users') || '[]');
    const passwords = JSON.parse(localStorage.getItem('qgenesis-passwords') || '{}');
    
    // Check managed users
    const managedUser = managedUsers.find((u: any) => u.email === email);
    if (managedUser) {
      // Check if blocked
      if (blockedUsers.includes(managedUser.id)) {
        setIsLoading(false);
        return { success: false, error: 'Your account has been blocked. Please contact administrator.' };
      }
      
      if (passwords[managedUser.id] === password) {
        const userWithoutPassword = { ...managedUser };
        setUser(userWithoutPassword);
        setStoredUser(userWithoutPassword);
        setIsLoading(false);
        return { success: true };
      }
    }

    // Check registered users
    const registeredUsers = getRegisteredUsers();
    const registeredUser = registeredUsers.find(u => u.email === email && u.password === password);
    if (registeredUser) {
      // Check if blocked
      if (blockedUsers.includes(registeredUser.id)) {
        setIsLoading(false);
        return { success: false, error: 'Your account has been blocked. Please contact administrator.' };
      }
      
      const { password: _, ...userWithoutPassword } = registeredUser;
      setUser(userWithoutPassword);
      setStoredUser(userWithoutPassword);
      setIsLoading(false);
      return { success: true };
    }
    
    // Check mock users
    const foundUser = mockUsers.find(u => u.email === email && u.password === password);
    
    if (foundUser) {
      const { password: _, ...userWithoutPassword } = foundUser;
      setUser(userWithoutPassword);
      setStoredUser(userWithoutPassword);
      setIsLoading(false);
      return { success: true };
    }
    
    setIsLoading(false);
    return { success: false, error: 'Invalid email or password' };
  };

  const register = async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);

    if (isFirebaseConfigured()) {
      try {
        const result = await firestoreAuthService.registerWithEmail(data);
        setIsLoading(false);
        return result.success ? { success: true } : { success: false, error: result.error };
      } catch (e: any) {
        setIsLoading(false);
        return { success: false, error: e?.message || 'Registration failed' };
      }
    }

    // localStorage fallback
    await new Promise(resolve => setTimeout(resolve, 1000));

    const blockedUsers = getBlockedUsers();
    const blockedUserData = JSON.parse(localStorage.getItem('qgenesis-blocked-user-data') || '{}');
    for (const blockedId of blockedUsers) {
      const blockedData = blockedUserData[blockedId];
      if (blockedData && (blockedData.email === data.email || blockedData.phone === data.phone)) {
        setIsLoading(false);
        return { success: false, error: 'This email or phone number is blocked. Please use different credentials.' };
      }
    }
    if (mockUsers.find(u => u.email === data.email)) {
      setIsLoading(false);
      return { success: false, error: 'User already exists with this email' };
    }
    const registeredUsers = getRegisteredUsers();
    if (registeredUsers.find(u => u.email === data.email)) {
      setIsLoading(false);
      return { success: false, error: 'User already exists with this email' };
    }
    const managedUsers = JSON.parse(localStorage.getItem('qgenesis-managed-users') || '[]');
    if (managedUsers.find((u: any) => u.email === data.email)) {
      setIsLoading(false);
      return { success: false, error: 'User already exists with this email' };
    }
    const newUser: User & { password: string } = {
      id: `user-${Date.now()}`,
      email: data.email,
      displayName: data.displayName,
      role: data.role,
      phone: data.phone,
      department: data.department,
      institution: data.institution,
      place: data.place,
      password: data.password,
      createdAt: new Date(),
    };
    registeredUsers.push(newUser);
    saveRegisteredUsers(registeredUsers);
    managedUsers.push({
      id: newUser.id,
      email: newUser.email,
      displayName: newUser.displayName,
      role: newUser.role,
      phone: newUser.phone,
      department: newUser.department,
      institution: newUser.institution,
      place: newUser.place,
      status: 'active',
      createdAt: newUser.createdAt,
    });
    localStorage.setItem('qgenesis-managed-users', JSON.stringify(managedUsers));
    const passwords = JSON.parse(localStorage.getItem('qgenesis-passwords') || '{}');
    passwords[newUser.id] = data.password;
    localStorage.setItem('qgenesis-passwords', JSON.stringify(passwords));
    setIsLoading(false);
    return { success: true };
  };

  const logout = async () => {
    setUser(null);
    setIsAuthReady(true);
    clearStoredUser();
    // Ensure all listeners react immediately to logout state changes.
    window.dispatchEvent(new Event('user-updated'));
    window.dispatchEvent(new Event('auth-logout'));
    if (isFirebaseConfigured()) {
      try {
        await firestoreAuthService.logout();
      } catch (e) {
        console.error('Firebase logout failed:', e);
      }
    }
  };

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    if (!isFirebaseConfigured()) {
      return { success: false, error: 'Google sign-in is not configured.' };
    }
    setIsLoading(true);
    try {
      const result = await firestoreAuthService.loginWithGoogle();
      if (result.success && result.user) {
        const u = result.user as User;
        if (u.createdAt && typeof (u.createdAt as any)?.toDate === 'function') {
          u.createdAt = (u.createdAt as any).toDate();
        } else if (u.createdAt && !(u.createdAt instanceof Date)) {
          u.createdAt = new Date(u.createdAt as any);
        }
        setUser(u);
        setStoredUser(u);
        setIsLoading(false);
        return { success: true };
      }
      setIsLoading(false);
      return { success: false, error: result.error };
    } catch (e: any) {
      setIsLoading(false);
      return { success: false, error: e?.message || 'Google sign-in failed' };
    }
  };

  const sendPhoneOTP = async (phoneNumber: string, recaptchaContainerId: string): Promise<{ success: boolean; error?: string }> => {
    if (!isFirebaseConfigured()) {
      return { success: false, error: 'Phone sign-in is not configured.' };
    }
    setIsLoading(true);
    try {
      const result = await firestoreAuthService.sendPhoneOTP(phoneNumber, recaptchaContainerId);
      setIsLoading(false);
      return result.success ? { success: true } : { success: false, error: result.error };
    } catch (e: any) {
      setIsLoading(false);
      return { success: false, error: e?.message || 'Failed to send OTP' };
    }
  };

  const verifyPhoneOTP = async (otp: string): Promise<{ success: boolean; error?: string }> => {
    if (!isFirebaseConfigured()) {
      return { success: false, error: 'Phone sign-in is not configured.' };
    }
    setIsLoading(true);
    try {
      const result = await firestoreAuthService.verifyPhoneOTP(otp);
      if (result.success && result.user) {
        const u = result.user as User;
        if (u.createdAt && typeof (u.createdAt as any)?.toDate === 'function') {
          u.createdAt = (u.createdAt as any).toDate();
        } else if (u.createdAt && !(u.createdAt instanceof Date)) {
          u.createdAt = new Date(u.createdAt as any);
        }
        setUser(u);
        setStoredUser(u);
        setIsLoading(false);
        return { success: true };
      }
      setIsLoading(false);
      return { success: false, error: result.error };
    } catch (e: any) {
      setIsLoading(false);
      return { success: false, error: e?.message || 'Invalid OTP' };
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthReady, login, register, logout, updateUser, refreshUser, loginWithGoogle, sendPhoneOTP, verifyPhoneOTP }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
