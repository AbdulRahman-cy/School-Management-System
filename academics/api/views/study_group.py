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

    @action(detail=True, methods=["get"], url_path="capacity")
    def capacity(self, request, pk=None):
        from records.models import Enrollment

        study_group = self.get_object()
        taken = (
            Enrollment.objects
            .filter(course_class__group=study_group, status=Enrollment.EnrollmentStatus.ENROLLED)
            .values("student")
            .distinct()
            .count()
        )
        data = {
            "id": study_group.id,
            "capacity": study_group.capacity,
            "remaining": max(study_group.capacity - taken, 0),
        }
        return Response(StudyGroupCapacitySerializer(data).data)
