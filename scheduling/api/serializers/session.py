from rest_framework import serializers
from academics.api.serializers import CourseClassSerializer, RoomSerializer
from scheduling.models import Session
from .timeslot import TimeslotSerializer


class SessionSerializer(serializers.ModelSerializer):
    # THESE MUST BE EXPLICITLY DECLARED
    course_class = CourseClassSerializer(read_only=True)
    room = RoomSerializer(read_only=True)
    timeslot = TimeslotSerializer(read_only=True)

    class Meta:
        model = Session
        fields = ['id', 'course_class', 'session_type', 'timeslot', 'room']
