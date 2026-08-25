from decimal import Decimal
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin, UserManager
from django.utils import timezone

class SoftDeleteModel(models.Model):
    is_active = models.BooleanField(default=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True  
        
    def delete(self, *args, **kwargs):
        """The Soft Delete: flips the boolean instead of erasing the row."""
        self.is_active = False
        self.deleted_at = timezone.now()
        self.save()

    def hard_delete(self, *args, **kwargs):
        """The Permanent Delete: bypasses the soft delete completely."""
        super().delete(*args, **kwargs)

class TimestampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

# 1. Base manager must be defined FIRST
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

# 2. Now ActiveUserManager can safely inherit from it
class ActiveUserManager(BaseUserManager_):
    def get_queryset(self):
        return super().get_queryset().filter(is_active=True)

class ActiveManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(is_active=True)


# 3. Finally, the models that use these managers
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

    USERNAME_FIELD  = "email"
    REQUIRED_FIELDS = ["first_name", "last_name", "role"]

    objects = ActiveUserManager()
    all_objects = BaseUserManager_()
    

    def delete(self, *args, **kwargs):
        """
        MVP Soft Delete: Instantly kills all active JWTs by setting the user to inactive.
        """
        self.is_active = False
        self.save()

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    def __str__(self):
        return f"{self.full_name} <{self.email}>"


class TeacherProfile(TimestampedModel, SoftDeleteModel):
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

    objects = ActiveManager()
    all_objects = models.Manager()
    
    def __str__(self):
        return f"{self.user.full_name} ({self.get_rank_display()})"


class StudentProfile(TimestampedModel, SoftDeleteModel):
    user            = models.OneToOneField(BaseUser, on_delete=models.CASCADE, related_name="student_profile")
    discipline      = models.ForeignKey(
        "academics.Discipline",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="students",
    )
    enrollment_year = models.PositiveIntegerField()
    cumulative_gpa  = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)

    objects = ActiveManager()   
    all_objects = models.Manager()

    @property
    def calculated_gpa(self) -> Decimal:
        """
        Calculates the true cumulative GPA weighted by course credits.
        """
        # Fetch all enrollments for this student, joining the course to get credits
        enrollments = self.enrollments.select_related('course_class__course')
        
        total_quality_points = Decimal('0.00')
        total_credits = 0

        for enr in enrollments:
            if enr.course_grade_points is not None:
                credits = enr.course_class.course.credits
                total_quality_points += Decimal(str(enr.course_grade_points)) * credits
                total_credits += credits

        if total_credits == 0:
            return Decimal('0.00')
            
        return round(total_quality_points / total_credits, 2)
    
    def __str__(self):
        return f"{self.user.full_name} — {self.discipline}"