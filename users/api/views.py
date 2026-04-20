from rest_framework import viewsets
from .serializers import BaseUserSerializer, TeacherProfileSerializer, StudentProfileSerializer
from users.models import BaseUser, TeacherProfile, StudentProfile
from .permissions import IsAdmin

class BaseUserViewSet(viewsets.ModelViewSet):
    queryset = BaseUser.objects.all()
    serializer_class = BaseUserSerializer


class TeacherProfileViewSet(viewsets.ModelViewSet):
    queryset = TeacherProfile.objects.all()
    serializer_class = TeacherProfileSerializer

class StudentProfileViewSet(viewsets.ModelViewSet):
    queryset = StudentProfile.objects.all()
    serializer_class = StudentProfileSerializer
