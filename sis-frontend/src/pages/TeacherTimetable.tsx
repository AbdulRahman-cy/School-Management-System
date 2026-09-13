import { useTeacherSessions } from "../api";
import WeeklyTimetable from "./WeeklyTimetable";

// ─── Teacher Timetable ──────────────────────────────────────────────────────
// Weekly schedule for the classes the signed-in user coordinates — a
// TEACHER's own view, or an ADMIN's when acting as a "super teacher". Empty
// until the scheduler has actually assigned sessions to those classes.

export default function TeacherTimetable() {
  const { data: sessions, isLoading, isError } = useTeacherSessions();

  if (isError) console.error("[useTeacherSessions] failed");

  return (
    <WeeklyTimetable
      sessions={sessions}
      isLoading={isLoading}
      title="My Timetable"
      subtitle={`Your teaching schedule · ${sessions?.length ?? 0} lectures this term`}
      emptyMessage="No sessions yet — this fills in once the scheduler runs for your classes."
    />
  );
}
