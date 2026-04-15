from rest_framework import serializers
from scheduling.models import Timeslot, Session


class TimeslotSerializer(serializers.ModelSerializer):

    class Meta:
        model = Timeslot
        fields = [
            "id", "day", "period", "created_at", "updated_at",
        ]


class SessionSerializer(serializers.ModelSerializer):
    timeslot = TimeslotSerializer()
    room = serializers.StringRelatedField(source="room")

    class Meta:
        model  = Session
        fields = [
            "id", "course_class", "session_type", "timeslot", "room",
            "created_at", "updated_at",
        ]

