import { useMemo } from "react";
import type { Session } from "../types";
import { getCourseColorTheme } from "../courseColors";
import { Skeleton } from "./dashboardShared";
import { DAY_LABELS, PERIOD_LABELS, getAlexDay } from "./timetableUtils";

/**
 * Shared weekly grid used by both the student's "Timetable" tab and the
 * teacher/admin "Timetable" tab — same visual language, different `sessions`
 * source (own enrollments vs. own coordinated classes).
 */

const SESSION_TYPE_STYLES: Record<string, { bg: string; border: string; badge: string; badgeTxt: string; dot: string }> = {
  LECTURE:  { bg: "#faf5ff", border: "#ddd6fe", badge: "#ede9fe", badgeTxt: "#6d28d9", dot: "#7c3aed" },
  LAB:      { bg: "#f0fdf4", border: "#bbf7d0", badge: "#d1fae5", badgeTxt: "#065f46", dot: "#10b981" },
  TUTORIAL: { bg: "#fffbeb", border: "#fde68a", badge: "#fef3c7", badgeTxt: "#92400e", dot: "#f59e0b" },
};

const LEGEND = [
  { type: "LECTURE", color: "#6d28d9", dot: "#7c3aed" },
  { type: "LAB", color: "#065f46", dot: "#10b981" },
  { type: "TUTORIAL", color: "#92400e", dot: "#f59e0b" },
];

function TimetableCoursePill({ code }: { code: string }) {
  const { bg, color } = getCourseColorTheme(code);
  return (
    <span style={{
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 10, fontWeight: 600,
      padding: "1px 6px", borderRadius: 5,
      background: bg, color,
      display: "inline-block", flexShrink: 0,
    }}>
      {code}
    </span>
  );
}

export interface WeeklyTimetableProps {
  sessions: Session[] | undefined;
  isLoading: boolean;
  title?: string;
  subtitle?: string;
  emptyMessage?: string;
}

export default function WeeklyTimetable({
  sessions, isLoading,
  title = "My Timetable",
  subtitle,
  emptyMessage = "No sessions scheduled yet.",
}: WeeklyTimetableProps) {
  const scheduleMap = useMemo(() => {
    const map: Record<string, Session[]> = {};
    if (!sessions) return map;
    for (const s of sessions) {
      const key = `${s.timeslot.day}-${s.timeslot.period}`;
      if (!map[key]) map[key] = [];
      map[key].push(s);
    }
    return map;
  }, [sessions]);

  const today = getAlexDay();
  const sessionCount = sessions?.length ?? 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="ani0">
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1e1b4b", letterSpacing: "-.4px" }}>{title}</h2>
        <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>{subtitle ?? `Weekly schedule · ${sessionCount} sessions this term`}</p>
      </div>

      <div className="ani0" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {LEGEND.map(({ type, color, dot }) => (
          <div key={type} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: dot }} />{type}
          </div>
        ))}
      </div>

      <div className="ani1" style={{ background: "#fff", borderRadius: 16, border: "1px solid #ede9fe", overflow: "hidden" }}>
        {isLoading ? (
          <div style={{ padding: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "80px repeat(6,1fr)", gap: 8, marginBottom: 8 }}><div />{[0, 1, 2, 3, 4, 5].map(i => <Skeleton key={i} h={32} r={8} />)}</div>
            {[0, 1, 2, 3, 4].map(r => (
              <div key={r} style={{ display: "grid", gridTemplateColumns: "80px repeat(6,1fr)", gap: 8, marginBottom: 8 }}>
                <Skeleton h={72} r={8} />{[0, 1, 2, 3, 4, 5].map(c => <div key={c} style={{ height: 72 }}>{(r + c) % 3 !== 0 && <Skeleton h={72} r={8} />}</div>)}
              </div>
            ))}
          </div>
        ) : sessionCount === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", fontSize: 13, color: "#94a3b8" }}>{emptyMessage}</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
              <thead>
                <tr>
                  <th style={{ width: 88, padding: "12px 14px", borderBottom: "1px solid #ede9fe", borderRight: "1px solid #ede9fe", background: "#faf5ff" }} />
                  {DAY_LABELS.map((day, d) => (
                    <th key={d} style={{ padding: "12px 10px", textAlign: "center", fontSize: 11, fontWeight: 700, color: d === today ? "#7c3aed" : "#64748b", letterSpacing: ".3px", borderBottom: "1px solid #ede9fe", borderRight: d < 5 ? "1px solid #ede9fe" : "none", background: d === today ? "#faf5ff" : "#fff", position: "relative" }}>
                      {day.slice(0, 3).toUpperCase()}
                      {d === today && <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: 20, height: 2, background: "#7c3aed", borderRadius: 99 }} />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {([1, 2, 3, 4, 5] as const).map((period, pi) => (
                  <tr key={period} style={{ borderBottom: pi < 4 ? "1px solid #ede9fe" : "none" }}>
                    <td style={{ padding: "10px 14px", borderRight: "1px solid #ede9fe", background: "#faf5ff", verticalAlign: "middle" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#7c3aed", marginBottom: 2 }}>P{period}</div>
                      <div style={{ fontSize: 9, color: "#94a3b8", whiteSpace: "nowrap", fontFamily: "'JetBrains Mono',monospace" }}>{PERIOD_LABELS[period]}</div>
                    </td>
                    {([0, 1, 2, 3, 4, 5] as const).map((day, di) => {
                      const cellSessions = scheduleMap[`${day}-${period}`] ?? [];
                      const isToday = day === today;
                      return (
                        <td key={day} style={{ padding: 6, verticalAlign: "top", borderRight: di < 5 ? "1px solid #ede9fe" : "none", background: isToday ? "#fefbff" : "transparent", minWidth: 100 }}>
                          {cellSessions.length === 0
                            ? <div style={{ height: 80, borderRadius: 8, border: "1.5px dashed #ede9fe", background: "#fafafa" }} />
                            : cellSessions.map(s => {
                                const st = SESSION_TYPE_STYLES[s.session_type] ?? SESSION_TYPE_STYLES.LECTURE;
                                return (
                                  <div key={s.id} style={{ height: 80, borderRadius: 8, padding: "8px 9px", background: st.bg, border: `1.5px solid ${st.border}`, display: "flex", flexDirection: "column", justifyContent: "space-between", cursor: "default", transition: "transform .15s,box-shadow .15s" }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 6px 18px rgba(124,58,237,0.12)"; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ""; (e.currentTarget as HTMLDivElement).style.boxShadow = ""; }}>
                                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 4 }}>
                                      <TimetableCoursePill code={s.course_code} />
                                      <span style={{ fontSize: 8, fontWeight: 700, padding: "2px 5px", borderRadius: 4, background: st.badge, color: st.badgeTxt, letterSpacing: ".3px", flexShrink: 0, lineHeight: 1.4 }}>{s.session_type.slice(0, 3)}</span>
                                    </div>
                                    <div style={{ fontSize: 9.5, color: "#64748b", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", lineHeight: 1.35 }}>{s.course_name}</div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 9, color: "#94a3b8", fontWeight: 500 }}>
                                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: st.dot, flexShrink: 0 }} />{s.room}
                                    </div>
                                  </div>
                                );
                              })
                          }
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
