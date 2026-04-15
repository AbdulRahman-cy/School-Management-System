from rest_framework import viewsets
from scheduling.models import Session, Timeslot
from .serializers import SessionSerializer , TimeslotSerializer
from .permissions import IsAdminOrReadOnly

class SessionViewSet(viewsets.ModelViewSet):
    queryset = Session.objects.all()
    serializer_class = SessionSerializer
    permission_classes = [IsAdminOrReadOnly]

class TimeslotViewSet(viewsets.ModelViewSet):
    queryset = Timeslot.objects.all()
    serializer_class = TimeslotSerializer
    permission_classes = [IsAdminOrReadOnly]


