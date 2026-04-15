from django.urls import path, include
from rest_framework.routers import DefaultRouter
from academics.api.views import CourseClassViewSet, CourseViewSet, DepartmentViewSet, DisciplineViewSet, RoomViewSet, StudyGroupViewSet, TermViewSet 


router = DefaultRouter()

router.register(r"departments", DepartmentViewSet, basename="department")
router.register(r"disciplines", DisciplineViewSet, basename="discipline")
router.register(r"terms", TermViewSet, basename="term")
router.register(r"courses", CourseViewSet, basename="course")   
router.register(r"rooms", RoomViewSet, basename="room")
router.register(r"groups", StudyGroupViewSet, basename="group")
router.register(r"classes", CourseClassViewSet, basename="class")

urlpatterns = [
    path("", include(router.urls)),     
]