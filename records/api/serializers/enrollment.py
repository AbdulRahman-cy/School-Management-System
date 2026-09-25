import statistics
from rest_framework import serializers
from academics.api.serializers import CourseClassSerializer
from records.models import Enrollment
from django.db.models import Avg, Max, Min, Count, Q

from .grade import GradeEntrySerializer


class DashboardFilterSerializer(serializers.Serializer):
    student = serializers.IntegerField(required=True)

    #No hidden defaults injected behind your back.
    term_status = serializers.ChoiceField(
        choices=['past', 'all', 'active'],
        required=False
    )


class DashboardEnrollmentSerializer(serializers.ModelSerializer):
    # Flatten the relationship: Reach through Enrollment -> CourseClass -> Course
    course_code = serializers.CharField(
        source='course_class.course.code',
        read_only=True
    )
    course_title = serializers.CharField(
        source='course_class.course.title',
        read_only=True
    )

    class Meta:
        model = Enrollment
        fields = [
            'id',
            'course_code',    # Matches the "CODE" column
            'course_title'    # Matches the "COURSE TITLE" column
        ]


class EnrollmentSerializer(serializers.ModelSerializer):
    course_class        = CourseClassSerializer(read_only=True)
    grades              = GradeEntrySerializer(many=True, read_only=True)

    # We keep these ReadOnly so clients can't manually set them via API,
    # but they now map directly to the DB columns.
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
        # Only look at peer enrollments that have at least one grade
        peer_enrollments = Enrollment.objects.filter(
            course_class=obj.course_class,
            grades__isnull=False
        ).distinct()

        # Let the database do the heavy lifting for averages, max, min, and distribution
        stats = peer_enrollments.aggregate(
            avg=Avg('final_percentage'),
            max=Max('final_percentage'),
            min=Min('final_percentage'),
            total=Count('id'),
            # Database-level distribution counts
            A=Count('id', filter=Q(final_percentage__gte=93)),
            A_minus=Count('id', filter=Q(final_percentage__gte=89, final_percentage__lt=93)),
            B_plus=Count('id', filter=Q(final_percentage__gte=84, final_percentage__lt=89)),
            B=Count('id', filter=Q(final_percentage__gte=79, final_percentage__lt=84)),
            C_plus=Count('id', filter=Q(final_percentage__gte=74, final_percentage__lt=79)),
            C=Count('id', filter=Q(final_percentage__gte=69, final_percentage__lt=74)),
            D_plus=Count('id', filter=Q(final_percentage__gte=64, final_percentage__lt=69)),
            D=Count('id', filter=Q(final_percentage__gte=60, final_percentage__lt=64)),
            F=Count('id', filter=Q(final_percentage__lt=60)),
        )

        if stats['total'] == 0:
            return None

        # Standard SQL doesn't have a reliable Median function cross-platform.
        # We fetch a flat, lightweight list of just the decimals to calculate it in Python.
        percentages = list(peer_enrollments.values_list('final_percentage', flat=True))
        median_val = statistics.median([float(p) for p in percentages])

        return {
            "average":        round(float(stats['avg']), 1),
            "median":         round(median_val, 1),
            "highest":        float(stats['max']),
            "lowest":         float(stats['min']),
            "total_students": stats['total'],
            "distribution": {
                "A":  stats['A'],
                "A-": stats['A_minus'],
                "B+": stats['B_plus'],
                "B":  stats['B'],
                "C+": stats['C_plus'],
                "C":  stats['C'],
                "D+": stats['D_plus'],
                "D":  stats['D'],
                "F":  stats['F'],
            },
        }

class EnrollResultSerializer(serializers.ModelSerializer):
    course_code = serializers.CharField(
        source="course_class.course.code", 
        read_only=True
    )

    class Meta:
        model = Enrollment
        fields = [
            "id", 
            "course_class_id", 
            "course_code", 
            "lecture_session_id", 
            "tutorial_session_id", 
            "lab_session_id", 
            "created_at"
        ]
