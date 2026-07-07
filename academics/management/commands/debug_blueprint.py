from django.core.management.base import BaseCommand
from academics.models import Term, StudyGroup, Course

# Import your exact blueprint so we evaluate the real data
from academics.management.commands.seed_course_classes import CURRICULUM_BLUEPRINT

class Command(BaseCommand):
    help = "Dry-run analysis of CourseClass creation to debug missing matches. STRICTLY READ-ONLY."

    def handle(self, *args, **kwargs):
        terms = Term.objects.all()
        
        total_expected = 0
        total_successful_matches = 0
        missing_courses = set()
        skipped_gsp_groups = 0

        self.stdout.write(self.style.HTTP_INFO("Starting dry-run analysis... (NO DATA WILL BE MODIFIED)\n"))

        for term in terms:
            season = "Fall" if "Fall" in term.name else "Spring"
            groups = StudyGroup.objects.filter(term=term).select_related("discipline")
            
            for group in groups:
                disc_code = group.discipline.code
                year = group.year_level

                # Check if the discipline exists in the blueprint
                blueprint = CURRICULUM_BLUEPRINT.get(disc_code)
                
                # Catch the GSP naming mismatch 
                if not blueprint:
                    if "_GSP" in disc_code:
                        skipped_gsp_groups += 1
                    continue
                
                term_courses = blueprint.get(year, {}).get(season, [])

                for course_code in term_courses:
                    total_expected += 1
                    
                    # Check if the course actually exists in the database
                    course_exists = Course.objects.filter(code=course_code).exists()
                    
                    if course_exists:
                        total_successful_matches += 1
                    else:
                        missing_courses.add(course_code)

        # ─── OUTPUT THE REAL NUMBERS ──────────────────────────────────────
        self.stdout.write(self.style.SUCCESS("\n=== ANALYSIS COMPLETE ==="))
        self.stdout.write(f"Total CourseClasses the blueprint requested: {total_expected}")
        self.stdout.write(f"Total successful matches (What WOULD be created): {total_successful_matches}")
        
        failed_matches = total_expected - total_successful_matches
        if failed_matches > 0:
            self.stdout.write(self.style.ERROR(f"Total failed matches (Missing Courses): {failed_matches}"))
        
        if skipped_gsp_groups > 0:
            self.stdout.write(self.style.WARNING(f"\nStudy Groups skipped entirely due to '_GSP' suffix mismatch: {skipped_gsp_groups}"))
        
        if missing_courses:
            self.stdout.write(self.style.ERROR("\nExact Course Codes Missing from Database:"))
            for missing in sorted(missing_courses):
                self.stdout.write(f" - {missing}")