from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter
from .permissions import IsAdminOrReadOnly
from records.models import Enrollment, GradeEntry, AttendanceRecord
from .serializers import EnrollmentSerializer, GradeEntrySerializer, AttendanceRecordSerializer

class EnrollmentViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows Enrollments to be viewed or edited.
    """
    serializer_class = EnrollmentSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    
    # Allows fetching /api/enrollments/?student=5 or ?course_class=12
    filterset_fields = ['student', 'course_class']
    ordering_fields = ['created_at']


    def get_queryset(self):
        # Optimization: prefetch 'grades' because the serializer nests them.
        # select_related for foreign keys to avoid massive query bloat.
        return Enrollment.objects.all().select_related(
            'student', 
            'course_class'
        ).prefetch_related(
            'grades'
        )


class GradeEntryViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows Grade Entries to be viewed or edited.
    """
    serializer_class = GradeEntrySerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    
    # Allows fetching /api/grades/?enrollment=3
    filterset_fields = ['enrollment']
    ordering_fields = ['created_at', 'score']


    def get_queryset(self):
        return GradeEntry.objects.all().select_related('enrollment')
    
class AttendanceViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceRecordSerializer

    def get_queryset(self):
        qs = AttendanceRecord.objects.select_related(
            "session__course_class__course",  # for code, title
            "session__timeslot",              # for day/period display
            "student__user",                  # if you ever need the name
        )
        student_id = self.request.query_params.get("student")
        if student_id:
            qs = qs.filter(student_id=student_id)
        return qs