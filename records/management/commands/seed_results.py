import random
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db import transaction

from academics.models import Term
from records.models import Enrollment, Exam, ExamResult, GradeEntry


class Command(BaseCommand):
    help = "Seeds ExamResult rows for all terms. Active term scores are kept as pending (None)."

    def add_arguments(self, parser):
        parser.add_argument("--batch-size", type=int, default=500)
        parser.add_argument("--midterm-only", action="store_true")

    @transaction.atomic
    def handle(self, *args, **options):
        batch_size    = options["batch_size"]
        midterm_only  = options["midterm_only"]
        terms = Term.objects.all()

        for term in terms:
            self.stdout.write(f"\nProcessing exam results for: {term.name}")
            
            exam_map: dict[int, dict[str, Exam]] = {}
            for exam in Exam.objects.filter(course_class__term=term):
                exam_map.setdefault(exam.course_class_id, {})[exam.exam_type] = exam

            if not exam_map:
                self.stdout.write(self.style.WARNING(f"No Exams found for {term.name}."))
                continue

            enrollments = Enrollment.objects.filter(
                course_class__term=term
            ).select_related("student", "course_class")

            types_to_seed = [Exam.ExamType.MIDTERM]
            if not midterm_only:
                types_to_seed += [Exam.ExamType.PRACTICAL, Exam.ExamType.FINAL]

            created_count = 0
            batch = []

            for enrollment in enrollments:
                cc_exams = exam_map.get(enrollment.course_class_id, {})
                ability = max(0.0, min(1.0, random.gauss(mu=0.72, sigma=0.12)))

                for exam_type in types_to_seed:
                    exam = cc_exams.get(exam_type)
                    if not exam:
                        continue

                    if term.is_active:
                        raw_score = None
                    else:
                        component_ability = max(0.0, min(1.0, ability + random.gauss(mu=0.0, sigma=0.05)))
                        raw_score = Decimal(str(round(float(exam.max_score) * component_ability, 2)))

                    batch.append((enrollment, exam, raw_score))

                if len(batch) >= batch_size:
                    created_count += self._flush(batch)
                    batch = []

            if batch:
                created_count += self._flush(batch)

            self.stdout.write(self.style.SUCCESS(f"{created_count} ExamResults created for {term.name}."))

        self.stdout.write("\nFinished seating ExamResults.")

    def _flush(self, batch: list[tuple]) -> int:
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