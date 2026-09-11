from django.test import TestCase
from users.models import BaseUser, StudentProfile
from academics.models import Department, Discipline, Term, Course, StudyGroup, CourseClass, Room
from scheduling.models import Timeslot, Session
from records.models import Enrollment
from records.services.enrollment import EnrollmentService
from records.services.exceptions import TimetableConflictError, NotEnrolledError


class TimetableConflictTest(TestCase):
    def setUp(self):
        # User & Student
        self.user = BaseUser.objects.create_user(
            email="student@test.edu", password="password123",
            first_name="Test", last_name="Student", role=BaseUser.Role.STUDENT
        )
        self.department = Department.objects.create(code="CS", name="Computer Science")
        self.discipline = Discipline.objects.create(code="CS_BS", name="Computer Science BS", program_type="GSP", department=self.department)
        self.student = StudentProfile.objects.create(user=self.user, discipline=self.discipline, enrollment_year=2024)

        # Term & StudyGroup
        self.term = Term.objects.create(name="Fall 2026", season="FALL", start_date="2026-09-01", end_date="2026-12-31", is_active=True)
        self.group = StudyGroup.objects.create(discipline=self.discipline, term=self.term, year_level=1, number=1, capacity=50)

        # Courses & Classes
        self.course1 = Course.objects.create(code="MATH101", title="Math 101", credits=3, department=self.department)
        self.course2 = Course.objects.create(code="PHYS202", title="Physics 202", credits=3, department=self.department)
        self.course3 = Course.objects.create(code="CHEM303", title="Chemistry 303", credits=3, department=self.department)

        self.class1 = CourseClass.objects.create(course=self.course1, group=self.group, capacity=50)
        self.class2 = CourseClass.objects.create(course=self.course2, group=self.group, capacity=50)
        self.class3 = CourseClass.objects.create(course=self.course3, group=self.group, capacity=50)

        # Rooms & Timeslots
        self.room = Room.objects.create(code="R101", name="Room 101", capacity=100, room_type="LECTURE")
        self.timeslot1 = Timeslot.objects.create(day=Timeslot.Day.MONDAY, period=Timeslot.Period.PERIOD_1) # Mon 08:00 - 09:30
        self.timeslot2 = Timeslot.objects.create(day=Timeslot.Day.TUESDAY, period=Timeslot.Period.PERIOD_2) # Tue 09:45 - 11:15

        # Sessions: class1 and class2 share timeslot1 (MONDAY P1)
        self.session1 = Session.objects.create(course_class=self.class1, room=self.room, timeslot=self.timeslot1, session_type="LECTURE")
        self.session2 = Session.objects.create(course_class=self.class2, room=self.room, timeslot=self.timeslot1, session_type="LAB")
        # class3 is on timeslot2 (TUESDAY P2)
        self.session3 = Session.objects.create(course_class=self.class3, room=self.room, timeslot=self.timeslot2, session_type="LECTURE")

    def test_timetable_conflict_raises_exception(self):
        # Enroll in class1 first
        EnrollmentService(student=self.student, course_class=self.class1).enroll()

        # Attempt to enroll in class2 (overlapping on Monday P1)
        with self.assertRaises(TimetableConflictError) as ctx:
            EnrollmentService(student=self.student, course_class=self.class2).enroll()

        self.assertIn("Cannot enroll:", str(ctx.exception))
        self.assertIn("PHYS202 Lab overlaps with MATH101 Lecture on Mondays at 08:00 – 09:30", str(ctx.exception))

    def test_non_overlapping_enrollment_succeeds(self):
        # Enroll in class1 (Monday P1)
        EnrollmentService(student=self.student, course_class=self.class1).enroll()

        # Enroll in class3 (Tuesday P2) -> should succeed
        created = EnrollmentService(student=self.student, course_class=self.class3).enroll()
        self.assertEqual(len(created), 1)
        self.assertEqual(created[0].course_class, self.class3)

    def test_unenroll_single_class(self):
        # Enroll in class1
        EnrollmentService(student=self.student, course_class=self.class1).enroll()
        self.assertTrue(Enrollment.objects.filter(student=self.student, course_class=self.class1).exists())

        # Unenroll from class1
        deleted_count = EnrollmentService(student=self.student, course_class=self.class1).unenroll()
        self.assertEqual(deleted_count, 1)
        self.assertFalse(Enrollment.objects.filter(student=self.student, course_class=self.class1).exists())

    def test_unenroll_not_enrolled_raises_exception(self):
        with self.assertRaises(NotEnrolledError) as ctx:
            EnrollmentService(student=self.student, course_class=self.class1).unenroll()
        self.assertIn("You are not enrolled in the specified classes.", str(ctx.exception))

