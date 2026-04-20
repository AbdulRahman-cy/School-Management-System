from rest_framework import viewsets
from scheduling.models import Session, Timeslot
from .serializers import SessionSerializer , TimeslotSerializer
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
    


