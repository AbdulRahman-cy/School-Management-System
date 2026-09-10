from django.db.models import F
from rest_framework import serializers

from academics.api.serializers import DisciplineSerializer
from users.models import StudentProfile
from records.models import Enrollment

from .base_user import BaseUserSerializer
from .auth import TopCourseEnrollmentSerializer


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
