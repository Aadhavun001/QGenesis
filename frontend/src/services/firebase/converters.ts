/**
 * Firestore Data Converters
 * 
 * Utility functions to convert between Firestore documents and app data types.
 * Handles timestamp conversions and data normalization.
 */

// import { Timestamp, DocumentData, QueryDocumentSnapshot, SnapshotOptions } from 'firebase/firestore';

/**
 * Convert Firestore Timestamp to JavaScript Date
 */
export const timestampToDate = (timestamp: any): Date => {
  if (!timestamp) return new Date();
  
  // If it's already a Date
  if (timestamp instanceof Date) return timestamp;
  
  // If it's a Firestore Timestamp
  if (timestamp?.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  
  // If it's a string or number
  if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    return new Date(timestamp);
  }
  
  // If it has seconds and nanoseconds (Firestore Timestamp structure)
  if (timestamp?.seconds !== undefined) {
    return new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000);
  }
  
  return new Date();
};

/**
 * Normalize any value to a valid Date for display. Returns null if invalid.
 */
export function toDateSafe(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof (value as any)?.toDate === 'function') {
    try {
      const d = (value as { toDate: () => Date }).toDate();
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'object' && 'seconds' in (value as object)) {
    const v = value as { seconds: number; nanoseconds?: number };
    const d = new Date(v.seconds * 1000 + ((v.nanoseconds || 0) / 1000000));
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Convert JavaScript Date to Firestore Timestamp
 * Uncomment when Firebase is installed
 */
// export const dateToTimestamp = (date: Date): Timestamp => {
//   return Timestamp.fromDate(date);
// };

/**
 * Convert all timestamp fields in an object to Dates
 */
export const convertTimestamps = <T extends Record<string, any>>(
  data: T,
  timestampFields: (keyof T)[]
): T => {
  const result = { ...data };
  
  for (const field of timestampFields) {
    if (result[field]) {
      (result as any)[field] = timestampToDate(result[field]);
    }
  }
  
  return result;
};

/**
 * Prepare data for Firestore by converting Dates to Timestamps
 * Uncomment when Firebase is installed
 */
// export const prepareForFirestore = <T extends Record<string, any>>(
//   data: T,
//   timestampFields: (keyof T)[]
// ): T => {
//   const result = { ...data };
//   
//   for (const field of timestampFields) {
//     if (result[field] instanceof Date) {
//       (result as any)[field] = dateToTimestamp(result[field] as Date);
//     }
//   }
//   
//   return result;
// };

/**
 * Generic Firestore converter factory
 * Creates type-safe converters for any document type
 * 
 * Uncomment when Firebase is installed:
 */
// export const createConverter = <T extends { id: string }>(
//   timestampFields: (keyof T)[]
// ) => ({
//   toFirestore: (data: T): DocumentData => {
//     const { id, ...rest } = data;
//     return prepareForFirestore(rest as any, timestampFields as any);
//   },
//   fromFirestore: (
//     snapshot: QueryDocumentSnapshot,
//     options: SnapshotOptions
//   ): T => {
//     const data = snapshot.data(options);
//     return {
//       id: snapshot.id,
//       ...convertTimestamps(data as any, timestampFields as any),
//     } as T;
//   },
// });

/**
 * Pre-defined converters for each collection type
 * Uncomment when Firebase is installed:
 */
// export const userConverter = createConverter<FirestoreUser>(['createdAt', 'updatedAt']);
// export const questionConverter = createConverter<FirestoreQuestion>([
//   'createdAt', 'updatedAt', 'lockedAt', 'unlockedAt', 'printedAt'
// ]);
// export const materialConverter = createConverter<FirestoreMaterial>([
//   'createdAt', 'updatedAt', 'processedAt'
// ]);
// export const paperConverter = createConverter<FirestorePaper>([
//   'createdAt', 'updatedAt', 'lockedAt', 'unlockedAt', 'printedAt'
// ]);
// export const notificationConverter = createConverter<FirestoreNotification>(['createdAt']);
// export const chatSessionConverter = createConverter<FirestoreChatSession>(['createdAt', 'updatedAt']);
// export const securityHistoryConverter = createConverter<FirestoreSecurityHistory>(['createdAt', 'timestamp']);

/**
 * Generate unique ID (matches existing app pattern)
 */
export const generateId = (prefix: string = 'doc'): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * ID generators for each collection type
 */
export const generateIds = {
  question: () => generateId('q'),
  material: () => generateId('m'),
  paper: () => generateId('paper'),
  notification: () => generateId('n'),
  chat: () => generateId('chat'),
  message: () => generateId('msg'),
  section: () => generateId('sec'),
  paperQuestion: () => generateId('pq'),
  securityHistory: () => generateId('sh'),
  user: () => generateId('user'),
  examType: () => generateId('exam'),
  questionBank: () => generateId('qb'),
  feedback: () => generateId('fb'),
  generatedQuestion: () => generateId('gq'),
};
