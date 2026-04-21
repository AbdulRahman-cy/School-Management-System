import { useState, useMemo } from "react";
import { useExamResults, useStudentSubmissions } from "../api";
import type { ExamResult, StudentSubmission } from "../types";

// ─── Student ID (matches rest of portal) ─────────────────────────────────────
const STUDENT_ID = 4;

// ─── Colour maps ──────────────────────────────────────────────────────────────

const EXAM_TYPE_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  MIDTERM:   { bg: "#ede9fe", color: "#6d28d9", label: "Midterm"   },
  FINAL:     { bg: "#dbeafe", color: "#1d4ed8", label: "Final"     },
  PRACTICAL: { bg: "#d1fae5", color: "#065f46", label: "Practical" },
  QUIZ:      { bg: "#fef3c7", color: "#92400e", label: "Quiz"      },
};

const ASSIGN_TYPE_STYLES: Record<string, { bg: string; color: string }> = {
  HOMEWORK: { bg: "#ede9fe", color: "#6d28d9" },
  PROJECT:  { bg: "#d1fae5", color: "#065f46" },
  ESSAY:    { bg: "#fef3c7", color: "#92400e" },
};

const STATUS_DANGER = new Set(["ABSENT", "CHEATING"]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(score: string | null, max: string): number {
  if (!score) return 0;
  const s = parseFloat(score);
  const m = parseFloat(max);
  if (!m) return 0;
  return Math.min(100, Math.round((s / m) * 100));
}

function scoreColor(p: number): string {
  if (p >= 85) return "#7c3aed";
  if (p >= 70) return "#0ea5e9";
  if (p >= 55) return "#10b981";
  if (p >= 40) return "#f59e0b";
  return "#ef4444";
}

// ─── Circular progress ring (pure SVG) ───────────────────────────────────────

function Ring({ p, size = 64 }: { p: number; size?: number }) {
  const stroke = 6;
  const r      = (size - stroke) / 2;
  const circ   = 2 * Math.PI * r;
  const dash   = (p / 100) * circ;
  const color  = scoreColor(p);
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f3f0ff" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray .8s ease" }}
      />
    </svg>
  );
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div style={{
      background: "#fff", borderRadius: 14, border: "1px solid #ede9fe",
      padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12,
    }}>
      {[["40%", 10], ["70%", 14], ["55%", 10], ["100%", 8]].map(([w, h], i) => (
        <div key={i} style={{
          width: w as string, height: h as number, borderRadius: 6,
          background: "linear-gradient(90deg,#f3f0ff 25%,#e9e4ff 50%,#f3f0ff 75%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.4s infinite linear",
        }} />
      ))}
    </div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

function ErrorState({ message }: { message: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center", minHeight: 280,
    }}>
      <div style={{
        textAlign: "center", padding: 36, background: "#fff",
        borderRadius: 16, border: "1px solid #fecaca",
      }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>⚠️</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#991b1b" }}>Failed to load</div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{message}</div>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center", minHeight: 240,
    }}>
      <div style={{
        textAlign: "center", padding: 36, background: "#fff",
        borderRadius: 16, border: "1px solid #ede9fe",
      }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1e1b4b" }}>No {label} yet</div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
          Data will appear here once your instructors record them.
        </div>
      </div>
    </div>
  );
}

// ─── Exam card ────────────────────────────────────────────────────────────────

