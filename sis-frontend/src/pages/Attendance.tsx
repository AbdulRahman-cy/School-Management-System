import { useState, useMemo } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AttendanceRecord {
  id: number;
  course_code: string;
  course_title: string;
  session_type: "LECTURE" | "LAB" | "TUTORIAL";
  date: string;
  status: "PRESENT" | "ABSENT" | "EXCUSED";
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK: AttendanceRecord[] = [
  { id:  1, course_code: "BME 326",  course_title: "Biomechanics",                 session_type: "LECTURE",  date: "2025-09-07", status: "PRESENT" },
  { id:  2, course_code: "BME 326",  course_title: "Biomechanics",                 session_type: "LAB",      date: "2025-09-09", status: "PRESENT" },
  { id:  3, course_code: "BME 326",  course_title: "Biomechanics",                 session_type: "TUTORIAL", date: "2025-09-11", status: "PRESENT" },
  { id:  4, course_code: "BME 326",  course_title: "Biomechanics",                 session_type: "LECTURE",  date: "2025-09-14", status: "ABSENT"  },
  { id:  5, course_code: "BME 326",  course_title: "Biomechanics",                 session_type: "LAB",      date: "2025-09-16", status: "PRESENT" },
  { id:  6, course_code: "BME 326",  course_title: "Biomechanics",                 session_type: "TUTORIAL", date: "2025-09-18", status: "PRESENT" },
  { id:  7, course_code: "BME 326",  course_title: "Biomechanics",                 session_type: "LECTURE",  date: "2025-09-21", status: "PRESENT" },
  { id:  8, course_code: "BME 326",  course_title: "Biomechanics",                 session_type: "LAB",      date: "2025-09-23", status: "PRESENT" },
  { id:  9, course_code: "BME 326",  course_title: "Biomechanics",                 session_type: "LECTURE",  date: "2025-09-28", status: "EXCUSED" },
  { id: 10, course_code: "BME 326",  course_title: "Biomechanics",                 session_type: "TUTORIAL", date: "2025-09-30", status: "PRESENT" },
  { id: 11, course_code: "CS 301",   course_title: "Data Structures & Algorithms", session_type: "LECTURE",  date: "2025-09-07", status: "PRESENT" },
  { id: 12, course_code: "CS 301",   course_title: "Data Structures & Algorithms", session_type: "TUTORIAL", date: "2025-09-10", status: "PRESENT" },
  { id: 13, course_code: "CS 301",   course_title: "Data Structures & Algorithms", session_type: "LECTURE",  date: "2025-09-14", status: "PRESENT" },
  { id: 14, course_code: "CS 301",   course_title: "Data Structures & Algorithms", session_type: "LAB",      date: "2025-09-17", status: "ABSENT"  },
  { id: 15, course_code: "CS 301",   course_title: "Data Structures & Algorithms", session_type: "LECTURE",  date: "2025-09-21", status: "ABSENT"  },
  { id: 16, course_code: "CS 301",   course_title: "Data Structures & Algorithms", session_type: "TUTORIAL", date: "2025-09-24", status: "PRESENT" },
  { id: 17, course_code: "CS 301",   course_title: "Data Structures & Algorithms", session_type: "LECTURE",  date: "2025-09-28", status: "ABSENT"  },
  { id: 18, course_code: "CS 301",   course_title: "Data Structures & Algorithms", session_type: "LAB",      date: "2025-10-01", status: "PRESENT" },
  { id: 19, course_code: "NET 201",  course_title: "Computer Networks",            session_type: "LECTURE",  date: "2025-09-08", status: "PRESENT" },
  { id: 20, course_code: "NET 201",  course_title: "Computer Networks",            session_type: "LAB",      date: "2025-09-10", status: "PRESENT" },
  { id: 21, course_code: "NET 201",  course_title: "Computer Networks",            session_type: "LECTURE",  date: "2025-09-15", status: "PRESENT" },
  { id: 22, course_code: "NET 201",  course_title: "Computer Networks",            session_type: "TUTORIAL", date: "2025-09-17", status: "PRESENT" },
  { id: 23, course_code: "NET 201",  course_title: "Computer Networks",            session_type: "LECTURE",  date: "2025-09-22", status: "PRESENT" },
  { id: 24, course_code: "NET 201",  course_title: "Computer Networks",            session_type: "LAB",      date: "2025-09-24", status: "PRESENT" },
  { id: 25, course_code: "NET 201",  course_title: "Computer Networks",            session_type: "LECTURE",  date: "2025-09-29", status: "PRESENT" },
  { id: 26, course_code: "NET 201",  course_title: "Computer Networks",            session_type: "TUTORIAL", date: "2025-10-01", status: "PRESENT" },
  { id: 27, course_code: "MATH 301", course_title: "Numerical Analysis",           session_type: "LECTURE",  date: "2025-09-08", status: "PRESENT" },
  { id: 28, course_code: "MATH 301", course_title: "Numerical Analysis",           session_type: "TUTORIAL", date: "2025-09-11", status: "ABSENT"  },
  { id: 29, course_code: "MATH 301", course_title: "Numerical Analysis",           session_type: "LECTURE",  date: "2025-09-15", status: "PRESENT" },
  { id: 30, course_code: "MATH 301", course_title: "Numerical Analysis",           session_type: "TUTORIAL", date: "2025-09-18", status: "ABSENT"  },
  { id: 31, course_code: "MATH 301", course_title: "Numerical Analysis",           session_type: "LECTURE",  date: "2025-09-22", status: "ABSENT"  },
  { id: 32, course_code: "MATH 301", course_title: "Numerical Analysis",           session_type: "TUTORIAL", date: "2025-09-25", status: "PRESENT" },
  { id: 33, course_code: "MATH 301", course_title: "Numerical Analysis",           session_type: "LECTURE",  date: "2025-09-29", status: "ABSENT"  },
  { id: 34, course_code: "MATH 301", course_title: "Numerical Analysis",           session_type: "TUTORIAL", date: "2025-10-02", status: "PRESENT" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const SESSION_TYPE_STYLES: Record<string, { bg: string; color: string }> = {
  LECTURE:  { bg: "#ede9fe", color: "#6d28d9" },
  LAB:      { bg: "#d1fae5", color: "#065f46" },
  TUTORIAL: { bg: "#fef3c7", color: "#92400e" },
};

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10l4.5 4.5L16 6" />
    </svg>
  );
}
function IconX() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <path d="M5 5l10 10M15 5L5 15" />
    </svg>
  );
}
function IconMinus() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <path d="M4 10h12" />
    </svg>
  );
}
function IconWarning() {
  return (
    <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
    </svg>
  );
}

