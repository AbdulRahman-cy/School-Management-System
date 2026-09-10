from rest_framework import viewsets
from academics.models import Department
from academics.api.serializers import DepartmentSerializer
from users.api.permissions import IsAdminOrReadOnly


class DepartmentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
