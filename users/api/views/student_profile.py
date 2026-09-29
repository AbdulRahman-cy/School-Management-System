from rest_framework import viewsets

from users.models import StudentProfile
from users.api.permissions import IsAdminOrReadOnly
from users.api.scoping import RoleScopedQuerysetMixin
from users.api.serializers import StudentProfileSerializer


class StudentProfileViewSet(RoleScopedQuerysetMixin, viewsets.ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    serializer_class = StudentProfileSerializer
    student_owner_lookup = "user_id"

    def get_base_queryset(self):
        return StudentProfile.objects.all()
