from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter
from records.models import GradeEntry
from records.api.serializers import GradeEntrySerializer
from users.api.permissions import IsAdminOrReadOnly
from users.api.scoping import RoleScopedQuerysetMixin


class GradeEntryViewSet(RoleScopedQuerysetMixin, viewsets.ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    serializer_class = GradeEntrySerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['enrollment']
    ordering_fields = ['created_at', 'score']
    student_owner_lookup = "enrollment__student__user_id"

    def get_base_queryset(self):
        return GradeEntry.objects.all().select_related('enrollment')
