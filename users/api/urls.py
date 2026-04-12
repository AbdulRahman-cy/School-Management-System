from django.urls import path, include
from rest_framework.routers import DefaultRouter
from users.api.views import BaseUserViewSet, TeacherProfileViewSet, StudentProfileViewSet   

router = DefaultRouter()

router.register(r"users", BaseUserViewSet, basename="user")
router.register(r"teachers", TeacherProfileViewSet, basename="teacher")         
router.register(r"students", StudentProfileViewSet, basename="student")

urlpatterns = [
    path("", include(router.urls)),
]