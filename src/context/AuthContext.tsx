import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut,
  getIdToken as firebaseGetIdToken
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, googleProvider, db, handleFirestoreError, testFirestoreConnection } from '../lib/firebase';
import { OperationType } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Test connection on boot
    testFirestoreConnection();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          const freshToken = await currentUser.getIdToken();
          setUser(currentUser);
          setToken(freshToken);

          // Save / update user profile in Firestore
          const profilePath = `users/${currentUser.uid}/profile/info`;
          try {
            const profileRef = doc(db, 'users', currentUser.uid, 'profile', 'info');
            const snap = await getDoc(profileRef);
            if (!snap.exists()) {
              await setDoc(profileRef, {
                uid: currentUser.uid,
                email: currentUser.email || '',
                displayName: currentUser.displayName || '',
                photoURL: currentUser.photoURL || '',
                createdAt: new Date().toISOString(),
              });
            }
          } catch (profileErr) {
            console.warn('Profile sync non-blocking error:', profileErr);
          }
        } else {
          setUser(null);
          setToken(null);
        }
      } catch (err) {
        console.error('Auth state change error:', err);
        setError(err instanceof Error ? err.message : 'Failed to update authentication state');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      setUser(result.user);
      setToken(idToken);
    } catch (err) {
      console.error('Google Sign-In error:', err);
      const msg = err instanceof Error ? err.message : 'Google sign-in failed. Please try again.';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOutUser = async () => {
    setError(null);
    try {
      await signOut(auth);
      setUser(null);
      setToken(null);
    } catch (err) {
      console.error('Sign out error:', err);
      setError(err instanceof Error ? err.message : 'Sign out failed');
      throw err;
    }
  };

  const getIdToken = async (forceRefresh = false): Promise<string | null> => {
    if (!auth.currentUser) return null;
    try {
      const fresh = await firebaseGetIdToken(auth.currentUser, forceRefresh);
      setToken(fresh);
      return fresh;
    } catch (err) {
      console.error('Failed to get ID token:', err);
      return null;
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        signInWithGoogle,
        signOutUser,
        getIdToken,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
