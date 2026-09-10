from django.db import transaction, IntegrityError
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from academics.models import StudyGroup, CourseClass
from academics.api.serializers import (
    CohortBulkCreateSerializer,
    CohortReadSerializer,
    CohortIdentifierSerializer,
    AddStudyGroupRequestSerializer,
    ScheduleCohortRequestSerializer,
    ScheduleCohortResponseSerializer,
)
from users.api.permissions import IsAdminOrReadOnly
from scheduling.services.cohort_scheduler import (
    CohortSchedulerService, SchedulingError, InfeasibleScheduleError,
)
from scheduling.models import Session


class CohortViewSet(viewsets.GenericViewSet):
    """
    Handles all cohort-level operations (listing, creation, scheduling,
    adding study groups, and deletion). Cohorts are virtual entities
    represented by (discipline, term, year_level) triples.
    """
    permission_classes = [IsAdminOrReadOnly]

    @action(detail=False, methods=["get", "delete"], url_path="cohorts")
    def cohorts(self, request):
        if request.method == "DELETE":
            return self._delete_cohort(request)
        return self._list_cohorts(request)

    def _list_cohorts(self, request):
        qs = (
            StudyGroup.objects
            .select_related("discipline", "discipline__department", "term")
            .prefetch_related("course_classes__course", "course_classes__coordinator__user")
            .order_by("discipline__code", "term__start_date", "year_level", "number")
        )
        term_status = request.query_params.get('term_status', 'active')
        if term_status == 'all':
            pass
        elif term_status == 'past':
            qs = qs.filter(term__is_active=False)
        else:
            qs = qs.filter(term__is_active=True)

        discipline_id = request.query_params.get('discipline_id') or request.query_params.get('discipline')
        if discipline_id:
            try:
                discipline_id = int(discipline_id)
            except (ValueError, TypeError):
                return Response({"detail": "Invalid discipline_id."}, status=status.HTTP_400_BAD_REQUEST)
            qs = qs.filter(discipline_id=discipline_id)

        cohort_map = {}
        for sg in qs:
            key = (sg.discipline_id, sg.term_id, sg.year_level)
            if key not in cohort_map:
                cohort_map[key] = {
                    "discipline": sg.discipline, "term": sg.term, "year_level": sg.year_level,
                    "groups": [], "course_classes": [],
                }
            cohort_map[key]["groups"].append(sg)
            cohort_map[key]["course_classes"].extend(sg.course_classes.all())

        scheduled_class_ids = set(Session.objects.values_list("course_class_id", flat=True).distinct())
        for cohort in cohort_map.values():
            cohort["is_scheduled"] = any(cc.id in scheduled_class_ids for cc in cohort["course_classes"])

        serializer = CohortReadSerializer(list(cohort_map.values()), many=True)
        return Response(serializer.data)

    def _delete_cohort(self, request):
        serializer = CohortIdentifierSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        discipline = serializer.validated_data["discipline_id"]
        term = serializer.validated_data["term_id"]
        year_level = serializer.validated_data["year_level"]

        study_groups = StudyGroup.objects.filter(discipline=discipline, term=term, year_level=year_level)
        if not study_groups.exists():
            return Response({"detail": "No cohort found for the given identifiers."}, status=status.HTTP_404_NOT_FOUND)

        study_groups.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["post"], url_path="bulk-cohort")
    def bulk_create_cohort(self, request):
        serializer = CohortBulkCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # serializer.save() triggers the create() method and returns our dict
        result = serializer.save()

        return Response(
            {
                "message": "Cohort created successfully",
                **result  # Unpacks groups_created, classes_created, etc.
            },
            status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=["post"], url_path="add-group")
    def add_study_group_to_cohort(self, request):
        serializer = AddStudyGroupRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        discipline = data["discipline_id"]
        term = data["term_id"]

        try:
            with transaction.atomic():
                study_group = StudyGroup.objects.create(
                    discipline=discipline, term=term,
                    year_level=data["year_level"], number=data["number"],
                    capacity=data.get("capacity", 50),
                )
                course_ids = (
                    CourseClass.objects
                    .filter(group__discipline=discipline, group__term=term, group__year_level=data["year_level"])
                    .values_list("course_id", flat=True)
                    .distinct()
                )
                CourseClass.objects.bulk_create([
                    CourseClass(course_id=cid, group=study_group, coordinator=None)
                    for cid in course_ids
                ])
        except IntegrityError as exc:
            if "unique_study_group" in str(exc):
                return Response(
                    {"detail": f"Group number {data['number']} already exists for this cohort."},
                    status=status.HTTP_409_CONFLICT,
                )
            raise

        return Response(
            {"message": "Study group added successfully", "id": study_group.pk},
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["post"], url_path="schedule-cohort")
    def schedule_cohort(self, request):
        serializer = ScheduleCohortRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        service = CohortSchedulerService(
            discipline=data["discipline_id"],
            term=data["term_id"],
            year_level=data["year_level"],
            time_limit=data.get("time_limit", 60),
            force=data.get("force", False),
        )

        try:
            result = service.run(dry_run=data.get("dry_run", False))
        except InfeasibleScheduleError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)
        except SchedulingError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        payload = {
            "status": result.status,
            "sessions_created": result.sessions_created,
            "course_classes_scheduled": result.course_classes_scheduled,
            "solve_time_seconds": round(result.solve_time_seconds, 2),
            "dry_run": result.dry_run,
        }
        code = status.HTTP_200_OK if result.dry_run else status.HTTP_201_CREATED
        return Response(ScheduleCohortResponseSerializer(payload).data, status=code)
