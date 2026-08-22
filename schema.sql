Table BaseUser {
  id bigint [pk]
  email varchar
  first_name varchar
  last_name varchar
  role varchar
  is_active boolean
  is_staff boolean
  is_superuser boolean
  password varchar
  last_login datetime
  created_at datetime
  updated_at datetime
}

Table StudentProfile {
  id bigint [pk]
  user_id bigint [ref: - BaseUser.id, not null]
  discipline_id bigint [ref: > Discipline.id]
  enrollment_year int
  cumulative_gpa decimal
  is_active boolean
  deleted_at datetime
  created_at datetime
  updated_at datetime
}

Table TeacherProfile {
  id bigint [pk]
  user_id bigint [ref: - BaseUser.id, not null]
  department_id bigint [ref: > Department.id]
  rank varchar
  is_active boolean
  deleted_at datetime
  created_at datetime
  updated_at datetime
}

Table Department {
  id bigint [pk]
  code varchar
  name varchar
  created_at datetime
  updated_at datetime
}

Table Discipline {
  id bigint [pk]
  department_id bigint [ref: - Department.id, not null]
  code varchar
  name varchar
  program_type varchar
  created_at datetime
  updated_at datetime
} 

Table Term {
  id bigint [pk]
  name varchar
  season varchar
  start_date date
  end_date date
  is_active boolean
  created_at datetime
  updated_at datetime
}

Table Course {
  id bigint [pk]
  department_id bigint [ref: > Department.id, not null]
  code varchar
  title varchar
  credits int
  course_type varchar
  lec_sessions int
  tut_sessions int
  lab_sessions int
  created_at datetime
  updated_at datetime
}

Table CoursePrerequisite {
  id bigint [pk]
  target_course_id bigint [ref: > Course.id, not null]
  prerequisite_course_id bigint [ref: > Course.id, not null]
  created_at datetime
  updated_at datetime
}

Table CurriculumBlueprint {
  id bigint [pk]
  discipline_id bigint [ref: > Discipline.id, not null]
  course_id bigint [ref: > Course.id, not null]
  year_level int
  season varchar
  is_mandatory boolean
  created_at datetime
  updated_at datetime
}

Table Room {
  id bigint [pk]
  department_id bigint [ref: > Department.id] // null=True allows a room to have no department
  code varchar
  name varchar
  capacity int
  room_type varchar
  is_active boolean
  created_at datetime
  updated_at datetime
}

Table StudyGroup {
  id bigint [pk]
  discipline_id bigint [ref: > Discipline.id, not null]
  term_id bigint [ref: > Term.id, not null]
  year_level int
  number int
  capacity int
  created_at datetime
  updated_at datetime
}

Table CourseClass {
  id bigint [pk]
  course_id bigint [ref: > Course.id, not null]
  group_id bigint [ref: > StudyGroup.id, not null]
  coordinator_id bigint [ref: > TeacherProfile.id]
  created_at datetime
  updated_at datetime
}

Table Timeslot {
  id bigint [pk]
  day int
  period int
  created_at datetime
  updated_at datetime
}

Table Session {
  id bigint [pk]
  course_class_id bigint [ref: > CourseClass.id, not null]
  room_id bigint [ref: > Room.id, not null]
  timeslot_id bigint [ref: > Timeslot.id, not null]
  session_type varchar
  created_at datetime
  updated_at datetime
}

Table Enrollment {
  id bigint [pk]
  student_id bigint [ref: > StudentProfile.id, not null]
  course_class_id bigint [ref: > CourseClass.id, not null]
  lecture_session_id bigint [ref: > Session.id]
  tutorial_session_id bigint [ref: > Session.id]
  lab_session_id bigint [ref: > Session.id]
  status varchar
  final_percentage decimal
  course_grade_points decimal
  created_at datetime
  updated_at datetime
}

Table GradeEntry {
  id bigint [pk]
  enrollment_id bigint [ref: > Enrollment.id, not null]
  component varchar
  score decimal
  created_at datetime
  updated_at datetime
}

Table AttendanceRecord {
  id bigint [pk]
  student_id bigint [ref: > StudentProfile.id, not null]
  session_id bigint [ref: > Session.id, not null]
  week int
  status varchar
  created_at datetime
  updated_at datetime
}

Table Exam {
  id bigint [pk]
  course_class_id bigint [ref: > CourseClass.id, not null]
  exam_type varchar
  week int
  max_score decimal
  created_at datetime
  updated_at datetime
}

Table ExamResult {
  id bigint [pk]
  exam_id bigint [ref: > Exam.id, not null]
  student_id bigint [ref: > StudentProfile.id, not null]
  status varchar
  score decimal
  created_at datetime
  updated_at datetime
}

Table Assignment {
  id bigint [pk]
  course_class_id bigint [ref: > CourseClass.id, not null]
  assignment_type varchar
  due_week int
  max_points decimal
  created_at datetime
  updated_at datetime
}

Table StudentSubmission {
  id bigint [pk]
  student_id bigint [ref: > StudentProfile.id, not null]
  assignment_id bigint [ref: > Assignment.id, not null]
  score decimal
  submitted_at datetime
  created_at datetime
  updated_at datetime
}