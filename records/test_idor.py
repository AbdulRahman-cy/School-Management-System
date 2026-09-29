"""
IDOR regression tests.

Student A is logged in and tries to read, create and modify Student B's
records through every student-facing endpoint. Each endpoint must either hide
B's rows (404 / absent from lists) or refuse the write (403), and nothing
owned by B may change. Admin tests guard the other direction: the scoping
must not hide B's data from staff who legitimately need it.

Runs under `python manage.py test records.test_idor`, or under pytest once
pytest-django is installed (these are plain Django TestCases).
"""
from decimal import Decimal

from django.core.cache import cache
from django.forms.models import model_to_dict
from django.test import TestCase
from rest_framework.test import APIClient, APIRequestFactory, force_authenticate

from academics.models import Course, CourseClass, Department, Discipline, Room, StudyGroup, Term
from records.models import (
    Assignment, AttendanceRecord, Enrollment, Exam, ExamResult, GradeEntry, StudentSubmission,
)
from scheduling.api.views.session import SessionViewSet
from scheduling.models import Session, Timeslot
from users.api.throttling import LoginRateThrottle
from users.models import BaseUser, StudentProfile


class IDORTestBase(TestCase):
    @classmethod
    def setUpTestData(cls):
        def make_user(email, role):
            return BaseUser.objects.create_user(
                email=email, password="password123", first_name="T", last_name=role.title(), role=role,
            )

        cls.admin = make_user("admin@test.edu", BaseUser.Role.ADMIN)
        cls.teacher = make_user("teacher@test.edu", BaseUser.Role.TEACHER)
        cls.user_a = make_user("a@test.edu", BaseUser.Role.STUDENT)
        cls.user_b = make_user("b@test.edu", BaseUser.Role.STUDENT)

        dept = Department.objects.create(code="CS", name="Computer Science")
        disc = Discipline.objects.create(code="CS_BS", name="CS BS", program_type="GSP", department=dept)
        cls.student_a = StudentProfile.objects.create(user=cls.user_a, discipline=disc, enrollment_year=2026)
        cls.student_b = StudentProfile.objects.create(user=cls.user_b, discipline=disc, enrollment_year=2026)

        term = Term.objects.create(
            name="Fall 2026", season="FALL", start_date="2026-09-01", end_date="2026-12-31", is_active=True,
        )
        group = StudyGroup.objects.create(discipline=disc, term=term, year_level=1, number=1, capacity=50)
        # A and B are in *different* classes, so class-derived endpoints
        # (exams, assignments, sessions) are separable too.
        cls.class_a = CourseClass.objects.create(
            course=Course.objects.create(code="MATH101", title="Math", credits=3, department=dept),
            group=group, capacity=50,
        )
        cls.class_b = CourseClass.objects.create(
            course=Course.objects.create(code="PHYS101", title="Physics", credits=3, department=dept),
            group=group, capacity=50,
        )

        # bulk_create skips Enrollment.save()'s eligibility checks, which are
        # covered elsewhere and irrelevant to access control.
        cls.enrollment_a, cls.enrollment_b = Enrollment.objects.bulk_create([
            Enrollment(student=cls.student_a, course_class=cls.class_a),
            Enrollment(student=cls.student_b, course_class=cls.class_b),
        ])

        room = Room.objects.create(code="R1", name="Room 1", capacity=100, room_type="LECTURE")
        cls.session_a = Session.objects.create(
            course_class=cls.class_a, room=room,
            timeslot=Timeslot.objects.create(day=Timeslot.Day.MONDAY, period=Timeslot.Period.PERIOD_1),
        )
        cls.session_b = Session.objects.create(
            course_class=cls.class_b, room=room,
            timeslot=Timeslot.objects.create(day=Timeslot.Day.TUESDAY, period=Timeslot.Period.PERIOD_2),
        )

        cls.b_records = {}
        cls.a_records = {}
        for student, enrollment, course_class, session, out in (
            (cls.student_a, cls.enrollment_a, cls.class_a, cls.session_a, cls.a_records),
            (cls.student_b, cls.enrollment_b, cls.class_b, cls.session_b, cls.b_records),
        ):
            exam = Exam.objects.create(course_class=course_class, exam_type="MIDTERM", week=6, max_score=30)
            assignment = Assignment.objects.create(
                course_class=course_class, assignment_type="HOMEWORK", due_week=3, max_points=10,
            )
            out.update({
                "students": student,
                "enrollments": enrollment,
                "grades": GradeEntry.objects.create(enrollment=enrollment, component="Midterm", score=20),
                "attendance": AttendanceRecord.objects.create(student=student, session=session, week=1, status="PRESENT"),
                "exams": exam,
                "exam-results": ExamResult.objects.create(exam=exam, student=student, score=25),
                "assignments": assignment,
                "student-submissions": StudentSubmission.objects.create(student=student, assignment=assignment),
            })

    def setUp(self):
        cache.clear()  # throttle counters live in the cache; keep tests independent

    def client_for(self, user):
        client = APIClient()
        client.force_authenticate(user)
        return client

    @staticmethod
    def ids(response):
        return {row["id"] for row in response.json()["results"]}


