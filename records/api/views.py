from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter
from .permissions import IsAdminOrReadOnly
from records.models import Enrollment, GradeEntry
from .serializers import EnrollmentSerializer, GradeEntrySerializer

class EnrollmentViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows Enrollments to be viewed or edited.
    """
    serializer_class = EnrollmentSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    
    # Allows fetching /api/enrollments/?student=5 or ?course_class=12
    filterset_fields = ['student', 'course_class']
    ordering_fields = ['created_at']


    def get_queryset(self):
        # Optimization: prefetch 'grades' because the serializer nests them.
        # select_related for foreign keys to avoid massive query bloat.
        return Enrollment.objects.all().select_related(
            'student', 
            'course_class'
        ).prefetch_related(
            'grades'
        )


class GradeEntryViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows Grade Entries to be viewed or edited.
    """
    serializer_class = GradeEntrySerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    
    # Allows fetching /api/grades/?enrollment=3
    filterset_fields = ['enrollment']
    ordering_fields = ['created_at', 'score']


    def get_queryset(self):
        return GradeEntry.objects.all().select_related('enrollment')