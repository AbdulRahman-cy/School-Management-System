from django.db import models
from users.models import TimestampedModel


class CourseClass(TimestampedModel):
    course      = models.ForeignKey(
        "academics.Course",
        on_delete=models.PROTECT,
        related_name="classes",
    )
    term        = models.ForeignKey(
        "academics.Term",
        on_delete=models.PROTECT,
        related_name="classes",
    )
    coordinator = models.ForeignKey(
        "users.TeacherProfile",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="coordinated_classes",
    )

    disciplines = models.ManyToManyField(
        "academics.Discipline",
        blank=True,
        related_name="course_classes",
    )

    #ie: Signals and Systems — Spring 2026 not Signals and Systems entirely because student might take it in different terms if they fail or want to improve their grade.
    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["course", "term"], name="unique_course_per_term")
        ]

    def __str__(self):
        return f"{self.course.code} / {self.term.name}"


class ClassSession(TimestampedModel):
    class SessionType(models.TextChoices):
        LECTURE  = "LECTURE",  "Lecture"
        TUTORIAL = "TUTORIAL", "Tutorial"
        LAB      = "LAB",      "Lab"

    class DayOfWeek(models.IntegerChoices):
        SATURDAY  = 0, "Saturday"
        SUNDAY    = 1, "Sunday"
        MONDAY    = 2, "Monday"
        TUESDAY   = 3, "Tuesday"
        WEDNESDAY = 4, "Wednesday"
        THURSDAY  = 5, "Thursday"
        FRIDAY    = 6, "Friday"


    course_class = models.ForeignKey(CourseClass, on_delete=models.CASCADE, related_name="sessions")
    session_type = models.CharField(max_length=10, choices=SessionType.choices)
    instructor   = models.ForeignKey(
        "users.TeacherProfile",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="taught_sessions",
    )
    day_of_week  = models.IntegerField(choices=DayOfWeek.choices)
    start_time = models.TimeField(default="08:00")
    end_time   = models.TimeField(default="09:30")
    location     = models.CharField(max_length=100)
    capacity     = models.PositiveIntegerField()

    def __str__(self):
        return (
            f"{self.course_class} | {self.get_session_type_display()} | "
            f"{self.get_day_of_week_display()} {self.start_time} - {self.end_time}"
        )