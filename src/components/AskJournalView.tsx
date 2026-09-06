import React, { useState } from 'react';
import { 
  Sparkles, 
  Search, 
  ArrowRight, 
  BookOpen, 
  Calendar, 
  ShieldCheck, 
  AlertCircle, 
  RotateCcw,
  MessageSquareQuote,
  History,
  CheckCircle2,
  HelpCircle,
  Loader2
} from 'lucide-react';
import { JournalService } from '../lib/journalService';
import { SupportingEntryReference, AskHistoryItem } from '../types';

interface AskJournalViewProps {
  onOpenEntry: (entryId: string) => void;
  onNewEntry: () => void;
}

const SUGGESTED_QUESTIONS = [
  'What have I been stressed or anxious about lately?',
  'What goals, projects, or plans have I mentioned?',
  'When was the last time I felt really proud or confident?',
  'What recurring themes keep appearing in my journal?',
  'What challenges have I faced and how did I handle them?',
];

export const AskJournalView: React.FC<AskJournalViewProps> = ({ onOpenEntry, onNewEntry }) => {
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState<{
    question: string;
    answer: string;
    confidence: 'high' | 'medium' | 'low';
    supportingEntries: SupportingEntryReference[];
    noEvidence?: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<AskHistoryItem[]>([]);

  const handleAsk = async (queryText?: string) => {
    const textToAsk = (queryText || question).trim();
    if (!textToAsk || isAsking) return;

    setIsAsking(true);
    setError(null);

    try {
      const response = await JournalService.askJournalQuestion(textToAsk);

      const answerData = {
        question: textToAsk,
        answer: response.answer,
        confidence: response.confidence,
        supportingEntries: response.supportingEntries || [],
        noEvidence: response.noEvidence,
      };

      setCurrentAnswer(answerData);

      // Add to session history
      const historyItem: AskHistoryItem = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        question: textToAsk,
        answer: response.answer,
        confidence: response.confidence,
        supportingEntries: response.supportingEntries || [],
        noEvidence: response.noEvidence,
        askedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setHistory((prev) => [historyItem, ...prev.slice(0, 9)]);
    } catch (err) {
      console.error('Ask My Journal error:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to retrieve insights from your journal. Please try again.'
      );
    } finally {
      setIsAsking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  const handleSelectSuggested = (suggested: string) => {
    setQuestion(suggested);
    handleAsk(suggested);
  };

  const handleSelectFromHistory = (item: AskHistoryItem) => {
    setQuestion(item.question);
    setCurrentAnswer({
      question: item.question,
      answer: item.answer,
      confidence: item.confidence,
      supportingEntries: item.supportingEntries,
      noEvidence: item.noEvidence,
    });
    setError(null);
  };

  const getConfidenceBadge = (confidence: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            High Evidence
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/60">
            <HelpCircle className="w-3 h-3 text-amber-600" />
            Moderate Evidence
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <HelpCircle className="w-3 h-3 text-slate-500" />
            Limited Evidence
          </span>
        );
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#F9FAFB] dark:bg-slate-950 p-4 sm:p-8 transition-colors">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Ask My Journal</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Evidence-grounded reflections across your private journal history
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-2">
            Ask questions about your thoughts, challenges, emotions, or goals. MindVault searches your memories and synthesizes grounded insights with verifiable references to what you wrote.
          </p>

          {/* Search Box */}
          <div className="mt-5 space-y-3">
            <div className="relative flex items-center">
              <input
                id="ask-journal-input"
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your past thoughts, feelings, or experiences..."
                disabled={isAsking}
                className="w-full pl-11 pr-28 py-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
              />
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-4 pointer-events-none" />
              <button
                id="ask-journal-submit-btn"
                onClick={() => handleAsk()}
                disabled={isAsking || !question.trim()}
                className="absolute right-2 px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shadow-xs"
              >
                {isAsking ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Reflecting...</span>
                  </>
                ) : (
                  <>
                    <span>Ask</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

            {/* Suggested Starter Chips */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                Suggested inquiries:
              </span>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_QUESTIONS.map((sq, idx) => (
                  <button
                    key={idx}
                    id={`suggested-question-btn-${idx}`}
                    onClick={() => handleSelectSuggested(sq)}
                    disabled={isAsking}
                    className="text-xs px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors text-left border border-slate-200/70 dark:border-slate-700"
                  >
                    {sq}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Loading Indicator */}
        {isAsking && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-indigo-100 dark:border-indigo-900 p-8 text-center space-y-4 shadow-xs animate-pulse">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Reviewing Your Vault</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Searching relevant memories, emotions, and themes to synthesize an evidence-grounded answer...
              </p>
            </div>
          </div>
        )}

        {/* Error Card */}
        {error && !isAsking && (
          <div className="bg-red-50/80 dark:bg-red-950/50 rounded-2xl border border-red-200 dark:border-red-800 p-5 text-red-800 dark:text-red-300 space-y-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-semibold">Couldn't Answer Question</h4>
                <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed">{error}</p>
              </div>
            </div>
            <button
              id="ask-retry-btn"
              onClick={() => handleAsk()}
              className="px-3.5 py-1.5 bg-red-100 dark:bg-red-900/60 hover:bg-red-200 dark:hover:bg-red-900 text-red-800 dark:text-red-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Try Again</span>
            </button>
          </div>
        )}

        {/* Active Answer Card */}
        {currentAnswer && !isAsking && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
            {/* Answer Header */}
            <div className="p-6 space-y-3">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <MessageSquareQuote className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Reflection
                  </span>
                </div>
                {getConfidenceBadge(currentAnswer.confidence)}
              </div>

              <h3 className="text-base font-semibold text-slate-900 dark:text-white leading-snug">
                "{currentAnswer.question}"
              </h3>

              <div className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed space-y-3 whitespace-pre-wrap pt-2">
                {currentAnswer.answer}
              </div>
            </div>

            {/* Supporting Evidence References */}
            {currentAnswer.supportingEntries && currentAnswer.supportingEntries.length > 0 && (
              <div className="p-6 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Supporting Memories ({currentAnswer.supportingEntries.length})
                  </span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    Click to view original journal entry
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentAnswer.supportingEntries.map((ref, idx) => (
                    <button
                      key={ref.entryId || idx}
                      id={`supporting-entry-${ref.entryId}`}
                      onClick={() => onOpenEntry(ref.entryId)}
                      className="text-left p-3.5 bg-white dark:bg-slate-900 hover:bg-indigo-50/50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 rounded-xl transition-all group flex flex-col justify-between shadow-2xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                          <Calendar className="w-3 h-3" />
                          <span>{ref.date}</span>
                          {ref.mood && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                              {ref.mood}
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                          {ref.title || 'Untitled Entry'}
                        </h4>
                      </div>
                      <div className="mt-2.5 flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform">
                        <BookOpen className="w-3 h-3" />
                        <span>Read original</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* If no evidence was found */}
            {currentAnswer.noEvidence && (
              <div className="p-6 bg-amber-50/40 dark:bg-amber-950/30 space-y-2 text-center">
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Tip: You can write about new experiences to build your memory vault.
                </p>
                <button
                  id="ask-empty-new-entry-btn"
                  onClick={onNewEntry}
                  className="px-4 py-1.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-semibold rounded-lg hover:bg-amber-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Write a New Journal Entry
                </button>
              </div>
            )}
          </div>
        )}

        {/* Previous Inquiries History (Session) */}
        {history.length > 1 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <History className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Recent Inquiries This Session
              </h4>
            </div>

            <div className="space-y-2">
              {history.slice(1).map((item) => (
                <button
                  key={item.id}
                  id={`history-item-${item.id}`}
                  onClick={() => handleSelectFromHistory(item)}
                  className="w-full text-left p-3.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl transition-all flex items-center justify-between gap-4"
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                      {item.question}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                      {item.answer}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 font-medium">
                    {item.askedAt}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Security & Privacy Notice */}
        <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-800 p-3.5 flex items-center gap-3 text-slate-500 dark:text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <p className="text-[11px] leading-relaxed">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Privacy Guarantee:</span> Inquiries are grounded solely in your private journal entries. Tokens and identities are verified server-side, and your writing is never accessible to other users.
          </p>
        </div>
      </div>
    </div>
  );
};
