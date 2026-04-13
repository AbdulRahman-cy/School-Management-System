from django.core.management.base import BaseCommand
from academics.models import Department, Room


class Command(BaseCommand):
    help = "Seeds rooms for the Faculty of Engineering"

    def handle(self, *args, **kwargs):

        # ── helpers ──────────────────────────────────────────────
        def dept(code):
            return Department.objects.filter(code=code).first()

        def room(code, name, capacity, room_type, dept_code=None):
            return {
                "code":      code,
                "name":      name,
                "capacity":  capacity,
                "room_type": room_type,
                "dept_code": dept_code,
            }

        # ═══════════════════════════════════════════════════════════
        # BUILDING A  —  General large lecture halls (shared pool)
        # ═══════════════════════════════════════════════════════════
        building_a = [
            room("A-101", "Lecture Hall A1", 300, "LECTURE"),
            room("A-102", "Lecture Hall A2", 300, "LECTURE"),
            room("A-103", "Lecture Hall A3", 250, "LECTURE"),
            room("A-104", "Lecture Hall A4", 250, "LECTURE"),
            room("A-105", "Lecture Hall A5", 200, "LECTURE"),
            room("A-106", "Lecture Hall A6", 200, "LECTURE"),
            room("A-201", "Lecture Hall A7", 150, "LECTURE"),
            room("A-202", "Lecture Hall A8", 150, "LECTURE"),
            room("A-203", "Lecture Hall A9", 120, "LECTURE"),
            room("A-204", "Lecture Hall A10", 120, "LECTURE"),
            room("A-205", "Seminar Room A1", 60,  "SEMINAR"),
            room("A-206", "Seminar Room A2", 60,  "SEMINAR"),
            room("A-207", "Seminar Room A3", 40,  "SEMINAR"),
            room("A-208", "Seminar Room A4", 40,  "SEMINAR"),
        ]

        # ═══════════════════════════════════════════════════════════
        # BUILDING B  —  Civil cluster
        # Departments: CVE, STR, IRH, TRE, SAN
        # ═══════════════════════════════════════════════════════════
        building_b = [
            room("B-101", "STR Lecture Hall 1",       120, "LECTURE", "STR"),
            room("B-102", "STR Lecture Hall 2",       120, "LECTURE", "STR"),
            room("B-103", "IRH Lecture Hall",         100, "LECTURE", "IRH"),
            room("B-104", "TRE Lecture Hall",         100, "LECTURE", "TRE"),
            room("B-105", "SAN Lecture Hall",         80,  "LECTURE", "SAN"),
            room("B-201", "Structures Lab",           40,  "LAB",     "STR"),
            room("B-202", "Materials Testing Lab",    40,  "LAB",     "STR"),
            room("B-203", "Hydraulics Lab",           40,  "LAB",     "IRH"),
            room("B-204", "Surveying Lab",            40,  "LAB",     "TRE"),
            room("B-205", "Sanitary Engineering Lab", 35,  "LAB",     "SAN"),
            room("B-206", "Soil Mechanics Lab",       35,  "LAB",     "STR"),
            room("B-301", "Civil Seminar Room 1",     50,  "SEMINAR", "CVE"),
            room("B-302", "Civil Seminar Room 2",     50,  "SEMINAR", "CVE"),
            room("B-303", "Civil Seminar Room 3",     30,  "SEMINAR", "CVE"),
        ]

        # ═══════════════════════════════════════════════════════════
        # BUILDING C  —  Mechanical cluster
        # Departments: MEC, MIE, NAM
        # ═══════════════════════════════════════════════════════════
        building_c = [
            room("C-101", "MEC Lecture Hall 1",          120, "LECTURE", "MEC"),
            room("C-102", "MEC Lecture Hall 2",          120, "LECTURE", "MEC"),
            room("C-103", "MEC Lecture Hall 3",          100, "LECTURE", "MEC"),
            room("C-104", "MIE Lecture Hall 1",          100, "LECTURE", "MIE"),
            room("C-105", "MIE Lecture Hall 2",          80,  "LECTURE", "MIE"),
            room("C-106", "NAM Lecture Hall",            80,  "LECTURE", "NAM"),
            room("C-201", "Thermodynamics Lab",          40,  "LAB",     "MEC"),
            room("C-202", "Fluid Mechanics Lab",         40,  "LAB",     "MEC"),
            room("C-203", "Heat Transfer Lab",           35,  "LAB",     "MEC"),
            room("C-204", "Mechanical Design Lab",       35,  "LAB",     "MEC"),
            room("C-205", "Combustion Lab",              30,  "LAB",     "MEC"),
            room("C-206", "Machining & Manufacturing Lab", 40, "LAB",    "MIE"),
            room("C-207", "Metrology Lab",               35,  "LAB",     "MIE"),
            room("C-208", "Naval Architecture Lab",      40,  "LAB",     "NAM"),
            room("C-209", "Marine Structures Lab",       35,  "LAB",     "NAM"),
            room("C-301", "Mechanical Seminar Room 1",   50,  "SEMINAR", "MEC"),
            room("C-302", "Mechanical Seminar Room 2",   50,  "SEMINAR", "MEC"),
            room("C-303", "MIE Seminar Room",            40,  "SEMINAR", "MIE"),
            room("C-304", "NAM Seminar Room",            40,  "SEMINAR", "NAM"),
        ]

        # ═══════════════════════════════════════════════════════════
        # BUILDING D  —  Electrical cluster
        # Departments: EEC, EEP
        # ═══════════════════════════════════════════════════════════
        building_d = [
            room("D-101", "EEC Lecture Hall 1",        120, "LECTURE", "EEC"),
            room("D-102", "EEC Lecture Hall 2",        120, "LECTURE", "EEC"),
            room("D-103", "EEP Lecture Hall 1",        120, "LECTURE", "EEP"),
            room("D-104", "EEP Lecture Hall 2",        100, "LECTURE", "EEP"),
            room("D-105", "EEP Lecture Hall 3",        80,  "LECTURE", "EEP"),
            room("D-201", "Electronics Lab 1",         40,  "LAB",     "EEC"),
            room("D-202", "Electronics Lab 2",         40,  "LAB",     "EEC"),
            room("D-203", "Communications Lab",        35,  "LAB",     "EEC"),
            room("D-204", "Microwave Lab",             30,  "LAB",     "EEC"),
            room("D-205", "Power Systems Lab",         40,  "LAB",     "EEP"),
            room("D-206", "Electrical Machines Lab",   40,  "LAB",     "EEP"),
            room("D-207", "Power Electronics Lab",     35,  "LAB",     "EEP"),
            room("D-208", "Control Systems Lab",       35,  "LAB",     "EEP"),
            room("D-301", "EEC Seminar Room 1",        50,  "SEMINAR", "EEC"),
            room("D-302", "EEC Seminar Room 2",        40,  "SEMINAR", "EEC"),
            room("D-303", "EEP Seminar Room 1",        50,  "SEMINAR", "EEP"),
            room("D-304", "EEP Seminar Room 2",        40,  "SEMINAR", "EEP"),
        ]

        # ═══════════════════════════════════════════════════════════
        # BUILDING E  —  Chemical, Textile, Nuclear
        # Departments: CHE, TEE, NRE
        # ═══════════════════════════════════════════════════════════
        building_e = [
            room("E-101", "CHE Lecture Hall 1",          120, "LECTURE", "CHE"),
            room("E-102", "CHE Lecture Hall 2",          100, "LECTURE", "CHE"),
            room("E-103", "TEE Lecture Hall 1",          100, "LECTURE", "TEE"),
            room("E-104", "TEE Lecture Hall 2",          80,  "LECTURE", "TEE"),
            room("E-105", "NRE Lecture Hall",            80,  "LECTURE", "NRE"),
            room("E-201", "Chemical Engineering Lab 1",  40,  "LAB",     "CHE"),
            room("E-202", "Chemical Engineering Lab 2",  40,  "LAB",     "CHE"),
            room("E-203", "Analytical Chemistry Lab",    35,  "LAB",     "CHE"),
            room("E-204", "Spinning Lab",                40,  "LAB",     "TEE"),
            room("E-205", "Weaving Lab",                 40,  "LAB",     "TEE"),
            room("E-206", "Textile Testing Lab",         35,  "LAB",     "TEE"),
            room("E-207", "Nuclear Physics Lab",         35,  "LAB",     "NRE"),
            room("E-208", "Radiation Detection Lab",     30,  "LAB",     "NRE"),
            room("E-301", "CHE Seminar Room 1",          50,  "SEMINAR", "CHE"),
            room("E-302", "CHE Seminar Room 2",          40,  "SEMINAR", "CHE"),
            room("E-303", "TEE Seminar Room",            40,  "SEMINAR", "TEE"),
            room("E-304", "NRE Seminar Room",            40,  "SEMINAR", "NRE"),
        ]

        # ═══════════════════════════════════════════════════════════
        # BUILDING F  —  Computer & Systems Engineering
        # Department: CSE
        # ═══════════════════════════════════════════════════════════
        building_f = [
            room("F-101", "CSE Lecture Hall 1",       120, "LECTURE", "CSE"),
            room("F-102", "CSE Lecture Hall 2",       120, "LECTURE", "CSE"),
            room("F-103", "CSE Lecture Hall 3",       100, "LECTURE", "CSE"),
            room("F-201", "Programming Lab 1",        40,  "LAB",     "CSE"),
            room("F-202", "Programming Lab 2",        40,  "LAB",     "CSE"),
            room("F-203", "Networks Lab",             35,  "LAB",     "CSE"),
            room("F-204", "Embedded Systems Lab",     35,  "LAB",     "CSE"),
            room("F-205", "AI & Robotics Lab",        30,  "LAB",     "CSE"),
            room("F-301", "CSE Seminar Room 1",       50,  "SEMINAR", "CSE"),
            room("F-302", "CSE Seminar Room 2",       40,  "SEMINAR", "CSE"),
        ]

        # ═══════════════════════════════════════════════════════════
        # BUILDING G  —  Architecture
        # Departments: ARC
        # ═══════════════════════════════════════════════════════════
        building_g = [
            room("G-101", "ARC Lecture Hall 1",   100, "LECTURE", "ARC"),
            room("G-102", "ARC Lecture Hall 2",   100, "LECTURE", "ARC"),
            room("G-201", "Architecture Lab 1",   40,  "LAB",     "ARC"),
            room("G-202", "Architecture Lab 2",   40,  "LAB",     "ARC"),
            room("G-301", "ARC Seminar Room 1",   50,  "SEMINAR", "ARC"),
            room("G-302", "ARC Seminar Room 2",   40,  "SEMINAR", "ARC"),
        ]

        # ═══════════════════════════════════════════════════════════
        # BUILDING H  —  EMP (Mathematics & Physics) — service dept
        # Department: EMP
        # ═══════════════════════════════════════════════════════════
        building_h = [
            room("H-101", "Mathematics Lecture Hall 1", 150, "LECTURE", "EMP"),
            room("H-102", "Mathematics Lecture Hall 2", 150, "LECTURE", "EMP"),
            room("H-103", "Mathematics Lecture Hall 3", 120, "LECTURE", "EMP"),
            room("H-201", "Physics Lab 1",              40,  "LAB",     "EMP"),
            room("H-202", "Physics Lab 2",              40,  "LAB",     "EMP"),
            room("H-301", "EMP Seminar Room 1",         50,  "SEMINAR", "EMP"),
            room("H-302", "EMP Seminar Room 2",         40,  "SEMINAR", "EMP"),
        ]

        # ═══════════════════════════════════════════════════════════
        # Combine all
        # ═══════════════════════════════════════════════════════════
        all_rooms = (
            building_a
            + building_b
            + building_c
            + building_d
            + building_e
            + building_f
            + building_g
            + building_h
        )

        self.stdout.write("Creating rooms...")
        created_count = 0
        for r in all_rooms:
            department = dept(r["dept_code"]) if r["dept_code"] else None
            _, created = Room.objects.get_or_create(
                code=r["code"],
                defaults={
                    "name":      r["name"],
                    "capacity":  r["capacity"],
                    "room_type": r["room_type"],
                    "department": department,
                    "is_active": True,
                },
            )
            if created:
                created_count += 1

        total = len(all_rooms)
        self.stdout.write(self.style.SUCCESS(
            f" {created_count} rooms created ({total - created_count} already existed). "
            f"Total rooms: {total}"
        ))

        # ── Summary breakdown ─────────────────────────────────────
        lecture_total = sum(1 for r in all_rooms if r["room_type"] == "LECTURE")
        lab_total     = sum(1 for r in all_rooms if r["room_type"] == "LAB")
        seminar_total = sum(1 for r in all_rooms if r["room_type"] == "SEMINAR")
        shared_total  = sum(1 for r in all_rooms if not r["dept_code"])

        self.stdout.write(f"   Lecture halls : {lecture_total}")
        self.stdout.write(f"   Labs          : {lab_total}")
        self.stdout.write(f"   Seminar rooms : {seminar_total}")
        self.stdout.write(f"   Shared (no dept): {shared_total}")