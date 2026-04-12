from django.urls import path, include
from rest_framework.routers import DefaultRouter
from scheduling.api.views import CourseClassViewSet, ClassSessionViewSet

router = DefaultRouter()
router.register(r"course-classes", CourseClassViewSet, basename="courseclass")
router.register(r"class-sessions", ClassSessionViewSet, basename="classsession")    

urlpatterns = [
    path("", include(router.urls)),     
]