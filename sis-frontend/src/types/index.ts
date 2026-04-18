// ─── Primitives ───────────────────────────────────────────────────────────────

export interface Timestamps {
  created_at: string; // ISO-8601
  updated_at: string;
}

// ─── academics.models ────────────────────────────────────────────────────────

export interface Department extends Timestamps {
  id: number;
  code: string;
  name: string;
}

export type ProgramType = "GSP" | "SSP";

export interface Discipline extends Timestamps {
  id: number;
  code: string;
  name: string;
  program_type: ProgramType;
  department: number; // FK → Department.id
}

export interface Term extends Timestamps {
  id: number;
  name: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;
  is_active: boolean;
}

export type CourseType = "CORE" | "ELECTIVE";

export interface Course extends Timestamps {
  id: number;
  code: string;
  title: string;
  credits: number;
  course_type: CourseType;
  department: number; // FK → Department.id
  lec_sessions: number;
  tut_sessions: number;
  lab_sessions: number;
}

export type RoomType = "LECTURE" | "LAB" | "SEMINAR";

export interface Room extends Timestamps {
  id: number;
  code: string;
  name: string;
  capacity: number;
  room_type: RoomType;
  department: number | null;
  is_active: boolean;
}

export interface StudyGroup extends Timestamps {
  id: number;
  discipline: number; // FK → Discipline.id
  term: number;       // FK → Term.id
  year_level: number; // 1–4
  number: number;     // group number within cohort
}

/**
 * Nested shape of `course` inside CourseClass as returned by the API.
 * Only the fields the serializer exposes inline are listed here.
 */
export interface NestedCourse {
  code: string;
  title: string;
}

/**
 * Nested shape of CourseClass as returned inside Session and Enrollment.
 * The serializer now returns { id, course: { code, title } } instead of a flat PK.
 */
export interface NestedCourseClass {
  id: number;
  course: NestedCourse;
}

/** Full CourseClass record as returned by /academics/course-classes/{id}/ */
export interface CourseClass extends Timestamps {
  id: number;
  course: NestedCourse; // nested — serializer exposes code+title inline
  term: number;         // FK → Term.id (flat PK)
  group: number;        // FK → StudyGroup.id (flat PK)
  coordinator: number | null;
}

// ─── scheduling.models ───────────────────────────────────────────────────────

// Day integers match Timeslot.Day IntegerChoices:
// 0=Saturday, 1=Sunday, 2=Monday, 3=Tuesday, 4=Wednesday, 5=Thursday
export type DayInt = 0 | 1 | 2 | 3 | 4 | 5;

// Period integers match Timeslot.Period IntegerChoices
export type PeriodInt = 1 | 2 | 3 | 4 | 5;

export interface Timeslot extends Timestamps {
  id: number;
  day: DayInt;
  period: PeriodInt;
}

export type SessionType = "LECTURE" | "LAB" | "TUTORIAL";

/**
 * Nested shape of Room as returned inside Session.
 * The serializer now returns { id, code, name } instead of a flat PK.
 */
export interface NestedRoom {
  id: number;
  code: string;
  name: string;
}

export interface Session extends Timestamps {
  id: number;
  course_class: NestedCourseClass; // nested object (was flat PK)
  session_type: SessionType;
  timeslot: Timeslot;              // nested object
  room: NestedRoom;                // nested object (was flat PK)
}

// ─── users.models ────────────────────────────────────────────────────────────

export type UserRole = "ADMIN" | "TEACHER" | "STUDENT";

export interface BaseUser extends Timestamps {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  is_active: boolean;
  is_staff: boolean;
  full_name: string; // @property on model
}

export type TeacherRank = "TA" | "LECTURER" | "ASST_PROF" | "ASSOC_PROF" | "PROFESSOR";

export interface TeacherProfile extends Timestamps {
  id: number;
  user: number; // FK → BaseUser.id
  department: number | null;
  rank: TeacherRank;
}

export interface StudentProfile extends Timestamps {
  id: number;
  user: BaseUser;        // nested — typical DRF pattern for /students/{id}/
  discipline: Discipline | null; // nested
  enrollment_year: number;
  cumulative_gpa: string | null; // DecimalField serialises as string
}

// ─── records.models ──────────────────────────────────────────────────────────

export interface GradeEntry extends Timestamps {
  id: number;
  enrollment: number; // FK → Enrollment.id
  component: string;  // e.g. "Midterm", "Lab Work", "Final Exam"
  weight: string;     // DecimalField → string e.g. "0.3000"
  score: string;      // DecimalField → string e.g. "90.55"
  weighted_score: string; // @property → string e.g. "27.1650"
}

export interface CohortStats {
  average:         number;
  median:          number;
  highest:         number;
  lowest:          number;
  total_students:  number;
  distribution: {
    A: number;
    B: number;
    C: number;
    D: number;
    F: number;
  };
}

export interface Enrollment extends Timestamps {
  id: number;
  student: number;                  // FK → StudentProfile.id
  course_class: NestedCourseClass;  // nested object (was flat PK)
  lecture_session: number | null;
  tutorial_session: number | null;
  lab_session: number | null;
  grades: GradeEntry[];             // nested via related_name="grades"
  final_percentage: number;         // @property
  course_grade_points: number;      // @property
  cohort_stats: CohortStats | null; // annotated by the serializer
}

// ─── UI-layer derived types ───────────────────────────────────────────────────

/** Enriched enrollment row used in the Dashboard course table */
export interface EnrollmentRow {
  enrollmentId: number;
  courseClassId: number;
  finalPercentage: number;
  courseGradePoints: number;
  gradeLabel: string;   // e.g. "A-", "B+", computed from grade_points
  grades: GradeEntry[];
}

/** Resolved "next class" data surfaced to the NextClass status card */
export interface NextClassInfo {
  sessionId: number;
  sessionType: SessionType;
  courseClass: NestedCourseClass; // full nested object
  room: NestedRoom;               // full nested object
  timeslot: Timeslot;
}