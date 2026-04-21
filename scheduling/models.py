from django.db import models
from django.core.exceptions import ValidationError

from academics.models import TimestampedModel


# ─────────────────────────────────────────────────────────────
# Timeslot
# ─────────────────────────────────────────────────────────────

class Timeslot(TimestampedModel):

    class Day(models.IntegerChoices):
        SATURDAY  = 0, "Saturday"
        SUNDAY    = 1, "Sunday"
        MONDAY    = 2, "Monday"
        TUESDAY   = 3, "Tuesday"
        WEDNESDAY = 4, "Wednesday"
        THURSDAY  = 5, "Thursday"

    class Period(models.IntegerChoices):
        PERIOD_1 = 1, "08:00 – 09:30"
        PERIOD_2 = 2, "09:45 – 11:15"
        PERIOD_3 = 3, "11:30 – 13:00"
        PERIOD_4 = 4, "13:30 – 15:00"
        PERIOD_5 = 5, "15:15 – 16:45"

    day    = models.IntegerField(choices=Day.choices)
    period = models.IntegerField(choices=Period.choices)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["day", "period"],
                name="unique_timeslot",
            )
        ]
        ordering = ["day", "period"]

    def __str__(self):
        return f"{self.get_day_display()} / {self.get_period_display()}"


# ─────────────────────────────────────────────────────────────
# Session
# ─────────────────────────────────────────────────────────────

class Session(TimestampedModel):

    class SessionType(models.TextChoices):
        LECTURE  = "LECTURE",  "Lecture"
        LAB      = "LAB",      "Lab"
        TUTORIAL = "TUTORIAL", "Tutorial"

    course_class = models.ForeignKey(
        "academics.CourseClass",
        on_delete=models.CASCADE,
        related_name="sessions",
    )
    room         = models.ForeignKey(
        "academics.Room",
        on_delete=models.PROTECT,
        related_name="sessions",
    )
    timeslot     = models.ForeignKey(
        Timeslot,
        on_delete=models.PROTECT,
        related_name="sessions",
    )
    session_type = models.CharField(
        max_length=10,
        choices=SessionType.choices,
        default=SessionType.LECTURE,
    )


    def clean(self):
        errors = {}

        # Room type must match session type
        if self.room_id and self.session_type:
            room_type = self.room.room_type
            if self.session_type == self.SessionType.LAB and room_type != "LAB":
                errors["room"] = "Lab sessions must be assigned to a lab room."
            if self.session_type == self.SessionType.LECTURE and room_type == "LAB":
                errors["room"] = "Lecture sessions cannot be assigned to a lab room."

        # Room capacity must fit the group (we don't track group size yet,
        # but the hook is here for when enrollment counts are available)

        # Room must not be owned by a different discipline's department
        if self.room_id and self.course_class_id:
            room_dept = self.room.department
            group_dept = self.course_class.group.discipline.department
            if room_dept is not None and room_dept != group_dept:
                errors["room"] = (
                    f"Room {self.room.code} belongs to {room_dept.code} "
                    f"but this group is from {group_dept.code}."
                )

        if errors:
            raise ValidationError(errors)

    def __str__(self):
        return (
            f"{self.course_class} / "
            f"{self.session_type} / "
            f"{self.timeslot} / "
            f"{self.room.code}"
        )