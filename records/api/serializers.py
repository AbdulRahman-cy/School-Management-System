import statistics
from rest_framework import serializers
from academics.api.serializers import CourseClassSerializer
from records.models import (
    Enrollment, GradeEntry, AttendanceRecord,
    Exam, ExamResult, Assignment, StudentSubmission,
)


# ─────────────────────────────────────────────────────────────
# GradeEntry
# ─────────────────────────────────────────────────────────────

class GradeEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model  = GradeEntry
        fields = [
            "id", "enrollment", "component", "score",
            "created_at", "updated_at",
        ]


# ─────────────────────────────────────────────────────────────
# Enrollment
# ─────────────────────────────────────────────────────────────

class EnrollmentSerializer(serializers.ModelSerializer):
    course_class        = CourseClassSerializer(read_only=True)
    grades              = GradeEntrySerializer(many=True, read_only=True)
    final_percentage    = serializers.ReadOnlyField()
    course_grade_points = serializers.ReadOnlyField()
    cohort_stats        = serializers.SerializerMethodField()

    class Meta:
        model  = Enrollment
        fields = [
            "id", "student", "course_class",
            "lecture_session", "tutorial_session", "lab_session",
            "grades", "final_percentage", "course_grade_points",
            "cohort_stats",
            "created_at", "updated_at",
        ]

    def get_cohort_stats(self, obj):
        peer_enrollments = Enrollment.objects.filter(
            course_class=obj.course_class,
        ).prefetch_related("grades")

        percentages = [
            float(peer.final_percentage)
            for peer in peer_enrollments
            if peer.grades.exists()
        ]

        if not percentages:
            return None

        return {
            "average":        round(statistics.mean(percentages), 1),
            "median":         round(statistics.median(percentages), 1),
            "highest":        max(percentages),
            "lowest":         min(percentages),
            "total_students": len(percentages),
            "distribution": {
                "A":  len([p for p in percentages if p >= 93]),
                "A-": len([p for p in percentages if 89 <= p < 93]),
                "B+": len([p for p in percentages if 84 <= p < 89]),
                "B":  len([p for p in percentages if 79 <= p < 84]),
                "C+": len([p for p in percentages if 74 <= p < 79]),
                "C":  len([p for p in percentages if 69 <= p < 74]),
                "D+": len([p for p in percentages if 64 <= p < 69]),
                "D":  len([p for p in percentages if 60 <= p < 64]),
                "F":  len([p for p in percentages if p < 60]),
            },
        }


# ─────────────────────────────────────────────────────────────
# AttendanceRecord
# ─────────────────────────────────────────────────────────────

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
        source="session.course_class.term.name",
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


# ─────────────────────────────────────────────────────────────
# Exam
# ─────────────────────────────────────────────────────────────

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


# ─────────────────────────────────────────────────────────────
# ExamResult
# ─────────────────────────────────────────────────────────────

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


# ─────────────────────────────────────────────────────────────
# Assignment
# ─────────────────────────────────────────────────────────────

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


# ─────────────────────────────────────────────────────────────
# StudentSubmission
# ─────────────────────────────────────────────────────────────

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