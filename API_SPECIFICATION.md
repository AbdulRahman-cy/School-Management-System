# API Specification

## Authentication and User

| Full URL Path | HTTP Methods | Path Variables | Query Parameters | Summary |
| --- | --- | --- | --- | --- |
| /api/auth/token/ | POST | None | None | Authenticates a user and returns JWT cookies for login. The response body is stripped down to a success message after the tokens are stored in HttpOnly cookies. |
| /api/auth/token/refresh/ | POST | None | None | Reads the refresh token from the refresh cookie, exchanges it for a new access token, and rotates the refresh token when enabled. |
| /api/auth/register/ | POST | None | None | Creates a new user account through the registration serializer and immediately issues auth cookies for the new user. |
| /api/auth/logout/ | POST | None | None | Clears the auth cookies and blacklists the refresh token when one is present. |
| /api/auth/me/ | GET | None | None | Returns the currently authenticated user along with a profile_id derived from the user role. |

## academics

| Full URL Path | HTTP Methods | Path Variables | Query Parameters | Summary |
| --- | --- | --- | --- | --- |
| /api/academics/departments/ | GET, POST | None | None | Lists and creates departments used to organize the academic structure. |
| /api/academics/departments/<int:pk>/ | GET, PUT, PATCH, DELETE | pk | None | Retrieves, updates, or deletes a single department. |
| /api/academics/disciplines/ | GET, POST | None | None | Lists and creates disciplines that belong to the academic catalog. |
| /api/academics/disciplines/<int:pk>/ | GET, PUT, PATCH, DELETE | pk | None | Retrieves, updates, or deletes a single discipline. |
| /api/academics/terms/ | GET, POST | None | None | Lists and creates academic terms such as active or past semesters. |
| /api/academics/terms/<int:pk>/ | GET, PUT, PATCH, DELETE | pk | None | Retrieves, updates, or deletes a single term. |
| /api/academics/courses/ | GET, POST | None | None | Lists and creates courses offered by the school. |
| /api/academics/courses/<int:pk>/ | GET, PUT, PATCH, DELETE | pk | None | Retrieves, updates, or deletes a single course. |
| /api/academics/rooms/ | GET, POST | None | None | Lists and creates physical rooms used for teaching sessions. |
| /api/academics/rooms/<int:pk>/ | GET, PUT, PATCH, DELETE | pk | None | Retrieves, updates, or deletes a single room. |
| /api/academics/groups/ | GET, POST | None | None | Lists and creates study groups that bundle classes within a term. |
| /api/academics/groups/<int:pk>/ | GET, PUT, PATCH, DELETE | pk | None | Retrieves, updates, or deletes a single study group. |
| /api/academics/classes/ | GET, POST | None | None | Lists and creates course classes, which connect courses, groups, and teaching delivery. |
| /api/academics/classes/<int:pk>/ | GET, PUT, PATCH, DELETE | pk | None | Retrieves, updates, or deletes a single course class. |

## records

| Full URL Path | HTTP Methods | Path Variables | Query Parameters | Summary |
| --- | --- | --- | --- | --- |
| /api/records/enrollments/ | GET, POST | None | student, course_class, term_status | Lists and creates enrollments, defaulting to active-term enrollments unless term_status is set to past or all. The queryset also optimizes access to the related student, course class, and grades. |
| /api/records/enrollments/<int:pk>/ | GET, PUT, PATCH, DELETE | pk | student, course_class, term_status | Retrieves, updates, or deletes a single enrollment while preserving the same queryset filters used by the viewset. |
| /api/records/grades/ | GET, POST | None | enrollment | Lists and creates grade entries, with filtering by enrollment and ordering by created_at or score. |
| /api/records/grades/<int:pk>/ | GET, PUT, PATCH, DELETE | pk | enrollment | Retrieves, updates, or deletes a single grade entry. |
| /api/records/attendance/ | GET, POST | None | student, session, term_status | Lists and creates attendance records, with optional filtering by student, session, and active or past term status. |
| /api/records/attendance/<int:pk>/ | GET, PUT, PATCH, DELETE | pk | student, session, term_status | Retrieves, updates, or deletes a single attendance record. |
| /api/records/exams/ | GET, POST | None | course_class, exam_type, term_status, student | Lists and creates exams for course classes, with optional filtering by exam type, term status, and enrolled student. |
| /api/records/exams/<int:pk>/ | GET, PUT, PATCH, DELETE | pk | course_class, exam_type, term_status, student | Retrieves, updates, or deletes a single exam. |
| /api/records/exam-results/ | GET, POST | None | student, exam | Lists and creates exam results, allowing filtering by student or exam. |
| /api/records/exam-results/<int:pk>/ | GET, PUT, PATCH, DELETE | pk | student, exam | Retrieves, updates, or deletes a single exam result. |
| /api/records/assignments/ | GET, POST | None | course_class, assignment_type, term_status, student | Lists and creates assignments for course classes, with optional filtering by assignment type, term status, and enrolled student. |
| /api/records/assignments/<int:pk>/ | GET, PUT, PATCH, DELETE | pk | course_class, assignment_type, term_status, student | Retrieves, updates, or deletes a single assignment. |
| /api/records/student-submissions/ | GET, POST | None | student, assignment | Lists and creates student submissions, with filtering by student or assignment. |
| /api/records/student-submissions/<int:pk>/ | GET, PUT, PATCH, DELETE | pk | student, assignment | Retrieves, updates, or deletes a single student submission. |

## scheduling

| Full URL Path | HTTP Methods | Path Variables | Query Parameters | Summary |
| --- | --- | --- | --- | --- |
| /api/scheduling/timeslots/ | GET, POST | None | None | Lists and creates timeslots used to define class schedule windows. |
| /api/scheduling/timeslots/<int:pk>/ | GET, PUT, PATCH, DELETE | pk | None | Retrieves, updates, or deletes a single timeslot. |
| /api/scheduling/schedule-sessions/ | GET | None | student | Returns read-only scheduled sessions for the active term, with optional filtering to a specific student. |
| /api/scheduling/schedule-sessions/<int:pk>/ | GET | pk | student | Retrieves a single scheduled session from the active-term read-only schedule feed. |

## users

| Full URL Path | HTTP Methods | Path Variables | Query Parameters | Summary |
| --- | --- | --- | --- | --- |
| /api/users/users/ | GET, POST | None | None | Lists and creates base user accounts. |
| /api/users/users/<int:pk>/ | GET, PUT, PATCH, DELETE | pk | None | Retrieves, updates, or deletes a single user account. |
| /api/users/teachers/ | GET, POST | None | None | Lists and creates teacher profiles. |
| /api/users/teachers/<int:pk>/ | GET, PUT, PATCH, DELETE | pk | None | Retrieves, updates, or deletes a single teacher profile. |
| /api/users/students/ | GET, POST | None | None | Lists and creates student profiles. |
| /api/users/students/<int:pk>/ | GET, PUT, PATCH, DELETE | pk | None | Retrieves, updates, or deletes a single student profile. |