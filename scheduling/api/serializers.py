from rest_framework import serializers
from scheduling.models import CourseClass, ClassSession


class CourseClassSerializer(serializers.ModelSerializer):
    course_name      = serializers.StringRelatedField(source="course")
    term_name        = serializers.StringRelatedField(source="term")
    coordinator_name = serializers.StringRelatedField(source="coordinator")

    class Meta:
        model  = CourseClass
        fields = [
            "id", "course", "course_name", "term", "term_name",
            "coordinator", "coordinator_name", "programs",
            "created_at", "updated_at",
        ]


class ClassSessionSerializer(serializers.ModelSerializer):
    instructor_name = serializers.StringRelatedField(source="instructor")

    class Meta:
        model  = ClassSession
        fields = [
            "id", "course_class", "session_type", "instructor",
            "instructor_name", "day_of_week", "start_time", "end_time",
            "location", "capacity", "created_at", "updated_at",
        ]