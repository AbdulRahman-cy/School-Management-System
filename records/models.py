from django.db import models
from django.core.exceptions import ValidationError
from decimal import Decimal
from users.models import TimestampedModel


class Enrollment(TimestampedModel):
    student      = models.ForeignKey(
        "users.StudentProfile",
        on_delete=models.CASCADE,
        related_name="enrollments",
    )
    course_class = models.ForeignKey(
        "scheduling.CourseClass",
        on_delete=models.CASCADE,
        related_name="enrollments",
    )
    lecture_session = models.ForeignKey(
        "scheduling.ClassSession",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="lecture_enrollments",
        limit_choices_to={"session_type": "LECTURE"},
    )
    tutorial_session = models.ForeignKey(
        "scheduling.ClassSession",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="tutorial_enrollments",
        limit_choices_to={"session_type": "TUTORIAL"},
    )
    lab_session = models.ForeignKey(
        "scheduling.ClassSession",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="lab_enrollments",
        limit_choices_to={"session_type": "LAB"},
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["student", "course_class"], name="unique_student_enrollment")
        ]

    def clean(self):
        session_fields = {
            "lecture_session":  self.lecture_session,
            "tutorial_session": self.tutorial_session,
            "lab_session":      self.lab_session,
        }
        errors = {}
        for field_name, session in session_fields.items():
            if session and session.course_class_id != self.course_class_id:
                errors[field_name] = (
                    f"This session does not belong to {self.course_class}. "
                    "Only sessions from the enrolled CourseClass are allowed."
                )
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.student} → {self.course_class}"


class GradeEntry(TimestampedModel):
    enrollment = models.ForeignKey(Enrollment, on_delete=models.CASCADE, related_name="grades")
    component  = models.CharField(max_length=100)
    weight     = models.DecimalField(
        max_digits=5, decimal_places=4,
        help_text="Decimal weight, e.g. 0.30 for 30%",
    )
    score      = models.DecimalField(
        max_digits=5, decimal_places=2,
        help_text="Score out of 100",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["enrollment", "component"],
                name="unique_grade_component_per_enrollment",
            )
        ]

    @property
    def weighted_score(self) -> Decimal:
        return self.score * self.weight

    def __str__(self):
        return f"{self.enrollment} | {self.component}: {self.score} (×{self.weight})"