// ─── Donut Ring (pure SVG, no Tailwind) ───────────────────────────────────────

function DonutRing({ pct }: { pct: number }) {
  const size   = 88;
  const stroke = 9;
  const r      = (size - stroke) / 2;
  const circ   = 2 * Math.PI * r;
  const dash   = (pct / 100) * circ;
  const color  = pct >= 90 ? "#10b981" : pct >= 75 ? "#7c3aed" : "#f59e0b";
  const track  = pct >= 75 ? "#ede9fe" : "#fef3c7";
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1s ease" }} />
    </svg>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AttendanceRecord["status"] }) {
  const styles = {
    PRESENT: { bg: "#d1fae5", color: "#065f46" },
    ABSENT:  { bg: "#fee2e2", color: "#991b1b" },
    EXCUSED: { bg: "#fef3c7", color: "#92400e" },
  };
  const s = styles[status];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 99,
      fontSize: 9.5, fontWeight: 700,
      background: s.bg, color: s.color,
    }}>
      {status === "PRESENT" && <IconCheck />}
      {status === "ABSENT"  && <IconX />}
      {status === "EXCUSED" && <IconMinus />}
      {status}
    </span>
  );
}

// ─── Per-course stats type ────────────────────────────────────────────────────

interface CourseStat {
  code: string; title: string;
  total: number; present: number; absent: number; excused: number; rate: number;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Attendance() {
  const [activeTab,      setActiveTab]      = useState<"overview" | "history">("overview");
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);

