from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EnrollmentViewSet, GradeEntryViewSet

router = DefaultRouter()
router.register(r'enrollments', EnrollmentViewSet, basename='enrollment')
router.register(r'grades', GradeEntryViewSet, basename='gradeentry')

urlpatterns = [
    path('', include(router.urls)),
]