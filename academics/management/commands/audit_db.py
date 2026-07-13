from django.core.management.base import BaseCommand

# 1. Users App
from users.models import BaseUser, StudentProfile, TeacherProfile

# 2. Academics App (Core Infrastructure)
from academics.models import Department, Discipline, Term, Course, StudyGroup, CourseClass, Room

# 3. Records App (Transactional Data)
from records.models import (
    Assignment, Exam, AttendanceRecord, ExamResult, 
    StudentSubmission, GradeEntry, Enrollment
)

# 4. Scheduling App (Time & Logistics)
from scheduling.models import Session, Timeslot


class Command(BaseCommand):
    help = 'Audits the database and prints a comprehensive statistical summary of all records.'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.WARNING("=================================================="))
        self.stdout.write(self.style.WARNING("       UNIVERSITY SYSTEM DATABASE AUDIT           "))
        self.stdout.write(self.style.WARNING("=================================================="))
        
        # 1. User & Identity Layer
        self.stdout.write(self.style.SUCCESS("\n[IDENTITY & ROLES]"))
        self.stdout.write(f"Total System Users:  {BaseUser.objects.count()}")
        self.stdout.write(f"  ├─ Students:       {StudentProfile.objects.count()}")
        self.stdout.write(f"  ├─ Teachers:       {TeacherProfile.objects.count()}")
        self.stdout.write(f"  └─ Admins/Staff:   {BaseUser.objects.filter(is_staff=True).count()}")

        # 2. Academic Infrastructure
        self.stdout.write(self.style.SUCCESS("\n[ACADEMIC INFRASTRUCTURE]"))
        self.stdout.write(f"Departments:         {Department.objects.count()}")
        self.stdout.write(f"Disciplines:         {Discipline.objects.count()}")
        self.stdout.write(f"Terms/Semesters:     {Term.objects.count()}")
        self.stdout.write(f"Rooms Available:     {Room.objects.count()}")
        self.stdout.write(f"Courses Catalog:     {Course.objects.count()}")

        # 3. Active Operations (The scale of the current semester)
        self.stdout.write(self.style.SUCCESS("\n[ACTIVE OPERATIONS]"))
        self.stdout.write(f"Study Groups:        {StudyGroup.objects.count()}")
        self.stdout.write(f"Active Classes:      {CourseClass.objects.count()}")
        self.stdout.write(f"Scheduled Sessions:  {Session.objects.count()}")
        self.stdout.write(f"Timeslots Defined:   {Timeslot.objects.count()}")

        # 4. Student Engagement & Data Volume (The heavy tables)
        self.stdout.write(self.style.SUCCESS("\n[STUDENT DATA VOLUME]"))
        self.stdout.write(f"Total Enrollments:   {Enrollment.objects.count()}")
        self.stdout.write(f"Attendance Records:  {AttendanceRecord.objects.count()}")
        
        # 5. Assessments & Grading
        self.stdout.write(self.style.SUCCESS("\n[ASSESSMENTS & GRADING]"))
        self.stdout.write(f"Exams Scheduled:     {Exam.objects.count()}")
        self.stdout.write(f"Exam Results:        {ExamResult.objects.count()}")
        self.stdout.write(f"Assignments Created: {Assignment.objects.count()}")
        self.stdout.write(f"Student Submissions: {StudentSubmission.objects.count()}")
        self.stdout.write(f"Granular Grades:     {GradeEntry.objects.count()}")

        self.stdout.write(self.style.WARNING("\n=================================================="))
        self.stdout.write(self.style.WARNING("                 AUDIT COMPLETE                   "))
        self.stdout.write(self.style.WARNING("==================================================\n"))