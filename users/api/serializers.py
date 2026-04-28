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


from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from users.models import BaseUser, TeacherProfile, StudentProfile


class RegisterSerializer(serializers.ModelSerializer):
    password  = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, label="Confirm password")

    class Meta:
        model  = BaseUser
        fields = ["email", "first_name", "last_name", "role", "password", "password2"]

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("password2"):
            raise serializers.ValidationError({"password": "Passwords do not match."})
        return attrs

    def validate_role(self, value):
        # Admins should not be self-registerable
        if value == BaseUser.Role.ADMIN:
            raise serializers.ValidationError("Cannot register with the Admin role.")
        return value

    def create(self, validated_data):
        user = BaseUser.objects.create_user(**validated_data)
        # Auto-create the appropriate profile shell so FKs never dangle
        if user.role == BaseUser.Role.TEACHER:
            TeacherProfile.objects.create(user=user, rank=TeacherProfile.Rank.TA)
        elif user.role == BaseUser.Role.STUDENT:
            StudentProfile.objects.create(user=user, enrollment_year=__import__('datetime').date.today().year)
        return user