import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import type {
  StudentProfile, Enrollment, Session,
  ExamResult, StudentSubmission, Exam, Assignment,
} from "../types";

// ─── Axios instance ───────────────────────────────────────────────────────────

export const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api/",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Query key factory ────────────────────────────────────────────────────────

export const queryKeys = {
  studentProfile:    (id: number)                          => ["students", id]                              as const,
  enrollments:       (studentId: number, term?: string)    => ["enrollments", { student: studentId, term }] as const,
  sessions:          (studentId: number)                   => ["sessions",   { student: studentId }]        as const,
  examResults:       (studentId: number)                   => ["exam-results",  { student: studentId }]     as const,
  submissions:       (studentId: number)                   => ["submissions",   { student: studentId }]     as const,
  upcomingExams:     (studentId: number)                   => ["upcoming-exams",  { student: studentId }]   as const,
  upcomingAssign:    (studentId: number)                   => ["upcoming-assign", { student: studentId }]   as const,
};

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchStudentProfile(id: number): Promise<StudentProfile> {
  const { data } = await api.get<StudentProfile>(`users/students/${id}/`);
  return data;
}

// term_status: "active" (default) | "past" | "all"
async function fetchEnrollments(
  studentId: number,
  termStatus: "active" | "past" | "all" = "active",
): Promise<Enrollment[]> {
  const { data } = await api.get<Enrollment[]>("records/enrollments/", {
    params: { student: studentId, term_status: termStatus },
  });
  return data;
}

async function fetchStudentSessions(studentId: number): Promise<Session[]> {
  const { data } = await api.get<Session[]>("scheduling/schedule-sessions/", {
    params: { student: studentId },
  });
  return data;
}

async function fetchExamResults(studentId: number): Promise<ExamResult[]> {
  const { data } = await api.get<ExamResult[]>("records/exam-results/", {
    params: { student: studentId },
  });
  return data;
}

async function fetchStudentSubmissions(studentId: number): Promise<StudentSubmission[]> {
  const { data } = await api.get<StudentSubmission[]>("records/student-submissions/", {
    params: { student: studentId },
  });
  return data;
}

async function fetchUpcomingExams(studentId: number): Promise<Exam[]> {
  const { data } = await api.get<Exam[]>("records/exams/", {
    params: { student: studentId, term_status: "active" },
  });
  return data;
}

async function fetchUpcomingAssignments(studentId: number): Promise<Assignment[]> {
  const { data } = await api.get<Assignment[]>("records/assignments/", {
    params: { student: studentId, term_status: "active" },
  });
  return data;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useStudentProfile(id: number) {
  return useQuery({
    queryKey: queryKeys.studentProfile(id),
    queryFn:  () => fetchStudentProfile(id),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

// Active-term enrollments (Dashboard courses widget default)
export function useEnrollments(
  studentId: number,
  termStatus: "active" | "past" | "all" = "active",
) {
  return useQuery({
    queryKey: queryKeys.enrollments(studentId, termStatus),
    queryFn:  () => fetchEnrollments(studentId, termStatus),
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });
}

// Past-term enrollments — used by the Grades page
export function usePastEnrollments(studentId: number) {
  return useQuery({
    queryKey: queryKeys.enrollments(studentId, "past"),
    queryFn:  () => fetchEnrollments(studentId, "past"),
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

export function useExamResults(studentId: number) {
  return useQuery({
    queryKey: queryKeys.examResults(studentId),
    queryFn:  () => fetchExamResults(studentId),
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });
}

export function useStudentSubmissions(studentId: number) {
  return useQuery({
    queryKey: queryKeys.submissions(studentId),
    queryFn:  () => fetchStudentSubmissions(studentId),
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });
}

export function useUpcomingExams(studentId: number) {
  return useQuery({
    queryKey: queryKeys.upcomingExams(studentId),
    queryFn:  () => fetchUpcomingExams(studentId),
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });
}

export function useUpcomingAssignments(studentId: number) {
  return useQuery({
    queryKey: queryKeys.upcomingAssign(studentId),
    queryFn:  () => fetchUpcomingAssignments(studentId),
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });
}