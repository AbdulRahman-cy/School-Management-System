import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useAdminDashboard } from "../api";
import { CourseCodePill, Skeleton, StatCard, StatCardSkeleton, SeatingBar, YearBadge } from "./dashboardShared";
import type { AdminDashboardClassRow } from "../types";

// ─── Admin Dashboard ────────────────────────────────────────────────────────
// Global, unfiltered metrics across every active-term class — the "super
// teacher" view of the whole institution. For a teacher's own classes, see
// TeacherDashboard.tsx.

// ─── Discipline filter bar ──────────────────────────────────────────────────

interface DisciplineOption {
  code: string;
  count: number;
}

function DisciplineFilterBar({
  disciplines, selected, onSelect,
}: {
  disciplines: DisciplineOption[];
  selected: string | null;
  onSelect: (code: string | null) => void;
}) {
  const totalCount = disciplines.reduce((sum, d) => sum + d.count, 0);
  const items: { code: string | null; label: string; count: number }[] = [
    { code: null, label: "ALL", count: totalCount },
    ...disciplines.map(d => ({ code: d.code, label: d.code, count: d.count })),
  ];

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {items.map(item => {
        const isActive = selected === item.code;
        return (
          <button
            key={item.code ?? "all"}
            onClick={() => onSelect(item.code)}
            style={{
              display: "flex", alignItems: "center", gap: 9,
              padding: "11px 20px", borderRadius: 13,
              border: isActive ? "none" : "1.5px solid #ede9fe",
              background: isActive ? "linear-gradient(135deg,#7c3aed,#6d28d9)" : "#fff",
              color: isActive ? "#fff" : "#374151",
              fontSize: 13.5, fontWeight: 800, letterSpacing: "-.2px",
              cursor: "pointer", fontFamily: "inherit",
              boxShadow: isActive ? "0 8px 20px rgba(124,58,237,.28)" : "none",
              transition: "all .15s",
            }}
          >
            {item.label}
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
              background: isActive ? "rgba(255,255,255,.22)" : "#f3f0ff",
              color: isActive ? "#fff" : "#7c3aed",
              fontFamily: "'JetBrains Mono',monospace",
            }}>
              {item.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

const EMPTY_CLASSES: AdminDashboardClassRow[] = [];

export default function AdminDashboard() {
  const { user } = useAuth();
  const { data: adminData, isLoading, isError } = useAdminDashboard();

  if (isError) console.error("[useAdminDashboard] failed");

  const displayName = user
    ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email.split("@")[0]
    : "Admin";

  const stats = adminData?.stats;
  const classes = adminData?.classes ?? EMPTY_CLASSES;

  // Overall active-term seat utilization — used as the shared ring/bar accent,
  // mirroring how the student dashboard's cards each carry their own progress ring.
  const totalCapacity = classes.reduce((sum, c) => sum + c.capacity, 0);
  const totalEnrolled = classes.reduce((sum, c) => sum + c.enrolled_count, 0);
  const utilizationPct = totalCapacity > 0 ? Math.min(100, Math.round((totalEnrolled / totalCapacity) * 100)) : 0;

  const disciplines = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of classes) counts.set(c.discipline_code, (counts.get(c.discipline_code) ?? 0) + 1);
    return Array.from(counts.entries())
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [classes]);

  const [selectedDiscipline, setSelectedDiscipline] = useState<string | null>(null);
  const visibleClasses = useMemo(
    () => selectedDiscipline ? classes.filter(c => c.discipline_code === selectedDiscipline) : classes,
    [classes, selectedDiscipline],
  );

  return (
    <>
      <div className="ani0" style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1e1b4b", letterSpacing: "-.4px" }}>
          Good morning, {user?.first_name || displayName} 👋
        </h1>
        <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>Administrator · Active term overview</p>
      </div>

      <div className="ani1" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 22 }}>
        {isLoading ? <>{[0, 1, 2].map(i => <StatCardSkeleton key={i} />)}</> : (
          <>
            <StatCard
              label="ACTIVE CLASSES"
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

      {!isLoading && disciplines.length > 0 && (
        <div className="ani1" style={{ marginBottom: 18 }}>
          <DisciplineFilterBar disciplines={disciplines} selected={selectedDiscipline} onSelect={setSelectedDiscipline} />
        </div>
      )}

      {/* Term Overview */}
      <div className="ani2" style={{ background: "#fff", borderRadius: 14, border: "1px solid #ede9fe", overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #f3f0ff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1e1b4b" }}>Term Overview</div>
          <div style={{ fontSize: 10.5, color: "#94a3b8" }}>{visibleClasses.length} {visibleClasses.length === 1 ? "class" : "classes"}</div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#faf5ff" }}>
              <th style={{ padding: "8px 14px", textAlign: "left", fontSize: 9.5, fontWeight: 700, color: "#94a3b8", letterSpacing: ".5px", borderBottom: "1px solid #f3f0ff" }}>COURSE</th>
              <th style={{ padding: "8px 14px", textAlign: "left", fontSize: 9.5, fontWeight: 700, color: "#94a3b8", letterSpacing: ".5px", borderBottom: "1px solid #f3f0ff" }}>YEAR</th>
              <th style={{ padding: "8px 14px", textAlign: "left", fontSize: 9.5, fontWeight: 700, color: "#94a3b8", letterSpacing: ".5px", borderBottom: "1px solid #f3f0ff" }}>GROUP & DISCIPLINE</th>
              <th style={{ padding: "8px 14px", textAlign: "left", fontSize: 9.5, fontWeight: 700, color: "#94a3b8", letterSpacing: ".5px", borderBottom: "1px solid #f3f0ff" }}>TERM</th>
              <th style={{ padding: "8px 14px", textAlign: "left", fontSize: 9.5, fontWeight: 700, color: "#94a3b8", letterSpacing: ".5px", borderBottom: "1px solid #f3f0ff" }}>SEATING</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [0, 1, 2, 3, 4].map(i => (
                <tr key={i}>
                  <td style={{ padding: "10px 14px" }}><Skeleton w="70%" /></td>
                  <td style={{ padding: "10px 14px" }}><Skeleton w="30%" /></td>
                  <td style={{ padding: "10px 14px" }}><Skeleton w="60%" /></td>
                  <td style={{ padding: "10px 14px" }}><Skeleton w="50%" /></td>
                  <td style={{ padding: "10px 14px" }}><Skeleton w="80%" /></td>
                </tr>
              ))
            ) : visibleClasses.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: "24px", textAlign: "center", fontSize: 12, color: "#94a3b8" }}>
                {selectedDiscipline ? `No ${selectedDiscipline} classes scheduled for the active term.` : "No classes scheduled for the active term."}
              </td></tr>
            ) : (
              visibleClasses.map((cls: AdminDashboardClassRow) => (
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
                  <td style={{ padding: "10px 14px" }}><YearBadge year={cls.year_level} /></td>
                  <td style={{ padding: "10px 14px", fontSize: 12.5, color: "#64748b", fontWeight: 500 }}>{cls.group_label}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12.5, color: "#64748b", fontWeight: 500 }}>{cls.term_name}</td>
                  <td style={{ padding: "10px 14px" }}><SeatingBar enrolled={cls.enrolled_count} capacity={cls.capacity} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
