from rest_framework import serializers
from academics.models import StudyGroup, CourseClass


class EnrollRequestSerializer(serializers.Serializer):
    """Validates a self-service enroll/unenroll request: exactly one of study_group_id or course_class_id."""

    study_group_id = serializers.PrimaryKeyRelatedField(
        queryset=StudyGroup.objects.all(), source="study_group", required=False
    )
    course_class_id = serializers.PrimaryKeyRelatedField(
        queryset=CourseClass.objects.all(), source="course_class", required=False
    )

    def validate(self, attrs: dict) -> dict:
        study_group = attrs.get("study_group")
        course_class = attrs.get("course_class")
        if not study_group and not course_class:
            raise serializers.ValidationError("Provide either study_group_id or course_class_id.")
        if study_group and course_class:
            raise serializers.ValidationError("Provide only one of study_group_id or course_class_id, not both.")
        return attrs


class SessionDetailSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    day = serializers.CharField()
    period = serializers.CharField()
    room_code = serializers.CharField()
    room_name = serializers.CharField()


class AvailableCourseClassSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    course_code = serializers.CharField()
    course_title = serializers.CharField()
    coordinator_name = serializers.CharField(allow_null=True)
    lecture = SessionDetailSerializer(allow_null=True)    
    tutorial = SessionDetailSerializer(allow_null=True)
    lab = SessionDetailSerializer(allow_null=True)
    is_enrolled = serializers.BooleanField(default=False)



class AvailableStudyGroupSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    number = serializers.IntegerField()
    is_member = serializers.BooleanField()
    course_classes = AvailableCourseClassSerializer(many=True)
    is_scheduled = serializers.BooleanField()

