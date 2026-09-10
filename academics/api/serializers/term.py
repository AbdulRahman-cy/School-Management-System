from rest_framework import serializers
from academics.models import Term


class TermSerializer(serializers.ModelSerializer):
    class Meta:
        model            = Term
        fields           = ["id", "name", "start_date", "end_date", "is_active", "created_at", "updated_at"]
        read_only_fields = ["is_active"]
