from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend
from scheduling.models import Timeslot
from scheduling.api.serializers import TimeslotSerializer
from users.api.permissions import IsAdminOrReadOnly


class TimeslotViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    queryset = Timeslot.objects.all()
    serializer_class = TimeslotSerializer
