import React, { useState, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { JournalAttachment, AttachmentType } from '../types';
import { 
  StorageService, 
  MAX_ATTACHMENTS_PER_ENTRY, 
  UploadProgressInfo, 
  UploadHandle 
} from '../lib/storageService';
import { 
  Paperclip, 
  Film, 
  Image as ImageIcon, 
  X, 
  AlertCircle, 
  Trash2, 
  Loader2,
  Upload,
  ExternalLink,
  Plus
} from 'lucide-react';

export interface ActiveUploadItem {
  id: string;
  file: File;
  type: AttachmentType;
  progress: number;
  handle?: UploadHandle;
  error?: string;
}

export interface MediaAttachmentManagerRef {
  openFilePicker: () => void;
  getActiveUploadsCount: () => number;
}

interface MediaAttachmentManagerProps {
  userId: string;
  attachments: JournalAttachment[];
  onChange: (attachments: JournalAttachment[] | ((prev: JournalAttachment[]) => JournalAttachment[])) => void;
  disabled?: boolean;
  onActiveUploadsChange?: (count: number) => void;
}

export const MediaAttachmentManager = forwardRef<MediaAttachmentManagerRef, MediaAttachmentManagerProps>(({
  userId,
  attachments,
  onChange,
  disabled = false,
  onActiveUploadsChange,
}, ref) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploads, setActiveUploads] = useState<ActiveUploadItem[]>([]);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [selectedPreview, setSelectedPreview] = useState<JournalAttachment | null>(null);

  useImperativeHandle(ref, () => ({
    openFilePicker: () => {
      if (!disabled && fileInputRef.current) {
        fileInputRef.current.click();
      }
    },
    getActiveUploadsCount: () => activeUploads.length,
  }));

  const totalAttachments = attachments.length + activeUploads.length;
  const isAtLimit = totalAttachments >= MAX_ATTACHMENTS_PER_ENTRY;

  const handleFiles = useCallback((files: FileList | File[]) => {
    if (disabled || !userId) return;
    setGeneralError(null);

    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const remainingSlots = MAX_ATTACHMENTS_PER_ENTRY - (attachments.length + activeUploads.length);
    if (remainingSlots <= 0) {
      setGeneralError(`Maximum of ${MAX_ATTACHMENTS_PER_ENTRY} attachments per journal entry reached.`);
      return;
    }

    const filesToProcess = fileArray.slice(0, remainingSlots);
    if (fileArray.length > remainingSlots) {
      setGeneralError(`Only ${remainingSlots} more attachment(s) could be added to stay within the limit.`);
    }

    filesToProcess.forEach((file) => {
      const validation = StorageService.validateFile(file);
      if (validation.error) {
        setGeneralError(validation.error);
        return;
      }

      const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      
      const newActiveUpload: ActiveUploadItem = {
        id: uploadId,
        file,
        type: validation.type,
        progress: 15,
      };

      setActiveUploads((prev) => {
        const next = [...prev, newActiveUpload];
        onActiveUploadsChange?.(next.length);
        return next;
      });

      try {
        const uploadHandle = StorageService.uploadMediaAttachment(
          userId,
          file,
          (prog: UploadProgressInfo) => {
            setActiveUploads((prev) =>
              prev.map((item) =>
                item.id === uploadId ? { ...item, progress: prog.percent } : item
              )
            );
          }
        );

        // Store handle for potential cancellation
        setActiveUploads((prev) =>
          prev.map((item) =>
            item.id === uploadId ? { ...item, handle: uploadHandle } : item
          )
        );

        uploadHandle.promise
          .then((newAttachment) => {
            // Remove from active uploads
            setActiveUploads((prev) => {
              const next = prev.filter((item) => item.id !== uploadId);
              onActiveUploadsChange?.(next.length);
              return next;
            });
            // Add to attachments
            onChange((prev) => {
              const currentList = Array.isArray(prev) ? prev : attachments;
              if (currentList.some((a) => a.id === newAttachment.id)) {
                return currentList;
              }
              return [...currentList, newAttachment];
            });
          })
          .catch((err) => {
            const errorMsg = err instanceof Error ? err.message : 'Upload failed';
            if (errorMsg.includes('cancelled')) {
              setActiveUploads((prev) => {
                const next = prev.filter((item) => item.id !== uploadId);
                onActiveUploadsChange?.(next.length);
                return next;
              });
            } else {
              setActiveUploads((prev) =>
                prev.map((item) =>
                  item.id === uploadId ? { ...item, error: errorMsg } : item
                )
              );
            }
          });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not start upload';
        setGeneralError(msg);
        setActiveUploads((prev) => {
          const next = prev.filter((item) => item.id !== uploadId);
          onActiveUploadsChange?.(next.length);
          return next;
        });
      }
    });
  }, [disabled, userId, attachments, activeUploads, onChange, onActiveUploadsChange]);

  const handleCancelUpload = (uploadId: string) => {
    const item = activeUploads.find((u) => u.id === uploadId);
    if (item?.handle) {
      item.handle.cancel();
    }
    setActiveUploads((prev) => {
      const next = prev.filter((u) => u.id !== uploadId);
      onActiveUploadsChange?.(next.length);
      return next;
    });
  };

  const handleRemoveAttachment = async (attachment: JournalAttachment) => {
    if (disabled) return;
    onChange((prev) => {
      const currentList = Array.isArray(prev) ? prev : attachments;
      return currentList.filter((a) => a.id !== attachment.id);
    });

    try {
      await StorageService.deleteMediaAttachment(attachment, userId);
    } catch (e) {
      console.warn('Storage cleanup warning:', e);
    }
  };

  const handleRetryUpload = (item: ActiveUploadItem) => {
    // Remove failed item and retry with original file
    setActiveUploads((prev) => {
      const next = prev.filter((u) => u.id !== item.id);
      onActiveUploadsChange?.(next.length);
      return next;
    });
    handleFiles([item.file]);
  };

  const hasItems = attachments.length > 0 || activeUploads.length > 0 || generalError !== null;

  return (
    <div className="space-y-3">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/svg+xml"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          if (e.target.files) {
            handleFiles(e.target.files);
            e.target.value = ''; // Reset for re-selection
          }
        }}
      />

      {/* General Error Banner */}
      {generalError && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2 justify-between">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>{generalError}</span>
          </div>
          <button
            type="button"
            onClick={() => setGeneralError(null)}
            className="text-amber-600 hover:text-amber-800 p-0.5 rounded"
            aria-label="Dismiss error"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Active Uploading List */}
      {activeUploads.length > 0 && (
        <div className="space-y-2">
          {activeUploads.map((item) => (
            <div
              key={item.id}
              className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-colors ${
                item.error
                  ? 'bg-red-50/60 border-red-200 text-red-900'
                  : 'bg-indigo-50/50 border-indigo-100 text-indigo-950'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {item.type === 'video' ? (
                  <Film className={`w-4 h-4 shrink-0 ${item.error ? 'text-red-500' : 'text-purple-600'}`} />
                ) : (
                  <ImageIcon className={`w-4 h-4 shrink-0 ${item.error ? 'text-red-500' : 'text-indigo-600'}`} />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between text-[11px] font-medium mb-1">
                    <span className="truncate max-w-[220px] font-medium" title={item.file.name}>
                      {item.file.name}
                    </span>
                    {!item.error && (
                      <span className="text-indigo-600 font-semibold shrink-0 ml-2">
                        {item.progress}%
                      </span>
                    )}
                  </div>

                  {!item.error ? (
                    <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full transition-all duration-200 rounded-full"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  ) : (
                    <p className="text-[11px] text-red-600 truncate">{item.error}</p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                {item.error ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleRetryUpload(item)}
                      className="px-2 py-0.5 text-[11px] font-medium text-red-700 hover:bg-red-100/80 rounded transition-colors"
                    >
                      Retry
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCancelUpload(item.id)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded"
                      title="Dismiss"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleCancelUpload(item.id)}
                    className="px-2 py-1 text-[11px] font-medium text-slate-500 hover:text-red-600 hover:bg-white rounded border border-slate-200 transition-colors"
                    title="Cancel upload"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Uploaded Attachments Grid / Strip */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <span className="flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
              Attached Media ({attachments.length}/{MAX_ATTACHMENTS_PER_ENTRY})
            </span>
            {!isAtLimit && (
              <button
                type="button"
                onClick={() => !disabled && fileInputRef.current?.click()}
                disabled={disabled}
                className="text-indigo-600 hover:text-indigo-800 text-[11px] font-medium flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add more
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="group relative rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex flex-col transition-all hover:border-slate-300 hover:shadow-xs cursor-pointer"
                onClick={() => setSelectedPreview(att)}
              >
                {/* Media Thumbnail Container */}
                <div className="relative aspect-video w-full bg-slate-900 flex items-center justify-center overflow-hidden">
                  {att.type === 'image' ? (
                    <img
                      src={att.downloadUrl}
                      alt={att.fileName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                  ) : (
                    <video
                      src={att.downloadUrl}
                      className="w-full h-full object-cover"
                      preload="metadata"
                    />
                  )}

                  {/* Video Overlay Badge */}
                  {att.type === 'video' && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
                      <div className="p-1.5 rounded-full bg-white/90 text-slate-800 shadow-xs">
                        <Film className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  )}

                  {/* Quick Remove Button */}
                  {!disabled && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveAttachment(att);
                      }}
                      className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-black/60 hover:bg-red-600 text-white transition-colors opacity-90 sm:opacity-0 sm:group-hover:opacity-100"
                      title="Remove attachment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Card Meta */}
                <div className="p-2 bg-white flex items-center justify-between text-[11px] text-slate-500">
                  <span className="truncate max-w-[100px] font-medium text-slate-700" title={att.fileName}>
                    {att.fileName}
                  </span>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {StorageService.formatBytes(att.fileSize)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox / Preview Modal for Attachment Inspection */}
      {selectedPreview && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setSelectedPreview(null)}
        >
          <div
            className="relative max-w-3xl max-h-[85vh] w-full bg-slate-900 rounded-2xl overflow-hidden flex flex-col items-center justify-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
              <a
                href={selectedPreview.downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors"
                title="Open original in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={() => setSelectedPreview(null)}
                className="p-2 rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors"
                title="Close preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="w-full flex items-center justify-center p-4 max-h-[70vh] overflow-hidden">
              {selectedPreview.type === 'image' ? (
                <img
                  src={selectedPreview.downloadUrl}
                  alt={selectedPreview.fileName}
                  referrerPolicy="no-referrer"
                  className="max-h-[65vh] max-w-full object-contain rounded-lg"
                />
              ) : (
                <video
                  src={selectedPreview.downloadUrl}
                  controls
                  autoPlay
                  className="max-h-[65vh] max-w-full rounded-lg"
                />
              )}
            </div>

            <div className="w-full bg-slate-950 px-5 py-3 flex items-center justify-between text-xs text-slate-300">
              <span className="truncate font-medium max-w-[300px]">{selectedPreview.fileName}</span>
              <span>{StorageService.formatBytes(selectedPreview.fileSize)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

MediaAttachmentManager.displayName = 'MediaAttachmentManager';
