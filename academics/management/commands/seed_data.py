from django.core.management.base import BaseCommand
from academics.models import Department, Discipline
import datetime 
from django.core.management.base import BaseCommand
from academics.models import Department, Discipline, Term 

class Command(BaseCommand):
    help = 'Seeds departments and disciplines for Alexandria University'

    def handle(self, *args, **kwargs):

        # ─── 16 Scientific Departments ────────────────────────────
        scientific_departments = [
            {"code": "EMP", "name": "Engineering Mathematics and Physics"},
            {"code": "ARC", "name": "Architectural Engineering"},
            {"code": "CVE", "name": "Civil Engineering"}, # <-- ADDED HERE
            {"code": "STR", "name": "Structural Engineering"},
            {"code": "IRH", "name": "Irrigation Engineering and Hydraulics"},
            {"code": "TRE", "name": "Transportation Engineering"},
            {"code": "SAN", "name": "Sanitary Engineering"},
            {"code": "MEC", "name": "Mechanical Engineering"},
            {"code": "EEC", "name": "Electrical Engineering - Communications"},
            {"code": "EEP", "name": "Electrical Engineering - Power"},
            {"code": "CHE", "name": "Chemical Engineering"},
            {"code": "TEE", "name": "Textile Engineering"},
            {"code": "NAM", "name": "Naval Architecture and Marine Engineering"},
            {"code": "MIE", "name": "Production Engineering"},
            {"code": "NRE", "name": "Nuclear and Radiation Engineering"},
            {"code": "CSE", "name": "Computer and Systems Engineering"},
        ]

        self.stdout.write("Creating 16 Scientific Departments...")
        for d in scientific_departments:
            Department.objects.get_or_create(code=d["code"], defaults={"name": d["name"]})
        self.stdout.write(self.style.SUCCESS(" 16 Scientific Departments loaded."))

        # ─── 12 SSP — inserted into BOTH Department and Discipline ─
        ssp_programs = [
            {"code": "MSE", "name": "Materials Science and Engineering"},
            {"code": "GPE", "name": "Gas and Petrochemicals Engineering"},
            {"code": "EME", "name": "Electromechanical Engineering"},
            {"code": "CCE", "name": "Computer and Communication Engineering"},
            {"code": "CAE", "name": "Architectural and Construction Engineering"},
            {"code": "OCE", "name": "Offshore and Coastal Engineering"},
            {"code": "BME", "name": "Biomedical Engineering"},
            {"code": "CEE", "name": "Civil and Environmental Engineering"},
            {"code": "MRE", "name": "Mechatronics and Robotics Engineering"},
            {"code": "MAE", "name": "Mechanical and Aerospace Engineering"},
            {"code": "EEN", "name": "Electronics Engineering with Nanotechnology"},
            {"code": "RSA", "name": "Resilient and Smart Architectural Engineering"},
        ]

        self.stdout.write("Creating 12 SSP Departments...")
        for p in ssp_programs:
            Department.objects.get_or_create(code=p["code"], defaults={"name": p["name"]})
        self.stdout.write(self.style.SUCCESS(" 12 SSP Departments loaded. Total: 28 Departments."))

        self.stdout.write("Creating 12 SSP Disciplines...")
        for p in ssp_programs:
            dept = Department.objects.get(code=p["code"])
            Discipline.objects.get_or_create(
                code=p["code"],
                defaults={
                    "name":         p["name"],
                    "program_type": "SSP", # Or Discipline.ProgramType.SSP if you use TextChoices
                    "department":   dept,
                }
            )
        self.stdout.write(self.style.SUCCESS(" 12 SSP Disciplines loaded."))

        # ─── 11 GSP Programs ──────────────────────────────────────
        gsp_programs = [
            {"code": "ARC", "name": "Architectural Engineering",                "dept": "ARC"},
            {"code": "CVE", "name": "Civil Engineering",                        "dept": "CVE"}, # <-- FIXED LINK HERE
            {"code": "MEC", "name": "Mechanical Engineering",                   "dept": "MEC"},
            {"code": "EEC", "name": "Communications and Electronics Engineering", "dept": "EEC"},
            {"code": "EEP", "name": "Electrical Power and Machines Engineering",  "dept": "EEP"},
            {"code": "CHE", "name": "Chemical Engineering",                       "dept": "CHE"},
            {"code": "TEE", "name": "Textile Engineering",                        "dept": "TEE"},
            {"code": "NAM", "name": "Naval Architecture and Marine Engineering",  "dept": "NAM"},
            {"code": "MIE", "name": "Manufacturing and Industrial Engineering",   "dept": "MIE"},
            {"code": "NRE", "name": "Nuclear and Radiation Engineering",          "dept": "NRE"},
            {"code": "CSE", "name": "Computer and Systems Engineering",           "dept": "CSE"},
        ]

        self.stdout.write("Creating 11 GSP Disciplines...")
        for p in gsp_programs:
            dept = Department.objects.filter(code=p["dept"]).first() if p["dept"] else None
            Discipline.objects.get_or_create(
                code=p["code"] + "_GSP", # Appended _GSP to prevent unique constraint clashes with the SSPs/Depts
                defaults={
                    "name":         p["name"],
                    "program_type": "GENERAL", # Or Discipline.ProgramType.GSP
                    "department":   dept,
                }
            )
        self.stdout.write(self.style.SUCCESS(" 11 GSP Disciplines loaded."))

        self.stdout.write(self.style.SUCCESS(
            "\n Seeding complete. 28 Departments | 11 GSP Disciplines | 12 SSP Disciplines"
        ))

        # =========================================================
        # 0. ACADEMIC TERMS (8 Terms: Spring 2023 to Fall 2026)
        # =========================================================
        terms_data = [
            {
                "name": "Spring 2023",
                "start_date": datetime.date(2023, 2, 11),
                "end_date": datetime.date(2023, 6, 15),
                "is_active": False
            },
            {
                "name": "Fall 2023",
                "start_date": datetime.date(2023, 9, 30),
                "end_date": datetime.date(2024, 1, 25),
                "is_active": False
            },
            {
                "name": "Spring 2024",
                "start_date": datetime.date(2024, 2, 10),
                "end_date": datetime.date(2024, 6, 15),
                "is_active": False
            },
            {
                "name": "Fall 2024",
                "start_date": datetime.date(2024, 9, 28),
                "end_date": datetime.date(2025, 1, 23),
                "is_active": False
            },
            {
                "name": "Spring 2025",
                "start_date": datetime.date(2025, 2, 8),
                "end_date": datetime.date(2025, 6, 15),
                "is_active": False
            },
            {
                "name": "Fall 2025",
                "start_date": datetime.date(2025, 9, 27),
                "end_date": datetime.date(2026, 1, 22),
                "is_active": False
            },
            {
                "name": "Spring 2026",
                "start_date": datetime.date(2026, 2, 14),
                "end_date": datetime.date(2026, 6, 15),
                "is_active": True  # <--- Setting the current timeline as active!
            },
            {
                "name": "Fall 2026",
                "start_date": datetime.date(2026, 9, 26),
                "end_date": datetime.date(2027, 1, 21),
                "is_active": False
            }
        ]

        self.stdout.write("Creating Academic Terms...")
        for term in terms_data:
            obj, created = Term.objects.get_or_create(
                name=term["name"],
                defaults={
                    "start_date": term["start_date"],
                    "end_date": term["end_date"],
                    "is_active": term["is_active"]
                }
            )
            # Safely trigger your custom save() method if activating a term
            if term["is_active"] and not obj.is_active:
                obj.is_active = True
                obj.save()
                
        self.stdout.write(self.style.SUCCESS(f" {len(terms_data)} Academic Terms loaded!"))