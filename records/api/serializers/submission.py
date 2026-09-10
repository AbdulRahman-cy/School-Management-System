from rest_framework import serializers
from records.models import StudentSubmission


class StudentSubmissionSerializer(serializers.ModelSerializer):
    is_late      = serializers.ReadOnlyField()
    assignment_type = serializers.CharField(
        source="assignment.assignment_type",
        read_only=True,
    )
    due_week     = serializers.IntegerField(source="assignment.due_week", read_only=True)
    max_points   = serializers.DecimalField(
        source="assignment.max_points",
        max_digits=5, decimal_places=2,
        read_only=True,
    )
    course_code  = serializers.CharField(
        source="assignment.course_class.course.code",
        read_only=True,
    )
    course_title = serializers.CharField(
        source="assignment.course_class.course.title",
        read_only=True,
    )

    class Meta:
        model  = StudentSubmission
        fields = [
            "id", "student", "assignment",
            "course_code", "course_title",
            "assignment_type", "due_week", "max_points",
            "score", "submitted_at", "is_late",
            "created_at", "updated_at",
        ]
        read_only_fields = ["submitted_at", "created_at", "updated_at"]
