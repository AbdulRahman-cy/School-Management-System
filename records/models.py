from django.db import models
from django.core.exceptions import ValidationError
from decimal import Decimal
from django.db.models import Q
from users.models import TimestampedModel, SoftDeleteModel, ActiveManager
from django.db.models import Sum
from decimal import Decimal


# ─────────────────────────────────────────────────────────────
# Enrollment
# ─────────────────────────────────────────────────────────────

class EnrollmentManager(models.Manager):
    """
    By default, Enrollment.objects.all() returns EVERYTHING (Active, Dropped, Withdrawn).
    Admins and Finance need to see the full historical ledger.
    """
    def active(self):
        """Used for checking current active seating capacity and active gradebooks."""
        return self.filter(status=self.model.EnrollmentStatus.ENROLLED)

    def historical(self):
        """Used for transcript generation and financial audits."""
        return self.filter(status__in=[
            self.model.EnrollmentStatus.DROPPED, 
            self.model.EnrollmentStatus.WITHDRAWN,
            self.model.EnrollmentStatus.COMPLETED
        ])

class Enrollment(TimestampedModel):
    class EnrollmentStatus(models.TextChoices):
        ENROLLED  = "ENROLLED",  "Enrolled (Active)"
        DROPPED   = "DROPPED",   "Dropped (Early/Refunded)"
        WITHDRAWN = "WITHDRAWN", "Withdrawn (W on Transcript)"
        COMPLETED = "COMPLETED", "Completed (Final Grade Issued)"

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
    status = models.CharField(
        max_length=15,
        choices=EnrollmentStatus.choices,
        default=EnrollmentStatus.ENROLLED, 
    )

    final_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True,
        help_text="Official final grade. Null until enrollment is COMPLETED."
    )

    course_grade_points = models.DecimalField(
        max_digits=3, decimal_places=2, 
        null=True, blank=True,  # Allow it to be empty mid-semester
        help_text="Only calculated when enrollment is COMPLETED."
    )

    objects = EnrollmentManager()
    all_objects = models.Manager()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["student", "course_class"],
                name="unique_student_enrollment",
            )
        ]


    def clean(self):
        errors = {}

        # 1. Session Validation
        session_fields = {
            "lecture_session":  self.lecture_session,
            "tutorial_session": self.tutorial_session,
            "lab_session":      self.lab_session,
        }
        for field_name, session in session_fields.items():
            if session and session.course_class_id != self.course_class_id:
                errors[field_name] = (
                    f"This session does not belong to {self.course_class}. "
                    "Only sessions from the enrolled CourseClass are allowed."
                )

        # 2. Duplicate Course Constraint
        if self.student_id and self.course_class_id:
            target_course = self.course_class.course
            target_term = self.course_class.group.term  

            duplicate_enrollment = Enrollment.objects.filter(
                student=self.student,
                course_class__course=target_course,
                course_class__group__term=target_term  
            ).exclude(pk=self.pk).exists()

            if duplicate_enrollment:
                errors["course_class"] = (
                    f"Student is already enrolled in {target_course.code} for {target_term}. "
                    "You cannot register for two different groups in the same term."
                )
        
        # 3. Fire all errors at once
        if errors:
            raise ValidationError(errors)
        

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def recalculate_grades(self):
        # 1. Fail fast: If active, clear grades and skip the database query entirely
        if self.status != self.EnrollmentStatus.COMPLETED:
            self.final_percentage = None
            self.course_grade_points = None
            # Recall Hussein Nasser 's advice: only update the fields that changed to avoid lost updates in concurrent scenarios.
            self.save(update_fields=['final_percentage', 'course_grade_points', 'updated_at'])
            return

        with transaction.atomic():
            # 2. Only hit the database if the term is actually over
            Enrollment.objects.select_for_update().get(pk=self.pk)
            
            raw_total = self.grades.aggregate(total_score=Sum('score'))['total_score'] or 0
            total = Decimal(str(raw_total)).quantize(Decimal('0.01'))

            self.final_percentage = total
            
            if total >= 93: self.course_grade_points = Decimal('4.0')
            elif total >= 89: self.course_grade_points = Decimal('3.7')
            elif total >= 84: self.course_grade_points = Decimal('3.3')
            elif total >= 79: self.course_grade_points = Decimal('3.0')
            elif total >= 74: self.course_grade_points = Decimal('2.7')
            elif total >= 69: self.course_grade_points = Decimal('2.4')
            elif total >= 64: self.course_grade_points = Decimal('2.0')
            elif total >= 60: self.course_grade_points = Decimal('1.0')
            else: self.course_grade_points = Decimal('0.0')

            self.save(update_fields=['final_percentage', 'course_grade_points', 'updated_at'])


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

        # Here is the index
        indexes = [
            models.Index(
                fields=['enrollment', 'score'], 
                name='idx_enrollment_score_cover'
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
        term = self.assignment.course_class.group.term
        deadline = datetime(
            *term.start_date.timetuple()[:3], tzinfo=timezone.utc
        ) + timedelta(weeks=self.assignment.due_week)
        return self.submitted_at > deadline

    def __str__(self):
        return f"{self.student} → {self.assignment}"


# ─────────────────────────────────────────────────────────────
# Signals
# ─────────────────────────────────────────────────────────────
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

# ExamResult -> GradeEntry sync (Your existing signal)
@receiver(post_save, sender='records.ExamResult')
def sync_exam_result_to_grade_entry(sender, instance, **kwargs):
    if instance.score is None:
        return

    from records.models import Enrollment, GradeEntry # Local import to avoid circular dependencies if any
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

@receiver(post_save, sender='records.GradeEntry')
@receiver(post_delete, sender='records.GradeEntry')
def sync_enrollment_totals(sender, instance, **kwargs):
    """
    Whenever a GradeEntry is created, updated, or deleted,
    recalculate the parent Enrollment's total grade.
    """
    if instance.enrollment_id:
        # Fetch fresh instance to avoid stale data
        instance.enrollment.recalculate_grades()