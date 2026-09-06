import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  RotateCw,
  Sparkles,
  Calendar,
  Layers,
  Heart,
  Target,
  AlertTriangle,
  Award,
  BookOpen,
  ArrowRight,
  Clock,
  CheckCircle2,
  HelpCircle,
  BarChart3,
  Flame,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  ArrowLeftRight
} from 'lucide-react';
import { GrowthInsights, MoodTrendPoint, RecurringEmotion, RecurringTheme } from '../types';
import { JournalService } from '../lib/journalService';

interface GrowthViewProps {
  onOpenEntry?: (entryId: string) => void;
  onNewEntry?: () => void;
  onNavigateHome?: () => void;
  onNavigateCompare?: () => void;
}

const MOOD_COLOR_MAP: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  excited: { bg: 'bg-amber-50', text: 'text-amber-800', dot: 'bg-amber-500', border: 'border-amber-200' },
  happy: { bg: 'bg-emerald-50', text: 'text-emerald-800', dot: 'bg-emerald-500', border: 'border-emerald-200' },
  grateful: { bg: 'bg-teal-50', text: 'text-teal-800', dot: 'bg-teal-500', border: 'border-teal-200' },
  confident: { bg: 'bg-indigo-50', text: 'text-indigo-800', dot: 'bg-indigo-500', border: 'border-indigo-200' },
  calm: { bg: 'bg-sky-50', text: 'text-sky-800', dot: 'bg-sky-500', border: 'border-sky-200' },
  neutral: { bg: 'bg-slate-50', text: 'text-slate-700', dot: 'bg-slate-400', border: 'border-slate-200' },
  nervous: { bg: 'bg-amber-50', text: 'text-amber-800', dot: 'bg-amber-500', border: 'border-amber-200' },
  anxious: { bg: 'bg-orange-50', text: 'text-orange-800', dot: 'bg-orange-500', border: 'border-orange-200' },
  stressed: { bg: 'bg-rose-50', text: 'text-rose-800', dot: 'bg-rose-500', border: 'border-rose-200' },
  sad: { bg: 'bg-blue-50', text: 'text-blue-800', dot: 'bg-blue-500', border: 'border-blue-200' },
  tired: { bg: 'bg-purple-50', text: 'text-purple-800', dot: 'bg-purple-500', border: 'border-purple-200' },
};

function getMoodStyle(moodName?: string) {
  if (!moodName) return MOOD_COLOR_MAP.neutral;
  const key = moodName.toLowerCase().trim();
  return MOOD_COLOR_MAP[key] || {
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    dot: 'bg-slate-400',
    border: 'border-slate-200',
  };
}

