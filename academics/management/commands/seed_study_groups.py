import random
from django.core.management.base import BaseCommand
from academics.models import Discipline, Term, StudyGroup

YEAR_LEVELS = [1, 2, 3, 4]
random.seed(42)

class Command(BaseCommand):
    help = "Seeds StudyGroups across all terms."

    def handle(self, *args, **kwargs):
        disciplines = list(Discipline.objects.all())
        if not disciplines:
            self.stdout.write(self.style.ERROR("No disciplines found."))
            return

        for term in Term.objects.all():
            self.stdout.write(f"Seeding study groups for term: {term.name}")
            created_count = 0
            
            for discipline in disciplines:
                for year_level in YEAR_LEVELS:
                    n_groups = 2
                    for number in range(1, n_groups + 1):
                        _, created = StudyGroup.objects.get_or_create(
                            discipline=discipline,
                            term=term,
                            year_level=year_level,
                            number=number,
                        )
                        if created:
                            created_count += 1

            total = StudyGroup.objects.filter(term=term).count()
            self.stdout.write(self.style.SUCCESS(f" {created_count} study groups created. Total for {term.name}: {total}"))