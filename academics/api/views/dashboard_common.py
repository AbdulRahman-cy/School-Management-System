from django.db.models import Count

from records.models import Enrollment


def attach_enrolled_counts(classes: list) -> list:
    """
    Attaches `.enrolled_count` to each CourseClass in `classes` via one cheap
    `course_class_id IN (...)` aggregate, instead of annotating the main
    classes queryset with `Count("enrollments", filter=Q(status=ENROLLED))`.

    That annotate forces Postgres to LEFT JOIN the full Enrollment history
    (COMPLETED/DROPPED/WITHDRAWN rows included, ~6x the ENROLLED rows in this
    dataset) and GROUP BY every select_related column on CourseClass, turning
    a ~350-row dashboard query into an 80ms+ wide join+sort. Filtering
    Enrollment by status up front and grouping only by course_class_id here
    is what actually benefits from the partial index on
    Enrollment(course_class) WHERE status='ENROLLED'.
    """
    ids = [c.id for c in classes]
    counts = dict(
        Enrollment.objects
        .filter(status=Enrollment.EnrollmentStatus.ENROLLED, course_class_id__in=ids)
        .values("course_class_id")
        .order_by()
        .annotate(cnt=Count("id"))
        .values_list("course_class_id", "cnt")
    )
    for c in classes:
        c.enrolled_count = counts.get(c.id, 0)
    return classes
