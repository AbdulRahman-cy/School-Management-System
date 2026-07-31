import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./auth";
import type {
  StudentProfile, Enrollment, EnrollmentRow, Session,
  ExamResult, StudentSubmission, Exam, Assignment,
} from "../types";

// ─── Cohort API types ─────────────────────────────────────────────────────────

export interface CohortCoordinator {
  id: number;
  name: string;
}

export interface CohortCourse {
  id: number;
  code: string;
  title: string;
}

export interface CohortCourseClass {
  id: number;
  course: CohortCourse;
  group_number: number;
  coordinator: CohortCoordinator | null;
}

export interface CohortGroup {
  id: number;
  number: number;
  capacity: number;
}

export interface CohortDiscipline {
  id: number;
  code: string;
  name: string;
  program_type: "GSP" | "SSP";
}

export interface CohortTerm {
  id: number;
  name: string;
}

export interface Cohort {
  /** Composite key: "{discipline.id}_{term.id}_{year_level}" */
  id: string;
  discipline: CohortDiscipline;
  term: CohortTerm;
  year_level: number;
  groups: CohortGroup[];
  course_classes: CohortCourseClass[];
}

/**
 * Payload sent to POST /api/academics/groups/bulk-cohort/
 * Keys in coordinators use format: "{courseId}_{groupNumber}"
 */
export interface CohortBulkCreatePayload {
  discipline_id: number;
  term_id: number;
  year_level: number;
  groups: Array<{ number: number; capacity: number }>;
  courses: number[];
  coordinators: Record<string, number>;
}
 
// Re-export so existing imports `import { api } from "../api"` keep working.
// Old code was `api.get("path")`, new code is the same — apiClient is identical
// in interface but adds proper auth + silent refresh.
export const api = apiClient;
 
// ─── Query key factory ────────────────────────────────────────────────────────
 
export const queryKeys = {
  studentProfile: (id: number)                       => ["students", id] as const,
  enrollments:    (studentId: number, term?: string) => ["enrollments", { student: studentId, term }] as const,
  sessions:       (studentId: number)                => ["sessions",      { student: studentId }] as const,
  examResults:    (studentId: number)                => ["exam-results",  { student: studentId }] as const,
  submissions:    (studentId: number)                => ["submissions",   { student: studentId }] as const,
  upcomingExams:  (studentId: number)                => ["upcoming-exams",  { student: studentId }] as const,
  upcomingAssign: (studentId: number)                => ["upcoming-assign", { student: studentId }] as const,
  cohorts:        ()                                 => ["cohorts"] as const,
};
 
// ─── Fetchers ─────────────────────────────────────────────────────────────────
 
async function fetchStudentProfile(id: number): Promise<StudentProfile> {
  const { data } = await apiClient.get<StudentProfile>(`/users/students/${id}/`);
  return data;
}
 
async function fetchEnrollments(
  studentId: number,
  termStatus: "active" | "past" | "all" = "active",
): Promise<Enrollment[]> {
  const { data } = await apiClient.get<Enrollment[]>("/records/enrollments/", {
    params: { student: studentId, term_status: termStatus },
  });
  return data;
}

async function fetchEnrollmentSummary(
  studentId: number,
  termStatus: "active" | "past" | "all" = "active",
): Promise<EnrollmentRow[]> {
  const { data } = await apiClient.get<EnrollmentRow[]>("/records/enrollments/dashboard-summary/", {
    params: { student: studentId, term_status: termStatus },
  });
  return data;
}
 
async function fetchStudentSessions(studentId: number): Promise<Session[]> {
  const { data } = await apiClient.get<Session[]>("/scheduling/schedule-sessions/", {
    params: { student: studentId },
  });
  return data;
}
 
async function fetchExamResults(studentId: number): Promise<ExamResult[]> {
  const { data } = await apiClient.get<ExamResult[]>("/records/exam-results/", {
    params: { student: studentId },
  });
  return data;
}
 
async function fetchStudentSubmissions(studentId: number): Promise<StudentSubmission[]> {
  const { data } = await apiClient.get<StudentSubmission[]>("/records/student-submissions/", {
    params: { student: studentId },
  });
  return data;
}
 
async function fetchUpcomingExams(studentId: number): Promise<Exam[]> {
  const { data } = await apiClient.get<Exam[]>("/records/exams/", {
    params: { student: studentId, term_status: "active" },
  });
  return data;
}
 
