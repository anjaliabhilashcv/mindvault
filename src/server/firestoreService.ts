import firebaseConfig from '../../firebase-applet-config.json';
import { JournalAttachment } from '../types';

export interface AuthoritativeJournalEntry {
  id: string;
  userId: string;
  title: string;
  content: string;
  mood?: string;
  tags?: string[];
  attachments?: JournalAttachment[];
  version: number;
  createdAt?: string;
  updatedAt?: string;
  aiAnalysis?: Record<string, unknown>;
}

interface FirestoreValue {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  arrayValue?: { values?: FirestoreValue[] };
  mapValue?: { fields?: Record<string, FirestoreValue> };
  timestampValue?: string;
}

interface FirestoreDocumentResponse {
  name: string;
  fields?: Record<string, FirestoreValue>;
  createTime?: string;
  updateTime?: string;
}

function parseFirestoreValue(val: FirestoreValue): unknown {
  if (val.stringValue !== undefined) return val.stringValue;
  if (val.booleanValue !== undefined) return val.booleanValue;
  if (val.integerValue !== undefined) return parseInt(val.integerValue, 10);
  if (val.doubleValue !== undefined) return val.doubleValue;
  if (val.timestampValue !== undefined) return val.timestampValue;
  if (val.arrayValue) {
    return (val.arrayValue.values || []).map(parseFirestoreValue);
  }
  if (val.mapValue?.fields) {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val.mapValue.fields)) {
      obj[k] = parseFirestoreValue(v);
    }
    return obj;
  }
  return null;
}

function parseFirestoreDoc(doc: FirestoreDocumentResponse): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (!doc.fields) return result;
  for (const [key, val] of Object.entries(doc.fields)) {
    result[key] = parseFirestoreValue(val);
  }
  return result;
}

function toFirestoreValue(val: unknown): FirestoreValue {
  if (val === null || val === undefined) {
    return { stringValue: '' };
  }
  if (typeof val === 'string') {
    return { stringValue: val };
  }
  if (typeof val === 'boolean') {
    return { booleanValue: val };
  }
  if (typeof val === 'number') {
    if (Number.isInteger(val)) {
      return { integerValue: val.toString() };
    }
    return { doubleValue: val };
  }
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map(toFirestoreValue),
      },
    };
  }
  if (typeof val === 'object') {
    const fields: Record<string, FirestoreValue> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (v !== undefined) {
        fields[k] = toFirestoreValue(v);
      }
    }
    return {
      mapValue: { fields },
    };
  }
  return { stringValue: String(val) };
}

function toFirestoreDocFields(obj: Record<string, unknown>): Record<string, FirestoreValue> {
  const fields: Record<string, FirestoreValue> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      fields[k] = toFirestoreValue(v);
    }
  }
  return fields;
}

