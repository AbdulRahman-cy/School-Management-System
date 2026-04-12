import random
from faker import Faker
from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth.hashers import make_password

# IMPORTANT: Change 'users.models' to whatever your auth app is named (e.g., 'accounts.models')
from users.models import BaseUser, TeacherProfile, StudentProfile
from academics.models import Department, Discipline

class Command(BaseCommand):
    help = 'Seeds the database with 1,000 Teachers and 10,000 Students at lightning speed'

    def handle(self, *args, **kwargs):
        fake = Faker()
        
        # Grab all existing departments and disciplines so we can assign them randomly
        departments = list(Department.objects.all())
        disciplines = list(Discipline.objects.all())

        if not departments or not disciplines:
            self.stdout.write(self.style.ERROR("Error: No Departments or Disciplines found! Run 'python manage.py seed_data' first."))
            return

        self.stdout.write("Initializing massive user generation...")

        # ---------------------------------------------------------
        # PRE-HASH THE PASSWORD (The 55-minute timesaver)
        # ---------------------------------------------------------
        hashed_password = make_password("password123") 

        # ---------------------------------------------------------
        # 1. GENERATE 1,000 TEACHERS
        # ---------------------------------------------------------
        self.stdout.write("Generating 1,000 Teachers...")
        with transaction.atomic(): 
            for i in range(1000):
                first_name = fake.first_name()
                last_name = fake.last_name()
                
                # Using the loop index 'i' guarantees 100% unique emails
                email = f"t.{first_name.lower()}.{last_name.lower()}{i}@alexu.edu.eg"

                user = BaseUser.objects.create(
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    password=hashed_password, 
                    role=BaseUser.Role.TEACHER
                )

                TeacherProfile.objects.create(
                    user=user,
                    department=random.choice(departments),
                    rank=random.choice(TeacherProfile.Rank.choices)[0]
                )
        self.stdout.write(self.style.SUCCESS("✅ 1,000 Teachers safely loaded!"))

        # ---------------------------------------------------------
        # 2. GENERATE 10,000 STUDENTS
        # ---------------------------------------------------------
        self.stdout.write("Generating 10,000 Students...")
        with transaction.atomic():
            for i in range(10000):
                first_name = fake.first_name()
                last_name = fake.last_name()
                
                email = f"s.{first_name.lower()}.{last_name.lower()}{i}@alexu.edu.eg"

                user = BaseUser.objects.create(
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    password=hashed_password, 
                    role=BaseUser.Role.STUDENT
                )

                StudentProfile.objects.create(
                    user=user,
                    discipline=random.choice(disciplines),
                    enrollment_year=random.randint(2022, 2026),
                    cumulative_gpa=round(random.uniform(2.0, 4.0), 2)
                )
        
        self.stdout.write(self.style.SUCCESS("✅ 10,000 Students safely loaded!"))
        self.stdout.write(self.style.SUCCESS("\n🚀 Database Seeding 100% Complete! All users can log in with: password123"))