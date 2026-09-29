from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from users.models import TeacherProfile, StudentProfile
from records.models import Enrollment


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
