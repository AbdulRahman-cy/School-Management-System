from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend
from records.models import AttendanceRecord
from records.api.serializers import AttendanceRecordSerializer
from users.api.permissions import IsAdminOrReadOnly
from users.api.scoping import RoleScopedQuerysetMixin


class AttendanceViewSet(RoleScopedQuerysetMixin, viewsets.ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    serializer_class = AttendanceRecordSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["student", "session"]
    student_owner_lookup = "student__user_id"
    admin_student_lookup = "student_id"

    def get_base_queryset(self):
        queryset = AttendanceRecord.objects.select_related(
            "session__course_class__course",
        )

        term_status = self.request.query_params.get("term_status")

        if term_status == "active":
            queryset = queryset.filter(session__course_class__group__term__is_active=True)
        elif term_status == "past":
            queryset = queryset.filter(session__course_class__group__term__is_active=False)

        return queryset
