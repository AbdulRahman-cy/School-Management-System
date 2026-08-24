# records/services/eligibility.py

from django.db.models import Count

from academics.models import CourseClass, StudyGroup, Term
from records.models import Enrollment
from scheduling.models import Session
from .exceptions import GraduatedError


def get_eligible_study_groups(student) -> list[dict]:
    """
    Study groups the given student may enroll in right now: active term,
    same discipline as the student, year_level derived from enrollment_year
    against the active term's start_date. Returns [] if there's no active
    term or the student has no discipline assigned yet. Raises
    GraduatedError if the computed year_level exceeds 4.
    """
    active_term = Term.objects.filter(is_active=True).first()
    if active_term is None or student.discipline_id is None:
        return []

    year_level = active_term.start_date.year - student.enrollment_year + 1
    if year_level > 4:
        raise GraduatedError(year_level)
    year_level = max(year_level, 1)

    groups = list(
        StudyGroup.objects
        .filter(discipline=student.discipline, term=active_term, year_level=year_level)
        .order_by("number")
    )
    if not groups:
        return []
    group_ids = [g.id for g in groups]

    course_classes = (
        CourseClass.objects
        .filter(group_id__in=group_ids)
        .select_related("course", "coordinator__user")
        .order_by("course__code")
    )
    classes_by_group: dict[int, list[CourseClass]] = {}
    for cc in course_classes:
        classes_by_group.setdefault(cc.group_id, []).append(cc)

    sessions_by_class: dict[int, dict[str, Session]] = {}
    for s in Session.objects.filter(course_class__group_id__in=group_ids).select_related("timeslot", "room"):
        sessions_by_class.setdefault(s.course_class_id, {})[s.session_type] = s

    # Same convention as academics' cohorts action: a group counts as
    # scheduled if ANY of its course_classes has at least one Session row.
    scheduled_class_ids = set(
        Session.objects.filter(course_class__group_id__in=group_ids)
        .values_list("course_class_id", flat=True).distinct()
    )

    is_member_of = set(
        Enrollment.objects.filter(
            student=student,
            course_class__group_id__in=group_ids,
            status=Enrollment.EnrollmentStatus.ENROLLED,
        ).values_list("course_class__group_id", flat=True)
    )

    # Same "distinct student, scoped to group" formula as EnrollmentService —
    # single grouped query instead of one COUNT per group.
    taken_by_group = {
        row["course_class__group_id"]: row["taken"]
        for row in (
            Enrollment.objects
            .filter(course_class__group_id__in=group_ids, status=Enrollment.EnrollmentStatus.ENROLLED)
            .values("course_class__group_id")
            .annotate(taken=Count("student", distinct=True))
        )
    }

    return [
        {
            "id": group.id,
            "number": group.number,
            "capacity": group.capacity,
            "remaining": max(group.capacity - taken_by_group.get(group.id, 0), 0),
            "is_member": group.id in is_member_of,
            "is_scheduled": any(
                cc.id in scheduled_class_ids for cc in classes_by_group.get(group.id, [])
            ),
            "course_classes": [
                _serialize_course_class(cc, sessions_by_class.get(cc.id, {}))
                for cc in classes_by_group.get(group.id, [])
            ],
        }
        for group in groups
    ]


def _serialize_course_class(cc: CourseClass, sessions: dict) -> dict:
    def _session(s):
        if s is None:
            return None
        return {
            "id": s.id,
            "day": s.timeslot.get_day_display(),
            "period": s.timeslot.get_period_display(),
            "room_code": s.room.code,
            "room_name": s.room.name,
        }

    return {
        "id": cc.id,
        "course_code": cc.course.code,
        "course_title": cc.course.title,
        "coordinator_name": cc.coordinator.user.full_name if cc.coordinator_id else None,
        "lecture": _session(sessions.get(Session.SessionType.LECTURE)),
        "tutorial": _session(sessions.get(Session.SessionType.TUTORIAL)),
        "lab": _session(sessions.get(Session.SessionType.LAB)),
    }