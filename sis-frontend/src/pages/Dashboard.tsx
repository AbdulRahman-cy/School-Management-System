import React, { useState, useEffect, useRef, useMemo } from "react";
import { useStudentProfile, useEnrollments, useStudentSessions } from "../api";
import type { Enrollment, Session, GradeEntry, NextClassInfo, CohortStats } from "../types";

// ─── Constants ────────────────────────────────────────────────────────────────

// Matches Timeslot.Day IntegerChoices: 0=Saturday … 5=Thursday
const DAY_LABELS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];

// Matches Timeslot.Period IntegerChoices
const PERIOD_LABELS: Record<number, string> = {
  1: "08:00–09:30",
  2: "09:45–11:15",
  3: "11:30–13:00",
  4: "13:30–15:00",
  5: "15:15–16:45",
};

// Alexandria University day order: week starts Saturday (day=0), ends Thursday (day=5)
// JS Date: 0=Sunday, 1=Monday … 6=Saturday
function getAlexDay(): number {
  const jsDay = new Date().getDay(); // 0=Sun … 6=Sat
  // Map JS day → Timeslot.Day integer
  const map: Record<number, number> = {
    6: 0, // Sat
    0: 1, // Sun
    1: 2, // Mon
    2: 3, // Tue
    3: 4, // Wed
    4: 5, // Thu
    5: -1, // Fri — no classes
  };
  return map[jsDay] ?? -1;
}

function getCurrentPeriod(): number {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const mins = h * 60 + m;
  // Return the period that hasn't started yet (strictly future)
  if (mins < 9 * 60 + 45)  return 1;
  if (mins < 11 * 60 + 30) return 2;
  if (mins < 13 * 60 + 30) return 3;
  if (mins < 15 * 60 + 15) return 4;
  if (mins < 16 * 60 + 45) return 5;
  return 6; // day over
}

/**
 * Find the next scheduled session for the student.
 * Algorithm:
 *   1. Try same day, future period.
 *   2. If none, wrap forward through the week (Saturday-based).
 *   3. If still none (all sessions are in past days this week), wrap to next week.
 */
function resolveNextClass(sessions: Session[]): NextClassInfo | null {
  if (!sessions.length) return null;

  const todayDay    = getAlexDay();
  const currentPeriod = getCurrentPeriod();

  // Score each session: lower = sooner
  function score(s: Session): number {
    const { day, period } = s.timeslot;
    let dayDelta = day - todayDay;
    if (dayDelta < 0) dayDelta += 6; // wrap (Sat–Thu = 6 working days)
    if (dayDelta === 0 && period <= currentPeriod) dayDelta = 6; // today's period already passed
    return dayDelta * 10 + period;
  }

  const sorted = [...sessions].sort((a, b) => score(a) - score(b));
  const next   = sorted[0];
  if (!next) return null;

  return {
    sessionId:   next.id,
    sessionType: next.session_type,
    courseClass: next.course_class, // full nested { id, course: { code, title } }
    room:        next.room,         // full nested { id, code, name }
    timeslot:    next.timeslot,
  };
}

/**
 * Derive a letter-grade label from GPA points.
 * Mirrors the course_grade_points scale in Enrollment.
 */
function gradeLabel(gp: number): string {
  if (gp >= 4.0) return "A";
  if (gp >= 3.7) return "A-";
  if (gp >= 3.3) return "B+";
  if (gp >= 3.0) return "B";
  if (gp >= 2.7) return "C+";
  if (gp >= 2.4) return "C";
  if (gp >= 2.0) return "D+";
  if (gp >= 1.0) return "D";
  return "F";
}

// ─── Skeleton shimmer ─────────────────────────────────────────────────────────

function Skeleton({ w = "100%", h = 16, r = 8 }: { w?: string | number; h?: number; r?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: "linear-gradient(90deg,#f3f0ff 25%,#e9e4ff 50%,#f3f0ff 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.4s infinite linear",
      flexShrink: 0,
    }} />
  );
}

function StatusCardSkeleton() {
  return (
    <div style={{
      background: "#fff", borderRadius: 14, padding: "16px 18px",
      border: "1px solid #ede9fe",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
          <Skeleton w="60%" h={10} />
          <Skeleton w="40%" h={28} />
          <Skeleton w="70%" h={10} />
        </div>
        <Skeleton w={50} h={50} r={99} />
      </div>
      <Skeleton h={3} r={99} />
    </div>
  );
}

function TableRowSkeleton() {
  return (
    <tr>
      {[60, 160, 30, 60, 50].map((w, i) => (
        <td key={i} style={{ padding: "12px 14px" }}>
          <Skeleton w={w} h={14} />
        </td>
      ))}
    </tr>
  );
}

// ─── Radial progress ─────────────────────────────────────────────────────────

function RadialProgress({ value, color, size = 50 }: { value: number; color: string; size?: number }) {
  const r    = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(value / 100, 1) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f3f0ff" strokeWidth={5} />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={5}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1s ease" }}
      />
    </svg>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyDashboard() {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: 400,
    }}>
      <div style={{
        textAlign: "center", padding: 40,
        background: "#fff", borderRadius: 20,
        border: "1px solid #ede9fe",
        boxShadow: "0 24px 64px rgba(124,58,237,0.08)",
      }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🚧</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#1e1b4b" }}>No enrollments yet</div>
        <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 6 }}>
          This student hasn't been enrolled in any courses this term.
        </div>
      </div>
    </div>
  );
}

// ─── Grade chip ───────────────────────────────────────────────────────────────

function GradeChip({ label, gp }: { label: string; gp: number }) {
  const isPass = gp >= 2.0;
  const isFail = gp === 0.0;
  const bg    = isFail ? "#fee2e2" : isPass ? "#d1fae5" : "#fef3c7";
  const color = isFail ? "#b91c1c" : isPass ? "#065f46" : "#b45309";
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: bg, color,
    }}>{label}</span>
  );
}

// ─── Grade breakdown tooltip (expandable row) ─────────────────────────────────

