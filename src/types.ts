export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string | null;
  photoURL?: string | null;
  createdAt: string;
}

export interface AIAnalysis {
  overview: string;
  mood: string;
  emotions: string[];
  keyThemes: string[];
  importantThoughts: string[];
  significantEvents: string[];
  growthSignals: string[];
  reflectionQuestions: string[];
  analyzedAt: string; // ISO timestamp
  analysisVersion: number; // Journal content version this analysis was generated against
}

export type AttachmentType = 'image' | 'video';

export interface JournalAttachment {
  id: string;
  type: AttachmentType;
  storagePath: string; // contains publicId or storagePath for compatibility
  downloadUrl: string;
  fileName: string;
  fileSize: number; // in bytes
  mimeType: string;
  uploadedAt: string; // ISO string
  publicId?: string;
  resourceType?: string;
  format?: string;
  width?: number;
  height?: number;
  bytes?: number;
  createdAt?: string;
  entryId?: string;
  userId?: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  content: string;
  mood?: string;
  tags?: string[];
  attachments?: JournalAttachment[];
  version: number; // Content version (1 for initial creation, increments on edit)
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  aiAnalysis?: AIAnalysis;
}

export interface CreateEntryInput {
  title: string;
  content: string;
  mood?: string;
  tags?: string[];
  attachments?: JournalAttachment[];
}

export interface UpdateEntryInput {
  title: string;
  content: string;
  mood?: string;
  tags?: string[];
  attachments?: JournalAttachment[];
  currentVersion?: number;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
}

export interface SupportingEntryReference {
  entryId: string;
  title: string;
  date: string;
  mood?: string;
}

export interface AskJournalResponse {
  success: boolean;
  answer: string;
  confidence: 'high' | 'medium' | 'low';
  supportingEntries: SupportingEntryReference[];
  noEvidence?: boolean;
  error?: string;
}

export interface AskHistoryItem {
  id: string;
  question: string;
  answer: string;
  confidence: 'high' | 'medium' | 'low';
  supportingEntries: SupportingEntryReference[];
  noEvidence?: boolean;
  askedAt: string;
}

export interface MoodTrendPoint {
  date: string;
  mood: string;
  count: number;
}

export interface RecurringEmotion {
  emotion: string;
  count: number;
  percentage: number;
}

export interface RecurringTheme {
  theme: string;
  count: number;
  relatedTags: string[];
}

export interface GrowthSignalInsight {
  title: string;
  description: string;
  supportingEntryCount: number;
  evidenceDates: string[];
}

export interface RecurringChallenge {
  challenge: string;
  frequency: number;
  context: string;
}

export interface PositiveMoment {
  moment: string;
  date?: string;
  entryId: string;
}

export interface GrowthInsights {
  userId: string;
  generatedAt: string;
  version: number;
  totalEntriesAnalyzed: number;
  moodTrends: MoodTrendPoint[];
  recurringEmotions: RecurringEmotion[];
  recurringThemes: RecurringTheme[];
  growthSignals: GrowthSignalInsight[];
  recurringChallenges: RecurringChallenge[];
  positiveMoments: PositiveMoment[];
  longitudinalNarrative: string;
  hasEnoughData: boolean;
}

export interface DateRangeInput {
  startDate: string;
  endDate: string;
  label?: string;
}

export interface PeriodSummary {
  label: string;
  startDate: string;
  endDate: string;
  entryCount: number;
  entryIds: string[];
  dates: string[];
  predominantMood: string;
  moodDistribution: Array<{ mood: string; count: number; percentage: number }>;
  topEmotions: Array<{ emotion: string; count: number; percentage: number }>;
  topThemes: Array<{ theme: string; count: number; relatedTags?: string[] }>;
  challenges: Array<{ challenge: string; frequency: number; context?: string }>;
  growthSignals: Array<{ title: string; supportingEntryCount: number; evidenceDates: string[] }>;
  positiveMoments: Array<{ moment: string; date?: string; entryId: string }>;
}

export interface GrowthComparisonResult {
  periodA: PeriodSummary;
  periodB: PeriodSummary;
  hasEnoughData: boolean;
  emptyPeriodReason?: string;
  moodShift: {
    periodAPredominantMood: string;
    periodBPredominantMood: string;
    summary: string;
    details: string;
  };
  emotionalShifts: {
    emergingEmotions: Array<{ emotion: string; countInB: number }>;
    decliningEmotions: Array<{ emotion: string; countInA: number }>;
    persistentEmotions: Array<{ emotion: string; countInA: number; countInB: number }>;
    summary: string;
  };
  themeShifts: {
    newThemes: Array<{ theme: string; countInB: number }>;
    fadedThemes: Array<{ theme: string; countInA: number }>;
    continuedThemes: Array<{ theme: string; countInA: number; countInB: number }>;
    summary: string;
  };
  challengeProgress: {
    resolvedOrDecreasedChallenges: Array<{ challenge: string; periodAFrequency: number; periodBFrequency: number }>;
    newChallenges: Array<{ challenge: string; frequency: number }>;
    persistentChallenges: Array<{ challenge: string; periodAFrequency: number; periodBFrequency: number }>;
    summary: string;
  };
  growthTrajectory: {
    observedProgress: string[];
    evidenceEntryIds: {
      periodA: string[];
      periodB: string[];
    };
    evidenceDates: {
      periodA: string[];
      periodB: string[];
    };
  };
  overallNarrative: string;
  comparisonGeneratedAt: string;
}

export interface GrowthComparisonRequest {
  periodA: DateRangeInput;
  periodB: DateRangeInput;
}

export interface GrowthComparisonResponse {
  success: boolean;
  comparison?: GrowthComparisonResult;
  error?: string;
  errorCode?: string;
}

export interface AudioTranscriptionRequest {
  audioBase64: string;
  mimeType?: string;
  durationSeconds?: number;
}

export interface AudioTranscriptionResponse {
  success: boolean;
  transcript: string;
  suggestedTitle?: string;
  suggestedMood?: string;
  durationSeconds?: number;
  error?: string;
  errorCode?: string;
}