# (key into *_records, list URL, extra query params)
ENDPOINTS = [
    ("students", "/api/users/students/", {}),
    ("enrollments", "/api/records/enrollments/", {"term_status": "all"}),
    ("grades", "/api/records/grades/", {}),
    ("attendance", "/api/records/attendance/", {}),
    ("exams", "/api/records/exams/", {}),
    ("exam-results", "/api/records/exam-results/", {}),
    ("assignments", "/api/records/assignments/", {}),
    ("student-submissions", "/api/records/student-submissions/", {}),
]


class StudentCannotReadOtherStudentsRecords(IDORTestBase):
    def test_list_returns_only_own_records(self):
        client = self.client_for(self.user_a)
        for key, url, params in ENDPOINTS:
            # Without ?student=, with a spoofed ?student=B, and with ?student=A.
            for student_param in (None, self.student_b.id, self.student_a.id):
                query = dict(params, **({"student": student_param} if student_param else {}))
                with self.subTest(endpoint=key, student=student_param):
                    response = client.get(url, query)
                    self.assertEqual(response.status_code, 200)
                    self.assertNotIn(self.b_records[key].pk, self.ids(response))

            with self.subTest(endpoint=key, check="own records visible"):
                self.assertIn(self.a_records[key].pk, self.ids(client.get(url, params)))

    def test_retrieve_other_students_record_is_404(self):
        client = self.client_for(self.user_a)
        for key, url, params in ENDPOINTS:
            with self.subTest(endpoint=key):
                response = client.get(f"{url}{self.b_records[key].pk}/", params)
                self.assertEqual(response.status_code, 404)

    def test_dashboard_summary_for_other_student_is_403(self):
        client = self.client_for(self.user_a)
        url = "/api/records/enrollments/dashboard-summary/"
        self.assertEqual(client.get(url, {"student": self.student_b.id}).status_code, 403)
        self.assertEqual(client.get(url, {"student": self.student_a.id}).status_code, 200)

    def test_unrouted_session_viewset_is_scoped(self):
        # SessionViewSet isn't in any urls.py today; call it directly so it
        # stays safe if someone registers it later.
        request = APIRequestFactory().get("/", {"student": self.student_b.id})
        force_authenticate(request, user=self.user_a)
        response = SessionViewSet.as_view({"get": "list"})(request)
        ids = {row["id"] for row in response.data["results"]}
        self.assertEqual(ids, {self.session_a.pk})


