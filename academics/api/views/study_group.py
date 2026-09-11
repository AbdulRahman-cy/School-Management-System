from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from academics.models import StudyGroup
from academics.api.serializers import StudyGroupSerializer, StudyGroupCapacitySerializer
from users.api.permissions import IsAdminOrReadOnly


class StudyGroupViewSet(viewsets.ModelViewSet):
    """Standard CRUD for StudyGroup plus the capacity action."""
    permission_classes = [IsAdminOrReadOnly]
    queryset = StudyGroup.objects.all()
    serializer_class = StudyGroupSerializer

