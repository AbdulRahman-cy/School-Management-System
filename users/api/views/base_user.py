from rest_framework import viewsets

from users.models import BaseUser
from users.api.permissions import IsAdmin
from users.api.serializers import BaseUserSerializer


class BaseUserViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdmin]
    queryset = BaseUser.objects.all()
    serializer_class = BaseUserSerializer
