from django.core.management.base import BaseCommand
from django.db import transaction

from academics.models import Term, CourseClass
from records.models import Assignment
from decimal import Decimal

ASSIGNMENT_SCHEDULE = [
    (Assignment.AssignmentType.HOMEWORK,  4,  Decimal("10.00")),
    (Assignment.AssignmentType.PROJECT,  12,  Decimal("20.00")),
]

class Command(BaseCommand):
    help = "Seeds Assignment rows for every CourseClass across all terms."

    def add_arguments(self, parser):
        parser.add_argument("--batch-size", type=int, default=500)

    @transaction.atomic
    def handle(self, *args, **options):
        batch_size = options["batch_size"]

        for term in Term.objects.all():
            course_classes = CourseClass.objects.filter(term=term)
            if not course_classes.exists():
                self.stdout.write(self.style.WARNING(f"No CourseClasses found for {term.name}."))
                continue

            to_create = []
            for cc in course_classes:
                for assignment_type, due_week, max_points in ASSIGNMENT_SCHEDULE:
                    to_create.append(Assignment(
                        course_class=cc,
                        assignment_type=assignment_type,
                        due_week=due_week,
                        max_points=max_points,
                    ))

            Assignment.objects.bulk_create(to_create, batch_size=batch_size, ignore_conflicts=True)
            self.stdout.write(self.style.SUCCESS(f"Seeded {len(to_create)} assignments for {term.name}."))