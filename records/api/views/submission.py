from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from records.models import StudentSubmission
from records.api.serializers import StudentSubmissionSerializer, StudentSubmissionGradeSerializer
from users.api.permissions import IsAdmin, IsStudent
from users.api.scoping import RoleScopedQuerysetMixin


class StudentSubmissionViewSet(RoleScopedQuerysetMixin, viewsets.ModelViewSet):
    permission_classes = [IsStudent | IsAdmin]
    serializer_class = StudentSubmissionSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["student", "assignment"]
    student_owner_lookup = "student__user_id"

    def get_base_queryset(self):
        return StudentSubmission.objects.select_related(
            "assignment__course_class__course",
        )

    def perform_create(self, serializer):
        # Ownership always comes from the authenticated user, never the payload.
        student_profile = getattr(self.request.user, "student_profile", None)
        if student_profile is None:
            raise PermissionDenied("Only students can create submissions.")
        self._save(serializer, student=student_profile)

    def perform_update(self, serializer):
        self._save(serializer)

    @action(detail=True, methods=["patch"], permission_classes=[IsAdmin])
    def grade(self, request, pk=None):
        # score is read-only on the main serializer so students can't set it;
        # grading goes through this dedicated admin-only endpoint instead.
        submission = self.get_object()
        serializer = StudentSubmissionGradeSerializer(submission, data=request.data)
        serializer.is_valid(raise_exception=True)
        self._save(serializer)
        return Response(StudentSubmissionSerializer(submission).data)

    @staticmethod
    def _save(serializer, **kwargs):
        # StudentSubmission.save() runs full_clean() (enrollment check, unique
        # constraint); surface those as 400s instead of unhandled 500s.
        try:
            serializer.save(**kwargs)
        except DjangoValidationError as exc:
            raise ValidationError(exc.messages)
