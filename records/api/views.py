from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter
from users.api.permissions import IsAdminOrReadOnly, IsStudent
from records.models import Enrollment, GradeEntry, AttendanceRecord, Exam, ExamResult, Assignment, StudentSubmission
from .serializers import (
    EnrollmentSerializer, GradeEntrySerializer, AttendanceRecordSerializer, ExamSerializer,
    ExamResultSerializer, AssignmentSerializer, StudentSubmissionSerializer,
    DashboardEnrollmentSerializer, DashboardFilterSerializer,
    EnrollRequestSerializer, AvailableStudyGroupSerializer,
)
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from records.services.enrollment import EnrollmentService
from records.services.exceptions import (
    CapacityExceededError, EnrollmentValidationError, NoCourseClassesError, NotScheduledError,
)
from records.services.eligibility import get_eligible_study_groups
from records.services.exceptions import GraduatedError


class EnrollmentViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows Enrollments to be viewed or edited.
    """
    permission_classes = [IsAdminOrReadOnly]
    serializer_class = EnrollmentSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]

    filterset_fields = ['student', 'course_class']
    ordering_fields = ['created_at']

    def get_queryset(self):
        queryset = Enrollment.objects.select_related(
            'student',
            'course_class'
        ).prefetch_related(
            'grades'
        )

        term_status = self.request.query_params.get('term_status')

        if term_status == 'past':
            queryset = queryset.filter(course_class__group__term__is_active=False)
        elif term_status == 'all':
            pass
        else:
            queryset = queryset.filter(course_class__group__term__is_active=True)

        return queryset

    @action(detail=False, methods=['get'], url_path='dashboard-summary')
    def dashboard_summary(self, request):
        param_serializer = DashboardFilterSerializer(data=request.query_params)
        param_serializer.is_valid(raise_exception=True)

        student_id = param_serializer.validated_data['student']
        term_status = param_serializer.validated_data.get('term_status')

        queryset = Enrollment.objects.filter(
            student_id=student_id
        ).select_related(
            'student',
            'course_class__course'
        )

        if term_status == 'past':
            queryset = queryset.filter(course_class__group__term__is_active=False)
        elif term_status == 'all':
            pass
        else:
            queryset = queryset.filter(course_class__group__term__is_active=True)

        serializer = DashboardEnrollmentSerializer(queryset, many=True)
        return Response(serializer.data)

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


class GradeEntryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    serializer_class = GradeEntrySerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['enrollment']
    ordering_fields = ['created_at', 'score']

    def get_queryset(self):
        return GradeEntry.objects.all().select_related('enrollment')


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


class ExamResultViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    serializer_class = ExamResultSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["student", "exam"]

    def get_queryset(self):
        return ExamResult.objects.select_related(
            "exam__course_class__course",
        )


class StudentSubmissionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsStudent]
    serializer_class = StudentSubmissionSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["student", "assignment"]

    def get_queryset(self):
        return StudentSubmission.objects.select_related(
            "assignment__course_class__course",
        )