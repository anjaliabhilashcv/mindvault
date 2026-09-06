import React, { useState, useEffect } from 'react';
import {
  ArrowLeftRight,
  Calendar,
  Sparkles,
  Clock,
  TrendingUp,
  Heart,
  Layers,
  AlertTriangle,
  Award,
  ChevronRight,
  BookOpen,
  RotateCw,
  HelpCircle,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Filter,
  BarChart2
} from 'lucide-react';
import {
  DateRangeInput,
  GrowthComparisonResult,
  PeriodSummary
} from '../types';
import { JournalService } from '../lib/journalService';

interface GrowthComparisonViewProps {
  onOpenEntry?: (entryId: string) => void;
  onNewEntry?: () => void;
  onNavigateGrowthOverview?: () => void;
  onNavigateHome?: () => void;
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

// Preset helper functions
function getPresetRanges(preset: 'lastMonthVsThis' | 'past30VsPrior30' | 'pastWeekVsPrior' | 'past60VsPrior60') {
  const now = new Date();
  const formatDateStr = (d: Date) => d.toISOString().slice(0, 10);

  if (preset === 'past30VsPrior30') {
    const endB = new Date(now);
    const startB = new Date(now);
    startB.setDate(now.getDate() - 30);

    const endA = new Date(startB);
    endA.setDate(startB.getDate() - 1);
    const startA = new Date(endA);
    startA.setDate(endA.getDate() - 30);

    return {
      periodA: {
        startDate: formatDateStr(startA),
        endDate: formatDateStr(endA),
        label: 'Prior 30 Days',
      },
      periodB: {
        startDate: formatDateStr(startB),
        endDate: formatDateStr(endB),
        label: 'Recent 30 Days',
      },
    };
  }

  if (preset === 'pastWeekVsPrior') {
    const endB = new Date(now);
    const startB = new Date(now);
    startB.setDate(now.getDate() - 7);

    const endA = new Date(startB);
    endA.setDate(startB.getDate() - 1);
    const startA = new Date(endA);
    startA.setDate(endA.getDate() - 7);

    return {
      periodA: {
        startDate: formatDateStr(startA),
        endDate: formatDateStr(endA),
        label: 'Prior Week',
      },
      periodB: {
        startDate: formatDateStr(startB),
        endDate: formatDateStr(endB),
        label: 'Recent Week',
      },
    };
  }

  if (preset === 'past60VsPrior60') {
    const endB = new Date(now);
    const startB = new Date(now);
    startB.setDate(now.getDate() - 60);

    const endA = new Date(startB);
    endA.setDate(startB.getDate() - 1);
    const startA = new Date(endA);
    startA.setDate(endA.getDate() - 60);

    return {
      periodA: {
        startDate: formatDateStr(startA),
        endDate: formatDateStr(endA),
        label: 'Prior 60 Days',
      },
      periodB: {
        startDate: formatDateStr(startB),
        endDate: formatDateStr(endB),
        label: 'Recent 60 Days',
      },
    };
  }

  // default: lastMonthVsThis
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  const startThisMonth = new Date(year, month, 1);
  const endThisMonth = now;

  const startLastMonth = new Date(year, month - 1, 1);
  const endLastMonth = new Date(year, month, 0);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return {
    periodA: {
      startDate: formatDateStr(startLastMonth),
      endDate: formatDateStr(endLastMonth),
      label: `${monthNames[startLastMonth.getMonth()]} ${startLastMonth.getFullYear()}`,
    },
    periodB: {
      startDate: formatDateStr(startThisMonth),
      endDate: formatDateStr(endThisMonth),
      label: `${monthNames[month]} ${year} (To date)`,
    },
  };
}

export const GrowthComparisonView: React.FC<GrowthComparisonViewProps> = ({
  onOpenEntry,
  onNewEntry,
  onNavigateGrowthOverview,
  onNavigateHome,
}) => {
  const defaultPresets = getPresetRanges('past30VsPrior30');

  const [periodA, setPeriodA] = useState<DateRangeInput>(defaultPresets.periodA);
  const [periodB, setPeriodB] = useState<DateRangeInput>(defaultPresets.periodB);
  const [selectedPreset, setSelectedPreset] = useState<string>('past30VsPrior30');

  const [comparison, setComparison] = useState<GrowthComparisonResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleApplyPreset = (presetKey: 'lastMonthVsThis' | 'past30VsPrior30' | 'pastWeekVsPrior' | 'past60VsPrior60') => {
    setSelectedPreset(presetKey);
    const ranges = getPresetRanges(presetKey);
    setPeriodA(ranges.periodA);
    setPeriodB(ranges.periodB);
    executeComparison(ranges.periodA, ranges.periodB);
  };

  const executeComparison = async (rangeA: DateRangeInput, rangeB: DateRangeInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await JournalService.compareGrowthPeriods(rangeA, rangeB);
      setComparison(res);
    } catch (err: unknown) {
      console.error('Failed to compare growth periods:', err);
      const msg = err instanceof Error ? err.message : 'Unable to compare selected periods at this time.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load on mount
  useEffect(() => {
    executeComparison(periodA, periodB);
  }, []);

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSelectedPreset('custom');
    executeComparison(periodA, periodB);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F9FAFB] dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-y-auto">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-5 sticky top-0 z-20 shadow-2xs">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                What Changed About Me?
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
              Compare two time periods of your journal to discover shifts in your mindset, emotional resilience, recurring challenges, and personal growth.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onNavigateGrowthOverview && (
              <button
                id="growth-overview-nav-btn"
                onClick={onNavigateGrowthOverview}
                className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-full transition-colors flex items-center gap-1.5 border border-slate-200 dark:border-slate-700"
              >
                <TrendingUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Growth Dashboard</span>
              </button>
            )}

