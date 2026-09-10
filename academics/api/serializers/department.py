from rest_framework import serializers
from academics.models import Department


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Department
        fields = ["id", "name", "code", "created_at", "updated_at"]
