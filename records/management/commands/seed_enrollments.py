import random
from django.core.management.base import BaseCommand
from django.db import transaction

from users.models import StudentProfile
from academics.models import Term, CourseClass, StudyGroup
from scheduling.models import Session
from records.models import Enrollment


class Command(BaseCommand):
    help = "Seeds Enrollments across all terms dynamically calculating historical year levels."

    def add_arguments(self, parser):
        parser.add_argument("--batch-size", type=int, default=500)

    @transaction.atomic
    def handle(self, *args, **options):
        batch_size = options["batch_size"]
        terms = Term.objects.all()

        if not terms.exists():
            self.stdout.write(self.style.ERROR("No terms found."))
            return

        students = StudentProfile.objects.select_related("discipline").all()
        if not students.exists():
            self.stdout.write(self.style.ERROR("No students found."))
            return

        total_created = 0

        for term in terms:
            self.stdout.write(f"\nProcessing enrollments for: {term.name}")
            
            if not Session.objects.filter(course_class__term=term).exists():
                self.stdout.write(self.style.WARNING(f"Skipping {term.name} - no sessions found. Run scheduler first."))
                continue

            sessions_map: dict[int, dict[str, Session]] = {}
            for s in Session.objects.filter(course_class__term=term):
                sessions_map.setdefault(s.course_class_id, {})[s.session_type] = s

            classes_by_group: dict[int, list] = {}
            for cc in CourseClass.objects.filter(term=term):
                classes_by_group.setdefault(cc.group_id, []).append(cc)

            to_create = []
            for student in students:
                calculated_year = term.start_date.year - student.enrollment_year + 1
                
                # Student hadn't enrolled yet in this historical term
                if calculated_year < 1:
                    continue
                
                # Cap at year 4 for standard enrollment tracking
                year_level = min(4, calculated_year)

                group = StudyGroup.objects.filter(
                    discipline=student.discipline,
                    year_level=year_level,
                    term=term,
                ).first()
                
                if not group:
                    continue

                for cc in classes_by_group.get(group.id, []):
                    cc_sessions = sessions_map.get(cc.id, {})
                    to_create.append(Enrollment(
                        student=student,
                        course_class=cc,
                        lecture_session=cc_sessions.get("LECTURE"),
                        tutorial_session=cc_sessions.get("TUTORIAL"),
                        lab_session=cc_sessions.get("LAB"),
                    ))

            if to_create:
                self.stdout.write(f"Bulk inserting {len(to_create)} enrollments...")
                Enrollment.objects.bulk_create(to_create, batch_size=batch_size, ignore_conflicts=True)
                total_created += len(to_create)

        self.stdout.write(self.style.SUCCESS(f"\nDone. {total_created} total enrollments seeded across all terms."))