import {
  createContext, useContext, useState, useEffect, useCallback,
  type ReactNode,
} from 'react';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import { setAccessToken, clearAccessToken, setLogoutHandler, apiClient } from '../api/auth';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface DjangoJwtPayload {
  user_id:    number;
  role:       'STUDENT' | 'TEACHER' | 'ADMIN';
  profile_id: number | null;   // ← StudentProfile.id or TeacherProfile.id
  email:      string;
  exp:        number;
  iat:        number;
  jti:        string;
  token_type: string;
}

export interface AuthUser {
  userId:    number;
  email:     string;
  role:      'STUDENT' | 'TEACHER' | 'ADMIN';
  studentId: number | null;
  teacherId: number | null;
}

export interface AuthContextValue {
  user:               AuthUser | null;
  isLoading:          boolean;
  isAuthenticated:    boolean;
  studentId:          number | null;
  teacherId:          number | null;
  handleLoginSuccess: (accessToken: string) => void;  // no longer async
  logout:             () => void;
}

// ─── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Helper ────────────────────────────────────────────────────────────────────

function decodeUser(token: string): AuthUser {
  const c = jwtDecode<DjangoJwtPayload>(token);
  return {
    userId:    c.user_id,
    email:     c.email,
    role:      c.role,
    studentId: c.role === 'STUDENT' ? c.profile_id : null,
    teacherId: c.role === 'TEACHER' ? c.profile_id : null,
  };
}

// ─── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,      setUser]    = useState<AuthUser | null>(null);
  const [isLoading, setLoading] = useState(true);

  const logout = useCallback(() => {
    apiClient.post('/auth/logout/').catch(() => {});
    clearAccessToken();
    setUser(null);
  }, []);

  // No more /me/ call — everything comes from the token itself
  const handleLoginSuccess = useCallback((accessToken: string) => {
  console.log('✅ handleLoginSuccess fired');
  setAccessToken(accessToken);
  
  const decoded = decodeUser(accessToken);
  console.log('decoded:', decoded);   // ← add this
  setUser(decoded);
}, []);

  useEffect(() => { setLogoutHandler(logout); }, [logout]);

  // Silent refresh on mount
  useEffect(() => {
    let cancelled = false;

    axios
      .post<{ access: string }>('/api/auth/token/refresh/', {}, { withCredentials: true })
      .then(({ data }) => {
        if (!cancelled) handleLoginSuccess(data.access);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [handleLoginSuccess]);

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: user !== null,
      studentId:       user?.studentId ?? null,
      teacherId:       user?.teacherId ?? null,
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