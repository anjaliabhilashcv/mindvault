import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  onSnapshot, 
  query, 
  orderBy,
  Unsubscribe
} from 'firebase/firestore';
import { db, handleFirestoreError } from './firebase';
import { fetchWithAuth, safeParseJsonResponse } from './api';
import { 
  JournalEntry, 
  JournalAttachment,
  CreateEntryInput, 
  UpdateEntryInput, 
  AIAnalysis, 
  OperationType,
  AskJournalResponse,
  GrowthInsights,
  GrowthComparisonResult,
  DateRangeInput
} from '../types';

export function sanitizeAttachment(att: JournalAttachment): JournalAttachment {
  const clean: JournalAttachment = {
    id: att.id || `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    type: att.type || 'image',
    storagePath: att.storagePath || att.publicId || '',
    downloadUrl: att.downloadUrl || '',
    fileName: att.fileName || 'attachment',
    fileSize: typeof att.fileSize === 'number' && !isNaN(att.fileSize) ? att.fileSize : 0,
    mimeType: att.mimeType || 'image/jpeg',
    uploadedAt: att.uploadedAt || new Date().toISOString(),
  };

  if (att.publicId) clean.publicId = att.publicId;
  if (att.resourceType) clean.resourceType = att.resourceType;
  if (att.format) clean.format = att.format;
  if (typeof att.width === 'number' && !isNaN(att.width)) clean.width = att.width;
  if (typeof att.height === 'number' && !isNaN(att.height)) clean.height = att.height;
  if (typeof att.bytes === 'number' && !isNaN(att.bytes)) clean.bytes = att.bytes;
  if (att.createdAt) clean.createdAt = att.createdAt;
  if (att.entryId) clean.entryId = att.entryId;
  if (att.userId) clean.userId = att.userId;

  return clean;
}

/**
 * Recursively removes any keys with `undefined` values from an object or array
 * so that Firestore setDoc and updateDoc calls never receive `undefined`.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }

  if (typeof data === 'object') {
    if (data instanceof Date) {
      return data;
    }

    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as unknown as T;
  }

  return data;
}

export class JournalService {
  /**
   * Create a new journal entry under users/{userId}/entries/{entryId}
   */
  static async createEntry(userId: string, input: CreateEntryInput): Promise<JournalEntry> {
    if (!userId) throw new Error('Cannot create journal entry: user is not authenticated.');
    if (!input.title?.trim()) throw new Error('Please provide a title for your journal entry.');
    if (!input.content?.trim()) throw new Error('Journal entry content cannot be empty.');

    // Generate safe unique ID
    const entryId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();
    const entryPath = `users/${userId}/entries/${entryId}`;

    const cleanAttachments = Array.isArray(input.attachments)
      ? input.attachments.slice(0, 10).map((att) => sanitizeAttachment(att))
      : [];

    const newEntry: JournalEntry = {
      id: entryId,
      userId,
      title: input.title.trim().slice(0, 200),
      content: input.content.trim().slice(0, 20000),
      tags: input.tags?.map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 10) || [],
      attachments: cleanAttachments,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    if (input.mood && input.mood.trim()) {
      newEntry.mood = input.mood.trim();
    }

    const payload = sanitizeForFirestore(newEntry);

    try {
      const docRef = doc(db, 'users', userId, 'entries', entryId);
      await setDoc(docRef, payload as unknown as JournalEntry);
      return payload as JournalEntry;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, entryPath);
    }
  }

  /**
   * Real-time subscription to the user's journal entries, ordered chronologically
   */
  static subscribeEntries(
    userId: string,
    onSuccess: (entries: JournalEntry[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const entriesPath = `users/${userId}/entries`;
    const entriesRef = collection(db, 'users', userId, 'entries');
    const q = query(entriesRef, orderBy('createdAt', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const entries: JournalEntry[] = [];
        snapshot.forEach((docSnap) => {
          const raw = docSnap.data();
          entries.push({
            ...raw,
            version: typeof raw.version === 'number' && raw.version > 0 ? raw.version : 1,
          } as JournalEntry);
        });
        onSuccess(entries);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, entriesPath);
        } catch (wrappedError) {
          if (onError && wrappedError instanceof Error) {
            onError(wrappedError);
          }
        }
      }
    );
  }

  /**
   * Fetch a single journal entry
   */
  static async getEntry(userId: string, entryId: string): Promise<JournalEntry | null> {
    const entryPath = `users/${userId}/entries/${entryId}`;
    try {
      const docRef = doc(db, 'users', userId, 'entries', entryId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return null;
      const raw = snap.data();
      return {
        ...raw,
        version: typeof raw.version === 'number' && raw.version > 0 ? raw.version : 1,
      } as JournalEntry;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, entryPath);
    }
  }

  /**
   * Update an existing journal entry and increment its content version
   */
  static async updateEntry(
    userId: string, 
    entryId: string, 
    input: UpdateEntryInput
  ): Promise<number> {
    if (!userId || !entryId) throw new Error('Invalid user or entry ID for update');
    if (!input.title?.trim()) throw new Error('Title cannot be empty');
    if (!input.content?.trim()) throw new Error('Content cannot be empty');

    const entryPath = `users/${userId}/entries/${entryId}`;
    const nextVersion = (typeof input.currentVersion === 'number' && input.currentVersion > 0)
      ? input.currentVersion + 1
      : 2;

    const cleanAttachments = Array.isArray(input.attachments)
      ? input.attachments.slice(0, 10).map((att) => sanitizeAttachment(att))
      : [];

    const updates: Partial<JournalEntry> = {
      title: input.title.trim().slice(0, 200),
      content: input.content.trim().slice(0, 20000),
      tags: input.tags?.map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 10) || [],
      attachments: cleanAttachments,
      version: nextVersion,
      updatedAt: new Date().toISOString(),
    };

    if (input.mood && input.mood.trim()) {
      updates.mood = input.mood.trim();
    }

    const payload = sanitizeForFirestore(updates);

    try {
      const docRef = doc(db, 'users', userId, 'entries', entryId);
      await updateDoc(docRef, payload as unknown as Record<string, unknown>);
      return nextVersion;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, entryPath);
    }
  }

  /**
   * Delete an entry
   */
  static async deleteEntry(userId: string, entryId: string): Promise<void> {
    if (!userId || !entryId) throw new Error('Invalid user or entry ID for deletion');
    const entryPath = `users/${userId}/entries/${entryId}`;

    try {
      const docRef = doc(db, 'users', userId, 'entries', entryId);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, entryPath);
    }
  }

  /**
   * Save AI Analysis to an existing entry
   * Preserves original title, content, mood, tags, and createdAt.
   */
  static async saveAiAnalysis(
    userId: string,
    entryId: string,
    aiAnalysis: AIAnalysis
  ): Promise<void> {
    if (!userId || !entryId) throw new Error('Invalid user or entry ID for saving AI analysis');
    const entryPath = `users/${userId}/entries/${entryId}`;

    try {
      const docRef = doc(db, 'users', userId, 'entries', entryId);
      const payload = sanitizeForFirestore({
        aiAnalysis,
        updatedAt: new Date().toISOString(),
      });
      await updateDoc(docRef, payload as unknown as Record<string, unknown>);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, entryPath);
    }
  }

  /**
   * Phase 3: Ask My Journal Question
   * Calls secure backend endpoint with verified session token.
   */
  static async askJournalQuestion(question: string): Promise<AskJournalResponse> {
    if (!question || !question.trim()) {
      throw new Error('Please enter a question about your journal.');
    }

    const res = await fetchWithAuth('/api/ask-journal', {
      method: 'POST',
      body: JSON.stringify({ question: question.trim() }),
    });

    const data = await safeParseJsonResponse<AskJournalResponse>(res);

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to get answer from your journal.');
    }

    return data;
  }

  /**
   * Phase 4: Growth Intelligence Insights
   * Calls secure backend endpoint with verified session token.
   */
  static async getGrowthInsights(forceRefresh = false): Promise<GrowthInsights> {
    const res = await fetchWithAuth('/api/growth-insights', {
      method: 'POST',
      body: JSON.stringify({ forceRefresh }),
    });

    const data = await safeParseJsonResponse<{ success: boolean; insights?: GrowthInsights; error?: string }>(res);

    if (!res.ok || !data.success || !data.insights) {
      throw new Error(data.error || 'Failed to generate growth insights.');
    }

    return data.insights;
  }

  /**
   * Phase 5: Growth Comparison ("What Changed About Me?")
   * Compares two distinct date ranges using verified session token and server-side grounded synthesis.
   */
  static async compareGrowthPeriods(
    periodA: DateRangeInput,
    periodB: DateRangeInput
  ): Promise<GrowthComparisonResult> {
    const res = await fetchWithAuth('/api/growth-comparison', {
      method: 'POST',
      body: JSON.stringify({ periodA, periodB }),
    });

    const data = await safeParseJsonResponse<{
      success: boolean;
      comparison?: GrowthComparisonResult;
      error?: string;
    }>(res);

    if (!res.ok || !data.success || !data.comparison) {
      throw new Error(data.error || 'Failed to generate growth comparison.');
    }

    return data.comparison;
  }
}