export class FirestoreServerService {
  /**
   * Retrieves an authoritative journal entry from Firestore for the verified user.
   * Enforces zero-trust data retrieval scoped strictly to users/{userId}/entries/{entryId}.
   */
  static async getAuthoritativeEntry(
    userId: string,
    entryId: string,
    idToken: string
  ): Promise<AuthoritativeJournalEntry | null> {
    if (!userId || !entryId) {
      throw new Error('Invalid user ID or entry ID');
    }

    const projectId = firebaseConfig.projectId;
    const databaseId = firebaseConfig.firestoreDatabaseId;
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/users/${encodeURIComponent(
      userId
    )}/entries/${encodeURIComponent(entryId)}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${idToken}`,
        Accept: 'application/json',
      },
    });

    if (res.status === 404) {
      return null;
    }

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      console.error(`[Firestore REST error ${res.status}] getAuthoritativeEntry:`, errorText);
      if (res.status === 401 || res.status === 403) {
        throw new Error(`Access denied: Unauthorized to read the requested entry from Firestore (${res.status}).`);
      }
      throw new Error(`Failed to fetch entry from database (status ${res.status}).`);
    }

    const data = (await res.json()) as FirestoreDocumentResponse;
    const parsed = parseFirestoreDoc(data) as Partial<AuthoritativeJournalEntry>;

    // Rigorous ownership and shape validation
    if (parsed.userId && parsed.userId !== userId) {
      throw new Error('Ownership mismatch: The entry does not belong to the authenticated user.');
    }

    const versionNum = typeof parsed.version === 'number' && parsed.version > 0
      ? parsed.version
      : 1;

    return {
      id: (parsed.id as string) || entryId,
      userId: (parsed.userId as string) || userId,
      title: (parsed.title as string) || 'Untitled Entry',
      content: (parsed.content as string) || '',
      mood: (parsed.mood as string) || undefined,
      tags: Array.isArray(parsed.tags) ? (parsed.tags as string[]) : [],
      attachments: Array.isArray(parsed.attachments) ? (parsed.attachments as JournalAttachment[]) : [],
      version: versionNum,
      createdAt: (parsed.createdAt as string) || undefined,
      updatedAt: (parsed.updatedAt as string) || undefined,
      aiAnalysis: parsed.aiAnalysis ? (parsed.aiAnalysis as Record<string, unknown>) : undefined,
    };
  }

  /**
   * Retrieves all authoritative journal entries belonging exclusively to the verified user.
   * Scoped strictly to users/{userId}/entries using Firestore REST runQuery.
   */
  static async getAllAuthoritativeEntries(
    userId: string,
    idToken: string,
    maxLimit = 100
  ): Promise<AuthoritativeJournalEntry[]> {
    if (!userId) {
      throw new Error('Invalid user ID');
    }

    const projectId = firebaseConfig.projectId;
    const databaseId = firebaseConfig.firestoreDatabaseId;
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/users/${encodeURIComponent(
      userId
    )}:runQuery`;

    const requestBody = {
      structuredQuery: {
        from: [{ collectionId: 'entries' }],
        limit: maxLimit,
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      console.error(`[Firestore REST runQuery error ${res.status}] getAllAuthoritativeEntries:`, errorText);
      if (res.status === 401 || res.status === 403) {
        throw new Error(`Access denied: Unauthorized to read entries from Firestore (${res.status}).`);
      }
      throw new Error(`Failed to query entries from database (status ${res.status}).`);
    }

    const results = (await res.json()) as Array<{ document?: FirestoreDocumentResponse }>;
    if (!Array.isArray(results)) {
      return [];
    }

    const entries: AuthoritativeJournalEntry[] = [];
    for (const item of results) {
      if (!item.document) {
        continue;
      }
      const doc = item.document;
      const parsed = parseFirestoreDoc(doc) as Partial<AuthoritativeJournalEntry>;
      // Strict ownership check
      if (parsed.userId && parsed.userId !== userId) {
        continue;
      }

      // Extract entry ID from path if not in fields
      const docName = doc.name || '';
      const pathParts = docName.split('/');
      const derivedId = pathParts[pathParts.length - 1] || 'unknown';

      const versionNum = typeof parsed.version === 'number' && parsed.version > 0
        ? parsed.version
        : 1;

      entries.push({
        id: (parsed.id as string) || derivedId,
        userId: (parsed.userId as string) || userId,
        title: (parsed.title as string) || 'Untitled Entry',
        content: (parsed.content as string) || '',
        mood: (parsed.mood as string) || undefined,
        tags: Array.isArray(parsed.tags) ? (parsed.tags as string[]) : [],
        attachments: Array.isArray(parsed.attachments) ? (parsed.attachments as JournalAttachment[]) : [],
        version: versionNum,
        createdAt: (parsed.createdAt as string) || undefined,
        updatedAt: (parsed.updatedAt as string) || undefined,
        aiAnalysis: parsed.aiAnalysis ? (parsed.aiAnalysis as Record<string, unknown>) : undefined,
      });
    }

    // Sort by createdAt desc
    entries.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    return entries;
  }

  /**
   * Retrieves authoritative growth insights document for the verified user.
   * Scoped strictly to users/{userId}/profile/growth_insights.
   */
  static async getAuthoritativeGrowthInsights(
    userId: string,
    idToken: string
  ): Promise<Record<string, unknown> | null> {
    if (!userId) {
      throw new Error('Invalid user ID');
    }

    const projectId = firebaseConfig.projectId;
    const databaseId = firebaseConfig.firestoreDatabaseId;
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/users/${encodeURIComponent(
      userId
    )}/profile/growth_insights`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${idToken}`,
        Accept: 'application/json',
      },
    });

    if (res.status === 404) {
      return null;
    }

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      console.warn(`[Firestore REST warn ${res.status}] getAuthoritativeGrowthInsights:`, errorText);
      return null;
    }

    const data = (await res.json()) as FirestoreDocumentResponse;
    const parsed = parseFirestoreDoc(data);

    if (parsed.userId && parsed.userId !== userId) {
      throw new Error('Ownership mismatch: Growth insights do not belong to authenticated user.');
    }

    return parsed;
  }

  /**
   * Saves authoritative growth insights document for the verified user.
   * Scoped strictly to users/{userId}/profile/growth_insights.
   */
  static async saveAuthoritativeGrowthInsights(
    userId: string,
    insights: Record<string, unknown>,
    idToken: string
  ): Promise<void> {
    if (!userId) {
      throw new Error('Invalid user ID');
    }

    const projectId = firebaseConfig.projectId;
    const databaseId = firebaseConfig.firestoreDatabaseId;
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/users/${encodeURIComponent(
      userId
    )}/profile/growth_insights`;

    const fields = toFirestoreDocFields({
      ...insights,
      userId,
      updatedAt: new Date().toISOString(),
    });

    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ fields }),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      console.error(`[Firestore REST save error ${res.status}] saveAuthoritativeGrowthInsights:`, errorText);
      throw new Error(`Failed to persist growth insights (status ${res.status}).`);
    }
  }
}


