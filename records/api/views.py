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
            # For the Grades sidebar: /api/enrollments/?student=4&term_status=past
            queryset = queryset.filter(course_class__term__is_active=False)
            
        elif term_status == 'all':
            # /api/enrollments/?student=4&term_status=all
            pass 
            
        else:
            # /api/enrollments/?student=4
            queryset = queryset.filter(course_class__term__is_active=True)

        return queryset


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
        queryset = Exam.objects.select_related("course_class__course")
        
        term_status = self.request.query_params.get("term_status")
        student_id = self.request.query_params.get("student") # <-- Catch the student ID

        # 1. Filter by term
        if term_status == "active":
            queryset = queryset.filter(course_class__term__is_active=True)
        elif term_status == "past":
            queryset = queryset.filter(course_class__term__is_active=False)
            
        # 2. Filter by enrolled student
        if student_id:
            queryset = queryset.filter(course_class__enrollments__student_id=student_id)

        return queryset


class AssignmentViewSet(viewsets.ModelViewSet):
    serializer_class = AssignmentSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["course_class", "assignment_type"]

    def get_queryset(self):
        queryset = Assignment.objects.select_related("course_class__course")
        
        term_status = self.request.query_params.get("term_status")
        student_id = self.request.query_params.get("student") # <-- Catch the student ID

        # 1. Filter by term
        if term_status == "active":
            queryset = queryset.filter(course_class__term__is_active=True)
        elif term_status == "past":
            queryset = queryset.filter(course_class__term__is_active=False)
            
        # 2. Filter by enrolled student
        if student_id:
            queryset = queryset.filter(course_class__enrollments__student_id=student_id)

        return queryset
    

class ExamResultViewSet(viewsets.ModelViewSet):
    serializer_class = ExamResultSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["student", "exam"]

    def get_queryset(self):
        return ExamResult.objects.select_related(
            "exam__course_class__course",
        )


class StudentSubmissionViewSet(viewsets.ModelViewSet):
    serializer_class = StudentSubmissionSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["student", "assignment"]

    def get_queryset(self):
        return StudentSubmission.objects.select_related(
            "assignment__course_class__course",
        )