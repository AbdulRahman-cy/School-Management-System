import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import type { StudentProfile, Enrollment, Session } from "../types";

// ─── Axios instance ───────────────────────────────────────────────────────────

export const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api/",
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT from localStorage if present.
// Swap this interceptor for a cookie-based approach if you switch auth strategies.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Query key factory ────────────────────────────────────────────────────────
// Centralised keys prevent cache collisions and make invalidation precise.

export const queryKeys = {
  studentProfile: (id: number) => ["students", id] as const,
  enrollments:    (studentId: number) => ["enrollments", { student: studentId }] as const,
  sessions:       (studentId: number) => ["sessions",    { student: studentId }] as const,
};

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchStudentProfile(id: number): Promise<StudentProfile> {
  const { data } = await api.get<StudentProfile>(`users/students/${id}/`);
  return data;
}

async function fetchEnrollments(studentId: number): Promise<Enrollment[]> {
  const { data } = await api.get<Enrollment[]>("records/enrollments/", {
    params: { student: studentId },
  });
  return data;
}

async function fetchStudentSessions(studentId: number): Promise<Session[]> {
  const { data } = await api.get<Session[]>("scheduling/sessions/", {
    params: { student: studentId },
  });
  return data;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useStudentProfile(id: number) {
  return useQuery({
    queryKey: queryKeys.studentProfile(id),
    queryFn:  () => fetchStudentProfile(id),
    staleTime: 5 * 60 * 1000, // profile data doesn't change often
    retry: 1,
  });
}

export function useEnrollments(studentId: number) {
  return useQuery({
    queryKey: queryKeys.enrollments(studentId),
    queryFn:  () => fetchEnrollments(studentId),
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });
}

export function useStudentSessions(studentId: number) {
  return useQuery({
    queryKey: queryKeys.sessions(studentId),
    queryFn:  () => fetchStudentSessions(studentId),
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });
}