from django.urls import path, include
from rest_framework.routers import DefaultRouter
from academics.api.views import DepartmentViewSet   

router = DefaultRouter()

router.register(r"departments", DepartmentViewSet, basename="department")

urlpatterns = [
    path("", include(router.urls)),     
]