from rest_framework import serializers
from academics.models import Course
from .department import DepartmentSerializer


class CourseSerializer(serializers.ModelSerializer):
    department = DepartmentSerializer(read_only=True)

    class Meta:
        model  = Course
        fields = ["id", "code", "title", "credits", "course_type", "department", "created_at", "updated_at"]


class CourseFilterSerializer(serializers.Serializer):
    """
    Query-param contract for GET /academics/courses/.
    discipline_id is the anchor — year_level and term_id only narrow
    the results further if discipline_id is present; without it they're ignored,
    same as before.
    """
    discipline_id = serializers.IntegerField(required=False)
    year_level = serializers.IntegerField(required=False, min_value=1, max_value=4)
    term_id = serializers.IntegerField(required=False)
