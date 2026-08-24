class EnrollmentError(Exception):
    """Base class; the view layer maps subclasses to HTTP responses."""


class CapacityExceededError(EnrollmentError):
    def __init__(self, study_group):
        self.study_group = study_group
        super().__init__(f"No seats remaining in {study_group}.")


class EnrollmentValidationError(EnrollmentError):
    def __init__(self, errors: dict):
        self.errors = errors
        super().__init__(str(errors))


class NoCourseClassesError(EnrollmentError):
    def __init__(self, study_group):
        self.study_group = study_group
        super().__init__(f"{study_group} has no course classes to enroll in.")

# records/services/exceptions.py — add

class GraduatedError(EnrollmentError):
    def __init__(self, computed_year_level: int):
        self.computed_year_level = computed_year_level
        super().__init__("Computed year level exceeds 4 — student has graduated.")

class NotScheduledError(EnrollmentError):
    def __init__(self, study_group):
        self.study_group = study_group
        super().__init__(f"{study_group} has not been scheduled yet.")