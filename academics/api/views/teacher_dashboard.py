from rest_framework.response import Response
from rest_framework.views import APIView

from academics.models import CourseClass
from academics.api.serializers.dashboard_common import DashboardStatsSerializer
from academics.api.serializers.teacher_dashboard import TeacherDashboardClassRowSerializer
from academics.api.views.dashboard_common import attach_enrolled_counts
from records.models import Enrollment
from scheduling.models import Session
from users.api.permissions import IsTeacher


class TeacherDashboardView(APIView):
    """
    Active-term metrics for the Teacher Dashboard landing view, scoped to the
    requesting user's own coordinated classes. Mirrors AdminDashboardView but
    filtered by `coordinator` instead of aggregating globally.
    """
    permission_classes = [IsTeacher]

    def get(self, request):
        teacher_profile = request.user.teacher_profile

        classes = list(
            CourseClass.objects
            .filter(coordinator=teacher_profile, group__term__is_active=True)
            .select_related("course", "group__discipline", "group__term")
            .prefetch_related("sessions__room", "sessions__timeslot")
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

        stats = DashboardStatsSerializer({
            "total_active_classes": total_active_classes,
            "total_scheduled_sessions": total_scheduled_sessions,
            "total_enrolled_students": total_enrolled_students,
        }).data

        attach_enrolled_counts(classes)
        class_rows = TeacherDashboardClassRowSerializer(classes, many=True).data

        return Response({"stats": stats, "classes": class_rows})
