import random
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db import transaction

from academics.models import Term
from records.models import Enrollment, Exam, ExamResult, GradeEntry


class Command(BaseCommand):
    help = (
        "Seeds ExamResult rows for all enrollments in the active term. "
        "The post_save signal automatically creates the corresponding GradeEntry rows."
    )

    def add_arguments(self, parser):
        parser.add_argument("--batch-size", type=int, default=500)
        parser.add_argument(
            "--midterm-only",
            action="store_true",
            help="Only seed Midterm results, leaving Final and Practical as pending.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        batch_size    = options["batch_size"]
        midterm_only  = options["midterm_only"]

        term = Term.objects.filter(is_active=True).first()
        if not term:
            self.stdout.write(self.style.ERROR("No active term found."))
            return

        # Build exam map: course_class_id → {exam_type: Exam}
        exam_map: dict[int, dict[str, Exam]] = {}
        for exam in Exam.objects.filter(course_class__term=term):
            exam_map.setdefault(exam.course_class_id, {})[exam.exam_type] = exam

        if not exam_map:
            self.stdout.write(self.style.ERROR(
                "No Exams found. Run 'python manage.py seed_exams' first."
            ))
            return

        # Fetch all enrollments with their course class
        enrollments = Enrollment.objects.filter(
            course_class__term=term
        ).select_related("student", "course_class")

        self.stdout.write(f"Generating exam results for {enrollments.count()} enrollments...")

        # Determine which exam types to seed
        types_to_seed = [Exam.ExamType.MIDTERM]
        if not midterm_only:
            types_to_seed += [Exam.ExamType.PRACTICAL, Exam.ExamType.FINAL]

        # ── Build ExamResult rows ─────────────────────────────────────────────
        # We cannot use bulk_create here because we need the post_save signal
        # to fire for each result so GradeEntry rows get created automatically.
        # We batch manually to show progress without hammering memory.

        created_count = 0
        batch: list[tuple[Enrollment, Exam, Decimal]] = []

        for enrollment in enrollments:
            cc_exams = exam_map.get(enrollment.course_class_id, {})

            # Each student has a consistent ability level across exams
            # (good students perform well on all components)
            ability = random.gauss(mu=0.72, sigma=0.12)
            ability = max(0.0, min(1.0, ability))

            for exam_type in types_to_seed:
                exam = cc_exams.get(exam_type)
                if not exam:
                    continue

                # Per-exam noise so the same student isn't perfectly consistent
                component_ability = ability + random.gauss(mu=0.0, sigma=0.05)
                component_ability = max(0.0, min(1.0, component_ability))

                raw_score = Decimal(str(
                    round(float(exam.max_score) * component_ability, 2)
                ))

                batch.append((enrollment, exam, raw_score))

            if len(batch) >= batch_size:
                created_count += self._flush(batch)
                batch = []

        # Flush remainder
        if batch:
            created_count += self._flush(batch)

        self.stdout.write(self.style.SUCCESS(
            f"Done. {created_count} ExamResult rows created. "
            f"GradeEntry rows were created automatically via signal."
        ))

        # Verify GradeEntry count matches
        grade_count = GradeEntry.objects.filter(
            enrollment__course_class__term=term
        ).count()
        self.stdout.write(f"GradeEntry rows in DB for active term: {grade_count}")

    def _flush(self, batch: list[tuple]) -> int:
        """
        Save ExamResult rows one by one so the post_save signal fires for each.
        Returns the number of rows created.
        """
        count = 0
        for enrollment, exam, score in batch:
            ExamResult.objects.get_or_create(
                exam=exam,
                student=enrollment.student,
                defaults={
                    "status": ExamResult.Status.PRESENT,
                    "score":  score,
                },
            )
            count += 1
        return count