import React, { useState } from "react";
import { usePastEnrollments } from "../api";
import { getCourseColorTheme } from "../courseColors";
import type { CohortStats, GradeEntry } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function CourseCodePill({ code, size = "md" }: { code: string; size?: "sm" | "md" }) {
  const { bg, color } = getCourseColorTheme(code);
  const pad  = size === "sm" ? "1px 6px"  : "2px 7px";
  const font = size === "sm" ? 10         : 11;
  return (
    <span style={{
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: font, fontWeight: 600,
      padding: pad, borderRadius: 5,
      background: bg, color,
      display: "inline-block", flexShrink: 0,
      whiteSpace: "nowrap"
    }}>
      {code}
    </span>
  );
}

function GradeChip({ label, gp }: { label: string; gp: number }) {
  const isFail = gp === 0.0;
  const isPass = gp >= 2.0;
  return (
    <span style={{ 
      fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 6, 
      background: isFail ? "#fee2e2" : isPass ? "#d1fae5" : "#fef3c7", 
      color: isFail ? "#b91c1c" : isPass ? "#065f46" : "#b45309" 
    }}>
      {label}
    </span>
  );
}

type DistBucket = keyof CohortStats["distribution"];
const DIST_KEYS: DistBucket[] = ["A", "A-", "B+", "B", "C+", "C", "D+", "D", "F"];
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

function Skeleton({ w = "100%", h = 16, r = 8 }: { w?: string | number; h?: number; r?: number }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: "linear-gradient(90deg,#f3f0ff 25%,#e9e4ff 50%,#f3f0ff 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite linear", flexShrink: 0 }} />;
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface GradesPageProps {
  studentId: number;
  displayGpa: string;
}

