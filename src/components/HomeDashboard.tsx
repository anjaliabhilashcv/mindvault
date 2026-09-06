import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { JournalEntry, GrowthInsights } from '../types';
import { JournalService } from '../lib/journalService';
import {
  BookOpen,
  Calendar,
  Image as ImageIcon,
  Sparkles,
  TrendingUp,
  Plus,
  ArrowRight,
  Clock,
  ShieldCheck,
  Brain,
  MessageSquare,
  ChevronRight,
} from 'lucide-react';

interface HomeDashboardProps {
  entries: JournalEntry[];
  isLoadingEntries: boolean;
  onSelectEntry: (entry: JournalEntry) => void;
  onNewEntry: () => void;
  onNavigateJournals: () => void;
  onNavigateGrowth: () => void;
  onNavigateAsk: () => void;
}

const MOOD_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  excited: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  happy: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
  grateful: { bg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-200' },
  confident: { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200' },
  calm: { bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-200' },
  neutral: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
  nervous: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  anxious: { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200' },
  stressed: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200' },
  sad: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' },
  tired: { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200' },
};

function getMoodBadgeStyle(mood?: string) {
  if (!mood) return MOOD_STYLES.neutral;
  const key = mood.toLowerCase().trim();
  return MOOD_STYLES[key] || MOOD_STYLES.neutral;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  entries,
  isLoadingEntries,
  onSelectEntry,
  onNewEntry,
  onNavigateJournals,
  onNavigateGrowth,
  onNavigateAsk,
}) => {
  const { user } = useAuth();
  const [growthInsights, setGrowthInsights] = useState<GrowthInsights | null>(null);
  const [isLoadingGrowth, setIsLoadingGrowth] = useState<boolean>(false);

  // Compute stats deterministically from real Firestore entries
  const totalMemories = entries.length;

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const memoriesThisMonth = entries.filter((e) => {
    if (!e.createdAt) return false;
    const d = new Date(e.createdAt);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  const mediaMemories = entries.filter(
    (e) => Array.isArray(e.attachments) && e.attachments.length > 0
  ).length;

  // Recent 3 to 5 entries
  const recentEntries = [...entries]
    .sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    })
    .slice(0, 4);

  // Time-of-day Greeting
  const getGreeting = () => {
    const hour = now.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const userName = user?.displayName || user?.email?.split('@')[0] || 'there';

  // Load growth insights quietly for the compact dashboard card
  useEffect(() => {
    if (entries.length === 0) return;

    let isMounted = true;
    setIsLoadingGrowth(true);

    JournalService.getGrowthInsights(false)
      .then((insights) => {
        if (isMounted) {
          setGrowthInsights(insights);
          setIsLoadingGrowth(false);
        }
      })
      .catch((err) => {
        console.warn('Dashboard growth summary fetch failed (silent fallback):', err);
        if (isMounted) setIsLoadingGrowth(false);
      });

    return () => {
      isMounted = false;
    };
  }, [entries.length]);

  const formatDateLabel = (isoString?: string) => {
    if (!isoString) return 'Recently';
    const d = new Date(isoString);
    const today = new Date();
    if (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    ) {
      return 'Today';
    }
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear()
    ) {
      return 'Yesterday';
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Loading Skeleton
  if (isLoadingEntries) {
    return (
      <div className="flex-1 p-6 md:p-8 max-w-6xl mx-auto w-full space-y-6 animate-pulse">
        <div className="h-10 bg-slate-200 rounded-xl w-64"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-24 bg-slate-200 rounded-2xl"></div>
          <div className="h-24 bg-slate-200 rounded-2xl"></div>
          <div className="h-24 bg-slate-200 rounded-2xl"></div>
        </div>
        <div className="h-64 bg-slate-200 rounded-2xl"></div>
      </div>
    );
  }

  // Welcoming Empty State (0 Entries)
  if (totalMemories === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-[#F9FAFB] dark:bg-slate-950 transition-colors">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Welcome Banner */}
          <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-8 md:p-10 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="relative z-10 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-200 text-xs font-semibold mb-4 border border-indigo-400/30">
                <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                <span>Welcome to MindVault</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-3">
                {getGreeting()}, {userName} 👋
              </h1>
              <p className="text-indigo-100/80 text-sm md:text-base leading-relaxed mb-6">
                Your private AI-powered personal memory space. MindVault helps you reflect on daily thoughts, discover emotional themes, and track your personal growth over time.
              </p>
              <button
                id="home-empty-new-btn"
                onClick={onNewEntry}
                className="px-6 py-3 bg-white text-indigo-900 text-sm font-semibold rounded-full shadow-md hover:bg-indigo-50 active:scale-[0.98] transition-all inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4 text-indigo-600" />
                <span>Create Your First Memory</span>
              </button>
            </div>
          </div>

          {/* Key Value Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Private & Scoped</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Your journal entries are encrypted and strictly isolated. No one else can view your personal vault.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
                <Brain className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">AI Insights</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Analyze your entries to discover mood trends, recurring themes, and growth signals grounded in your words.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Ask Your History</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Ask natural language questions about past experiences, decisions, and reflections in your history.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active Dashboard (User Has Entries)
  return (
    <div className="flex-1 overflow-y-auto bg-[#F9FAFB] dark:bg-slate-950 p-4 sm:p-6 md:p-8 space-y-6 transition-colors">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-2xs">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {getGreeting()}, {userName} 👋
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Your personal memory space & growth summary
            </p>
          </div>

          <button
            id="home-quick-new-btn"
            onClick={onNewEntry}
            className="px-4 py-2 bg-indigo-600 text-white text-xs sm:text-sm font-semibold rounded-full shadow-xs hover:bg-indigo-700 active:scale-[0.99] transition-all inline-flex items-center justify-center gap-2 shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>New Memory</span>
          </button>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Total Memories
              </p>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{totalMemories}</h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Saved in your vault</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                This Month
              </p>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{memoriesThisMonth}</h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                Written in {now.toLocaleDateString('en-US', { month: 'long' })}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Media Memories
              </p>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{mediaMemories}</h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Photo attachments</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <ImageIcon className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Recent Memories Section */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Recent Memories</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Your latest written reflections and events</p>
            </div>
            <button
              id="home-view-all-journals-btn"
              onClick={onNavigateJournals}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors inline-flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentEntries.map((entry) => {
              const moodStyle = getMoodBadgeStyle(entry.mood);
              const attachmentCount = Array.isArray(entry.attachments) ? entry.attachments.length : 0;

              return (
                <div
                  key={entry.id}
                  onClick={() => onSelectEntry(entry)}
                  className="bg-slate-50/70 dark:bg-slate-800/60 hover:bg-indigo-50/40 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-200 dark:hover:border-indigo-700 rounded-xl p-4 transition-all cursor-pointer group flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-900 dark:group-hover:text-indigo-300 transition-colors line-clamp-1">
                        {entry.title || 'Untitled Memory'}
                      </h3>
                      {entry.mood && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${moodStyle.bg} ${moodStyle.text} ${moodStyle.border}`}
                        >
                          {entry.mood}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {entry.content || 'No text recorded.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-400 dark:text-slate-500">
                    <span className="flex items-center gap-1 font-medium text-slate-500 dark:text-slate-400">
                      <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                      {formatDateLabel(entry.createdAt)}
                    </span>

                    {attachmentCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-semibold border border-purple-200/60 dark:border-purple-800">
                        <ImageIcon className="w-3 h-3" />
                        <span>{attachmentCount} {attachmentCount === 1 ? 'photo' : 'photos'}</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Access Cards: Your Growth & Ask Journal */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Your Growth Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-2xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Your Growth</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Longitudinal patterns & emotions</p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3.5 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
                {isLoadingGrowth ? (
                  <p className="text-slate-400 dark:text-slate-500 animate-pulse">Analyzing your reflection patterns...</p>
                ) : growthInsights?.recurringThemes && growthInsights.recurringThemes.length > 0 ? (
                  <p>
                    Your recent memories frequently feature themes of{' '}
                    <span className="font-semibold text-indigo-700 dark:text-indigo-400">
                      {growthInsights.recurringThemes.slice(0, 2).map((t) => t.theme).join(' and ')}
                    </span>
                    .
                  </p>
                ) : (
                  <p>
                    Reflecting regularly helps you track mood trends, emotional shifts, and personal milestones over time.
                  </p>
                )}
              </div>
            </div>

            <button
              id="home-open-growth-btn"
              onClick={onNavigateGrowth}
              className="w-full py-2.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5"
            >
              <span>View full reflection</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Ask Your Journal Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-2xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Ask Your Journal</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Natural language memory retrieval</p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3.5 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <p className="font-medium text-slate-700 dark:text-slate-200">Try asking:</p>
                <p className="italic text-slate-500 dark:text-slate-400 text-[11px]">
                  "When was the last time I felt really proud of my work?"
                </p>
              </div>
            </div>

            <button
              id="home-open-ask-btn"
              onClick={onNavigateAsk}
              className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5"
            >
              <span>Ask a question</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
