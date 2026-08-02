from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from academics.api.permissions import IsAdminOrReadOnly
from academics.models import Department, Discipline, StudyGroup, Term, Course, Room, CourseClass
from .serializers import (
    CourseSerializer,
    DepartmentSerializer,
    DisciplineSerializer,
    TermSerializer,
    RoomSerializer,
    StudyGroupSerializer,
    CourseClassSerializer,
    CohortBulkCreateSerializer,
    CohortReadSerializer,
)

class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
   

class DisciplineViewSet(viewsets.ModelViewSet):
    queryset = Discipline.objects.all()
    serializer_class = DisciplineSerializer
    

class TermViewSet(viewsets.ModelViewSet):
    queryset = Term.objects.all()
    serializer_class = TermSerializer


class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        discipline_id = self.request.query_params.get("discipline") or self.request.query_params.get("discipline_id")
        year_level = self.request.query_params.get("year_level")
        term_id = self.request.query_params.get("term") or self.request.query_params.get("term_id")

        if discipline_id and year_level and term_id:
            try:
                term = Term.objects.get(id=term_id)
                season = term.season
                qs = qs.filter(
                    blueprints__discipline_id=discipline_id,
                    blueprints__year_level=year_level,
                    blueprints__season=season,
                ).distinct()
            except (Term.DoesNotExist, ValueError):
                return qs.none()
        elif discipline_id and year_level:
            qs = qs.filter(
                blueprints__discipline_id=discipline_id,
                blueprints__year_level=year_level,
            ).distinct()
        elif discipline_id:
            qs = qs.filter(blueprints__discipline_id=discipline_id).distinct()
        return qs

class RoomViewSet(viewsets.ModelViewSet):   
    queryset = Room.objects.all()
    serializer_class = RoomSerializer
  

class StudyGroupViewSet(viewsets.ModelViewSet):
    queryset = StudyGroup.objects.all()
    serializer_class = StudyGroupSerializer

    @action(detail=False, methods=["get"], url_path="cohorts")
    def cohorts(self, request):
        # 1. Base query with optimizations
        qs = (
            StudyGroup.objects
            .select_related("discipline", "discipline__department", "term")
            .prefetch_related(
                "course_classes__course",
                "course_classes__coordinator__user",
            )
            .order_by("discipline__code", "term__start_date", "year_level", "number")
        )

        # 2. Apply the term_status filter exactly like EnrollmentViewSet
        term_status = request.query_params.get('term_status', 'active')
        
        if term_status == 'all':
            pass
        elif term_status == 'past':
            qs = qs.filter(term__is_active=False)
        else:
            # Default to only showing the active term
            qs = qs.filter(term__is_active=True)

        # 3. Intercept discipline_id query param
        discipline_id = request.query_params.get('discipline_id') or request.query_params.get('discipline')
        if discipline_id:
            qs = qs.filter(discipline_id=discipline_id)

        # 4. Proceed with the standard grouping logic
        cohort_map = {}
        for sg in qs:
            key = (sg.discipline_id, sg.term_id, sg.year_level)
            if key not in cohort_map:
                cohort_map[key] = {
                    "discipline":     sg.discipline,
                    "term":           sg.term,
                    "year_level":     sg.year_level,
                    "groups":         [],
                    "course_classes": [],
                }
            cohort_map[key]["groups"].append(sg)
            cohort_map[key]["course_classes"].extend(sg.course_classes.all())

        cohort_list = list(cohort_map.values())
        serializer = CohortReadSerializer(cohort_list, many=True)
        return Response(serializer.data)

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

    @action(
        detail=False,
        methods=["delete"],
        url_path=r"cohorts/(?P<composite_id>[^/.]+)",
    )
    def delete_cohort(self, request, composite_id: str):
        """
        DELETE /api/academics/groups/cohorts/{discipline_id}_{term_id}_{year_level}/

        Atomically deletes all CourseClass rows (PROTECT FK must go first),
        then deletes all StudyGroup rows for the matching cohort.
        Returns 204 on success or 404 if no groups match.
        """
        # Parse composite key: "{discipline_id}_{term_id}_{year_level}"
        try:
            parts = composite_id.split("_")
            discipline_id = int(parts[0])
            term_id       = int(parts[1])
            year_level    = int(parts[2])
        except (ValueError, IndexError):
            return Response(
                {"detail": "Invalid composite_id format. Expected '{discipline_id}_{term_id}_{year_level}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        study_groups = StudyGroup.objects.filter(
            discipline_id=discipline_id,
            term_id=term_id,
            year_level=year_level,
        )

        if not study_groups.exists():
            return Response(
                {"detail": "No cohort found for the given composite ID."},
                status=status.HTTP_404_NOT_FOUND,
            )

        with transaction.atomic():
            # Delete dependent CourseClass rows first to avoid PROTECT violation
            CourseClass.objects.filter(group__in=study_groups).delete()
            study_groups.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)


class CourseClassViewSet(viewsets.ModelViewSet):
    queryset = CourseClass.objects.all()
    serializer_class = CourseClassSerializer
