import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Shield, CheckCircle2, ArrowRight } from 'lucide-react';

export const AuthScreen: React.FC = () => {
  const { signInWithGoogle, error, clearError } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setSigningIn(true);
    setLocalError(null);
    clearError();
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      if (err instanceof Error && !err.message.includes('popup-closed-by-user')) {
        setLocalError(err.message);
      }
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-slate-950 flex flex-col justify-between text-slate-900 dark:text-slate-100 font-sans transition-colors">
      {/* Top Header */}
      <header className="h-16 flex items-center justify-between px-6 sm:px-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-xs">
            M
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-800 dark:text-white">
            MindVault
          </h1>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
          <Shield className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Encrypted Firestore Storage</span>
        </div>
      </header>

      {/* Main Hero Card */}
      <main className="max-w-lg mx-auto px-6 py-12 w-full">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-8 sm:p-10 text-center">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mx-auto mb-6 flex items-center justify-center">
            <Lock className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-3">
            Private Memory & Growth
          </h1>
          
          <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed mb-8 max-w-md mx-auto">
            A quiet, minimalist space to document reflections, emotions, and personal growth with zero-trust privacy.
          </p>

          {(localError || error) && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/80 text-left text-xs text-red-800 dark:text-red-300">
              <span className="font-semibold block mb-0.5">Authentication error:</span>
              {localError || error}
            </div>
          )}

          <button
            id="google-signin-btn"
            onClick={handleSignIn}
            disabled={signingIn}
            className="w-full py-3 px-4 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm active:scale-[0.99] transition-all flex items-center justify-center gap-3 shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {signingIn ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-indigo-200 border-t-white rounded-full animate-spin" />
                <span>Connecting with Google...</span>
              </div>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
                <ArrowRight className="w-4 h-4 opacity-80" />
              </>
            )}
          </button>

          {/* Privacy & Principles Checklist */}
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-left space-y-2.5">
            <div className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <span><strong>Total Privacy:</strong> Only your authenticated Google account can access your entries.</span>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <span><strong>Immutable Writing:</strong> Your original journal writing is preserved intact.</span>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <span><strong>Server-Secured AI:</strong> Gemini API keys are never exposed in the browser.</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
        MindVault • Clean Minimalism Architecture
      </footer>
    </div>
  );
};
