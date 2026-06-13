from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter
from .permissions import IsAdminOrReadOnly
from records.models import Enrollment
from .serializers import EnrollmentSerializer


class EnrollmentViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows Enrollments to be viewed or edited.
    """
    serializer_class = EnrollmentSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    
    filterset_fields = ['student', 'course_class']
    ordering_fields = ['created_at']

    def get_queryset(self):
        
        queryset = Enrollment.objects.select_related(
            'student', 
            'course_class'
        )
        # 🚨 REMOVED .prefetch_related('grades') HERE 🚨
        
        term_status = self.request.query_params.get('term_status')

        if term_status == 'past':
            queryset = queryset.filter(course_class__term__is_active=False)
        elif term_status == 'all':
            pass 
        else:
            queryset = queryset.filter(course_class__term__is_active=True)

        return queryset