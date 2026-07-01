import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { getSupabaseClient } from '@/db/supabase';
import { APP_CONFIG } from '@/config';
import type { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    invitationCode: string,
    email: string,
    password: string
  ) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = getSupabaseClient();

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        setSession(currentSession);
        setUser(currentSession?.user ?? null);
      } catch (error) {
        console.error('Auth init error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw handleAuthError(error);
    },
    [supabase]
  );

  const signUp = useCallback(
    async (invitationCode: string, email: string, password: string) => {
      // Validate invitation code
      const normalizedCode = invitationCode.trim().toUpperCase();
      const validCodes = APP_CONFIG.invitationCodes.map((c) =>
        c.toUpperCase()
      );
      if (!validCodes.includes(normalizedCode)) {
        throw new Error(
          'Invalid invitation code. Please contact the administrator for a valid code.'
        );
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw handleAuthError(error);

      // Create user profile
      if (data.user) {
        await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              display_name: email.split('@')[0],
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
          ])
          .select();
      }
    },
    [supabase]
  );

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw handleAuthError(error);

    // Clear session data
    localStorage.removeItem('supabase.auth.token');
    localStorage.removeItem('lastAuthCheck');
    localStorage.removeItem('user');
    localStorage.removeItem('cache');
  }, [supabase]);

  const resetPassword = useCallback(
    async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw handleAuthError(error);
    },
    [supabase]
  );

  const updatePassword = useCallback(
    async (newPassword: string) => {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw handleAuthError(error);
    },
    [supabase]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAuthenticated: !!session,
        isLoading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Error message mapping
function handleAuthError(error: { message: string }): Error {
  const errorMessages: Record<string, string> = {
    'Invalid login credentials':
      'Invalid email or password. Please try again.',
    'Email not confirmed':
      'Please confirm your email address before signing in.',
    'User already registered':
      'An account with this email already exists.',
    'Password should be at least 6 characters':
      'Password must be at least 6 characters long.',
    'Unable to validate email address':
      'Please enter a valid email address.',
    'Email rate limit exceeded':
      'Too many attempts. Please try again later.',
    'Invalid email or password':
      'Invalid email or password. Please try again.',
  };

  const message =
    errorMessages[error.message] ||
    error.message ||
    'An unexpected error occurred. Please try again.';

  return new Error(message);
}

export default AuthContext;
