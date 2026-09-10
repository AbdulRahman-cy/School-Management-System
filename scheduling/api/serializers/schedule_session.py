from rest_framework import serializers
from scheduling.models import Session
from .timeslot import TimeslotSerializer


class ScheduleSessionSerializer(serializers.ModelSerializer):

    course_name = serializers.CharField(source='course_class.course.title', read_only=True)
    course_code = serializers.CharField(source='course_class.course.code', read_only=True)
    room = serializers.CharField(source='room.name', read_only=True)
    timeslot = TimeslotSerializer(read_only=True)

    class Meta:
        model = Session
        fields = ['id', 'course_name', 'course_code', 'session_type', 'timeslot', 'room']
