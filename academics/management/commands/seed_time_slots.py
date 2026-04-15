"""
academics/management/commands/seed_timeslots.py
"""
from django.core.management.base import BaseCommand
from scheduling.models import Timeslot


class Command(BaseCommand):
    help = "Seeds the 30 weekly timeslots (6 days × 5 periods)."

    def handle(self, *args, **kwargs):
        days    = list(Timeslot.Day)
        periods = list(Timeslot.Period)
        created = 0
        for day in days:
            for period in periods:
                _, was_created = Timeslot.objects.get_or_create(
                    day=day, period=period
                )
                if was_created:
                    created += 1

        total = len(days) * len(periods)
        self.stdout.write(self.style.SUCCESS(
            f" {created} timeslots created ({total - created} already existed). "
            f"Total: {total}"
        ))