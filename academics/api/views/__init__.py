from .department import DepartmentViewSet
from .discipline import DisciplineViewSet
from .term import TermViewSet
from .course import CourseViewSet
from .room import RoomViewSet
from .course_class import CourseClassViewSet
from .study_group import StudyGroupViewSet
from .cohort import CohortViewSet
from .admin_dashboard import AdminDashboardView
from .teacher_dashboard import TeacherDashboardView

__all__ = [
    "DepartmentViewSet",
    "DisciplineViewSet",
    "TermViewSet",
    "CourseViewSet",
    "RoomViewSet",
    "CourseClassViewSet",
    "StudyGroupViewSet",
    "CohortViewSet",
    "AdminDashboardView",
    "TeacherDashboardView",
]
