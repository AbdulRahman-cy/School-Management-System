from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend
from records.models import AttendanceRecord
from records.api.serializers import AttendanceRecordSerializer
from users.api.permissions import IsAdminOrReadOnly


class AttendanceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    serializer_class = AttendanceRecordSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["student", "session"]

    def get_queryset(self):
        queryset = AttendanceRecord.objects.select_related(
            "session__course_class__course",
        )

        term_status = self.request.query_params.get("term_status")
        student_id = self.request.query_params.get("student")

        if term_status == "active":
            queryset = queryset.filter(session__course_class__group__term__is_active=True)
        elif term_status == "past":
            queryset = queryset.filter(session__course_class__group__term__is_active=False)

        if student_id:
            queryset = queryset.filter(student_id=student_id)

        return queryset
