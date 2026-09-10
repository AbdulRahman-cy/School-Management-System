from rest_framework import serializers
from academics.models import StudyGroup


class EnrollRequestSerializer(serializers.Serializer):
    study_group_id = serializers.PrimaryKeyRelatedField(
        queryset=StudyGroup.objects.all(), source="study_group",
    )


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


class AvailableStudyGroupSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    number = serializers.IntegerField()
    capacity = serializers.IntegerField()
    remaining = serializers.IntegerField()
    is_member = serializers.BooleanField()
    course_classes = AvailableCourseClassSerializer(many=True)
    is_scheduled = serializers.BooleanField()
