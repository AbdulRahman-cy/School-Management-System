from rest_framework import serializers
from academics.models import Department, Discipline, Term, Course, Room, StudyGroup, CourseClass


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Department
        fields = ["id", "name", "code", "created_at", "updated_at"]


class DisciplineSerializer(serializers.ModelSerializer):
    department = DepartmentSerializer(read_only=True)

    class Meta:
        model  = Discipline
        fields = ["id", "name", "code", "department", "program_type", "created_at", "updated_at"]


class TermSerializer(serializers.ModelSerializer):
    class Meta:
        model            = Term
        fields           = ["id", "name", "start_date", "end_date", "is_active", "created_at", "updated_at"]
        read_only_fields = ["is_active"]


class CourseSerializer(serializers.ModelSerializer):
    department = DepartmentSerializer(read_only=True)
    
    class Meta:
        model  = Course
        fields = ["id", "code", "title", "credits", "course_type", "department", "created_at", "updated_at"]


class RoomSerializer(serializers.ModelSerializer):
    department = DepartmentSerializer(read_only=True)

    class Meta:
        model  = Room
        fields = ["id", "code", "name", "capacity", "room_type", "department", "is_active", "created_at", "updated_at"]


class StudyGroupSerializer(serializers.ModelSerializer):
    discipline = DisciplineSerializer(read_only=True)
    term       = TermSerializer(read_only=True)

    class Meta:
        model  = StudyGroup
        fields = ["id", "discipline", "term", "year_level", "number", "created_at", "updated_at"]


class CourseClassSerializer(serializers.ModelSerializer):
    course  = CourseSerializer(read_only=True)
    term = TermSerializer(read_only=True)
    group = StudyGroupSerializer(read_only=True)

    class Meta:
        model  = CourseClass
        fields = [
            "id",
            "course", 
            "term",   
            "group",  
            "created_at", "updated_at",
        ]

    def validate(self, data):
        group = data.get("group") or getattr(self.instance, "group", None)
        term  = data.get("term")  or getattr(self.instance, "term",  None)
        if group and term and group.term_id != term.pk:
            raise serializers.ValidationError(
                {"group": "The study group's term must match the course class term."}
            )
        return data