import { useState, useMemo } from "react";
import { useUpcomingExams, useUpcomingAssignments } from "../api";
import type { Exam, Assignment } from "../types";
import { getCourseColorTheme } from "../courseColors";

// ─── CourseCodePill (local copy to avoid cross-file import) ──────────────────

function CourseCodePill({ code, size = "md" }: { code: string; size?: "sm" | "md" }) {
  const { bg, color } = getCourseColorTheme(code);
  return (
    <span style={{
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: size === "sm" ? 10 : 11, fontWeight: 600,
      padding: size === "sm" ? "1px 6px" : "2px 7px", borderRadius: 5,
      background: bg, color,
      display: "inline-block", flexShrink: 0,
      whiteSpace: "nowrap",
    }}>
      {code}
    </span>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = "MIDTERM" | "FINAL" | "PRACTICAL_QUIZ" | "ASSIGNMENT";

interface UnifiedEvent {
  id: string;
  category: Category;
  week: number;
  courseCode: string;
  courseTitle: string;
  typeLabel: string;
  maxLabel: string;
  raw: Exam | Assignment;
}

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<Category, {
  label: string;
  icon: string;
  accentGradient: string;
  headerBg: string;
  headerColor: string;
  tagBg: string;
  tagColor: string;
  tagBorder: string;
  chipBg: string;
}> = {
  MIDTERM: {
    label: "Midterm Exams",
    icon: "📝",
    accentGradient: "linear-gradient(135deg, #7c3aed, #6d28d9)",
    headerBg: "#faf5ff",
    headerColor: "#6d28d9",
    tagBg: "#ede9fe",
    tagColor: "#6d28d9",
    tagBorder: "#ddd6fe",
    chipBg: "#f3f0ff",
  },
  FINAL: {
    label: "Final Exams",
    icon: "🎓",
    accentGradient: "linear-gradient(135deg, #1d4ed8, #2563eb)",
    headerBg: "#eff6ff",
    headerColor: "#1d4ed8",
    tagBg: "#dbeafe",
    tagColor: "#1d4ed8",
    tagBorder: "#bfdbfe",
    chipBg: "#eff6ff",
  },
  PRACTICAL_QUIZ: {
    label: "Practicals & Quizzes",
    icon: "🔬",
    accentGradient: "linear-gradient(135deg, #059669, #10b981)",
    headerBg: "#f0fdf4",
    headerColor: "#065f46",
    tagBg: "#d1fae5",
    tagColor: "#065f46",
    tagBorder: "#a7f3d0",
    chipBg: "#f0fdf4",
  },
  ASSIGNMENT: {
    label: "Assignments",
    icon: "📋",
    accentGradient: "linear-gradient(135deg, #d97706, #f59e0b)",
    headerBg: "#fffbeb",
    headerColor: "#92400e",
    tagBg: "#fef3c7",
    tagColor: "#92400e",
    tagBorder: "#fde68a",
    chipBg: "#fffbeb",
  },
};

const EXAM_TYPE_TO_CATEGORY: Record<string, Category> = {
  MIDTERM:   "MIDTERM",
  FINAL:     "FINAL",
  PRACTICAL: "PRACTICAL_QUIZ",
  QUIZ:      "PRACTICAL_QUIZ",
};

const EXAM_TYPE_LABELS: Record<string, string> = {
  MIDTERM:   "Midterm",
  FINAL:     "Final",
  PRACTICAL: "Practical",
  QUIZ:      "Quiz",
};

const ASSIGN_TYPE_LABELS: Record<string, string> = {
  HOMEWORK: "Homework",
  PROJECT:  "Project",
  ESSAY:    "Essay",
};

// ─── Week badge ───────────────────────────────────────────────────────────────

function WeekBadge({ week, gradient }: { week: number; gradient: string }) {
  return (
    <div style={{
      width: 44, minWidth: 44, height: 48,
      borderRadius: 10,
      background: gradient,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      color: "#fff", flexShrink: 0,
      boxShadow: "0 3px 10px rgba(0,0,0,.15)",
    }}>
      <span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1, fontFamily: "'JetBrains Mono',monospace" }}>
        {week}
      </span>
      <span style={{ fontSize: 7.5, fontWeight: 600, opacity: .8, letterSpacing: ".5px", marginTop: 2 }}>
        WEEK
      </span>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

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

// ─── Category Section ─────────────────────────────────────────────────────────

function CategorySection({ category, events }: { category: Category; events: UnifiedEvent[] }) {
  const cfg = CATEGORY_CONFIG[category];

  return (
    <div style={{
      background: "#fff",
      borderRadius: 16,
      border: "1px solid #ede9fe",
      overflow: "hidden",
      boxShadow: "0 2px 12px rgba(124,58,237,.05)",
    }}>
      {/* Section header */}
      <div style={{
        padding: "14px 20px",
        background: cfg.headerBg,
        borderBottom: "1px solid #ede9fe",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: cfg.accentGradient,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 15, flexShrink: 0,
        }}>
          {cfg.icon}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: cfg.headerColor, letterSpacing: "-.2px" }}>
            {cfg.label}
          </div>
          <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1 }}>
            {events.length} item{events.length !== 1 ? "s" : ""}
          </div>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <span style={{
            fontSize: 10, fontWeight: 700,
            padding: "3px 10px", borderRadius: 99,
            background: cfg.tagBg, color: cfg.tagColor,
            border: `1px solid ${cfg.tagBorder}`,
          }}>
            {events.length} SCHEDULED
          </span>
        </div>
      </div>

      {/* Event rows */}
      <div>
        {events.map((ev, i) => {
          const isLast = i === events.length - 1;
          return (
            <div
              key={ev.id}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "14px 20px",
                borderBottom: isLast ? "none" : "1px solid #f8f7ff",
                transition: "background .1s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = cfg.chipBg)}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <WeekBadge week={ev.week} gradient={cfg.accentGradient} />

              {/* Course info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                  <CourseCodePill code={ev.courseCode} />
                  <span style={{
                    fontSize: 10.5, fontWeight: 700,
                    padding: "2px 8px", borderRadius: 5,
                    background: cfg.tagBg, color: cfg.tagColor,
                    border: `1px solid ${cfg.tagBorder}`,
                  }}>
                    {ev.typeLabel}
                  </span>
                </div>
                <div style={{
                  fontSize: 12.5, color: "#374151", fontWeight: 500,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {ev.courseTitle}
                </div>
              </div>

              {/* Max score/points */}
              <div style={{ flexShrink: 0, textAlign: "right" }}>
                <div style={{
                  fontSize: 14, fontWeight: 700,
                  color: "#1e1b4b", fontFamily: "'JetBrains Mono',monospace",
                  letterSpacing: "-.5px",
                }}>
                  {ev.maxLabel}
                </div>
                <div style={{ fontSize: 9.5, color: "#94a3b8", marginTop: 1 }}>MAX</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Summary stat card ────────────────────────────────────────────────────────

function StatCard({ label, value, color, border }: {
  label: string; value: number | string; color: string; border: string;
}) {
  return (
    <div style={{
      background: "#fff", borderRadius: 12,
      border: `1px solid ${border}`, padding: "14px 16px",
      boxShadow: "0 2px 8px rgba(124,58,237,.04)",
    }}>
      <div style={{ fontSize: 9, fontWeight: 700, color, letterSpacing: ".8px", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{
        fontSize: 26, fontWeight: 700, color: "#1e1b4b",
        letterSpacing: "-1.5px", fontFamily: "'JetBrains Mono',monospace", lineHeight: 1,
      }}>
        {value}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ExamSchedulePage({ studentId }: { studentId: number }) {
  const [activeFilter, setActiveFilter] = useState<Category | "ALL">("ALL");

  const { data: exams,       isLoading: examsLoading,  isError: examsError  } = useUpcomingExams(studentId);
  const { data: assignments, isLoading: assignLoading, isError: assignError } = useUpcomingAssignments(studentId);

  const isLoading = examsLoading || assignLoading;
  const isError   = examsError   || assignError;

  // ── Merge & classify ────────────────────────────────────────────────────────
  const unified: UnifiedEvent[] = useMemo(() => {
    const result: UnifiedEvent[] = [];

    for (const exam of exams ?? []) {
      result.push({
        id:          `exam-${exam.id}`,
        category:    EXAM_TYPE_TO_CATEGORY[exam.exam_type] ?? "PRACTICAL_QUIZ",
        week:        exam.week,
        courseCode:  exam.course_code,
        courseTitle: exam.course_title,
        typeLabel:   EXAM_TYPE_LABELS[exam.exam_type] ?? exam.exam_type,
        maxLabel:    `${parseFloat(exam.max_score).toFixed(0)} pts`,
        raw:         exam,
      });
    }

    for (const assign of assignments ?? []) {
      result.push({
        id:          `assign-${assign.id}`,
        category:    "ASSIGNMENT",
        week:        assign.due_week,
        courseCode:  assign.course_code,
        courseTitle: assign.course_title,
        typeLabel:   ASSIGN_TYPE_LABELS[assign.assignment_type] ?? assign.assignment_type,
        maxLabel:    `${parseFloat(assign.max_points).toFixed(0)} pts`,
        raw:         assign,
      });
    }

    return result.sort((a, b) => a.week - b.week);
  }, [exams, assignments]);

  // ── Group by category ────────────────────────────────────────────────────────
  const grouped = useMemo(() => {
    const map: Partial<Record<Category, UnifiedEvent[]>> = {};
    for (const ev of unified) {
      if (!map[ev.category]) map[ev.category] = [];
      map[ev.category]!.push(ev);
    }
    return map;
  }, [unified]);

  const categoryOrder: Category[] = ["MIDTERM", "FINAL", "PRACTICAL_QUIZ", "ASSIGNMENT"];
  const activeCategories = categoryOrder.filter(c => (grouped[c]?.length ?? 0) > 0);

  const displayedFiltered: Partial<Record<Category, UnifiedEvent[]>> =
    activeFilter === "ALL"
      ? grouped
      : activeFilter in grouped
        ? { [activeFilter]: grouped[activeFilter]! }
        : {};

  // ── Summary stats ────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:       unified.length,
    exams:       (grouped["MIDTERM"]?.length ?? 0) + (grouped["FINAL"]?.length ?? 0),
    practicals:  grouped["PRACTICAL_QUIZ"]?.length ?? 0,
    assignments: grouped["ASSIGNMENT"]?.length ?? 0,
  }), [unified, grouped]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, fontFamily: "'Sora',sans-serif" }}>
      <style>{`
        @keyframes shimmer { from{background-position:200% 0} to{background-position:-200% 0} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .ani0{animation:fadeUp .35s ease both}
        .ani1{animation:fadeUp .35s .07s ease both}
      `}</style>

      {/* Header */}
      <div className="ani0">
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1e1b4b", letterSpacing: "-.4px" }}>
          Exam Schedule
        </h2>
        <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>
          Active-term exams & assignments · {unified.length} total
        </p>
      </div>

      {/* Error state */}
      {isError && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 240 }}>
          <div style={{ textAlign: "center", padding: 36, background: "#fff", borderRadius: 16, border: "1px solid #fecaca" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>⚠️</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#991b1b" }}>Failed to load schedule</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Check your connection and try again.</div>
          </div>
        </div>
      )}

      {/* Skeleton */}
      {isLoading && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
            {[0,1,2,3].map(i => <Skeleton key={i} h={72} r={12} />)}
          </div>
          {[0, 1].map(i => (
            <div key={i} style={{ background: "#fff", borderRadius: 16, border: "1px solid #ede9fe", overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", background: "#faf5ff", borderBottom: "1px solid #ede9fe", display: "flex", gap: 10, alignItems: "center" }}>
                <Skeleton w={32} h={32} r={9} /><Skeleton w={120} h={14} r={6} />
              </div>
              {[0,1,2].map(j => (
                <div key={j} style={{ display: "flex", gap: 14, padding: "14px 20px", borderBottom: "1px solid #f8f7ff", alignItems: "center" }}>
                  <Skeleton w={44} h={48} r={10} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
                    <Skeleton w="30%" h={12} /><Skeleton w="55%" h={14} />
                  </div>
                  <Skeleton w={48} h={20} r={6} />
                </div>
              ))}
            </div>
          ))}
        </>
      )}

      {!isLoading && !isError && (
        <>
          {/* Summary stat strip */}
          <div className="ani0" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
            <StatCard label="TOTAL"       value={stats.total}       color="#7c3aed" border="#ede9fe" />
            <StatCard label="EXAMS"       value={stats.exams}       color="#1d4ed8" border="#bfdbfe" />
            <StatCard label="PRACTICALS"  value={stats.practicals}  color="#065f46" border="#a7f3d0" />
            <StatCard label="ASSIGNMENTS" value={stats.assignments} color="#92400e" border="#fde68a" />
          </div>

          {/* Filter pills */}
          {activeCategories.length > 1 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["ALL", ...activeCategories] as (Category | "ALL")[]).map(f => {
                const isActive = activeFilter === f;
                const cfg = f === "ALL" ? null : CATEGORY_CONFIG[f];
                return (
                  <button
                    key={f}
                    onClick={() => setActiveFilter(f)}
                    style={{
                      padding: "5px 14px", borderRadius: 99,
                      border: isActive ? "none" : "1px solid #ede9fe",
                      background: isActive ? (cfg?.tagColor ?? "#1e1b4b") : "#fff",
                      color: isActive ? "#fff" : "#64748b",
                      fontSize: 11, fontWeight: 600,
                      cursor: "pointer", fontFamily: "'Sora',sans-serif",
                      transition: "all .15s",
                      boxShadow: isActive ? "0 2px 8px rgba(0,0,0,.15)" : "none",
                    }}
                  >
                    {f === "ALL" ? "All" : CATEGORY_CONFIG[f].label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {unified.length === 0 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 280 }}>
              <div style={{ textAlign: "center", padding: 40, background: "#fff", borderRadius: 20, border: "1px solid #ede9fe" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#1e1b4b" }}>No events scheduled</div>
                <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 6 }}>
                  Exams and assignments will appear here once your instructors schedule them.
                </div>
              </div>
            </div>
          )}

          {/* Category sections */}
          <div className="ani1" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {categoryOrder.map(cat => {
              const events = displayedFiltered[cat];
              if (!events || events.length === 0) return null;
              return <CategorySection key={cat} category={cat} events={events} />;
            })}
          </div>
        </>
      )}
    </div>
  );
}