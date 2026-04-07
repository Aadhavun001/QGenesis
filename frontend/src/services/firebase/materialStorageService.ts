/**
 * Material Storage Service
 *
 * Stores everything in Firestore under the user who uploaded:
 * - users/{userId}/materials/{materialId} — full material doc including extracted content
 * - users/{userId}/materials/{materialId}/chunks — NLP chunks
 * - users/{userId}/materials/{materialId}/topics — topics
 * Original files are stored in Cloud Storage at users/{userId}/materials/{materialId}/{fileName}.
 */

import {
  writeBatch,
  doc,
  setDoc,
  getDocs,
  collection,
  getDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { COLLECTIONS } from './collections';
import { generateIds, timestampToDate } from './converters';
import { db, storage, isFirebaseConfigured } from './firestore-config';
import type {
  FirestoreMaterial,
  FirestoreMaterialChunk,
  FirestoreMaterialTopic,
} from './types';
import type { NLPChunk, NLPTopic } from '@/stores/questionStore';

/** Firestore document size limit ~1 MiB; cap content to stay under it */
const MAX_CONTENT_CHARS = 900_000;

/** Firestore does not allow undefined; remove such fields before write */
function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as T;
}

// ============================================================================
// TYPES
// ============================================================================

export interface MaterialSaveInput {
  fileName: string;
  fileSize: number;
  fileType: string;
  totalPages: number;
  storageUrl: string;
  title: string;
  subject: string;
  department: string;
  semester?: string;
  regulation?: string;
  staffId: string;
  institution?: string;
  place?: string;
  wordCount: number;
  extractionMethod?: string;
  processingTimeMs?: number;
  /** Full extracted text (saved to Firestore; capped at MAX_CONTENT_CHARS). For full extraction includes [TABLE], [IMAGE/DIAGRAM TEXT], etc. */
  content?: string;
  /** "quick" = text-only fast extraction; "full" = tables, images, diagrams, OCR */
  extractionType?: 'quick' | 'full';
  // NLP data
  nlpChunks?: NLPChunk[];
  nlpTopics?: NLPTopic[];
  nlpKeywords?: string[];
  nlpKeyPhrases?: string[];
  nlpAcademicLevel?: string;
  vocabularyRichness?: number;
}

export interface MaterialWithAnalysis {
  material: FirestoreMaterial;
  chunks: FirestoreMaterialChunk[];
  topics: FirestoreMaterialTopic[];
}

// ============================================================================
// BATCH SIZE CONSTANTS
// ============================================================================

/** Firestore batch limit is 500 ops; we use 400 for safety margin */
const BATCH_LIMIT = 400;

// ============================================================================
// HELPER — Deterministic IDs for idempotent writes
// ============================================================================

const chunkDocId = (materialId: string, chunkId: number): string =>
  `${materialId}_chunk_${chunkId}`;

