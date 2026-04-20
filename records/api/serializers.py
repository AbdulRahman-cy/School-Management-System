from rest_framework import serializers
from django.core.exceptions import ValidationError as DjangoValidationError
from academics.api.serializers import CourseClassSerializer
from records.models import Enrollment, GradeEntry, AttendanceRecord
import statistics

class GradeEntrySerializer(serializers.ModelSerializer):
    # Expose the property method as a read-only field
    weighted_score = serializers.DecimalField(
        max_digits=7, 
        decimal_places=4, 
        read_only=True
    )

    class Meta:
        model = GradeEntry
        fields = [
            'id', 
            'enrollment', 
            'component', 
            'weight', 
            'score', 
            'weighted_score', 
            'created_at', 
            'updated_at'
        ]


class EnrollmentSerializer(serializers.ModelSerializer):
    # IF THIS LINE IS MISSING, DJANGO JUST SENDS THE INTEGER ID!
    course_class = CourseClassSerializer(read_only=True) 
    grades = GradeEntrySerializer(many=True, read_only=True)
    final_percentage = serializers.ReadOnlyField()
    course_grade_points = serializers.ReadOnlyField()

    cohort_stats = serializers.SerializerMethodField()

    class Meta:
        model = Enrollment
        fields = [
            'id', 'student', 'course_class',
            'lecture_session', 'tutorial_session', 'lab_session',
            'grades', 'final_percentage', 'course_grade_points', 
            'cohort_stats', # <--- Add it here
            'created_at', 'updated_at'
        ]

    def get_cohort_stats(self, obj):
        # 1. Fetch all enrollments for THIS specific course class (e.g., all students in CC#217)
        # We use prefetch_related to avoid hammering the database.
        peer_enrollments = Enrollment.objects.filter(
            course_class=obj.course_class
        ).prefetch_related('grades')

        # 2. Extract the final percentages (ignoring students who have 0 grades so far)
        percentages = [
            float(peer.final_percentage) 
            for peer in peer_enrollments 
            if peer.grades.exists()
        ]

        if not percentages:
            return None

        # 3. Calculate the math
        return {
            "average": round(statistics.mean(percentages), 1),
            "median": round(statistics.median(percentages), 1),
            "highest": max(percentages),
            "lowest": min(percentages),
            "total_students": len(percentages),
            # Bonus: Let's send a distribution array so Claude can draw a Bar Chart!
            # Counts how many students got an A, B, C, D, or F
            "distribution": {
                "A": len([p for p in percentages if p >= 93]),
                "A-": len([p for p in percentages if 89 <= p < 93]),
                "B+": len([p for p in percentages if 84 <= p < 89]),
                "B": len([p for p in percentages if 79 <= p < 84]),
                "C+": len([p for p in percentages if 74 <= p < 79]),
                "C": len([p for p in percentages if 69 <= p < 74]),
                "D+": len([p for p in percentages if 64 <= p < 69]),
                "D": len([p for p in percentages if 60 <= p < 64]),
                "F": len([p for p in percentages if p < 60]),
            }
        }
    

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

    class Meta:
        model  = AttendanceRecord
        fields = [
            "id", "student", "session",
            "course_code", "course_title", "session_type",
            "week", "status",
            "created_at", "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]