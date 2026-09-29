from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend
from records.models import Assignment
from records.api.serializers import AssignmentSerializer
from users.api.permissions import IsAdminOrReadOnly
from users.api.scoping import RoleScopedQuerysetMixin


class AssignmentViewSet(RoleScopedQuerysetMixin, viewsets.ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    serializer_class = AssignmentSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["course_class", "assignment_type"]
    student_owner_lookup = "course_class__enrollments__student__user_id"
    admin_student_lookup = "course_class__enrollments__student_id"

    def get_base_queryset(self):
        queryset = Assignment.objects.select_related("course_class__course")

        term_status = self.request.query_params.get("term_status")

        if term_status == "active":
            queryset = queryset.filter(course_class__group__term__is_active=True)
        elif term_status == "past":
            queryset = queryset.filter(course_class__group__term__is_active=False)

        return queryset
