class EnrollmentError(Exception):
    """Base class; the view layer maps subclasses to HTTP responses."""


class CapacityExceededError(EnrollmentError):
    """Raised when a CourseClass has no remaining seats."""


class EnrollmentValidationError(EnrollmentError):
    def __init__(self, errors: dict):
        self.errors = errors
        super().__init__(str(errors))


class NoCourseClassesError(EnrollmentError):
    def __init__(self, study_group):
        self.study_group = study_group
        super().__init__(f"{study_group} has no course classes to enroll in.")


class GraduatedError(EnrollmentError):
    def __init__(self, computed_year_level: int):
        self.computed_year_level = computed_year_level
        super().__init__("Computed year level exceeds 4 — student has graduated.")


class NotScheduledError(EnrollmentError):
    """Raised when a CourseClass has no Session rows yet."""


class TimetableConflictError(EnrollmentError):
    """Raised when a student attempts to enroll in a course class that conflicts with their schedule."""


class NotEnrolledError(EnrollmentError):
    """Raised when a student attempts to unenroll from classes they are not enrolled in."""

    def __init__(self, message: str = "You are not enrolled in the specified classes."):
        super().__init__(message)
