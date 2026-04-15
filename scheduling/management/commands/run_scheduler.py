"""
scheduling/management/commands/run_scheduler.py
"""
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from ortools.sat.python import cp_model

from academics.models import Term, CourseClass, Room
from scheduling.models import Timeslot, Session

LECTURE  = Session.SessionType.LECTURE
TUTORIAL = Session.SessionType.TUTORIAL
LAB      = Session.SessionType.LAB

ALLOWED_ROOM_TYPES = {
    LECTURE:  {"LECTURE", "SEMINAR"},
    TUTORIAL: {"SEMINAR"},
    LAB:      {"LAB"},
}

class Command(BaseCommand):
    help = "Run the Dynamic CP-SAT scheduler."

    def add_arguments(self, parser):
        parser.add_argument("--term", type=str, default=None)
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument("--time-limit", type=int, default=120)

    def handle(self, *args, **options):
        term = Term.objects.filter(is_active=True).first() if not options["term"] else Term.objects.get(name=options["term"])
        self.stdout.write(f"Scheduling term: {term.name}")

        course_classes = list(CourseClass.objects.filter(term=term).select_related("course", "group__discipline__department"))
        timeslots = list(Timeslot.objects.all().order_by("day", "period"))
        rooms = list(Room.objects.filter(is_active=True).select_related("department"))

        # ── 1. FLATTEN REQUIREMENTS DYNAMICALLY ──
        # Instead of assuming 1/1/1, we create a specific requirement for every session needed.
        requirements = []
        for cc_idx, cc in enumerate(course_classes):
            course = cc.course
            # Add Lecture sessions
            for i in range(course.lec_sessions):
                requirements.append({"req_idx": len(requirements), "cc_idx": cc_idx, "cc": cc, "type": LECTURE, "instance": i})
            # Add Tutorial sessions
            for i in range(course.tut_sessions):
                requirements.append({"req_idx": len(requirements), "cc_idx": cc_idx, "cc": cc, "type": TUTORIAL, "instance": i})
            # Add Lab sessions
            for i in range(course.lab_sessions):
                requirements.append({"req_idx": len(requirements), "cc_idx": cc_idx, "cc": cc, "type": LAB, "instance": i})

        self.stdout.write(f"  {len(course_classes)} CourseClasses generated {len(requirements)} specific Session Requirements.")

        assignments = self._solve(requirements, course_classes, timeslots, rooms, options["time_limit"])

        if assignments is None:
            raise CommandError("Solver returned INFEASIBLE. Check room capacities or timeslot availability.")

        if options["dry_run"]:
            self.stdout.write(self.style.SUCCESS(f"DRY RUN SUCCESS: {len(assignments)} sessions assigned."))
        else:
            self._save(assignments, term)

    def _solve(self, requirements, course_classes, timeslots, rooms, time_limit):
        model = cp_model.CpModel()
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = time_limit

        n_ts = len(timeslots)
        n_rooms = len(rooms)
        assign = {}

        # ── ELIGIBLE ROOMS CACHE ──
        def get_eligible_rooms(stype, dept_id):
            allowed = ALLOWED_ROOM_TYPES[stype]
            
            # 1. Try Course's department rooms + shared rooms
            eligible = [i for i, r in enumerate(rooms) if r.room_type in allowed and (r.department_id is None or r.department_id == dept_id)]
            if eligible: return eligible
            
            # 2. Try just shared rooms
            eligible = [i for i, r in enumerate(rooms) if r.room_type in allowed and r.department_id is None]
            if eligible: return eligible
            
            # 3. EMERGENCY FALLBACK: Borrow ANY room of the correct type (e.g. CCE borrowing a CSE lab)
            return [i for i, r in enumerate(rooms) if r.room_type in allowed]

        # ── DECISION VARIABLES ──
        for req in requirements:
            # FIX: Room is based on COURSE owner, not STUDENT major
            dept_id = req["cc"].course.department_id 
            eligible = get_eligible_rooms(req["type"], dept_id)
            
            for ts_idx in range(n_ts):
                for r_idx in eligible:
                    assign[req["req_idx"], ts_idx, r_idx] = model.new_bool_var(f"a_{req['req_idx']}_{ts_idx}_{r_idx}")

        # ── CONSTRAINT 1: Each requirement gets exactly one timeslot and room ──
        for req in requirements:
            dept_id = req["cc"].course.department_id # FIX APPLIED
            eligible = get_eligible_rooms(req["type"], dept_id)
            
            # Catch if a room type simply doesn't exist in the whole university
            if not eligible:
                raise CommandError(f"CRASH: No '{req['type']}' room exists in the database for course {req['cc'].course.code}!")
                
            model.add_exactly_one(assign[req["req_idx"], ts_idx, r_idx] for ts_idx in range(n_ts) for r_idx in eligible)

        # ── CONSTRAINT 2: No room double-booked at the same timeslot ──
        for ts_idx in range(n_ts):
            for r_idx in range(n_rooms):
                overlapping = [assign[req["req_idx"], ts_idx, r_idx] for req in requirements if (req["req_idx"], ts_idx, r_idx) in assign]
                if overlapping:
                    model.add_at_most_one(overlapping)

        # ── CONSTRAINT 3: No group in two places at the same timeslot ──
        from collections import defaultdict
        reqs_by_group = defaultdict(list)
        for req in requirements:
            reqs_by_group[req["cc"].group_id].append(req)

        for group_id, grp_reqs in reqs_by_group.items():
            for ts_idx in range(n_ts):
                overlapping = [assign[req["req_idx"], ts_idx, r_idx] for req in grp_reqs for r_idx in range(n_rooms) if (req["req_idx"], ts_idx, r_idx) in assign]
                if overlapping:
                    model.add_at_most_one(overlapping)

        self.stdout.write("Solving...")
        status = solver.solve(model)

        if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            return None

        # ── EXTRACT SOLUTION ──
        results = []
        for req in requirements:
            dept_id = req["cc"].course.department_id # FIX APPLIED
            for ts_idx in range(n_ts):
                for r_idx in get_eligible_rooms(req["type"], dept_id):
                    if (req["req_idx"], ts_idx, r_idx) in assign and solver.value(assign[req["req_idx"], ts_idx, r_idx]) == 1:
                        results.append((req["cc"], req["type"], timeslots[ts_idx], rooms[r_idx]))
        return results

    @transaction.atomic
    def _save(self, assignments, term):
        Session.objects.filter(course_class__term=term).delete()
        sessions = [Session(course_class=cc, session_type=stype, timeslot=ts, room=room) for cc, stype, ts, room in assignments]
        Session.objects.bulk_create(sessions)
        self.stdout.write(self.style.SUCCESS(f"Saved {len(sessions)} Dynamic Sessions!"))