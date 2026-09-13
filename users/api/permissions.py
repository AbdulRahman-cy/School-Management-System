from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "ADMIN"


class IsAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return request.user.is_authenticated
        return request.user.is_authenticated and request.user.role == "ADMIN"


class IsStudent(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "STUDENT"


class IsTeacher(BasePermission):
    """
    Allows TEACHER users, and ADMIN users acting as a "super teacher" —
    but only if the admin actually has a TeacherProfile (i.e. coordinates
    classes themselves). An admin with no teacher_profile is refused rather
    than shown an empty dashboard.
    """
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in ("TEACHER", "ADMIN")
            and hasattr(request.user, "teacher_profile")
        )
