from django.db import models
from django.core.exceptions import ValidationError
from django.db.models import Q
from decimal import Decimal
from users.models import TimestampedModel


# ─────────────────────────────────────────────────────────────
# Enrollment
# ─────────────────────────────────────────────────────────────

class Enrollment(TimestampedModel):
    student      = models.ForeignKey(
        "users.StudentProfile",
        on_delete=models.CASCADE,
        related_name="enrollments",
    )
    course_class = models.ForeignKey(
        "academics.CourseClass",
        on_delete=models.CASCADE,
        related_name="enrollments",
    )
    lecture_session = models.ForeignKey(
        "scheduling.Session",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="lecture_enrollments",
        limit_choices_to={"session_type": "LECTURE"},
    )
    tutorial_session = models.ForeignKey(
        "scheduling.Session",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="tutorial_enrollments",
        limit_choices_to={"session_type": "TUTORIAL"},
    )
    lab_session = models.ForeignKey(
        "scheduling.Session",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="lab_enrollments",
        limit_choices_to={"session_type": "LAB"},
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["student", "course_class"],
                name="unique_student_enrollment",
            )
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

    @property
    def final_percentage(self):
        """
        Sums raw scores across all GradeEntry rows.
        Scores already represent the actual mark out of the total
        (e.g. 28/30 midterm, 45/50 final, 4/5 quiz) so no weighting needed.
        Returns 0.00 if no grades have been entered yet.
        """
        grades = self.grades.all()
        if not grades:
            return 0.00
        return sum(grade.score for grade in grades)

    @property
    def course_grade_points(self):
        """Converts Alexandria University percentage to 4.0 GPA scale."""
        score = self.final_percentage
        if score >= 93: return 4.0  # A
        if score >= 89: return 3.7  # A-
        if score >= 84: return 3.3  # B+
        if score >= 79: return 3.0  # B
        if score >= 74: return 2.7  # C+
        if score >= 69: return 2.4  # C
        if score >= 64: return 2.0  # D+
        if score >= 60: return 1.0  # D
        return 0.0                  # F

    def __str__(self):
        return f"{self.student} → {self.course_class}"


# ─────────────────────────────────────────────────────────────
# GradeEntry
# ─────────────────────────────────────────────────────────────

class GradeEntry(TimestampedModel):
    enrollment = models.ForeignKey(
        Enrollment,
        on_delete=models.CASCADE,
        related_name="grades",
    )
    component  = models.CharField(
        max_length=100,
        help_text="e.g. 'Midterm Exam', 'Final Exam', 'Quiz 1', 'Homework'",
    )
    # Raw score on the component's own scale.
    # e.g. 28.00 for a midterm marked out of 30,
    #      45.00 for a final marked out of 50,
    #       4.00 for a quiz marked out of 5.
    # All components must sum to 100 across a full term.
    score = models.DecimalField(
        max_digits=5, decimal_places=2,
        help_text="Raw score on this component's scale (not out of 100).",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["enrollment", "component"],
                name="unique_grade_component_per_enrollment",
            )
        ]

    def __str__(self):
        return f"{self.enrollment} | {self.component}: {self.score}"


# ─────────────────────────────────────────────────────────────
# AttendanceRecord
# ─────────────────────────────────────────────────────────────

class AttendanceRecord(TimestampedModel):
    class Status(models.TextChoices):
        PRESENT = "PRESENT", "Present"
        ABSENT  = "ABSENT",  "Absent"
        LATE    = "LATE",    "Late"
        EXCUSED = "EXCUSED", "Excused"

    student = models.ForeignKey(
        "users.StudentProfile",
        on_delete=models.CASCADE,
        related_name="attendance_records",
    )
    session = models.ForeignKey(
        "scheduling.Session",
        on_delete=models.CASCADE,
        related_name="attendance_records",
    )
    week   = models.PositiveSmallIntegerField(
        help_text="Week number within the term (1-based).",
    )
    status = models.CharField(max_length=10, choices=Status.choices)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["student", "session", "week"],
                name="unique_attendance_per_session_week",
            )
        ]

    def clean(self):
        is_enrolled = Enrollment.objects.filter(
            student=self.student,
            course_class=self.session.course_class,
        ).exists()
        if not is_enrolled:
            raise ValidationError(
                f"Student {self.student} is not enrolled in "
                f"{self.session.course_class}."
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.student} | {self.session} | W{self.week} [{self.status}]"


# ─────────────────────────────────────────────────────────────
# Exam
# ─────────────────────────────────────────────────────────────

class Exam(TimestampedModel):
    class ExamType(models.TextChoices):
        MIDTERM   = "MIDTERM",   "Midterm Exam"
        FINAL     = "FINAL",     "Final Exam"
        PRACTICAL = "PRACTICAL", "Practical/Lab Exam"
        QUIZ      = "QUIZ",      "Quiz"

    course_class = models.ForeignKey(
        "academics.CourseClass",
        on_delete=models.CASCADE,
        related_name="exams",
    )
    exam_type = models.CharField(max_length=20, choices=ExamType.choices)
    week      = models.PositiveSmallIntegerField(
        help_text="Week number within the term when the exam is held (1-based).",
    )
    max_score = models.DecimalField(
        max_digits=5, decimal_places=2,
        help_text="Maximum achievable score, e.g. 30.00 for a midterm worth 30 marks.",
    )

    class Meta:
        constraints = [
            # MIDTERM and FINAL are singular per class; QUIZzes and PRACTICAL are unlimited.
            models.UniqueConstraint(
                fields=["course_class", "exam_type"],
                condition=Q(exam_type__in=["FINAL", "MIDTERM"]),
                name="unique_singular_exam_type_per_class",
            ),
        ]

    def __str__(self):
        return f"{self.course_class} | {self.get_exam_type_display()} (W{self.week})"


