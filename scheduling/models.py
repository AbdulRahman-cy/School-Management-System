from django.db import models
from users.models import TimestampedModel


from django.db import models
from users.models import TimestampedModel

class CourseClass(TimestampedModel):
    
    # 1. ADD THE CHOICES CLASS
    class SectionGroup(models.IntegerChoices):
        GROUP_1 = 1, "Group 1"
        GROUP_2 = 2, "Group 2"
        GROUP_3 = 3, "Group 3"
        GROUP_4 = 4, "Group 4"
        GROUP_5 = 5, "Group 5"
        GROUP_6 = 6, "Group 6"
        GROUP_7 = 7, "Group 7"
        GROUP_8 = 8, "Group 8"
        GROUP_9 = 9, "Group 9"
        GROUP_10 = 10, "Group 10"

    course = models.ForeignKey(
        "academics.Course",
        on_delete=models.PROTECT,
        related_name="classes",
    )
    term = models.ForeignKey(
        "academics.Term",
        on_delete=models.PROTECT,
        related_name="classes",
    )
    
    # 2. UPDATE THE SECTION FIELD
    section = models.IntegerField(
        choices=SectionGroup.choices,
        default=SectionGroup.GROUP_1,
        help_text="Select the group/section identifier for this class batch."
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

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["course", "term", "section"], 
                name="unique_course_term_section"
            )
        ]

    def __str__(self):
        # 3. USE get_FOO_display() TO SHOW THE HUMAN-READABLE NAME ("Group 1" instead of "1")
        return f"{self.course.code} / {self.term.name} / {self.get_section_display()}"

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