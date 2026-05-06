/**
 * src/context/AuthContext.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Cookie-based auth context.
 *
 * No more JWT decoding on the client — the token is in an HttpOnly cookie that
 * JS cannot read. User identity comes from GET /api/auth/me/ instead.
 */

import {
  createContext, useContext, useState, useEffect, useCallback,
  type ReactNode,
} from 'react';

import {
  setLogoutHandler,
  tryRestoreSession,
  logout as apiLogout,
  type AuthUser,
} from '../api/auth';

// Re-export so consumers don't need to import from two places
export type { AuthUser };

// ─── Context Value ────────────────────────────────────────────────────────────

export interface AuthContextValue {
  user:               AuthUser | null;
  isLoading:          boolean;
  isAuthenticated:    boolean;
  studentId:          number | null;
  teacherId:          number | null;
  handleLoginSuccess: (user: AuthUser) => void;
  logout:             () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,      setUser]    = useState<AuthUser | null>(null);
  const [isLoading, setLoading] = useState(true);

  const handleLoginSuccess = useCallback((u: AuthUser) => {
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();   // clears cookies server-side + blacklists refresh
    setUser(null);
  }, []);

  // Wire the apiClient interceptor's "refresh failed → log out" hook
  useEffect(() => { setLogoutHandler(() => setUser(null)); }, []);

  // Bootstrap: ask the server who we are. If the access cookie is expired
  // but the refresh cookie is still valid, the apiClient interceptor will
  // silently refresh and retry — we just await the answer.
  useEffect(() => {
    let cancelled = false;

    tryRestoreSession()
      .then((u) => { if (!cancelled) setUser(u); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  // Derived role-specific ids — kept for backward compatibility
  const studentId = user?.role === 'STUDENT' ? user.profile_id : null;
  const teacherId = user?.role === 'TEACHER' ? user.profile_id : null;

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: user !== null,
      studentId,
      teacherId,
      handleLoginSuccess,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth() must be called inside <AuthProvider>.');
  return ctx;
}