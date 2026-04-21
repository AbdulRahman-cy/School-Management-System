from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db import transaction

from academics.models import Term, CourseClass
from records.models import Exam


# ─── Exam schedule definition ─────────────────────────────────────────────────
#
# Alexandria University fixed distribution (must sum to 100):
#   Midterm Exam   → 30 marks  — held around week 7
#   Lab Work       → 20 marks  — practical, week 10
#   Final Exam     → 50 marks  — held around week 15
#
# max_score reflects the actual mark ceiling for each component.
# The signal that syncs ExamResult → GradeEntry uses get_exam_type_display()
# so component names in GradeEntry will match these display values exactly:
#   "Midterm Exam", "Practical/Lab Exam", "Final Exam"

EXAM_SCHEDULE = [
    # (exam_type,           week,  max_score)
    (Exam.ExamType.MIDTERM,   7,  Decimal("30.00")),
    (Exam.ExamType.PRACTICAL, 10, Decimal("20.00")),
    (Exam.ExamType.FINAL,     15, Decimal("50.00")),
]

assert sum(e[2] for e in EXAM_SCHEDULE) == Decimal("100.00"), \
    "Exam max_scores must sum to 100"


class Command(BaseCommand):
    help = "Seeds one set of Exam rows for every CourseClass in the active term."

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

        self.stdout.write(f"Creating exams for {course_classes.count()} course classes...")

        to_create = []
        for cc in course_classes:
            for exam_type, week, max_score in EXAM_SCHEDULE:
                to_create.append(Exam(
                    course_class=cc,
                    exam_type=exam_type,
                    week=week,
                    max_score=max_score,
                ))

        self.stdout.write(f"Bulk inserting {len(to_create)} exam rows...")
        Exam.objects.bulk_create(to_create, batch_size=batch_size, ignore_conflicts=True)
        self.stdout.write(self.style.SUCCESS(f"Done. {len(to_create)} exams seeded."))