            <button
              id="compare-refresh-btn"
              onClick={() => executeComparison(periodA, periodB)}
              disabled={isLoading}
              className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-full hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Comparing...' : 'Recalculate'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto w-full px-6 py-6 space-y-6">
        {/* Date Range Selection Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Select Comparison Periods
              </span>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-2xs text-slate-400 font-medium mr-1">Presets:</span>
              <button
                id="preset-past30-btn"
                type="button"
                onClick={() => handleApplyPreset('past30VsPrior30')}
                className={`px-2.5 py-1 rounded-full text-2xs font-semibold transition-all border ${
                  selectedPreset === 'past30VsPrior30'
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                    : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                Last 30d vs Prior 30d
              </button>
              <button
                id="preset-month-btn"
                type="button"
                onClick={() => handleApplyPreset('lastMonthVsThis')}
                className={`px-2.5 py-1 rounded-full text-2xs font-semibold transition-all border ${
                  selectedPreset === 'lastMonthVsThis'
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                    : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                This Month vs Last Month
              </button>
              <button
                id="preset-week-btn"
                type="button"
                onClick={() => handleApplyPreset('pastWeekVsPrior')}
                className={`px-2.5 py-1 rounded-full text-2xs font-semibold transition-all border ${
                  selectedPreset === 'pastWeekVsPrior'
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                    : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                This Week vs Last Week
              </button>
              <button
                id="preset-past60-btn"
                type="button"
                onClick={() => handleApplyPreset('past60VsPrior60')}
                className={`px-2.5 py-1 rounded-full text-2xs font-semibold transition-all border ${
                  selectedPreset === 'past60VsPrior60'
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                    : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                Last 60d vs Prior 60d
              </button>
            </div>
          </div>

          {/* Form Inputs */}
          <form onSubmit={handleCustomSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Period A */}
            <div className="bg-slate-50/70 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center text-2xs">
                    A
                  </span>
                  Earlier Period
                </span>
                <input
                  id="period-a-label-input"
                  type="text"
                  placeholder="Label (e.g. Prior 30 Days)"
                  value={periodA.label || ''}
                  onChange={(e) => {
                    setSelectedPreset('custom');
                    setPeriodA({ ...periodA, label: e.target.value });
                  }}
                  className="text-2xs px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:border-indigo-400 text-slate-800 dark:text-slate-200 w-36"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-2xs font-medium text-slate-500 dark:text-slate-400 mb-1">Start Date</label>
                  <input
                    id="period-a-start-date"
                    type="date"
                    value={periodA.startDate.slice(0, 10)}
                    onChange={(e) => {
                      setSelectedPreset('custom');
                      setPeriodA({ ...periodA, startDate: e.target.value });
                    }}
                    required
                    className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-medium text-slate-500 dark:text-slate-400 mb-1">End Date</label>
                  <input
                    id="period-a-end-date"
                    type="date"
                    value={periodA.endDate.slice(0, 10)}
                    onChange={(e) => {
                      setSelectedPreset('custom');
                      setPeriodA({ ...periodA, endDate: e.target.value });
                    }}
                    required
                    className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-200"
                  />
                </div>
              </div>
            </div>

