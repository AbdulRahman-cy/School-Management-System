"""
academics/management/commands/seed_course_classes.py
"""
from django.core.management.base import BaseCommand
from academics.models import Term, StudyGroup, Course, CourseClass

# ─── THE CURRICULUM BLUEPRINT ──────────────────────────────────────
# Map exactly which courses a Discipline takes per Year and Term.
# Electives are included as their block codes (e.g., HUM 1E1) for now.
CURRICULUM_BLUEPRINT = {
    "CCE": {
        1: {
            "Fall":   ["EMP 111", "EMP 121", "EMP 131", "HUM 1E3", "CHE 111", "MIE 161", "HUM 1E2"],
            "Spring": ["EMP 112", "EMP 122", "EMP 132", "CSE 111", "EMP 141", "HUM 1E1", "TRN 121"]
        },
        2: {
            "Fall":   ["EMP x12", "CSE 221", "EEP 218", "CSE 216", "CSE 237", "EMP x14", "HUM xE4"],
            "Spring": ["EMP x18", "CSE 226", "EEC 239", "CSE 238", "EEC 271", "CSE 246", "EEC 216"]
        },
        3: {
            "Fall":   ["CSE 327", "EEC 371", "EEC 343", "EEC 381", "CSE 321", "CSE 331"],
            "Spring": ["CSE 328", "CSE 361", "CSE 376", "CCE 3E1", "EEC 382", "CSE 336"]
        },
        4: {
            "Fall":   ["CSE 466", "CSE 426", "EEC 441", "CCE 4E1", "CCE 4E2", "CCE 401"],
            "Spring": ["CSE 461", "CCE 4E3", "CCE 4E4", "CCE 4E5", "HUM xE5", "CCE 402"]
        }
    },
    "ARC_GSP": {
        1: {
            "Fall":   ["EMP 111", "EMP 121", "EMP 131", "CHE 111", "EMP 141", "CSE 111", "HUM 1E1"],
            "Spring": ["EMP 112", "EMP 122", "EMP 132", "ARC 111", "HUM 163", "HUM 142", "TRN 121"]
        },
        2: {
            "Fall":   ["ARC 211", "ARC 221", "ARC 231", "ARC 232", "ARC 2E1", "STR 213", "STR 223"],
            "Spring": ["ARC 212", "ARC 222", "ARC 233", "ARC 234", "ARC 2E2", "TRE 213", "STR 241"]
        }
        # Add Level 3 and 4 here later
    },
    "CVE_GSP": {
        1: {
            "Fall":   ["EMP 111", "EMP 121", "EMP 131", "HUM 1E3", "EMP 141", "CSE 111", "HUM 1E1"],
            "Spring": ["EMP 112", "EMP 122", "EMP 132", "MIE 161", "CHE 111", "HUM 1E2", "TRN 121"]
        },
        # Add Level 2, 3, 4 here later

        "MIE_GSP": {
        1: {
            "Fall":   ["EMP 111", "EMP 121", "EMP 131", "HUM 1E3", "EMP 141", "CSE 111", "HUM 1E1"],
            "Spring": ["EMP 112", "EMP 122", "EMP 132", "MIE 161", "CHE 111", "HUM 1E2", "TRN 121"]
        },
        2: {
            "Fall":   ["MIE 211", "MIE 241", "MIE 242", "MIE 251", "EMP x13", "MEC x34"],
            "Spring": ["MIE 212", "MIE 221", "MIE 231", "MIE 252", "EMP x18", "MEC x12"]
        },
        3: {
            "Fall":   ["MIE 311", "MIE 312", "MIE 321", "MIE 331", "MIE 351", "EEP x82"],
            "Spring": ["MIE 313", "MIE 332", "MIE 341", "EMP x14", "MEC 345", "EEP x56"]
        },
        4: {
            "Fall":   ["MIE 431", "MIE 4E1", "MIE 4E2", "MIE 4E1", "MIE 401", "HUM xE4"],
            "Spring": ["MIE 451", "MIE 4E2", "MIE 4E3", "MIE 4E4", "MIE 402", "HUM xE5"]
        }
    },
    "NRE_GSP": {
        1: {
            "Fall":   ["EMP 111", "EMP 121", "EMP 131", "HUM 1E3", "EMP 141", "CSE 111", "HUM 1E1"],
            "Spring": ["EMP 112", "EMP 122", "EMP 132", "MIE 161", "CHE 111", "HUM 1E2", "TRN 121"]
        },
        2: {
            "Fall":   ["EMP x13", "EMP x23", "EEP x82", "NRE 211", "NRE 221", "NRE 252"],
            "Spring": ["EMP x14", "MEC x34", "NRE 212", "MEC x42", "NRE 214", "HUM x73"]
        },
        3: {
            "Fall":   ["EMP x19", "EMP x18", "EEC 332", "NRE 313", "NRE 353", "NRE 3E1"],
            "Spring": ["NRE 335", "NRE 3E2", "NRE 354", "NRE 341", "NRE 342", "HUM x81"]
        },
        4: {
            "Fall":   ["NRE 432", "NRE 423", "NRE 412", "NRE 433", "NRE 434", "NRE 430", "NRE 401"],
            "Spring": ["NRE 431", "EEP 425", "NRE 4E3", "NRE 4E4", "NRE 4E5", "NRE 402"]
        }
    },
    "CSE_GSP": {
        1: {
            "Fall":   ["EMP 111", "EMP 121", "EMP 131", "HUM 1E3", "EMP 141", "CSE 111", "HUM 1E1"],
            "Spring": ["EMP 112", "EMP 122", "EMP 132", "MIE 161", "CHE 111", "HUM 1E2", "TRN 121"]
        },
        2: {
            "Fall":   ["EMP x12", "CSE 211", "CSE 212", "CSE 221", "CSE 231", "EEP 215"],
            "Spring": ["EMP x14", "CSE 271", "CSE x22", "CSE 232", "EEC 231", "CSE 281", "HUM xE4"]
        },
        3: {
            "Fall":   ["CSE 311", "CSE 321", "CSE 322", "CSE 331", "CSE 351", "CSE 341", "CSE 381"],
            "Spring": ["CSE 323", "CSE 324", "CSE 332", "CSE 361", "CSE 3E1", "HUM xE5"]
        },
        4: {
            "Fall":   ["CSE 421", "CSE 431", "CSE 471", "CSE 4E2", "CSE 4E3", "CSE 401"],
            "Spring": ["CSE 461", "CSE 462", "CSE 441", "CSE 4E4", "CSE 4E5", "CSE 402"]
        }
    },

    # ════════════════════════════════════════════════════════════════════
    # SSP PROGRAMS (Specific Specialization)
    # ════════════════════════════════════════════════════════════════════
    "MSE": {
        1: {
            "Fall":   ["EMP 111", "EMP 121", "EMP 131", "HUM 1E3", "MIE 161", "CHE 111", "HUM 1E2"],
            "Spring": ["EMP 112", "EMP 122", "EMP 132", "EMP 141", "CSE 111", "TRN 121", "HUM 1E1"]
        },
        2: {
            "Fall":   ["CHE 226", "EMP x13", "MIE 212", "MEC x34", "MEC 243", "MEC x46"],
            "Spring": ["EMP x14", "MEC x12", "CHE x21", "CHE 216", "EEP x82", "HUM xE4"]
        },
        3: {
            "Fall":   ["EMP x16", "MEC 311", "MEC 347", "MIE x12", "EEP x56", "CHE 327"],
            "Spring": ["MSE 313", "EMP x18", "CHE x65", "MSE 3E1", "MSE 311", "MSE 312"]
        },
        4: {
            "Fall":   ["MRE x51", "MIE 416", "MIE 414", "MSE 4E2", "MSE 4E3", "MSE 401"],
            "Spring": ["MIE 413", "CHE x82", "MSE 421", "MSE 4E4", "MSE 4E5", "HUM xE5", "MSE 402"]
        }
    },
    "GPE": {
        1: {
            "Fall":   ["EMP 111", "EMP 121", "EMP 131", "HUM 1E3", "CHE 111", "MIE 161", "HUM 1E2"],
            "Spring": ["EMP 112", "EMP 122", "EMP 132", "EMP 141", "CSE 111", "HUM 1E1", "TRN 121"]
        },
        2: {
            "Fall":   ["EMP x13", "CHE 216", "CHE 226", "CHE 236", "MEC 216", "HUM xE4"],
            "Spring": ["EMP x14", "CHE 217", "EEP 216", "CHE 237", "MEC x36", "CHE 2E1"]
        },
        3: {
            "Fall":   ["EMP x16", "CHE 326", "CHE 336", "CHE 346", "CHE 347", "CHE 3E2"],
            "Spring": ["CHE 327", "CHE 337", "CHE 356", "CHE 357", "CHE 3E3", "HUM xE5"]
        },
        4: {
            "Fall":   ["CHE 436", "CHE 456", "CHE 457", "CHE 466", "CHE 4E4", "GPE 401"],
            "Spring": ["CHE 437", "CHE 438", "CHE 458", "CHE 459", "CHE 4E5", "GPE 402"]
        }
    },
    "EME": {
        1: {
            "Fall":   ["EMP 111", "EMP 121", "EMP 131", "HUM 1E3", "CHE 111", "MIE 161", "HUM 1E2"],
            "Spring": ["EMP 112", "EMP 122", "EMP 132", "CSE 111", "EMP 141", "HUM 1E1", "TRN 121"]
        },
        2: {
            "Fall":   ["EMP x13", "MEC 247", "MEC 216", "EEP 216", "MEC x45", "EEC 246", "HUM xE4"],
            "Spring": ["EMP x14", "MEC x47", "MEC 236", "EEP 217", "EEC 236", "EEP 226"]
        },
        3: {
            "Fall":   ["MEC 321", "MEC x48", "MEC 332", "EEP 356", "EMP x12", "EEP 316"],
            "Spring": ["MEC 311", "MEC x49", "EEP 336", "EEP 346", "MEC 322", "HUM xE5"]
        },
        4: {
            "Fall":   ["EEP 436", "MEC 433", "MEC x13", "MEC x14", "EME 4E1", "EME 4E2", "EME 401"],
            "Spring": ["EEP 456", "EME 4E3", "EME 4E4", "EME 4E5", "EME 4E6", "EME 402"]
        }
    },
    "CCE": {
        # Verified exact match with your original CCE data request
        1: {
            "Fall":   ["EMP 111", "EMP 121", "EMP 131", "HUM 1E3", "CHE 111", "MIE 161", "HUM 1E2"],
            "Spring": ["EMP 112", "EMP 122", "EMP 132", "CSE 111", "EMP 141", "HUM 1E1", "TRN 121"]
        },
        2: {
            "Fall":   ["EMP x12", "CSE 221", "EEP 218", "CSE 216", "CSE 237", "EMP x14", "HUM xE4"],
            "Spring": ["EMP x18", "CSE 226", "EEC 239", "CSE 238", "EEC 271", "CSE 246", "EEC 216"]
        },
        3: {
            "Fall":   ["CSE 327", "EEC 371", "EEC 343", "EEC 381", "CSE 321", "CSE 331"],
            "Spring": ["CSE 328", "CSE 361", "CSE 376", "CCE 3E1", "EEC 382", "CSE 336"]
        },
        4: {
            "Fall":   ["CSE 466", "CSE 426", "EEC 441", "CCE 4E1", "CCE 4E2", "CCE 401"],
            "Spring": ["CSE 461", "CCE 4E3", "CCE 4E4", "CCE 4E5", "HUM xE5", "CCE 402"]
        }
    },
    "BME": {
        1: {
            "Fall":   ["EMP 111", "EMP 121", "EMP 131", "HUM 1E3", "CHE 111", "MIE 161", "HUM 1E2"],
            "Spring": ["EMP 112", "EMP 122", "EMP 132", "CSE 111", "EMP 141", "HUM 1E1", "TRN 121"]
        },
        2: {
            "Fall":   ["CHE 218", "EEP 216", "BME 251", "EMP x13", "CSE 227", "MEC 216"],
            "Spring": ["MEC 249", "CSE 236", "EEC 238", "MEC x36", "EMP x14", "HUM xE4"]
        },
        3: {
            "Fall":   ["BME 391", "BME 351", "EEC 319", "EEC 346", "EEC 377", "EMP x18"],
            "Spring": ["BME 326", "MEC 336", "EEC 367", "BME 392", "EMP x16", "HUM xE5"]
        },
        4: {
            "Fall":   ["BME 441", "BME 477", "BME 4E1", "BME 4E2", "BME 4E3", "BME 401"],
            "Spring": ["BME 442", "BME 478", "BME 4E4", "BME 4E5", "BME 4E6", "BME 402"]
        }
    }
    }


}


