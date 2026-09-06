import React, { useState } from 'react';
import { JournalEntry, AIAnalysis } from '../types';
import { useAuth } from '../context/AuthContext';
import { JournalService } from '../lib/journalService';
import { StorageService } from '../lib/storageService';
import { PdfExportService } from '../lib/pdfExportService';
import { fetchWithAuth, safeParseJsonResponse } from '../lib/api';
import { ConfirmModal } from './ConfirmModal';
import { AIInsightsView } from './AIInsightsView';
import { MediaGallery } from './MediaGallery';
import { ArrowLeft, Edit3, Trash2, Tag, Sparkles, AlertCircle, RefreshCw, Image as ImageIcon, FileText } from 'lucide-react';

interface JournalDetailProps {
  entry: JournalEntry;
  onBack: () => void;
  onEdit: (entry: JournalEntry) => void;
  onDeleteSuccess: (deletedEntryId: string) => void;
  showBackBtn?: boolean;
}

export const JournalDetail: React.FC<JournalDetailProps> = ({
  entry,
  onBack,
  onEdit,
  onDeleteSuccess,
  showBackBtn = true,
}) => {
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Single PDF Export state
  const [isExportingSinglePdf, setIsExportingSinglePdf] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // AI Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const handleExportSinglePdf = async () => {
    if (isExportingSinglePdf) return;
    setIsExportingSinglePdf(true);
    try {
      const userName = user?.displayName || user?.email || 'User';
      await PdfExportService.exportSingleJournalPdf(entry, userName);
      setShowExportModal(false);
    } catch (err) {
      console.error('Single PDF export error:', err);
    } finally {
      setIsExportingSinglePdf(false);
    }
  };

  const formattedDate = new Date(entry.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedTime = new Date(entry.createdAt).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const isUpdated = entry.updatedAt && entry.updatedAt !== entry.createdAt;

  const timeAgo = (isoString?: string) => {
    if (!isoString) return 'Just now';
    const diffMs = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const handleDelete = async () => {
    if (!user) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      // Clean up storage attachments if any
      if (entry.attachments && entry.attachments.length > 0) {
        await Promise.allSettled(
          entry.attachments.map((att) => StorageService.deleteMediaAttachment(att, user.uid))
        );
      }

      await JournalService.deleteEntry(user.uid, entry.id);
      setShowDeleteModal(false);
      onDeleteSuccess(entry.id);
    } catch (err) {
      console.error('Delete error:', err);
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete entry');
      setIsDeleting(false);
    }
  };

  const handleGenerateAIInsights = async () => {
    if (!user || isAnalyzing) return;

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const response = await fetchWithAuth('/api/analyze-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId: entry.id }),
      });

      const data = await safeParseJsonResponse<{
        success?: boolean;
        error?: string;
        analysis?: Partial<AIAnalysis>;
      }>(response);

      if (!response.ok || !data.success || !data.analysis) {
        throw new Error(data.error || "Your entry is safe, but AI insights couldn't be generated.");
      }

      const generatedAnalysis: AIAnalysis = {
        overview: data.analysis.overview || '',
        mood: data.analysis.mood || '',
        emotions: Array.isArray(data.analysis.emotions) ? data.analysis.emotions : [],
        keyThemes: Array.isArray(data.analysis.keyThemes) ? data.analysis.keyThemes : [],
        importantThoughts: Array.isArray(data.analysis.importantThoughts) ? data.analysis.importantThoughts : [],
        significantEvents: Array.isArray(data.analysis.significantEvents) ? data.analysis.significantEvents : [],
        growthSignals: Array.isArray(data.analysis.growthSignals) ? data.analysis.growthSignals : [],
        reflectionQuestions: Array.isArray(data.analysis.reflectionQuestions) ? data.analysis.reflectionQuestions : [],
        analyzedAt: data.analysis.analyzedAt || new Date().toISOString(),
        analysisVersion:
          typeof data.analysis.analysisVersion === 'number'
            ? data.analysis.analysisVersion
            : (entry.version || 1),
      };

      // Save analysis to Firestore entry without altering the original user text
      try {
        await JournalService.saveAiAnalysis(user.uid, entry.id, generatedAnalysis);
      } catch (saveError) {
        console.error('Firestore saveAiAnalysis failed:', saveError);
        throw new Error("AI insights were generated, but couldn't be saved to the database. Please try again.");
      }
    } catch (err) {
      console.error('AI Analysis failed:', err);
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Your entry is safe, but AI insights couldn't be generated.";
      setAnalysisError(message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 h-full overflow-hidden transition-colors">
      {/* Detail Action Header */}
      <div className="flex items-center justify-between px-6 sm:px-10 py-4 sm:py-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500 text-xs sm:text-sm">
          {showBackBtn && (
            <button
              id="detail-back-btn"
              onClick={onBack}
              className="p-1 -ml-1 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 md:hidden rounded transition-colors mr-1"
              aria-label="Back to list"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <span className="font-medium text-slate-600 dark:text-slate-300">{formattedDate}</span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span>{formattedTime}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            id="detail-export-pdf-btn"
            onClick={() => setShowExportModal(true)}
            disabled={isExportingSinglePdf}
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title="Export this entry as PDF"
          >
            {isExportingSinglePdf ? (
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" />
            ) : (
              <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            )}
            <span className="hidden sm:inline">Export PDF</span>
          </button>

          <button
            id="detail-edit-btn"
            onClick={() => onEdit(entry)}
            className="p-2 text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
            title="Edit entry"
          >
            <Edit3 className="w-4 h-4" />
            <span className="hidden sm:inline">Edit</span>
          </button>
          <button
            id="detail-delete-btn"
            onClick={() => setShowDeleteModal(true)}
            className="p-2 text-slate-400 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
            title="Delete entry"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Delete</span>
          </button>
        </div>
      </div>

      {deleteError && (
        <div className="mx-6 sm:mx-10 mt-4 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/80 text-xs text-red-800 dark:text-red-300">
          {deleteError}
        </div>
      )}

      {/* Main Reading Canvas */}
      <div className="flex-1 px-6 sm:px-12 md:px-16 py-8 sm:py-10 overflow-y-auto">
        <h1 className="text-2xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight mb-4 leading-tight">
          {entry.title}
        </h1>

        {/* Mood and Tags metadata chips */}
        {(entry.mood || (entry.tags && entry.tags.length > 0) || (entry.attachments && entry.attachments.length > 0)) && (
          <div className="flex flex-wrap items-center gap-2 mb-8 pb-4 border-b border-slate-100 dark:border-slate-800">
            {entry.mood && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900">
                Mood: {entry.mood}
              </span>
            )}
            {entry.attachments && entry.attachments.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-900">
                <ImageIcon className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                {entry.attachments.length} {entry.attachments.length === 1 ? 'Media' : 'Media items'}
              </span>
            )}
            {entry.tags &&
              entry.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                >
                  <Tag className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                  #{tag}
                </span>
              ))}
          </div>
        )}

        {/* Entry Text */}
        <div className="text-base sm:text-lg leading-relaxed text-slate-700 dark:text-slate-200 whitespace-pre-wrap selection:bg-indigo-100 dark:selection:bg-indigo-900 font-sans space-y-4">
          {entry.content}
        </div>

        {/* Attached Media Gallery (Photos & Video Clips) */}
        {entry.attachments && entry.attachments.length > 0 && (
          <MediaGallery attachments={entry.attachments} />
        )}

        {/* AI Insights Container */}
        {entry.aiAnalysis ? (
          <AIInsightsView
            analysis={entry.aiAnalysis}
            entryVersion={entry.version || 1}
            onReanalyze={handleGenerateAIInsights}
            isReanalyzing={isAnalyzing}
          />
        ) : (
          <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800">
            {/* Generate Insights Trigger Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/40 dark:from-slate-800/80 dark:to-indigo-950/40 border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 shadow-xs mt-0.5">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Reflective AI Insights</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-md">
                    Generate private, grounded reflections to uncover emotions, themes, growth signals, and questions.
                  </p>
                </div>
              </div>

              <button
                id="generate-ai-insights-btn"
                onClick={handleGenerateAIInsights}
                disabled={isAnalyzing}
                className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>MindVault is reflecting on this entry...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate AI Insights</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* AI Analysis Error State with Try Again */}
        {analysisError && (
          <div className="mt-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-amber-900 dark:text-amber-200">{analysisError}</p>
                <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">Your original journal entry is completely safe.</p>
              </div>
            </div>
            <button
              id="retry-ai-insights-btn"
              onClick={handleGenerateAIInsights}
              disabled={isAnalyzing}
              className="px-3 py-1.5 text-xs font-semibold text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/60 hover:bg-amber-200 dark:hover:bg-amber-900 rounded-lg transition-colors shrink-0"
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* Bottom Sync Status Bar */}
      <div className="px-6 sm:px-10 py-3.5 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Private & synced to Firestore
          </span>
        </div>
        <div className="text-xs text-slate-400 dark:text-slate-500">
          {isUpdated ? `Edited ${timeAgo(entry.updatedAt)}` : `Saved ${timeAgo(entry.createdAt)}`}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete Journal Entry"
        message="Are you sure you want to permanently delete this memory? This action cannot be undone."
        confirmLabel="Delete Permanently"
        cancelLabel="Cancel"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />

      {/* Export Confirmation Modal */}
      <ConfirmModal
        isOpen={showExportModal}
        title="Export this journal as PDF?"
        message={`This will export a beautiful PDF document of this journal entry.\n\nIncluded details:\n• Title: "${entry.title || 'Untitled'}"\n• Written Content: Yes\n• Mood: ${entry.mood || 'None Specified'}\n• Image Attachments: ${entry.attachments?.length || 0} photo(s)\n• MindVault AI Analysis: ${entry.aiAnalysis ? 'Yes' : 'None'}`}
        confirmLabel="Export PDF"
        cancelLabel="Cancel"
        isLoading={isExportingSinglePdf}
        onConfirm={handleExportSinglePdf}
        onCancel={() => setShowExportModal(false)}
      />
    </div>
  );
};
