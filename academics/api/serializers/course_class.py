from rest_framework import serializers
from academics.models import CourseClass, Course, StudyGroup
from users.models import TeacherProfile
from .course import CourseSerializer
from .study_group import StudyGroupSerializer


class CourseClassSerializer(serializers.ModelSerializer):
    course = CourseSerializer(read_only=True)
    group = StudyGroupSerializer(read_only=True)

    course_id = serializers.PrimaryKeyRelatedField(
        queryset=Course.objects.all(), source='course', write_only=True, required=False
    )
    group_id = serializers.PrimaryKeyRelatedField(
        queryset=StudyGroup.objects.all(), source='group', write_only=True, required=False
    )
    coordinator_id = serializers.PrimaryKeyRelatedField(
        queryset=TeacherProfile.objects.all(),
        source='coordinator',
        allow_null=True,
        required=False
    )

    class Meta:
        model = CourseClass
        fields = [
            "id",
            "course",
            "course_id",
            "group",
            "group_id",
            "coordinator_id",
            "created_at",
            "updated_at",
        ]
