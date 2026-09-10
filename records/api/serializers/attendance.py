from rest_framework import serializers
from records.models import AttendanceRecord


class AttendanceRecordSerializer(serializers.ModelSerializer):
    course_code  = serializers.CharField(
        source="session.course_class.course.code",
        read_only=True,
    )
    course_title = serializers.CharField(
        source="session.course_class.course.title",
        read_only=True,
    )
    session_type = serializers.CharField(
        source="session.session_type",
        read_only=True,
    )

    term_name = serializers.CharField(
        source="session.course_class.group.term.name",
        read_only=True,
    )

    class Meta:
        model  = AttendanceRecord
        fields = [
            "id", "student", "session",
            "term_name",
            "course_code", "course_title", "session_type",
            "week", "status",
            "created_at", "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]