function GradeBreakdown({ grades }: { grades: GradeEntry[] }) {
  return (
    <tr style={{ background: "#faf5ff" }}>
      <td colSpan={5} style={{ padding: "0 14px 10px 40px" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {grades.map(g => (
            <div key={g.id} style={{
              fontSize: 11, color: "#64748b",
              background: "#fff", border: "1px solid #ede9fe",
              borderRadius: 7, padding: "4px 10px",
            }}>
              <span style={{ fontWeight: 600, color: "#1e1b4b" }}>{g.component}</span>
              <span style={{ margin: "0 4px", opacity: 0.4 }}>·</span>
              {g.score}
              <span style={{ opacity: 0.4, fontSize: 10 }}> × {parseFloat(g.weight) * 100}%</span>
              <span style={{ margin: "0 4px", opacity: 0.4 }}>=</span>
              <span style={{ fontWeight: 600, color: "#7c3aed" }}>{parseFloat(g.weighted_score).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </td>
    </tr>
  );
}

// ─── Command palette ──────────────────────────────────────────────────────────

const CMD_SUGGESTIONS = [
  "View timetable",
  "Check attendance",
  "Download student card",
  "View exam schedule",
  "Pay registration fees",
];

function CommandPalette({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  const filtered = CMD_SUGGESTIONS.filter(s => s.toLowerCase().includes(query.toLowerCase()));
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(15,10,30,0.55)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        paddingTop: "12vh",
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: "100%", maxWidth: 520,
        background: "#fff", borderRadius: 14,
        boxShadow: "0 32px 80px rgba(100,50,255,0.18)",
        border: "1px solid rgba(124,58,237,0.12)",
        overflow: "hidden",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 16px", borderBottom: "1px solid #f0eeff" }}>
          <span style={{ fontSize: 16, opacity: 0.35 }}>⌕</span>
          <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search portal…"
            style={{ flex: 1, border: "none", outline: "none", fontSize: 14, fontFamily: "inherit", color: "#1e1b4b", background: "transparent" }}
          />
          <kbd style={{ fontSize: 10, padding: "2px 6px", borderRadius: 5, background: "#f3f0ff", color: "#7c3aed", border: "1px solid #ddd6fe", fontFamily: "inherit" }}>ESC</kbd>
        </div>
        <div style={{ maxHeight: 280, overflowY: "auto" }}>
          {filtered.length === 0
            ? <div style={{ padding: "22px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No results</div>
            : filtered.map((s, i) => (
                <div key={i} style={{ padding: "11px 18px", display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#374151", cursor: "pointer", borderBottom: "1px solid #fafafa" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#faf5ff")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ opacity: 0.3, fontSize: 11 }}>→</span>{s}
                </div>
              ))
          }
        </div>
      </div>
    </div>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: "dashboard",  label: "Dashboard",       icon: "⊞", group: "" },
  { id: "profile",    label: "My Profile",       icon: "◎", group: "" },
  { id: "schedule",   label: "Timetable",        icon: "▦", group: "ACADEMIC" },
  { id: "enrollment", label: "Enrollment",       icon: "⊕", group: "ACADEMIC" },
  { id: "grades",     label: "Grades",           icon: "◈", group: "ACADEMIC", badge: 2 },
  { id: "exams",      label: "Exam Schedule",    icon: "◷", group: "ACADEMIC" },
  { id: "attendance", label: "Attendance",       icon: "◻", group: "ACADEMIC" },
  { id: "fees",       label: "Fees & Payments",  icon: "◇", group: "ADMIN" },
  { id: "documents",  label: "Documents",        icon: "◱", group: "ADMIN" },
  { id: "warnings",   label: "Academic Standing",icon: "△", group: "ADMIN" },
];

// ─── Grades view ─────────────────────────────────────────────────────────────

type DistBucket = keyof CohortStats["distribution"];

const DIST_KEYS: DistBucket[] = ["A", "A-", "B+", "B", "C+", "C", "D+", "D", "F"];

// Colour ramp: A grades → purple, B grades → blue, C grades → green,
// D grades → amber, F → red. Sub-letters share their parent's ramp.
const DIST_COLORS: Record<DistBucket, { active: string; faded: string; text: string }> = {
  "A":  { active: "#7c3aed", faded: "#ede9fe", text: "#6d28d9" },
  "A-": { active: "#6d28d9", faded: "#ede9fe", text: "#5b21b6" },
  "B+": { active: "#0ea5e9", faded: "#e0f2fe", text: "#0369a1" },
  "B":  { active: "#0284c7", faded: "#e0f2fe", text: "#075985" },
  "C+": { active: "#10b981", faded: "#d1fae5", text: "#065f46" },
  "C":  { active: "#059669", faded: "#d1fae5", text: "#064e3b" },
  "D+": { active: "#f59e0b", faded: "#fef3c7", text: "#92400e" },
  "D":  { active: "#d97706", faded: "#fef3c7", text: "#78350f" },
  "F":  { active: "#ef4444", faded: "#fee2e2", text: "#991b1b" },
};

function bucketForGp(gp: number): DistBucket {
  if (gp >= 4.0) return "A";
  if (gp >= 3.7) return "A-";
  if (gp >= 3.3) return "B+";
  if (gp >= 3.0) return "B";
  if (gp >= 2.7) return "C+";
  if (gp >= 2.4) return "C";
  if (gp >= 2.0) return "D+";
  if (gp >= 1.0) return "D";
  return "F";
}

interface GradesViewProps {
  enrollments:   Enrollment[] | undefined;
  enrollLoading: boolean;
  displayGpa:    string;
}

function GradesView({ enrollments, enrollLoading, displayGpa }: GradesViewProps) {
  const gradedEnrollments = enrollments?.filter(e => e.final_percentage > 0) ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Page header */}
      <div className="ani0">
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1e1b4b", letterSpacing: "-.4px" }}>Grades</h2>
        <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>
          {gradedEnrollments.length} graded course{gradedEnrollments.length !== 1 ? "s" : ""} · GPA {displayGpa}
        </p>
      </div>

      {/* Loading skeletons */}
      {enrollLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ background: "#fff", borderRadius: 16, border: "1px solid #ede9fe", padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <Skeleton w={80}  h={12} />
                  <Skeleton w={200} h={18} />
                </div>
                <Skeleton w={64} h={40} r={10} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                {[0, 1, 2, 3].map(j => <Skeleton key={j} h={48} r={8} />)}
              </div>
              <Skeleton h={90} r={10} />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!enrollLoading && gradedEnrollments.length === 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 320 }}>
          <div style={{ textAlign: "center", padding: 40, background: "#fff", borderRadius: 20, border: "1px solid #ede9fe" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1e1b4b" }}>No graded courses yet</div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 6 }}>Grades will appear here once your instructors submit them.</div>
          </div>
        </div>
      )}

      {/* Course performance cards */}
      {!enrollLoading && gradedEnrollments.map((enr, cardIdx) => {
        const label      = gradeLabel(enr.course_grade_points);
        const pct        = enr.final_percentage;
        const stats      = enr.cohort_stats;
        const myBucket   = bucketForGp(enr.course_grade_points);
        const maxCount   = stats ? Math.max(...DIST_KEYS.map(k => stats.distribution[k]), 1) : 1;
        const accentColor =
          enr.course_grade_points >= 3.7 ? "#7c3aed"
          : enr.course_grade_points >= 3.0 ? "#0ea5e9"
          : enr.course_grade_points >= 2.0 ? "#10b981"
          : enr.course_grade_points >= 1.0 ? "#f59e0b"
          : "#ef4444";

        return (
          <div
            key={enr.id}
            className="ani1"
            style={{ background: "#fff", borderRadius: 16, border: "1px solid #ede9fe", overflow: "hidden", animationDelay: `${cardIdx * 0.06}s` }}
          >
            {/* Accent bar */}
            <div style={{ height: 4, background: `linear-gradient(90deg, ${accentColor}, ${accentColor}88)` }} />

            <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 18 }}>

              {/* Card header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 600, color: "#7c3aed", background: "#f3f0ff", padding: "2px 7px", borderRadius: 5, display: "inline-block", marginBottom: 6 }}>
                    {enr.course_class.course.code}
                  </span>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#1e1b4b", letterSpacing: "-.3px", lineHeight: 1.3 }}>
                    {enr.course_class.course.title}
                  </div>
                </div>
                <div style={{ textAlign: "center", flexShrink: 0, padding: "10px 16px", borderRadius: 12, background: `${accentColor}12`, border: `1.5px solid ${accentColor}30` }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: accentColor, letterSpacing: "-1px", fontFamily: "'JetBrains Mono',monospace", lineHeight: 1 }}>{label}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3, fontWeight: 500 }}>{pct.toFixed(1)}%</div>
                </div>
              </div>

              {/* Grade component breakdown */}
              {enr.grades.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {enr.grades.map(g => (
                    <div key={g.id} style={{ fontSize: 11, padding: "5px 10px", borderRadius: 8, background: "#faf5ff", border: "1px solid #ede9fe", display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontWeight: 600, color: "#1e1b4b" }}>{g.component}</span>
                      <span style={{ color: "#94a3b8" }}>·</span>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "#7c3aed", fontWeight: 600 }}>{parseFloat(g.score).toFixed(1)}</span>
                      <span style={{ color: "#94a3b8", fontSize: 9 }}>×{(parseFloat(g.weight) * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Cohort stats row */}
              {stats && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                  {([
                    { label: "Class Avg", value: stats.average.toFixed(1) + "%", icon: "◈" },
                    { label: "Median",    value: stats.median.toFixed(1)  + "%", icon: "◎" },
                    { label: "Highest",   value: stats.highest.toFixed(1) + "%", icon: "▲" },
                    { label: "Students",  value: String(stats.total_students),   icon: "◻" },
                  ]).map(stat => (
                    <div key={stat.label} style={{ background: "#faf5ff", borderRadius: 10, border: "1px solid #ede9fe", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ fontSize: 9.5, fontWeight: 700, color: "#94a3b8", letterSpacing: ".4px", display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 8, color: "#c4b5fd" }}>{stat.icon}</span>
                        {stat.label.toUpperCase()}
                      </div>
                      <div style={{ fontSize: 17, fontWeight: 700, color: "#1e1b4b", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "-.5px", lineHeight: 1 }}>
                        {stat.value}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Distribution bar chart */}
              {stats && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: ".5px", marginBottom: 10 }}>
                    GRADE DISTRIBUTION
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 96 }}>
                    {DIST_KEYS.map(bucket => {
                      const count     = stats.distribution[bucket];
                      const isMe      = bucket === myBucket;
                      const barHeight = Math.round((count / maxCount) * 72);
                      const colors    = DIST_COLORS[bucket];
                      return (
                        <div key={bucket} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, justifyContent: "flex-end", height: "100%" }}>
                          {isMe
                            ? <div style={{ fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 99, background: colors.active, color: "#fff", letterSpacing: ".3px", flexShrink: 0, boxShadow: `0 2px 8px ${colors.active}55` }}>YOU</div>
                            : <div style={{ flex: 1 }} />
                          }
                          <div style={{ width: "100%", height: barHeight || 4, borderRadius: "5px 5px 3px 3px", background: isMe ? colors.active : colors.faded, transition: "height .6s cubic-bezier(.4,0,.2,1)", position: "relative" }}>
                            {barHeight >= 20 && (
                              <div style={{ position: "absolute", top: 5, left: 0, right: 0, textAlign: "center", fontSize: 9, fontWeight: 700, color: isMe ? "#fff" : colors.text }}>
                                {count}
                              </div>
                            )}
                          </div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: isMe ? colors.active : "#94a3b8" }}>{bucket}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* No cohort stats fallback */}
              {!stats && (
                <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>
                  Cohort statistics not yet available for this course.
                </div>
              )}

            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

// In production this comes from your auth context / JWT claims.
const STUDENT_ID = 4;

export default function UniversityPortal() {
  const [activeNav,   setActiveNav]   = useState("dashboard");
  const [collapsed,   setCollapsed]   = useState(false);
  const [cmdOpen,     setCmdOpen]     = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [courseFilter, setCourseFilter] = useState<"all" | "pass" | "fail">("all");

  // ── Data fetching ──────────────────────────────────────────────────────────
  const { data: profile,   isLoading: profileLoading,   isError: profileError }   = useStudentProfile(STUDENT_ID);
  const { data: enrollments, isLoading: enrollLoading,  isError: enrollError }    = useEnrollments(STUDENT_ID);
  const { data: sessions,  isLoading: sessionsLoading,  isError: sessionsError }  = useStudentSessions(STUDENT_ID);

  if (profileError)  console.error("[useStudentProfile] failed to fetch student profile");
  if (enrollError)   console.error("[useEnrollments] failed to fetch enrollments");
  if (sessionsError) console.error("[useStudentSessions] failed to fetch sessions");

  const isLoading = profileLoading || enrollLoading || sessionsLoading;

  // ── Derived: GPA ──────────────────────────────────────────────────────────
  const computedGpa = useMemo(() => {
    if (!enrollments?.length) return null;
    const graded = enrollments.filter(e => e.course_grade_points > 0);
    if (!graded.length) return null;
    const totalPoints  = graded.reduce((sum, e) => sum + e.course_grade_points, 0);
    return (totalPoints / graded.length).toFixed(2);
  }, [enrollments]);

  // The backend also provides cumulative_gpa on the StudentProfile — use that
  // when available; fall back to computed value above.
  const displayGpa = profile?.cumulative_gpa
    ? parseFloat(profile.cumulative_gpa).toFixed(2)
    : (computedGpa ?? "—");
  const gpaProgress = displayGpa !== "—" ? (parseFloat(displayGpa) / 4) * 100 : 0;

  // ── Derived: Next class ───────────────────────────────────────────────────
  const nextClass: NextClassInfo | null = useMemo(
    () => (sessions ? resolveNextClass(sessions) : null),
    [sessions]
  );

  // ── Derived: "Potential attendance" ───────────────────────────────────────
  // TODO: Connect to real Attendance model once /records/attendances/ endpoint exists.
  // For now: attendance = (total unique sessions enrolled) / (expected sessions per term)
  // Assumption: a full term has 15 weeks × sessions per week per enrollment.
  const attendanceProgress = useMemo(() => {
    if (!sessions?.length) return 0;
    const totalSessions  = sessions.length;
    // A conservative upper bound for % display: cap at 5 sessions per week × 15 weeks
    const expectedMax    = 15 * 5;
    return Math.min(Math.round((totalSessions / expectedMax) * 100), 100);
  }, [sessions]);

  // ── Derived: Filtered course rows ────────────────────────────────────────
  const filteredEnrollments = useMemo(() => {
    if (!enrollments) return [];
    if (courseFilter === "pass") return enrollments.filter(e => e.course_grade_points >= 2.0);
    if (courseFilter === "fail") return enrollments.filter(e => e.course_grade_points < 2.0 && e.grades.length > 0);
    return enrollments;
  }, [enrollments, courseFilter]);

  // ── Derived: Top performing courses (Profile leaderboard) ────────────────
  const topPerformers = useMemo(() => {
    if (!enrollments) return [];
    return [...enrollments]
      .filter(e => e.final_percentage > 0)          // exclude in-progress (0%)
      .sort((a, b) => b.final_percentage - a.final_percentage)
      .slice(0, 4);
  }, [enrollments]);

  // ── Derived: Schedule grid map keyed by "day-period" ─────────────────────
  // Multiple sessions can share a day+period (e.g. lab split-groups), so each
  // cell holds an array. In practice a student's personal timetable has at most
  // one session per slot, but the array keeps the type honest.
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

  // ⌘K shortcut
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setCmdOpen(v => !v); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // Close profile dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-profile-dd]")) setProfileOpen(false);
    };
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, []);

  // ── Display helpers ───────────────────────────────────────────────────────
  const studentFirstName  = profile?.user?.first_name ?? "";
  const disciplineName    = profile?.discipline?.name ?? "—";
  const studentIdDisplay  = profile?.id ?? "—";
  const initials          = profile
    ? `${profile.user.first_name?.[0] ?? ""}${profile.user.last_name?.[0] ?? ""}` || "?"
    : "…";

  const studentName = profile
    ? (profile.user.full_name || `${profile.user.first_name} ${profile.user.last_name}`.trim() || "—")
    : "—";

  const nextClassDisplay = nextClass
    ? {
        code:    nextClass.courseClass.course.code,
        title:   nextClass.courseClass.course.title,
        day:     DAY_LABELS[nextClass.timeslot.day],
        period:  PERIOD_LABELS[nextClass.timeslot.period],
        room:    nextClass.room.name,
        session: nextClass.sessionType,
      }
    : null;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Sora',sans-serif;background:#f5f3ff}
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-thumb{background:#ddd6fe;border-radius:99px}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer{from{background-position:200% 0}to{background-position:-200% 0}}
        .ani0{animation:fadeUp .4s ease both}
        .ani1{animation:fadeUp .4s .08s ease both}
        .ani2{animation:fadeUp .4s .16s ease both}
        .nav-i{cursor:pointer;display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:9px;margin-bottom:2px;font-size:12.5px;color:#64748b;transition:background .15s}
        .nav-i:hover{background:rgba(124,58,237,.07)}
        .nav-i.act{background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;font-weight:600}
        .tr-exp:hover td{background:#faf5ff}
      `}</style>

      {cmdOpen && <CommandPalette onClose={() => setCmdOpen(false)} />}

      <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Sora',sans-serif" }}>

        {/* ── Sidebar ───────────────────────────────────────────────────── */}
        <aside style={{
          width: collapsed ? 64 : 236,
          minHeight: "100vh",
          background: "#fff",
          borderRight: "1px solid #ede9fe",
          display: "flex", flexDirection: "column",
          transition: "width .22s cubic-bezier(.4,0,.2,1)",
          overflow: "hidden", flexShrink: 0,
          position: "sticky", top: 0, height: "100vh", zIndex: 10,
        }}>
          <div style={{ padding: "16px", borderBottom: "1px solid #f3f0ff", display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: "linear-gradient(135deg,#7c3aed,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>Δ</div>
            {!collapsed && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#1e1b4b", letterSpacing: "-.2px", whiteSpace: "nowrap" }}>Ibn al-Hitham</div>
                <div style={{ fontSize: 9, color: "#a78bfa", fontWeight: 500, letterSpacing: ".5px", whiteSpace: "nowrap" }}>UNIVERSITY PORTAL</div>
              </div>
            )}
          </div>

          <nav style={{ flex: 1, padding: "10px 6px", overflowY: "auto" }}>
            {["", "ACADEMIC", "ADMIN"].map(group => (
              <div key={group}>
                {group && !collapsed && (
                  <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "1px", color: "#c4b5fd", padding: "9px 10px 3px", whiteSpace: "nowrap" }}>{group}</div>
                )}
                {NAV_ITEMS.filter(n => n.group === group).map(item => {
                  const isAct = activeNav === item.id;
                  return (
                    <div key={item.id} className={`nav-i${isAct ? " act" : ""}`} onClick={() => setActiveNav(item.id)}>
                      <span style={{ fontSize: 14, flexShrink: 0, opacity: isAct ? 1 : 0.55 }}>{item.icon}</span>
                      {!collapsed && (
                        <>
                          <span style={{ flex: 1, whiteSpace: "nowrap" }}>{item.label}</span>
                          {item.badge && (
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 99, background: isAct ? "rgba(255,255,255,.25)" : "#ede9fe", color: isAct ? "#fff" : "#7c3aed" }}>{item.badge}</span>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </nav>

          {!collapsed && (
            <div style={{ margin: "0 6px 10px", padding: "11px", background: "#faf5ff", borderRadius: 11, border: "1px solid #ede9fe" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg,#7c3aed,#a78bfa)", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{initials}</div>
                <div>
                  {profileLoading
                    ? <Skeleton w={90} h={11} />
                    : <div style={{ fontSize: 11.5, fontWeight: 600, color: "#1e1b4b", whiteSpace: "nowrap" }}>{studentName}</div>
                  }
                  <div style={{ fontSize: 9, color: "#a78bfa", marginTop: 2 }}>ID {studentIdDisplay}</div>
                </div>
              </div>
            </div>
          )}

          <button onClick={() => setCollapsed(v => !v)} style={{ margin: "0 6px 14px", padding: "7px", border: "1px solid #ede9fe", borderRadius: 8, background: "transparent", cursor: "pointer", color: "#a78bfa", fontSize: 11, fontFamily: "inherit" }}>
            {collapsed ? "→" : "← Collapse"}
          </button>
        </aside>

        {/* ── Main ──────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

          {/* Topbar */}
          <header style={{ height: 56, background: "#fff", borderBottom: "1px solid #ede9fe", display: "flex", alignItems: "center", padding: "0 22px", gap: 12, position: "sticky", top: 0, zIndex: 9 }}>
            <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>
              <span style={{ color: "#7c3aed" }}>Portal</span>
              <span style={{ margin: "0 5px" }}>/</span>
              <span style={{ color: "#1e1b4b", textTransform: "capitalize" }}>{activeNav}</span>
            </div>
            <button onClick={() => setCmdOpen(true)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", border: "1.5px solid #ede9fe", borderRadius: 9, background: "#faf5ff", cursor: "pointer", color: "#94a3b8", fontSize: 12.5, fontFamily: "inherit", minWidth: 180 }}>
              <span style={{ opacity: .5 }}>⌕</span>
              <span style={{ flex: 1, textAlign: "left" }}>Search portal…</span>
              <kbd style={{ fontSize: 9, padding: "2px 5px", background: "#ede9fe", border: "1px solid #ddd6fe", borderRadius: 4, color: "#7c3aed", fontFamily: "inherit" }}>⌘K</kbd>
            </button>
            <div style={{ flex: 1 }} />
            <button style={{ width: 34, height: 34, borderRadius: 9, border: "1.5px solid #ede9fe", background: "transparent", cursor: "pointer", fontSize: 14, position: "relative" }}>
              🔔<span style={{ position: "absolute", top: 7, right: 7, width: 6, height: 6, borderRadius: "50%", background: "#7c3aed", border: "1.5px solid #fff" }} />
            </button>
            <div style={{ position: "relative" }} data-profile-dd>
              <button onClick={() => setProfileOpen(v => !v)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "4px 9px", border: "1.5px solid #ede9fe", borderRadius: 9, background: "transparent", cursor: "pointer", fontFamily: "inherit" }}>
                <div style={{ width: 26, height: 26, borderRadius: 6, background: "linear-gradient(135deg,#7c3aed,#a78bfa)", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{initials}</div>
                <span style={{ fontSize: 12.5, color: "#1e1b4b", fontWeight: 500 }}>{studentFirstName || "…"}</span>
                <span style={{ fontSize: 9, color: "#94a3b8" }}>▾</span>
              </button>
              {profileOpen && (
                <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, width: 180, background: "#fff", border: "1px solid #ede9fe", borderRadius: 11, boxShadow: "0 16px 40px rgba(124,58,237,.12)", overflow: "hidden", zIndex: 20 }}>
                  <div style={{ padding: "11px 13px", borderBottom: "1px solid #f3f0ff" }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: "#1e1b4b" }}>{studentName}</div>
                    <div style={{ fontSize: 10, color: "#a78bfa" }}>{disciplineName}</div>
                  </div>
                  {["My Profile", "Settings", "Sign Out"].map((item, i) => (
                    <div key={i} style={{ padding: "9px 13px", fontSize: 12.5, color: item === "Sign Out" ? "#ef4444" : "#374151", cursor: "pointer", borderBottom: i < 2 ? "1px solid #fafafa" : "none" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#faf5ff")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >{item}</div>
                  ))}
                </div>
              )}
            </div>
          </header>

          {/* Dashboard */}
          <main style={{ flex: 1, padding: "22px", overflowY: "auto" }}>

            {activeNav === "dashboard" ? (
              <>
                {/* Greeting */}
                <div className="ani0" style={{ marginBottom: 22 }}>
                  {profileLoading
                    ? <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><Skeleton w="30%" h={22} /><Skeleton w="50%" h={12} /></div>
                    : (
                      <>
                        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1e1b4b", letterSpacing: "-.4px" }}>Good morning, {studentFirstName} 👋</h1>
                        <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>{disciplineName} · Student ID {studentIdDisplay}</p>
                      </>
                    )}
                </div>

                {/* Status cards */}
                <div className="ani1" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 22 }}>
                  {isLoading ? (
                    <>{[0,1,2].map(i => <StatusCardSkeleton key={i} />)}</>
                  ) : (
                    <>
                      {/* GPA */}
                      <div style={{ background: "#fff", borderRadius: 14, padding: "16px 18px", border: "1px solid #ede9fe" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", letterSpacing: ".4px", marginBottom: 4 }}>CUMULATIVE GPA</div>
                            <div style={{ fontSize: 26, fontWeight: 700, color: "#1e1b4b", letterSpacing: "-1px", fontFamily: "'JetBrains Mono',monospace" }}>{displayGpa}</div>
                            <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 2 }}>out of 4.0</div>
                          </div>
                          <RadialProgress value={gpaProgress} color="#7c3aed" />
                        </div>
                        <div style={{ height: 3, background: "#f3f0ff", borderRadius: 99 }}>
                          <div style={{ width: `${gpaProgress}%`, height: "100%", background: "#7c3aed", borderRadius: 99, transition: "width 1.2s ease" }} />
                        </div>
                      </div>

                      {/* Attendance (TODO: real model) */}
                      <div style={{ background: "#fff", borderRadius: 14, padding: "16px 18px", border: "1px solid #ede9fe" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", letterSpacing: ".4px", marginBottom: 4 }}>SESSIONS SCHEDULED</div>
                            <div style={{ fontSize: 26, fontWeight: 700, color: "#1e1b4b", letterSpacing: "-1px", fontFamily: "'JetBrains Mono',monospace" }}>{sessions?.length ?? 0}</div>
                            <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 2 }}>
                              {/* TODO: Connect to real Attendance model */}
                              sessions this term
                            </div>
                          </div>
                          <RadialProgress value={attendanceProgress} color="#0ea5e9" />
                        </div>
                        <div style={{ height: 3, background: "#e0f2fe", borderRadius: 99 }}>
                          <div style={{ width: `${attendanceProgress}%`, height: "100%", background: "#0ea5e9", borderRadius: 99, transition: "width 1.2s ease" }} />
                        </div>
                      </div>

                      {/* Next class */}
                      <div style={{ background: "#fff", borderRadius: 14, padding: "16px 18px", border: "1px solid #ede9fe" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", letterSpacing: ".4px", marginBottom: 4 }}>NEXT CLASS</div>
                            {nextClassDisplay ? (
                              <>
                                <div style={{ fontSize: 16, fontWeight: 700, color: "#1e1b4b", letterSpacing: "-.3px", fontFamily: "'JetBrains Mono',monospace" }}>{nextClassDisplay.code}</div>
                                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 160 }}>{nextClassDisplay.title}</div>
                                <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 3 }}>{nextClassDisplay.day} · {nextClassDisplay.period}</div>
                                <div style={{ fontSize: 10, color: "#7c3aed", marginTop: 2, fontWeight: 600 }}>{nextClassDisplay.room}</div>
                              </>
                            ) : (
                              <div style={{ fontSize: 14, color: "#94a3b8", marginTop: 4 }}>No upcoming sessions</div>
                            )}
                          </div>
                          <RadialProgress value={nextClass ? 60 : 0} color="#10b981" />
                        </div>
                        <div style={{ height: 3, background: "#d1fae5", borderRadius: 99 }}>
                          <div style={{ width: nextClass ? "60%" : "0%", height: "100%", background: "#10b981", borderRadius: 99, transition: "width 1.2s ease" }} />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Empty state */}
                {!isLoading && enrollments?.length === 0 && <EmptyDashboard />}

                {/* Courses table */}
                {!isLoading && (enrollments?.length ?? 0) > 0 && (
                  <div className="ani2" style={{ background: "#fff", borderRadius: 14, border: "1px solid #ede9fe", overflow: "hidden" }}>
                    <div style={{ padding: "15px 18px", borderBottom: "1px solid #f3f0ff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#1e1b4b" }}>Course Enrollments</div>
                      <div style={{ display: "flex", gap: 5 }}>
                        {(["all", "pass", "fail"] as const).map(f => (
                          <button key={f} onClick={() => setCourseFilter(f)} style={{ padding: "3px 9px", borderRadius: 6, border: courseFilter === f ? "none" : "1px solid #ede9fe", background: courseFilter === f ? "#7c3aed" : "transparent", color: courseFilter === f ? "#fff" : "#94a3b8", fontSize: 10.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize" }}>{f}</button>
                        ))}
                      </div>
                    </div>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "#faf5ff" }}>
                          {["Code", "Course Title", "Final %", "Grade", "Points"].map(h => (
                            <th key={h} style={{ padding: "9px 14px", textAlign: "left", fontSize: 9.5, fontWeight: 700, color: "#94a3b8", letterSpacing: ".5px", borderBottom: "1px solid #f3f0ff" }}>{h.toUpperCase()}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {enrollLoading
                          ? [0,1,2,3].map(i => <TableRowSkeleton key={i} />)
                          : filteredEnrollments.map((enr: Enrollment) => {
                              const label = gradeLabel(enr.course_grade_points);
                              const isExpanded = expandedRow === enr.id;
                              return (
                                <React.Fragment key={enr.id}>
                                  <tr className="tr-exp" onClick={() => setExpandedRow(isExpanded ? null : enr.id)} style={{ borderBottom: isExpanded ? "none" : "1px solid #fafafa", cursor: "pointer" }}>
                                    <td style={{ padding: "11px 14px" }}>
                                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, fontWeight: 500, color: "#7c3aed", background: "#f3f0ff", padding: "2px 6px", borderRadius: 5 }}>{enr.course_class.course.code}</span>
                                    </td>
                                    <td style={{ padding: "11px 14px", fontSize: 12.5, color: "#374151", fontWeight: 500 }}>{enr.course_class.course.title}</td>
                                    <td style={{ padding: "11px 14px", fontSize: 12.5, fontFamily: "'JetBrains Mono',monospace", color: "#1e1b4b", fontWeight: 600 }}>
                                      {enr.final_percentage.toFixed(1)}%
                                    </td>
                                    <td style={{ padding: "11px 14px" }}>
                                      <GradeChip label={label} gp={enr.course_grade_points} />
                                    </td>
                                    <td style={{ padding: "11px 14px", fontSize: 12.5, fontFamily: "'JetBrains Mono',monospace", color: "#1e1b4b", fontWeight: 600 }}>
                                      {enr.course_grade_points.toFixed(1)}
                                      <span style={{ fontSize: 9, color: "#94a3b8", marginLeft: 4 }}>▾</span>
                                    </td>
                                  </tr>
                                  {isExpanded && <GradeBreakdown grades={enr.grades} />}
                                </React.Fragment>
                              );
                            })
                        }
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : activeNav === "profile" ? (
              /* ── Profile page ────────────────────────────────────────── */
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                {/* Profile header banner */}
                {isLoading ? (
                  <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #ede9fe", padding: "28px 28px", display: "flex", alignItems: "center", gap: 22 }}>
                    <Skeleton w={80} h={80} r={99} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                      <Skeleton w="35%" h={22} />
                      <Skeleton w="50%" h={13} />
                      <Skeleton w="28%" h={13} />
                    </div>
                  </div>
                ) : (
                  <div style={{
                    background: "#fff", borderRadius: 16, border: "1px solid #ede9fe",
                    overflow: "hidden", position: "relative",
                  }}>
                    {/* Decorative top stripe */}
                    <div style={{
                      height: 6,
                      background: "linear-gradient(90deg, #7c3aed, #a78bfa, #6d28d9)",
                    }} />

                    <div style={{ padding: "28px 28px", display: "flex", alignItems: "center", gap: 22 }}>
                      {/* Large avatar */}
                      <div style={{
                        width: 80, height: 80, borderRadius: "50%", flexShrink: 0,
                        background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontSize: 28, fontWeight: 700,
                        boxShadow: "0 8px 24px rgba(124,58,237,0.28)",
                        letterSpacing: "-1px",
                      }}>
                        {initials}
                      </div>

                      {/* Identity */}
                      <div style={{ flex: 1 }}>
                        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1e1b4b", letterSpacing: "-.5px", marginBottom: 5 }}>
                          {studentName}
                        </h2>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px 14px" }}>
                          <span style={{ fontSize: 12.5, color: "#64748b" }}>
                            ✉ {profile?.user?.email ?? "—"}
                          </span>
                          <span style={{ fontSize: 12.5, color: "#94a3b8" }}>·</span>
                          <span style={{ fontSize: 12.5, color: "#64748b" }}>
                            {disciplineName}
                          </span>
                          <span style={{ fontSize: 12.5, color: "#94a3b8" }}>·</span>
                          <span style={{ fontSize: 12.5, color: "#64748b" }}>
                            Enrolled {profile?.enrollment_year ?? "—"}
                          </span>
                        </div>
                      </div>

                      {/* Student ID badge */}
                      <div style={{
                        padding: "10px 16px", borderRadius: 10,
                        background: "#faf5ff", border: "1px solid #ede9fe",
                        textAlign: "center", flexShrink: 0,
                      }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: "#a78bfa", letterSpacing: "1px", marginBottom: 3 }}>STUDENT ID</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "#7c3aed", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "1px" }}>
                          {studentIdDisplay}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Academic stats row */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
                  {isLoading ? (
                    <>{[0,1,2].map(i => <Skeleton key={i} h={88} r={12} />)}</>
                  ) : (
                    <>
                      {[
                        { label: "Cumulative GPA",  value: displayGpa,                   sub: "out of 4.0",       accent: "#7c3aed", bg: "#faf5ff" },
                        { label: "Total Courses",   value: enrollments?.length ?? 0,     sub: "this term",        accent: "#0ea5e9", bg: "#f0f9ff" },
                        { label: "Enrollment Year", value: profile?.enrollment_year ?? "—", sub: "academic intake", accent: "#10b981", bg: "#f0fdf4" },
                      ].map(stat => (
                        <div key={stat.label} style={{
                          background: "#fff", borderRadius: 12, border: "1px solid #ede9fe",
                          padding: "16px 20px", display: "flex", alignItems: "center", gap: 14,
                        }}>
                          <div style={{
                            width: 42, height: 42, borderRadius: 10, background: stat.bg,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            flexShrink: 0,
                          }}>
                            <div style={{
                              width: 14, height: 14, borderRadius: "50%",
                              background: stat.accent, opacity: 0.85,
                            }} />
                          </div>
                          <div>
                            <div style={{ fontSize: 9.5, fontWeight: 700, color: "#94a3b8", letterSpacing: ".5px", marginBottom: 3 }}>
                              {stat.label.toUpperCase()}
                            </div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: "#1e1b4b", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "-1px", lineHeight: 1 }}>
                              {stat.value}
                            </div>
                            <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 2 }}>{stat.sub}</div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {/* Top performing courses leaderboard */}
                <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #ede9fe", overflow: "hidden" }}>
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid #f3f0ff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#1e1b4b" }}>Top Performing Courses</div>
                      <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 2 }}>ranked by final percentage</div>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 99,
                      background: "#faf5ff", color: "#7c3aed", border: "1px solid #ede9fe",
                    }}>TOP {topPerformers.length}</span>
                  </div>

                  {isLoading ? (
                    <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                      {[0,1,2,3].map(i => <Skeleton key={i} h={58} r={10} />)}
                    </div>
                  ) : topPerformers.length === 0 ? (
                    <div style={{ padding: "36px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                      No graded courses yet this term.
                    </div>
                  ) : (
                    <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
                      {topPerformers.map((enr, rank) => {
                        const label    = gradeLabel(enr.course_grade_points);
                        const pct      = enr.final_percentage;
                        const isGold   = rank === 0;
                        const isSilver = rank === 1;
                        const isBronze = rank === 2;
                        const medalColor = isGold ? "#f59e0b" : isSilver ? "#94a3b8" : isBronze ? "#cd7c2f" : "#c4b5fd";
                        const barColor   = pct >= 89 ? "#7c3aed" : pct >= 74 ? "#0ea5e9" : pct >= 60 ? "#10b981" : "#f59e0b";

                        return (
                          <div key={enr.id} style={{
                            display: "flex", alignItems: "center", gap: 14,
                            padding: "13px 16px", borderRadius: 11,
                            background: isGold ? "linear-gradient(135deg,#fffbeb,#fef3c7)" : "#faf5ff",
                            border: `1px solid ${isGold ? "#fde68a" : "#ede9fe"}`,
                          }}>
                            {/* Rank medal */}
                            <div style={{
                              width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                              background: isGold ? "linear-gradient(135deg,#f59e0b,#fbbf24)"
                                : isSilver ? "linear-gradient(135deg,#94a3b8,#cbd5e1)"
                                : isBronze ? "linear-gradient(135deg,#cd7c2f,#d97706)"
                                : "#ede9fe",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              color: rank < 3 ? "#fff" : "#7c3aed",
                              fontSize: 11, fontWeight: 800,
                              boxShadow: isGold ? "0 4px 12px rgba(245,158,11,0.35)" : "none",
                            }}>
                              #{rank + 1}
                            </div>

                            {/* Course code + title */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                                <span style={{
                                  fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 600,
                                  color: "#7c3aed", background: "#ede9fe", padding: "2px 7px", borderRadius: 5,
                                  flexShrink: 0,
                                }}>
                                  {enr.course_class.course.code}
                                </span>
                                <span style={{
                                  fontSize: 12, color: "#374151", fontWeight: 500,
                                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                                }}>
                                  {enr.course_class.course.title}
                                </span>
                              </div>
                              {/* Progress bar */}
                              <div style={{ height: 3, background: "#e9e4ff", borderRadius: 99 }}>
                                <div style={{
                                  width: `${pct}%`, height: "100%",
                                  background: barColor, borderRadius: 99,
                                  transition: "width 1s ease",
                                }} />
                              </div>
                            </div>

                            {/* Percentage */}
                            <div style={{
                              fontSize: 20, fontWeight: 700, color: "#1e1b4b",
                              fontFamily: "'JetBrains Mono',monospace", letterSpacing: "-1px",
                              flexShrink: 0, minWidth: 60, textAlign: "right",
                            }}>
                              {pct.toFixed(1)}
                              <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 400 }}>%</span>
                            </div>

                            {/* Grade chip */}
                            <div style={{ flexShrink: 0 }}>
                              <GradeChip label={label} gp={enr.course_grade_points} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            ) : activeNav === "schedule" ? (
              /* ── Timetable page ──────────────────────────────────────── */
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                {/* Page header */}
                <div className="ani0">
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1e1b4b", letterSpacing: "-.4px" }}>My Timetable</h2>
                  <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>
                    Weekly schedule · {sessions?.length ?? 0} sessions this term
                  </p>
                </div>

                {/* Legend */}
                <div className="ani0" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {[
                    { type: "LECTURE",  bg: "#ede9fe", color: "#6d28d9", dot: "#7c3aed"  },
                    { type: "LAB",      bg: "#d1fae5", color: "#065f46", dot: "#10b981"  },
                    { type: "TUTORIAL", bg: "#fef3c7", color: "#92400e", dot: "#f59e0b"  },
                  ].map(({ type, bg, color, dot }) => (
                    <div key={type} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: dot }} />
                      {type}
                    </div>
                  ))}
                </div>

                {/* Grid */}
                <div className="ani1" style={{
                  background: "#fff", borderRadius: 16, border: "1px solid #ede9fe",
                  overflow: "hidden",
                }}>
                  {sessionsLoading ? (
                    /* Skeleton grid */
                    <div style={{ padding: 20 }}>
                      {/* Header skeleton */}
                      <div style={{ display: "grid", gridTemplateColumns: "80px repeat(6,1fr)", gap: 8, marginBottom: 8 }}>
                        <div />
                        {[0,1,2,3,4,5].map(i => <Skeleton key={i} h={32} r={8} />)}
                      </div>
                      {/* Row skeletons */}
                      {[0,1,2,3,4].map(r => (
                        <div key={r} style={{ display: "grid", gridTemplateColumns: "80px repeat(6,1fr)", gap: 8, marginBottom: 8 }}>
                          <Skeleton h={72} r={8} />
                          {[0,1,2,3,4,5].map(c => (
                            <div key={c} style={{
                              height: 72, borderRadius: 8,
                              // randomly skip some to mimic sparse timetable
                              background: (r + c) % 3 === 0 ? "transparent" : undefined,
                            }}>
                              {(r + c) % 3 !== 0 && <Skeleton h={72} r={8} />}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
                        <thead>
                          <tr>
                            {/* Period label column header */}
                            <th style={{
                              width: 88, padding: "12px 14px",
                              borderBottom: "1px solid #ede9fe",
                              borderRight: "1px solid #ede9fe",
                              background: "#faf5ff",
                            }} />
                            {DAY_LABELS.map((day, d) => (
                              <th key={d} style={{
                                padding: "12px 10px",
                                textAlign: "center",
                                fontSize: 11, fontWeight: 700,
                                color: d === getAlexDay() ? "#7c3aed" : "#64748b",
                                letterSpacing: ".3px",
                                borderBottom: "1px solid #ede9fe",
                                borderRight: d < 5 ? "1px solid #ede9fe" : "none",
                                background: d === getAlexDay() ? "#faf5ff" : "#fff",
                                position: "relative",
                              }}>
                                {day.slice(0, 3).toUpperCase()}
                                {d === getAlexDay() && (
                                  <div style={{
                                    position: "absolute", bottom: 0, left: "50%",
                                    transform: "translateX(-50%)",
                                    width: 20, height: 2,
                                    background: "#7c3aed", borderRadius: 99,
                                  }} />
                                )}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {([1,2,3,4,5] as const).map((period, pi) => (
                            <tr key={period} style={{ borderBottom: pi < 4 ? "1px solid #ede9fe" : "none" }}>
                              {/* Period label */}
                              <td style={{
                                padding: "10px 14px",
                                borderRight: "1px solid #ede9fe",
                                background: "#faf5ff",
                                verticalAlign: "middle",
                              }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "#7c3aed", marginBottom: 2 }}>
                                  P{period}
                                </div>
                                <div style={{ fontSize: 9, color: "#94a3b8", whiteSpace: "nowrap", fontFamily: "'JetBrains Mono',monospace" }}>
                                  {PERIOD_LABELS[period]}
                                </div>
                              </td>

                              {/* Day cells */}
                              {([0,1,2,3,4,5] as const).map((day, di) => {
                                const key      = `${day}-${period}`;
                                const cellSessions = scheduleMap[key] ?? [];
                                const isToday  = day === getAlexDay();

                                return (
                                  <td key={day} style={{
                                    padding: 6,
                                    verticalAlign: "top",
                                    borderRight: di < 5 ? "1px solid #ede9fe" : "none",
                                    background: isToday ? "#fefbff" : "transparent",
                                    minWidth: 100,
                                  }}>
                                    {cellSessions.length === 0 ? (
                                      /* Empty cell */
                                      <div style={{
                                        height: 80,
                                        borderRadius: 8,
                                        border: "1.5px dashed #ede9fe",
                                        background: "#fafafa",
                                      }} />
                                    ) : cellSessions.map(s => {
                                      const typeStyles: Record<string, { bg: string; border: string; badge: string; badgeTxt: string; dot: string }> = {
                                        LECTURE:  { bg: "#faf5ff", border: "#ddd6fe", badge: "#ede9fe", badgeTxt: "#6d28d9", dot: "#7c3aed"  },
                                        LAB:      { bg: "#f0fdf4", border: "#bbf7d0", badge: "#d1fae5", badgeTxt: "#065f46", dot: "#10b981"  },
                                        TUTORIAL: { bg: "#fffbeb", border: "#fde68a", badge: "#fef3c7", badgeTxt: "#92400e", dot: "#f59e0b"  },
                                      };
                                      const st = typeStyles[s.session_type] ?? typeStyles.LECTURE;

                                      return (
                                        <div
                                          key={s.id}
                                          style={{
                                            height: 80,
                                            borderRadius: 8,
                                            padding: "8px 9px",
                                            background: st.bg,
                                            border: `1.5px solid ${st.border}`,
                                            display: "flex",
                                            flexDirection: "column",
                                            justifyContent: "space-between",
                                            cursor: "default",
                                            transition: "transform .15s, box-shadow .15s",
                                          }}
                                          onMouseEnter={e => {
                                            (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
                                            (e.currentTarget as HTMLDivElement).style.boxShadow = "0 6px 18px rgba(124,58,237,0.12)";
                                          }}
                                          onMouseLeave={e => {
                                            (e.currentTarget as HTMLDivElement).style.transform = "";
                                            (e.currentTarget as HTMLDivElement).style.boxShadow = "";
                                          }}
                                        >
                                          {/* Top row: code + type badge */}
                                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 4 }}>
                                            <span style={{
                                              fontFamily: "'JetBrains Mono',monospace",
                                              fontSize: 11, fontWeight: 700,
                                              color: "#1e1b4b", letterSpacing: "-.3px",
                                              lineHeight: 1.2,
                                            }}>
                                              {s.course_class.course.code}
                                            </span>
                                            <span style={{
                                              fontSize: 8, fontWeight: 700,
                                              padding: "2px 5px", borderRadius: 4,
                                              background: st.badge, color: st.badgeTxt,
                                              letterSpacing: ".3px", flexShrink: 0,
                                              lineHeight: 1.4,
                                            }}>
                                              {s.session_type.slice(0, 3)}
                                            </span>
                                          </div>

                                          {/* Course title (truncated) */}
                                          <div style={{
                                            fontSize: 9.5, color: "#64748b",
                                            overflow: "hidden",
                                            display: "-webkit-box",
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: "vertical",
                                            lineHeight: 1.35,
                                          }}>
                                            {s.course_class.course.title}
                                          </div>

                                          {/* Bottom: room */}
                                          <div style={{
                                            display: "flex", alignItems: "center", gap: 3,
                                            fontSize: 9, color: "#94a3b8", fontWeight: 500,
                                          }}>
                                            <div style={{
                                              width: 6, height: 6, borderRadius: "50%",
                                              background: st.dot, flexShrink: 0,
                                            }} />
                                            {s.room.name}
                                          </div>
                                        </div>
                                      );
                                    })}
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
            ) : activeNav === "grades" ? (
              /* ── Grades page ─────────────────────────────────────────── */
              <GradesView
                enrollments={enrollments}
                enrollLoading={enrollLoading}
                displayGpa={displayGpa}
              />
            ) : (
              /* Construction skeleton — all other pages */
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
                <div style={{ textAlign: "center", padding: 40, background: "#fff", borderRadius: 20, border: "1px solid #ede9fe" }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>🚧</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#1e1b4b" }}>
                    {NAV_ITEMS.find(n => n.id === activeNav)?.label}
                  </div>
                  <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 6 }}>Connect your DRF endpoint to populate this view.</div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}