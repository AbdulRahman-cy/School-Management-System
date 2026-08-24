from django.db import transaction
from rest_framework import serializers
from academics.models import Department, Discipline, Term, Course, Room, StudyGroup, CourseClass
from users.models import TeacherProfile

class TeacherFilterSerializer(serializers.Serializer):
    department_id = serializers.IntegerField(required=False)

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
        fields = ["id", "discipline", "term", "year_level", "number", "capacity", "created_at", "updated_at"]


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
            "created_at",
            "updated_at",
        ]

    
class StudyGroupInputSerializer(serializers.Serializer):
    number = serializers.IntegerField(min_value=1)
    capacity = serializers.IntegerField(min_value=1, default=50, required=False)

class CohortBulkCreateSerializer(serializers.Serializer):
    discipline_id = serializers.PrimaryKeyRelatedField(queryset=Discipline.objects.all())
    term_id = serializers.PrimaryKeyRelatedField(queryset=Term.objects.all())
    year_level = serializers.IntegerField(min_value=1, max_value=4)
    
    # 1. Array of validated dictionaries
    groups = StudyGroupInputSerializer(many=True, min_length=1)
    
    # 2. Automatically validates all course IDs
    courses = serializers.PrimaryKeyRelatedField(
        queryset=Course.objects.all(), 
        many=True, 
        allow_empty=True
    )
    
    # 3. Automatically validates all teacher IDs in the map
    coordinators = serializers.DictField(
        child=serializers.PrimaryKeyRelatedField(queryset=TeacherProfile.objects.all(), allow_null=True),
        required=False,
        default=dict
    )

    def validate_groups(self, value):
        """Only array-level validation needed: ensure no duplicate group numbers."""
        numbers = [g["number"] for g in value]
        if len(numbers) != len(set(numbers)):
            raise serializers.ValidationError("Duplicate group numbers are not allowed within the same cohort.")
        return value

    # ── Atomic creation ───────────────────────────────────────────────────────

    def create(self, validated_data):
        """
        Atomically creates all StudyGroup and CourseClass instances.

        Returns a summary dict:
            {
                "groups_created": int,
                "classes_created": int,
                "group_ids": [list of new StudyGroup PKs],
                "class_ids":  [list of new CourseClass PKs],
            }
        """
        discipline   = validated_data["discipline_id"]   # resolved Discipline instance
        term         = validated_data["term_id"]          # resolved Term instance
        year_level   = validated_data["year_level"]
        groups_data  = validated_data["groups"]
        courses = validated_data["courses"]
        coordinators = validated_data.get("coordinators", {})

        created_groups  = []
        created_classes = []

        # We don't need pessimistic locks here because we're creating new objects.
        # It doesn't exist yet so it can't be locked.

        with transaction.atomic():
            # ── Step 1: create StudyGroup rows ────────────────────────────────
            # Keep a mapping of group_number → StudyGroup instance so we can
            # look up the right instance when building CourseClass rows.
            group_map: dict[int, StudyGroup] = {}

            for g_data in groups_data:
                number   = int(g_data["number"])
                capacity = int(g_data.get("capacity", 50))

                # .create() triggers full_clean() (if set), save(), and
                # post_save signals — exactly what we want.
                study_group = StudyGroup.objects.create(
                    discipline=discipline,
                    term=term,
                    year_level=year_level,
                    number=number,
                    capacity=capacity,
                )
                # Instead of searching for them in step 2 we map them here
                # O(1) lookup instead of O(N)
                group_map[number] = study_group
                created_groups.append(study_group)

            # ── Step 2: create CourseClass rows ───────────────────────────────
            for course in courses:
                for group_number, study_group in group_map.items():
                    # Coordinator lookup key mirrors the frontend convention:
                    # "{course_id}_{group_number}"
                    coord_key    = f"{course.pk}_{group_number}"
                    coordinator = coordinators.get(coord_key)

                    course_class = CourseClass.objects.create(
                        course=course,
                        group=study_group,
                        coordinator=coordinator,
                    )
                    created_classes.append(course_class)

        return {
            "groups_created": len(created_groups),
            "classes_created": len(created_classes),
            "group_ids":  [sg.pk for sg in created_groups],
            "class_ids":  [cc.pk for cc in created_classes],
        }


