import random
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from datetime import timedelta

from academics.models import Term
from records.models import Enrollment, Assignment, StudentSubmission


class Command(BaseCommand):
    help = "Seeds StudentSubmission rows across all terms. Active term scores are left pending."

    def add_arguments(self, parser):
        parser.add_argument("--batch-size", type=int, default=500)
        parser.add_argument("--late-rate", type=float, default=0.08)

    @transaction.atomic
    def handle(self, *args, **options):
        batch_size = options["batch_size"]
        late_rate  = options["late_rate"]
        terms = Term.objects.all()

        for term in terms:
            self.stdout.write(f"\nProcessing submissions for: {term.name}")
            
            assignment_map: dict[int, list[Assignment]] = {}
            for assignment in Assignment.objects.filter(course_class__term=term):
                assignment_map.setdefault(assignment.course_class_id, []).append(assignment)

            if not assignment_map:
                self.stdout.write(self.style.WARNING(f"No assignments found for {term.name}."))
                continue

            enrollments = Enrollment.objects.filter(
                course_class__term=term
            ).select_related("student", "course_class")

            to_create = []
            term_start = timezone.make_aware(timezone.datetime(term.start_date.year, term.start_date.month, term.start_date.day))

            for enrollment in enrollments:
                assignments = assignment_map.get(enrollment.course_class_id, [])
                ability = max(0.0, min(1.0, random.gauss(mu=0.74, sigma=0.12)))

                for assignment in assignments:
                    deadline = term_start + timedelta(weeks=assignment.due_week)

                    if random.random() < late_rate:
                        submitted_at = deadline + timedelta(days=random.randint(1, 3))
                    else:
                        submitted_at = deadline - timedelta(days=random.randint(0, 3))

                    # If term is active, leave score as None
                    if term.is_active:
                        raw_score = None
                    else:
                        component_ability = max(0.0, min(1.0, ability + random.gauss(mu=0.0, sigma=0.05)))
                        raw_score = Decimal(str(round(float(assignment.max_points) * component_ability, 2)))

                    to_create.append(StudentSubmission(
                        student=enrollment.student,
                        assignment=assignment,
                        score=raw_score,
                        submitted_at=submitted_at,
                    ))

                    if len(to_create) >= batch_size:
                        self._flush(to_create)
                        to_create = []

            if to_create:
                self._flush(to_create)

            count = StudentSubmission.objects.filter(assignment__course_class__term=term).count()
            self.stdout.write(self.style.SUCCESS(f"Seeded {count} submissions for {term.name}."))

    def _flush(self, batch: list[StudentSubmission]) -> None:
        for submission in batch:
            StudentSubmission.objects.get_or_create(
                student=submission.student,
                assignment=submission.assignment,
                defaults={
                    "score": submission.score,
                },
            )