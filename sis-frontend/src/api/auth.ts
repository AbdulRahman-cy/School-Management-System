/**
 * src/api/auth.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Auth API layer for Ibn al-Hitham University Portal.
 *
 * SECURITY MODEL
 * ──────────────
 *  • Access token  → module-scoped closure (_accessToken). Lives only in the
 *                    JS heap. Wiped on page refresh. Never touches any browser
 *                    storage API.
 *  • Refresh token → HttpOnly cookie, written by Django's set_jwt_cookie().
 *                    Browser sends it automatically; this file never reads it.
 *  • Silent refresh → response interceptor catches every 401, calls
 *                    /api/auth/token/refresh/ (which reads the cookie), updates
 *                    the in-memory access token, and retries the original
 *                    request — completely transparent to the caller.
 *  • Deduplication → a single shared Promise (_refreshing) prevents N
 *                    concurrent requests from each triggering their own refresh.
 *
 * USAGE IN OTHER MODULES
 * ──────────────────────
 *  import { apiClient, getAccessToken } from './auth';
 *  // For non-auth requests use apiClient — it attaches the Bearer token automatically.
 */

import axios from 'axios';
import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = 'STUDENT' | 'TEACHER';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  password: string;
  password2: string; // matches Django RegisterSerializer field name
}

export interface AuthResponse {
  access: string;
  message?: string;
}

/** Shape of validation errors Django returns on 400s:
 *  { email: ["already exists"], password: ["too short"] }
 *  or { detail: "No active account found..." }
 */
export type DjangoFieldErrors = Record<string, string | string[]>;

export interface ParsedFieldErrors {
  [field: string]: string; // flattened to a single string per field
  _general: string;        // catch-all for non-field / detail errors
}

// ─── In-Memory Token Store ────────────────────────────────────────────────────

let _accessToken: string | null = null;
let _refreshing: Promise<string> | null = null;

export const getAccessToken  = (): string | null => _accessToken;
export const setAccessToken  = (token: string)   => { _accessToken = token; };
export const clearAccessToken = ()               => { _accessToken = null;  };

// ─── Error Parser ─────────────────────────────────────────────────────────────

/**
 * Converts Django's DRF error shapes into a flat { fieldName: message } map.
 *
 * Django can return any of these shapes:
 *   { "email": ["user with this email already exists."] }
 *   { "password": "Passwords do not match." }
 *   { "detail": "No active account found with the given credentials" }
 *   { "non_field_errors": ["..."] }
 */
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

// ─── Axios Instance ───────────────────────────────────────────────────────────

/**
 * authApi — used only for auth endpoints (login, register, refresh, logout).
 * withCredentials: true is mandatory — it tells the browser to attach the
 * HttpOnly refresh_token cookie that Django set during login.
 */
const authApi: AxiosInstance = axios.create({
  baseURL: '/api/auth',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * apiClient — use this for all protected API calls throughout the app
 * (grades, schedules, etc.). Automatically:
 *   1. Attaches Bearer token from memory.
 *   2. Silently refreshes on 401 and retries.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request Interceptor (attach access token) ────────────────────────────────

function attachToken(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}

apiClient.interceptors.request.use(attachToken);

// ─── Response Interceptor (silent refresh + retry) ───────────────────────────

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      try {
        // Deduplicate: if a refresh is already in flight, share the promise
        if (!_refreshing) {
          _refreshing = axios
            .post<AuthResponse>(
              '/api/auth/token/refresh/',
              {},
              { withCredentials: true }    // browser sends the HttpOnly cookie
            )
            .then((res) => {
              setAccessToken(res.data.access);
              return res.data.access;
            })
            .finally(() => {
              _refreshing = null;
            });
        }

        const newToken = await _refreshing;
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);         // retry original request
      } catch {
        clearAccessToken();
        // Let callers (or a global event) handle redirect to /login
        window.dispatchEvent(new Event('auth:expired'));
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

// ─── Auth API Functions ───────────────────────────────────────────────────────

/**
 * Login — POST /api/auth/token/
 * Django returns { access } in JSON; refresh token is set as an HttpOnly cookie.
 *
 * Throws ParsedFieldErrors on 400 so callers can render per-field messages.
 */
export async function login(payload: LoginPayload): Promise<AuthResponse> {
  try {
    const { data } = await authApi.post<AuthResponse>('/token/', payload);
    setAccessToken(data.access);
    return data;
  } catch (err) {
    const axiosErr = err as AxiosError<DjangoFieldErrors>;
    if (axiosErr.response?.status === 400 || axiosErr.response?.status === 401) {
      throw parseDjangoErrors(axiosErr.response.data ?? { detail: 'Login failed.' });
    }
    throw { _general: 'Network error. Please try again.', } as ParsedFieldErrors;
  }
}

/**
 * Register — POST /api/auth/register/
 * Django RegisterSerializer requires: email, first_name, last_name, role,
 * password, password2.
 *
 * Throws ParsedFieldErrors on 400.
 */
export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  try {
    const { data } = await authApi.post<AuthResponse>('/register/', payload);
    setAccessToken(data.access);
    return data;
  } catch (err) {
    const axiosErr = err as AxiosError<DjangoFieldErrors>;
    if (axiosErr.response?.status === 400) {
      throw parseDjangoErrors(axiosErr.response.data ?? { detail: 'Registration failed.' });
    }
    throw { _general: 'Network error. Please try again.' } as ParsedFieldErrors;
  }
}

/**
 * Logout — POST /api/auth/logout/
 * Django blacklists the refresh token and clears the cookie.
 */
export async function logout(): Promise<void> {
  try {
    await apiClient.post('/auth/logout/');
  } finally {
    clearAccessToken(); // wipe memory token regardless of server response
  }
}