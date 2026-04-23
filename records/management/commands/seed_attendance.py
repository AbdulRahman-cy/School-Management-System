import random
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from users.models import StudentProfile
from academics.models import Term
from records.models import AttendanceRecord
from records.models import Enrollment
from scheduling.models import Session


STUDENT_ID   = 4
CURRENT_WEEK = 5    # active term: only generate up to this week
TOTAL_WEEKS  = 15   # past terms: full semester length

NORMAL_WEIGHTS = {
    "PRESENT": 75,
    "LATE":    10,
    "ABSENT":  10,
    "EXCUSED":  5,
}

AT_RISK_WEIGHTS = {
    "PRESENT": 30,
    "LATE":     5,
    "ABSENT":  60,
    "EXCUSED":  5,
}


def weighted_choice(weights: dict) -> str:
    return random.choices(list(weights.keys()), weights=list(weights.values()), k=1)[0]


class Command(BaseCommand):
    help = (
        "Seed realistic AttendanceRecord data for StudentProfile id=4. "
        "Active term: Weeks 1-5, one AT-RISK class. "
        "Past terms: full 15 weeks, NORMAL distribution."
    )

    def handle(self, *args, **options):
        # ── 1. Fetch the student ──────────────────────────────────────────────
        try:
            student = StudentProfile.objects.get(id=STUDENT_ID)
        except StudentProfile.DoesNotExist:
            raise CommandError(f"StudentProfile with id={STUDENT_ID} does not exist.")

        self.stdout.write(f"Student: {student}\n")

        records_to_create = []
        active_term_count = 0
        past_term_count   = 0

        # ═════════════════════════════════════════════════════════════════════
        # SECTION A — ACTIVE TERM
        # ═════════════════════════════════════════════════════════════════════
        self.stdout.write(self.style.HTTP_INFO("── Active Term ──────────────────────────────"))

        try:
            active_term = Term.objects.get(is_active=True)
        except Term.DoesNotExist:
            raise CommandError("No active term found. Set one Term.is_active = True.")
        except Term.MultipleObjectsReturned:
            raise CommandError("Multiple active terms found. Fix your data first.")

        self.stdout.write(f"Term: {active_term}")

        active_class_ids = list(
            Enrollment.objects
            .filter(student=student, course_class__term=active_term)
            .values_list("course_class_id", flat=True)
        )

        if not active_class_ids:
            self.stdout.write(self.style.WARNING("No enrollments found in the active term — skipping."))
        else:
            self.stdout.write(f"Enrolled in {len(active_class_ids)} course class(es).")

            # Delete stale active-term records
            deleted, _ = AttendanceRecord.objects.filter(
                student=student,
                session__course_class__term=active_term,
            ).delete()
            self.stdout.write(f"Deleted {deleted} stale active-term record(s).")

            # Pick the AT-RISK class
            at_risk_class_id = random.choice(active_class_ids)
            self.stdout.write(f"At-risk class id: {at_risk_class_id}")

            for class_id in active_class_ids:
                sessions = list(Session.objects.filter(course_class_id=class_id))

                if not sessions:
                    self.stdout.write(self.style.WARNING(f"  CourseClass {class_id} has no sessions — skipping."))
                    continue

                is_at_risk = (class_id == at_risk_class_id)
                weights    = AT_RISK_WEIGHTS if is_at_risk else NORMAL_WEIGHTS
                label      = "AT-RISK" if is_at_risk else "normal"
                count      = len(sessions) * CURRENT_WEEK

                self.stdout.write(
                    f"  CourseClass {class_id} [{label}]: "
                    f"{len(sessions)} session(s) × {CURRENT_WEEK} weeks = {count} records"
                )

                for week in range(1, CURRENT_WEEK + 1):
                    for session in sessions:
                        records_to_create.append(
                            AttendanceRecord(
                                student=student,
                                session=session,
                                week=week,
                                status=weighted_choice(weights),
                            )
                        )
                        active_term_count += 1

        # ═════════════════════════════════════════════════════════════════════
        # SECTION B — PAST TERMS
        # ═════════════════════════════════════════════════════════════════════
        self.stdout.write(self.style.HTTP_INFO("\n── Past Terms ───────────────────────────────"))

        past_class_ids = list(
            Enrollment.objects
            .filter(student=student, course_class__term__is_active=False)
            .values_list("course_class_id", flat=True)
        )

        if not past_class_ids:
            self.stdout.write(self.style.WARNING("No past-term enrollments found — skipping."))
        else:
            self.stdout.write(f"Found {len(past_class_ids)} past course class(es).")

            # Delete stale past-term records
            deleted, _ = AttendanceRecord.objects.filter(
                student=student,
                session__course_class__term__is_active=False,
            ).delete()
            self.stdout.write(f"Deleted {deleted} stale past-term record(s).")

            for class_id in past_class_ids:
                sessions = list(Session.objects.filter(course_class_id=class_id))

                if not sessions:
                    self.stdout.write(self.style.WARNING(f"  CourseClass {class_id} has no sessions — skipping."))
                    continue

                count = len(sessions) * TOTAL_WEEKS
                self.stdout.write(
                    f"  CourseClass {class_id} [normal]: "
                    f"{len(sessions)} session(s) × {TOTAL_WEEKS} weeks = {count} records"
                )

                for week in range(1, TOTAL_WEEKS + 1):
                    for session in sessions:
                        records_to_create.append(
                            AttendanceRecord(
                                student=student,
                                session=session,
                                week=week,
                                status=weighted_choice(NORMAL_WEIGHTS),
                            )
                        )
                        past_term_count += 1

        # ═════════════════════════════════════════════════════════════════════
        # SECTION C — SINGLE BULK INSERT
        # ═════════════════════════════════════════════════════════════════════
        if not records_to_create:
            self.stdout.write(self.style.WARNING("\nNothing to insert. Exiting."))
            return

        with transaction.atomic():
            AttendanceRecord.objects.bulk_create(records_to_create)

        self.stdout.write(self.style.SUCCESS(
            f"\nDone."
            f"\n  Active term records : {active_term_count}  (Weeks 1-{CURRENT_WEEK})"
            f"\n  Past term records   : {past_term_count}  (Weeks 1-{TOTAL_WEEKS})"
            f"\n  Total inserted      : {len(records_to_create)}"
        ))