export default function GradesPage({ studentId, displayGpa }: GradesPageProps) {
  const { data: enrollments, isLoading } = usePastEnrollments(studentId);
  const gradedEnrollments = enrollments?.filter((e: any) => e.final_percentage > 0) ?? [];
  
  // State to track which row is expanded (accordion)
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const toggleRow = (id: number) => {
    setExpandedRow(prev => prev === id ? null : id);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, fontFamily: "'Sora',sans-serif" }}>
      <div className="ani0">
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1e1b4b", letterSpacing: "-.4px" }}>Grades</h2>
        <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>
          {gradedEnrollments.length} graded course{gradedEnrollments.length !== 1 ? "s" : ""} · GPA {displayGpa}
        </p>
      </div>

      {isLoading && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #ede9fe", overflow: "hidden", padding: 20 }}>
          {[0,1,2,3].map(i => <div key={i} style={{ marginBottom: 16 }}><Skeleton h={40} r={8} /></div>)}
        </div>
      )}

      {!isLoading && gradedEnrollments.length === 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 320 }}>
          <div style={{ textAlign: "center", padding: 40, background: "#fff", borderRadius: 20, border: "1px solid #ede9fe" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1e1b4b" }}>No graded courses yet</div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 6 }}>Grades will appear here once your instructors submit them.</div>
          </div>
        </div>
      )}

      {!isLoading && gradedEnrollments.length > 0 && (
        <div className="ani1" style={{ background: "#fff", borderRadius: 16, border: "1px solid #ede9fe", overflow: "hidden", boxShadow: "0 4px 20px rgba(124,58,237,0.03)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#faf5ff", borderBottom: "1px solid #ede9fe" }}>
                <th style={{ padding: "12px 20px", fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: ".5px" }}>CODE</th>
                <th style={{ padding: "12px 20px", fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: ".5px" }}>COURSE TITLE</th>
                <th style={{ padding: "12px 20px", fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: ".5px", textAlign: "right" }}>FINAL %</th>
                <th style={{ padding: "12px 20px", fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: ".5px", textAlign: "center" }}>GRADE</th>
                <th style={{ padding: "12px 20px", fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: ".5px", textAlign: "right" }}>POINTS</th>
                <th style={{ padding: "12px 20px", width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {gradedEnrollments.map((enr: any) => {
                const isExpanded = expandedRow === enr.id;
                const label = gradeLabel(enr.course_grade_points);
                const pct = enr.final_percentage;
                const stats = enr.cohort_stats;
                const myBucket = bucketForGp(enr.course_grade_points);
                const maxCount = stats ? Math.max(...DIST_KEYS.map(k => stats.distribution[k]), 1) : 1;

                return (
                  <React.Fragment key={enr.id}>
                    {/* Primary Table Row */}
                    <tr 
                      onClick={() => toggleRow(enr.id)}
                      style={{ 
                        borderBottom: isExpanded ? "none" : "1px solid #f8f7ff",
                        background: isExpanded ? "#fefbff" : "transparent",
                        cursor: "pointer", transition: "background .15s"
                      }}
                      onMouseEnter={e => (!isExpanded && (e.currentTarget.style.background = "#faf5ff"))}
                      onMouseLeave={e => (!isExpanded && (e.currentTarget.style.background = "transparent"))}
                    >
                      <td style={{ padding: "14px 20px" }}>
                        <CourseCodePill code={enr.course_class.course.code} />
                      </td>
                      <td style={{ padding: "14px 20px", fontSize: 13, color: "#1e1b4b", fontWeight: 600 }}>
                        {enr.course_class.course.title}
                      </td>
                      <td style={{ padding: "14px 20px", fontSize: 13, color: "#64748b", fontWeight: 600, fontFamily: "'JetBrains Mono',monospace", textAlign: "right" }}>
                        {pct.toFixed(1)}%
                      </td>
                      <td style={{ padding: "14px 20px", textAlign: "center" }}>
                        <GradeChip label={label} gp={enr.course_grade_points} />
                      </td>
                      <td style={{ padding: "14px 20px", fontSize: 13, color: "#1e1b4b", fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", textAlign: "right" }}>
                        {enr.course_grade_points.toFixed(1)}
                      </td>
                      <td style={{ padding: "14px 20px", color: "#a78bfa", fontSize: 14, textAlign: "center" }}>
                        {isExpanded ? "▴" : "▾"}
                      </td>
                    </tr>

                    {/* Expandable Accordion Row for Stats */}
                    {isExpanded && (
                      <tr style={{ background: "#faf5ff", borderBottom: "1px solid #ede9fe" }}>
                        <td colSpan={6} style={{ padding: "0 20px 24px 20px" }}>
                          <div style={{ padding: "20px", background: "#fff", borderRadius: 12, border: "1px solid #ede9fe", boxShadow: "0 4px 12px rgba(124,58,237,0.04)" }}>
                            
                            {/* Breakdown components */}
                            {enr.grades && enr.grades.length > 0 && (
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
                                {enr.grades.map((g: any) => (
                                  <div key={g.id} style={{ fontSize: 11, padding: "5px 10px", borderRadius: 8, background: "#faf5ff", border: "1px solid #ede9fe", display: "flex", alignItems: "center", gap: 6 }}>
                                    <span style={{ fontWeight: 600, color: "#1e1b4b" }}>{g.component}</span>
                                    <span style={{ color: "#94a3b8" }}>·</span>
                                    <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "#7c3aed", fontWeight: 600 }}>{parseFloat(g.score).toFixed(1)}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Cohort Stats Widgets */}
                            {stats ? (
                              <>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 20 }}>
                                  {[
                                    { label: "Class Avg", value: stats.average.toFixed(1) + "%", icon: "◈" }, 
                                    { label: "Median", value: stats.median.toFixed(1) + "%", icon: "◎" }, 
                                    { label: "Highest", value: stats.highest.toFixed(1) + "%", icon: "▲" }, 
                                    { label: "Students", value: String(stats.total_students), icon: "◻" }
                                  ].map(stat => (
                                    <div key={stat.label} style={{ background: "#fefbff", borderRadius: 10, border: "1px solid #ede9fe", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
                                      <div style={{ fontSize: 9.5, fontWeight: 700, color: "#94a3b8", letterSpacing: ".4px", display: "flex", alignItems: "center", gap: 4 }}>
                                        <span style={{ fontSize: 8, color: "#c4b5fd" }}>{stat.icon}</span>{stat.label.toUpperCase()}
                                      </div>
                                      <div style={{ fontSize: 17, fontWeight: 700, color: "#1e1b4b", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "-.5px", lineHeight: 1 }}>{stat.value}</div>
                                    </div>
                                  ))}
                                </div>

                                {/* Grade Distribution Bar Chart */}
                                <div>
                                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: ".5px", marginBottom: 10 }}>GRADE DISTRIBUTION</div>
                                  <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 96 }}>
                                    {DIST_KEYS.map(bucket => {
                                      const count     = stats.distribution[bucket];
                                      const isMe      = bucket === myBucket;
                                      const barHeight = Math.round((count / maxCount) * 72);
                                      const colors    = DIST_COLORS[bucket];
                                      return (
                                        <div key={bucket} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, justifyContent: "flex-end", height: "100%" }}>
                                          {isMe ? <div style={{ fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 99, background: colors.active, color: "#fff", letterSpacing: ".3px", flexShrink: 0, boxShadow: `0 2px 8px ${colors.active}55` }}>YOU</div> : <div style={{ flex: 1 }} />}
                                          <div style={{ width: "100%", height: barHeight || 4, borderRadius: "5px 5px 3px 3px", background: isMe ? colors.active : colors.faded, transition: "height .6s cubic-bezier(.4,0,.2,1)", position: "relative" }}>
                                            {barHeight >= 20 && <div style={{ position: "absolute", top: 5, left: 0, right: 0, textAlign: "center", fontSize: 9, fontWeight: 700, color: isMe ? "#fff" : colors.text }}>{count}</div>}
                                          </div>
                                          <div style={{ fontSize: 10, fontWeight: 700, color: isMe ? colors.active : "#94a3b8" }}>{bucket}</div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </>
                            ) : (
                              <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic", textAlign: "center", padding: "10px 0" }}>
                                Cohort statistics not yet available for this course.
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}