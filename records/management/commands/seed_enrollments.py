import random
from django.core.management.base import BaseCommand
from django.db import transaction

from users.models import StudentProfile
from academics.models import Term, CourseClass, StudyGroup
from scheduling.models import Session
from records.models import Enrollment


class Command(BaseCommand):
    help = "Seeds Enrollments for the active term. Run seed_exams and seed_results after this."

    def add_arguments(self, parser):
        parser.add_argument("--batch-size", type=int, default=500)

    @transaction.atomic
    def handle(self, *args, **options):
        batch_size = options["batch_size"]

        term = Term.objects.filter(is_active=True).first()
        if not term:
            self.stdout.write(self.style.ERROR("No active term found."))
            return

        if not Session.objects.filter(course_class__term=term).exists():
            self.stdout.write(self.style.ERROR(
                "No sessions found. Run 'python manage.py run_scheduler' first."
            ))
            return

        # session map: course_class_id → {session_type: Session}
        sessions_map: dict[int, dict[str, Session]] = {}
        for s in Session.objects.filter(course_class__term=term):
            sessions_map.setdefault(s.course_class_id, {})[s.session_type] = s

        # course class map: group_id → [CourseClass]
        classes_by_group: dict[int, list] = {}
        for cc in CourseClass.objects.filter(term=term):
            classes_by_group.setdefault(cc.group_id, []).append(cc)

        students = StudentProfile.objects.select_related("discipline").all()
        self.stdout.write(f"Preparing enrollments for {students.count()} students...")

        to_create = []
        for student in students:
            year_level = max(1, min(4, 2026 - student.enrollment_year + 1))
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

        self.stdout.write(f"Bulk inserting {len(to_create)} enrollments...")
        Enrollment.objects.bulk_create(to_create, batch_size=batch_size, ignore_conflicts=True)
        self.stdout.write(self.style.SUCCESS(f"Done. {len(to_create)} enrollments seeded."))