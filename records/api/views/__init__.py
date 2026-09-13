from .grade import GradeEntryViewSet
from .attendance import AttendanceViewSet
from .exam import ExamViewSet, ExamResultViewSet
from .assignment import AssignmentViewSet
from .submission import StudentSubmissionViewSet
from .enrollment import EnrollmentViewSet
from .self_service import StudentEnrollmentViewSet
from .admin_enrollment import AdminEnrollmentViewSet

__all__ = [
    "GradeEntryViewSet",
    "AttendanceViewSet",
    "ExamViewSet",
    "ExamResultViewSet",
    "AssignmentViewSet",
    "StudentSubmissionViewSet",
    "EnrollmentViewSet",
    "StudentEnrollmentViewSet",
    "AdminEnrollmentViewSet",
]
