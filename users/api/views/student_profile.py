from rest_framework import viewsets

from users.models import StudentProfile
from users.api.permissions import IsAdminOrReadOnly
from users.api.serializers import StudentProfileSerializer


class StudentProfileViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    queryset = StudentProfile.objects.all()
    serializer_class = StudentProfileSerializer
