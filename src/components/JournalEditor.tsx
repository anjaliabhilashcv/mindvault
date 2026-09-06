import React, { useState, useEffect, useRef } from 'react';
import { JournalEntry, CreateEntryInput, UpdateEntryInput, JournalAttachment } from '../types';
import { useAuth } from '../context/AuthContext';
import { JournalService } from '../lib/journalService';
import { ArrowLeft, Save, X, Tag as TagIcon, Sparkles, AlertCircle, RefreshCw, Mic, Paperclip } from 'lucide-react';
import { VoiceJournalModal } from './VoiceJournalModal';
import { MediaAttachmentManager, MediaAttachmentManagerRef } from './MediaAttachmentManager';

interface JournalEditorProps {
  entryToEdit?: JournalEntry | null;
  onSaveSuccess: (savedEntry: JournalEntry) => void;
  onCancel: () => void;
}

const COMMON_MOODS = [
  'Calm',
  'Reflective',
  'Energized',
  'Grateful',
  'Thoughtful',
  'Anxious',
  'Challenged',
  'Inspired',
];

export const JournalEditor: React.FC<JournalEditorProps> = ({
  entryToEdit,
  onSaveSuccess,
  onCancel,
}) => {
  const { user } = useAuth();
  const isEditing = Boolean(entryToEdit);
  const draftKey = `mindvault_draft_${user?.uid || 'anon'}`;
  const mediaManagerRef = useRef<MediaAttachmentManagerRef>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<string>('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<JournalAttachment[]>([]);
  
  // Status State
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoredFromDraft, setRestoredFromDraft] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  // Initialize from entryToEdit or draft
  useEffect(() => {
    if (entryToEdit) {
      setTitle(entryToEdit.title || '');
      setContent(entryToEdit.content || '');
      setMood(entryToEdit.mood || '');
      setTags(entryToEdit.tags || []);
      setAttachments(entryToEdit.attachments || []);
    } else {
      // Check for saved local draft
      try {
        const savedDraft = localStorage.getItem(draftKey);
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          if (parsed.title || parsed.content || (parsed.attachments && parsed.attachments.length > 0)) {
            setTitle(parsed.title || '');
            setContent(parsed.content || '');
            setMood(parsed.mood || '');
            setTags(parsed.tags || []);
            setAttachments(Array.isArray(parsed.attachments) ? parsed.attachments : []);
            setRestoredFromDraft(true);
          }
        }
      } catch (e) {
        console.warn('Could not read local draft:', e);
      }
    }
  }, [entryToEdit, draftKey]);

  // Save drafts locally as user types
  useEffect(() => {
    if (!isEditing && (title || content || mood || tags.length > 0 || attachments.length > 0)) {
      const timeoutId = setTimeout(() => {
        try {
          localStorage.setItem(
            draftKey,
            JSON.stringify({ 
              title, 
              content, 
              mood, 
              tags, 
              attachments, 
              updatedAt: new Date().toISOString() 
            })
          );
        } catch {
          // localStorage full or restricted
        }
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [title, content, mood, tags, attachments, isEditing, draftKey]);

  // Add tag handler
  const handleAddTag = () => {
    const trimmed = tagInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (trimmed && !tags.includes(trimmed) && tags.length < 10) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Word & Char Count
  const wordsCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charsCount = content.length;

  // Submit Handler
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) {
      setError('You must be signed in to save entries.');
      return;
    }

    if (!title.trim()) {
      setError('Please give your journal entry a title.');
      return;
    }

    if (!content.trim()) {
      setError('Journal content cannot be empty.');
      return;
    }

    setError(null);
    setSaving(true);

    try {
      if (isEditing && entryToEdit) {
        const updatePayload: UpdateEntryInput = {
          title: title.trim(),
          content: content.trim(),
          mood: mood || undefined,
          tags,
          attachments,
          currentVersion: entryToEdit.version || 1,
        };
        const newVersion = await JournalService.updateEntry(user.uid, entryToEdit.id, updatePayload);
        
        const updatedFullEntry: JournalEntry = {
          ...entryToEdit,
          ...updatePayload,
          version: newVersion,
          updatedAt: new Date().toISOString(),
        };
        onSaveSuccess(updatedFullEntry);
      } else {
        const createPayload: CreateEntryInput = {
          title: title.trim(),
          content: content.trim(),
          mood: mood || undefined,
          tags,
          attachments,
        };
        const created = await JournalService.createEntry(user.uid, createPayload);
        
        // Clean draft upon confirmed persistence
        try {
          localStorage.removeItem(draftKey);
        } catch {}

        onSaveSuccess(created);
      }
    } catch (err) {
      console.error('Save failed:', err);
      setError(
        err instanceof Error
          ? `Save failed: ${err.message}`
          : 'Unable to save entry. Your content has been preserved in the editor. Please retry.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleClearDraft = () => {
    try {
      localStorage.removeItem(draftKey);
    } catch {}
    setTitle('');
    setContent('');
    setMood('');
    setTags([]);
    setAttachments([]);
    setRestoredFromDraft(false);
  };

  const handleApplyVoiceTranscription = ({
    transcript: text,
    suggestedTitle: sTitle,
    suggestedMood: sMood,
    mode,
  }: {
    transcript: string;
    suggestedTitle?: string;
    suggestedMood?: string;
    mode: 'replace' | 'append';
  }) => {
    if (mode === 'append' && content.trim()) {
      setContent((prev) => `${prev.trim()}\n\n${text}`);
    } else {
      setContent(text);
    }

    if (sTitle && (!title || !title.trim())) {
      setTitle(sTitle);
    }
    if (sMood && (!mood || !mood.trim())) {
      setMood(sMood);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 h-full overflow-hidden">
      {/* Action Header */}
      <div className="flex items-center justify-between px-6 sm:px-10 py-4 sm:py-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
        <button
          id="editor-cancel-top-btn"
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-1 -ml-1 rounded"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Cancel</span>
        </button>

        <div className="flex items-center gap-2.5">
          {/* Header Compact Attach Button */}
          <button
            id="header-attach-media-btn"
            type="button"
            onClick={() => mediaManagerRef.current?.openFilePicker()}
            disabled={saving || attachments.length >= 10}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold active:scale-[0.98] transition-all disabled:opacity-50"
            title="Attach photos or video clips"
          >
            <Paperclip className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
            <span>Attach</span>
            {attachments.length > 0 && (
              <span className="px-1.5 py-0.2 bg-indigo-600 text-white rounded-full text-[10px] font-bold">
                {attachments.length}
              </span>
            )}
          </button>

          {/* Voice Reflection Button */}
          <button
            id="open-voice-modal-btn"
            type="button"
            onClick={() => setIsVoiceModalOpen(true)}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold active:scale-[0.98] transition-all disabled:opacity-50"
            title="Record a voice note with Gemini transcription"
          >
            <Mic className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Voice Reflection</span>
          </button>

          <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline">
            {wordsCount} {wordsCount === 1 ? 'word' : 'words'} • {charsCount} / 20,000 chars
          </span>

          <button
            id="editor-save-btn"
            type="button"
            onClick={() => handleSave()}
            disabled={saving || !title.trim() || !content.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-indigo-200 border-t-white rounded-full animate-spin" />
                <span>Saving to Vault...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>{isEditing ? 'Save Changes' : 'Save Entry'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Restored Draft Alert */}
      {restoredFromDraft && !isEditing && (
        <div className="mx-6 sm:mx-10 mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Restored unsaved draft from your last session.</span>
          </div>
          <button
            onClick={handleClearDraft}
            className="text-amber-800 dark:text-amber-300 underline hover:text-amber-950 dark:hover:text-amber-100 text-xs font-medium"
          >
            Discard draft
          </button>
        </div>
      )}

      {/* Error Banner with Retry */}
      {error && (
        <div className="mx-6 sm:mx-10 mt-4 p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-xs text-red-800 dark:text-red-200 flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{error}</p>
              <p className="text-slate-600 dark:text-slate-300 mt-1">
                Your writing has not been lost. Check your connection and try saving again.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleSave()}
            disabled={saving}
            className="px-3 py-1.5 rounded-full bg-red-600 text-white font-medium text-xs hover:bg-red-700 flex items-center gap-1.5 shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Main Form Canvas */}
      <div className="flex-1 px-6 sm:px-12 md:px-16 py-8 sm:py-10 overflow-y-auto">
        <form onSubmit={handleSave} className="space-y-6">
          {/* Quick Voice Prompt banner if editor is empty */}
          {!content && !title && (
            <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between gap-3 text-xs text-indigo-950 dark:text-indigo-200">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>Prefer speaking? Record a voice reflection and Gemini will transcribe it for you.</span>
              </div>
              <button
                type="button"
                onClick={() => setIsVoiceModalOpen(true)}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-xs font-medium shrink-0 transition-colors"
              >
                Start Voice Note
              </button>
            </div>
          )}

          {/* Title Input */}
          <div>
            <input
              id="entry-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title of this reflection..."
              maxLength={200}
              disabled={saving}
              className="w-full text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 border-none focus:outline-none focus:ring-0 bg-transparent p-0"
              autoFocus={!isEditing}
            />
          </div>

          {/* Mood Selector */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
              Emotional Tone / Mood
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_MOODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMood(mood === m ? '' : m)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    mood === m
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {m}
                </button>
              ))}
              <input
                type="text"
                placeholder="+ Custom mood"
                value={COMMON_MOODS.includes(mood) ? '' : mood}
                onChange={(e) => setMood(e.target.value)}
                maxLength={40}
                className="px-3 py-1 rounded-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 max-w-[120px]"
              />
            </div>
          </div>

          {/* Compact Editor Controls Toolbar next to text area */}
          <div className="flex items-center justify-between py-2 border-y border-slate-100/90 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <button
                id="editor-attach-media-btn"
                type="button"
                onClick={() => mediaManagerRef.current?.openFilePicker()}
                disabled={saving || attachments.length >= 10}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-700 dark:hover:text-indigo-300 hover:border-indigo-200 dark:hover:border-indigo-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium transition-all active:scale-[0.98] disabled:opacity-50"
                title="Add photos or video clips"
              >
                <Paperclip className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                <span>Add Photos / Video</span>
              </button>

              <button
                id="editor-voice-note-btn"
                type="button"
                onClick={() => setIsVoiceModalOpen(true)}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-700 dark:hover:text-indigo-300 hover:border-indigo-200 dark:hover:border-indigo-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium transition-all active:scale-[0.98] disabled:opacity-50"
                title="Dictate with voice"
              >
                <Mic className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                <span>Voice Note</span>
              </button>
            </div>

            <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium flex items-center gap-2">
              <span>{attachments.length}/10 attachments</span>
            </div>
          </div>

          {/* Attached & Uploading Media Strip right near editor */}
          {user && (
            <MediaAttachmentManager
              ref={mediaManagerRef}
              userId={user.uid}
              attachments={attachments}
              onChange={setAttachments}
              disabled={saving}
            />
          )}

          {/* Journal Content Area */}
          <div>
            <textarea
              id="entry-content-input"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your thoughts freely. What happened, how did it feel, what are you learning about yourself?"
              maxLength={20000}
              disabled={saving}
              rows={12}
              className="w-full text-base sm:text-lg text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600 border-none focus:outline-none focus:ring-0 bg-transparent p-0 resize-y leading-relaxed font-sans"
            />
          </div>

          {/* Tags Section */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
              Tags & Themes (Optional)
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                >
                  <TagIcon className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-slate-900 dark:hover:text-white ml-0.5"
                    aria-label={`Remove tag ${tag}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {tags.length < 10 && (
                <div className="flex items-center gap-1.5">
                  <input
                    id="entry-tag-input"
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder="Add tag (press Enter)..."
                    maxLength={30}
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 w-36"
                  />
                  {tagInput && (
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded"
                    >
                      Add
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Bottom Status Bar */}
      <div className="px-6 sm:px-10 py-3.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Draft auto-protected locally
          </span>
        </div>
        <div className="text-xs text-slate-400 dark:text-slate-500">
          Ready to save
        </div>
      </div>

      {/* Multimodal Voice Journal Modal */}
      <VoiceJournalModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onApplyTranscription={handleApplyVoiceTranscription}
        hasExistingContent={Boolean(content.trim())}
      />
    </div>
  );
};