class Command(BaseCommand):
    help = "Seeds CourseClasses using the strict Curriculum Blueprint."

    def handle(self, *args, **kwargs):
        term = Term.objects.filter(is_active=True).first()
        if not term:
            self.stdout.write(self.style.ERROR("No active term found."))
            return

        # Determine if we are in Fall or Spring based on term name
        season = "Fall" if "Fall" in term.name else "Spring"

        groups = list(StudyGroup.objects.filter(term=term).select_related("discipline"))
        if not groups:
            self.stdout.write(self.style.ERROR("No study groups found. Run seed_study_groups first."))
            return

        created_count = 0
        missing_courses = set()

        for group in groups:
            disc_code = group.discipline.code
            year = group.year_level

            # 1. Lookup Blueprint
            blueprint = CURRICULUM_BLUEPRINT.get(disc_code)
            if not blueprint:
                continue # Skip if we haven't written the blueprint for this discipline yet
            
            term_courses = blueprint.get(year, {}).get(season, [])

            # 2. Assign Courses
            for course_code in term_courses:
                course = Course.objects.filter(code=course_code).first()
                if not course:
                    missing_courses.add(course_code)
                    continue

                _, created = CourseClass.objects.get_or_create(
                    course=course,
                    term=term,
                    group=group,
                )
                if created:
                    created_count += 1

        self.stdout.write(self.style.SUCCESS(f"Successfully created {created_count} CourseClasses for {term.name}."))
        
        if missing_courses:
            self.stdout.write(self.style.WARNING(f"WARNING: The following courses are in the blueprint but missing from the database: {', '.join(missing_courses)}"))