async function fetchUpcomingAssignments(studentId: number): Promise<Assignment[]> {
  const { data } = await apiClient.get<Assignment[]>("/records/assignments/", {
    params: { student: studentId, term_status: "active" },
  });
  return data;
}
 
// ─── Hooks ────────────────────────────────────────────────────────────────────
// All hooks now refuse to fetch when studentId is 0/null — prevents the
// "loading data for student #0" / "student #4" flicker on first paint.
 
const ENABLED = (id: number | null | undefined) =>
  typeof id === "number" && id > 0;
 
export function useStudentProfile(id: number | null) {
  return useQuery({
    queryKey:  queryKeys.studentProfile(id ?? 0),
    queryFn:   () => fetchStudentProfile(id as number),
    staleTime: 5 * 60 * 1000,
    retry:     1,
    enabled:   ENABLED(id),
  });
}
 
export function useEnrollments(
  studentId: number | null,
  termStatus: "active" | "past" | "all" = "active",
) {
  return useQuery({
    queryKey:  queryKeys.enrollments(studentId ?? 0, termStatus),
    queryFn:   () => fetchEnrollmentSummary(studentId as number, termStatus),
    staleTime: 2 * 60 * 1000,
    retry:     1,
    enabled:   ENABLED(studentId),
  });
}
 
export function usePastEnrollments(studentId: number | null) {
  return useQuery({
    queryKey:  queryKeys.enrollments(studentId ?? 0, "past"),
    queryFn:   () => fetchEnrollments(studentId as number, "past"),
    staleTime: 2 * 60 * 1000,
    retry:     1,
    enabled:   ENABLED(studentId),
  });
}
 
export function useStudentSessions(studentId: number | null) {
  return useQuery({
    queryKey:  queryKeys.sessions(studentId ?? 0),
    queryFn:   () => fetchStudentSessions(studentId as number),
    staleTime: 2 * 60 * 1000,
    retry:     1,
    enabled:   ENABLED(studentId),
  });
}
 
export function useExamResults(studentId: number | null) {
  return useQuery({
    queryKey:  queryKeys.examResults(studentId ?? 0),
    queryFn:   () => fetchExamResults(studentId as number),
    staleTime: 2 * 60 * 1000,
    retry:     1,
    enabled:   ENABLED(studentId),
  });
}
 
export function useStudentSubmissions(studentId: number | null) {
  return useQuery({
    queryKey:  queryKeys.submissions(studentId ?? 0),
    queryFn:   () => fetchStudentSubmissions(studentId as number),
    staleTime: 2 * 60 * 1000,
    retry:     1,
    enabled:   ENABLED(studentId),
  });
}
 
export function useUpcomingExams(studentId: number | null) {
  return useQuery({
    queryKey:  queryKeys.upcomingExams(studentId ?? 0),
    queryFn:   () => fetchUpcomingExams(studentId as number),
    staleTime: 2 * 60 * 1000,
    retry:     1,
    enabled:   ENABLED(studentId),
  });
}
 
export function useUpcomingAssignments(studentId: number | null) {
  return useQuery({
    queryKey:  queryKeys.upcomingAssign(studentId ?? 0),
    queryFn:   () => fetchUpcomingAssignments(studentId as number),
    staleTime: 2 * 60 * 1000,
    retry:     1,
    enabled:   ENABLED(studentId),
  });
}

// ─── Cohort fetchers ──────────────────────────────────────────────────────────

async function fetchCohorts(): Promise<Cohort[]> {
  const { data } = await apiClient.get<Cohort[]>("/academics/groups/cohorts/");
  return data;
}

async function createCohort(payload: CohortBulkCreatePayload): Promise<unknown> {
  const { data } = await apiClient.post("/academics/groups/bulk-cohort/", payload);
  return data;
}

// ─── Cohort hooks ─────────────────────────────────────────────────────────────

export function useCohorts() {
  return useQuery({
    queryKey:  queryKeys.cohorts(),
    queryFn:   fetchCohorts,
    staleTime: 60 * 1000,
  });
}

export function useCreateCohort() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCohort,
    onSuccess: () => {
      // Invalidate the cohorts list so the grid refreshes automatically
      queryClient.invalidateQueries({ queryKey: queryKeys.cohorts() });
    },
  });
}