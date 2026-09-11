from django.urls import path, include
from rest_framework.routers import DefaultRouter
from records.api.views import (
    AssignmentViewSet, AttendanceViewSet, EnrollmentViewSet,
    ExamResultViewSet, ExamViewSet, GradeEntryViewSet,
    StudentSubmissionViewSet, StudentEnrollmentViewSet,
)

router = DefaultRouter()
router.register(r'enrollments', EnrollmentViewSet, basename='enrollment')
router.register(r'grades', GradeEntryViewSet, basename='gradeentry')
router.register(r'attendance', AttendanceViewSet, basename='attendancerecord')
router.register(r'exams', ExamViewSet, basename='exam')
router.register(r'exam-results', ExamResultViewSet, basename='examresult')
router.register(r'assignments', AssignmentViewSet, basename='assignment')
router.register(r'student-submissions', StudentSubmissionViewSet, basename='studentsubmission')
router.register(r'self-service', StudentEnrollmentViewSet, basename='self-service')


urlpatterns = [
    path('', include(router.urls)),
]
