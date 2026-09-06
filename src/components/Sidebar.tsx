import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Home,
  BookOpen,
  TrendingUp,
  ArrowLeftRight,
  Sparkles,
  Plus,
  ShieldCheck,
  LogOut,
  X,
  Sun,
  Moon,
  FileText,
} from 'lucide-react';

export type AppNavView = 'home' | 'journals' | 'editor' | 'growth' | 'compare' | 'ask';

interface SidebarProps {
  activeView: AppNavView;
  onNavigateHome: () => void;
  onNavigateJournals: () => void;
  onNewEntry: () => void;
  onOpenAskJournal: () => void;
  onOpenGrowth: () => void;
  onOpenCompare: () => void;
  onOpenSecurityCheck: () => void;
  onOpenLogout: () => void;
  onOpenExportPdf?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onNavigateHome,
  onNavigateJournals,
  onNewEntry,
  onOpenAskJournal,
  onOpenGrowth,
  onOpenCompare,
  onOpenSecurityCheck,
  onOpenLogout,
  onOpenExportPdf,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleNavClick = (action: () => void) => {
    action();
    if (onCloseMobile) onCloseMobile();
  };

  const navItems = [
    {
      id: 'nav-item-home',
      label: 'Home',
      view: 'home' as AppNavView,
      icon: Home,
      action: onNavigateHome,
    },
    {
      id: 'nav-item-journals',
      label: 'Journals',
      view: 'journals' as AppNavView,
      icon: BookOpen,
      action: onNavigateJournals,
    },
    {
      id: 'nav-item-growth',
      label: 'Growth',
      view: 'growth' as AppNavView,
      icon: TrendingUp,
      action: onOpenGrowth,
    },
    {
      id: 'nav-item-compare',
      label: 'What Changed?',
      view: 'compare' as AppNavView,
      icon: ArrowLeftRight,
      action: onOpenCompare,
    },
    {
      id: 'nav-item-ask',
      label: 'Ask Journal',
      view: 'ask' as AppNavView,
      icon: Sparkles,
      action: onOpenAskJournal,
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 w-64 shrink-0 select-none transition-colors">
      {/* Brand / Mobile Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
        <button
          id="sidebar-brand-btn"
          onClick={() => handleNavClick(onNavigateHome)}
          className="flex items-center gap-2.5 text-left group focus:outline-none"
        >
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-xs group-hover:scale-105 transition-transform">
            M
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-800 dark:text-white">
            MindVault
          </span>
        </button>

        <div className="flex items-center gap-1">
          {/* Theme Toggle Button */}
          <button
            id="sidebar-theme-toggle-btn"
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>

          {isMobileOpen && (
            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors md:hidden"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 p-3 space-y-1 overflow-y-auto">
        <p className="px-3 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          Navigation
        </p>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.view;

          return (
            <button
              key={item.id}
              id={item.id}
              onClick={() => handleNavClick(item.action)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold border-l-4 border-indigo-600 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon
                className={`w-4 h-4 ${
                  isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'
                }`}
              />
              <span>{item.label}</span>
            </button>
          );
        })}

        <div className="pt-3 space-y-2">
          {onOpenExportPdf && (
            <button
              id="sidebar-export-pdf-btn"
              onClick={() => handleNavClick(onOpenExportPdf)}
              className="w-full py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200/80 dark:border-slate-700 transition-all flex items-center justify-center gap-2"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Export PDF</span>
            </button>
          )}

          <button
            id="sidebar-new-entry-btn"
            onClick={() => handleNavClick(onNewEntry)}
            className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Entry</span>
          </button>
        </div>
      </div>

      {/* User Session & Footer Actions */}
      {user && (
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            id="sidebar-security-btn"
            onClick={() => handleNavClick(onOpenSecurityCheck)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Security & Rules</span>
          </button>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800 px-1">
            <div className="flex items-center gap-2 max-w-[140px] truncate">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-7 h-7 rounded-full border border-slate-200 dark:border-slate-700 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-7 h-7 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] rounded-full flex items-center justify-center">
                  {(user.displayName || user.email || 'MV').slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="truncate text-left">
                <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                  {user.displayName || user.email?.split('@')[0]}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">Encrypted Vault</p>
              </div>
            </div>

            <button
              id="sidebar-logout-btn"
              onClick={() => handleNavClick(onOpenLogout)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:block h-full shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 animate-in slide-in-from-left duration-200 h-full">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

