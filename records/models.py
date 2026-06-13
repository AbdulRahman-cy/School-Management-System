from django.db import models
from django.core.exceptions import ValidationError
from django.db.models import Q, Sum
from decimal import Decimal
from users.models import TimestampedModel

# ─────────────────────────────────────────────────────────────
# GradingComponent (The "Syllabus / Folder")
# ─────────────────────────────────────────────────────────────
class GradingComponent(TimestampedModel):
    class ComponentType(models.TextChoices):
        FINAL_EXAM = "FINAL", "Final Exam"
        MIDTERM    = "MIDTERM", "Midterm Exam"
        LAB        = "LAB", "Practical/Lab"
        ATTENDANCE = "ATTENDANCE", "Attendance"
        QUIZ       = "QUIZ", "Quizzes"
        PROJECT    = "PROJECT", "Project"
        HOMEWORK   = "HOMEWORK", "Homework"

    course_class = models.ForeignKey(
        "academics.CourseClass",
        on_delete=models.CASCADE,
        related_name="grading_components"
    )
    name = models.CharField(
        max_length=20,
        choices=ComponentType.choices,
        help_text="Select the type of grading component."
    )
    max_score = models.DecimalField(
        max_digits=5, 
        decimal_places=2,
        help_text="The maximum achievable score for this component (total must equal 100 per class)."
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["course_class", "name"],
                name="unique_component_per_class",
            )
        ]

    def clean(self):
        existing_total = GradingComponent.objects.filter(
            course_class=self.course_class
        ).exclude(pk=self.pk).aggregate(
            total=Sum('max_score')
        )['total'] or 0
        
        if existing_total + self.max_score > 100:
            raise ValidationError(
                f"Adding this component exceeds 100 total marks. "
                f"Current total is {existing_total}."
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.course_class} | {self.get_name_display()} ({self.max_score} pts)"


# ─────────────────────────────────────────────────────────────
# Enrollment
# ─────────────────────────────────────────────────────────────
class Enrollment(TimestampedModel):
    student = models.ForeignKey("users.StudentProfile", on_delete=models.CASCADE, related_name="enrollments")
    course_class = models.ForeignKey("academics.CourseClass", on_delete=models.CASCADE, related_name="enrollments")
    lecture_session = models.ForeignKey("scheduling.Session", on_delete=models.SET_NULL, null=True, blank=True, related_name="lecture_enrollments", limit_choices_to={"session_type": "LECTURE"})
    tutorial_session = models.ForeignKey("scheduling.Session", on_delete=models.SET_NULL, null=True, blank=True, related_name="tutorial_enrollments", limit_choices_to={"session_type": "TUTORIAL"})
    lab_session = models.ForeignKey("scheduling.Session", on_delete=models.SET_NULL, null=True, blank=True, related_name="lab_enrollments", limit_choices_to={"session_type": "LAB"})

    class Meta:
        constraints = [models.UniqueConstraint(fields=["student", "course_class"], name="unique_student_enrollment")]

    def clean(self):
        session_fields = {"lecture_session": self.lecture_session, "tutorial_session": self.tutorial_session, "lab_session": self.lab_session}
        errors = {}
        for field_name, session in session_fields.items():
            if session and session.course_class_id != self.course_class_id:
                errors[field_name] = f"This session does not belong to {self.course_class}. Only sessions from the enrolled CourseClass are allowed."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    # 🚨 MASSIVE REWRITE: Calculating the final grade ON THE FLY directly from the raw receipts!
    @property
    def final_percentage(self):
        # 1. Sum up all graded Exams
        exam_total = ExamResult.objects.filter(
            student=self.student,
            exam__course_class=self.course_class,
            #we did add the score__isnull=False filter here to exclude any pending quizzes that haven't been graded yet, ensuring they don't skew the final percentage calculation.
            score__isnull=False
        ).aggregate(total=Sum('score'))['total'] or Decimal('0.00')

        # 2. Sum up all graded Assignments
        assignment_total = StudentSubmission.objects.filter(
            student=self.student,
            assignment__course_class=self.course_class,
            score__isnull=False
        ).aggregate(total=Sum('score'))['total'] or Decimal('0.00')

        # 3. Calculate Attendance mathematically on the fly
        attendance_score = Decimal('0.00')
        attendance_comp = GradingComponent.objects.filter(
            course_class=self.course_class,
            name=GradingComponent.ComponentType.ATTENDANCE
        ).first()

        if attendance_comp:
            records = AttendanceRecord.objects.filter(
                student=self.student,
                session__course_class=self.course_class
            )
            total_sessions = records.count()
            if total_sessions > 0:
                attended = records.filter(status__in=[AttendanceRecord.Status.PRESENT, AttendanceRecord.Status.EXCUSED]).count()
                ratio = Decimal(str(attended)) / Decimal(str(total_sessions))
                attendance_score = round(ratio * attendance_comp.max_score, 2)

        # 4. Return the grand total
        return exam_total + assignment_total + attendance_score

    @property
    def is_pending(self):
        return self.course_class.term.is_active

    @property
    def course_grade_points(self):
        if self.is_pending:
            return None

        score = self.final_percentage
        if score >= 93: return 4.0  
        if score >= 89: return 3.7  
        if score >= 84: return 3.3  
        if score >= 79: return 3.0  
        if score >= 74: return 2.7  
        if score >= 69: return 2.4  
        if score >= 64: return 2.0  
        if score >= 60: return 1.0  
        return 0.0                  

    def __str__(self):
        return f"{self.student} → {self.course_class}"


