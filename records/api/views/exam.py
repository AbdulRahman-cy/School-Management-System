from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend
from records.models import Exam, ExamResult
from records.api.serializers import ExamSerializer, ExamResultSerializer
from users.api.permissions import IsAdminOrReadOnly


class ExamViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    serializer_class = ExamSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["course_class", "exam_type"]

    def get_queryset(self):
        queryset = Exam.objects.select_related("course_class__course")

        term_status = self.request.query_params.get("term_status")
        student_id = self.request.query_params.get("student")

        if term_status == "active":
            queryset = queryset.filter(course_class__group__term__is_active=True)
        elif term_status == "past":
            queryset = queryset.filter(course_class__group__term__is_active=False)

        if student_id:
            queryset = queryset.filter(course_class__enrollments__student_id=student_id)

        return queryset


class ExamResultViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    serializer_class = ExamResultSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["student", "exam"]

    def get_queryset(self):
        return ExamResult.objects.select_related(
            "exam__course_class__course",
        )
