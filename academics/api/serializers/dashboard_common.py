from rest_framework import serializers

from academics.models import CourseClass


class DashboardStatsSerializer(serializers.Serializer):
    """Active-term counters shared by the Admin and Teacher dashboard stat rows."""
    total_active_classes = serializers.IntegerField()
    total_scheduled_sessions = serializers.IntegerField()
    total_enrolled_students = serializers.IntegerField()


class DashboardClassRowSerializer(serializers.ModelSerializer):
    """
    One row of a dashboard's class table. `enrolled_count` is expected to be
    pre-annotated on the queryset (see AdminDashboardView / TeacherDashboardView)
    so no per-row query is issued here.
    """
    course_code = serializers.CharField(source="course.code")
    course_title = serializers.CharField(source="course.title")
    group_label = serializers.SerializerMethodField()
    term_name = serializers.CharField(source="group.term.name")
    year_level = serializers.IntegerField(source="group.year_level")
    discipline_code = serializers.CharField(source="group.discipline.code")
    discipline_name = serializers.CharField(source="group.discipline.name")
    enrolled_count = serializers.IntegerField()

    class Meta:
        model = CourseClass
        fields = [
            "id", "course_code", "course_title", "group_label",
            "term_name", "year_level", "discipline_code", "discipline_name",
            "capacity", "enrolled_count",
        ]

    def get_group_label(self, obj) -> str:
        return f"G{obj.group.number} · {obj.group.discipline.code}"