# ─────────────────────────────────────────────────────────────
# ExamResult
# ─────────────────────────────────────────────────────────────

class ExamResult(TimestampedModel):
    class Status(models.TextChoices):
        PRESENT  = "PRESENT",  "Present"
        ABSENT   = "ABSENT",   "Absent"
        EXCUSED  = "EXCUSED",  "Excused"
        CHEATING = "CHEATING", "Disqualified"

    exam    = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name="results")
    student = models.ForeignKey(
        "users.StudentProfile",
        on_delete=models.CASCADE,
        related_name="exam_results",
    )
    status = models.CharField(
        max_length=15,
        choices=Status.choices,
        default=Status.PRESENT,
    )
    # null  → row created after exam was held, grading not yet complete
    # 0.00  → student sat the exam and scored zero (or disqualified)
    score  = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["exam", "student"],
                name="unique_student_exam_result",
            ),
        ]

    def clean(self):
        # 1. Enrollment check
        if not Enrollment.objects.filter(
            student=self.student,
            course_class=self.exam.course_class,
        ).exists():
            raise ValidationError(
                f"Student {self.student} is not enrolled in {self.exam.course_class}."
            )

        # 2. Score bounds
        if self.score is not None:
            if self.score < 0:
                raise ValidationError("Score cannot be negative.")
            if self.score > self.exam.max_score:
                raise ValidationError(
                    f"Score {self.score} exceeds the maximum of {self.exam.max_score}."
                )

        # 3. Absent or disqualified students cannot have a positive score
        if self.status in (self.Status.ABSENT, self.Status.CHEATING):
            if self.score is not None and self.score > 0:
                raise ValidationError(
                    "An absent or disqualified student cannot have a score above 0."
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        score_display = str(self.score) if self.score is not None else "not graded"
        return f"{self.student} | {self.exam} → {score_display}"


# ─────────────────────────────────────────────────────────────
# Assignment
# ─────────────────────────────────────────────────────────────

class Assignment(TimestampedModel):
    class AssignmentType(models.TextChoices):
        HOMEWORK = "HOMEWORK", "Homework"
        PROJECT  = "PROJECT",  "Project"
        ESSAY    = "ESSAY",    "Essay"

    course_class    = models.ForeignKey(
        "academics.CourseClass",
        on_delete=models.CASCADE,
        related_name="assignments",
    )
    assignment_type = models.CharField(max_length=20, choices=AssignmentType.choices)
    due_week        = models.PositiveSmallIntegerField(
        help_text="Week number within the term by which the assignment is due (1-based).",
    )
    max_points      = models.DecimalField(max_digits=5, decimal_places=2)

    def __str__(self):
        return f"{self.course_class} | {self.get_assignment_type_display()} (due W{self.due_week})"


# ─────────────────────────────────────────────────────────────
# StudentSubmission
# ─────────────────────────────────────────────────────────────

class StudentSubmission(TimestampedModel):
    student    = models.ForeignKey(
        "users.StudentProfile",
        on_delete=models.CASCADE,
        related_name="submissions",
    )
    assignment = models.ForeignKey(
        Assignment,
        on_delete=models.CASCADE,
        related_name="submissions",
    )
    score        = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["student", "assignment"],
                name="unique_student_assignment_submission",
            ),
        ]

    def clean(self):
        if not Enrollment.objects.filter(
            student=self.student,
            course_class=self.assignment.course_class,
        ).exists():
            raise ValidationError(
                "Student is not enrolled in the class this assignment belongs to."
            )
        if self.score is not None:
            if self.score < 0:
                raise ValidationError("Score cannot be negative.")
            if self.score > self.assignment.max_points:
                raise ValidationError(
                    f"Score {self.score} exceeds the maximum of {self.assignment.max_points}."
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def is_late(self) -> bool:
        """
        True if the submission timestamp is after the end of the due week.
        Deadline = term start_date + due_week full weeks (i.e. midnight ending that Sunday).
        """
        from datetime import timedelta, datetime, timezone
        term     = self.assignment.course_class.term
        deadline = datetime(
            *term.start_date.timetuple()[:3], tzinfo=timezone.utc
        ) + timedelta(weeks=self.assignment.due_week)
        return self.submitted_at > deadline

    def __str__(self):
        return f"{self.student} → {self.assignment}"


# ─────────────────────────────────────────────────────────────
# Signal: sync ExamResult → GradeEntry automatically
# ─────────────────────────────────────────────────────────────
# Placed here so no apps.py / ready() hook is needed.
# When a score is recorded on an ExamResult, the corresponding
# GradeEntry is created or updated immediately.

from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=ExamResult)
def sync_exam_result_to_grade_entry(sender, instance, **kwargs):
    if instance.score is None:
        return  # not graded yet — leave GradeEntry untouched

    enrollment = Enrollment.objects.filter(
        student=instance.student,
        course_class=instance.exam.course_class,
    ).first()

    if not enrollment:
        return

    GradeEntry.objects.update_or_create(
        enrollment=enrollment,
        component=instance.exam.get_exam_type_display(),
        defaults={"score": instance.score},
    )