# ─── Cohort read serializers (virtual model — grouped in Python) ──────────────

class CohortGroupReadSerializer(serializers.Serializer):
    """Serializes a single StudyGroup as a lightweight group descriptor."""
    id       = serializers.IntegerField()
    number   = serializers.IntegerField()
    capacity = serializers.IntegerField()


class _CoordinatorInlineSerializer(serializers.Serializer):
    id   = serializers.IntegerField()
    name = serializers.SerializerMethodField()

    def get_name(self, obj) -> str:  # obj is TeacherProfile instance
        return obj.user.full_name


class _CourseInlineSerializer(serializers.Serializer):
    id    = serializers.IntegerField()
    code  = serializers.CharField()
    title = serializers.CharField()


class CohortCourseClassReadSerializer(serializers.Serializer):
    """Serializes a CourseClass enriched with its group number and coordinator name."""
    id           = serializers.IntegerField()
    course       = _CourseInlineSerializer()
    group_number = serializers.IntegerField(source="group.number")
    coordinator  = _CoordinatorInlineSerializer(allow_null=True)


class CohortReadSerializer(serializers.Serializer):
    """
    Virtual serializer for a Cohort — a logical grouping of StudyGroups sharing
    the same (discipline, term, year_level) triple.

    Instances are plain dicts built by StudyGroupViewSet.cohorts() rather than
    ORM model instances.
    """
    id             = serializers.SerializerMethodField()
    discipline     = DisciplineSerializer()
    term           = TermSerializer()
    year_level     = serializers.IntegerField()
    groups         = CohortGroupReadSerializer(many=True)
    course_classes = CohortCourseClassReadSerializer(many=True)
    is_scheduled   = serializers.BooleanField()

    def get_id(self, obj) -> str:
        return f"{obj['discipline'].id}_{obj['term'].id}_{obj['year_level']}"

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



class AddStudyGroupRequestSerializer(serializers.Serializer):
    discipline_id = serializers.PrimaryKeyRelatedField(
        queryset=Discipline.objects.all(),
        error_messages={"does_not_exist": "The selected discipline does not exist."},
    )
    term_id = serializers.PrimaryKeyRelatedField(
        queryset=Term.objects.all(),
        error_messages={"does_not_exist": "The selected term does not exist."},
    )
    year_level = serializers.IntegerField(min_value=1, max_value=4)
    number = serializers.IntegerField(min_value=1)
    capacity = serializers.IntegerField(min_value=1, default=50, required=False)


class CohortIdentifierSerializer(serializers.Serializer):
    discipline_id = serializers.PrimaryKeyRelatedField(
        queryset=Discipline.objects.all(),
        error_messages={"does_not_exist": "No discipline with this ID."},
    )
    term_id = serializers.PrimaryKeyRelatedField(
        queryset=Term.objects.all(),
        error_messages={"does_not_exist": "No term with this ID."},
    )
    year_level = serializers.IntegerField(min_value=1, max_value=4)


class ScheduleCohortRequestSerializer(serializers.Serializer):
    discipline_id = serializers.PrimaryKeyRelatedField(
        queryset=Discipline.objects.all(),
        error_messages={"does_not_exist": "The selected discipline does not exist."},
    )
    term_id = serializers.PrimaryKeyRelatedField(
        queryset=Term.objects.all(),
        error_messages={"does_not_exist": "The selected term does not exist."},
    )
    year_level = serializers.IntegerField(min_value=1, max_value=4)
    time_limit = serializers.IntegerField(min_value=5, max_value=300, default=60, required=False)
    dry_run = serializers.BooleanField(default=False, required=False)
    force = serializers.BooleanField(default=False, required=False)


class ScheduleCohortResponseSerializer(serializers.Serializer):
    status = serializers.CharField()
    sessions_created = serializers.IntegerField()
    course_classes_scheduled = serializers.IntegerField()
    solve_time_seconds = serializers.FloatField()
    dry_run = serializers.BooleanField()


class StudyGroupCapacitySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    capacity = serializers.IntegerField()
    remaining = serializers.IntegerField()