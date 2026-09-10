from rest_framework import serializers
from academics.models import Room
from .department import DepartmentSerializer


class RoomSerializer(serializers.ModelSerializer):
    department = DepartmentSerializer(read_only=True)

    class Meta:
        model  = Room
        fields = ["id", "code", "name", "capacity", "room_type", "department", "is_active", "created_at", "updated_at"]
