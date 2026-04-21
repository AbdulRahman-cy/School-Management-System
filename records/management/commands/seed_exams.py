from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db import transaction

from academics.models import Term, CourseClass
from records.models import Exam

EXAM_SCHEDULE = [
    (Exam.ExamType.MIDTERM,   7,  Decimal("30.00")),
    (Exam.ExamType.PRACTICAL, 10, Decimal("20.00")),
    (Exam.ExamType.FINAL,     15, Decimal("50.00")),
]

assert sum(e[2] for e in EXAM_SCHEDULE) == Decimal("100.00")

class Command(BaseCommand):
    help = "Seeds Exam rows for every CourseClass across all terms."

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
                for exam_type, week, max_score in EXAM_SCHEDULE:
                    to_create.append(Exam(
                        course_class=cc,
                        exam_type=exam_type,
                        week=week,
                        max_score=max_score,
                    ))

            Exam.objects.bulk_create(to_create, batch_size=batch_size, ignore_conflicts=True)
            self.stdout.write(self.style.SUCCESS(f"Seeded {len(to_create)} exams for {term.name}."))