  // ── Overall stats ─────────────────────────────────────────────────────────
  const overall = useMemo(() => {
    const total   = MOCK.length;
    const present = MOCK.filter(r => r.status === "PRESENT").length;
    const absent  = MOCK.filter(r => r.status === "ABSENT").length;
    const excused = MOCK.filter(r => r.status === "EXCUSED").length;
    return { total, present, absent, excused, rate: Math.round(((present + excused) / total) * 100) };
  }, []);

  // ── Per-course breakdown ──────────────────────────────────────────────────
  const courseStats: CourseStat[] = useMemo(() => {
    const map: Record<string, CourseStat> = {};
    for (const r of MOCK) {
      if (!map[r.course_code]) map[r.course_code] = { code: r.course_code, title: r.course_title, total: 0, present: 0, absent: 0, excused: 0, rate: 0 };
      const s = map[r.course_code];
      s.total++;
      if (r.status === "PRESENT") s.present++;
      else if (r.status === "ABSENT") s.absent++;
      else s.excused++;
    }
    return Object.values(map)
      .map(s => ({ ...s, rate: Math.round(((s.present + s.excused) / s.total) * 100) }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, []);

  // ── Current streak ────────────────────────────────────────────────────────
  const streak = useMemo(() => {
    let n = 0;
    for (const r of [...MOCK].sort((a, b) => b.date.localeCompare(a.date))) {
      if (r.status === "PRESENT" || r.status === "EXCUSED") n++;
      else break;
    }
    return n;
  }, []);

  // ── Filtered history ──────────────────────────────────────────────────────
  const filteredHistory = useMemo(() => {
    const base = [...MOCK].sort((a, b) => b.date.localeCompare(a.date));
    return selectedCourse ? base.filter(r => r.course_code === selectedCourse) : base.slice(0, 10);
  }, [selectedCourse]);

  const rateColor = (r: number) => r >= 90 ? "#10b981" : r >= 75 ? "#7c3aed" : "#f59e0b";
  const rateBg    = (r: number) => r >= 90 ? "#d1fae5" : r >= 75 ? "#faf5ff" : "#fffbeb";
  const rateBorder= (r: number) => r >= 90 ? "#bbf7d0" : r >= 75 ? "#ede9fe" : "#fde68a";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, fontFamily: "'Sora',sans-serif" }}>

      {/* Page header */}
      <div className="ani0">
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1e1b4b", letterSpacing: "-.4px" }}>Attendance</h2>
        <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>{overall.total} recorded sessions this term</p>
      </div>

      {/* ── Hero stats row ──────────────────────────────────────────────── */}
      <div className="ani1" style={{ display: "grid", gridTemplateColumns: "88px 1fr 1fr 1fr", gap: 14 }}>

        {/* Donut card */}
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #ede9fe", padding: "16px 12px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 2px 10px rgba(124,58,237,.05)" }}>
          <div style={{ position: "relative" }}>
            <DonutRing pct={overall.rate} />
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: rateColor(overall.rate), fontFamily: "'JetBrains Mono',monospace", lineHeight: 1 }}>{overall.rate}%</span>
            </div>
          </div>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", letterSpacing: ".8px" }}>OVERALL</div>
        </div>

        {/* Stat cards */}
        {[
          { label: "TOTAL",    value: overall.total,   sub: "sessions",  borderColor: "#ede9fe",   valColor: "#7c3aed"  },
          { label: "ATTENDED", value: overall.present, sub: "present",   borderColor: "#bbf7d0",   valColor: "#10b981"  },
          { label: "MISSED",   value: overall.absent,  sub: "absences",  borderColor: "#fecaca",   valColor: "#ef4444"  },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", borderRadius: 14, border: `1px solid ${s.borderColor}`, padding: "16px 18px", display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: "0 2px 10px rgba(124,58,237,.04)" }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".8px", color: s.valColor, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: "#1e1b4b", letterSpacing: "-2px", lineHeight: 1, fontFamily: "'JetBrains Mono',monospace" }}>{s.value}</div>
            <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Streak + Excused ──────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* Streak */}
        <div style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", borderRadius: 14, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 8px 24px rgba(124,58,237,.25)" }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,.18)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>🔥</div>
          <div>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: "rgba(255,255,255,.7)", letterSpacing: ".8px", marginBottom: 4 }}>CURRENT STREAK</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#fff", fontFamily: "'JetBrains Mono',monospace", lineHeight: 1 }}>
              {streak} <span style={{ fontSize: 12, fontWeight: 400, opacity: .8 }}>sessions</span>
            </div>
          </div>
        </div>
        {/* Excused */}
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #fde68a", padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 2px 10px rgba(245,158,11,.08)" }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#f59e0b" }}>
            <IconMinus />
          </div>
          <div>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: "#f59e0b", letterSpacing: ".8px", marginBottom: 4 }}>EXCUSED</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#1e1b4b", fontFamily: "'JetBrains Mono',monospace", lineHeight: 1 }}>
              {overall.excused} <span style={{ fontSize: 12, fontWeight: 400, color: "#94a3b8" }}>sessions</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 4, background: "#faf5ff", borderRadius: 11, padding: 4, width: "fit-content", border: "1px solid #ede9fe" }}>
        {(["overview", "history"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: "6px 16px", borderRadius: 8,
            border: "none", cursor: "pointer",
            fontSize: 12, fontWeight: 600,
            fontFamily: "'Sora',sans-serif",
            background: activeTab === tab ? "#7c3aed" : "transparent",
            color: activeTab === tab ? "#fff" : "#94a3b8",
            transition: "all .15s",
            boxShadow: activeTab === tab ? "0 2px 8px rgba(124,58,237,.25)" : "none",
          }}>
            {tab === "overview" ? "Course Breakdown" : "Session History"}
          </button>
        ))}
      </div>

      {/* ── Course breakdown ──────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {courseStats.map((cs, i) => {
            const warn        = cs.rate < 75;
            const presentPct  = Math.round((cs.present / cs.total) * 100);
            const absentPct   = Math.round((cs.absent  / cs.total) * 100);
            const excusedPct  = Math.round((cs.excused / cs.total) * 100);
            return (
              <div key={cs.code} style={{
                background: "#fff", borderRadius: 14, border: "1px solid #ede9fe",
                overflow: "hidden", boxShadow: "0 2px 10px rgba(124,58,237,.04)",
                animationDelay: `${i * 0.05}s`,
              }}>
                {/* Accent stripe */}
                <div style={{ height: 4, background: warn ? "linear-gradient(90deg,#f59e0b,#ef4444)" : "linear-gradient(90deg,#7c3aed,#a78bfa)" }} />
                <div style={{ padding: "16px 18px" }}>
                  {/* Header row */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 600, color: "#7c3aed", background: "#f3f0ff", padding: "2px 7px", borderRadius: 5 }}>{cs.code}</span>
                        {warn && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 99, fontSize: 9.5, fontWeight: 700, background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca" }}>
                            <IconWarning />AT RISK
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#1e1b4b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cs.title}</div>
                    </div>
                    {/* Rate badge */}
                    <div style={{ textAlign: "center", flexShrink: 0, padding: "10px 14px", borderRadius: 11, background: rateBg(cs.rate), border: `1.5px solid ${rateBorder(cs.rate)}` }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: rateColor(cs.rate), letterSpacing: "-1px", fontFamily: "'JetBrains Mono',monospace", lineHeight: 1 }}>{cs.rate}%</div>
                      <div style={{ fontSize: 9.5, color: "#94a3b8", marginTop: 3 }}>{cs.present}/{cs.total}</div>
                    </div>
                  </div>

                  {/* Segmented progress bar */}
                  <div style={{ height: 10, borderRadius: 99, overflow: "hidden", background: "#f3f4f6", display: "flex", marginBottom: 10 }}>
                    <div style={{ width: `${presentPct}%`, background: "#10b981", transition: "width .7s ease" }} />
                    <div style={{ width: `${excusedPct}%`, background: "#fbbf24", transition: "width .7s ease" }} />
                    <div style={{ width: `${absentPct}%`,  background: "#f87171", transition: "width .7s ease" }} />
                  </div>

                  {/* Legend */}
                  <div style={{ display: "flex", gap: 16 }}>
                    {[
                      { dot: "#10b981", label: `${cs.present} present`  },
                      { dot: "#fbbf24", label: `${cs.excused} excused`  },
                      { dot: "#f87171", label: `${cs.absent} absent`    },
                    ].map(l => (
                      <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, color: "#64748b" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: l.dot, flexShrink: 0 }} />
                        {l.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Session history ───────────────────────────────────────────────── */}
      {activeTab === "history" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Filter pills */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[{ code: null, label: "All" }, ...courseStats.map(c => ({ code: c.code, label: c.code }))].map(item => (
              <button key={item.label} onClick={() => setSelectedCourse(item.code === selectedCourse ? null : item.code)}
                style={{
                  padding: "4px 12px", borderRadius: 99,
                  border: selectedCourse === item.code || (item.code === null && !selectedCourse) ? "none" : "1px solid #ede9fe",
                  background: selectedCourse === item.code || (item.code === null && !selectedCourse) ? "#7c3aed" : "#fff",
                  color: selectedCourse === item.code || (item.code === null && !selectedCourse) ? "#fff" : "#94a3b8",
                  fontSize: 11, fontWeight: 700,
                  cursor: "pointer", fontFamily: "'JetBrains Mono',monospace",
                  transition: "all .15s",
                }}>
                {item.label}
              </button>
            ))}
          </div>

          {/* Timeline list */}
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #ede9fe", overflow: "hidden", boxShadow: "0 2px 10px rgba(124,58,237,.04)" }}>
            {filteredHistory.map((r, i) => {
              const statusStyles = {
                PRESENT: { iconBg: "#d1fae5", iconColor: "#065f46" },
                ABSENT:  { iconBg: "#fee2e2", iconColor: "#991b1b" },
                EXCUSED: { iconBg: "#fef3c7", iconColor: "#92400e" },
              };
              const ss = statusStyles[r.status];
              const stStyle = SESSION_TYPE_STYLES[r.session_type];
              return (
                <div key={r.id} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 16px",
                  borderBottom: i < filteredHistory.length - 1 ? "1px solid #f8f7ff" : "none",
                  transition: "background .1s",
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#faf5ff")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  {/* Status icon circle */}
                  <div style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, background: ss.iconBg, color: ss.iconColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {r.status === "PRESENT" && <IconCheck />}
                    {r.status === "ABSENT"  && <IconX />}
                    {r.status === "EXCUSED" && <IconMinus />}
                  </div>

                  {/* Course info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, color: "#7c3aed" }}>{r.course_code}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: stStyle.bg, color: stStyle.color }}>{r.session_type.slice(0, 3)}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.course_title}</div>
                  </div>

                  {/* Date + badge */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                    <span style={{ fontSize: 10.5, color: "#94a3b8", fontFamily: "'JetBrains Mono',monospace" }}>{fmtDate(r.date)}</span>
                    <StatusBadge status={r.status} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}