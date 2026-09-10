from rest_framework import serializers
from records.models import Assignment


class AssignmentSerializer(serializers.ModelSerializer):
    course_code  = serializers.CharField(
        source="course_class.course.code",
        read_only=True,
    )
    course_title = serializers.CharField(
        source="course_class.course.title",
        read_only=True,
    )

    class Meta:
        model  = Assignment
        fields = [
            "id", "course_class", "course_code", "course_title",
            "assignment_type", "due_week", "max_points",
            "created_at", "updated_at",
        ]
