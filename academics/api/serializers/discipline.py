from rest_framework import serializers
from academics.models import Discipline
from .department import DepartmentSerializer


class DisciplineSerializer(serializers.ModelSerializer):
    department = DepartmentSerializer(read_only=True)

    class Meta:
        model  = Discipline
        fields = ["id", "name", "code", "department", "program_type", "created_at", "updated_at"]
