from collections import defaultdict
from dataclasses import dataclass, field

from django.db import connection, transaction
from django.db.models import Q
from ortools.sat.python import cp_model

from academics.models import CourseClass, Discipline, Room, Term
from scheduling.models import Session, Timeslot

LECTURE, TUTORIAL, LAB = (
    Session.SessionType.LECTURE,
    Session.SessionType.TUTORIAL,
    Session.SessionType.LAB,
)

# NOTE: this must match what a Room can actually be (Room.RoomType has no
# "TUTORIAL" choice — see the flag at the bottom of this message).
ALLOWED_ROOM_TYPES = {
    LECTURE: {"LECTURE", "SEMINAR"},
    TUTORIAL: {"SEMINAR"},
    LAB: {"LAB"},
}


class SchedulingError(Exception):
    """Turn into a 400 at the API boundary."""


class InfeasibleScheduleError(SchedulingError):
    """Turn into a 409 at the API boundary."""


@dataclass
class ScheduleResult:
    status: str  # "OPTIMAL" | "FEASIBLE"
    sessions_created: int
    solve_time_seconds: float
    course_classes_scheduled: int
    dry_run: bool = False
    sessions: list = field(default_factory=list)  # only populated on dry_run


class CohortSchedulerService:
    def __init__(self, *, discipline: Discipline, term: Term, year_level: int,
                 time_limit: int = 60, force: bool = False):
        self.discipline = discipline
        self.term = term
        self.year_level = year_level
        self.time_limit = time_limit
        self.force = force

    # ── public entrypoint ───────────────────────────────────────────────

    def run(self, dry_run: bool = False) -> ScheduleResult:
        if not self.term.is_active:
            raise SchedulingError(
                f"Cannot schedule cohort for '{self.term.name}' — this term is not active."
            )
        with transaction.atomic():
            # Pessimistic lock, scoped to this term, held for the whole
            # operation. Any other request scheduling a cohort in the SAME
            # term blocks here until we commit. Different terms don't
            # contend at all. We acquire this BEFORE reading "locked slots" —
            # otherwise two concurrent runs could both read the same free
            # room and both write to it (classic read-then-write race).
            with connection.cursor() as cur:
                cur.execute("SELECT pg_advisory_xact_lock(%s)", [self.term.pk])

            cohort_classes = self._get_cohort_classes()
            if not cohort_classes:
                raise SchedulingError("No CourseClasses found for this cohort.")

            requirements = self._build_requirements(cohort_classes)
            timeslots = list(Timeslot.objects.all().order_by("day", "period"))
            rooms = list(Room.objects.filter(is_active=True).select_related("department"))
            locked_slots = self._get_locked_slots()

            solved = self._solve(requirements, timeslots, rooms, locked_slots)
            if solved is None:
                raise InfeasibleScheduleError(
                    "No feasible schedule for this cohort given current room "
                    "availability and sessions already booked elsewhere this term."
                )
            assignments, status_name, solve_time = solved

            if dry_run:
                return ScheduleResult(
                    status=status_name, sessions_created=len(assignments),
                    solve_time_seconds=solve_time,
                    course_classes_scheduled=len(cohort_classes),
                    dry_run=True, sessions=assignments,
                )

            created = self._persist(assignments)
            return ScheduleResult(
                status=status_name, sessions_created=created,
                solve_time_seconds=solve_time,
                course_classes_scheduled=len(cohort_classes),
            )

    # ── data gathering ──────────────────────────────────────────────────

    def _get_cohort_classes(self):
        return list(
            CourseClass.objects.filter(
                group__discipline=self.discipline,
                group__term=self.term,
                group__year_level=self.year_level,
            ).select_related("course", "group__discipline__department")
        )

    def _build_requirements(self, cohort_classes):
        requirements = []
        for cc in cohort_classes:
            course = cc.course
            for i in range(course.lec_sessions):
                requirements.append({"req_idx": len(requirements), "cc": cc, "type": LECTURE, "instance": i})
            for i in range(course.tut_sessions):
                requirements.append({"req_idx": len(requirements), "cc": cc, "type": TUTORIAL, "instance": i})
            for i in range(course.lab_sessions):
                requirements.append({"req_idx": len(requirements), "cc": cc, "type": LAB, "instance": i})
        return requirements

    def _get_locked_slots(self) -> set[tuple[int, int]]:
        """(timeslot_id, room_id) pairs already claimed by OTHER cohorts this term."""
        other = Session.objects.filter(
            course_class__group__term=self.term
        ).exclude(
            course_class__group__discipline=self.discipline,
            course_class__group__year_level=self.year_level,
        ).values_list("timeslot_id", "room_id")
        return set(other)

    # ── CP-SAT model ────────────────────────────────────────────────────

    def _eligible_rooms(self, rooms, stype, dept_id):
        allowed = ALLOWED_ROOM_TYPES[stype]
        # dept-specific or shared (department is None) rooms first...
        preferred = [i for i, r in enumerate(rooms)
                     if r.room_type in allowed and (r.department_id is None or r.department_id == dept_id)]
        if preferred:
            return preferred
        # ...only fall back to "any room of the right type" if the dept has none.
        return [i for i, r in enumerate(rooms) if r.room_type in allowed]

    def _solve(self, requirements, timeslots, rooms, locked_slots):
        model = cp_model.CpModel()
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = self.time_limit
        solver.parameters.num_search_workers = 8

        assign = {}
        eligible_cache = {}

        for req in requirements:
            dept_id = req["cc"].course.department_id
            key = (req["type"], dept_id)
            eligible_cache.setdefault(key, self._eligible_rooms(rooms, req["type"], dept_id))
            eligible = eligible_cache[key]
            if not eligible:
                raise SchedulingError(f"No '{req['type']}' room exists for {req['cc'].course.code}.")

            for ts_idx, ts in enumerate(timeslots):
                for r_idx in eligible:
                    room = rooms[r_idx]
                    if (ts.id, room.id) in locked_slots:
                        continue  # taken by another cohort — never even offer it
                    assign[req["req_idx"], ts_idx, r_idx] = model.new_bool_var(
                        f"a_{req['req_idx']}_{ts_idx}_{r_idx}"
                    )

        # Constraint 1: every requirement gets exactly one (timeslot, room)
        for req in requirements:
            eligible = eligible_cache[(req["type"], req["cc"].course.department_id)]
            options = [assign[req["req_idx"], ts_idx, r_idx]
                       for ts_idx in range(len(timeslots)) for r_idx in eligible
                       if (req["req_idx"], ts_idx, r_idx) in assign]
            if not options:
                raise InfeasibleScheduleError(
                    f"Every valid room/timeslot combo for {req['cc'].course.code} "
                    f"({req['type']}) is already booked by another cohort this term."
                )
            model.add_exactly_one(options)

        # Constraint 2: no two of THIS cohort's requirements share a (timeslot, room)
        for ts_idx in range(len(timeslots)):
            for r_idx in range(len(rooms)):
                overlapping = [assign[req["req_idx"], ts_idx, r_idx] for req in requirements
                               if (req["req_idx"], ts_idx, r_idx) in assign]
                if len(overlapping) > 1:
                    model.add_at_most_one(overlapping)

        # Constraint 3: no two requirements from the same StudyGroup share a timeslot
        by_group = defaultdict(list)
        for req in requirements:
            by_group[req["cc"].group_id].append(req)
        for grp_reqs in by_group.values():
            for ts_idx in range(len(timeslots)):
                overlapping = [assign[req["req_idx"], ts_idx, r_idx] for req in grp_reqs
                               for r_idx in range(len(rooms)) if (req["req_idx"], ts_idx, r_idx) in assign]
                if len(overlapping) > 1:
                    model.add_at_most_one(overlapping)

        status = solver.solve(model)
        if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            return None

        results = []
        for req in requirements:
            eligible = eligible_cache[(req["type"], req["cc"].course.department_id)]
            for ts_idx in range(len(timeslots)):
                for r_idx in eligible:
                    k = (req["req_idx"], ts_idx, r_idx)
                    if k in assign and solver.value(assign[k]) == 1:
                        results.append((req["cc"], req["type"], timeslots[ts_idx], rooms[r_idx]))

        return results, ("OPTIMAL" if status == cp_model.OPTIMAL else "FEASIBLE"), solver.wall_time

    # ── persistence ─────────────────────────────────────────────────────

    def _persist(self, assignments) -> int:
        stale_qs = Session.objects.filter(
            course_class__group__discipline=self.discipline,
            course_class__group__term=self.term,
            course_class__group__year_level=self.year_level,
        )
        stale_ids = list(stale_qs.values_list("id", flat=True))

        if stale_ids and not self.force:
            from records.models import Enrollment
            from django.db.models import Q
            affected = Enrollment.objects.filter(
                Q(lecture_session_id__in=stale_ids)
                | Q(tutorial_session_id__in=stale_ids)
                | Q(lab_session_id__in=stale_ids)
            ).count()
            if affected:
                raise SchedulingError(
                    f"{affected} enrollment(s) reference sessions from the previous "
                    f"run for this cohort. Re-scheduling clears their session "
                    f"assignment (SET_NULL cascade). Pass force=true to proceed."
                )
            raise SchedulingError(
                f"This cohort already has a schedule ({len(stale_ids)} session(s)). "
                f"Re-scheduling will replace it. Pass force=true to proceed."
            )

        stale_qs.delete()
        sessions = [Session(course_class=cc, session_type=t, timeslot=ts, room=r)
                    for cc, t, ts, r in assignments]
        Session.objects.bulk_create(sessions)
        return len(sessions)