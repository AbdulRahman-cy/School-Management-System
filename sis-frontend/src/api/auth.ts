/**
 * src/api/auth.ts  (updated)
 * ─────────────────────────────────────────────────────────────────────────────
 * Changes from previous version
 * ──────────────────────────────
 *  + setLogoutHandler() — AuthContext injects its logout fn here after mount
 *                         so the interceptor can call it without a circular import.
 *  + Interceptor now calls _logoutHandler() instead of dispatching window events.
 *  + login() / register() return the raw access token; AuthContext decodes it.
 */

import axios from 'axios';
import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type UserRole = 'STUDENT' | 'TEACHER';

export interface LoginPayload {
  email:    string;
  password: string;
}

export interface RegisterPayload {
  email:      string;
  first_name: string;
  last_name:  string;
  role:       UserRole;
  password:   string;
  password2:  string;
}

export interface AuthResponse {
  access:   string;
  message?: string;
}

export type DjangoFieldErrors = Record<string, string | string[]>;

export interface ParsedFieldErrors {
  [field: string]: string;
  _general: string;
}

// ─── In-Memory Token Store ─────────────────────────────────────────────────────

let _accessToken: string | null = null;

export const getAccessToken   = ()          => _accessToken;
export const setAccessToken   = (t: string) => { _accessToken = t; };
export const clearAccessToken = ()          => { _accessToken = null; };

// ─── Logout Handler Injection ──────────────────────────────────────────────────
// AuthContext calls setLogoutHandler(logout) after it mounts.
// This avoids a circular import: auth.ts ← AuthContext ← auth.ts.

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
 * authApi — bare instance for /api/auth/* only.
 * No interceptors: a 401 during a refresh call must NOT trigger another refresh.
 */
const authApi: AxiosInstance = axios.create({
  baseURL:         '/api/auth',
  withCredentials: true,
  headers:         { 'Content-Type': 'application/json' },
});

/**
 * apiClient — use this everywhere else in the app.
 * Automatically attaches Bearer token and silently refreshes on 401.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL:         '/api',
  withCredentials: true,
  headers:         { 'Content-Type': 'application/json' },
});

// ─── Request Interceptor ───────────────────────────────────────────────────────

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response Interceptor — Silent Refresh ─────────────────────────────────────

let _refreshing: Promise<string> | null = null;

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    original._retry = true;

    try {
      if (!_refreshing) {
        _refreshing = authApi
          .post<AuthResponse>('/token/refresh/', {})
          .then((res) => {
            setAccessToken(res.data.access);
            return res.data.access;
          })
          .finally(() => { _refreshing = null; });
      }

      const newToken = await _refreshing;
      original.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(original);

    } catch {
      _logoutHandler?.();       // tell AuthContext → setUser(null) → show login
      return Promise.reject(error);
    }
  },
);

// ─── Auth API Functions ────────────────────────────────────────────────────────

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  try {
    const { data } = await authApi.post<AuthResponse>('/token/', payload);
    setAccessToken(data.access);
    return data;
  } catch (err) {
    const e = err as AxiosError<DjangoFieldErrors>;
    throw parseDjangoErrors(e.response?.data ?? { detail: 'Login failed.' });
  }
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  try {
    const { data } = await authApi.post<AuthResponse>('/register/', payload);
    setAccessToken(data.access);
    return data;
  } catch (err) {
    const e = err as AxiosError<DjangoFieldErrors>;
    throw parseDjangoErrors(e.response?.data ?? { detail: 'Registration failed.' });
  }
}