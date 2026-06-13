import statistics
from rest_framework import serializers
from academics.api.serializers import CourseClassSerializer
from records.models import Enrollment



# ─────────────────────────────────────────────────────────────
# Enrollment
# ─────────────────────────────────────────────────────────────

class EnrollmentSerializer(serializers.ModelSerializer):
    course_class        = CourseClassSerializer(read_only=True)
    # 🚨 'grades' field removed here 🚨
    final_percentage    = serializers.ReadOnlyField()
    course_grade_points = serializers.ReadOnlyField()
    cohort_stats        = serializers.SerializerMethodField()

    class Meta:
        model  = Enrollment
        fields = [
            "id", "student", "course_class",
            "lecture_session", "tutorial_session", "lab_session",
            # 🚨 'grades' removed from this list 🚨
            "final_percentage", "course_grade_points",
            "cohort_stats",
            "created_at", "updated_at",
        ]

    def get_cohort_stats(self, obj):
        peer_enrollments = Enrollment.objects.filter(
            course_class=obj.course_class,
        ) # 🚨 REMOVED .prefetch_related('grades') 🚨

        percentages = [
            float(peer.final_percentage)
            for peer in peer_enrollments
            if not peer.is_pending # 🚨 CHANGED: We now check your dynamic property instead of the old table!
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