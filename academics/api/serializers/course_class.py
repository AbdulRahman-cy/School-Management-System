from rest_framework import serializers
from academics.models import CourseClass, Course, StudyGroup
from scheduling.models import Session
from users.models import TeacherProfile
from .course import CourseSerializer
from .study_group import StudyGroupSerializer


class CourseClassSerializer(serializers.ModelSerializer):
    course = CourseSerializer(read_only=True)
    group = StudyGroupSerializer(read_only=True)

    course_id = serializers.PrimaryKeyRelatedField(
        queryset=Course.objects.all(), source='course', write_only=True, required=False
    )
    group_id = serializers.PrimaryKeyRelatedField(
        queryset=StudyGroup.objects.all(), source='group', write_only=True, required=False
    )
    coordinator_id = serializers.PrimaryKeyRelatedField(
        queryset=TeacherProfile.objects.all(),
        source='coordinator',
        allow_null=True,
        required=False
    )

    class Meta:
        model = CourseClass
        fields = [
            "id",
            "course",
            "course_id",
            "group",
            "group_id",
            "coordinator_id",
            "schedule_dirty",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["schedule_dirty"]

    def update(self, instance: CourseClass, validated_data: dict) -> CourseClass:
        # coordinator is a real scheduling constraint (see CohortSchedulerService's
        # locked_teacher_slots / "no two lectures for the same teacher" rule), so
        # reassigning it on a class that's already been scheduled can invalidate
        # the existing room/timeslot solution. Existence-based "is it scheduled"
        # checks can't see this — the Session rows are still there, just wrong —
        # so flag it explicitly for the cohort list to surface as "needs reschedule".
        if "coordinator" in validated_data and validated_data["coordinator"] != instance.coordinator:
            if instance.sessions.filter(session_type=Session.SessionType.LECTURE).exists():
                validated_data["schedule_dirty"] = True
        return super().update(instance, validated_data)
