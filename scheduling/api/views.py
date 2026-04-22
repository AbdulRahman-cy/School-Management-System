from rest_framework import viewsets
from scheduling.models import Session, Timeslot
from .serializers import SessionSerializer , TimeslotSerializer, ScheduleSessionSerializer
from django_filters.rest_framework import DjangoFilterBackend
from .permissions import IsAdminOrReadOnly

class SessionViewSet(viewsets.ModelViewSet):
    serializer_class = SessionSerializer

    def get_queryset(self):
        queryset = Session.objects.select_related('room', 'timeslot', 'course_class__course')
        student_id = self.request.query_params.get('student')
        
        if student_id:
            # We follow the chain: Session -> CourseClass -> Enrollment -> Student
            return queryset.filter(course_class__enrollments__student_id=student_id)
        return queryset

class TimeslotViewSet(viewsets.ModelViewSet):
    queryset = Timeslot.objects.all()
    serializer_class = TimeslotSerializer

class ScheduleSessionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ScheduleSessionSerializer

    def get_queryset(self):
        # 1. Filter for the active term
        queryset = Session.objects.filter(
            course_class__term__is_active=True
        ).select_related('room', 'timeslot', 'course_class__course')
        
        # 2. Filter for the specific student 
        # (Assuming the frontend passes ?student=4, like in the main SessionViewSet)
        student_id = self.request.query_params.get('student')
        
        if student_id:
            queryset = queryset.filter(course_class__enrollments__student_id=student_id)
        else:
            # Best practice: fallback to the logged-in user if no ID is provided
            # queryset = queryset.filter(course_class__enrollments__student__user=self.request.user)
            pass
            
        return queryset

