import { AuthoritativeJournalEntry } from './firestoreService';

export interface JournalMemory {
  entryId: string;
  title: string;
  content: string;
  createdAt: string;
  mood?: string;
  tags: string[];
  aiAnalysis?: {
    overview?: string;
    mood?: string;
    emotions?: string[];
    keyThemes?: string[];
    importantThoughts?: string[];
    significantEvents?: string[];
    growthSignals?: string[];
    reflectionQuestions?: string[];
  };
  relevanceScore: number;
  matchReasons: string[];
}

export interface RetrievalResult {
  memories: JournalMemory[];
  totalCandidateCount: number;
  isBroadQuery: boolean;
  temporalIntent?: 'recent' | 'last_time' | 'earliest' | 'past_month';
  hasSufficientEvidence: boolean;
}

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
  'any', 'are', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below',
  'between', 'both', 'but', 'by', 'can', 'could', 'did', 'do', 'does', 'doing',
  'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have',
  'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how',
  'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more',
  'most', 'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once',
  'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same',
  'she', 'should', 'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs',
  'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through',
  'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when',
  'where', 'which', 'while', 'who', 'whom', 'why', 'will', 'with', 'would', 'you',
  'your', 'yours', 'yourself', 'yourselves', 'tell', 'mention', 'mentioned', 'write',
  'wrote', 'journal', 'entries', 'entry'
]);

// Semantic keyword expansion mapping
const SYNONYMS: Record<string, string[]> = {
  stress: ['stressed', 'stressful', 'anxious', 'anxiety', 'nervous', 'pressure', 'worried', 'worry', 'overwhelmed'],
  stressed: ['stress', 'stressful', 'anxious', 'anxiety', 'nervous', 'pressure', 'worried', 'worry'],
  anxiety: ['anxious', 'stress', 'stressed', 'nervous', 'worry', 'worried', 'fear'],
  proud: ['pride', 'accomplishment', 'accomplished', 'achievement', 'achieved', 'happy', 'success', 'confidence'],
  pride: ['proud', 'accomplished', 'achievement'],
  goal: ['goals', 'aim', 'ambition', 'target', 'aspire', 'project', 'plan', 'progress'],
  goals: ['goal', 'aim', 'ambition', 'target', 'aspire', 'project', 'plan', 'progress'],
  internship: ['internships', 'intern', 'job', 'career', 'interview', 'application', 'apply', 'applying', 'work'],
  internships: ['internship', 'intern', 'job', 'career', 'interview', 'application', 'apply', 'applying', 'work'],
  work: ['job', 'career', 'office', 'project', 'boss', 'team', 'colleague', 'internship'],
  learn: ['learning', 'learned', 'study', 'studying', 'growth', 'skill', 'skills', 'course'],
  learning: ['learn', 'learned', 'study', 'studying', 'growth', 'skill', 'skills'],
  change: ['changed', 'changing', 'growth', 'evolve', 'evolved', 'different', 'priorities', 'priority'],
  problem: ['problems', 'challenge', 'challenges', 'struggle', 'struggles', 'obstacle', 'issue', 'issues', 'difficult'],
  sad: ['depressed', 'down', 'unhappy', 'lonely', 'heartbroken', 'grief', 'upset'],
  happy: ['joy', 'excited', 'grateful', 'glad', 'cheerful', 'content', 'peaceful'],
};

