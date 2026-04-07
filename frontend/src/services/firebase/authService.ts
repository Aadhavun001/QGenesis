/**
 * Authentication Service
 * 
 * Handles user authentication operations.
 * Ready for Firebase Auth integration.
 * 
 * INTEGRATION: Replace localStorage-based auth with Firebase Auth
 * when you run "integrate with firestore database" in Cursor.
 */

import { generateIds } from './converters';
import type { FirestoreUser } from './types';

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

export interface PhoneLoginData {
  phone: string;
  otp: string;
}

// ============================================================================
// STORAGE HELPERS
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

// ============================================================================
// MOCK ADMIN USER
// ============================================================================

const MOCK_ADMIN: FirestoreUser & { password: string } = {
  id: 'admin-1',
  email: 'admin@qgenesis.com',
  displayName: 'System Administrator',
  role: 'admin',
  password: 'admin123',
  createdAt: new Date(),
};

// ============================================================================
// AUTH SERVICE
// ============================================================================

export const authService = {
  /**
   * Get current authenticated user
   */
  getCurrentUser: (): FirestoreUser | null => {
    // When Firebase is integrated:
    // return auth.currentUser ? userService.getUserById(auth.currentUser.uid) : null;
    
    const stored = sessionStorage.getItem('qgenesis_user') ?? localStorage.getItem('qgenesis_user');
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
  login: async (credentials: LoginCredentials): Promise<AuthResult> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const { email, password } = credentials;

    // Check if blocked
    const blockedUsers = getBlockedUsers();
    const blockedUserData = getBlockedUserData();

    for (const blockedId of blockedUsers) {
      const blockedData = blockedUserData[blockedId];
      if (blockedData?.email === email) {
        return { 
          success: false, 
          error: 'Your account has been blocked. Please contact administrator.' 
        };
      }
    }

    // Check managed users
    const managedUsers = getManagedUsers();
    const passwords = getPasswords();
    const managedUser = managedUsers.find(u => u.email === email);
    
    if (managedUser) {
      if (blockedUsers.includes(managedUser.id)) {
        return { 
          success: false, 
          error: 'Your account has been blocked. Please contact administrator.' 
        };
      }
      
      if (passwords[managedUser.id] === password) {
        sessionStorage.setItem('qgenesis_user', JSON.stringify(managedUser));
        return { success: true, user: managedUser };
      }
    }

    // Check registered users
    const registeredUsers = getRegisteredUsers();
    const registeredUser = registeredUsers.find(u => u.email === email && u.password === password);
    
    if (registeredUser) {
      if (blockedUsers.includes(registeredUser.id)) {
        return { 
          success: false, 
          error: 'Your account has been blocked. Please contact administrator.' 
        };
      }
      
      const { password: _, ...userWithoutPassword } = registeredUser;
      sessionStorage.setItem('qgenesis_user', JSON.stringify(userWithoutPassword));
      return { success: true, user: userWithoutPassword };
    }

    // Check mock admin
    if (email === MOCK_ADMIN.email && password === MOCK_ADMIN.password) {
      const { password: _, ...adminWithoutPassword } = MOCK_ADMIN;
      sessionStorage.setItem('qgenesis_user', JSON.stringify(adminWithoutPassword));
      return { success: true, user: adminWithoutPassword };
    }

    return { success: false, error: 'Invalid email or password' };
  },

  /**
   * Register new user
   */
  register: async (data: RegisterData): Promise<AuthResult> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if blocked
    const blockedUsers = getBlockedUsers();
    const blockedUserData = getBlockedUserData();

    for (const blockedId of blockedUsers) {
      const blockedData = blockedUserData[blockedId];
      if (blockedData?.email === data.email || blockedData?.phone === data.phone) {
        return { 
          success: false, 
          error: 'This email or phone number is blocked. Please use different credentials.' 
        };
      }
    }

    // Check for existing users
    if (data.email === MOCK_ADMIN.email) {
      return { success: false, error: 'User already exists with this email' };
    }

    const registeredUsers = getRegisteredUsers();
    if (registeredUsers.find(u => u.email === data.email)) {
      return { success: false, error: 'User already exists with this email' };
    }

    const managedUsers = getManagedUsers();
    if (managedUsers.find(u => u.email === data.email)) {
      return { success: false, error: 'User already exists with this email' };
    }

    // Create new user
    const newUser: FirestoreUser & { password: string } = {
      id: generateIds.user(),
      email: data.email,
      displayName: data.displayName,
      role: data.role,
      phone: data.phone,
      department: data.department,
      institution: data.institution,
      place: data.place,
      password: data.password,
      status: 'active',
      createdAt: new Date(),
    };

    // Save to registered users
    registeredUsers.push(newUser);
    saveRegisteredUsers(registeredUsers);

    // Add to managed users for admin visibility
    const { password: _, ...userWithoutPassword } = newUser;
    managedUsers.push(userWithoutPassword);
    localStorage.setItem('qgenesis-managed-users', JSON.stringify(managedUsers));

    // Store password
    const passwords = getPasswords();
    passwords[newUser.id] = data.password;
    localStorage.setItem('qgenesis-passwords', JSON.stringify(passwords));

    return { success: true, user: userWithoutPassword };
  },

  /**
   * Logout current user
   */
  logout: (): void => {
    // When Firebase is integrated:
    // await signOut(auth);
    
    sessionStorage.removeItem('qgenesis_user');
    localStorage.removeItem('qgenesis_user');
    window.dispatchEvent(new Event('auth-logout'));
  },

  /**
   * Update current user profile
   */
  updateProfile: (updates: Partial<FirestoreUser>): FirestoreUser | null => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) return null;

    const updatedUser = { ...currentUser, ...updates };
    sessionStorage.setItem('qgenesis_user', JSON.stringify(updatedUser));
    window.dispatchEvent(new Event('user-updated'));
    
    return updatedUser;
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: (): boolean => {
    return authService.getCurrentUser() !== null;
  },

  /**
   * Check if user has specific role
   */
  hasRole: (role: 'staff' | 'hod' | 'admin'): boolean => {
    const user = authService.getCurrentUser();
    return user?.role === role;
  },

  /**
   * Reset password (placeholder for Firebase integration)
   */
  resetPassword: async (email: string): Promise<AuthResult> => {
    // When Firebase is integrated:
    // await sendPasswordResetEmail(auth, email);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if email exists
    const allUsers = [...getRegisteredUsers(), ...getManagedUsers()];
    const userExists = allUsers.some(u => u.email === email) || email === MOCK_ADMIN.email;
    
    if (!userExists) {
      return { success: false, error: 'No account found with this email' };
    }
    
    return { success: true };
  },

  /**
   * Verify phone OTP (placeholder for Firebase integration)
   */
  verifyPhoneOTP: async (data: PhoneLoginData): Promise<AuthResult> => {
    // When Firebase is integrated:
    // const confirmation = window.confirmationResult;
    // const result = await confirmation.confirm(data.otp);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock verification (any 6-digit OTP works)
    if (data.otp.length !== 6) {
      return { success: false, error: 'Invalid OTP' };
    }
    
    // Find user by phone
    const allUsers = [...getRegisteredUsers(), ...getManagedUsers()];
    const user = allUsers.find(u => u.phone === data.phone);
    
    if (user) {
      const { password: _, ...userWithoutPassword } = user as any;
      sessionStorage.setItem('qgenesis_user', JSON.stringify(userWithoutPassword));
      return { success: true, user: userWithoutPassword };
    }
    
    return { success: false, error: 'No account found with this phone number' };
  },

  /**
   * Send phone OTP (placeholder for Firebase integration)
   */
  sendPhoneOTP: async (phone: string): Promise<AuthResult> => {
    // When Firebase is integrated:
    // const appVerifier = new RecaptchaVerifier('recaptcha-container', {}, auth);
    // window.confirmationResult = await signInWithPhoneNumber(auth, phone, appVerifier);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { success: true };
  },

  /**
   * Block user (admin only)
   */
  blockUser: (userId: string): void => {
    const blockedUsers = getBlockedUsers();
    if (!blockedUsers.includes(userId)) {
      blockedUsers.push(userId);
      localStorage.setItem('qgenesis-blocked-users', JSON.stringify(blockedUsers));
    }
    
    // Store user data for blocking check
    const managedUsers = getManagedUsers();
    const user = managedUsers.find(u => u.id === userId);
    if (user) {
      const blockedUserData = getBlockedUserData();
      blockedUserData[userId] = { email: user.email, phone: user.phone };
      localStorage.setItem('qgenesis-blocked-user-data', JSON.stringify(blockedUserData));
    }
  },

  /**
   * Unblock user (admin only)
   */
  unblockUser: (userId: string): void => {
    const blockedUsers = getBlockedUsers();
    const index = blockedUsers.indexOf(userId);
    if (index !== -1) {
      blockedUsers.splice(index, 1);
      localStorage.setItem('qgenesis-blocked-users', JSON.stringify(blockedUsers));
    }
    
    // Remove from blocked data
    const blockedUserData = getBlockedUserData();
    delete blockedUserData[userId];
    localStorage.setItem('qgenesis-blocked-user-data', JSON.stringify(blockedUserData));
  },

  /**
   * Check if user is blocked
   */
  isUserBlocked: (userId: string): boolean => {
    return getBlockedUsers().includes(userId);
  },
};
