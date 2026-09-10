from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend
from records.models import StudentSubmission
from records.api.serializers import StudentSubmissionSerializer
from users.api.permissions import IsStudent


class StudentSubmissionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsStudent]
    serializer_class = StudentSubmissionSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["student", "assignment"]

    def get_queryset(self):
        return StudentSubmission.objects.select_related(
            "assignment__course_class__course",
        )
