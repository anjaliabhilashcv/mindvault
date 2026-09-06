import React, { useState } from 'react';
import { JournalEntry } from '../types';
import { PdfExportService, PdfExportProgress } from '../lib/pdfExportService';
import { FileText, Download, AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';

interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: JournalEntry[];
  userName: string;
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  isOpen,
  onClose,
  entries,
  userName,
}) => {
  const [exportState, setExportState] = useState<PdfExportProgress>({
    status: 'initializing',
  });
  const [isExporting, setIsExporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartExport = async () => {
    if (entries.length === 0) return;

    setIsExporting(true);
    setErrorMsg(null);

    try {
      await PdfExportService.exportJournalPdf(entries, userName, (progress) => {
        setExportState(progress);
      });
      // Close modal after brief success confirmation
      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('PDF export failed:', err);
      setIsExporting(false);
      setErrorMsg(
        err instanceof Error ? err.message : 'An error occurred while generating your journal PDF.'
      );
    }
  };

  const mediaCount = entries.filter(
    (e) => Array.isArray(e.attachments) && e.attachments.length > 0
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 relative">
        {/* Close button */}
        {!isExporting && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Export all journals as PDF?</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Export your entire private memory vault</p>
          </div>
        </div>

        {/* Details card */}
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-4 text-xs space-y-2 text-slate-700 dark:text-slate-300">
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Account Vault:</span>
            <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[180px]">{userName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Total Entries:</span>
            <span className="font-semibold text-slate-900 dark:text-white">{entries.length} memories</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Media Attachments:</span>
            <span className="font-semibold text-slate-900 dark:text-white">{mediaCount} photos</span>
          </div>
        </div>

        {/* Error state */}
        {errorMsg && (
          <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/80 rounded-2xl p-3.5 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
            <p className="leading-relaxed">{errorMsg}</p>
          </div>
        )}

        {/* Export Progress / Loading */}
        {isExporting ? (
          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-2">
                {exportState.status === 'completed' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Loader2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-spin" />
                )}
                <span>
                  {exportState.status === 'completed'
                    ? 'Export Complete!'
                    : exportState.currentStep || 'Generating PDF document...'}
                </span>
              </span>
              {exportState.totalCount && (
                <span>
                  {exportState.processedCount || 0} / {exportState.totalCount}
                </span>
              )}
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 dark:bg-indigo-500 h-full transition-all duration-300"
                style={{
                  width: exportState.totalCount
                    ? `${Math.round(((exportState.processedCount || 0) / exportState.totalCount) * 100)}%`
                    : '20%',
                }}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              id="confirm-pdf-export-btn"
              onClick={handleStartExport}
              disabled={entries.length === 0}
              className="px-5 py-2.5 bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white text-xs font-semibold rounded-full shadow-md active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>Export PDF</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
