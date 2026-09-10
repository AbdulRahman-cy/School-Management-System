from rest_framework import viewsets
from academics.models import Course, Term
from academics.api.serializers import CourseSerializer, CourseFilterSerializer
from users.api.permissions import IsAdminOrReadOnly
from django.db.models import Q
from django.shortcuts import get_object_or_404


class CourseViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    queryset = Course.objects.all()
    serializer_class = CourseSerializer

    def get_queryset(self):
        qs = super().get_queryset()

        filters = CourseFilterSerializer(data=self.request.query_params)
        filters.is_valid(raise_exception=True)
        discipline_id = filters.validated_data.get("discipline_id")
        year_level = filters.validated_data.get("year_level")
        term_id = filters.validated_data.get("term_id")

        if not discipline_id:
            return qs

        blueprint_match = Q(blueprints__discipline_id=discipline_id)
        if year_level:
            blueprint_match &= Q(blueprints__year_level=year_level)
        if term_id:
            term = get_object_or_404(Term, pk=term_id)
            blueprint_match &= Q(blueprints__season=term.season)

        return qs.filter(blueprint_match).distinct()
