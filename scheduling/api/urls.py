from django.urls import path, include
from rest_framework.routers import DefaultRouter
from scheduling.api.views import SessionViewSet, TimeslotViewSet, ScheduleSessionViewSet

router = DefaultRouter()
router.register(r"sessions", SessionViewSet, basename="session")
router.register(r"timeslots", TimeslotViewSet, basename="timeslot")
router.register(r"schedule-sessions", ScheduleSessionViewSet, basename="schedule-session")


urlpatterns = [
    path("", include(router.urls)),     
]