class StudentCannotModifyOtherStudentsRecords(IDORTestBase):
    PATCH_PAYLOADS = {
        "students": {"enrollment_year": 1999},
        "enrollments": {"status": "DROPPED"},
        "grades": {"score": "0"},
        "attendance": {"status": "ABSENT"},
        "exams": {"week": 1},
        "exam-results": {"score": "0"},
        "assignments": {"due_week": 1},
        "student-submissions": {"assignment": None},  # filled per-test with A's own assignment
    }

    def test_patch_other_students_record_is_denied_and_unchanged(self):
        client = self.client_for(self.user_a)
        for key, url, params in ENDPOINTS:
            record = self.b_records[key]
            payload = dict(self.PATCH_PAYLOADS[key])
            if key == "student-submissions":
                payload["assignment"] = self.a_records["assignments"].pk
            before = model_to_dict(record)
            with self.subTest(endpoint=key):
                response = client.patch(f"{url}{record.pk}/", payload, format="json")
                self.assertIn(response.status_code, (403, 404))
                record.refresh_from_db()
                self.assertEqual(model_to_dict(record), before)

    def test_post_on_behalf_of_other_student_is_denied(self):
        client = self.client_for(self.user_a)
        payloads = {
            "enrollments": {"student": self.student_b.id, "course_class": self.class_a.id},
            "grades": {"enrollment": self.enrollment_b.id, "component": "Final", "score": "50"},
            "attendance": {"student": self.student_b.id, "session": self.session_b.id, "week": 2, "status": "ABSENT"},
            "exam-results": {"student": self.student_b.id, "exam": self.b_records["exams"].id, "score": "0"},
        }
        for key, url, _ in ENDPOINTS:
            if key not in payloads:
                continue
            model = type(self.b_records[key])
            count_before = model.objects.count()
            with self.subTest(endpoint=key):
                response = client.post(url, payloads[key], format="json")
                self.assertEqual(response.status_code, 403)
                self.assertEqual(model.objects.count(), count_before)

    def test_submission_ownership_is_forced_to_requesting_student(self):
        client = self.client_for(self.user_a)
        url = "/api/records/student-submissions/"
        StudentSubmission.objects.filter(student=self.student_a).delete()

        # Spoofed student and self-assigned score are ignored.
        response = client.post(
            url, {"assignment": self.a_records["assignments"].pk, "student": self.student_b.id, "score": "10"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        created = StudentSubmission.objects.get(pk=response.json()["id"])
        self.assertEqual(created.student_id, self.student_a.id)
        self.assertIsNone(created.score)

        # Submitting to B's assignment (a class A isn't in) is rejected.
        response = client.post(url, {"assignment": self.b_records["assignments"].pk}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertFalse(StudentSubmission.objects.filter(student=self.student_a, assignment=self.b_records["assignments"]).exists())

    def test_student_cannot_grade_any_submission(self):
        client = self.client_for(self.user_a)
        for key in ("a", "b"):
            submission = (self.a_records if key == "a" else self.b_records)["student-submissions"]
            with self.subTest(owner=key):
                response = client.patch(
                    f"/api/records/student-submissions/{submission.pk}/grade/", {"score": "10"}, format="json",
                )
                self.assertEqual(response.status_code, 403)
                submission.refresh_from_db()
                self.assertIsNone(submission.score)


class OtherRolesAreScopedCorrectly(IDORTestBase):
    def test_teacher_is_default_denied(self):
        client = self.client_for(self.teacher)
        for key, url, params in ENDPOINTS:
            with self.subTest(endpoint=key):
                response = client.get(url, params)
                if key == "student-submissions":
                    self.assertEqual(response.status_code, 403)  # IsStudent | IsAdmin
                else:
                    self.assertEqual(response.status_code, 200)
                    self.assertEqual(response.json()["results"], [])

    def test_admin_can_see_and_filter_by_any_student(self):
        client = self.client_for(self.admin)
        for key, url, params in ENDPOINTS:
            with self.subTest(endpoint=key):
                ids = self.ids(client.get(url, params))
                self.assertTrue({self.a_records[key].pk, self.b_records[key].pk} <= ids)
                response = client.get(f"{url}{self.b_records[key].pk}/", params)
                self.assertEqual(response.status_code, 200)

    def test_admin_non_integer_student_param_is_400(self):
        response = self.client_for(self.admin).get("/api/records/exams/", {"student": "abc"})
        self.assertEqual(response.status_code, 400)

    def test_admin_can_grade(self):
        submission = self.b_records["student-submissions"]
        response = self.client_for(self.admin).patch(
            f"/api/records/student-submissions/{submission.pk}/grade/", {"score": "7.5"}, format="json",
        )
        self.assertEqual(response.status_code, 200)
        submission.refresh_from_db()
        self.assertEqual(submission.score, Decimal("7.5"))


class PaginationAndThrottling(IDORTestBase):
    def test_list_endpoints_are_paginated(self):
        body = self.client_for(self.admin).get("/api/records/exams/", {"page_size": 1}).json()
        self.assertEqual(set(body), {"count", "next", "previous", "results"})
        self.assertEqual(len(body["results"]), 1)
        self.assertEqual(body["count"], 2)

    def test_login_is_throttled_per_account(self):
        client = APIClient()
        limit = LoginRateThrottle().num_requests
        for _ in range(limit):
            response = client.post("/api/auth/token/", {"email": "b@test.edu", "password": "wrong"}, format="json")
            self.assertEqual(response.status_code, 401)
        response = client.post("/api/auth/token/", {"email": "B@Test.edu ", "password": "wrong"}, format="json")
        self.assertEqual(response.status_code, 429)
        # A different account from the same IP is unaffected.
        response = client.post("/api/auth/token/", {"email": "a@test.edu", "password": "wrong"}, format="json")
        self.assertEqual(response.status_code, 401)
