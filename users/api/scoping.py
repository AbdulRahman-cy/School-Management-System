from django.core.exceptions import ImproperlyConfigured
from rest_framework.exceptions import ValidationError

from users.models import BaseUser


class RoleScopedQuerysetMixin:
    """
    Default-deny, role-based queryset scoping for DRF views.

    Subclasses implement `get_base_queryset()` (select_related, term filters,
    etc.) and declare how a row is tied to its owning student:

    - `student_owner_lookup`: path to the owning BaseUser's id, e.g.
      "student__user_id". Students only ever see rows matching their own id;
      any client-supplied `?student=` is ignored.
    - `admin_student_lookup` (optional): lookup used to honour
      `?student=<StudentProfile id>` for admins, e.g.
      "course_class__enrollments__student_id".

    ADMIN sees everything. Every other role — TEACHER, a future role, or an
    anonymous request during schema generation — gets an empty queryset.
    Because this runs inside `get_queryset()`, detail routes (retrieve,
    update, destroy, custom detail actions) are scoped too and return 404
    for rows outside the caller's scope.
    """
    student_owner_lookup = None
    admin_student_lookup = None

    def get_base_queryset(self):
        raise NotImplementedError(f"{type(self).__name__} must implement get_base_queryset().")

    def get_queryset(self):
        return self.scope_queryset(self.get_base_queryset())

    def scope_queryset(self, queryset):
        if self.student_owner_lookup is None:
            raise ImproperlyConfigured(f"{type(self).__name__} must set student_owner_lookup.")

        user = self.request.user
        role = getattr(user, "role", None)

        if role == BaseUser.Role.STUDENT:
            return queryset.filter(**{self.student_owner_lookup: user.id})
        if role == BaseUser.Role.ADMIN:
            return self._filter_by_requested_student(queryset)
        return queryset.none()

    def _filter_by_requested_student(self, queryset):
        student_id = self.request.query_params.get("student")
        if not self.admin_student_lookup or not student_id:
            return queryset
        try:
            student_id = int(student_id)
        except ValueError:
            raise ValidationError({"student": "Must be an integer."})
        return queryset.filter(**{self.admin_student_lookup: student_id})