export class RetrievalService {
  /**
   * Main retrieval method that selects the most relevant journal memories
   * for an authenticated user's question.
   */
  static retrieveRelevantMemories(
    entries: AuthoritativeJournalEntry[],
    question: string,
    maxLimit = 6
  ): RetrievalResult {
    if (!entries || entries.length === 0 || !question?.trim()) {
      return {
        memories: [],
        totalCandidateCount: 0,
        isBroadQuery: false,
        hasSufficientEvidence: false,
      };
    }

    const cleanQuestion = question.trim().toLowerCase();
    const tokens = this.tokenize(cleanQuestion);
    const expandedKeywords = this.expandKeywords(tokens);

    // Detect temporal intent
    let temporalIntent: 'recent' | 'last_time' | 'earliest' | 'past_month' | undefined;
    if (/\b(when\s+did\s+i\s+last|last\s+time|most\s+recent|latest)\b/.test(cleanQuestion)) {
      temporalIntent = 'last_time';
    } else if (/\b(first\s+time|when\s+did\s+i\s+first|earliest|beginning)\b/.test(cleanQuestion)) {
      temporalIntent = 'earliest';
    } else if (/\b(last\s+month|past\s+month)\b/.test(cleanQuestion)) {
      temporalIntent = 'past_month';
    } else if (/\b(lately|recently|recent|these\s+days|this\s+week|past\s+week|now)\b/.test(cleanQuestion)) {
      temporalIntent = 'recent';
    }

    // Detect broad / general overview intent
    const isBroadQuery = /\b(themes?|patterns?|most\s+often|recurring|frequently|what\s+do\s+i\s+write|overview|summary|history|growth)\b/.test(
      cleanQuestion
    ) && tokens.length <= 4;

    const scoredMemories: JournalMemory[] = [];

    const now = Date.now();

    for (const entry of entries) {
      let score = 0;
      const matchReasons: string[] = [];

      const titleLower = (entry.title || '').toLowerCase();
      const contentLower = (entry.content || '').toLowerCase();
      const tagsLower = (entry.tags || []).map((t) => t.toLowerCase());
      const moodLower = (entry.mood || '').toLowerCase();

      // Analysis fields
      const analysis = entry.aiAnalysis as Record<string, unknown> | undefined;
      const keyThemes = Array.isArray(analysis?.keyThemes)
        ? (analysis.keyThemes as string[]).map((t) => String(t).toLowerCase())
        : [];
      const emotions = Array.isArray(analysis?.emotions)
        ? (analysis.emotions as string[]).map((e) => String(e).toLowerCase())
        : [];
      const importantThoughts = Array.isArray(analysis?.importantThoughts)
        ? (analysis.importantThoughts as string[]).map((t) => String(t).toLowerCase())
        : [];
      const significantEvents = Array.isArray(analysis?.significantEvents)
        ? (analysis.significantEvents as string[]).map((e) => String(e).toLowerCase())
        : [];
      const growthSignals = Array.isArray(analysis?.growthSignals)
        ? (analysis.growthSignals as string[]).map((g) => String(g).toLowerCase())
        : [];
      const overviewLower = typeof analysis?.overview === 'string'
        ? analysis.overview.toLowerCase()
        : '';

      // 1. Keyword & Synonym Matching
      for (const kw of expandedKeywords) {
        // Title match
        if (titleLower.includes(kw)) {
          score += 25;
          matchReasons.push(`Title matches "${kw}"`);
        }

        // Tags match
        if (tagsLower.some((tag) => tag.includes(kw) || kw.includes(tag))) {
          score += 20;
          matchReasons.push(`Tag matches "${kw}"`);
        }

        // AI Key Themes match
        if (keyThemes.some((theme) => theme.includes(kw) || kw.includes(theme))) {
          score += 25;
          matchReasons.push(`Theme matches "${kw}"`);
        }

        // AI Emotions match
        if (emotions.some((em) => em.includes(kw) || kw.includes(em))) {
          score += 22;
          matchReasons.push(`Emotion matches "${kw}"`);
        }

        // Mood match
        if (moodLower.includes(kw)) {
          score += 18;
          matchReasons.push(`Mood matches "${kw}"`);
        }

        // AI Growth signals match
        if (growthSignals.some((g) => g.includes(kw))) {
          score += 18;
          matchReasons.push(`Growth signal matches "${kw}"`);
        }

        // AI Significant events match
        if (significantEvents.some((ev) => ev.includes(kw))) {
          score += 18;
          matchReasons.push(`Event matches "${kw}"`);
        }

        // AI Important thoughts match
        if (importantThoughts.some((th) => th.includes(kw))) {
          score += 15;
          matchReasons.push(`Thought matches "${kw}"`);
        }

        // AI Overview match
        if (overviewLower.includes(kw)) {
          score += 12;
          matchReasons.push(`Overview mentions "${kw}"`);
        }

        // Content match (count occurrences with diminishing returns)
        if (contentLower.includes(kw)) {
          const occurrences = (contentLower.match(new RegExp(`\\b${kw}\\b`, 'g')) || []).length;
          const contentScore = occurrences > 0 ? Math.min(occurrences * 6, 24) : 4;
          score += contentScore;
          matchReasons.push(`Content mentions "${kw}"`);
        }
      }

      // Check full query phrase in content or title
      if (cleanQuestion.length > 6 && (contentLower.includes(cleanQuestion) || titleLower.includes(cleanQuestion))) {
        score += 40;
        matchReasons.push('Exact query phrase found');
      }

      // 2. Temporal Adjustments
      const entryTime = entry.createdAt ? new Date(entry.createdAt).getTime() : now;
      const daysAgo = Math.max(0, (now - entryTime) / (1000 * 60 * 60 * 24));

      if (temporalIntent === 'recent') {
        if (daysAgo <= 7) score += 35;
        else if (daysAgo <= 14) score += 25;
        else if (daysAgo <= 30) score += 15;
      } else if (temporalIntent === 'past_month') {
        if (daysAgo <= 35) score += 30;
      } else if (temporalIntent === 'last_time' && score > 0) {
        // Boost most recent matches
        const recencyBonus = Math.max(0, 30 - daysAgo);
        score += recencyBonus;
      }

      // Broad queries: base score from recency + presence of themes
      if (isBroadQuery) {
        const themeBonus = keyThemes.length * 5;
        const recencyBonus = Math.max(5, 25 - daysAgo);
        score += themeBonus + recencyBonus;
        matchReasons.push('Broad reflection query');
      }

      if (score > 0) {
        scoredMemories.push({
          entryId: entry.id,
          title: entry.title,
          content: entry.content,
          createdAt: entry.createdAt || new Date().toISOString(),
          mood: entry.mood,
          tags: entry.tags || [],
          aiAnalysis: analysis ? {
            overview: typeof analysis.overview === 'string' ? analysis.overview : undefined,
            mood: typeof analysis.mood === 'string' ? analysis.mood : undefined,
            emotions: Array.isArray(analysis.emotions) ? analysis.emotions : undefined,
            keyThemes: Array.isArray(analysis.keyThemes) ? analysis.keyThemes : undefined,
            importantThoughts: Array.isArray(analysis.importantThoughts) ? analysis.importantThoughts : undefined,
            significantEvents: Array.isArray(analysis.significantEvents) ? analysis.significantEvents : undefined,
            growthSignals: Array.isArray(analysis.growthSignals) ? analysis.growthSignals : undefined,
            reflectionQuestions: Array.isArray(analysis.reflectionQuestions) ? analysis.reflectionQuestions : undefined,
          } : undefined,
          relevanceScore: score,
          matchReasons,
        });
      }
    }

    // Sort by relevance score descending
    scoredMemories.sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      // Tie-breaker: chronological order
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      if (temporalIntent === 'earliest') {
        return timeA - timeB;
      }
      return timeB - timeA;
    });

    const topMemories = scoredMemories.slice(0, maxLimit);
    const hasSufficientEvidence = topMemories.length > 0 && (isBroadQuery || topMemories[0].relevanceScore >= 12);

    return {
      memories: hasSufficientEvidence ? topMemories : [],
      totalCandidateCount: scoredMemories.length,
      isBroadQuery,
      temporalIntent,
      hasSufficientEvidence,
    };
  }

  private static tokenize(text: string): string[] {
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
    return Array.from(new Set(words));
  }

  private static expandKeywords(tokens: string[]): string[] {
    const expanded = new Set<string>(tokens);
    for (const token of tokens) {
      if (SYNONYMS[token]) {
        for (const syn of SYNONYMS[token]) {
          expanded.add(syn);
        }
      }
    }
    return Array.from(expanded);
  }
}
