from rest_framework import viewsets
from scheduling.models import CourseClass, ClassSession
from .serializers import CourseClassSerializer , ClassSessionSerializer
from .permissions import IsAdminOrReadOnly

class CourseClassViewSet(viewsets.ModelViewSet):
    queryset = CourseClass.objects.all()
    serializer_class = CourseClassSerializer    
    permission_classes = [IsAdminOrReadOnly]

class ClassSessionViewSet(viewsets.ModelViewSet):
    queryset = ClassSession.objects.all()
    serializer_class = ClassSessionSerializer
    permission_classes = [IsAdminOrReadOnly]


