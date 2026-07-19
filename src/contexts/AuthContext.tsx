import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';

import {
  getCurrentSession,
  signIn as signInService,
  signOut as signOutService,
  signUp as signUpService,
  subscribeToAuthChanges,
  type SignInInput,
  type SignUpInput,
} from '../services/auth';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (input: SignInInput) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

interface AuthProviderProps {
  children: ReactNode;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const currentSession = await getCurrentSession();
      setSession(currentSession);
    } catch (error) {
      console.error('Unable to load authentication session:', error);
      setSession(null);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      try {
        const currentSession = await getCurrentSession();

        if (isMounted) {
          setSession(currentSession);
        }
      } catch (error) {
        console.error('Authentication initialization failed:', error);

        if (isMounted) {
          setSession(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initializeAuth();

    const unsubscribe = subscribeToAuthChanges((nextSession) => {
      if (isMounted) {
        setSession(nextSession);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (input: SignInInput) => {
    const data = await signInService(input);
    setSession(data.session);
  }, []);

  const signUp = useCallback(async (input: SignUpInput) => {
    const data = await signUpService(input);
    setSession(data.session);
  }, []);

  const signOut = useCallback(async () => {
    await signOutService();
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      isAuthenticated: Boolean(session?.user),
      signIn,
      signUp,
      signOut,
      refreshSession,
    }),
    [loading, refreshSession, session, signIn, signOut, signUp],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}