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

class RoomViewSet(viewsets.ModelViewSet):   
    queryset = Room.objects.all()
    serializer_class = RoomSerializer
  

class StudyGroupViewSet(viewsets.ModelViewSet):
    queryset = StudyGroup.objects.all()
    serializer_class = StudyGroupSerializer

    @action(detail=False, methods=["get"], url_path="cohorts")
    def cohorts(self, request):
        """
        GET /api/academics/groups/cohorts/

        Returns all StudyGroups aggregated into logical Cohort objects.
        A Cohort groups StudyGroups that share the same (discipline, term, year_level).
        """
        # Single query with all relations needed for serialization
        qs = (
            StudyGroup.objects
            .select_related("discipline", "discipline__department", "term")
            .prefetch_related(
                "course_classes__course",
                "course_classes__coordinator__user",
            )
            .order_by("discipline__code", "term__start_date", "year_level", "number")
        )

        # Group into cohort dicts keyed by (discipline_id, term_id, year_level)
        cohort_map: dict[tuple, dict] = {}
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


class CourseClassViewSet(viewsets.ModelViewSet):
    queryset = CourseClass.objects.all()
    serializer_class = CourseClassSerializer
