from django.core.management.base import BaseCommand
from django.db import transaction
from academics.models import Discipline, Course, Term, CurriculumBlueprint

# Extracted directly from the CCE flowchart
CCE_BLUEPRINT = {
    1: {
        "FALL": ["EMP 111", "EMP 121", "EMP 131", "EMP 141", "CSE 111", "HUM 1E1", "HUM 1E3"],
        "SPRING": ["EMP 112", "EMP 122", "EMP 132", "MIE 161", "CHE 111", "TRN 121", "HUM 1E2"],
    },
    2: {
        "FALL": ["CSE 216", "CSE 221", "EMP x14", "EMP x12", "EEP 218", "CSE 237", "HUM xE4"],
        "SPRING": ["EMP x18", "CSE 226", "CSE 246", "EEC 239", "CSE 238", "EEC 271", "EEC 216"],
    },
    3: {
        "FALL": ["CSE 321", "CSE 327", "CSE 331", "EEC 371", "EEC 343", "EEC 381"],
        "SPRING": ["CSE 376", "CSE 361", "CSE 336", "CSE 328", "CCE 3E1", "EEC 382"],
    },
    4: {
        "FALL": ["CSE 466", "CSE 426", "CCE 4E1", "CCE 4E2", "EEC 441", "CCE 401"],
        "SPRING": ["CSE 461", "CCE 4E3", "CCE 4E4", "CCE 4E5", "HUM xE5", "CCE 402"],
    }
}

class Command(BaseCommand):
    help = "Seeds the CurriculumBlueprint specifically for the CCE department."

    @transaction.atomic
    def handle(self, *args, **kwargs):
        # Fetch the CCE Discipline. Adjust the code string if your DB uses something slightly different (e.g., 'CCE_SSP')
        cce_discipline = Discipline.objects.filter(code__icontains="CCE").first()
        if not cce_discipline:
            self.stdout.write(self.style.ERROR("CCE Discipline not found in the database. Aborting."))
            return

        courses_db = {c.code: c for c in Course.objects.all()}
        to_create = []
        missing_courses = set()

        for year_level, semesters in CCE_BLUEPRINT.items():
            for season, course_codes in semesters.items():
                for code in course_codes:
                    course = courses_db.get(code)
                    if not course:
                        missing_courses.add(code)
                        continue

                    # If the course code contains an 'E' (e.g. CCE 3E1, HUM xE5), it's an elective
                    is_mandatory = "E" not in code

                    to_create.append(
                        CurriculumBlueprint(
                            discipline=cce_discipline,
                            course=course,
                            year_level=year_level,
                            season=getattr(Term.Season, season.upper()),
                            is_mandatory=is_mandatory
                        )
                    )

        self.stdout.write("Clearing old CCE blueprint data to avoid duplicates...")
        CurriculumBlueprint.objects.filter(discipline=cce_discipline).delete()

        self.stdout.write("Inserting new CCE blueprint records...")
        CurriculumBlueprint.objects.bulk_create(to_create, batch_size=500)

        self.stdout.write(self.style.SUCCESS(f"Successfully seeded {len(to_create)} CCE Blueprint records."))

        if missing_courses:
            self.stdout.write(self.style.WARNING(f"Could not link these courses (missing in DB): {', '.join(missing_courses)}"))