            {/* Period B */}
            <div className="bg-indigo-50/40 dark:bg-indigo-950/30 p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-900/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-2xs">
                    B
                  </span>
                  Recent Period
                </span>
                <input
                  id="period-b-label-input"
                  type="text"
                  placeholder="Label (e.g. Recent 30 Days)"
                  value={periodB.label || ''}
                  onChange={(e) => {
                    setSelectedPreset('custom');
                    setPeriodB({ ...periodB, label: e.target.value });
                  }}
                  className="text-2xs px-2 py-1 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-md focus:outline-none focus:border-indigo-400 text-slate-800 dark:text-slate-200 w-36"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-2xs font-medium text-slate-500 dark:text-slate-400 mb-1">Start Date</label>
                  <input
                    id="period-b-start-date"
                    type="date"
                    value={periodB.startDate.slice(0, 10)}
                    onChange={(e) => {
                      setSelectedPreset('custom');
                      setPeriodB({ ...periodB, startDate: e.target.value });
                    }}
                    required
                    className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-medium text-slate-500 dark:text-slate-400 mb-1">End Date</label>
                  <input
                    id="period-b-end-date"
                    type="date"
                    value={periodB.endDate.slice(0, 10)}
                    onChange={(e) => {
                      setSelectedPreset('custom');
                      setPeriodB({ ...periodB, endDate: e.target.value });
                    }}
                    required
                    className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-200"
                  />
                </div>
              </div>
            </div>

