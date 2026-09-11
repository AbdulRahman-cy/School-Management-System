from django.db import IntegrityError, transaction
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Count

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


class EnrollmentService:
    """Encapsulates the locking, validation, and write logic for student self-service enrollment."""

    def __init__(
        self,
        student,
        study_group: StudyGroup | None = None,
        course_class: CourseClass | None = None,
    ) -> None:
        if bool(study_group) == bool(course_class):  # both given, or neither given
            raise ValueError("Provide exactly one of study_group or course_class.")
        self.student = student
        self.study_group = study_group
        self.course_class = course_class

    def enroll(self) -> list[Enrollment]:
        with transaction.atomic():
            locked_classes = self._lock_target_classes()
            if not locked_classes and self.study_group:
                raise NoCourseClassesError(self.study_group)

            already_enrolled_ids = set(
                Enrollment.objects.filter(
                    student=self.student,
                    course_class_id__in=[cc.id for cc in locked_classes],
                    status=Enrollment.EnrollmentStatus.ENROLLED,
                ).values_list("course_class_id", flat=True)
            )

            to_create = [cc for cc in locked_classes if cc.id not in already_enrolled_ids]
            if not to_create:
                return []  # Already enrolled in all requested classes

            self._check_timetable_conflicts(to_create)
            self._check_capacity(to_create)

            sessions_by_class: dict[int, dict[str, Session]] = {}
            for session in Session.objects.filter(course_class__in=to_create):
                sessions_by_class.setdefault(session.course_class_id, {})[session.session_type] = session

            # bulk_create(ignore_conflicts=True) is deliberately NOT used here: Enrollment.save()
            # runs full_clean(), which enforces the "one group per course per term" business rule
            # and per-row error messages this service depends on (see EnrollmentValidationError
            # below). bulk_create() skips save()/full_clean() entirely, so switching would silently
            # drop that validation rather than make it faster in any way that matters here — the
            # capacity and conflict checks above are what remove the real per-row query cost.
            created: list[Enrollment] = []
            for cc in to_create:
                cc_sessions = sessions_by_class.get(cc.id, {})
                if not cc_sessions:
                    raise NotScheduledError(f"{cc.course.code} has not been scheduled yet.")

                enrollment = Enrollment(
                    student=self.student,
                    course_class=cc,
                    lecture_session=cc_sessions.get(Session.SessionType.LECTURE),
                    tutorial_session=cc_sessions.get(Session.SessionType.TUTORIAL),
                    lab_session=cc_sessions.get(Session.SessionType.LAB),
                )
                try:
                    enrollment.save()
                except DjangoValidationError as exc:
                    raise EnrollmentValidationError(exc.message_dict) from exc
                except IntegrityError as exc:
                    raise EnrollmentValidationError(
                        {"course_class": [f"Already enrolled in {cc.course.code}."]}
                    ) from exc
                created.append(enrollment)

        return created

    def unenroll(self) -> int:
        with transaction.atomic():
            if self.study_group:
                class_ids = list(
                    CourseClass.objects.filter(group=self.study_group).values_list("id", flat=True)
                )
                if not class_ids:
                    raise NoCourseClassesError(self.study_group)
            else:
                class_ids = [self.course_class.id]

            deleted_count, _ = Enrollment.objects.filter(
                student=self.student,
                course_class_id__in=class_ids,
                status=Enrollment.EnrollmentStatus.ENROLLED,
            ).delete()

            if deleted_count == 0:
                raise NotEnrolledError("You are not enrolled in the specified classes.")

            return deleted_count

    def _lock_target_classes(self) -> list[CourseClass]:
        """
        Row-lock the CourseClass rows this operation will read/write.

        Every writer takes these locks through this single ordered query
        (`order_by("id")` before `select_for_update()`), so two concurrent
        enrollments that both touch classes {3, 7} always acquire them in the
        same 3-then-7 order. Without that order_by, PostgreSQL returns rows in
        whatever order its plan produces (usually storage/heap order, not `id`
        order), so two transactions locking the same class set from different
        query plans could lock in opposite orders and deadlock. Locking the
        CourseClass row (rather than the Enrollment rows it doesn't have yet)
        also doubles as the concurrency guard for the capacity check below:
        a second transaction enrolling into the same class blocks here until
        this one commits, so the COUNT() it later reads can't race this one.
        """
        queryset = CourseClass.objects.select_related("course", "group")
        if self.study_group:
            filters = {"group": self.study_group}
        else:
            filters = {"id": self.course_class.id}
        return list(queryset.filter(**filters).order_by("id").select_for_update())

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

    @staticmethod
    def _check_capacity(to_create: list[CourseClass]) -> None:
        enrolled_counts = dict(
            Enrollment.objects.filter(
                course_class_id__in=[cc.id for cc in to_create],
                status=Enrollment.EnrollmentStatus.ENROLLED,
            )
            .values("course_class_id")
            .annotate(enrolled=Count("id"))
            .values_list("course_class_id", "enrolled")
        )

        for cc in to_create:
            if enrolled_counts.get(cc.id, 0) >= cc.capacity:
                raise CapacityExceededError(f"No seats remaining in {cc.course.code}.")
