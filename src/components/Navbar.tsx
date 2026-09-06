import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ShieldCheck, LogOut, Plus, Sparkles, TrendingUp, ArrowLeftRight, Menu, Home, BookOpen, Sun, Moon, FileText } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { AppNavView } from './Sidebar';

interface NavbarProps {
  onNavigateHome: () => void;
  onNavigateJournals: () => void;
  onNewEntry?: () => void;
  onOpenAskJournal?: () => void;
  onOpenGrowth?: () => void;
  onOpenCompare?: () => void;
  onOpenSecurityCheck?: () => void;
  onOpenExportPdf?: () => void;
  onToggleMobileMenu?: () => void;
  activeView?: AppNavView;
}

export const Navbar: React.FC<NavbarProps> = ({
  onNavigateHome,
  onNavigateJournals,
  onNewEntry,
  onOpenAskJournal,
  onOpenGrowth,
  onOpenCompare,
  onOpenSecurityCheck,
  onOpenExportPdf,
  onToggleMobileMenu,
  activeView = 'home',
}) => {
  const { user, signOutUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      return name.slice(0, 2).toUpperCase();
    }
    if (email) return email.slice(0, 2).toUpperCase();
    return 'MV';
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
    <header className="h-16 flex items-center justify-between px-4 sm:px-6 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-30 select-none transition-colors">
      {/* Brand & Mobile Hamburger */}
      <div className="flex items-center gap-3">
        {onToggleMobileMenu && (
          <button
            id="nav-mobile-toggle-btn"
            onClick={onToggleMobileMenu}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors md:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <button
          id="nav-brand-btn"
          onClick={onNavigateHome}
          className="flex items-center gap-2.5 text-left group focus:outline-none"
        >
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-xs transition-transform group-hover:scale-105">
            M
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">
            MindVault
          </h1>
        </button>
      </div>

      {/* Top Header Nav Links (Desktop) */}
      {user && (
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            id="nav-home-link"
            onClick={onNavigateHome}
            className={`hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeView === 'home'
                ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Home</span>
          </button>

          <button
            id="nav-journals-link"
            onClick={onNavigateJournals}
            className={`hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeView === 'journals'
                ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Journals</span>
          </button>

          {onOpenGrowth && (
            <button
              id="nav-growth-btn"
              onClick={onOpenGrowth}
              className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeView === 'growth'
                  ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Growth</span>
            </button>
          )}

          {onOpenCompare && (
            <button
              id="nav-compare-btn"
              onClick={onOpenCompare}
              className={`hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeView === 'compare'
                  ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>What Changed?</span>
            </button>
          )}

          {onOpenAskJournal && (
            <button
              id="nav-ask-journal-btn"
              onClick={onOpenAskJournal}
              className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeView === 'ask'
                  ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Ask Journal</span>
            </button>
          )}

          {onOpenExportPdf && (
            <button
              id="nav-export-pdf-top-btn"
              onClick={onOpenExportPdf}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all"
              title="Export Journal as PDF"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Export PDF</span>
            </button>
          )}

          {onNewEntry && (
            <button
              id="nav-new-entry-btn"
              onClick={onNewEntry}
              className="px-3.5 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-full shadow-xs hover:bg-indigo-700 active:scale-[0.99] transition-all inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Entry</span>
            </button>
          )}

          <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-slate-200 dark:border-slate-800 ml-1">
            {/* Theme Toggle Button in Header */}
            <button
              id="nav-theme-toggle-btn"
              onClick={toggleTheme}
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle dark mode"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>

            <div className="text-right hidden xl:block">
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Verified</p>
              <p className="text-xs font-semibold text-slate-800 dark:text-white max-w-[130px] truncate">
                {user.displayName || user.email}
              </p>
            </div>

            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-full flex items-center justify-center">
                {getInitials(user.displayName, user.email)}
              </div>
            )}

            <button
              id="nav-logout-btn"
              onClick={() => {
                setLogoutError(null);
                setShowLogoutModal(true);
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

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
    </header>
  );
};

