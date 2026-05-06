/**
 * src/api/auth.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Cookie-based JWT auth.
 *
 * Token storage
 * ─────────────
 *   access_token  → HttpOnly cookie  (JS cannot read or touch)
 *   refresh_token → HttpOnly cookie  (path-scoped to /api/auth/)
 *
 * The frontend NEVER sees either token. It can only:
 *   - call /api/auth/me/ to ask "am I logged in?"
 *   - rely on the browser to attach cookies automatically
 *   - listen for 401s and silently refresh
 */

import axios from 'axios';
import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN';

/** Shape returned by GET /api/auth/me/ — also returned by login() and register(). */
export interface AuthUser {
  id:         number;
  email:      string;
  first_name: string;
  last_name:  string;
  role:       UserRole;
  profile_id: number | null;
}

export interface LoginPayload {
  email:    string;
  password: string;
}

export interface RegisterPayload {
  email:      string;
  first_name: string;
  last_name:  string;
  role:       Exclude<UserRole, 'ADMIN'>;
  password:   string;
  password2:  string;
}

export type DjangoFieldErrors = Record<string, string | string[]>;

export interface ParsedFieldErrors {
  [field: string]: string;
  _general: string;
}

// ─── Logout Handler Injection (avoids circular import with AuthContext) ──────

let _logoutHandler: (() => void) | null = null;
export const setLogoutHandler = (fn: () => void) => { _logoutHandler = fn; };

// ─── Error Parser ──────────────────────────────────────────────────────────────

export function parseDjangoErrors(data: DjangoFieldErrors): ParsedFieldErrors {
  const out: ParsedFieldErrors = { _general: '' };
  for (const [key, value] of Object.entries(data)) {
    const msg = Array.isArray(value) ? value[0] : value;
    if (key === 'detail' || key === 'non_field_errors') {
      out._general = msg;
    } else {
      out[key] = msg;
    }
  }
  return out;
}

// ─── Axios Instances ───────────────────────────────────────────────────────────

/**
 * authApi — for /api/auth/* lifecycle endpoints only.
 * No interceptors: a 401 during refresh must NOT trigger another refresh.
 */
const authApi: AxiosInstance = axios.create({
  baseURL:         '/api/auth',
  withCredentials: true,
  headers:         { 'Content-Type': 'application/json' },
});

/**
 * apiClient — used everywhere else.
 * Cookies are attached by the browser; no Authorization header needed.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL:         '/api',
  withCredentials: true,
  headers:         { 'Content-Type': 'application/json' },
});

// ─── Response Interceptor — Silent Refresh ─────────────────────────────────────

let _refreshing: Promise<void> | null = null;

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status !== 401 || !original || original._retry) {
      return Promise.reject(error);
    }
    original._retry = true;

    try {
      if (!_refreshing) {
        _refreshing = authApi.post('/token/refresh/', {})
          .then(() => undefined)
          .finally(() => { _refreshing = null; });
      }
      await _refreshing;
      // Cookie has been refreshed by the server — just retry the original request
      return apiClient(original);
    } catch {
      _logoutHandler?.();
      return Promise.reject(error);
    }
  },
);

// ─── Auth API Functions ────────────────────────────────────────────────────────

export async function login(payload: LoginPayload): Promise<AuthUser> {
  try {
    await authApi.post('/token/', payload);   // sets cookies
    return await me();                         // fetch user info
  } catch (err) {
    const e = err as AxiosError<DjangoFieldErrors>;
    throw parseDjangoErrors(e.response?.data ?? { detail: 'Login failed.' });
  }
}

export async function register(payload: RegisterPayload): Promise<AuthUser> {
  try {
    await authApi.post('/register/', payload);
    return await me();
  } catch (err) {
    const e = err as AxiosError<DjangoFieldErrors>;
    throw parseDjangoErrors(e.response?.data ?? { detail: 'Registration failed.' });
  }
}

export async function logout(): Promise<void> {
  try { await authApi.post('/logout/', {}); }
  catch { /* swallow — cookies are gone client-side anyway */ }
}

/**
 * me() — source of truth for "who is logged in".
 * Uses apiClient so silent refresh kicks in automatically if the access token
 * expired but the refresh token is still valid.
 */
export async function me(): Promise<AuthUser> {
  const { data } = await apiClient.get<AuthUser>('/auth/me/');
  return data;
}

/** Call on app mount to bootstrap auth state. Returns null if no valid session. */
export async function tryRestoreSession(): Promise<AuthUser | null> {
  try { return await me(); } catch { return null; }
}