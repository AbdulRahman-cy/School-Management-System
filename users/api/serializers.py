from rest_framework import serializers
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
    user_name       = serializers.StringRelatedField(source="user")
    discipline_name = serializers.StringRelatedField(source="discipline")

    class Meta:
        model  = StudentProfile
        fields = ["id", "user", "user_name", "discipline", "discipline_name", "enrollment_year", "cumulative_gpa", "created_at", "updated_at"]