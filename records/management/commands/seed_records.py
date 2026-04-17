import random
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db import transaction

from users.models import StudentProfile
from academics.models import Term, CourseClass, StudyGroup
from scheduling.models import Session
from records.models import Enrollment, GradeEntry

class Command(BaseCommand):
    help = "Seeds Enrollments and Grades using the output from the CP-SAT Scheduler."

    def add_arguments(self, parser):
        parser.add_argument(
            "--batch-size",
            type=int,
            default=500,
            help="bulk_create batch size",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        # 0. Set the batch size from arguments
        batch_size = options["batch_size"]
        
        term = Term.objects.filter(is_active=True).first()
        if not term:
            self.stdout.write(self.style.ERROR("No active term found."))
            return

        # 1. Verify Sessions exist
        sessions_count = Session.objects.filter(course_class__term=term).count()
        if sessions_count == 0:
            self.stdout.write(self.style.ERROR(
                "CRITICAL: No Sessions found! Run 'python manage.py run_scheduler' first."
            ))
            return

        # 2. Map Sessions to CourseClasses
        sessions_map = {}
        for s in Session.objects.filter(course_class__term=term):
            sessions_map.setdefault(s.course_class_id, {})[s.session_type] = s

        # 3. Process Students into Enrollments
        students = StudentProfile.objects.select_related('discipline').all()
        enrollments_to_create = []

        # Optimization: cache CourseClasses by group
        classes_by_group = {}
        for cc in CourseClass.objects.filter(term=term):
            classes_by_group.setdefault(cc.group_id, []).append(cc)

        self.stdout.write(f"Preparing enrollments for {len(students)} students...")
        for student in students:
            level = max(1, min(4, 2026 - student.enrollment_year + 1))
            group = StudyGroup.objects.filter(
                discipline=student.discipline, 
                year_level=level, 
                term=term
            ).first()

            if not group: 
                continue

            course_classes = classes_by_group.get(group.id, [])
            for cc in course_classes:
                cc_sessions = sessions_map.get(cc.id, {})
                
                enrollments_to_create.append(Enrollment(
                    student=student,
                    course_class=cc,
                    lecture_session=cc_sessions.get("LECTURE"),
                    tutorial_session=cc_sessions.get("TUTORIAL"),
                    lab_session=cc_sessions.get("LAB")
                ))

        # 4. Bulk Create Enrollments
        self.stdout.write(f"Bulk inserting {len(enrollments_to_create)} enrollments...")
        Enrollment.objects.bulk_create(
            enrollments_to_create, 
            batch_size=batch_size, 
            ignore_conflicts=True
        )

        # 5. RE-FETCH Enrollments to get IDs for GradeEntry
        self.stdout.write("Fetching IDs for grade assignment...")
        active_enrollments = Enrollment.objects.filter(course_class__term=term)

        grade_entries = []
        components = [
            {"name": "Midterm", "weight": Decimal("0.30")},
            {"name": "Lab Work", "weight": Decimal("0.20")},
            {"name": "Final Exam", "weight": Decimal("0.50")},
        ]

        for enrollment in active_enrollments:
            # realistic random distribution
            student_mu = random.gauss(75, 10) 
            for comp in components:
                score = Decimal(str(round(max(0, min(100, random.gauss(student_mu, 5))), 2)))
                grade_entries.append(
                    GradeEntry(
                        enrollment=enrollment, 
                        component=comp["name"],
                        weight=comp["weight"],
                        score=score,
                    )
                )

        # 6. Bulk Create Grades
        self.stdout.write(f"Inserting {len(grade_entries)} grade entries...")
        GradeEntry.objects.bulk_create(grade_entries, batch_size=batch_size)
        self.stdout.write(self.style.SUCCESS("🚀 All records successfully seeded!"))