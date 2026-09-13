from .department import DepartmentSerializer
from .discipline import DisciplineSerializer
from .term import TermSerializer
from .course import CourseSerializer, CourseFilterSerializer
from .room import RoomSerializer
from .study_group import StudyGroupSerializer, StudyGroupCapacitySerializer, StudyGroupInputSerializer
from .course_class import CourseClassSerializer
from .cohort import (
    TeacherFilterSerializer,
    AddStudyGroupRequestSerializer,
    CohortIdentifierSerializer,
    CohortBulkCreateSerializer,
    CohortGroupReadSerializer,
    CohortCourseClassReadSerializer,
    CohortReadSerializer,
    ScheduleCohortRequestSerializer,
    ScheduleCohortResponseSerializer,
)
from .dashboard_common import (
    DashboardStatsSerializer,
    DashboardClassRowSerializer,
)
from .admin_dashboard import (
    AdminDashboardStatsSerializer,
    AdminDashboardClassRowSerializer,
)
from .teacher_dashboard import TeacherDashboardClassRowSerializer

__all__ = [
    "DepartmentSerializer",
    "DisciplineSerializer",
    "TermSerializer",
    "CourseSerializer",
    "CourseFilterSerializer",
    "RoomSerializer",
    "StudyGroupSerializer",
    "StudyGroupCapacitySerializer",
    "StudyGroupInputSerializer",
    "CourseClassSerializer",
    "TeacherFilterSerializer",
    "AddStudyGroupRequestSerializer",
    "CohortIdentifierSerializer",
    "CohortBulkCreateSerializer",
    "CohortGroupReadSerializer",
    "CohortCourseClassReadSerializer",
    "CohortReadSerializer",
    "ScheduleCohortRequestSerializer",
    "ScheduleCohortResponseSerializer",
    "DashboardStatsSerializer",
    "DashboardClassRowSerializer",
    "AdminDashboardStatsSerializer",
    "AdminDashboardClassRowSerializer",
    "TeacherDashboardClassRowSerializer",
]
