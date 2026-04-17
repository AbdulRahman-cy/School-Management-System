from rest_framework import serializers
from django.core.exceptions import ValidationError as DjangoValidationError
from records.models import Enrollment, GradeEntry

class GradeEntrySerializer(serializers.ModelSerializer):
    # Expose the property method as a read-only field
    weighted_score = serializers.DecimalField(
        max_digits=7, 
        decimal_places=4, 
        read_only=True
    )

    class Meta:
        model = GradeEntry
        fields = [
            'id', 
            'enrollment', 
            'component', 
            'weight', 
            'score', 
            'weighted_score', 
            'created_at', 
            'updated_at'
        ]


class EnrollmentSerializer(serializers.ModelSerializer):
    grades = GradeEntrySerializer(many=True, read_only=True)
    
    # Exposing the database math to the frontend
    final_percentage = serializers.ReadOnlyField()
    course_grade_points = serializers.ReadOnlyField()

    class Meta:
        model = Enrollment
        fields = [
            'id', 'student', 'course_class',
            'lecture_session', 'tutorial_session', 'lab_session',
            'grades', 
            'final_percentage', 
            'course_grade_points', 
            'created_at', 'updated_at'
        ]

    def validate(self, data):
        # 1. Boilerplate: Tell DRF to run your model's clean() method
        instance = Enrollment(**data) if not self.instance else self.instance
        if self.instance:
            for attr, value in data.items():
                setattr(instance, attr, value)

        # 2. Boilerplate: Catch the error and return it cleanly
        try:
            instance.clean()
        except DjangoValidationError as e:
            raise serializers.ValidationError(e.message_dict if hasattr(e, 'message_dict') else e.messages)

        return data