from rest_framework import viewsets
from academics.models import Room
from academics.api.serializers import RoomSerializer
from users.api.permissions import IsAdminOrReadOnly


class RoomViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    queryset = Room.objects.all()
    serializer_class = RoomSerializer
