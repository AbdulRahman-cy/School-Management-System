from rest_framework import serializers
from academics.api.serializers import CourseClassSerializer, RoomSerializer
from scheduling.models import Timeslot, Session


class TimeslotSerializer(serializers.ModelSerializer):

    class Meta:
        model = Timeslot
        fields = [
            "id", "day", "period", "created_at", "updated_at",
        ]

class SessionSerializer(serializers.ModelSerializer):
    # THESE MUST BE EXPLICITLY DECLARED
    course_class = CourseClassSerializer(read_only=True)
    room = RoomSerializer(read_only=True)
    timeslot = TimeslotSerializer(read_only=True)

    class Meta:
        model = Session
        fields = ['id', 'course_class', 'session_type', 'timeslot', 'room']

class ScheduleSessionSerializer(serializers.ModelSerializer):

    course_name = serializers.CharField(source='course_class.course.title', read_only=True)
    course_code = serializers.CharField(source='course_class.course.code', read_only=True)
    room = serializers.CharField(source='room.name', read_only=True)
    timeslot = TimeslotSerializer(read_only=True)
    
    class Meta:
        model = Session
        fields = ['id', 'course_name', 'course_code', 'session_type', 'timeslot', 'room']