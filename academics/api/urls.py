from django.urls import path, include
from rest_framework.routers import DefaultRouter
from academics.api.views import DepartmentViewSet, DisciplineViewSet 


router = DefaultRouter()

router.register(r"departments", DepartmentViewSet, basename="department")
router.register(r"disciplines", DisciplineViewSet, basename="discipline")

urlpatterns = [
    path("", include(router.urls)),     
]