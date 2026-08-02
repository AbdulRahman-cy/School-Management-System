import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./auth";
import type {
  StudentProfile, Enrollment, EnrollmentRow, Session,
  ExamResult, StudentSubmission, Exam, Assignment,
} from "../types";

// ─── Reference data types (disciplines / terms / courses / teachers) ──────────

export interface DisciplineOption {
  id: number;
  code: string;
  name: string;
  program_type: "GSP" | "SSP";
}

export interface TermOption {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export interface CourseOption {
  id: number;
  code: string;
  title: string;
}

import type { TeacherActiveCourseClass } from "../types";

export interface TeacherOption {
  id: number;
  user_name: string; // "Full Name <email>" from StringRelatedField
  user?: { id: number; email: string; first_name: string; last_name: string; role: string };
  department_name?: string;
  active_classes?: TeacherActiveCourseClass[];
}

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
  is_active: boolean;
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
  cohorts:          (status: string = "active", disciplineId?: number | null) => ["cohorts", { status, disciplineId }] as const,
  blueprintCourses: (disciplineId?: number, yearLevel?: number, termId?: number)  => ["blueprint-courses", { disciplineId, yearLevel, termId }] as const,
  disciplines:      ()                                                          => ["disciplines"] as const,
  terms:          ()                                 => ["terms"] as const,
  courses:        ()                                 => ["courses"] as const,
  teachers:       ()                                 => ["teachers"] as const,
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

// ─── Reference data fetchers ─────────────────────────────────────────────────

async function fetchDisciplines(): Promise<DisciplineOption[]> {
  const { data } = await apiClient.get<DisciplineOption[]>("/academics/disciplines/");
  return data;
}

async function fetchTerms(): Promise<TermOption[]> {
  const { data } = await apiClient.get<TermOption[]>("/academics/terms/");
  return data;
}

async function fetchCourses(): Promise<CourseOption[]> {
  const { data } = await apiClient.get<CourseOption[]>("/academics/courses/");
  return data;
}

async function fetchTeachers(): Promise<TeacherOption[]> {
  const { data } = await apiClient.get<TeacherOption[]>("/users/teachers/");
  return data;
}

// ─── Cohort fetchers ──────────────────────────────────────────────────────────

async function fetchCohorts(status: string = "active", disciplineId?: number | null): Promise<Cohort[]> {
  const params: Record<string, string | number> = { term_status: status };
  if (disciplineId) {
    params.discipline_id = disciplineId;
  }
  const { data } = await apiClient.get<Cohort[]>("/academics/groups/cohorts/", { params });
  return data;
}

async function fetchBlueprintCourses(disciplineId: number, yearLevel: number, termId: number): Promise<CourseOption[]> {
  const { data } = await apiClient.get<CourseOption[]>("/academics/courses/", {
    params: { discipline: disciplineId, year_level: yearLevel, term: termId },
  });
  return data;
}

async function createCohort(payload: CohortBulkCreatePayload): Promise<unknown> {
  const { data } = await apiClient.post("/academics/groups/bulk-cohort/", payload);
  return data;
}

async function deleteCohort(compositeId: string): Promise<void> {
  await apiClient.delete(`/academics/groups/cohorts/${compositeId}/`);
}

// ─── Course-class & study-group granular fetchers ─────────────────────────────

async function updateCourseClass({
  id, payload,
}: {
  id: number;
  payload: { coordinator_id?: number | null };
}): Promise<unknown> {
  const { data } = await apiClient.patch(`/academics/classes/${id}/`, payload);
  return data;
}

async function deleteCourseClass(id: number): Promise<void> {
  await apiClient.delete(`/academics/classes/${id}/`);
}

async function updateStudyGroup({
  id, payload,
}: {
  id: number;
  payload: { capacity?: number };
}): Promise<unknown> {
  const { data } = await apiClient.patch(`/academics/groups/${id}/`, payload);
  return data;
}

async function deleteStudyGroup(id: number): Promise<void> {
  await apiClient.delete(`/academics/groups/${id}/`);
}

// ─── Reference data hooks ─────────────────────────────────────────────────────

export function useDisciplines() {
  return useQuery({
    queryKey:  queryKeys.disciplines(),
    queryFn:   fetchDisciplines,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTerms() {
  return useQuery({
    queryKey:  queryKeys.terms(),
    queryFn:   fetchTerms,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCourses() {
  return useQuery({
    queryKey:  queryKeys.courses(),
    queryFn:   fetchCourses,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTeachers() {
  return useQuery({
    queryKey:  queryKeys.teachers(),
    queryFn:   fetchTeachers,
    staleTime: 5 * 60 * 1000,
  });
}

export function useBlueprintCourses(disciplineId?: number, yearLevel?: number, termId?: number) {
  return useQuery({
    queryKey: queryKeys.blueprintCourses(disciplineId, yearLevel, termId),
    queryFn: () => fetchBlueprintCourses(disciplineId!, yearLevel!, termId!),
    enabled: !!disciplineId && !!yearLevel && !!termId,
  });
}

// ─── Cohort hooks ─────────────────────────────────────────────────────────────

export function useCohorts(status: "active" | "all" = "active", disciplineId?: number | null) {
  return useQuery({
    queryKey:  queryKeys.cohorts(status, disciplineId),
    queryFn:   () => fetchCohorts(status, disciplineId),
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

export function useDeleteCohort() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCohort,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cohorts() });
    },
  });
}

// ─── Course-class & study-group granular mutation hooks ───────────────────────

export function useUpdateCourseClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateCourseClass,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cohorts() });
    },
  });
}

export function useDeleteCourseClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCourseClass,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cohorts() });
    },
  });
}

export function useUpdateStudyGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateStudyGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cohorts() });
    },
  });
}

export function useDeleteStudyGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteStudyGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cohorts() });
    },
  });
}