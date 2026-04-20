from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AttendanceViewSet, EnrollmentViewSet, GradeEntryViewSet

router = DefaultRouter()
router.register(r'enrollments', EnrollmentViewSet, basename='enrollment')
router.register(r'grades', GradeEntryViewSet, basename='gradeentry')
router.register(r'attendance', AttendanceViewSet, basename='attendancerecord')

urlpatterns = [
    path('', include(router.urls)),
]