export const GrowthView: React.FC<GrowthViewProps> = ({
  onOpenEntry,
  onNewEntry,
  onNavigateHome,
  onNavigateCompare,
}) => {
  const [insights, setInsights] = useState<GrowthInsights | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async (force = false) => {
    if (force) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data = await JournalService.getGrowthInsights(force);
      setInsights(data);
    } catch (err: unknown) {
      console.error('Failed to fetch growth insights:', err);
      const msg = err instanceof Error ? err.message : 'Unable to generate growth insights at this time.';
      setError(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInsights(false);
  }, []);

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  const formatDateTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#F9FAFB] dark:bg-slate-950 transition-colors min-h-[500px]">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-5 animate-pulse shadow-xs">
          <TrendingUp className="w-7 h-7" />
        </div>
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">Synthesizing Growth Intelligence</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm text-center">
          Analyzing your private memories, longitudinal patterns, recurring themes, and emotional shifts over time...
        </p>
      </div>
    );
  }

  // 2. Error State with Retry
  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#F9FAFB] dark:bg-slate-950 transition-colors text-center min-h-[500px]">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4 shadow-xs">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Could Not Load Growth Intelligence</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mb-6">{error}</p>
        <button
          id="growth-retry-btn"
          onClick={() => fetchInsights(true)}
          className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white text-xs font-semibold rounded-full shadow-xs transition-all flex items-center gap-2"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Try Again</span>
        </button>
      </div>
    );
  }

  // 3. Empty State (Not enough entries)
  if (!insights || !insights.hasEnoughData || insights.totalEntriesAnalyzed === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#F9FAFB] dark:bg-slate-950 transition-colors text-center min-h-[500px]">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 shadow-xs">
          <TrendingUp className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">More Reflections Needed for Growth Intelligence</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mb-6 leading-relaxed">
          MindVault uncovers meaningful longitudinal trends, emotional patterns, and growth signals once you have recorded at least 2 journal entries.
        </p>
        {onNewEntry && (
          <button
            id="growth-empty-new-btn"
            onClick={onNewEntry}
            className="px-5 py-2.5 bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white text-xs font-semibold rounded-full shadow-xs transition-all flex items-center gap-2"
          >
            <BookOpen className="w-4 h-4" />
            <span>Write a Journal Entry</span>
          </button>
        )}
      </div>
    );
  }

  // Calculate Date Range from mood trends
  const dateDates = insights.moodTrends.map((t) => t.date).filter(Boolean);
  const earliestDate = dateDates.length > 0 ? dateDates[0] : null;
  const latestDate = dateDates.length > 0 ? dateDates[dateDates.length - 1] : null;

  // Evidence and threshold calculations for dynamic labels and titles
  const recurringEmotionsCount = insights.recurringEmotions.filter((e) => e.count >= 2).length;
  const emergingEmotionsCount = insights.recurringEmotions.filter((e) => e.count === 1).length;
  const emotionsTitle =
    recurringEmotionsCount > 0 && emergingEmotionsCount > 0
      ? 'Emotional Patterns (Recurring & Emerging)'
      : recurringEmotionsCount > 0
      ? 'Recurring Emotional Patterns'
      : emergingEmotionsCount > 0
      ? 'Observed Emotional Patterns'
      : 'Emotional Patterns';

  const recurringThemesCount = insights.recurringThemes.filter((t) => t.count >= 2).length;
  const emergingThemesCount = insights.recurringThemes.filter((t) => t.count === 1).length;
  const themesTitle =
    recurringThemesCount > 0 && emergingThemesCount > 0
      ? 'Themes & Focus Areas (Recurring & Emerging)'
      : recurringThemesCount > 0
      ? 'Recurring Themes & Focus Areas'
      : emergingThemesCount > 0
      ? 'Observed Themes & Focus Areas'
      : 'Themes & Focus Areas';

  const multiEntrySignalsCount = insights.growthSignals.filter(
    (s) => (s.supportingEntryCount && s.supportingEntryCount >= 2) || (s.evidenceDates && s.evidenceDates.length >= 2)
  ).length;
  const singleEntrySignalsCount = insights.growthSignals.filter(
    (s) => (!s.supportingEntryCount || s.supportingEntryCount <= 1) && (!s.evidenceDates || s.evidenceDates.length <= 1)
  ).length;
  const signalsTitle =
    multiEntrySignalsCount > 0 && singleEntrySignalsCount > 0
      ? 'Growth Signals & Progress (Longitudinal & Emerging)'
      : multiEntrySignalsCount > 0
      ? 'Longitudinal Growth Signals'
      : singleEntrySignalsCount > 0
      ? 'Emerging Growth Signals'
      : 'Observed Growth Signals';

  const recurringChallengesCount = insights.recurringChallenges.filter((c) => c.frequency >= 2).length;
  const emergingChallengesCount = insights.recurringChallenges.filter((c) => c.frequency <= 1).length;
  const challengesTitle =
    recurringChallengesCount > 0 && emergingChallengesCount > 0
      ? 'Challenges & Patterns (Recurring & Observed)'
      : recurringChallengesCount > 0
      ? 'Recurring Challenges & Patterns'
      : emergingChallengesCount > 0
      ? 'Observed Challenges & Patterns'
      : 'Challenges & Patterns';

  return (
    <div className="flex-1 overflow-y-auto bg-[#F9FAFB] dark:bg-slate-950 p-4 sm:p-6 lg:p-8 space-y-6 transition-colors">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>Phase 4 Longitudinal Intelligence</span>
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              {insights.totalEntriesAnalyzed} {insights.totalEntriesAnalyzed === 1 ? 'entry' : 'entries'} analyzed
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Growth & Pattern Intelligence
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            {earliestDate && latestDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                <span>Range: {formatDate(earliestDate)} – {formatDate(latestDate)}</span>
              </span>
            )}
            <span className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
              <Clock className="w-3.5 h-3.5" />
              <span>Updated: {formatDateTime(insights.generatedAt)}</span>
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onNavigateCompare && (
            <button
              id="growth-to-compare-btn"
              onClick={onNavigateCompare}
              className="px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-full border border-indigo-200 dark:border-indigo-800 shadow-2xs transition-all flex items-center gap-1.5"
              title="Compare two date ranges: What Changed About Me?"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>What Changed? (Compare)</span>
            </button>
          )}

          <button
            id="growth-refresh-btn"
            onClick={() => fetchInsights(true)}
            disabled={isRefreshing}
            className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-full border border-slate-200 dark:border-slate-700 shadow-2xs transition-all flex items-center gap-1.5 disabled:opacity-50"
            title="Re-analyze and refresh growth patterns"
          >
            <RotateCw className={`w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Insights'}</span>
          </button>
        </div>
      </div>

      {/* 1. Overall Longitudinal Reflection */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
            Longitudinal Growth Reflection
          </h3>
        </div>
        <div className="prose prose-sm text-slate-700 dark:text-slate-300 leading-relaxed text-sm whitespace-pre-line bg-slate-50/70 dark:bg-slate-800/40 p-4 sm:p-5 rounded-xl border border-slate-100 dark:border-slate-800 font-sans">
          {insights.longitudinalNarrative}
        </div>
      </div>

      {/* Grid: Mood Trends & Emotional Patterns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 2. Mood Trends Timeline */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-900 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                  Mood Progression Over Time
                </h3>
              </div>
              <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                {insights.moodTrends.length} logged states
              </span>
            </div>

            {insights.moodTrends.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic py-4">No explicit moods logged across entries.</p>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {insights.moodTrends.map((trend, idx) => {
                  const style = getMoodStyle(trend.mood);
                  return (
                    <div
                      key={`mood-${trend.date}-${trend.mood}-${idx}`}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-2.5 h-2.5 rounded-full ${style.dot} shrink-0`} />
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{trend.mood}</span>
                        {trend.count > 1 && (
                          <span className="text-[10px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded-full text-slate-500 dark:text-slate-400 font-medium">
                            {trend.count} entries
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">{formatDate(trend.date)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Calculated deterministically from user-authored entries only</span>
          </div>
        </div>

        {/* 3. Emotional Patterns Distribution */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-100 dark:border-teal-900 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <Heart className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                  {emotionsTitle}
                </h3>
              </div>
              <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                {insights.recurringEmotions.length} distinct {insights.recurringEmotions.length === 1 ? 'state' : 'states'}
                {recurringEmotionsCount > 0 && emergingEmotionsCount > 0 && (
                  <span className="hidden sm:inline text-slate-400 dark:text-slate-500 font-normal"> ({recurringEmotionsCount} recurring, {emergingEmotionsCount} emerging)</span>
                )}
              </span>
            </div>

            {insights.recurringEmotions.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic py-4">No emotional patterns detected yet.</p>
            ) : (
              <div className="space-y-3">
                {insights.recurringEmotions.map((item, idx) => {
                  const isRecurring = item.count >= 2;
                  return (
                    <div key={`emotion-${item.emotion}-${idx}`} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${isRecurring ? 'bg-teal-500' : 'bg-slate-400 dark:bg-slate-500'}`} />
                          <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize">
                            {item.emotion}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              isRecurring
                                ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {isRecurring ? 'Recurring' : 'Emerging'}
                          </span>
                        </div>
                        <span className="text-slate-400 dark:text-slate-500 font-mono text-[11px]">
                          {item.count} {item.count === 1 ? 'mention' : 'mentions'} ({item.percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isRecurring ? 'bg-teal-500' : 'bg-slate-400 dark:bg-slate-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(8, item.percentage))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
            <span>Frequencies synthesized from AI entry analyses</span>
          </div>
        </div>
      </div>

      {/* 4. Themes & Focus Areas */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
              {themesTitle}
            </h3>
          </div>
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
            {insights.recurringThemes.length} focus {insights.recurringThemes.length === 1 ? 'theme' : 'themes'}
            {recurringThemesCount > 0 && emergingThemesCount > 0 && (
              <span className="hidden sm:inline text-slate-400 dark:text-slate-500 font-normal"> ({recurringThemesCount} recurring, {emergingThemesCount} emerging)</span>
            )}
          </span>
        </div>

        {insights.recurringThemes.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500 italic">No themes identified yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {insights.recurringThemes.map((theme, idx) => {
              const isRecurring = theme.count >= 2;
              return (
                <div
                  key={`theme-${theme.theme}-${idx}`}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-all flex flex-col justify-between space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 capitalize">{theme.theme}</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                        isRecurring
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {isRecurring ? `Recurring · ${theme.count} entries` : `Observed · 1 entry`}
                    </span>
                  </div>
                  {theme.relatedTags && theme.relatedTags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {theme.relatedTags.map((t, tidx) => (
                        <span
                          key={`tag-${tidx}`}
                          className="text-[10px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded-md"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Grid: Growth Signals & Challenges */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 5. Growth Signals */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
              {signalsTitle}
            </h3>
          </div>

          {insights.growthSignals.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 italic">No growth signals detected yet.</p>
          ) : (
            <div className="space-y-3">
              {insights.growthSignals.map((signal, idx) => {
                const isLongitudinal =
                  (signal.supportingEntryCount && signal.supportingEntryCount >= 2) ||
                  (signal.evidenceDates && signal.evidenceDates.length >= 2);
                const count = signal.supportingEntryCount || signal.evidenceDates?.length || 1;
                return (
                  <div
                    key={`signal-${idx}`}
                    className={`p-4 rounded-xl space-y-1.5 border ${
                      isLongitudinal
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900'
                        : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className={`text-xs font-bold ${isLongitudinal ? 'text-emerald-900 dark:text-emerald-200' : 'text-slate-900 dark:text-white'}`}>{signal.title}</h4>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                          isLongitudinal
                            ? 'bg-emerald-100/80 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800'
                        }`}
                      >
                        {isLongitudinal ? `Longitudinal · ${count} entries` : 'Emerging Growth Signal'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{signal.description}</p>
                    {signal.evidenceDates && signal.evidenceDates.length > 0 && (
                      <p className={`text-[10px] font-mono pt-1 ${isLongitudinal ? 'text-emerald-700/80 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                        {signal.evidenceDates.length === 1
                          ? `Evidence date: ${formatDate(signal.evidenceDates[0])}`
                          : `Evidence dates: ${signal.evidenceDates.map(formatDate).join(', ')}`}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 6. Challenges & Patterns */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-900 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
              {challengesTitle}
            </h3>
          </div>

          {insights.recurringChallenges.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 italic">No challenges or obstacles flagged.</p>
          ) : (
            <div className="space-y-3">
              {insights.recurringChallenges.map((challenge, idx) => {
                const isRecurring = challenge.frequency >= 2;
                return (
                  <div
                    key={`challenge-${idx}`}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">{challenge.challenge}</h4>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 border ${
                          isRecurring
                            ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {isRecurring ? `Recurring · Freq: ${challenge.frequency}` : `Observed · Freq: 1`}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{challenge.context}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 7. Positive Moments & Wins */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-900 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Award className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
            Positive Moments & Key Wins
          </h3>
        </div>

        {insights.positiveMoments.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500 italic">No specific wins recorded yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {insights.positiveMoments.map((moment, idx) => (
              <div
                key={`win-${idx}`}
                className="p-3.5 rounded-xl bg-amber-50/40 dark:bg-amber-950/30 border border-amber-100/80 dark:border-amber-900/60 hover:border-amber-200 dark:hover:border-amber-800 transition-all flex flex-col justify-between space-y-2 group"
              >
                <div className="flex items-start gap-2">
                  <Flame className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-snug">{moment.moment}</p>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-amber-100/60 dark:border-amber-900/40 text-[10px]">
                  <span className="text-slate-400 dark:text-slate-500 font-mono">
                    {moment.date ? formatDate(moment.date) : 'Journal record'}
                  </span>
                  {onOpenEntry && moment.entryId && (
                    <button
                      id={`open-win-entry-${idx}`}
                      onClick={() => onOpenEntry(moment.entryId)}
                      className="text-amber-800 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-200 font-semibold flex items-center gap-0.5 group-hover:underline"
                    >
                      <span>View</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
