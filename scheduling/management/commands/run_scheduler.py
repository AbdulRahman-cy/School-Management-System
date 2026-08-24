class Command(BaseCommand):
    help = "Run the CP-SAT scheduler for every cohort in a term."

    def add_arguments(self, parser):
        parser.add_argument("--term", type=str, default=None)
        parser.add_argument("--all-terms", action="store_true")
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument("--time-limit", type=int, default=60)

    def handle(self, *args, **options):
        terms = (list(Term.objects.all()) if options["all_terms"] else
                 [Term.objects.get(name=options["term"])] if options["term"] else
                 list(Term.objects.filter(is_active=True)))
        if not terms:
            self.stdout.write(self.style.ERROR("No terms found."))
            return

        for term in terms:
            cohorts = (StudyGroup.objects.filter(term=term)
                       .values_list("discipline_id", "year_level").distinct())
            self.stdout.write(self.style.WARNING(f"\n=== {term.name}: {len(cohorts)} cohorts ==="))
            for discipline_id, year_level in cohorts:
                discipline = Discipline.objects.get(pk=discipline_id)
                service = CohortSchedulerService(
                    discipline=discipline, term=term, year_level=year_level,
                    time_limit=options["time_limit"], force=True,  # seeding, nothing to protect yet
                )
                try:
                    result = service.run(dry_run=options["dry_run"])
                except (SchedulingError, InfeasibleScheduleError) as exc:
                    raise CommandError(f"{discipline.code} Y{year_level}: {exc}")
                self.stdout.write(self.style.SUCCESS(
                    f"  {discipline.code} Y{year_level}: {result.sessions_created} sessions "
                    f"({result.status}, {result.solve_time_seconds:.1f}s)"
                ))