function ExamCard({ result }: { result: ExamResult }) {
  const isDanger  = STATUS_DANGER.has(result.status);
  const isPending = result.score === null && !isDanger;
  const p         = pct(result.score, result.max_score);
  const typeStyle = EXAM_TYPE_STYLES[result.exam_type] ?? EXAM_TYPE_STYLES.QUIZ;
  const color     = isDanger ? "#ef4444" : scoreColor(p);

  return (
    <div style={{
      background: "#fff",
      borderRadius: 14,
      border: isDanger ? "1.5px solid #fecaca" : "1px solid #ede9fe",
      overflow: "hidden",
      boxShadow: isDanger
        ? "0 4px 16px rgba(239,68,68,.1)"
        : "0 2px 10px rgba(124,58,237,.04)",
      position: "relative",
      transition: "transform .15s, box-shadow .15s",
    }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = isDanger
          ? "0 8px 24px rgba(239,68,68,.14)"
          : "0 8px 24px rgba(124,58,237,.1)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = "";
        (e.currentTarget as HTMLDivElement).style.boxShadow = isDanger
          ? "0 4px 16px rgba(239,68,68,.1)"
          : "0 2px 10px rgba(124,58,237,.04)";
      }}
    >
      {/* Accent stripe */}
      <div style={{
        height: 4,
        background: isDanger
          ? "linear-gradient(90deg,#ef4444,#f87171)"
          : `linear-gradient(90deg,${color},${color}88)`,
      }} />

      <div style={{ padding: "16px 18px" }}>
        {/* Header row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: 11, fontWeight: 600,
              color: "#7c3aed", background: "#f3f0ff",
              padding: "2px 7px", borderRadius: 5,
              display: "inline-block", marginBottom: 5,
            }}>
              {result.course_code}
            </span>
            <div style={{
              fontSize: 13, fontWeight: 700, color: "#1e1b4b",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {result.course_title}
            </div>
          </div>

          {/* Ring or danger icon */}
          <div style={{ flexShrink: 0, marginLeft: 12, position: "relative" }}>
            {isDanger ? (
              <div style={{
                width: 56, height: 56, borderRadius: "50%",
                background: "#fee2e2",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22,
              }}>
                {result.status === "CHEATING" ? "🚫" : "❌"}
              </div>
            ) : isPending ? (
              <div style={{
                width: 56, height: 56, borderRadius: "50%",
                background: "#faf5ff", border: "2px dashed #ddd6fe",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18,
              }}>
                ⏳
              </div>
            ) : (
              <div style={{ position: "relative", width: 64, height: 64 }}>
                <Ring p={p} size={64} />
                <div style={{
                  position: "absolute", inset: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, color,
                  fontFamily: "'JetBrains Mono',monospace",
                }}>
                  {p}%
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Exam type + week */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{
            fontSize: 10, fontWeight: 700,
            padding: "2px 8px", borderRadius: 99,
            background: typeStyle.bg, color: typeStyle.color,
          }}>
            {typeStyle.label}
          </span>
          <span style={{ fontSize: 10, color: "#94a3b8" }}>Week {result.exam_week}</span>
        </div>

        {/* Score row */}
        {isDanger ? (
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 10px", borderRadius: 8,
            background: "#fee2e2",
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#991b1b" }}>
              {result.status === "CHEATING" ? "Disqualified" : "Absent"}
            </span>
          </div>
        ) : isPending ? (
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 10px", borderRadius: 8,
            background: "#faf5ff", border: "1px solid #ede9fe",
          }}>
            <span style={{
              fontSize: 10, fontWeight: 700, color: "#a78bfa",
              animation: "pulse 2s ease infinite",
            }}>
              ● PENDING GRADE
            </span>
          </div>
        ) : (
          <div>
            {/* Progress bar */}
            <div style={{ height: 6, background: "#f3f0ff", borderRadius: 99, marginBottom: 6 }}>
              <div style={{
                width: `${p}%`, height: "100%",
                background: color, borderRadius: 99,
                transition: "width 1s ease",
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{
                fontSize: 13, fontWeight: 700, color,
                fontFamily: "'JetBrains Mono',monospace",
              }}>
                {parseFloat(result.score!).toFixed(1)}
                <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 400 }}>
                  /{parseFloat(result.max_score).toFixed(0)}
                </span>
              </span>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>
                {result.status === "EXCUSED" ? "Excused" : ""}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Assignment group ─────────────────────────────────────────────────────────

function AssignmentGroup({ courseCode, courseTitle, items }: {
  courseCode: string;
  courseTitle: string;
  items: StudentSubmission[];
}) {
  return (
    <div style={{
      background: "#fff", borderRadius: 14,
      border: "1px solid #ede9fe", overflow: "hidden",
      boxShadow: "0 2px 10px rgba(124,58,237,.04)",
    }}>
      {/* Course header */}
      <div style={{
        padding: "14px 18px", borderBottom: "1px solid #f3f0ff",
        display: "flex", alignItems: "center", gap: 10,
        background: "#faf5ff",
      }}>
        <span style={{
          fontFamily: "'JetBrains Mono',monospace",
          fontSize: 11, fontWeight: 600,
          color: "#7c3aed", background: "#ede9fe",
          padding: "2px 7px", borderRadius: 5,
        }}>
          {courseCode}
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#1e1b4b" }}>{courseTitle}</span>
      </div>

      {/* Assignment rows */}
      {items.map((sub, i) => {
        const typeStyle = ASSIGN_TYPE_STYLES[sub.assignment_type] ?? ASSIGN_TYPE_STYLES.HOMEWORK;
        const isPending = sub.score === null;
        const p         = pct(sub.score, sub.max_points);
        const color     = scoreColor(p);

        return (
          <div key={sub.id} style={{
            padding: "14px 18px",
            borderBottom: i < items.length - 1 ? "1px solid #f8f7ff" : "none",
            display: "flex", alignItems: "center", gap: 14,
            borderLeft: sub.is_late ? "3px solid #f59e0b" : "3px solid transparent",
            transition: "background .1s",
          }}
            onMouseEnter={e => (e.currentTarget.style.background = "#faf5ff")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            {/* Type badge */}
            <span style={{
              fontSize: 9.5, fontWeight: 700,
              padding: "3px 9px", borderRadius: 99, flexShrink: 0,
              background: typeStyle.bg, color: typeStyle.color,
            }}>
              {sub.assignment_type}
            </span>

            {/* Due week */}
            <span style={{
              fontSize: 11, color: "#94a3b8", flexShrink: 0,
              fontFamily: "'JetBrains Mono',monospace",
            }}>
              W{sub.due_week}
            </span>

            {/* Score / pending / late */}
            <div style={{ flex: 1 }}>
              {isPending ? (
                <span style={{
                  fontSize: 10, fontWeight: 700, color: "#a78bfa",
                  display: "flex", alignItems: "center", gap: 5,
                }}>
                  <span style={{ animation: "pulse 2s ease infinite" }}>●</span>
                  PENDING
                </span>
              ) : (
                <div>
                  <div style={{ height: 4, background: "#f3f0ff", borderRadius: 99, marginBottom: 4 }}>
                    <div style={{
                      width: `${p}%`, height: "100%",
                      background: color, borderRadius: 99,
                      transition: "width 1s ease",
                    }} />
                  </div>
                  <span style={{
                    fontSize: 12, fontWeight: 700, color,
                    fontFamily: "'JetBrains Mono',monospace",
                  }}>
                    {parseFloat(sub.score!).toFixed(1)}
                    <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 400 }}>
                      /{parseFloat(sub.max_points).toFixed(0)}
                    </span>
                  </span>
                </div>
              )}
            </div>

            {/* Late badge */}
            {sub.is_late && (
              <span style={{
                fontSize: 9.5, fontWeight: 700, flexShrink: 0,
                padding: "3px 8px", borderRadius: 99,
                background: "#fef3c7", color: "#92400e",
                border: "1px solid #fde68a",
                display: "flex", alignItems: "center", gap: 4,
              }}>
                ⚠ LATE
              </span>
            )}

            {/* Submitted at */}
            <span style={{
              fontSize: 10, color: "#94a3b8", flexShrink: 0,
              fontFamily: "'JetBrains Mono',monospace",
            }}>
              {new Date(sub.submitted_at).toLocaleDateString("en-GB", {
                day: "numeric", month: "short",
              })}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CourseworkDashboard() {
  const [activeTab, setActiveTab] = useState<"exams" | "assignments">("exams");

  const {
    data: examResults,
    isLoading: examsLoading,
    isError: examsError,
    error: examsErrorObj,
  } = useExamResults(STUDENT_ID);

  const {
    data: submissions,
    isLoading: subsLoading,
    isError: subsError,
    error: subsErrorObj,
  } = useStudentSubmissions(STUDENT_ID);

  // ── Derived: group submissions by course ──────────────────────────────────
  const submissionsByCourse = useMemo(() => {
    if (!submissions) return [];
    const map = new Map<string, { courseTitle: string; items: StudentSubmission[] }>();
    for (const sub of submissions) {
      if (!map.has(sub.course_code)) {
        map.set(sub.course_code, { courseTitle: sub.course_title, items: [] });
      }
      map.get(sub.course_code)!.items.push(sub);
    }
    return Array.from(map.entries()).map(([code, val]) => ({
      courseCode: code,
      courseTitle: val.courseTitle,
      items: val.items,
    }));
  }, [submissions]);

  // ── Summary stats ─────────────────────────────────────────────────────────
  const examStats = useMemo(() => {
    if (!examResults) return null;
    const graded  = examResults.filter(e => e.score !== null && !STATUS_DANGER.has(e.status));
    const pending = examResults.filter(e => e.score === null && !STATUS_DANGER.has(e.status));
    const danger  = examResults.filter(e => STATUS_DANGER.has(e.status));
    const avgPct  = graded.length
      ? Math.round(graded.reduce((sum, e) => sum + pct(e.score, e.max_score), 0) / graded.length)
      : null;
    return { total: examResults.length, graded: graded.length, pending: pending.length, danger: danger.length, avgPct };
  }, [examResults]);

  const assignStats = useMemo(() => {
    if (!submissions) return null;
    const graded  = submissions.filter(s => s.score !== null);
    const pending = submissions.filter(s => s.score === null);
    const late    = submissions.filter(s => s.is_late);
    return { total: submissions.length, graded: graded.length, pending: pending.length, late: late.length };
  }, [submissions]);

  const isLoading = activeTab === "exams" ? examsLoading : subsLoading;
  const isError   = activeTab === "exams" ? examsError  : subsError;
  const errorMsg  = activeTab === "exams"
    ? (examsErrorObj as Error)?.message
    : (subsErrorObj as Error)?.message;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, fontFamily: "'Sora',sans-serif" }}>
      <style>{`
        @keyframes shimmer { from{background-position:200% 0} to{background-position:-200% 0} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.4} }
      `}</style>

      {/* Page header */}
      <div className="ani0">
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1e1b4b", letterSpacing: "-.4px" }}>
          Coursework
        </h2>
        <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>
          Exams and assignments this term
        </p>
      </div>

      {/* Tab toggle */}
      <div style={{ display: "flex", gap: 4, background: "#faf5ff", borderRadius: 11, padding: 4, width: "fit-content", border: "1px solid #ede9fe" }}>
        {(["exams", "assignments"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: "6px 20px", borderRadius: 8, border: "none",
            cursor: "pointer", fontSize: 12, fontWeight: 600,
            fontFamily: "'Sora',sans-serif", textTransform: "capitalize",
            background: activeTab === tab ? "#7c3aed" : "transparent",
            color: activeTab === tab ? "#fff" : "#94a3b8",
            boxShadow: activeTab === tab ? "0 2px 8px rgba(124,58,237,.25)" : "none",
            transition: "all .15s",
          }}>
            {tab}
          </button>
        ))}
      </div>

      {/* ── Exams tab ─────────────────────────────────────────────────────── */}
      {activeTab === "exams" && (
        <>
          {/* Stats row */}
          {examStats && !examsLoading && (
            <div className="ani0" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
              {[
                { label: "TOTAL",   value: examStats.total,   color: "#7c3aed", border: "#ede9fe" },
                { label: "GRADED",  value: examStats.graded,  color: "#10b981", border: "#bbf7d0" },
                { label: "PENDING", value: examStats.pending, color: "#a78bfa", border: "#ede9fe" },
                { label: "AVG SCORE", value: examStats.avgPct !== null ? `${examStats.avgPct}%` : "—", color: "#0ea5e9", border: "#bae6fd" },
              ].map(s => (
                <div key={s.label} style={{
                  background: "#fff", borderRadius: 12,
                  border: `1px solid ${s.border}`, padding: "14px 16px",
                  boxShadow: "0 2px 8px rgba(124,58,237,.04)",
                }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: s.color, letterSpacing: ".8px", marginBottom: 5 }}>{s.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#1e1b4b", letterSpacing: "-1px", fontFamily: "'JetBrains Mono',monospace", lineHeight: 1 }}>{s.value}</div>
                </div>
              ))}
            </div>
          )}

          {isError && <ErrorState message={errorMsg ?? "Unknown error"} />}

          {examsLoading && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 14 }}>
              {[0,1,2,3,4,5].map(i => <SkeletonCard key={i} />)}
            </div>
          )}

          {!examsLoading && !isError && examResults?.length === 0 && (
            <EmptyState label="exam results" />
          )}

          {!examsLoading && !isError && (examResults?.length ?? 0) > 0 && (
            <div className="ani1" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 14 }}>
              {examResults!.map(result => (
                <ExamCard key={result.id} result={result} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Assignments tab ───────────────────────────────────────────────── */}
      {activeTab === "assignments" && (
        <>
          {/* Stats row */}
          {assignStats && !subsLoading && (
            <div className="ani0" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
              {[
                { label: "TOTAL",   value: assignStats.total,   color: "#7c3aed", border: "#ede9fe" },
                { label: "GRADED",  value: assignStats.graded,  color: "#10b981", border: "#bbf7d0" },
                { label: "PENDING", value: assignStats.pending, color: "#a78bfa", border: "#ede9fe" },
                { label: "LATE",    value: assignStats.late,    color: "#f59e0b", border: "#fde68a" },
              ].map(s => (
                <div key={s.label} style={{
                  background: "#fff", borderRadius: 12,
                  border: `1px solid ${s.border}`, padding: "14px 16px",
                  boxShadow: "0 2px 8px rgba(124,58,237,.04)",
                }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: s.color, letterSpacing: ".8px", marginBottom: 5 }}>{s.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#1e1b4b", letterSpacing: "-1px", fontFamily: "'JetBrains Mono',monospace", lineHeight: 1 }}>{s.value}</div>
                </div>
              ))}
            </div>
          )}

          {isError && <ErrorState message={errorMsg ?? "Unknown error"} />}

          {subsLoading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[0,1,2].map(i => <SkeletonCard key={i} />)}
            </div>
          )}

          {!subsLoading && !isError && submissions?.length === 0 && (
            <EmptyState label="assignments" />
          )}

          {!subsLoading && !isError && (submissions?.length ?? 0) > 0 && (
            <div className="ani1" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {submissionsByCourse.map(group => (
                <AssignmentGroup
                  key={group.courseCode}
                  courseCode={group.courseCode}
                  courseTitle={group.courseTitle}
                  items={group.items}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}