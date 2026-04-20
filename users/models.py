from decimal import Decimal

from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin


class TimestampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class BaseUserManager_(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required.")
        email = self.normalize_email(email)
        user  = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("role", BaseUser.Role.ADMIN)
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(email, password, **extra_fields)


class BaseUser(AbstractBaseUser, PermissionsMixin, TimestampedModel):
    class Role(models.TextChoices):
        ADMIN   = "ADMIN",   "Admin"
        TEACHER = "TEACHER", "Teacher"
        STUDENT = "STUDENT", "Student"

    email      = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150)
    last_name  = models.CharField(max_length=150)
    role       = models.CharField(max_length=10, choices=Role.choices)
    is_active  = models.BooleanField(default=True)
    is_staff   = models.BooleanField(default=False)

    objects = BaseUserManager_()

    USERNAME_FIELD  = "email"
    REQUIRED_FIELDS = ["first_name", "last_name", "role"]

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    def __str__(self):
        return f"{self.full_name} <{self.email}>"


class TeacherProfile(TimestampedModel):
    class Rank(models.TextChoices):
        TA         = "TA",         "Teaching Assistant"
        LECTURER   = "LECTURER",   "Lecturer"
        ASST_PROF  = "ASST_PROF",  "Assistant Professor"
        ASSOC_PROF = "ASSOC_PROF", "Associate Professor"
        PROFESSOR  = "PROFESSOR",  "Professor"

    user       = models.OneToOneField(BaseUser, on_delete=models.CASCADE, related_name="teacher_profile")
    department = models.ForeignKey(
        "academics.Department",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="teachers",
    )
    rank       = models.CharField(max_length=20, choices=Rank.choices)

    def __str__(self):
        return f"{self.user.full_name} ({self.get_rank_display()})"


class StudentProfile(TimestampedModel):
    user            = models.OneToOneField(BaseUser, on_delete=models.CASCADE, related_name="student_profile")
    discipline      = models.ForeignKey(
        "academics.Discipline",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="students",
    )
    enrollment_year = models.PositiveIntegerField()
    cumulative_gpa  = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)

    @property
    def calculated_gpa(self) -> Decimal:
        """
        Calculates the true cumulative GPA weighted by course credits.
        """
        # Fetch all enrollments for this student, joining the course to get credits
        enrollments = self.enrollments.select_related('course_class__course').prefetch_related('grades')
        
        total_quality_points = Decimal('0.00')
        total_credits = 0

        for enr in enrollments:
            # Prevent "in-progress" courses with 0 grades from tanking the GPA to a 0.0
            if enr.grades.exists():
                credits = enr.course_class.course.credits
                
                # Multiply the 0.0-4.0 scale by the course credits
                total_quality_points += Decimal(str(enr.course_grade_points)) * credits
                total_credits += credits

        if total_credits == 0:
            return Decimal('0.00')
            
        return round(total_quality_points / total_credits, 2)
    
    def __str__(self):
        return f"{self.user.full_name} — {self.discipline}"