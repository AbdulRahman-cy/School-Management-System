from rest_framework import viewsets

from users.models import TeacherProfile
from users.api.permissions import IsAdminOrReadOnly
from users.api.serializers import TeacherProfileSerializer
from academics.api.serializers import TeacherFilterSerializer


class TeacherProfileViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    serializer_class = TeacherProfileSerializer

    def get_queryset(self):
        qs = TeacherProfile.objects.select_related('user', 'department')
        filters = TeacherFilterSerializer(data=self.request.query_params)
        filters.is_valid(raise_exception=True)
        department_id = filters.validated_data.get('department_id')
        if department_id:
            qs = qs.filter(department_id=department_id)
        return qs
