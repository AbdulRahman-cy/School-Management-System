from rest_framework import viewsets
from academics.models import Term
from academics.api.serializers import TermSerializer
from users.api.permissions import IsAdminOrReadOnly


class TermViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    queryset = Term.objects.all()
    serializer_class = TermSerializer
