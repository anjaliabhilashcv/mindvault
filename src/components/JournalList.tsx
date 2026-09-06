import React, { useState, useMemo } from 'react';
import { JournalEntry } from '../types';
import { Plus, Search, BookOpen, X, Lock, Sparkles, TrendingUp, Image as ImageIcon, FileText } from 'lucide-react';

interface JournalListProps {
  entries: JournalEntry[];
  isLoading: boolean;
  selectedEntryId?: string | null;
  onSelectEntry: (entry: JournalEntry) => void;
  onNewEntry: () => void;
  onOpenAskJournal?: () => void;
  onOpenGrowth?: () => void;
  onOpenExportPdf?: () => void;
  isSidebarMode?: boolean;
}

export const JournalList: React.FC<JournalListProps> = ({
  entries,
  isLoading,
  selectedEntryId,
  onSelectEntry,
  onNewEntry,
  onOpenAskJournal,
  onOpenGrowth,
  onOpenExportPdf,
  isSidebarMode = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<string>('all');

  // Extract unique moods present in current entries
  const availableMoods = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => {
      if (e.mood) set.add(e.mood);
    });
    return Array.from(set);
  }, [entries]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (entry.tags && entry.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));

      const matchesMood =
        selectedMoodFilter === 'all' || entry.mood === selectedMoodFilter;

      return matchesSearch && matchesMood;
    });
  }, [entries, searchQuery, selectedMoodFilter]);

  const formatShortDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-slate-900 transition-colors ${isSidebarMode ? '' : 'max-w-4xl mx-auto px-4 sm:px-6 py-6'}`}>
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Journal Entries
          </h2>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
            {entries.length} {entries.length === 1 ? 'memory' : 'memories'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {onOpenExportPdf && (
            <button
              id="list-export-pdf-btn"
              onClick={onOpenExportPdf}
              className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-full border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1"
              title="Export All Journals as PDF"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Export All</span>
            </button>
          )}

          {onOpenGrowth && (
            <button
              id="sidebar-growth-btn"
              onClick={onOpenGrowth}
              className="px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-full border border-indigo-200 dark:border-indigo-800 transition-all flex items-center gap-1"
              title="View your growth intelligence and patterns"
            >
              <TrendingUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Growth</span>
            </button>
          )}

          {onOpenAskJournal && (
            <button
              id="sidebar-ask-btn"
              onClick={onOpenAskJournal}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-full border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1"
              title="Ask questions about your journal"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Ask</span>
            </button>
          )}

          <button
            id="list-new-entry-btn"
            onClick={onNewEntry}
            className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-full shadow-xs hover:bg-indigo-700 active:scale-[0.99] transition-all flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="p-3 border-b border-slate-100 dark:border-slate-800 space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="search-entries-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memories..."
            className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 p-0.5"
              aria-label="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Mood Chips Filter */}
        {availableMoods.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 pt-0.5">
            <button
              onClick={() => setSelectedMoodFilter('all')}
              className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                selectedMoodFilter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All
            </button>
            {availableMoods.map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMoodFilter(selectedMoodFilter === m ? 'all' : m)}
                className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                  selectedMoodFilter === m
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Entries List Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {isLoading ? (
          <div className="space-y-2 p-2">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg animate-pulse space-y-2">
                <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
                <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="p-6 text-center text-slate-400 dark:text-slate-500 my-4">
            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">No entries yet</p>
            <p className="text-[11px] mt-1 text-slate-400 dark:text-slate-500">Click New to write your first reflection.</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-6 text-center text-slate-400 dark:text-slate-500 text-xs">
            No memories match your search.
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const isSelected = selectedEntryId === entry.id;

            return (
              <div
                key={entry.id}
                onClick={() => onSelectEntry(entry)}
                className={`p-3.5 rounded-lg cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 border-l-4 border-indigo-600'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/80 border-l-4 border-transparent'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <h3 className={`text-sm leading-snug line-clamp-1 ${
                    isSelected ? 'font-bold text-slate-900 dark:text-white' : 'font-semibold text-slate-700 dark:text-slate-200'
                  }`}>
                    {entry.title}
                  </h3>
                  {entry.mood && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                      {entry.mood}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                  <span>{formatShortDate(entry.createdAt)}</span>
                  {entry.attachments && entry.attachments.length > 0 && (
                    <span className="flex items-center gap-1 text-[10px] text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.5 rounded-full lowercase font-medium">
                      <ImageIcon className="w-2.5 h-2.5 text-purple-500" />
                      {entry.attachments.length}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-1 italic">
                  {entry.content}
                </p>

                {entry.tags && entry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {entry.tags.map((t) => (
                      <span key={t} className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Aside Footer */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-slate-400 dark:text-slate-500">
        <div className="flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Private & Secure
          </span>
        </div>
        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          Synced
        </span>
      </div>
    </div>
  );
};

