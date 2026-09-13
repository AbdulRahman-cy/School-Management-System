from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response

from records.api.serializers import (
    AvailableStudyGroupSerializer,
    EnrollmentSerializer,
    EnrollRequestSerializer,
)
from records.services.eligibility import get_eligible_study_groups
from records.services.enrollment import EnrollmentService
from records.services.exceptions import (
    CapacityExceededError,
    EnrollmentValidationError,
    GraduatedError,
    NoCourseClassesError,
    NotEnrolledError,
    NotScheduledError,
    TimetableConflictError,
)
from users.api.permissions import IsAdmin
from users.models import StudentProfile


class AdminEnrollmentViewSet(viewsets.GenericViewSet):
    """Admin enrollment-management endpoints — acts on an arbitrary student on their behalf."""

    permission_classes = [IsAdmin]

    @staticmethod
    def _get_target_student(raw_student_id):
        """Resolves a student_id from request data/query params to a StudentProfile.

        Returns (student, None) on success or (None, error_response) on failure. The
        int() cast has to happen before get_object_or_404 — that helper only catches
        DoesNotExist, so a non-numeric pk passed straight to .get() would raise an
        uncaught ValueError instead of a clean 404/400.
        """
        try:
            student_id = int(raw_student_id)
        except (TypeError, ValueError):
            return None, Response(
                {"detail": "student_id is required and must be an integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return get_object_or_404(StudentProfile, pk=student_id), None

    @action(detail=False, methods=["get"], url_path="available-groups")
    def available_groups(self, request: Request) -> Response:
        student, error = self._get_target_student(request.query_params.get("student_id"))
        if error:
            return error

        try:
            groups = get_eligible_study_groups(student)
        except GraduatedError:
            return Response(
                {"detail": "Congratulations — you've completed your program.", "graduated": True},
                status=status.HTTP_200_OK,
            )

        return Response(AvailableStudyGroupSerializer(groups, many=True).data)

    @action(detail=False, methods=["post"], url_path="enroll")
    def enroll(self, request: Request) -> Response:
        student, error = self._get_target_student(request.data.get("student_id"))
        if error:
            return error

        serializer = EnrollRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        study_group = serializer.validated_data.get("study_group")
        course_class = serializer.validated_data.get("course_class")

        try:
            enrollments = EnrollmentService(
                student=student,
                study_group=study_group,
                course_class=course_class,
            ).enroll()
        except TimetableConflictError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)
        except CapacityExceededError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)
        except NotScheduledError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except NoCourseClassesError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except EnrollmentValidationError as exc:
            return Response(exc.errors, status=status.HTTP_400_BAD_REQUEST)

        if not enrollments:
            return Response(
                {"detail": "Already enrolled in every class in this study group."},
                status=status.HTTP_200_OK,
            )

        return Response(EnrollmentSerializer(enrollments, many=True).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], url_path="unenroll")
    def unenroll(self, request: Request) -> Response:
        student, error = self._get_target_student(request.data.get("student_id"))
        if error:
            return error

        serializer = EnrollRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        study_group = serializer.validated_data.get("study_group")
        course_class = serializer.validated_data.get("course_class")

        try:
            deleted_count = EnrollmentService(
                student=student,
                study_group=study_group,
                course_class=course_class,
            ).unenroll()
        except (NotEnrolledError, NoCourseClassesError) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                "detail": f"Successfully unenrolled from {deleted_count} class(es).",
                "deleted_count": deleted_count,
            },
            status=status.HTTP_200_OK,
        )
