from rest_framework import serializers
from academics.api.serializers import DisciplineSerializer, DepartmentSerializer, CourseSerializer
from users.models import BaseUser, TeacherProfile, StudentProfile
from records.models import Enrollment
from django.contrib.auth.password_validation import validate_password
from django.db.models import F


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

class TopCourseEnrollmentSerializer(serializers.ModelSerializer):
    # Flatten the nested course data into the root JSON object
    code = serializers.CharField(source='course_class.course.code', read_only=True)
    title = serializers.CharField(source='course_class.course.title', read_only=True)
    
    # Read the dynamic python properties you defined on your Enrollment model
    percentage = serializers.ReadOnlyField(source='final_percentage') 
    grade = serializers.ReadOnlyField(source='letter_grade') # Adjust 'letter_grade' to your actual property name!

    class Meta:
        model = Enrollment
        fields = ['id', 'code', 'title', 'percentage', 'grade']

class StudentProfileSerializer(serializers.ModelSerializer):
    user = BaseUserSerializer(read_only=True)
    discipline = DisciplineSerializer(read_only=True)
    cumulative_gpa = serializers.ReadOnlyField(source='calculated_gpa')
    
    top_courses = serializers.SerializerMethodField()

    class Meta:
        model = StudentProfile
        fields = ['id', 'user', 'discipline', 'enrollment_year', 'cumulative_gpa', 'top_courses']
    def get_top_courses(self, obj):
        # Let the database do the sorting and slicing!
        top_enrollments = Enrollment.objects.filter(
            student=obj
        ).select_related(
            'course_class__course'
        ).order_by(
            # Sort descending, but force NULL (active courses) to the bottom
            F('final_percentage').desc(nulls_last=True)
        )[:5] # The slice translates to a SQL "LIMIT 5"

        return TopCourseEnrollmentSerializer(top_enrollments, many=True).data

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
    
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        
        # Add whatever you want into the JWT payload
        token['role'] = user.role
        
        if user.role == 'STUDENT':
            sp = StudentProfile.objects.filter(user=user).first()
            token['profile_id'] = sp.id if sp else None
        elif user.role == 'TEACHER':
            tp = TeacherProfile.objects.filter(user=user).first()
            token['profile_id'] = tp.id if tp else None
        else:
            token['profile_id'] = None
            
        return token