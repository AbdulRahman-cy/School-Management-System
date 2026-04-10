from django.core.management.base import BaseCommand
from academics.models import Department, Discipline

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
        self.stdout.write(self.style.SUCCESS("✅ 16 Scientific Departments loaded."))

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
        self.stdout.write(self.style.SUCCESS("✅ 12 SSP Departments loaded. Total: 28 Departments."))

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
        self.stdout.write(self.style.SUCCESS("✅ 12 SSP Disciplines loaded."))

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
        self.stdout.write(self.style.SUCCESS("✅ 11 GSP Disciplines loaded."))

        self.stdout.write(self.style.SUCCESS(
            "\n🚀 Seeding complete. 28 Departments | 11 GSP Disciplines | 12 SSP Disciplines"
        ))