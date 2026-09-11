from rest_framework import serializers

class LiveCapacitiesRequestSerializer(serializers.Serializer):
    class_ids = serializers.CharField()

    def validate_class_ids(self, value):
        try:
            ids = [int(x) for x in value.split(",") if x.strip()]
        except ValueError:
            raise serializers.ValidationError("class_ids must be a comma-separated list of integers.")
        if not ids:
            raise serializers.ValidationError("class_ids must contain at least one integer.")
        if len(ids) > 100:
            raise serializers.ValidationError("Too many class_ids in a single request.")
        return ids