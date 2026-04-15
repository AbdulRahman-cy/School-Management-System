from django.urls import path, include
from rest_framework.routers import DefaultRouter
from scheduling.api.views import SessionViewSet, TimeslotViewSet

router = DefaultRouter()
router.register(r"sessions", SessionViewSet, basename="session")
router.register(r"timeslots", TimeslotViewSet, basename="timeslot")

urlpatterns = [
    path("", include(router.urls)),     
]