const topicDocId = (materialId: string, topicName: string): string =>
  `${materialId}_topic_${topicName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;

// ============================================================================
// MATERIAL STORAGE SERVICE (localStorage adapter — switch to Firestore later)
// ============================================================================

const MATERIAL_STORAGE_KEY = 'qgenesis-materials-store';

interface MaterialStore {
  materials: (FirestoreMaterial & { chunks?: FirestoreMaterialChunk[]; topics?: FirestoreMaterialTopic[] })[];
}

const getStore = (): MaterialStore => {
  try {
    const stored = localStorage.getItem(MATERIAL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : { materials: [] };
  } catch {
    return { materials: [] };
  }
};

const saveStore = (store: MaterialStore): void => {
  try {
    localStorage.setItem(MATERIAL_STORAGE_KEY, JSON.stringify(store));
  } catch (error) {
    console.error('Error saving material store:', error);
  }
};

// ============================================================================
// PUBLIC API
// ============================================================================

export const materialStorageService = {
  /**
   * Save a material with all its NLP chunks and topics.
   * Uses deterministic IDs so re-uploads overwrite cleanly.
   * 
   * When Firestore is integrated:
   * - Material doc goes to `materials/{materialId}`
   * - Chunks go to `materials/{materialId}/chunks/{chunkDocId}`
   * - Topics go to `materials/{materialId}/topics/{topicDocId}`
   * - All written in batched writes (max 400 ops per batch)
   */
  saveMaterial: async (input: MaterialSaveInput): Promise<string> => {
    const materialId = generateIds.material();
    const now = new Date();

    const contentRaw = input.content ?? '';
    const contentTruncated = contentRaw.length > MAX_CONTENT_CHARS;
    const content = contentTruncated ? contentRaw.slice(0, MAX_CONTENT_CHARS) : contentRaw;

    const material: FirestoreMaterial = {
      id: materialId,
      fileName: input.fileName,
      fileSize: input.fileSize,
      fileType: input.fileType,
      totalPages: input.totalPages,
      storageUrl: input.storageUrl,
      title: input.title,
      subject: input.subject,
      department: input.department,
      semester: input.semester,
      regulation: input.regulation,
      staffId: input.staffId,
      institution: input.institution,
      place: input.place,
      status: 'ready',
      content: content || undefined,
      contentTruncated: contentTruncated || undefined,
      globalKeywords: input.nlpKeywords || [],
      globalKeyPhrases: input.nlpKeyPhrases || [],
      academicLevel: input.nlpAcademicLevel || 'undergraduate',
      chunkCount: input.nlpChunks?.length || 0,
      vocabularyRichness: input.vocabularyRichness || 0,
      wordCount: input.wordCount,
      extractionMethod: input.extractionMethod,
      processingTimeMs: input.processingTimeMs,
      processedAt: now,
      createdAt: now,
      updatedAt: now,
      topicNames: input.nlpTopics?.map(t => t.name) || [],
      extractionType: input.extractionType || 'quick',
    };

    // Build chunk documents
    const chunks: FirestoreMaterialChunk[] = (input.nlpChunks || []).map(chunk => ({
      id: chunkDocId(materialId, chunk.chunkId),
      materialId,
      staffId: input.staffId,
      chunkId: chunk.chunkId,
      chunkType: chunk.chunkType,
      title: chunk.title,
      text: chunk.text,
      sentences: chunk.sentences,
      keywords: chunk.metadata.keywords,
      keyPhrases: chunk.metadata.keyPhrases,
      estimatedDifficulty: chunk.metadata.estimatedDifficulty,
      wordCount: chunk.metadata.wordCount,
      sentenceCount: chunk.metadata.sentenceCount,
      hasDefinitions: chunk.metadata.hasDefinitions,
      hasFormulas: chunk.metadata.hasFormulas,
      hasExamples: chunk.metadata.hasExamples,
      namedEntities: chunk.metadata.namedEntities,
      createdAt: now,
    }));

    // Build topic documents
    const topics: FirestoreMaterialTopic[] = (input.nlpTopics || []).map(topic => ({
      id: topicDocId(materialId, topic.name),
      materialId,
      staffId: input.staffId,
      name: topic.name,
      relevance: topic.relevance,
      subtopics: topic.subtopics,
      keywords: topic.keywords,
      chunkIds: topic.chunkIds,
    }));

    const userId = input.staffId;

    if (isFirebaseConfigured() && db && userId) {
      const materialRef = doc(db, COLLECTIONS.USERS, userId, 'materials', materialId);
      let batch = writeBatch(db);
      batch.set(materialRef, stripUndefined(material as Record<string, unknown>));
      let opCount = 1;
      for (const chunk of chunks) {
        if (opCount >= BATCH_LIMIT) {
          await batch.commit();
          batch = writeBatch(db);
          opCount = 0;
        }
        batch.set(
          doc(db, COLLECTIONS.USERS, userId, 'materials', materialId, 'chunks', chunk.id),
          stripUndefined(chunk as Record<string, unknown>)
        );
        opCount++;
      }
      for (const topic of topics) {
        if (opCount >= BATCH_LIMIT) {
          await batch.commit();
          batch = writeBatch(db);
          opCount = 0;
        }
        batch.set(
          doc(db, COLLECTIONS.USERS, userId, 'materials', materialId, 'topics', topic.id),
          stripUndefined(topic as Record<string, unknown>)
        );
        opCount++;
      }
      await batch.commit();
      console.log(`[MaterialStorage] Saved material ${materialId} to Firestore (users/${userId}/materials) with ${chunks.length} chunks and ${topics.length} topics`);
    } else {
      const store = getStore();
      store.materials.push({ ...material, chunks, topics });
      saveStore(store);
      if (!userId) console.warn('[MaterialStorage] No user ID (not signed in?) — saved to this device only (localStorage). Sign in to save to Firestore.');
      else console.log(`[MaterialStorage] Saved material ${materialId} to device only with ${chunks.length} chunks and ${topics.length} topics`);
    }
    return materialId;
  },

  /**
   * Get a material with its chunks and topics. When using Firestore, pass staffId (owner).
   */
  getMaterialWithAnalysis: async (
    materialId: string,
    staffId?: string
  ): Promise<MaterialWithAnalysis | null> => {
    if (isFirebaseConfigured() && db && staffId) {
      const materialRef = doc(db, COLLECTIONS.USERS, staffId, 'materials', materialId);
      const materialSnap = await getDoc(materialRef);
      if (!materialSnap.exists()) return null;
      const material = { id: materialSnap.id, ...materialSnap.data() } as FirestoreMaterial;
      const chunksSnap = await getDocs(collection(db, COLLECTIONS.USERS, staffId, 'materials', materialId, 'chunks'));
      const topicsSnap = await getDocs(collection(db, COLLECTIONS.USERS, staffId, 'materials', materialId, 'topics'));
      const chunks = chunksSnap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreMaterialChunk));
      const topics = topicsSnap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreMaterialTopic));
      return { material, chunks, topics };
    }
    const store = getStore();
    const entry = store.materials.find(m => m.id === materialId);
    if (!entry) return null;
    const { chunks = [], topics = [], ...material } = entry;
    return { material, chunks, topics };
  },

  /**
   * Get all materials for a staff member (from users/{staffId}/materials when using Firestore).
   */
  getMaterialsByStaff: async (staffId: string): Promise<FirestoreMaterial[]> => {
    if (isFirebaseConfigured() && db) {
      const q = query(
        collection(db, COLLECTIONS.USERS, staffId, 'materials'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreMaterial));
    }
    const store = getStore();
    return store.materials
      .filter(m => m.staffId === staffId)
      .map(({ chunks, topics, ...material }) => material);
  },

  /**
   * Get all materials (localStorage fallback only; Firestore uses getMaterialsByStaff).
   */
  getAllMaterials: (): FirestoreMaterial[] => {
    const store = getStore();
    return store.materials.map(({ chunks, topics, ...material }) => material);
  },

  /**
   * Get chunks for a material. Pass staffId when using Firestore.
   */
  getChunks: async (materialId: string, staffId?: string): Promise<FirestoreMaterialChunk[]> => {
    if (isFirebaseConfigured() && db && staffId) {
      const snap = await getDocs(collection(db, COLLECTIONS.USERS, staffId, 'materials', materialId, 'chunks'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreMaterialChunk));
    }
    const store = getStore();
    const entry = store.materials.find(m => m.id === materialId);
    return entry?.chunks || [];
  },

  /**
   * Get topics for a material. Pass staffId when using Firestore.
   */
  getTopics: async (materialId: string, staffId?: string): Promise<FirestoreMaterialTopic[]> => {
    if (isFirebaseConfigured() && db && staffId) {
      const snap = await getDocs(collection(db, COLLECTIONS.USERS, staffId, 'materials', materialId, 'topics'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreMaterialTopic));
    }
    const store = getStore();
    const entry = store.materials.find(m => m.id === materialId);
    return entry?.topics || [];
  },

  /**
   * Delete a material and its subcollections. Pass staffId when using Firestore.
   */
  deleteMaterial: async (materialId: string, staffId?: string): Promise<void> => {
    if (isFirebaseConfigured() && db && staffId) {
      const batch = writeBatch(db);
      const chunksSnap = await getDocs(collection(db, COLLECTIONS.USERS, staffId, 'materials', materialId, 'chunks'));
      chunksSnap.docs.forEach(d => batch.delete(d.ref));
      const topicsSnap = await getDocs(collection(db, COLLECTIONS.USERS, staffId, 'materials', materialId, 'topics'));
      topicsSnap.docs.forEach(d => batch.delete(d.ref));
      batch.delete(doc(db, COLLECTIONS.USERS, staffId, 'materials', materialId));
      await batch.commit();
    } else {
      const store = getStore();
      store.materials = store.materials.filter(m => m.id !== materialId);
      saveStore(store);
    }
  },

  /**
   * Update material (e.g. set storageUrl after uploading file). Pass staffId when using Firestore.
   */
  updateMaterial: async (
    materialId: string,
    updates: Partial<FirestoreMaterial>,
    staffId?: string
  ): Promise<void> => {
    if (isFirebaseConfigured() && db && staffId) {
      await updateDoc(doc(db, COLLECTIONS.USERS, staffId, 'materials', materialId), {
        ...stripUndefined(updates as Record<string, unknown>),
        updatedAt: serverTimestamp(),
      });
    } else {
      const store = getStore();
      const index = store.materials.findIndex(m => m.id === materialId);
      if (index !== -1) {
        store.materials[index] = {
          ...store.materials[index],
          ...updates,
          updatedAt: new Date(),
        };
        saveStore(store);
      }
    }
  },

  /**
   * Upload original file to Cloud Storage under users/{userId}/materials/{materialId}/{fileName}.
   * Returns the download URL to store in material.storageUrl.
   */
  uploadMaterialFile: async (
    userId: string,
    materialId: string,
    file: File
  ): Promise<string> => {
    if (!isFirebaseConfigured() || !storage) throw new Error('Firebase Storage not configured');
    const path = `users/${userId}/materials/${materialId}/${file.name}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  },
};
