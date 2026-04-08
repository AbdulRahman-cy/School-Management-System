from rest_framework import serializers
from academics.models import Department, Discipline, Term, Course


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Department
        fields = ["id", "name", "code", "created_at", "updated_at"]


class DisciplineSerializer(serializers.ModelSerializer):
    department_name = serializers.StringRelatedField(source="department")

    class Meta:
        model  = Discipline
        fields = ["id", "name", "code", "department", "department_name", "created_at", "updated_at"]


class TermSerializer(serializers.ModelSerializer):
    class Meta:
        model   = Term
        fields  = ["id", "name", "start_date", "end_date", "is_active", "created_at", "updated_at"]
        read_only_fields = ["is_active"]


class CourseSerializer(serializers.ModelSerializer):
    department_name = serializers.StringRelatedField(source="department")

    class Meta:
        model  = Course
        fields = ["id", "code", "title", "credits", "department", "department_name", "created_at", "updated_at"]