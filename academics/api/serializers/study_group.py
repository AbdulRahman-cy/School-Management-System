from rest_framework import serializers
from academics.models import StudyGroup
from .discipline import DisciplineSerializer
from .term import TermSerializer


class StudyGroupSerializer(serializers.ModelSerializer):
    discipline = DisciplineSerializer(read_only=True)
    term       = TermSerializer(read_only=True)

    class Meta:
        model  = StudyGroup
        fields = ["id", "discipline", "term", "year_level", "number", "capacity", "created_at", "updated_at"]


class StudyGroupCapacitySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    capacity = serializers.IntegerField()
    remaining = serializers.IntegerField()


class StudyGroupInputSerializer(serializers.Serializer):
    number = serializers.IntegerField(min_value=1)
    capacity = serializers.IntegerField(min_value=1, default=50, required=False)