# ─────────────────────────────────────────────────────────────
# AttendanceRecord 
# ─────────────────────────────────────────────────────────────
class AttendanceRecord(TimestampedModel):
    class Status(models.TextChoices):
        PRESENT = "PRESENT", "Present"
        ABSENT  = "ABSENT",  "Absent"
        LATE    = "LATE",    "Late"
        EXCUSED = "EXCUSED", "Excused"

    student = models.ForeignKey("users.StudentProfile", on_delete=models.CASCADE, related_name="attendance_records")
    session = models.ForeignKey("scheduling.Session", on_delete=models.CASCADE, related_name="attendance_records")
    week   = models.PositiveSmallIntegerField()
    status = models.CharField(max_length=10, choices=Status.choices)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["student", "session", "week"], name="unique_attendance_per_session_week")]

    def clean(self):
        is_enrolled = Enrollment.objects.filter(student=self.student, course_class=self.session.course_class).exists()
        if not is_enrolled:
            raise ValidationError(f"Student {self.student} is not enrolled in {self.session.course_class}.")

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

    course_class = models.ForeignKey("academics.CourseClass", on_delete=models.CASCADE, related_name="exams")
    grading_component = models.ForeignKey(GradingComponent, on_delete=models.PROTECT, related_name="exams")
    exam_type = models.CharField(max_length=20, choices=ExamType.choices)
    week      = models.PositiveSmallIntegerField()
    max_score = models.DecimalField(max_digits=5, decimal_places=2)

    def clean(self):
        if self.course_class_id != self.grading_component.course_class_id:
            raise ValidationError("This grading component belongs to a different class.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

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
    student = models.ForeignKey("users.StudentProfile", on_delete=models.CASCADE, related_name="exam_results")
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.PRESENT)
    
    # 🚨 Null=True allows a Quiz to be "Pending Review"
    score  = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    class Meta:
        # 🚨 Prevents double submission of a Quiz
        constraints = [models.UniqueConstraint(fields=["exam", "student"], name="unique_student_exam_result")]

    def clean(self):
        if not Enrollment.objects.filter(student=self.student, course_class=self.exam.course_class).exists():
            raise ValidationError("Student is not enrolled.")
        if self.score is not None:
            if self.score < 0: raise ValidationError("Score cannot be negative.")
            if self.score > self.exam.max_score: raise ValidationError(f"Score exceeds maximum of {self.exam.max_score}.")
        if self.status in (self.Status.ABSENT, self.Status.CHEATING) and self.score is not None and self.score > 0:
            raise ValidationError("An absent/disqualified student cannot have a score above 0.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


# ─────────────────────────────────────────────────────────────
# Assignment
# ─────────────────────────────────────────────────────────────
class Assignment(TimestampedModel):
    class AssignmentType(models.TextChoices):
        HOMEWORK = "HOMEWORK", "Homework"
        PROJECT  = "PROJECT",  "Project"
        ESSAY    = "ESSAY",    "Essay"

    course_class = models.ForeignKey("academics.CourseClass", on_delete=models.CASCADE, related_name="assignments")
    grading_component = models.ForeignKey(GradingComponent, on_delete=models.PROTECT, related_name="assignments")
    assignment_type = models.CharField(max_length=20, choices=AssignmentType.choices)
    due_week        = models.PositiveSmallIntegerField()
    max_points      = models.DecimalField(max_digits=5, decimal_places=2)

    def clean(self):
        if self.course_class_id != self.grading_component.course_class_id:
            raise ValidationError("This grading component belongs to a different class.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.course_class} | {self.get_assignment_type_display()} (due W{self.due_week})"


# ─────────────────────────────────────────────────────────────
# StudentSubmission
# ─────────────────────────────────────────────────────────────
class StudentSubmission(TimestampedModel):
    student    = models.ForeignKey("users.StudentProfile", on_delete=models.CASCADE, related_name="submissions")
    assignment = models.ForeignKey(Assignment, on_delete=models.CASCADE, related_name="submissions")
    
    content = models.TextField(blank=True, null=True, help_text="Text submitted by the student.")
    file_attachment = models.FileField(upload_to="submissions/files/", blank=True, null=True)

    # 🚨 Null=True allows an Essay to be "Pending Review"
    score        = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # 🚨 Prevents double submission of an Assignment
        constraints = [models.UniqueConstraint(fields=["student", "assignment"], name="unique_student_assignment_submission")]

    def clean(self):
        if not Enrollment.objects.filter(student=self.student, course_class=self.assignment.course_class).exists():
            raise ValidationError("Student is not enrolled.")
        if self.score is not None:
            if self.score < 0: raise ValidationError("Score cannot be negative.")
            if self.score > self.assignment.max_points: raise ValidationError("Score exceeds maximum.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)