from rest_framework.response import Response
from rest_framework.views import APIView

from academics.models import CourseClass
from academics.api.serializers.admin_dashboard import (
    AdminDashboardStatsSerializer,
    AdminDashboardClassRowSerializer,
)
from academics.api.views.dashboard_common import attach_enrolled_counts
from records.models import Enrollment
from scheduling.models import Session
from users.api.permissions import IsAdmin


class AdminDashboardView(APIView):
    """
    Global metrics for the active term, used by the Admin Dashboard landing
    view. Everything here is DB-aggregated — no per-row queries — to avoid
    N+1s against CourseClass/Session/Enrollment.
    """
    permission_classes = [IsAdmin]

    def get(self, request):
        classes = list(
            CourseClass.objects
            .filter(group__term__is_active=True)
            .select_related("course", "group__discipline", "group__term")
            .order_by("course__code", "group__number")
        )
        class_ids = [c.id for c in classes]

        total_active_classes = len(classes)
        total_scheduled_sessions = Session.objects.filter(
            course_class_id__in=class_ids
        ).count()
        total_enrolled_students = (
            Enrollment.objects
            .filter(status=Enrollment.EnrollmentStatus.ENROLLED, course_class_id__in=class_ids)
            .values("student_id")
            .distinct()
            .count()
        )

        stats = AdminDashboardStatsSerializer({
            "total_active_classes": total_active_classes,
            "total_scheduled_sessions": total_scheduled_sessions,
            "total_enrolled_students": total_enrolled_students,
        }).data

        attach_enrolled_counts(classes)
        class_rows = AdminDashboardClassRowSerializer(classes, many=True).data

        return Response({"stats": stats, "classes": class_rows})
