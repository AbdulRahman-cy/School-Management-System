from django.db import models
from django.core.exceptions import ValidationError


# ─────────────────────────────────────────────────────────────
# Abstract base
# ─────────────────────────────────────────────────────────────

class TimestampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


# ─────────────────────────────────────────────────────────────
# Department
# ─────────────────────────────────────────────────────────────

class Department(TimestampedModel):
    code = models.CharField(max_length=10, unique=True)
    name = models.CharField(max_length=200)

    def __str__(self):
        return f"{self.code} — {self.name}"


# ─────────────────────────────────────────────────────────────
# Discipline
# ─────────────────────────────────────────────────────────────

class Discipline(TimestampedModel):

    class ProgramType(models.TextChoices):
        GSP = "GSP", "General Specialization Program"
        SSP = "SSP", "Specific Specialization Program"

    code         = models.CharField(max_length=20, unique=True)
    name         = models.CharField(max_length=200)
    program_type = models.CharField(max_length=10, choices=ProgramType.choices)
    department   = models.ForeignKey(
        Department,
        on_delete=models.PROTECT,
        related_name="disciplines",
    )

    def __str__(self):
        return f"{self.code} ({self.program_type})"


# ─────────────────────────────────────────────────────────────
# Term
# ─────────────────────────────────────────────────────────────

class Term(TimestampedModel):
    name       = models.CharField(max_length=100, unique=True)
    start_date = models.DateField()
    end_date   = models.DateField()
    is_active  = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        if self.is_active:
            Term.objects.exclude(pk=self.pk).filter(is_active=True).update(is_active=False)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


# ─────────────────────────────────────────────────────────────
# Course
# ─────────────────────────────────────────────────────────────

class Course(TimestampedModel):

    class CourseType(models.TextChoices):
        CORE     = "CORE",     "Core"
        ELECTIVE = "ELECTIVE", "Elective"

    code        = models.CharField(max_length=20, unique=True)
    title       = models.CharField(max_length=200)
    credits     = models.PositiveSmallIntegerField()
    course_type = models.CharField(
        max_length=10,
        choices=CourseType.choices,
        default=CourseType.CORE,
    )
    department  = models.ForeignKey(
        Department,
        on_delete=models.PROTECT,
        related_name="courses",
    )
    lec_sessions = models.PositiveSmallIntegerField(default=1)
    tut_sessions = models.PositiveSmallIntegerField(default=1)
    lab_sessions = models.PositiveSmallIntegerField(default=1)

    def __str__(self):
        return f"{self.code} — {self.title}"


# ─────────────────────────────────────────────────────────────
# Room
# ─────────────────────────────────────────────────────────────

class Room(TimestampedModel):

    class RoomType(models.TextChoices):
        LECTURE = "LECTURE", "Lecture Hall"
        LAB     = "LAB",     "Laboratory"
        SEMINAR = "SEMINAR", "Seminar Room"

    code       = models.CharField(max_length=20, unique=True)
    name       = models.CharField(max_length=100)
    capacity   = models.PositiveIntegerField()
    room_type  = models.CharField(max_length=10, choices=RoomType.choices)
    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="rooms",
    )
    is_active  = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.code} ({self.room_type}, cap {self.capacity})"


# ─────────────────────────────────────────────────────────────
# StudyGroup
# ─────────────────────────────────────────────────────────────

class StudyGroup(TimestampedModel):
    discipline = models.ForeignKey(
        Discipline,
        on_delete=models.PROTECT,
        related_name="groups",
    )
    term       = models.ForeignKey(
        Term,
        on_delete=models.PROTECT,
        related_name="groups",
    )
    year_level = models.PositiveSmallIntegerField()   # 1 – 4
    number     = models.PositiveSmallIntegerField()   # 1 – N within cohort

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["discipline", "term", "year_level", "number"],
                name="unique_study_group",
            )
        ]

    def __str__(self):
        return (
            f"{self.discipline.code} / "
            f"Y{self.year_level} / "
            f"G{self.number} / "
            f"{self.term.name}"
        )


# ─────────────────────────────────────────────────────────────
# CourseClass
# ─────────────────────────────────────────────────────────────

class CourseClass(TimestampedModel):
    course      = models.ForeignKey(
        Course,
        on_delete=models.PROTECT,
        related_name="classes",
    )
    term        = models.ForeignKey(
        Term,
        on_delete=models.PROTECT,
        related_name="classes",
    )
    group       = models.ForeignKey(
        StudyGroup,
        on_delete=models.PROTECT,
        related_name="course_classes",
    )
    coordinator = models.ForeignKey(
        "users.TeacherProfile",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="coordinated_classes",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["course", "term", "group"],
                name="unique_course_term_group",
            )
        ]

    def clean(self):
        # group must belong to the same term as the class
        if self.group_id and self.term_id:
            if self.group.term_id != self.term_id:
                raise ValidationError(
                    "The study group's term must match the course class term."
                )

    def __str__(self):
        return f"{self.course.code} / {self.group}"
    


            
