from rest_framework import serializers
from scheduling.models import Timeslot


class TimeslotSerializer(serializers.ModelSerializer):

    class Meta:
        model = Timeslot
        fields = [
            "id", "day", "period", "created_at", "updated_at",
        ]
