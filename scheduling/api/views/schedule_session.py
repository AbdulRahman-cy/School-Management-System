from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from scheduling.models import Session
from scheduling.api.serializers import ScheduleSessionSerializer


class ScheduleSessionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only "my timetable" endpoint for the active term. Scope is always
    derived from the authenticated user server-side, never from a client-
    supplied id: the previous `?student=<id>` query param let any
    authenticated user read anyone else's schedule by simply changing the
    number (IDOR), and an unfiltered request returned every session in the
    university to any authenticated user.

    - STUDENT: sessions for classes they're enrolled in.
    - TEACHER, and ADMIN acting as a "super teacher" (i.e. they themselves
      have a TeacherProfile): sessions for classes they coordinate.
    - Anyone else — including an ADMIN with no TeacherProfile — gets an
      empty schedule. This endpoint is a personal timetable, not a global
      browser; institution-wide session counts belong on the Admin Dashboard.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ScheduleSessionSerializer

    def get_queryset(self):
        user = self.request.user
        active_term_sessions = (
            Session.objects
            .filter(course_class__group__term__is_active=True)
            .select_related("room", "timeslot", "course_class__course")
        )

        if user.role == "STUDENT":
            student_profile = getattr(user, "student_profile", None)
            if student_profile is None:
                return active_term_sessions.none()
            return active_term_sessions.filter(
                course_class__enrollments__student_id=student_profile.id
            )

        teacher_profile = getattr(user, "teacher_profile", None)
        if user.role in ("TEACHER", "ADMIN") and teacher_profile is not None:
            return active_term_sessions.filter(
                course_class__coordinator_id=teacher_profile.id,
                session_type="LECTURE",
            )

        return active_term_sessions.none()
