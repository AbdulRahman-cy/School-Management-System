from rest_framework import serializers
from records.models import Exam, ExamResult


class ExamSerializer(serializers.ModelSerializer):
    course_code  = serializers.CharField(
        source="course_class.course.code",
        read_only=True,
    )
    course_title = serializers.CharField(
        source="course_class.course.title",
        read_only=True,
    )

    class Meta:
        model  = Exam
        fields = [
            "id", "course_class", "course_code", "course_title",
            "exam_type", "week", "max_score",
            "created_at", "updated_at",
        ]


class ExamResultSerializer(serializers.ModelSerializer):
    exam_type  = serializers.CharField(source="exam.exam_type",  read_only=True)
    exam_week  = serializers.IntegerField(source="exam.week",    read_only=True)
    max_score  = serializers.DecimalField(
        source="exam.max_score",
        max_digits=5, decimal_places=2,
        read_only=True,
    )
    course_code  = serializers.CharField(
        source="exam.course_class.course.code",
        read_only=True,
    )
    course_title = serializers.CharField(
        source="exam.course_class.course.title",
        read_only=True,
    )

    class Meta:
        model  = ExamResult
        fields = [
            "id", "exam", "student",
            "course_code", "course_title",
            "exam_type", "exam_week", "max_score",
            "status", "score",
            "created_at", "updated_at",
        ]
