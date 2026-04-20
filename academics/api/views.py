from rest_framework import viewsets
from academics.api.permissions import IsAdminOrReadOnly
from academics.models import Department, Discipline, StudyGroup, Term, Course, Room, CourseClass
from .serializers import CourseSerializer, DepartmentSerializer, DisciplineSerializer, TermSerializer, RoomSerializer, StudyGroupSerializer, CourseClassSerializer

class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
   

class DisciplineViewSet(viewsets.ModelViewSet):
    queryset = Discipline.objects.all()
    serializer_class = DisciplineSerializer
    

class TermViewSet(viewsets.ModelViewSet):
    queryset = Term.objects.all()
    serializer_class = TermSerializer


class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer

class RoomViewSet(viewsets.ModelViewSet):   
    queryset = Room.objects.all()
    serializer_class = RoomSerializer
  

class StudyGroupViewSet(viewsets.ModelViewSet):
    queryset = StudyGroup.objects.all()
    serializer_class = StudyGroupSerializer
   

class CourseClassViewSet(viewsets.ModelViewSet):
    queryset = CourseClass.objects.all()
    serializer_class = CourseClassSerializer


    