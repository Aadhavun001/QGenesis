/**
 * ============================================================================
 * FIREBASE STORAGE SERVICE
 * ============================================================================
 * 
 * Complete storage service with fallback to object URLs.
 * Firebase imports commented out until Firebase is installed.
 * 
 * ============================================================================
 */

import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata,
} from 'firebase/storage';
import { storage } from './firestore-config';
import { isFirebaseConfigured } from './firestore-config';

// ============================================================================
// TYPES
// ============================================================================

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
  state: 'running' | 'paused' | 'success' | 'canceled' | 'error';
}

export interface FileMetadata {
  name: string;
  size: number;
  contentType: string;
  timeCreated: string;
  updated: string;
  downloadUrl: string;
}

// ============================================================================
// STORAGE PATHS
// ============================================================================

export const STORAGE_PATHS = {
  materials: (userId: string, fileName: string) => `materials/${userId}/${fileName}`,
  avatars: (userId: string, fileName: string) => `avatars/${userId}/${fileName}`,
  assets: (fileName: string) => `assets/${fileName}`,
  /** Question paper PDF when submitted to HOD */
  paperPdf: (paperId: string) => `papers/${paperId}/question-paper.pdf`,
};

// ============================================================================
// STORAGE SERVICE
// ============================================================================

export const firestoreStorageService = {
  /**
   * Upload file with progress tracking
   */
  uploadFile: async (
    path: string,
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> => {
    if (isFirebaseConfigured() && storage) {
      try {
        const storageRef = ref(storage, path);
        if (onProgress) {
          const uploadTask = uploadBytesResumable(storageRef, file);
          return new Promise((resolve) => {
            uploadTask.on(
              'state_changed',
              (snapshot) => {
                onProgress({
                  bytesTransferred: snapshot.bytesTransferred,
                  totalBytes: snapshot.totalBytes,
                  percentage: (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
                  state: snapshot.state,
                });
              },
              (error) => resolve({ success: false, error: error.message }),
              async () => {
                const url = await getDownloadURL(uploadTask.snapshot.ref);
                resolve({ success: true, url });
              }
            );
          });
        } else {
          const snapshot = await uploadBytes(storageRef, file);
          const url = await getDownloadURL(snapshot.ref);
          return { success: true, url };
        }
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }
    // Fallback: Create object URL for local preview
    const url = URL.createObjectURL(file);
    if (onProgress) {
      onProgress({
        bytesTransferred: file.size,
        totalBytes: file.size,
        percentage: 100,
        state: 'success',
      });
    }
    return { success: true, url };
  },

  /**
   * Upload material file
   */
  uploadMaterial: async (
    userId: string,
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> => {
    const fileName = `${Date.now()}_${file.name}`;
    const path = STORAGE_PATHS.materials(userId, fileName);
    return await firestoreStorageService.uploadFile(path, file, onProgress);
  },

  /**
   * Upload avatar
   */
  uploadAvatar: async (
    userId: string,
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> => {
    const extension = file.name.split('.').pop() || 'jpg';
    const fileName = `avatar_${Date.now()}.${extension}`;
    const path = STORAGE_PATHS.avatars(userId, fileName);
    return await firestoreStorageService.uploadFile(path, file, onProgress);
  },

  /**
   * Delete file
   */
  deleteFile: async (path: string): Promise<{ success: boolean; error?: string }> => {
    if (isFirebaseConfigured() && storage) {
      try {
        const storageRef = ref(storage, path);
        await deleteObject(storageRef);
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }
    return { success: true };
  },

  /**
   * Get file download URL
   */
  getDownloadUrl: async (path: string): Promise<string | null> => {
    if (isFirebaseConfigured() && storage) {
      try {
        const storageRef = ref(storage, path);
        return await getDownloadURL(storageRef);
      } catch (error) {
        return null;
      }
    }
    return null;
  },

  /**
   * Convert file to base64
   */
  fileToBase64: (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  },

  /**
   * Validate file before upload
   */
  validateFile: (file: File, options: {
    maxSize?: number;
    allowedTypes?: string[];
  }): { valid: boolean; error?: string } => {
    const { maxSize = 50 * 1024 * 1024, allowedTypes } = options;

    if (file.size > maxSize) {
      return { valid: false, error: `File size exceeds ${maxSize / (1024 * 1024)}MB limit` };
    }

    if (allowedTypes && !allowedTypes.includes(file.type)) {
      return { valid: false, error: `File type ${file.type} is not allowed` };
    }

    return { valid: true };
  },
};

export default firestoreStorageService;
