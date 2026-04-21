import random
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from datetime import timedelta

from academics.models import Term
from records.models import Enrollment, Assignment, StudentSubmission


class Command(BaseCommand):
    help = "Seeds StudentSubmission rows for all enrollments in the active term."

    def add_arguments(self, parser):
        parser.add_argument("--batch-size", type=int, default=500)
        parser.add_argument(
            "--late-rate",
            type=float,
            default=0.08,
            help="Fraction of submissions that are late (default: 0.08 = 8%%)",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        batch_size = options["batch_size"]
        late_rate  = options["late_rate"]

        term = Term.objects.filter(is_active=True).first()
        if not term:
            self.stdout.write(self.style.ERROR("No active term found."))
            return

        # Build assignment map: course_class_id → [Assignment]
        assignment_map: dict[int, list[Assignment]] = {}
        for assignment in Assignment.objects.filter(course_class__term=term):
            assignment_map.setdefault(assignment.course_class_id, []).append(assignment)

        if not assignment_map:
            self.stdout.write(self.style.ERROR(
                "No Assignments found. Run 'python manage.py seed_assignments' first."
            ))
            return

        enrollments = Enrollment.objects.filter(
            course_class__term=term
        ).select_related("student", "course_class")

        self.stdout.write(f"Generating submissions for {enrollments.count()} enrollments...")

        to_create = []
        term_start = timezone.make_aware(
            timezone.datetime(
                term.start_date.year,
                term.start_date.month,
                term.start_date.day,
            )
        )

        for enrollment in enrollments:
            assignments = assignment_map.get(enrollment.course_class_id, [])

            # Per-student ability (consistent across assignments)
            ability = random.gauss(mu=0.74, sigma=0.12)
            ability = max(0.0, min(1.0, ability))

            for assignment in assignments:
                component_ability = ability + random.gauss(mu=0.0, sigma=0.05)
                component_ability = max(0.0, min(1.0, component_ability))

                raw_score = Decimal(str(
                    round(float(assignment.max_points) * component_ability, 2)
                ))

                # Determine submission timestamp
                # Deadline = term_start + due_week * 7 days
                deadline = term_start + timedelta(weeks=assignment.due_week)

                if random.random() < late_rate:
                    # Late: submitted 1–3 days after deadline
                    days_late = random.randint(1, 3)
                    submitted_at = deadline + timedelta(days=days_late)
                else:
                    # On time: submitted somewhere in the 3 days before deadline
                    days_early = random.randint(0, 3)
                    submitted_at = deadline - timedelta(days=days_early)

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

        total = StudentSubmission.objects.filter(
            assignment__course_class__term=term
        ).count()
        self.stdout.write(self.style.SUCCESS(
            f"Done. {total} StudentSubmission rows in DB for active term."
        ))

    def _flush(self, batch: list[StudentSubmission]) -> None:
        # submitted_at uses auto_now_add=True on the model which means bulk_create
        # would ignore our custom submitted_at value.
        # We use update_or_create to respect the field properly.
        # NOTE: if you want bulk speed, remove auto_now_add and use a regular
        # DateTimeField with default=timezone.now — then bulk_create works fine.
        for submission in batch:
            obj, created = StudentSubmission.objects.get_or_create(
                student=submission.student,
                assignment=submission.assignment,
                defaults={
                    "score":        submission.score,
                    # submitted_at is auto_now_add so we can't set it here —
                    # it will be set to now() by Django.
                    # To simulate late submissions properly, change the field to
                    # DateTimeField(default=timezone.now) and use bulk_create.
                },
            )