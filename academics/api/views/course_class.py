from rest_framework import viewsets
from academics.models import CourseClass
from academics.api.serializers import CourseClassSerializer
from users.api.permissions import IsAdminOrReadOnly


class CourseClassViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    queryset = CourseClass.objects.all()
    serializer_class = CourseClassSerializer
