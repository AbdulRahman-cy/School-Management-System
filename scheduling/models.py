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

    # Session type -> allowed room types. Defined once, not rebuilt per call.
    ALLOWED_ROOM_TYPES = {
        SessionType.LAB: ["LAB"],
        SessionType.LECTURE: ["LECTURE"],
        SessionType.TUTORIAL: ["SEMINAR"],
    }

    course_class = models.ForeignKey(
        "academics.CourseClass",
        on_delete=models.CASCADE,
        related_name="sessions",
    )
    room         = models.ForeignKey(
        "academics.Room",
        on_delete=models.CASCADE,
        related_name="sessions",
    )
    timeslot     = models.ForeignKey(
        Timeslot,
        on_delete=models.CASCADE ,
        related_name="sessions",
    )
    session_type = models.CharField(
        max_length=10,
        choices=SessionType.choices,
        default=SessionType.LECTURE,
    )

    def clean(self):
        errors = {}

        if self.room_id and self.session_type:
            room_type = self.room.room_type
            valid_room_types = self.ALLOWED_ROOM_TYPES.get(self.session_type, [])

            if room_type not in valid_room_types:
                valid_types_str = " or ".join(valid_room_types).lower()
                errors["room"] = (
                    f"{self.get_session_type_display()} sessions must be assigned "
                    f"to a {valid_types_str} room. You selected a {room_type} room."
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