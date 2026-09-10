from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from records.models import Enrollment
from records.api.serializers import (
    EnrollmentSerializer,
    EnrollRequestSerializer,
    AvailableStudyGroupSerializer,
)
from users.api.permissions import IsStudent
from records.services.enrollment import EnrollmentService
from records.services.exceptions import (
    CapacityExceededError, EnrollmentValidationError, NoCourseClassesError, NotScheduledError,
)
from records.services.eligibility import get_eligible_study_groups
from records.services.exceptions import GraduatedError


class StudentEnrollmentViewSet(viewsets.GenericViewSet):
    """
    Student self-service enrollment endpoints.
    """
    permission_classes = [IsStudent]

    @action(detail=False, methods=["post"], url_path="enroll", permission_classes=[IsStudent])
    def enroll(self, request):
        student = getattr(request.user, "student_profile", None)
        if student is None:
            return Response({"detail": "Only students can perform this action."}, status=status.HTTP_403_FORBIDDEN)

        serializer = EnrollRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        study_group = serializer.validated_data["study_group"]

        try:
            enrollments = EnrollmentService(student=student, study_group=study_group).enroll()
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
    def available_groups(self, request):
        student = getattr(request.user, "student_profile", None)
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
