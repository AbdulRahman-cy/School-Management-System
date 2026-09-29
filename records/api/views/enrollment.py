from rest_framework import status, viewsets
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter
from rest_framework.decorators import action
from rest_framework.response import Response
from records.models import Enrollment
from records.api.serializers import (
    EnrollmentSerializer,
    DashboardEnrollmentSerializer,
    DashboardFilterSerializer,
)
from users.api.permissions import IsAdminOrReadOnly
from users.api.scoping import RoleScopedQuerysetMixin


class EnrollmentViewSet(RoleScopedQuerysetMixin, viewsets.ModelViewSet):
    """
    API endpoint that allows Enrollments to be viewed or edited.
    """
    permission_classes = [IsAdminOrReadOnly]
    serializer_class = EnrollmentSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]

    filterset_fields = ['student', 'course_class']
    ordering_fields = ['created_at']

    student_owner_lookup = "student__user_id"
    # Admin ?student= filtering is handled by DjangoFilterBackend (filterset_fields).

    def get_base_queryset(self):
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

        user = request.user
        if user.role == "STUDENT":
            student_profile = getattr(user, "student_profile", None)
            if student_profile is None or student_profile.id != student_id:
                return Response(
                    {"detail": "You do not have permission to view this student's enrollments."},
                    status=status.HTTP_403_FORBIDDEN,
                )
        elif user.role != "ADMIN":
            return Response(
                {"detail": "You do not have permission to perform this action."},
                status=status.HTTP_403_FORBIDDEN,
            )

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
