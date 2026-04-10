from django.db import models
from users.models import TimestampedModel


class Department(TimestampedModel):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=20, unique=True)

    def __str__(self):
        return f"{self.code} — {self.name}"


class Discipline(TimestampedModel):
    class ProgramType(models.TextChoices):
        GSP = "GSP", "General Scientific Program"
        SSP = "SSP", "Specialised Scientific Program"

    name         = models.CharField(max_length=255)
    code         = models.CharField(max_length=20, unique=True)
    department   = models.ForeignKey(Department, on_delete=models.PROTECT, related_name="disciplines")
    program_type = models.CharField(max_length=3, choices=ProgramType.choices)

    def __str__(self):
        return f"{self.code} — {self.name}"


class Term(TimestampedModel):
    name       = models.CharField(max_length=100, unique=True)
    start_date = models.DateField()
    end_date   = models.DateField()
    is_active  = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        if self.is_active:
            Term.objects.exclude(pk=self.pk).update(is_active=False)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ["-start_date"]


class Course(TimestampedModel):
    class CourseType(models.TextChoices):
        CORE     = "CORE",     "Core"
        ELECTIVE = "ELECTIVE", "Elective"

    code        = models.CharField(max_length=20, unique=True)
    title       = models.CharField(max_length=255)
    credits     = models.PositiveSmallIntegerField()
    course_type = models.CharField(max_length=10, choices=CourseType.choices, default=CourseType.CORE)
    department  = models.ForeignKey(
        Department,
        on_delete=models.PROTECT,
        related_name="courses",
    )

    def __str__(self):
        return f"{self.code} — {self.title}"
