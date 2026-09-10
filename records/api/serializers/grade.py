from rest_framework import serializers
from records.models import GradeEntry


class GradeEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model  = GradeEntry
        fields = [
            "id", "enrollment", "component", "score",
            "created_at", "updated_at",
        ]
