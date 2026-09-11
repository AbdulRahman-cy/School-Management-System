from django.db.models import Count
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response

from academics.models import CourseClass
from records.api.serializers import (
    AvailableStudyGroupSerializer,
    EnrollmentSerializer,
    EnrollRequestSerializer,
)
from records.api.serializers.LiveCapacitiesRequestSerializer import LiveCapacitiesRequestSerializer
from records.models import Enrollment
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
from users.api.permissions import IsStudent


class StudentEnrollmentViewSet(viewsets.GenericViewSet):
    """Student self-service enrollment endpoints."""

    permission_classes = [IsStudent]

    @staticmethod
    def _get_student(request: Request):
        """Returns the requesting user's StudentProfile, or None if they aren't a student."""
        return getattr(request.user, "student_profile", None)

    @action(detail=False, methods=["post"], url_path="enroll", permission_classes=[IsStudent])
    def enroll(self, request: Request) -> Response:
        student = self._get_student(request)
        if student is None:
            return Response({"detail": "Only students can perform this action."}, status=status.HTTP_403_FORBIDDEN)

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

    @action(detail=False, methods=["get"], url_path="available-groups", permission_classes=[IsStudent])
    def available_groups(self, request: Request) -> Response:
        student = self._get_student(request)
        if student is None:
            return Response({"detail": "Only students can perform this action."}, status=status.HTTP_403_FORBIDDEN)

        try:
            groups = get_eligible_study_groups(student)
        except GraduatedError:
            return Response(
                {"detail": "Congratulations — you've completed your program.", "graduated": True},
                status=status.HTTP_200_OK,
            )

        return Response(AvailableStudyGroupSerializer(groups, many=True).data)

    @action(detail=False, methods=["get"], url_path="live-capacities", permission_classes=[IsStudent])
    def live_capacities(self, request: Request) -> Response:
        student = self._get_student(request)
        if student is None:
            return Response({"detail": "Only students can perform this action."}, status=status.HTTP_403_FORBIDDEN)

        serializer = LiveCapacitiesRequestSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        requested_ids = set(serializer.validated_data["class_ids"])

        # Single query does double duty: it both enforces the discipline/active-term
        # access check and fetches the capacity values, instead of a separate
        # membership query followed by a second fetch for the same rows.
        classes = list(
            CourseClass.objects.filter(
                id__in=requested_ids,
                group__discipline_id=student.discipline_id,
                group__term__is_active=True,
            ).values("id", "capacity")
        )
        allowed_ids = [cc["id"] for cc in classes]

        taken_map = dict(
            Enrollment.objects.filter(course_class_id__in=allowed_ids, status=Enrollment.EnrollmentStatus.ENROLLED)
            .values("course_class_id")
            .annotate(taken=Count("student", distinct=True))
            .values_list("course_class_id", "taken")
        )

        return Response(
            {
                cc["id"]: {
                    "capacity": cc["capacity"],
                    "remaining": max(cc["capacity"] - taken_map.get(cc["id"], 0), 0),
                }
                for cc in classes
            }
        )

    @action(detail=False, methods=["post"], url_path="unenroll", permission_classes=[IsStudent])
    def unenroll(self, request: Request) -> Response:
        student = self._get_student(request)
        if student is None:
            return Response({"detail": "Only students can perform this action."}, status=status.HTTP_403_FORBIDDEN)

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
