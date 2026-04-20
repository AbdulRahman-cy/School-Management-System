from rest_framework import serializers
from academics.api.serializers import DisciplineSerializer
from users.models import BaseUser, TeacherProfile, StudentProfile


class BaseUserSerializer(serializers.ModelSerializer):
    class Meta:
        model  = BaseUser
        fields = ["id", "email", "first_name", "last_name", "role", "created_at", "updated_at"]


class TeacherProfileSerializer(serializers.ModelSerializer):
    user_name       = serializers.StringRelatedField(source="user")
    department_name = serializers.StringRelatedField(source="department")

    class Meta:
        model  = TeacherProfile
        fields = ["id", "user", "user_name", "department", "department_name", "rank", "created_at", "updated_at"]


class StudentProfileSerializer(serializers.ModelSerializer):
    user = BaseUserSerializer(read_only=True)
    discipline = DisciplineSerializer(read_only=True)

    cumulative_gpa = serializers.ReadOnlyField(source='calculated_gpa')

    class Meta:
        model = StudentProfile
        fields = ['id', 'user', 'discipline', 'enrollment_year', 'cumulative_gpa']