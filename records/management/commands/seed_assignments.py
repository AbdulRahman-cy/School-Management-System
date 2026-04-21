from django.core.management.base import BaseCommand
from django.db import transaction

from academics.models import Term, CourseClass
from records.models import Assignment
from decimal import Decimal


# ─── Assignment schedule ──────────────────────────────────────────────────────
# Each course class gets one homework and one project per term.
# due_week is relative to term start (1-based).
# max_points is the ceiling for that assignment's score.

ASSIGNMENT_SCHEDULE = [
    # (assignment_type,            due_week,  max_points)
    (Assignment.AssignmentType.HOMEWORK,  4,  Decimal("10.00")),
    (Assignment.AssignmentType.PROJECT,  12,  Decimal("20.00")),
]


class Command(BaseCommand):
    help = "Seeds Assignment rows for every CourseClass in the active term."

    def add_arguments(self, parser):
        parser.add_argument("--batch-size", type=int, default=500)

    @transaction.atomic
    def handle(self, *args, **options):
        batch_size = options["batch_size"]

        term = Term.objects.filter(is_active=True).first()
        if not term:
            self.stdout.write(self.style.ERROR("No active term found."))
            return

        course_classes = CourseClass.objects.filter(term=term)
        if not course_classes.exists():
            self.stdout.write(self.style.ERROR("No CourseClasses found for the active term."))
            return

        self.stdout.write(f"Creating assignments for {course_classes.count()} course classes...")

        to_create = []
        for cc in course_classes:
            for assignment_type, due_week, max_points in ASSIGNMENT_SCHEDULE:
                to_create.append(Assignment(
                    course_class=cc,
                    assignment_type=assignment_type,
                    due_week=due_week,
                    max_points=max_points,
                ))

        self.stdout.write(f"Bulk inserting {len(to_create)} assignments...")
        Assignment.objects.bulk_create(to_create, batch_size=batch_size, ignore_conflicts=True)
        self.stdout.write(self.style.SUCCESS(f"Done. {len(to_create)} assignments seeded."))