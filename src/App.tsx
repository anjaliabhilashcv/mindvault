import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { Sidebar, AppNavView } from './components/Sidebar';
import { HomeDashboard } from './components/HomeDashboard';
import { AuthScreen } from './components/AuthScreen';
import { JournalList } from './components/JournalList';
import { JournalEditor } from './components/JournalEditor';
import { JournalDetail } from './components/JournalDetail';
import { AskJournalView } from './components/AskJournalView';
import { GrowthView } from './components/GrowthView';
import { GrowthComparisonView } from './components/GrowthComparisonView';
import { SecurityInspectorModal } from './components/SecurityInspectorModal';
import { ConfirmModal } from './components/ConfirmModal';
import { PdfExportModal } from './components/PdfExportModal';
import { JournalEntry } from './types';
import { JournalService } from './lib/journalService';
import { Check, Plus, BookOpen } from 'lucide-react';

function MainApp() {
  const { user, loading: authLoading, signOutUser } = useAuth();

  const [viewMode, setViewMode] = useState<AppNavView>('home');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [entryToEdit, setEntryToEdit] = useState<JournalEntry | null>(null);
  const [isLoadingEntries, setIsLoadingEntries] = useState<boolean>(true);
  const [showSecurityModal, setShowSecurityModal] = useState<boolean>(false);
  const [showLogoutModal, setShowLogoutModal] = useState<boolean>(false);
  const [showPdfModal, setShowPdfModal] = useState<boolean>(false);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Real-time listener for user's journal entries
  useEffect(() => {
    if (!user) {
      setEntries([]);
      setIsLoadingEntries(false);
      return;
    }

    setIsLoadingEntries(true);
    const unsubscribe = JournalService.subscribeEntries(
      user.uid,
      (fetchedEntries) => {
        setEntries(fetchedEntries);
        setIsLoadingEntries(false);

        // Auto-select latest entry if none selected
        setSelectedEntry((current) => {
          if (!current && fetchedEntries.length > 0) {
            return fetchedEntries[0];
          }
          if (current) {
            const stillExists = fetchedEntries.find((e) => e.id === current.id);
            return stillExists || (fetchedEntries.length > 0 ? fetchedEntries[0] : null);
          }
          return null;
        });
      },
      (error) => {
        console.error('Failed to subscribe to entries:', error);
        setIsLoadingEntries(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Auth Loading Screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl mb-4 animate-pulse shadow-xs">
          M
        </div>
        <p className="text-xs text-slate-500 font-medium">Securing MindVault...</p>
      </div>
    );
  }

  // Unauthenticated View
  if (!user) {
    return <AuthScreen />;
  }

  // Navigation Handlers
  const handleNavigateHome = () => {
    setViewMode('home');
    setEntryToEdit(null);
    setIsMobileMenuOpen(false);
  };

  const handleNavigateJournals = () => {
    setViewMode('journals');
    if (!selectedEntry && entries.length > 0) {
      setSelectedEntry(entries[0]);
    }
    setEntryToEdit(null);
    setIsMobileMenuOpen(false);
  };

  const handleStartNewEntry = () => {
    setEntryToEdit(null);
    setViewMode('editor');
    setIsMobileMenuOpen(false);
  };

  const handleOpenAskJournal = () => {
    setEntryToEdit(null);
    setViewMode('ask');
    setIsMobileMenuOpen(false);
  };

  const handleOpenGrowth = () => {
    setEntryToEdit(null);
    setViewMode('growth');
    setIsMobileMenuOpen(false);
  };

  const handleOpenCompare = () => {
    setEntryToEdit(null);
    setViewMode('compare');
    setIsMobileMenuOpen(false);
  };

  const handleSelectEntry = (entry: JournalEntry) => {
    setSelectedEntry(entry);
    setViewMode('journals');
    setEntryToEdit(null);
  };

  const handleOpenEntryFromAsk = (entryId: string) => {
    const found = entries.find((e) => e.id === entryId);
    if (found) {
      setSelectedEntry(found);
    }
    setViewMode('journals');
    setEntryToEdit(null);
  };

  const handleEditEntry = (entry: JournalEntry) => {
    setEntryToEdit(entry);
    setViewMode('editor');
  };

  const handleSaveSuccess = (saved: JournalEntry) => {
    showToast(entryToEdit ? 'Entry updated successfully' : 'Memory saved to your vault');
    setSelectedEntry(saved);
    setViewMode('journals');
    setEntryToEdit(null);
  };

  const handleDeleteSuccess = (deletedId: string) => {
    showToast('Entry permanently deleted');
    const remaining = entries.filter((e) => e.id !== deletedId);
    if (remaining.length > 0) {
      setSelectedEntry(remaining[0]);
      setViewMode('journals');
    } else {
      setSelectedEntry(null);
      setViewMode('home');
    }
  };

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    setLogoutError(null);
    try {
      await signOutUser();
      setShowLogoutModal(false);
    } catch (err) {
      console.error('Logout error:', err);
      setLogoutError(
        err instanceof Error ? err.message : 'Failed to log out. Please check your connection and try again.'
      );
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#F9FAFB] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased overflow-hidden transition-colors">
      {/* Top Header */}
      <Navbar
        onNavigateHome={handleNavigateHome}
        onNavigateJournals={handleNavigateJournals}
        onNewEntry={handleStartNewEntry}
        onOpenAskJournal={handleOpenAskJournal}
        onOpenGrowth={handleOpenGrowth}
        onOpenCompare={handleOpenCompare}
        onOpenSecurityCheck={() => setShowSecurityModal(true)}
        onToggleMobileMenu={() => setIsMobileMenuOpen(true)}
        activeView={viewMode}
      />

      {/* Main Body with Persistent Sidebar */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Persistent Desktop Sidebar & Mobile Drawer */}
        <Sidebar
          activeView={viewMode}
          onNavigateHome={handleNavigateHome}
          onNavigateJournals={handleNavigateJournals}
          onNewEntry={handleStartNewEntry}
          onOpenAskJournal={handleOpenAskJournal}
          onOpenGrowth={handleOpenGrowth}
          onOpenCompare={handleOpenCompare}
          onOpenSecurityCheck={() => setShowSecurityModal(true)}
          onOpenLogout={() => setShowLogoutModal(true)}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* View Router Main Canvas */}
        <main className="flex-1 flex flex-col bg-white dark:bg-slate-900 overflow-hidden relative">
          {viewMode === 'home' ? (
            <HomeDashboard
              entries={entries}
              isLoadingEntries={isLoadingEntries}
              onSelectEntry={handleSelectEntry}
              onNewEntry={handleStartNewEntry}
              onNavigateJournals={handleNavigateJournals}
              onNavigateGrowth={handleOpenGrowth}
              onNavigateAsk={handleOpenAskJournal}
            />
          ) : viewMode === 'journals' ? (
            <div className="flex flex-1 overflow-hidden h-full">
              {/* Journal List Pane */}
              <aside className={`w-full md:w-80 lg:w-96 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 ${
                selectedEntry ? 'hidden md:flex' : 'flex'
              }`}>
                <JournalList
                  entries={entries}
                  isLoading={isLoadingEntries}
                  selectedEntryId={selectedEntry?.id}
                  onSelectEntry={handleSelectEntry}
                  onNewEntry={handleStartNewEntry}
                  onOpenAskJournal={handleOpenAskJournal}
                  onOpenGrowth={handleOpenGrowth}
                  onOpenExportPdf={() => setShowPdfModal(true)}
                  isSidebarMode={true}
                />
              </aside>

              {/* Detail Pane */}
              <section className={`flex-1 flex flex-col bg-white dark:bg-slate-900 overflow-hidden ${
                selectedEntry ? 'flex' : 'hidden md:flex'
              }`}>
                {selectedEntry ? (
                  <JournalDetail
                    entry={selectedEntry}
                    onBack={() => setSelectedEntry(null)}
                    onEdit={handleEditEntry}
                    onDeleteSuccess={handleDeleteSuccess}
                    showBackBtn={true}
                  />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#F9FAFB] dark:bg-slate-950">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Your Vault is Ready</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">
                      Start writing your first reflection to begin documenting your thoughts and personal growth.
                    </p>
                    <button
                      id="empty-split-new-btn"
                      onClick={handleStartNewEntry}
                      className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-full shadow-xs hover:bg-indigo-700 active:scale-[0.99] transition-all flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Write First Entry</span>
                    </button>
                  </div>
                )}
              </section>
            </div>
          ) : viewMode === 'editor' ? (
            <JournalEditor
              entryToEdit={entryToEdit}
              onSaveSuccess={handleSaveSuccess}
              onCancel={() => {
                if (selectedEntry) {
                  setViewMode('journals');
                } else if (entries.length > 0) {
                  setSelectedEntry(entries[0]);
                  setViewMode('journals');
                } else {
                  setViewMode('home');
                }
                setEntryToEdit(null);
              }}
            />
          ) : viewMode === 'growth' ? (
            <GrowthView
              onOpenEntry={handleOpenEntryFromAsk}
              onNewEntry={handleStartNewEntry}
              onNavigateHome={handleNavigateHome}
              onNavigateCompare={handleOpenCompare}
            />
          ) : viewMode === 'compare' ? (
            <GrowthComparisonView
              onOpenEntry={handleOpenEntryFromAsk}
              onNewEntry={handleStartNewEntry}
              onNavigateGrowthOverview={handleOpenGrowth}
              onNavigateHome={handleNavigateHome}
            />
          ) : viewMode === 'ask' ? (
            <AskJournalView
              onOpenEntry={handleOpenEntryFromAsk}
              onNewEntry={handleStartNewEntry}
            />
          ) : null}
        </main>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-full shadow-lg text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Security Inspector Modal */}
      <SecurityInspectorModal
        isOpen={showSecurityModal}
        onClose={() => setShowSecurityModal(false)}
      />

      {/* PDF Export Modal */}
      <PdfExportModal
        isOpen={showPdfModal}
        onClose={() => setShowPdfModal(false)}
        entries={entries}
        userName={user?.displayName || user?.email || 'User'}
      />

      {/* Logout Confirmation Modal */}
      <ConfirmModal
        isOpen={showLogoutModal}
        title="Log out of MindVault?"
        message="Are you sure you want to log out? Your journal entries are safely saved and will remain private."
        confirmLabel="Log Out"
        cancelLabel="Cancel"
        isDestructive={true}
        isLoading={isLoggingOut}
        errorMessage={logoutError}
        onConfirm={handleConfirmLogout}
        onCancel={() => {
          if (!isLoggingOut) {
            setShowLogoutModal(false);
            setLogoutError(null);
          }
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}
