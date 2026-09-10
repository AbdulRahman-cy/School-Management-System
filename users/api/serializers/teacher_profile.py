from rest_framework import serializers

from academics.api.serializers import DepartmentSerializer
from academics.models import CourseClass
from users.models import TeacherProfile

from .base_user import BaseUserSerializer


class TeacherActiveCourseClassSerializer(serializers.ModelSerializer):
    course_code = serializers.CharField(source='course.code', read_only=True)
    course_title = serializers.CharField(source='course.title', read_only=True)
    group_number = serializers.IntegerField(source='group.number', read_only=True)
    discipline_code = serializers.CharField(source='group.discipline.code', read_only=True)
    term_name = serializers.CharField(source='group.term.name', read_only=True)

    class Meta:
        model = CourseClass
        fields = ['id', 'course_code', 'course_title', 'group_number', 'discipline_code', 'term_name']


class TeacherProfileSerializer(serializers.ModelSerializer):
    user = BaseUserSerializer(read_only=True)
    user_name = serializers.StringRelatedField(source="user")
    department = DepartmentSerializer(read_only=True)
    department_name = serializers.StringRelatedField(source="department")
    active_classes = serializers.SerializerMethodField()

    class Meta:
        model = TeacherProfile
        fields = [
            "id", "user", "user_name", "department", "department_name",
            "rank", "active_classes", "created_at", "updated_at"
        ]

    def get_active_classes(self, obj):
        classes = CourseClass.objects.filter(
            coordinator=obj,
            group__term__is_active=True
        ).select_related(
            'course', 'group__term', 'group__discipline'
        ).order_by(
            'course__code'
        )[:5]
        return TeacherActiveCourseClassSerializer(classes, many=True).data
