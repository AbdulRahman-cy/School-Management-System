from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter
from .permissions import IsAdminOrReadOnly
from records.models import Enrollment, GradeEntry, AttendanceRecord, Exam, ExamResult, Assignment, StudentSubmission
from .serializers import EnrollmentSerializer, GradeEntrySerializer, AttendanceRecordSerializer, ExamSerializer, ExamResultSerializer, AssignmentSerializer, StudentSubmissionSerializer

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
    

class AttendanceViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceRecordSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["student", "session"]

    def get_queryset(self):
        return AttendanceRecord.objects.select_related(
            "session__course_class__course",
        )

class ExamViewSet(viewsets.ModelViewSet):
    serializer_class = ExamSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["course_class", "exam_type"]

    def get_queryset(self):
        return Exam.objects.select_related("course_class__course")

class ExamResultViewSet(viewsets.ModelViewSet):
    serializer_class = ExamResultSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["student", "exam"]

    def get_queryset(self):
        return ExamResult.objects.select_related(
            "exam__course_class__course",
        )

class AssignmentViewSet(viewsets.ModelViewSet):
    serializer_class = AssignmentSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["course_class", "assignment_type"]

    def get_queryset(self):
        return Assignment.objects.select_related("course_class__course")

class StudentSubmissionViewSet(viewsets.ModelViewSet):
    serializer_class = StudentSubmissionSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["student", "assignment"]

    def get_queryset(self):
        return StudentSubmission.objects.select_related(
            "assignment__course_class__course",
        )