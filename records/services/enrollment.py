from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction

from academics.models import CourseClass, StudyGroup
from records.models import Enrollment
from scheduling.models import Session
from .exceptions import CapacityExceededError, EnrollmentValidationError, NoCourseClassesError


class EnrollmentService:
    """
    Enrolls a student into a StudyGroup. Enrollment stays keyed on
    CourseClass (model unchanged) — joining a group creates one Enrollment
    row per CourseClass under that group. Capacity is derived from
    Enrollment via a distinct-student count scoped to the group. This ties
    Enrollment (a per-course row) to group-level business logic — known
    shortcut, membership table is the real fix, deferred for now.
    """

    def __init__(self, student, study_group: StudyGroup):
        self.student = student
        self.study_group = study_group

    def enroll(self) -> list[Enrollment]:
        with transaction.atomic():
            study_group = (
                StudyGroup.objects
                .select_for_update()
                .get(pk=self.study_group.pk)
            )

            course_classes = list(
                CourseClass.objects.filter(group=study_group).select_related("course")
            )
            if not course_classes:
                raise NoCourseClassesError(study_group)
            if not Session.objects.filter(course_class__in=course_classes).exists():
                raise NotScheduledError(study_group)
            already_enrolled_ids = set(
                Enrollment.objects.filter(
                    student=self.student,
                    course_class__group=study_group,
                    status=Enrollment.EnrollmentStatus.ENROLLED,
                ).values_list("course_class_id", flat=True)
            )
            is_new_member = not already_enrolled_ids

            if is_new_member:
                current_count = (
                    Enrollment.objects
                    .filter(
                        course_class__group=study_group,
                        status=Enrollment.EnrollmentStatus.ENROLLED,
                    )
                    .values("student")
                    .distinct()
                    .count()
                )
                if current_count >= study_group.capacity:
                    raise CapacityExceededError(study_group)

            # Only create rows for classes the student doesn't already hold —
            # makes a repeat call (e.g. a group gaining a course later) safe
            # to re-run instead of erroring on the ones already in place.
            to_create = [cc for cc in course_classes if cc.id not in already_enrolled_ids]

            sessions_by_class: dict[int, dict[str, Session]] = {}
            for s in Session.objects.filter(course_class__in=to_create):
                sessions_by_class.setdefault(s.course_class_id, {})[s.session_type] = s

            created = []
            for cc in to_create:
                cc_sessions = sessions_by_class.get(cc.id, {})
                enrollment = Enrollment(
                    student=self.student,
                    course_class=cc,
                    lecture_session=cc_sessions.get(Session.SessionType.LECTURE),
                    tutorial_session=cc_sessions.get(Session.SessionType.TUTORIAL),
                    lab_session=cc_sessions.get(Session.SessionType.LAB),
                )
                try:
                    enrollment.save()  # full_clean() runs inside save()
                except DjangoValidationError as exc:
                    raise EnrollmentValidationError(exc.message_dict) from exc
                except IntegrityError as exc:
                    constraint = getattr(getattr(exc.__cause__, 'diag', None), 'constraint_name', None)
                    if constraint == 'unique_student_enrollment':
                        raise EnrollmentValidationError(
                            {"course_class": [f"Already enrolled in {cc.course.code}."]}
                        ) from exc
                    raise
                created.append(enrollment)

        return created