import time
import logging

from django.db import IntegrityError, connection, transaction
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import F

from academics.models import CourseClass, StudyGroup
from records.models import Enrollment
from scheduling.models import Session
from .exceptions import (
    CapacityExceededError,
    EnrollmentValidationError,
    NoCourseClassesError,
    NotEnrolledError,
    NotScheduledError,
    TimetableConflictError,
)

logger = logging.getLogger(__name__)


class EnrollmentService:
    """Encapsulates the validation and write logic for student self-service enrollment."""

    def __init__(
        self,
        student,
        study_group: StudyGroup | None = None,
        course_class: CourseClass | None = None,
    ) -> None:
        if bool(study_group) == bool(course_class):
            raise ValueError("Provide exactly one of study_group or course_class.")
        self.student = student
        self.study_group = study_group
        self.course_class = course_class

    def enroll(self) -> list[Enrollment]:
        start = time.monotonic()

        # ── Phase 1: read-only checks, no lock, no reservation ──────────────
        target_classes = self._get_target_classes()
        if not target_classes and self.study_group:
            raise NoCourseClassesError(self.study_group)

        already_enrolled_ids = set(
            Enrollment.objects.filter(
                student=self.student,
                course_class_id__in=[cc.id for cc in target_classes],
                status=Enrollment.EnrollmentStatus.ENROLLED,
            ).values_list("course_class_id", flat=True)
        )

        to_create = [cc for cc in target_classes if cc.id not in already_enrolled_ids]
        if not to_create:
            return []

        self._check_timetable_conflicts(to_create)
        self._check_duplicate_courses(to_create)

        sessions_by_class: dict[int, dict[str, Session]] = {}
        for session in Session.objects.filter(course_class__in=to_create):
            sessions_by_class.setdefault(session.course_class_id, {})[session.session_type] = session

        for cc in to_create:
            if not sessions_by_class.get(cc.id):
                raise NotScheduledError(f"{cc.course.code} has not been scheduled yet.")

        pre_lock_duration = time.monotonic() - start

        # ── Phase 2: one atomic reserve statement, no select_for_update ─────
        lock_start = time.monotonic()
        with transaction.atomic():
            reserved_ids = set(self._reserve_seats(to_create))
            failed = [cc for cc in to_create if cc.id not in reserved_ids]
            if failed:
                # atomic() rolls back the successful reservations above too
                raise CapacityExceededError(
                    f"No seats remaining in {', '.join(cc.course.code for cc in failed)}."
                )

            created: list[Enrollment] = []
            for cc in to_create:
                cc_sessions = sessions_by_class[cc.id]
                enrollment = Enrollment(
                    student=self.student,
                    course_class=cc,
                    lecture_session=cc_sessions.get(Session.SessionType.LECTURE),
                    tutorial_session=cc_sessions.get(Session.SessionType.TUTORIAL),
                    lab_session=cc_sessions.get(Session.SessionType.LAB),
                )
                try:
                    enrollment.save(skip_duplicate_check=True)
                except DjangoValidationError as exc:
                    raise EnrollmentValidationError(exc.message_dict) from exc
                except IntegrityError as exc:
                    raise EnrollmentValidationError(
                        {"course_class": [f"Already enrolled in {cc.course.code}."]}
                    ) from exc
                created.append(enrollment)

        lock_duration = time.monotonic() - lock_start
        total_duration = time.monotonic() - start

        logger.info(
            "\033[92menroll: total=%.3fs pre_lock=%.3fs reserve_and_write=%.3fs\033[0m",
            total_duration, pre_lock_duration, lock_duration,
        )

        return created

    def unenroll(self) -> int:
        start = time.monotonic()

        with transaction.atomic():
            if self.study_group:
                class_ids = list(
                    CourseClass.objects.filter(group=self.study_group).values_list("id", flat=True)
                )
                if not class_ids:
                    raise NoCourseClassesError(self.study_group)
            else:
                class_ids = [self.course_class.id]

            deleted_qs = Enrollment.objects.filter(
                student=self.student,
                course_class_id__in=class_ids,
                status=Enrollment.EnrollmentStatus.ENROLLED,
            )
            # Capture before delete() — delete() only returns a count, not rows.
            released_ids = list(deleted_qs.values_list("course_class_id", flat=True))
            deleted_count, _ = deleted_qs.delete()

            if deleted_count == 0:
                raise NotEnrolledError("You are not enrolled in the specified classes.")

            CourseClass.objects.filter(id__in=released_ids).update(seats_taken=F("seats_taken") - 1)

        duration = time.monotonic() - start
        logger.info("unenroll transaction took %.3fs", duration)

        return deleted_count

    def _get_target_classes(self) -> list[CourseClass]:
        queryset = CourseClass.objects.select_related("course", "group")
        filters = {"group": self.study_group} if self.study_group else {"id": self.course_class.id}
        return list(queryset.filter(**filters).order_by("id"))

    def _reserve_seats(self, to_create: list[CourseClass]) -> list[int]:
        """
        One atomic statement reserves seats for every class in to_create at once.
        Postgres takes/releases the row lock internally, only for this single
        UPDATE — not for our whole transaction. Replaces select_for_update()
        + COUNT() + compare entirely.
        """
        ids = [cc.id for cc in to_create]
        with connection.cursor() as cur:
            cur.execute(
                """
                UPDATE academics_courseclass
                SET seats_taken = seats_taken + 1
                WHERE id = ANY(%s) AND seats_taken < capacity
                RETURNING id
                """,
                [ids],
            )
            return [row[0] for row in cur.fetchall()]

    def _check_timetable_conflicts(self, to_create: list[CourseClass]) -> None:
        target_term_ids = {cc.group.term_id for cc in to_create if cc.group_id}

        target_sessions = list(
            Session.objects.filter(course_class__in=to_create).select_related("course_class__course", "timeslot")
        )
        if not target_sessions or not target_term_ids:
            return

        existing_sessions = (
            Session.objects.filter(
                course_class__enrollments__student=self.student,
                course_class__enrollments__status=Enrollment.EnrollmentStatus.ENROLLED,
                course_class__group__term_id__in=target_term_ids,
            )
            .select_related("course_class__course", "timeslot")
            .distinct()
        )

        occupied_slots: dict[tuple[int, int], Session] = {
            (session.timeslot.day, session.timeslot.period): session for session in existing_sessions
        }

        for session in target_sessions:
            slot_key = (session.timeslot.day, session.timeslot.period)
            conflicting = occupied_slots.get(slot_key)
            if conflicting is None:
                occupied_slots[slot_key] = session
                continue
            if session.course_class_id == conflicting.course_class_id:
                continue
            raise TimetableConflictError(
                f"Cannot enroll: {session.course_class.course.code} {session.get_session_type_display()} "
                f"overlaps with {conflicting.course_class.course.code} {conflicting.get_session_type_display()} "
                f"on {session.timeslot.get_day_display()}s at {session.timeslot.get_period_display()}."
            )

    def _check_duplicate_courses(self, to_create: list[CourseClass]) -> None:
        course_ids = [cc.course_id for cc in to_create]
        term_ids = [cc.group.term_id for cc in to_create]

        existing_pairs = set(
            Enrollment.objects.filter(
                student=self.student,
                status=Enrollment.EnrollmentStatus.ENROLLED,
                course_class__course_id__in=course_ids,
                course_class__group__term_id__in=term_ids,
            ).values_list("course_class__course_id", "course_class__group__term_id")
        )

        conflicts = [cc for cc in to_create if (cc.course_id, cc.group.term_id) in existing_pairs]
        if conflicts:
            raise EnrollmentValidationError({
                "course_class": [
                    f"Already enrolled in {cc.course.code} for this term." for cc in conflicts
                ]
            })