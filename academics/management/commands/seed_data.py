import datetime 
from django.core.management.base import BaseCommand
from academics.models import Department, Discipline, Term, Course 

class Command(BaseCommand):
    help = 'Seeds departments, disciplines, terms, and courses for Alexandria University'

    def handle(self, *args, **kwargs):

        # ─── 16 Scientific Departments ────────────────────────────
        scientific_departments = [
            {"code": "EMP", "name": "Engineering Mathematics and Physics"},
            {"code": "ARC", "name": "Architectural Engineering"},
            {"code": "CVE", "name": "Civil Engineering"}, 
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
                    "program_type": "SSP", 
                    "department":   dept,
                }
            )
        self.stdout.write(self.style.SUCCESS(" 12 SSP Disciplines loaded."))

        # ─── 11 GSP Programs ──────────────────────────────────────
        gsp_programs = [
            {"code": "ARC", "name": "Architectural Engineering",                "dept": "ARC"},
            {"code": "CVE", "name": "Civil Engineering",                        "dept": "CVE"}, 
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
                code=p["code"] + "_GSP", 
                defaults={
                    "name":         p["name"],
                    "program_type": "GSP", 
                    "department":   dept,
                }
            )
        self.stdout.write(self.style.SUCCESS(" 11 GSP Disciplines loaded."))

        # =========================================================
        # ACADEMIC TERMS (8 Terms: Spring 2023 to Fall 2026)
        # =========================================================
        terms_data = [
            {"name": "Spring 2023", "start_date": datetime.date(2023, 2, 11), "end_date": datetime.date(2023, 6, 15), "is_active": False},
            {"name": "Fall 2023",   "start_date": datetime.date(2023, 9, 30), "end_date": datetime.date(2024, 1, 25), "is_active": False},
            {"name": "Spring 2024", "start_date": datetime.date(2024, 2, 10), "end_date": datetime.date(2024, 6, 15), "is_active": False},
            {"name": "Fall 2024",   "start_date": datetime.date(2024, 9, 28), "end_date": datetime.date(2025, 1, 23), "is_active": False},
            {"name": "Spring 2025", "start_date": datetime.date(2025, 2, 8),  "end_date": datetime.date(2025, 6, 15), "is_active": False},
            {"name": "Fall 2025",   "start_date": datetime.date(2025, 9, 27), "end_date": datetime.date(2026, 1, 22), "is_active": False},
            {"name": "Spring 2026", "start_date": datetime.date(2026, 2, 14), "end_date": datetime.date(2026, 6, 15), "is_active": True},
            {"name": "Fall 2026",   "start_date": datetime.date(2026, 9, 26), "end_date": datetime.date(2027, 1, 21), "is_active": False}
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
            if term["is_active"] and not obj.is_active:
                obj.is_active = True
                obj.save()
                
        self.stdout.write(self.style.SUCCESS(f" {len(terms_data)} Academic Terms loaded!"))

        # =========================================================
        # COURSES (Extracted from Screenshots)
        # =========================================================
        
        courses_data = [
            # ─── Screenshot 1 ─────────────────────────────────────────
            {"code": "STR 211", "title": "Structural Analysis -1", "credits": 3},
            {"code": "STR 212", "title": "Mechanics of Structures", "credits": 3},
            {"code": "STR 221", "title": "Properties and Testing of Materials – 1", "credits": 3},
            {"code": "STR 313", "title": "Structural Analysis -2", "credits": 3},
            {"code": "STR 222", "title": "Properties and Testing of Materials – 2", "credits": 3},
            {"code": "STR 231", "title": "Fundamentals of Reinforced Concrete", "credits": 3},
            {"code": "STR 341", "title": "Soil Mechanics", "credits": 3},
            {"code": "STR 331", "title": "Design of Reinforced Concrete Structures -1", "credits": 3},
            {"code": "STR 351", "title": "Design of Steel Structures-1", "credits": 3},
            {"code": "IRH 211", "title": "Fundamentals of Hydraulics", "credits": 3},
            {"code": "IRH 312", "title": "Open Channel Hydraulics", "credits": 3},
            {"code": "IRH 331", "title": "Irrigation and Drainage Engineering", "credits": 3},
            {"code": "TRE 211", "title": "Fundamentals of Surveying and Geomatics", "credits": 3},
            {"code": "TRE 212", "title": "Surveying and Topography – 1", "credits": 3},
            {"code": "TRE 221", "title": "Civil Drawing", "credits": 3},
            {"code": "TRE 231", "title": "Engineering Geology", "credits": 3},
            {"code": "TRE 313", "title": "Surveying and Topography – 2", "credits": 3},
            {"code": "TRE 341", "title": "Transportation Planning and Traffic Engineering", "credits": 3},
            {"code": "TRE 361", "title": "Highway Engineering", "credits": 3},

            # ─── Screenshot 2 ─────────────────────────────────────────
            {"code": "STR 433", "title": "Design of Reinforced Concrete Structures -2", "credits": 2},
            {"code": "STR 342", "title": "Foundation Engineering", "credits": 3},
            {"code": "STR 452", "title": "Design of Steel Structures-2", "credits": 3},
            {"code": "STR 461", "title": "Management of Construction Projects", "credits": 3},
            {"code": "IRH 432", "title": "Design of Water Crossing Structures and Weirs", "credits": 2},
            {"code": "IRH 414", "title": "Design of Hydraulic Structures", "credits": 2},
            {"code": "TRE 451", "title": "Harbor Engineering and Marine Structures", "credits": 3},
            {"code": "SAN 311", "title": "Sanitary Engineering", "credits": 3},
            {"code": "CVE 401", "title": "Graduation Project", "credits": 3},
            {"code": "CVE 3E1", "title": "Advanced Civil Engineering Applications (Elective - 1)", "credits": 3},
            {"code": "CVE 4E2", "title": "Sustainable Urban Infrastructure (Elective - 2)", "credits": 3},
            {"code": "CVE 4E3", "title": "Advanced Concrete Technology (Elective - 3)", "credits": 2},
            {"code": "CVE 4E4", "title": "Smart Cities and Transportation (Elective - 4)", "credits": 2},
            {"code": "CVE 4E5", "title": "Geotechnical Earthquake Engineering (Elective - 5)", "credits": 2},

            # ─── Screenshot 3 ─────────────────────────────────────────
            {"code": "MEC 211", "title": "Thermodynamics-1", "credits": 3},
            {"code": "MEC 212", "title": "Thermodynamics-2", "credits": 3},
            {"code": "MEC 232", "title": "Fundamentals of Fluid Mechanics", "credits": 2},
            {"code": "MEC 241", "title": "Mechanical Drawing-1", "credits": 3},
            {"code": "MEC 243", "title": "Mechanics of Materials", "credits": 3},
            {"code": "MEC 244", "title": "Strength of Materials", "credits": 2},
            {"code": "MEC 245", "title": "Dynamics of Rigid Bodies and Mechanisms", "credits": 3},
            {"code": "MEC 246", "title": "Mechanics of Machinery", "credits": 3},
            {"code": "EEP x82", "title": "Introduction to Electric Circuits and Electrical Machines", "credits": 3},
            {"code": "EEP x51", "title": "Introduction to Power Electronics", "credits": 3},
            {"code": "MIE x61", "title": "Basic Manufacturing Processes", "credits": 2},
            {"code": "MEC 311", "title": "Heat Transfer", "credits": 3},
            {"code": "MEC 321", "title": "Fundamentals of Combustion Engineering", "credits": 2},
            {"code": "MEC 331", "title": "Fluid Mechanics-1", "credits": 3},
            {"code": "MEC 341", "title": "Mechanical Design-1", "credits": 3},
            {"code": "MEC 343", "title": "Mechanical Vibrations", "credits": 3},
            {"code": "MEC 352", "title": "Applied Numerical Methods for Mechanical Engineering", "credits": 3},
            {"code": "MEC 412", "title": "Renewable Energy", "credits": 3},
            {"code": "MEC 422", "title": "Gas Dynamics", "credits": 3},
            {"code": "MEC 451", "title": "Mechanical Engineering Measurements", "credits": 3},

            # ─── Screenshot 4 ─────────────────────────────────────────
            {"code": "MEC 4E1", "title": "Advanced Heat Transfer (Elective - 1)", "credits": 3},
            {"code": "MEC 4E2", "title": "Computational Fluid Dynamics (Elective - 2)", "credits": 3},
            {"code": "MEC 4E3", "title": "Robotics and Automation (Elective - 3)", "credits": 3},
            {"code": "MEC 4E4", "title": "Nanotechnology in Mechanical Engineering (Elective - 4)", "credits": 3},
            {"code": "MEC 4E5", "title": "Applied Aerodynamics (Elective - 5)", "credits": 3},
            {"code": "MEC 413", "title": "Design of Thermal Equipment", "credits": 3},
            {"code": "MEC 414", "title": "Refrigeration and Air Conditioning Equipment and Applications", "credits": 3},
            {"code": "MEC 415", "title": "Operation and Management of Thermal Power Plants", "credits": 3},
            {"code": "MEC 416", "title": "Water Desalination Technology", "credits": 3},
            {"code": "MEC 421", "title": "Gas Turbines in Aviation", "credits": 3},
            {"code": "MEC 423", "title": "Automotive and Autotronics Engineering", "credits": 3},
            {"code": "MEC 424", "title": "Alternative Fuels", "credits": 3},
            {"code": "MEC 426", "title": "Maintenance and Fault Diagnosis of Internal Combustion Engines", "credits": 3},
            {"code": "MEC 434", "title": "Turbomachinery", "credits": 3},
            {"code": "MEC 435", "title": "Microfluidics", "credits": 3},
            {"code": "MEC 436", "title": "Fluid Power Systems", "credits": 3},
            {"code": "MEC 438", "title": "Pumping Systems", "credits": 3},
            {"code": "MEC 443", "title": "Codes and Specifications of Mechanical Systems", "credits": 3},
            {"code": "MEC 444", "title": "Industrial Mechanisms", "credits": 3},
            {"code": "MEC 445", "title": "Maintenance Planning", "credits": 3},
            {"code": "MEC 446", "title": "Introduction to Mechatronic Systems", "credits": 3},

            # ─── Screenshot 5 ─────────────────────────────────────────
            {"code": "EEC 231", "title": "Electronic Circuits and Devices", "credits": 3},
            {"code": "EEC 241", "title": "Introduction to Logic Circuits & Computer Programming", "credits": 3},
            {"code": "EEC 271", "title": "Signals and Systems", "credits": 3},
            {"code": "EEC 281", "title": "Information Transmission Principles", "credits": 3},
            {"code": "EEC 311", "title": "Electrical Circuit Analysis", "credits": 3},
            {"code": "EEC 332", "title": "Solid State Electronics: Physics and Devices", "credits": 3},
            {"code": "EEC 333", "title": "Electronic Circuit Analysis", "credits": 3},
            {"code": "EEC 342", "title": "Logic Circuit Design", "credits": 3},
            {"code": "EEC 343", "title": "Microprocessors and Microcontrollers", "credits": 3},
            {"code": "EEC 361", "title": "Electromagnetic Fields", "credits": 3},
            {"code": "EEC 362", "title": "Waves and Propagation", "credits": 3},
            {"code": "EEC 371", "title": "Digital Signal Processing", "credits": 3},
            {"code": "EEC 381", "title": "Introduction to Communications", "credits": 3},
            {"code": "EEC 462", "title": "Microwave & Optical Transmission Media", "credits": 3},
            {"code": "EEP 211", "title": "Electric Circuits", "credits": 3},
            {"code": "EEP 212", "title": "Electrical and Electronic Measurements", "credits": 3},
            {"code": "EEP 271", "title": "Electric Power and Machines", "credits": 3},

            # ─── Screenshot 6 ─────────────────────────────────────────
            {"code": "EEC 334", "title": "Analog Integrated Circuits", "credits": 3},
            {"code": "EEC 382", "title": "Digital Communications", "credits": 3},
            {"code": "EEC 441", "title": "Embedded systems", "credits": 3},
            {"code": "EEC 471", "title": "Automatic Control Systems", "credits": 3},
            {"code": "EEC 481", "title": "Wireless Communications", "credits": 2},
            {"code": "EEC 401", "title": "Graduation Project-1", "credits": 2},
            {"code": "EEC 402", "title": "Graduation Project-2", "credits": 2},
            {"code": "EEC 3E1", "title": "Advanced Antenna Design (Elective-1)", "credits": 3},
            {"code": "EEC 4E1", "title": "Satellite Communications (Elective-2)", "credits": 3},
            {"code": "EEC 4E2", "title": "Computer Vision and Image Processing (Elective-3)", "credits": 3},
            {"code": "EEC 4E3", "title": "IoT Architecture and Protocols (Elective-4)", "credits": 3},
            {"code": "EEC 4E4", "title": "VLSI System Design (Elective-5)", "credits": 3},
            {"code": "EEC 4E5", "title": "Quantum Electronics (Elective-6)", "credits": 3},
            {"code": "EEC 4E6", "title": "Machine Learning for Communications (Elective-7)", "credits": 3},

            # ─── Screenshot 7 ─────────────────────────────────────────
            {"code": "EEP 211", "title": "Electric Circuits", "credits": 3},
            {"code": "EEP 212", "title": "Electrical and Electronic Measurements", "credits": 3},
            {"code": "EEP 213", "title": "Electromagnetic Fields", "credits": 3},
            {"code": "EEP 214", "title": "Principles of Microprocessors", "credits": 3},
            {"code": "EEP 221", "title": "Introduction to Energy Systems", "credits": 3},
            {"code": "EEP 231", "title": "DC Machines and Power Transformers", "credits": 3},
            {"code": "EEP 311", "title": "Advanced Electric Circuits Analysis", "credits": 3},
            {"code": "EEP 312", "title": "Measurement Systems", "credits": 3},
            {"code": "EEP 321", "title": "Transmission and Distribution of Electric Power", "credits": 3},
            {"code": "EEP 322", "title": "Electric Power Equipment", "credits": 3},
            {"code": "EEP 341", "title": "Automatic Control and Computer Applications", "credits": 3},
            {"code": "EEP 351", "title": "Power Electronics-1", "credits": 3},
            {"code": "EEP 441", "title": "Automatic Control Theory", "credits": 3},
            {"code": "EEC 231", "title": "Electronic Circuits and Devices", "credits": 3},
            {"code": "EEC 241", "title": "Logic Circuits & Computer Programming", "credits": 3},
            {"code": "EEC 281", "title": "Information Transmission Principles", "credits": 3},
            {"code": "MEC 453", "title": "Thermodynamics and Fluid Mechanics", "credits": 2},
            {"code": "MEC 419", "title": "Thermal Power Plants", "credits": 2},

            # ─── Screenshot 8 ─────────────────────────────────────────
            {"code": "EEP 331", "title": "AC Machines", "credits": 3},
            {"code": "EEP 332", "title": "Electric Drives", "credits": 3},
            {"code": "EEP 352", "title": "Power Electronics-2", "credits": 3},
            {"code": "EEP 361", "title": "Protection of Electric Power Systems", "credits": 3},
            {"code": "EEP 421", "title": "Power Systems Analysis", "credits": 3},
            {"code": "EEP 422", "title": "High Voltage and its applications", "credits": 3},
            {"code": "EEP 451", "title": "Industrial Automation", "credits": 3},
            {"code": "EEP 401", "title": "Graduation Project 1", "credits": 3},
            {"code": "EEP 402", "title": "Graduation Project 2", "credits": 2},
            {"code": "EEP 4E1", "title": "Smart Grid Technologies (Elective 1)", "credits": 2},
            {"code": "EEP 4E2", "title": "Advanced Power Electronics (Elective 2)", "credits": 2},
            {"code": "EEP 4E3", "title": "Renewable Energy Integration (Elective 3)", "credits": 3},
            {"code": "EEP 4E4", "title": "Power System Stability (Elective 4)", "credits": 2},
            {"code": "EEP 4E5", "title": "Electric Vehicles Infrastructure (Elective 5)", "credits": 3},
            {"code": "EEP 4E6", "title": "Energy Management Systems (Elective 6)", "credits": 3},
        ]

        self.stdout.write("Creating Courses...")
        
        for course_data in courses_data:
            # Extract the department code prefix (e.g., 'STR' from 'STR 211')
            dept_code = course_data["code"].split(" ")[0]
            
            # Map course to existing department
            department = Department.objects.filter(code=dept_code).first()
            
            if not department:
                self.stdout.write(self.style.WARNING(f"Department {dept_code} not found. Skipping {course_data['code']}"))
                continue

            # Update or Create avoids crashing if there are duplicated codes between screenshots 
            Course.objects.update_or_create(
                code=course_data["code"],
                defaults={
                    "title": course_data["title"],
                    "credits": course_data["credits"],
                    "department": department
                }
            )
            
        self.stdout.write(self.style.SUCCESS(f" Successfully loaded courses into the database!"))