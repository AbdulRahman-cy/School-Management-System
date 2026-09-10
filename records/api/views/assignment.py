from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend
from records.models import Assignment
from records.api.serializers import AssignmentSerializer
from users.api.permissions import IsAdminOrReadOnly


class AssignmentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    serializer_class = AssignmentSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["course_class", "assignment_type"]

    def get_queryset(self):
        queryset = Assignment.objects.select_related("course_class__course")

        term_status = self.request.query_params.get("term_status")
        student_id = self.request.query_params.get("student")

        if term_status == "active":
            queryset = queryset.filter(course_class__group__term__is_active=True)
        elif term_status == "past":
            queryset = queryset.filter(course_class__group__term__is_active=False)

        if student_id:
            queryset = queryset.filter(course_class__enrollments__student_id=student_id)

        return queryset
