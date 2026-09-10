from rest_framework import viewsets
from academics.models import Discipline
from academics.api.serializers import DisciplineSerializer
from users.api.permissions import IsAdminOrReadOnly


class DisciplineViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    queryset = Discipline.objects.all()
    serializer_class = DisciplineSerializer
