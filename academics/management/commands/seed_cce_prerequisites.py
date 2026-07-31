from django.core.management.base import BaseCommand
from django.db import transaction
from academics.models import Course, CoursePrerequisite

# Mapped explicitly from the arrow flows in the CCE flowchart
CCE_PREREQUISITES = {
    "EMP 112": ["EMP 111"],
    "EMP 122": ["EMP 121"],
    "CSE 216": ["EMP 111"],
    "CSE 221": ["CSE 111"],
    "EEP 218": ["EMP 132"],
    "EMP x18": ["EMP 112"],
    "CSE 226": ["CSE 221"],
    "CSE 246": ["EMP x14"],
    "EEC 239": ["EEP 218"],
    "CSE 238": ["CSE 237"],
    "EEC 271": ["CSE 237"],
    "CSE 321": ["CSE 216"],
    "CSE 327": ["CSE 226"],
    "CSE 331": ["CSE 246"],
    "EEC 371": ["EEC 239"],
    "EEC 343": ["CSE 238"],
    "EEC 381": ["EEC 271"],
    "CSE 376": ["CSE 321"],
    "CSE 361": ["CSE 331"],
    "CSE 336": ["CSE 331"],
    "CSE 328": ["CSE 327"],
    "EEC 382": ["EEC 381"],
    "CSE 466": ["CSE 376"],
    "CSE 426": ["CSE 361"],
    "CSE 461": ["CSE 361"],
    "EEC 441": ["EEC 343"],
    "CCE 402": ["CCE 401"],
    # "CCE 401": ["CH 102"] -> 'CH 102' indicates a 102 Credit Hour requirement, not a standard course.
}

class Command(BaseCommand):
    help = "Seeds the CoursePrerequisite table mapping target courses to prerequisites for CCE."

    @transaction.atomic
    def handle(self, *args, **kwargs):
        courses_db = {c.code: c for c in Course.objects.all()}
        
        to_create = []
        missing_courses = set()

        for target_code, prereq_codes in CCE_PREREQUISITES.items():
            target_course = courses_db.get(target_code)
            if not target_course:
                missing_courses.add(target_code)
                continue
                
            for prereq_code in prereq_codes:
                prereq_course = courses_db.get(prereq_code)
                if not prereq_course:
                    missing_courses.add(prereq_code)
                    continue
                    
                to_create.append(
                    CoursePrerequisite(
                        target_course=target_course,
                        prerequisite_course=prereq_course
                    )
                )

        # Clear existing prerequisites that fall within these target courses to ensure a clean state
        target_course_objects = [c.target_course for c in to_create]
        CoursePrerequisite.objects.filter(target_course__in=target_course_objects).delete()

        self.stdout.write("Inserting new CCE prerequisite relationships...")
        CoursePrerequisite.objects.bulk_create(to_create, batch_size=500, ignore_conflicts=True)

        self.stdout.write(self.style.SUCCESS(f"Successfully seeded {len(to_create)} Course Prerequisite mappings."))

        if missing_courses:
            self.stdout.write(self.style.WARNING(f"Failed to link relationships for missing courses: {', '.join(missing_courses)}"))