            <div className="md:col-span-2 flex justify-end">
              <button
                id="apply-custom-dates-btn"
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-slate-900 dark:bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 dark:hover:bg-indigo-700 transition-colors shadow-2xs flex items-center gap-1.5"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Apply & Compare</span>
              </button>
            </div>
          </form>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-2xs">
            <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto animate-pulse">
              <ArrowLeftRight className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">
                Comparing Your Journal Reflections
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                Analyzing emotional shifts, theme evolution, challenge trajectories, and growth milestones between both periods...
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-rose-900">
              Unable to Complete Comparison
            </h2>
            <p className="text-xs text-rose-700 max-w-md mx-auto">
              {error}
            </p>
            <button
              id="comparison-error-retry-btn"
              onClick={() => executeComparison(periodA, periodB)}
              className="px-4 py-1.5 bg-rose-600 text-white text-xs font-semibold rounded-full hover:bg-rose-700 transition-colors shadow-2xs"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty / Insufficient Data Notification */}
        {!isLoading && !error && comparison && !comparison.hasEnoughData && (
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-6 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-bold text-amber-900">
                  Insufficient Entries for Complete Comparison
                </h2>
                <p className="text-xs text-amber-800 mt-1">
                  {comparison.emptyPeriodReason ||
                    'One or both selected date ranges contain no recorded reflections.'}
                </p>
                <div className="mt-3 flex items-center gap-4 text-2xs text-amber-700">
                  <span>Period A ({comparison.periodA.label}): <strong>{comparison.periodA.entryCount} entry(s)</strong></span>
                  <span>Period B ({comparison.periodB.label}): <strong>{comparison.periodB.entryCount} entry(s)</strong></span>
                </div>
              </div>
            </div>
            <div className="pt-2 flex items-center gap-2">
              <button
                id="empty-change-range-btn"
                onClick={() => handleApplyPreset('past30VsPrior30')}
                className="text-xs font-semibold text-indigo-700 hover:text-indigo-800 underline"
              >
                Switch to 30-day preset
              </button>
              {onNewEntry && (
                <>
                  <span className="text-slate-300">•</span>
                  <button
                    id="empty-write-btn"
                    onClick={onNewEntry}
                    className="text-xs font-semibold text-indigo-700 hover:text-indigo-800 underline"
                  >
                    Write a new reflection
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Results Canvas */}
        {!isLoading && !error && comparison && (
          <div className="space-y-6">
            {/* 1. Grounded Synthesis Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                    Longitudinal Reflection: What Changed
                  </h2>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-2xs font-semibold">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Grounded in Your Memories</span>
                </div>
              </div>

              <div className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-line bg-slate-50/50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                {comparison.overallNarrative}
              </div>

              <div className="flex items-center justify-between text-2xs text-slate-400 dark:text-slate-500 pt-1">
                <span>Derived strictly from your authentic reflections across both periods</span>
                <span>Generated {new Date(comparison.comparisonGeneratedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>

            {/* 2. Side-by-Side Period Evidence Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Period A Summary Card */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center text-xs font-bold">
                      A
                    </span>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white">{comparison.periodA.label}</h3>
                      <p className="text-2xs text-slate-500 dark:text-slate-400">
                        {comparison.periodA.startDate.slice(0, 10)} to {comparison.periodA.endDate.slice(0, 10)}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-700 dark:text-slate-300">
                    {comparison.periodA.entryCount} {comparison.periodA.entryCount === 1 ? 'entry' : 'entries'}
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-2xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      Predominant Mood
                    </span>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                      <span className={`w-2 h-2 rounded-full ${getMoodStyle(comparison.periodA.predominantMood).dot}`} />
                      <span>{comparison.periodA.predominantMood}</span>
                    </div>
                  </div>

                  {comparison.periodA.topEmotions.length > 0 && (
                    <div>
                      <span className="text-2xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                        Frequent Emotions
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {comparison.periodA.topEmotions.map((e, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-2xs font-medium border border-slate-200 dark:border-slate-700"
                          >
                            {e.emotion} ({e.count})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {comparison.periodA.topThemes.length > 0 && (
                    <div>
                      <span className="text-2xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                        Focus Themes
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {comparison.periodA.topThemes.map((t, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-2xs font-medium border border-indigo-100 dark:border-indigo-900/50"
                          >
                            {t.theme}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {comparison.periodA.dates.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-2xs text-slate-400 dark:text-slate-500">
                      <span>Logged across {comparison.periodA.dates.length} distinct days</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Period B Summary Card */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-indigo-200 dark:border-indigo-900 shadow-2xs space-y-4 ring-1 ring-indigo-500/10">
                <div className="flex items-center justify-between border-b border-indigo-100 dark:border-indigo-900/50 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                      B
                    </span>
                    <div>
                      <h3 className="text-xs font-bold text-indigo-950 dark:text-indigo-200">{comparison.periodB.label}</h3>
                      <p className="text-2xs text-indigo-600 dark:text-indigo-400">
                        {comparison.periodB.startDate.slice(0, 10)} to {comparison.periodB.endDate.slice(0, 10)}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-full border border-indigo-100 dark:border-indigo-900/50">
                    {comparison.periodB.entryCount} {comparison.periodB.entryCount === 1 ? 'entry' : 'entries'}
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-2xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      Predominant Mood
                    </span>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border border-indigo-200 bg-indigo-50/50 text-indigo-900">
                      <span className={`w-2 h-2 rounded-full ${getMoodStyle(comparison.periodB.predominantMood).dot}`} />
                      <span>{comparison.periodB.predominantMood}</span>
                    </div>
                  </div>

                  {comparison.periodB.topEmotions.length > 0 && (
                    <div>
                      <span className="text-2xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                        Frequent Emotions
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {comparison.periodB.topEmotions.map((e, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 text-2xs font-medium border border-indigo-200"
                          >
                            {e.emotion} ({e.count})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {comparison.periodB.topThemes.length > 0 && (
                    <div>
                      <span className="text-2xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                        Focus Themes
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {comparison.periodB.topThemes.map((t, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-2xs font-medium border border-emerald-100"
                          >
                            {t.theme}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {comparison.periodB.dates.length > 0 && (
                    <div className="pt-2 border-t border-indigo-50 flex items-center justify-between text-2xs text-indigo-600">
                      <span>Logged across {comparison.periodB.dates.length} distinct days</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Detailed Shift Analysis Grids */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Mood & Emotion Shifts */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="w-6 h-6 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <Heart className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white tracking-tight">
                    Mood & Emotional Shifts
                  </h3>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80">
                  <span className="text-2xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    Observed Shift
                  </span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                    {comparison.moodShift.summary}
                  </p>
                </div>

                {/* Emerging vs Subsided Emotions */}
                <div className="space-y-3 pt-1">
                  {comparison.emotionalShifts.emergingEmotions.length > 0 && (
                    <div>
                      <span className="text-2xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Emerging in {comparison.periodB.label}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {comparison.emotionalShifts.emergingEmotions.map((item, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-medium border border-emerald-200 dark:border-emerald-800 flex items-center gap-1"
                          >
                            <span>{item.emotion}</span>
                            <span className="text-2xs font-semibold text-emerald-600 dark:text-emerald-400">
                              {item.countInB === 1 ? '(Early signal)' : `(+${item.countInB})`}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {comparison.emotionalShifts.decliningEmotions.length > 0 && (
                    <div>
                      <span className="text-2xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        Less Prominent in {comparison.periodB.label}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {comparison.emotionalShifts.decliningEmotions.map((item, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium border border-slate-200 dark:border-slate-700 line-through"
                          >
                            {item.emotion}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {comparison.emotionalShifts.persistentEmotions.length > 0 && (
                    <div>
                      <span className="text-2xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        Persistent Emotional Tone
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {comparison.emotionalShifts.persistentEmotions.map((item, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-medium border border-indigo-200 dark:border-indigo-800"
                          >
                            {item.emotion} ({item.countInA} → {item.countInB})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Theme & Priority Shifts */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white tracking-tight">
                    Themes & Priority Evolution
                  </h3>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80">
                  <span className="text-2xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    Theme Trajectory
                  </span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                    {comparison.themeShifts.summary}
                  </p>
                </div>

                <div className="space-y-3 pt-1">
                  {comparison.themeShifts.newThemes.length > 0 && (
                    <div>
                      <span className="text-2xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        Emerging Topics & Focus
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {comparison.themeShifts.newThemes.map((item, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 text-xs font-medium border border-indigo-200 dark:border-indigo-800 flex items-center gap-1"
                          >
                            <span>{item.theme}</span>
                            <span className="text-2xs font-semibold text-indigo-600 dark:text-indigo-400">
                              {item.countInB === 1 ? '(Early signal)' : `(${item.countInB})`}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {comparison.themeShifts.continuedThemes.length > 0 && (
                    <div>
                      <span className="text-2xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        Continuous Themes
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {comparison.themeShifts.continuedThemes.map((item, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700"
                          >
                            {item.theme} ({item.countInA} → {item.countInB})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {comparison.themeShifts.fadedThemes.length > 0 && (
                    <div>
                      <span className="text-2xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                        Subsided Focus
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {comparison.themeShifts.fadedThemes.map((item, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-full bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-500 text-xs font-medium border border-slate-200 dark:border-slate-700 line-through"
                          >
                            {item.theme}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 4. Challenges & Growth Trajectory */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Challenge Trajectory */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="w-6 h-6 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white tracking-tight">
                    Challenges & Resolution Progress
                  </h3>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {comparison.challengeProgress.summary}
                </p>

                <div className="space-y-3 pt-1">
                  {comparison.challengeProgress.resolvedOrDecreasedChallenges.length > 0 && (
                    <div>
                      <span className="text-2xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        Resolved or Less Prominent Challenges
                      </span>
                      <div className="space-y-1.5">
                        {comparison.challengeProgress.resolvedOrDecreasedChallenges.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 text-xs text-emerald-900 dark:text-emerald-200 font-medium flex items-start gap-2"
                          >
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                            <span>{item.challenge}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {comparison.challengeProgress.newChallenges.length > 0 && (
                    <div>
                      <span className="text-2xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Newly Recorded Challenges in {comparison.periodB.label}
                      </span>
                      <div className="space-y-1.5">
                        {comparison.challengeProgress.newChallenges.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200 font-medium flex items-start gap-2"
                          >
                            <span className="text-amber-600 dark:text-amber-400 font-bold">•</span>
                            <span>{item.challenge}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {comparison.challengeProgress.persistentChallenges.length > 0 && (
                    <div>
                      <span className="text-2xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                        Continuing Challenges
                      </span>
                      <div className="space-y-1.5">
                        {comparison.challengeProgress.persistentChallenges.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 text-xs text-slate-700 dark:text-slate-300 font-medium flex items-start gap-2"
                          >
                            <span className="text-slate-400 font-bold">•</span>
                            <span>{item.challenge}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Observed Growth & Supporting Evidence */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="w-6 h-6 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Award className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white tracking-tight">
                    Growth Observations & Milestones
                  </h3>
                </div>

                {comparison.growthTrajectory.observedProgress.length > 0 ? (
                  <div className="space-y-2">
                    <span className="text-2xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Recorded Milestones & Progress
                    </span>
                    <div className="space-y-2">
                      {comparison.growthTrajectory.observedProgress.map((signal, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-xs text-indigo-950 dark:text-indigo-200 font-medium flex items-start gap-2"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                          <span>{signal}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center text-xs text-slate-500 dark:text-slate-400">
                    No explicit growth signals were tagged in this timeframe.
                  </div>
                )}

                {/* Direct Entry Citations */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <span className="text-2xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    Supporting Journal Reflections
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {comparison.periodA.entryIds.map((id, idx) => (
                      <button
                        key={id}
                        id={`open-period-a-entry-${idx}`}
                        type="button"
                        onClick={() => onOpenEntry && onOpenEntry(id)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-2xs font-medium border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition-colors"
                        title={`Open Period A entry ${id}`}
                      >
                        <BookOpen className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                        <span>Entry A-{idx + 1}</span>
                      </button>
                    ))}
                    {comparison.periodB.entryIds.map((id, idx) => (
                      <button
                        key={id}
                        id={`open-period-b-entry-${idx}`}
                        type="button"
                        onClick={() => onOpenEntry && onOpenEntry(id)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-2xs font-medium border border-indigo-200 dark:border-indigo-800 flex items-center gap-1 transition-colors"
                        title={`Open Period B entry ${id}`}
                      >
                        <BookOpen className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                        <span>Entry B-{idx + 1}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
