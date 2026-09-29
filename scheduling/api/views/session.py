from rest_framework import viewsets
from scheduling.models import Session
from scheduling.api.serializers import SessionSerializer
from users.api.permissions import IsAdminOrReadOnly
from users.api.scoping import RoleScopedQuerysetMixin


class SessionViewSet(RoleScopedQuerysetMixin, viewsets.ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    serializer_class = SessionSerializer
    # We follow the chain: Session -> CourseClass -> Enrollment -> Student
    student_owner_lookup = "course_class__enrollments__student__user_id"
    admin_student_lookup = "course_class__enrollments__student_id"

    def get_base_queryset(self):
        return Session.objects.select_related('room', 'timeslot', 'course_class__course')
