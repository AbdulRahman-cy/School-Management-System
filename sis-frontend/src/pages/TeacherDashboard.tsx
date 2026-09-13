import { useAuth } from "../context/AuthContext";
import { useTeacherDashboard } from "../api";
import { CourseCodePill, Skeleton, StatCard, StatCardSkeleton, SeatingBar } from "./dashboardShared";
import type { TeacherDashboardClassRow, TeacherDashboardSession } from "../types";

// ─── Teacher Dashboard ──────────────────────────────────────────────────────
// Active-term metrics scoped to the classes the signed-in user personally
// coordinates — a TEACHER's own view, or an ADMIN's when acting as a "super
// teacher" over their own coordinated classes. For the institution-wide view,
// see AdminDashboard.tsx.

const SESSION_TYPE_STYLES: Record<TeacherDashboardSession["session_type"], { bg: string; border: string; text: string }> = {
  LECTURE:  { bg: "#faf5ff", border: "#ddd6fe", text: "#6d28d9" },
  LAB:      { bg: "#f0fdf4", border: "#bbf7d0", text: "#065f46" },
  TUTORIAL: { bg: "#fffbeb", border: "#fde68a", text: "#92400e" },
};

function SessionChip({ session }: { session: TeacherDashboardSession }) {
  const style = SESSION_TYPE_STYLES[session.session_type];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 10.5, fontWeight: 600, color: style.text,
      background: style.bg, border: `1px solid ${style.border}`,
      padding: "3px 8px", borderRadius: 6, whiteSpace: "nowrap",
    }}>
      {session.session_type.slice(0, 3)} · {session.day_display.slice(0, 3)} P{session.period} · {session.room_code}
    </span>
  );
}

function SessionsCell({ sessions }: { sessions: TeacherDashboardSession[] }) {
  if (sessions.length === 0) {
    return <span style={{ fontSize: 11.5, color: "#c4b5fd" }}>Not scheduled</span>;
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, maxWidth: 320 }}>
      {sessions.map((s, i) => <SessionChip key={i} session={s} />)}
    </div>
  );
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const { data: teacherData, isLoading, isError } = useTeacherDashboard();

  if (isError) console.error("[useTeacherDashboard] failed");

  const displayName = user
    ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email.split("@")[0]
    : "Teacher";

  const stats = teacherData?.stats;
  const classes = teacherData?.classes ?? [];

  const totalCapacity = classes.reduce((sum, c) => sum + c.capacity, 0);
  const totalEnrolled = classes.reduce((sum, c) => sum + c.enrolled_count, 0);
  const utilizationPct = totalCapacity > 0 ? Math.min(100, Math.round((totalEnrolled / totalCapacity) * 100)) : 0;

  return (
    <>
      <div className="ani0" style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1e1b4b", letterSpacing: "-.4px" }}>
          Good morning, {user?.first_name || displayName} 👋
        </h1>
        <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>Teacher · Your classes this term</p>
      </div>

      <div className="ani1" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 22 }}>
        {isLoading ? <>{[0, 1, 2].map(i => <StatCardSkeleton key={i} />)}</> : (
          <>
            <StatCard
              label="MY ACTIVE CLASSES"
              value={stats?.total_active_classes ?? 0}
              sublabel="this term"
              ringColor="#7c3aed"
              trackColor="#f3f0ff"
              progressPct={utilizationPct}
            />
            <StatCard
              label="SCHEDULED SESSIONS"
              value={stats?.total_scheduled_sessions ?? 0}
              sublabel="sessions this term"
              ringColor="#0ea5e9"
              trackColor="#e0f2fe"
              progressPct={utilizationPct}
            />
            <StatCard
              label="ENROLLED STUDENTS"
              value={stats?.total_enrolled_students ?? 0}
              sublabel={`${utilizationPct}% seat utilization`}
              ringColor="#10b981"
              trackColor="#d1fae5"
              progressPct={utilizationPct}
            />
          </>
        )}
      </div>

      {/* My Classes */}
      <div className="ani2" style={{ background: "#fff", borderRadius: 14, border: "1px solid #ede9fe", overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #f3f0ff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1e1b4b" }}>My Classes</div>
          <div style={{ fontSize: 10.5, color: "#94a3b8" }}>{classes.length} {classes.length === 1 ? "class" : "classes"}</div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#faf5ff" }}>
              <th style={{ padding: "8px 14px", textAlign: "left", fontSize: 9.5, fontWeight: 700, color: "#94a3b8", letterSpacing: ".5px", borderBottom: "1px solid #f3f0ff" }}>COURSE</th>
              <th style={{ padding: "8px 14px", textAlign: "left", fontSize: 9.5, fontWeight: 700, color: "#94a3b8", letterSpacing: ".5px", borderBottom: "1px solid #f3f0ff" }}>GROUP & DISCIPLINE</th>
              <th style={{ padding: "8px 14px", textAlign: "left", fontSize: 9.5, fontWeight: 700, color: "#94a3b8", letterSpacing: ".5px", borderBottom: "1px solid #f3f0ff" }}>TERM</th>
              <th style={{ padding: "8px 14px", textAlign: "left", fontSize: 9.5, fontWeight: 700, color: "#94a3b8", letterSpacing: ".5px", borderBottom: "1px solid #f3f0ff" }}>SEATING</th>
              <th style={{ padding: "8px 14px", textAlign: "left", fontSize: 9.5, fontWeight: 700, color: "#94a3b8", letterSpacing: ".5px", borderBottom: "1px solid #f3f0ff" }}>SESSIONS</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [0, 1, 2, 3, 4].map(i => (
                <tr key={i}>
                  <td style={{ padding: "10px 14px" }}><Skeleton w="70%" /></td>
                  <td style={{ padding: "10px 14px" }}><Skeleton w="60%" /></td>
                  <td style={{ padding: "10px 14px" }}><Skeleton w="50%" /></td>
                  <td style={{ padding: "10px 14px" }}><Skeleton w="80%" /></td>
                  <td style={{ padding: "10px 14px" }}><Skeleton w="90%" /></td>
                </tr>
              ))
            ) : classes.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: "24px", textAlign: "center", fontSize: 12, color: "#94a3b8" }}>You aren't coordinating any classes this term.</td></tr>
            ) : (
              classes.map((cls: TeacherDashboardClassRow) => (
                <tr key={cls.id} style={{ borderBottom: "1px solid #fafafa" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#faf5ff")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <CourseCodePill code={cls.course_code} />
                      <span style={{ fontSize: 12.5, fontWeight: 500, color: "#374151" }}>{cls.course_title}</span>
                    </div>
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 12.5, color: "#64748b", fontWeight: 500 }}>{cls.group_label}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12.5, color: "#64748b", fontWeight: 500 }}>{cls.term_name}</td>
                  <td style={{ padding: "10px 14px" }}><SeatingBar enrolled={cls.enrolled_count} capacity={cls.capacity} /></td>
                  <td style={{ padding: "10px 14px" }}><SessionsCell sessions={cls.sessions} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
