import React from 'react';
import { AIAnalysis } from '../types';
import { 
  Sparkles, 
  Heart, 
  HelpCircle, 
  Lightbulb, 
  TrendingUp, 
  Calendar, 
  Hash, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';

interface AIInsightsViewProps {
  analysis: AIAnalysis;
  entryVersion: number;
  onReanalyze?: () => void;
  isReanalyzing?: boolean;
}

export const AIInsightsView: React.FC<AIInsightsViewProps> = ({
  analysis,
  entryVersion,
  onReanalyze,
  isReanalyzing = false,
}) => {
  const analysisVer = typeof analysis.analysisVersion === 'number' ? analysis.analysisVersion : 1;
  const currentVer = typeof entryVersion === 'number' ? entryVersion : 1;
  const isCurrent = analysisVer === currentVer;

  const formattedAnalyzedDate = analysis.analyzedAt
    ? new Date(analysis.analyzedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="mt-10 pt-8 border-t border-slate-200 dark:border-slate-800 transition-colors">
      {/* Header Container */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-100 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white tracking-tight">AI Insights & Reflection</h2>
              {isCurrent ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>Based on this entry</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                  <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  <span>Stale (Entry v{currentVer} • Insight v{analysisVer})</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Private, evidence-based reflections grounded strictly in your writing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {formattedAnalyzedDate && (
            <span className="text-[11px] text-slate-400 dark:text-slate-500">Reflected {formattedAnalyzedDate}</span>
          )}
          {onReanalyze && (
            <button
              id="reanalyze-btn"
              onClick={onReanalyze}
              disabled={isReanalyzing}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shadow-2xs disabled:opacity-50 ${
                isCurrent
                  ? 'text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
                  : 'text-amber-900 dark:text-amber-200 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-300 dark:border-amber-700'
              }`}
              title={isCurrent ? 'Regenerate Insights' : 'Refresh AI Insights'}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReanalyzing ? 'animate-spin text-indigo-600 dark:text-indigo-400' : ''}`} />
              <span>
                {isReanalyzing
                  ? 'MindVault is reflecting...'
                  : isCurrent
                  ? 'Regenerate Insights'
                  : 'Refresh AI Insights'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Stale Analysis Alert Banner */}
      {!isCurrent && (
        <div className="mb-6 p-3.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-xs font-medium">
              These insights are based on an earlier version of this entry.
            </p>
          </div>
          {onReanalyze && (
            <button
              id="stale-refresh-btn"
              onClick={onReanalyze}
              disabled={isReanalyzing}
              className="px-3 py-1 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-md transition-colors shrink-0 flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isReanalyzing ? 'animate-spin' : ''}`} />
              <span>{isReanalyzing ? 'Reflecting...' : 'Refresh AI Insights'}</span>
            </button>
          )}
        </div>
      )}

      <div className="space-y-6">
        {/* 1. Overview Synopsis */}
        {analysis.overview && (
          <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-slate-50 to-white dark:from-slate-800/80 dark:via-slate-800/40 dark:to-slate-900 border border-indigo-100/80 dark:border-slate-800 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-900 dark:text-indigo-400 mb-2">
              Overview
            </p>
            <p className="text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-200 font-medium">
              {analysis.overview}
            </p>
          </div>
        )}

        {/* 2. Emotional Landscape & Themes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Mood & Emotions */}
          <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              <Heart className="w-3.5 h-3.5 text-rose-500" />
              <span>Mood & Emotions</span>
            </div>

            <div className="space-y-2.5">
              {analysis.mood && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Dominant Mood:</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-100 dark:border-rose-900">
                    {analysis.mood}
                  </span>
                </div>
              )}

              {analysis.emotions && analysis.emotions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {analysis.emotions.map((emotion, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md text-xs font-medium bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                    >
                      {emotion}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Key Themes */}
          <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              <Hash className="w-3.5 h-3.5 text-indigo-500" />
              <span>Key Themes</span>
            </div>

            {analysis.keyThemes && analysis.keyThemes.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {analysis.keyThemes.map((theme, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900"
                  >
                    #{theme}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic">No specific themes detected.</p>
            )}
          </div>
        </div>

        {/* 3. Important Thoughts & Significant Events */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Important Thoughts */}
          {analysis.importantThoughts && analysis.importantThoughts.length > 0 && (
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                <span>Important Realizations</span>
              </div>
              <ul className="space-y-2">
                {analysis.importantThoughts.map((thought, idx) => (
                  <li key={idx} className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 flex items-start gap-2 leading-relaxed">
                    <span className="text-amber-500 mt-0.5">•</span>
                    <span>{thought}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Significant Events */}
          {analysis.significantEvents && analysis.significantEvents.length > 0 && (
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-sky-500" />
                <span>Significant Events</span>
              </div>
              <ul className="space-y-2">
                {analysis.significantEvents.map((event, idx) => (
                  <li key={idx} className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 flex items-start gap-2 leading-relaxed">
                    <span className="text-sky-500 mt-0.5">•</span>
                    <span>{event}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* 4. Growth Signals */}
        {analysis.growthSignals && analysis.growthSignals.length > 0 && (
          <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/60">
            <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Growth Signals & Self-Awareness</span>
            </div>
            <ul className="space-y-1.5">
              {analysis.growthSignals.map((signal, idx) => (
                <li key={idx} className="text-xs sm:text-sm text-emerald-900/90 dark:text-emerald-200 flex items-start gap-2 leading-relaxed">
                  <span className="text-emerald-500 mt-0.5">•</span>
                  <span>{signal}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 5. Reflection Questions */}
        {analysis.reflectionQuestions && analysis.reflectionQuestions.length > 0 && (
          <div className="p-5 rounded-2xl bg-slate-900 dark:bg-slate-950 border border-slate-800 text-white shadow-xs">
            <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-indigo-300">
              <HelpCircle className="w-4 h-4 text-indigo-400" />
              <span>Questions for Personal Reflection</span>
            </div>
            <div className="space-y-2.5">
              {analysis.reflectionQuestions.map((q, idx) => (
                <div key={idx} className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-800/60 dark:bg-slate-900/80 border border-slate-700/50 dark:border-slate-800">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold shrink-0">
                    {idx + 1}
                  </span>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                    {q}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
