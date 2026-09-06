import React, { useState, useEffect } from 'react';
import { JournalAttachment } from '../types';
import { StorageService } from '../lib/storageService';
import { 
  Image as ImageIcon, 
  Film, 
  Maximize2, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Download,
  Play
} from 'lucide-react';

interface MediaGalleryProps {
  attachments: JournalAttachment[];
}

export const MediaGallery: React.FC<MediaGalleryProps> = ({ attachments }) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Close lightbox on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === 'Escape') {
        setLightboxIndex(null);
      } else if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) => (prev !== null && prev < attachments.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : attachments.length - 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, attachments.length]);

  if (!attachments || attachments.length === 0) {
    return null;
  }

  const activeMedia = lightboxIndex !== null ? attachments[lightboxIndex] : null;

  return (
    <div className="mt-8 pt-6 border-t border-slate-100">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
          <span>Attached Media ({attachments.length})</span>
        </h3>
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {attachments.map((media, idx) => (
          <div
            key={media.id}
            onClick={() => setLightboxIndex(idx)}
            className="group relative rounded-2xl border border-slate-200/80 bg-slate-900 overflow-hidden cursor-pointer shadow-xs hover:shadow-md transition-all flex flex-col"
          >
            {media.type === 'image' ? (
              <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
                <img
                  src={media.downloadUrl}
                  alt={media.fileName}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="p-2 rounded-full bg-white/90 text-slate-800 shadow-md">
                    <Maximize2 className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative aspect-video w-full bg-slate-950 flex items-center justify-center">
                <video
                  src={media.downloadUrl}
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  preload="metadata"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="p-3 rounded-full bg-indigo-600/90 text-white shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="w-5 h-5 fill-white ml-0.5" />
                  </div>
                </div>
                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-semibold flex items-center gap-1 backdrop-blur-xs">
                  <Film className="w-3 h-3 text-purple-400" />
                  <span>Video Clip</span>
                </div>
              </div>
            )}

            {/* Bottom Meta */}
            <div className="p-2.5 bg-white border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span className="truncate max-w-[160px] font-medium text-slate-800" title={media.fileName}>
                {media.fileName}
              </span>
              <span className="text-[11px] text-slate-400 shrink-0">
                {StorageService.formatBytes(media.fileSize)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox / Media Viewer Modal */}
      {activeMedia && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col justify-between p-4 sm:p-6"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Top Bar */}
          <div 
            className="flex items-center justify-between text-white/80 shrink-0 mb-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-white truncate max-w-[200px] sm:max-w-md">
                {activeMedia.fileName}
              </span>
              <span className="text-xs text-white/50">
                ({(lightboxIndex ?? 0) + 1} of {attachments.length})
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-white/70">
                {StorageService.formatBytes(activeMedia.fileSize)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={activeMedia.downloadUrl}
                target="_blank"
                rel="noreferrer"
                download={activeMedia.fileName}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Download or open in new tab"
                onClick={(e) => e.stopPropagation()}
              >
                <Download className="w-4 h-4" />
              </a>
              <button
                onClick={() => setLightboxIndex(null)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Close viewer (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Central Media Canvas */}
          <div 
            className="flex-1 relative flex items-center justify-center overflow-hidden min-h-0 py-2"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Previous Button */}
            {attachments.length > 1 && (
              <button
                onClick={() =>
                  setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : attachments.length - 1))
                }
                className="absolute left-2 sm:left-4 z-10 p-2.5 rounded-full bg-black/50 hover:bg-black/80 text-white transition-all backdrop-blur-xs"
                title="Previous media"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            {/* Media Content */}
            <div className="max-w-5xl max-h-full flex items-center justify-center">
              {activeMedia.type === 'image' ? (
                <img
                  src={activeMedia.downloadUrl}
                  alt={activeMedia.fileName}
                  referrerPolicy="no-referrer"
                  className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-2xl"
                />
              ) : (
                <video
                  src={activeMedia.downloadUrl}
                  controls
                  autoPlay
                  className="max-h-[75vh] max-w-full rounded-lg shadow-2xl bg-black"
                />
              )}
            </div>

            {/* Next Button */}
            {attachments.length > 1 && (
              <button
                onClick={() =>
                  setLightboxIndex((prev) => (prev !== null && prev < attachments.length - 1 ? prev + 1 : 0))
                }
                className="absolute right-2 sm:right-4 z-10 p-2.5 rounded-full bg-black/50 hover:bg-black/80 text-white transition-all backdrop-blur-xs"
                title="Next media"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Bottom Thumbnails Strip */}
          {attachments.length > 1 && (
            <div 
              className="flex items-center justify-center gap-2 pt-2 overflow-x-auto shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              {attachments.map((att, idx) => (
                <button
                  key={att.id}
                  onClick={() => setLightboxIndex(idx)}
                  className={`w-14 h-10 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                    idx === lightboxIndex ? 'border-indigo-500 scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  {att.type === 'image' ? (
                    <img
                      src={att.downloadUrl}
                      alt={att.fileName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white">
                      <Film className="w-3.5 h-3.5" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
