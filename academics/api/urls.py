from django.urls import path, include
from rest_framework.routers import DefaultRouter
from academics.api.views import CourseViewSet, DepartmentViewSet, DisciplineViewSet, TermViewSet 


router = DefaultRouter()

router.register(r"departments", DepartmentViewSet, basename="department")
router.register(r"disciplines", DisciplineViewSet, basename="discipline")
router.register(r"terms", TermViewSet, basename="term")
router.register(r"courses", CourseViewSet, basename="course")   

urlpatterns = [
    path("", include(router.urls)),     
]