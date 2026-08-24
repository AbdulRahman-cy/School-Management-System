from django.core.management.base import BaseCommand
from django.db import transaction
from academics.models import Discipline, Course, Term, CurriculumBlueprint

# Extracted directly from the Material Science and Engineering (MSE) study plan and flowchart
MSE_BLUEPRINT = {
    1: {
        "FALL": ["EMP 111", "EMP 121", "EMP 131", "HUM 1E3", "MIE 161", "CHE 111", "HUM 1E2"],
        "SPRING": ["EMP 112", "EMP 122", "EMP 132", "EMP 141", "CSE 111", "TRN 121", "HUM 1E1"],
    },
    2: {
        "FALL": ["CHE 226", "EMP x13", "MIE 212", "MEC x34", "MEC 243", "MEC x46"],
        "SPRING": ["EMP x14", "MEC x12", "CHE x21", "CHE 216", "EEP x82", "HUM xE4"],
    },
    3: {
        "FALL": ["EMP x16", "MEC 311", "MEC 347", "MIE x12", "EEP x56", "CHE 327"],
        "SPRING": ["MSE 313", "EMP x18", "CHE x65", "MSE 3E1", "MSE 311", "MSE 312"],
    },
    4: {
        "FALL": ["MRE x51", "MIE 416", "MIE 414", "MSE 4E2", "MSE 4E3", "MSE 401"],
        "SPRING": ["MIE 413", "CHE x82", "MSE 421", "MSE 4E4", "MSE 4E5", "HUM xE5", "MSE 402"],
    }
}

class Command(BaseCommand):
    help = "Seeds the CurriculumBlueprint specifically for the MSE department."

    @transaction.atomic
    def handle(self, *args, **kwargs):
        # Fetch the MSE Discipline
        mse_discipline = Discipline.objects.filter(code__icontains="MSE").first()
        if not mse_discipline:
            self.stdout.write(self.style.ERROR("MSE Discipline not found in the database. Aborting."))
            return

        courses_db = {c.code: c for c in Course.objects.all()}
        to_create = []
        missing_courses = set()

        for year_level, semesters in MSE_BLUEPRINT.items():
            for season, course_codes in semesters.items():
                for code in course_codes:
                    course = courses_db.get(code)
                    if not course:
                        missing_courses.add(code)
                        continue

                    # If the course code contains an 'E' (e.g., MSE 3E1, HUM xE5, HUM 1E2), it's an elective
                    is_mandatory = "E" not in code

                    to_create.append(
                        CurriculumBlueprint(
                            discipline=mse_discipline,
                            course=course,
                            year_level=year_level,
                            season=getattr(Term.Season, season.upper()),
                            is_mandatory=is_mandatory
                        )
                    )

        self.stdout.write("Clearing old MSE blueprint data to avoid duplicates...")
        CurriculumBlueprint.objects.filter(discipline=mse_discipline).delete()

        self.stdout.write("Inserting new MSE blueprint records...")
        CurriculumBlueprint.objects.bulk_create(to_create, batch_size=500)

        self.stdout.write(self.style.SUCCESS(f"Successfully seeded {len(to_create)} MSE Blueprint records."))

        if missing_courses:
            self.stdout.write(self.style.WARNING(f"Could not link these courses (missing in DB): {', '.join(missing_courses)}"))