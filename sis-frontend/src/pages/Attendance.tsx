import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";

// ─── Types ────────────────────────────────────────────────────────────────────

// API response shape from GET /api/records/attendance/?student={id}&term_status=active
interface AttendanceRecord {
  id: number;
  student: number;
  session: number;
  course_code: string;
  course_title: string;
  session_type: "LECTURE" | "LAB" | "TUTORIAL";
  week: number;
  term_name: string;  // denormalized — session.course_class.term.name via source=
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  created_at: string; // ISO-8601 — used for chronological sort
}

// ─── TASK 1: Data fetching hook ───────────────────────────────────────────────

const STUDENT_ID = 4;

function useAttendance(studentId: number, termView: "active" | "past") {
  return useQuery<AttendanceRecord[]>({
    queryKey: ["attendance", { student: studentId, termView }],
    queryFn: async () => {
      const { data } = await api.get<AttendanceRecord[]>("records/attendance/", {
        params: { student: studentId, term_status: termView },
      });
      return data;
    },
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Format ISO-8601 (created_at) → "14 Sept", "2 Oct", etc.
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
    LATE:    { bg: "#fef3c7", color: "#92400e" },
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
      {(status === "EXCUSED" || status === "LATE") && <IconMinus />}
      {status}
    </span>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ w = "100%", h = 16, r = 8 }: { w?: string | number; h?: number; r?: number }) {
  return (
    <div style={{ width: w, height: h, borderRadius: r, background: "linear-gradient(90deg,#f3f0ff 25%,#e9e4ff 50%,#f3f0ff 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite linear", flexShrink: 0 }} />
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
  const [termView,       setTermView]        = useState<"active" | "past">("active");
  const [selectedTerm,   setSelectedTerm]    = useState<string | null>(null);

  // ── TASK 1: Fetch live data ────────────────────────────────────────────────
  const { data: records = [], isLoading, isError } = useAttendance(STUDENT_ID, termView);

  // ── Past term names — extracted from all past records ────────────────────
  // Used to build the term selector pills shown when termView === "past".
  const pastTermNames = useMemo(() => {
    if (termView !== "past") return [];
    const seen = new Set<string>();
    const result: string[] = [];
    for (const r of records) {
      if (!seen.has(r.term_name)) { seen.add(r.term_name); result.push(r.term_name); }
    }
    return result.sort();
  }, [records, termView]);

  // Auto-select the first past term when the list first loads
  const resolvedTerm = useMemo(() => {
    if (termView !== "past") return null;
    if (selectedTerm && pastTermNames.includes(selectedTerm)) return selectedTerm;
    return pastTermNames[0] ?? null;
  }, [termView, selectedTerm, pastTermNames]);

  // Records scoped to the selected past term (or all records for active term)
  const scopedRecords = useMemo(() => {
    if (termView === "active") return records;
    return resolvedTerm ? records.filter(r => r.term_name === resolvedTerm) : [];
  }, [records, termView, resolvedTerm]);

  // ── TASK 1: Overall stats ─────────────────────────────────────────────────
  const overall = useMemo(() => {
    const total    = scopedRecords.length;
    const attended = scopedRecords.filter(r => r.status === "PRESENT" || r.status === "LATE").length;
    const absent   = scopedRecords.filter(r => r.status === "ABSENT").length;
    const excused  = scopedRecords.filter(r => r.status === "EXCUSED").length;
    const denominator = total - excused;
    const rate = denominator > 0 ? Math.round((attended / denominator) * 100) : 0;
    return { total, attended, absent, excused, rate };
  }, [scopedRecords]);

  // ── TASK 2: Per-course breakdown ──────────────────────────────────────────
  const courseStats: CourseStat[] = useMemo(() => {
    const map: Record<string, CourseStat> = {};
    for (const r of scopedRecords) {
      if (!map[r.course_code]) {
        map[r.course_code] = { code: r.course_code, title: r.course_title, total: 0, present: 0, absent: 0, excused: 0, rate: 0 };
      }
      const s = map[r.course_code];
      s.total++;
      if (r.status === "PRESENT" || r.status === "LATE") s.present++;
      else if (r.status === "ABSENT") s.absent++;
      else s.excused++;
    }
    return Object.values(map)
      .map(s => {
        const denom = s.total - s.excused;
        return { ...s, rate: denom > 0 ? Math.round((s.present / denom) * 100) : 0 };
      })
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [scopedRecords]);

  // ── Streak ────────────────────────────────────────────────────────────────
  // Active term → CURRENT STREAK: count back from newest until a non-present record.
  // Past term   → BEST STREAK: scan full sorted list for the longest consecutive run.
  const streak = useMemo(() => {
    const sorted = [...scopedRecords].sort((a, b) => a.created_at.localeCompare(b.created_at));
    if (termView === "active") {
      let n = 0;
      for (const r of [...sorted].reverse()) {
        if (r.status === "PRESENT" || r.status === "LATE") n++;
        else break;
      }
      return n;
    }
    // Best streak — full scan
    let best = 0, cur = 0;
    for (const r of sorted) {
      if (r.status === "PRESENT" || r.status === "LATE") { cur++; best = Math.max(best, cur); }
      else cur = 0;
    }
    return best;
  }, [scopedRecords, termView]);

  // ── TASK 3: Session history filter pills (unique course codes) ────────────
  const uniqueCourses = useMemo(() => {
    const seen = new Set<string>();
    const result: { code: string; title: string }[] = [];
    for (const r of scopedRecords) {
      if (!seen.has(r.course_code)) {
        seen.add(r.course_code);
        result.push({ code: r.course_code, title: r.course_title });
      }
    }
    return result.sort((a, b) => a.code.localeCompare(b.code));
  }, [scopedRecords]);

  // ── TASK 3: Filtered history list ─────────────────────────────────────────
  const filteredHistory = useMemo(() => {
    const sorted = [...scopedRecords].sort((a, b) => b.created_at.localeCompare(a.created_at));
    return selectedCourse ? sorted.filter(r => r.course_code === selectedCourse) : sorted;
  }, [scopedRecords, selectedCourse]);

  const rateColor  = (r: number) => r >= 90 ? "#10b981" : r >= 75 ? "#7c3aed" : "#f59e0b";
  const rateBg     = (r: number) => r >= 90 ? "#d1fae5" : r >= 75 ? "#faf5ff" : "#fffbeb";
  const rateBorder = (r: number) => r >= 90 ? "#bbf7d0" : r >= 75 ? "#ede9fe" : "#fde68a";

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20, fontFamily: "'Sora',sans-serif" }}>
        <div className="ani0">
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1e1b4b", letterSpacing: "-.4px" }}>Attendance</h2>
          <Skeleton w="30%" h={12} r={6} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "88px 1fr 1fr 1fr", gap: 14 }}>
          {[0, 1, 2, 3].map(i => <Skeleton key={i} h={100} r={14} />)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Skeleton h={76} r={14} /><Skeleton h={76} r={14} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[0, 1, 2, 3].map(i => <Skeleton key={i} h={120} r={14} />)}
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 320 }}>
        <div style={{ textAlign: "center", padding: 40, background: "#fff", borderRadius: 20, border: "1px solid #fecaca" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#991b1b" }}>Failed to load attendance</div>
          <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 6 }}>Check your connection and try again.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, fontFamily: "'Sora',sans-serif" }}>

      {/* Page header */}
      <div className="ani0" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1e1b4b", letterSpacing: "-.4px" }}>Attendance</h2>
          <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>
            {termView === "active"
              ? `${overall.total} recorded sessions this term`
              : resolvedTerm
                ? `${overall.total} recorded sessions · ${resolvedTerm}`
                : "Select a past term below"}
          </p>
        </div>
        {/* Active / Past Terms toggle */}
        <div style={{ display: "flex", gap: 4, background: "#faf5ff", borderRadius: 11, padding: 4, border: "1px solid #ede9fe", flexShrink: 0 }}>
          {(["active", "past"] as const).map(view => (
            <button
              key={view}
              onClick={() => { setTermView(view); setSelectedCourse(null); setSelectedTerm(null); }}
              style={{
                padding: "5px 12px", borderRadius: 8,
                border: "none", cursor: "pointer",
                fontSize: 11, fontWeight: 600,
                fontFamily: "'Sora',sans-serif",
                background: termView === view ? "#7c3aed" : "transparent",
                color: termView === view ? "#fff" : "#94a3b8",
                transition: "all .15s",
                boxShadow: termView === view ? "0 2px 8px rgba(124,58,237,.25)" : "none",
                whiteSpace: "nowrap",
              }}
            >
              {view === "active" ? "Active Term" : "Past Terms"}
            </button>
          ))}
        </div>
      </div>

      {/* Past term selector — shown only when termView === "past" */}
      {termView === "past" && pastTermNames.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {pastTermNames.map(name => (
            <button
              key={name}
              onClick={() => { setSelectedTerm(name); setSelectedCourse(null); }}
              style={{
                padding: "5px 14px", borderRadius: 99,
                border: resolvedTerm === name ? "none" : "1px solid #ede9fe",
                background: resolvedTerm === name ? "#1e1b4b" : "#fff",
                color: resolvedTerm === name ? "#fff" : "#64748b",
                fontSize: 11, fontWeight: 600,
                cursor: "pointer", fontFamily: "'Sora',sans-serif",
                transition: "all .15s",
                boxShadow: resolvedTerm === name ? "0 2px 8px rgba(30,27,75,.2)" : "none",
              }}
            >
              {name}
            </button>
          ))}
        </div>
      )}

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

        {/* Stat cards — ATTENDED uses overall.attended (PRESENT + LATE) */}
        {[
          { label: "TOTAL",    value: overall.total,    sub: "sessions",  borderColor: "#ede9fe", valColor: "#7c3aed" },
          { label: "ATTENDED", value: overall.attended, sub: "present",   borderColor: "#bbf7d0", valColor: "#10b981" },
          { label: "MISSED",   value: overall.absent,   sub: "absences",  borderColor: "#fecaca", valColor: "#ef4444" },
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
            <div style={{ fontSize: 9.5, fontWeight: 700, color: "rgba(255,255,255,.7)", letterSpacing: ".8px", marginBottom: 4 }}>
              {termView === "active" ? "CURRENT STREAK" : "BEST STREAK"}
            </div>
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

      {/* ── TASK 2: Course breakdown ───────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {courseStats.length === 0 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 }}>
              <div style={{ textAlign: "center", padding: 36, background: "#fff", borderRadius: 16, border: "1px solid #ede9fe" }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1e1b4b" }}>No attendance records yet</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Records will appear here once sessions are logged.</div>
              </div>
            </div>
          )}
          {courseStats.map((cs, i) => {
            const warn        = cs.rate < 75;
            const presentPct  = cs.total > 0 ? Math.round((cs.present / cs.total) * 100) : 0;
            const absentPct   = cs.total > 0 ? Math.round((cs.absent  / cs.total) * 100) : 0;
            const excusedPct  = cs.total > 0 ? Math.round((cs.excused / cs.total) * 100) : 0;
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

      {/* ── TASK 3: Session history ────────────────────────────────────────── */}
      {activeTab === "history" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Filter pills — dynamically built from uniqueCourses */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[{ code: null, label: "ALL" }, ...uniqueCourses.map(c => ({ code: c.code, label: c.code }))].map(item => (
              <button
                key={item.label}
                onClick={() => setSelectedCourse(item.code === selectedCourse ? null : item.code)}
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
            {filteredHistory.length === 0 && (
              <div style={{ padding: "32px", textAlign: "center", fontSize: 12, color: "#94a3b8" }}>No records for this course.</div>
            )}
            {filteredHistory.map((r, i) => {
              const statusStyles = {
                PRESENT: { iconBg: "#d1fae5", iconColor: "#065f46" },
                ABSENT:  { iconBg: "#fee2e2", iconColor: "#991b1b" },
                LATE:    { iconBg: "#fef3c7", iconColor: "#92400e" },
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
                    {r.status === "PRESENT"  && <IconCheck />}
                    {r.status === "ABSENT"   && <IconX />}
                    {(r.status === "EXCUSED" || r.status === "LATE") && <IconMinus />}
                  </div>

                  {/* Course info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, color: "#7c3aed" }}>{r.course_code}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: stStyle.bg, color: stStyle.color }}>{r.session_type.slice(0, 3)}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.course_title}</div>
                  </div>

                  {/* Date + badge — uses created_at from API */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                    <span style={{ fontSize: 10.5, color: "#94a3b8", fontFamily: "'JetBrains Mono',monospace" }}>{fmtDate(r.created_at)}</span>
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