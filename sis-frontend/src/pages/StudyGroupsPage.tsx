import React, { useState } from "react";
import type { ProgramType } from "../types";
import { getCourseColorTheme } from "../courseColors";

// ─── Domain types ──────────────────────────────────────────────────────────────

interface UIDiscipline {
  id: number;
  name: string;
  code: string;          // e.g. "CSE" — used to pull a color theme
  program_type: ProgramType;
}

interface UITerm {
  id: number;
  name: string;
}

interface UIStudyGroupSlot {
  letter: string;   // "A", "B", "C" …
  capacity: number;
}

interface UICourse {
  code: string;
  title: string;
}

interface UICohort {
  id: number;
  discipline: UIDiscipline;
  term: UITerm;
  year_level: number;
  groups: UIStudyGroupSlot[];
  courses: UICourse[];
}

// ─── Static look-up tables ────────────────────────────────────────────────────

const DISCIPLINES: UIDiscipline[] = [
  { id: 1, name: "Computer & Communication Engineering", code: "CSE", program_type: "SSP" },
  { id: 2, name: "Biomedical Engineering",               code: "BME", program_type: "SSP" },
  { id: 3, name: "Electrical Engineering",               code: "EEC", program_type: "GSP" },
  { id: 4, name: "Mechanical Engineering",               code: "MEC", program_type: "GSP" },
  { id: 5, name: "Mathematics & Statistics",             code: "MATH", program_type: "SSP" },
];

const TERMS: UITerm[] = [
  { id: 1, name: "Fall 2026"   },
  { id: 2, name: "Spring 2027" },
  { id: 3, name: "Fall 2027"   },
];

const COURSE_POOL: UICourse[] = [
  { code: "CSE 101", title: "Intro to Computer Science"  },
  { code: "CSE 201", title: "Data Structures"            },
  { code: "CSE 301", title: "Algorithms"                 },
  { code: "MATH 101", title: "Calculus I"                },
  { code: "MATH 201", title: "Calculus II"               },
  { code: "EMP 101", title: "Engineering Mathematics"    },
  { code: "BME 201", title: "Bioinstrumentation"         },
  { code: "EEC 101", title: "Circuit Analysis"           },
  { code: "MEC 101", title: "Statics & Dynamics"         },
  { code: "PHY 101", title: "Physics I"                  },
  { code: "HUM 101", title: "Technical Writing"          },
  { code: "DB 201",  title: "Database Systems"           },
];

// ─── Mock cohort data ─────────────────────────────────────────────────────────

const INITIAL_COHORTS: UICohort[] = [
  {
    id: 1,
    discipline: DISCIPLINES[0],
    term: TERMS[0],
    year_level: 1,
    groups: [
      { letter: "A", capacity: 50 },
      { letter: "B", capacity: 50 },
      { letter: "C", capacity: 50 },
    ],
    courses: [
      { code: "CSE 101", title: "Intro to Computer Science" },
      { code: "MATH 101", title: "Calculus I" },
      { code: "EMP 101", title: "Engineering Mathematics" },
      { code: "PHY 101", title: "Physics I" },
    ],
  },
  {
    id: 2,
    discipline: DISCIPLINES[0],
    term: TERMS[0],
    year_level: 2,
    groups: [
      { letter: "A", capacity: 45 },
      { letter: "B", capacity: 45 },
    ],
    courses: [
      { code: "CSE 201", title: "Data Structures" },
      { code: "MATH 201", title: "Calculus II" },
      { code: "DB 201",   title: "Database Systems" },
    ],
  },
  {
    id: 3,
    discipline: DISCIPLINES[1],
    term: TERMS[0],
    year_level: 1,
    groups: [
      { letter: "A", capacity: 40 },
      { letter: "B", capacity: 40 },
    ],
    courses: [
      { code: "BME 201", title: "Bioinstrumentation" },
      { code: "EMP 101", title: "Engineering Mathematics" },
      { code: "PHY 101", title: "Physics I" },
    ],
  },
  {
    id: 4,
    discipline: DISCIPLINES[2],
    term: TERMS[1],
    year_level: 2,
    groups: [
      { letter: "A", capacity: 50 },
      { letter: "B", capacity: 50 },
      { letter: "C", capacity: 50 },
    ],
    courses: [
      { code: "EEC 101", title: "Circuit Analysis" },
      { code: "MATH 201", title: "Calculus II" },
    ],
  },
  {
    id: 5,
    discipline: DISCIPLINES[3],
    term: TERMS[1],
    year_level: 3,
    groups: [
      { letter: "A", capacity: 35 },
    ],
    courses: [
      { code: "MEC 101", title: "Statics & Dynamics" },
      { code: "MATH 201", title: "Calculus II" },
    ],
  },
  {
    id: 6,
    discipline: DISCIPLINES[4],
    term: TERMS[2],
    year_level: 1,
    groups: [
      { letter: "A", capacity: 50 },
      { letter: "B", capacity: 50 },
    ],
    courses: [
      { code: "MATH 101", title: "Calculus I" },
      { code: "HUM 101",  title: "Technical Writing" },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function yearOrdinal(n: number): string {
  const map: Record<number, string> = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th" };
  return map[n] ?? `${n}th`;
}

const PROGRAM_BADGE: Record<ProgramType, { bg: string; color: string; border: string }> = {
  GSP: { bg: "#ede9fe", color: "#6d28d9", border: "#ddd6fe" },
  SSP: { bg: "#d1fae5", color: "#065f46", border: "#a7f3d0" },
};

/** Pull a rich color theme from courseColors.ts based on the discipline code. */
function disciplineTheme(code: string) {
  return getCourseColorTheme(code);
}

// ─── CourseCodePill ───────────────────────────────────────────────────────────

function CourseCodePill({ code }: { code: string }) {
  const { bg, color } = getCourseColorTheme(code);
  return (
    <span style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 10, fontWeight: 700,
      padding: "2px 8px", borderRadius: 5,
      background: bg, color,
      display: "inline-block", flexShrink: 0,
      border: `1px solid ${color}22`,
    }}>
      {code}
    </span>
  );
}

// ─── CohortCard ───────────────────────────────────────────────────────────────

function CohortCard({ cohort, onOpen }: { cohort: UICohort; onOpen: () => void }) {
  const [hovered, setHovered] = useState(false);
  const theme    = disciplineTheme(cohort.discipline.code);
  const progBadge = PROGRAM_BADGE[cohort.discipline.program_type];
  const totalCap  = cohort.groups.reduce((s, g) => s + g.capacity, 0);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onOpen}
      style={{
        display: "flex",
        flexDirection: "column",
        background: "#fff",
        borderRadius: 18,
        border: `1.5px solid ${hovered ? theme.color + "55" : theme.bg}`,
        overflow: "hidden",
        boxShadow: hovered
          ? `0 20px 52px ${theme.color}22`
          : `0 4px 18px ${theme.color}0d`,
        transition: "box-shadow .22s ease, border-color .22s ease, transform .22s ease",
        transform: hovered ? "translateY(-5px)" : "translateY(0)",
        cursor: "pointer",
      }}
    >
      {/* ── Coloured band */}
      <div style={{
        minHeight: 120,
        background: `linear-gradient(135deg, ${theme.bg} 0%, ${theme.color}18 100%)`,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        padding: "13px 14px",
        flexShrink: 0,
        position: "relative",
      }}>
        {/* Program badge — top-left */}
        <span style={{
          fontSize: 9.5, fontWeight: 800, letterSpacing: ".7px",
          padding: "3px 10px", borderRadius: 99,
          background: progBadge.bg, color: progBadge.color,
          border: `1px solid ${progBadge.border}`,
          fontFamily: "'Sora',sans-serif", textTransform: "uppercase",
          flexShrink: 0,
        }}>
          {cohort.discipline.program_type}
        </span>

        {/* Discipline — top-right */}
        <span style={{
          fontSize: 9.5, fontWeight: 600, letterSpacing: ".2px",
          padding: "3px 10px", borderRadius: 99,
          background: "rgba(255,255,255,0.9)",
          color: "#1e1b4b",
          border: "1px solid #ede9fe",
          fontFamily: "'Sora',sans-serif",
          maxWidth: 160, overflow: "hidden",
          textOverflow: "ellipsis", whiteSpace: "nowrap",
          flexShrink: 0,
        }}>
          {cohort.discipline.name}
        </span>

        {/* Watermark code */}
        <div style={{
          position: "absolute", bottom: 10, left: 16,
          fontSize: 30, fontWeight: 800,
          fontFamily: "'JetBrains Mono',monospace",
          color: theme.color, opacity: 0.13,
          letterSpacing: "-1px", userSelect: "none",
        }}>
          {cohort.discipline.code}
        </div>
      </div>

      {/* ── Body */}
      <div style={{ padding: "16px 18px", flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>

        {/* Title */}
        <h3 style={{
          fontSize: 17, fontWeight: 700, color: "#1e1b4b",
          letterSpacing: "-.35px", margin: 0,
          fontFamily: "'Sora',sans-serif",
        }}>
          Year {cohort.year_level} &mdash; {cohort.term.name}
        </h3>

        {/* Stat block */}
        <div style={{
          display: "flex", alignItems: "stretch", gap: 0,
          background: theme.bg, borderRadius: 10,
          border: `1px solid ${theme.color}22`, overflow: "hidden",
          marginTop: 4,
        }}>
          <div style={{ flex: 1, padding: "10px 14px" }}>
            <div style={{
              fontSize: 8.5, fontWeight: 700, letterSpacing: ".7px",
              color: theme.color, textTransform: "uppercase", marginBottom: 3,
              opacity: 0.8,
            }}>
              No. of groups
            </div>
            <div style={{
              fontSize: 24, fontWeight: 800, color: "#1e1b4b",
              fontFamily: "'JetBrains Mono',monospace", letterSpacing: "-1px", lineHeight: 1,
            }}>
              {cohort.groups.length}
            </div>
          </div>
          <div style={{ width: 1, background: `${theme.color}22`, flexShrink: 0 }} />
          <div style={{ flex: 1, padding: "10px 14px" }}>
            <div style={{
              fontSize: 8.5, fontWeight: 700, letterSpacing: ".7px",
              color: theme.color, textTransform: "uppercase", marginBottom: 3,
              opacity: 0.8,
            }}>
              Total capacity
            </div>
            <div style={{
              fontSize: 24, fontWeight: 800, color: "#1e1b4b",
              fontFamily: "'JetBrains Mono',monospace", letterSpacing: "-1px", lineHeight: 1,
            }}>
              {totalCap}
              <span style={{ fontSize: 11, fontWeight: 500, color: "#94a3b8", marginLeft: 4, fontFamily: "'Sora',sans-serif" }}>
                students
              </span>
            </div>
          </div>
        </div>

        {/* Courses preview */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 4 }}>
          {cohort.courses.slice(0, 4).map(c => (
            <CourseCodePill key={c.code} code={c.code} />
          ))}
          {cohort.courses.length > 4 && (
            <span style={{
              fontSize: 9.5, fontWeight: 600, padding: "2px 8px", borderRadius: 5,
              background: "#f3f4f6", color: "#6b7280",
            }}>
              +{cohort.courses.length - 4} more
            </span>
          )}
        </div>
      </div>

      {/* ── Action */}
      <div style={{ padding: "12px 18px 18px" }}>
        <button
          onClick={e => { e.stopPropagation(); onOpen(); }}
          style={{
            width: "100%", padding: "11px 0", borderRadius: 10, border: "none",
            background: hovered
              ? `linear-gradient(135deg, ${theme.color}, ${theme.dot})`
              : `linear-gradient(135deg, ${theme.dot}, ${theme.color})`,
            color: "#fff",
            fontFamily: "'Sora',sans-serif", fontSize: 13, fontWeight: 700,
            cursor: "pointer", letterSpacing: ".2px", transition: "background .2s ease",
            boxShadow: hovered
              ? `0 8px 24px ${theme.color}50`
              : `0 2px 8px ${theme.color}30`,
          }}
        >
          View Cohort Details →
        </button>
      </div>
    </div>
  );
}

// ─── CohortDetailModal ────────────────────────────────────────────────────────

function CohortDetailModal({ cohort, onClose, onAddCourse }: {
  cohort: UICohort;
  onClose: () => void;
  onAddCourse: (cohortId: number, course: UICourse) => void;
}) {
  const theme = disciplineTheme(cohort.discipline.code);
  const progBadge = PROGRAM_BADGE[cohort.discipline.program_type];
  const [addingCourse, setAddingCourse] = useState(false);
  const [selectedCode, setSelectedCode] = useState("");

  const assignedCodes = new Set(cohort.courses.map(c => c.code));
  const recommended = COURSE_POOL.filter(c => !assignedCodes.has(c.code));

  function handleAddCourse() {
    const course = COURSE_POOL.find(c => c.code === selectedCode);
    if (course) {
      onAddCourse(cohort.id, course);
      setAddingCourse(false);
      setSelectedCode("");
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: 9,
    border: "1.5px solid #ede9fe", background: "#faf5ff",
    fontSize: 13, color: "#1e1b4b", fontFamily: "'Sora',sans-serif",
    outline: "none", boxSizing: "border-box",
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(15,10,30,0.55)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: "100%", maxWidth: 620,
        background: "#fff", borderRadius: 20,
        boxShadow: "0 32px 80px rgba(100,50,255,0.18)",
        border: `1.5px solid ${theme.color}22`,
        overflow: "hidden",
        animation: "fadeUp .25s ease both",
        maxHeight: "90vh",
        display: "flex", flexDirection: "column",
      }}>
        {/* Header band */}
        <div style={{
          background: `linear-gradient(135deg, ${theme.bg} 0%, ${theme.color}18 100%)`,
          padding: "20px 24px 18px",
          borderBottom: `1px solid ${theme.color}22`,
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                <span style={{
                  fontSize: 9.5, fontWeight: 800, letterSpacing: ".7px", padding: "3px 10px",
                  borderRadius: 99, background: progBadge.bg, color: progBadge.color,
                  border: `1px solid ${progBadge.border}`, textTransform: "uppercase",
                }}>
                  {cohort.discipline.program_type}
                </span>
                <span style={{
                  fontSize: 9.5, fontWeight: 600, padding: "3px 10px",
                  borderRadius: 99, background: "rgba(255,255,255,0.9)", color: "#1e1b4b",
                  border: "1px solid #ede9fe",
                }}>
                  {cohort.discipline.name}
                </span>
              </div>
              <h2 style={{
                fontSize: 19, fontWeight: 700, color: "#1e1b4b",
                letterSpacing: "-.4px", margin: 0,
              }}>
                Year {cohort.year_level} — {cohort.term.name}
              </h2>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                {cohort.groups.length} groups · {cohort.groups.reduce((s, g) => s + g.capacity, 0)} total capacity
              </div>
            </div>
            <button onClick={onClose} style={{
              width: 32, height: 32, borderRadius: 9,
              border: `1px solid ${theme.color}33`,
              background: "rgba(255,255,255,0.8)", cursor: "pointer",
              color: "#64748b", fontSize: 15,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>✕</button>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ overflowY: "auto", flex: 1, padding: "22px 24px 24px", display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Study Groups section */}
          <section>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: "#94a3b8", letterSpacing: ".8px", textTransform: "uppercase", marginBottom: 12 }}>
              Study Groups
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {cohort.groups.map(g => (
                <div key={g.letter} style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  padding: "12px 18px", borderRadius: 12,
                  background: theme.bg,
                  border: `1.5px solid ${theme.color}33`,
                  minWidth: 90,
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: `linear-gradient(135deg, ${theme.dot}, ${theme.color})`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontSize: 14, fontWeight: 800,
                    fontFamily: "'JetBrains Mono',monospace",
                    boxShadow: `0 4px 12px ${theme.color}40`,
                    marginBottom: 8,
                  }}>
                    {g.letter}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#1e1b4b" }}>Grp {g.letter}</div>
                  <div style={{
                    fontSize: 9.5, color: theme.color, fontWeight: 600, marginTop: 3,
                    fontFamily: "'JetBrains Mono',monospace",
                  }}>
                    cap: {g.capacity}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Course Classes section */}
          <section>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "#94a3b8", letterSpacing: ".8px", textTransform: "uppercase" }}>
                Course Classes
              </div>
              {!addingCourse && (
                <button
                  onClick={() => setAddingCourse(true)}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "5px 12px", borderRadius: 8, border: "none",
                    background: `linear-gradient(135deg, ${theme.dot}, ${theme.color})`,
                    color: "#fff", fontSize: 11.5, fontWeight: 700,
                    cursor: "pointer", fontFamily: "'Sora',sans-serif",
                    boxShadow: `0 2px 8px ${theme.color}30`,
                  }}
                >
                  <span style={{ fontSize: 14 }}>+</span> Add Course Class
                </button>
              )}
            </div>

            {addingCourse && (
              <div style={{
                display: "flex", gap: 8, marginBottom: 12, alignItems: "stretch",
                background: theme.bg, borderRadius: 10, padding: "10px 12px",
                border: `1px solid ${theme.color}22`,
              }}>
                <select
                  value={selectedCode}
                  onChange={e => setSelectedCode(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                >
                  <option value="">— Select a course —</option>
                  {recommended.map(c => (
                    <option key={c.code} value={c.code}>{c.code} · {c.title}</option>
                  ))}
                </select>
                <button
                  disabled={!selectedCode}
                  onClick={handleAddCourse}
                  style={{
                    padding: "9px 16px", borderRadius: 9, border: "none",
                    background: selectedCode
                      ? `linear-gradient(135deg, ${theme.dot}, ${theme.color})`
                      : "#e5e7eb",
                    color: selectedCode ? "#fff" : "#9ca3af",
                    fontWeight: 700, fontSize: 12.5, cursor: selectedCode ? "pointer" : "not-allowed",
                    fontFamily: "'Sora',sans-serif",
                  }}
                >
                  Assign
                </button>
                <button
                  onClick={() => { setAddingCourse(false); setSelectedCode(""); }}
                  style={{
                    padding: "9px 14px", borderRadius: 9,
                    border: "1px solid #ede9fe", background: "#fff",
                    color: "#64748b", fontSize: 12.5, cursor: "pointer",
                    fontFamily: "'Sora',sans-serif", fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {cohort.courses.map(c => (
                <div key={c.code} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 14px", borderRadius: 10,
                  background: "#faf5ff", border: "1px solid #ede9fe",
                }}>
                  <CourseCodePill code={c.code} />
                  <span style={{ fontSize: 12.5, color: "#374151", fontWeight: 500, flex: 1 }}>{c.title}</span>
                </div>
              ))}
              {cohort.courses.length === 0 && (
                <div style={{ fontSize: 12, color: "#94a3b8", padding: "12px 0", textAlign: "center" }}>
                  No courses assigned yet.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// ─── NewCohortModal (multi-step) ──────────────────────────────────────────────

interface NewCohortForm {
  disciplineId: number;
  termId: number;
  year_level: number;
  numGroups: number;
  groupCapacity: number;
  selectedCourseCodes: Set<string>;
}

function NewCohortModal({ onClose, onSubmit, nextId }: {
  onClose: () => void;
  onSubmit: (c: UICohort) => void;
  nextId: number;
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<NewCohortForm>({
    disciplineId: DISCIPLINES[0].id,
    termId: TERMS[0].id,
    year_level: 1,
    numGroups: 3,
    groupCapacity: 50,
    selectedCourseCodes: new Set(),
  });

  const STEPS = ["Cohort Metadata", "Study Groups", "Course Assignment"];

  function toggleCourse(code: string) {
    setForm(f => {
      const next = new Set(f.selectedCourseCodes);
      if (next.has(code)) next.delete(code); else next.add(code);
      return { ...f, selectedCourseCodes: next };
    });
  }

  function handleSubmit() {
    const discipline = DISCIPLINES.find(d => d.id === form.disciplineId)!;
    const term       = TERMS.find(t => t.id === form.termId)!;
    const letters    = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".slice(0, form.numGroups).split("");
    const groups     = letters.map(l => ({ letter: l, capacity: form.groupCapacity }));
    const courses    = COURSE_POOL.filter(c => form.selectedCourseCodes.has(c.code));
    onSubmit({ id: nextId, discipline, term, year_level: form.year_level, groups, courses });
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: 9,
    border: "1.5px solid #ede9fe", background: "#faf5ff",
    fontSize: 13, color: "#1e1b4b", fontFamily: "'Sora',sans-serif",
    outline: "none", boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 10.5, fontWeight: 700, color: "#64748b",
    letterSpacing: ".4px", textTransform: "uppercase",
    marginBottom: 5, display: "block",
  };

  // Preview generated groups
  const previewLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".slice(0, Math.max(0, Math.min(form.numGroups, 26))).split("");

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(15,10,30,0.55)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: "100%", maxWidth: 540,
        background: "#fff", borderRadius: 20,
        boxShadow: "0 32px 80px rgba(100,50,255,0.18)",
        border: "1px solid rgba(124,58,237,0.12)",
        overflow: "hidden", animation: "fadeUp .25s ease both",
        maxHeight: "92vh", display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f0eeff", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1e1b4b", margin: 0 }}>New Cohort</h2>
              <p style={{ fontSize: 11.5, color: "#94a3b8", margin: "4px 0 0" }}>
                Step {step + 1} of {STEPS.length} — {STEPS[step]}
              </p>
            </div>
            <button onClick={onClose} style={{
              width: 30, height: 30, borderRadius: 8,
              border: "1px solid #ede9fe", background: "#faf5ff",
              cursor: "pointer", color: "#94a3b8", fontSize: 14,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>✕</button>
          </div>

          {/* Step pills */}
          <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
            {STEPS.map((s, i) => (
              <div key={s} style={{
                flex: 1, height: 4, borderRadius: 99,
                background: i <= step ? "#7c3aed" : "#e9e4ff",
                transition: "background .3s ease",
              }} />
            ))}
          </div>
        </div>

        {/* Step content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "22px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

          {step === 0 && (
            <>
              <div>
                <label style={labelStyle}>Discipline</label>
                <select
                  value={form.disciplineId}
                  onChange={e => setForm(f => ({ ...f, disciplineId: Number(e.target.value) }))}
                  style={inputStyle}
                >
                  {DISCIPLINES.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code}) — {d.program_type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Academic Term</label>
                <select
                  value={form.termId}
                  onChange={e => setForm(f => ({ ...f, termId: Number(e.target.value) }))}
                  style={inputStyle}
                >
                  {TERMS.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Year Level</label>
                <select
                  value={form.year_level}
                  onChange={e => setForm(f => ({ ...f, year_level: Number(e.target.value) }))}
                  style={inputStyle}
                >
                  {[1, 2, 3, 4].map(y => (
                    <option key={y} value={y}>{yearOrdinal(y)} Year (Year {y})</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Number of groups</label>
                  <input
                    type="number" min={1} max={26}
                    value={form.numGroups}
                    onChange={e => setForm(f => ({ ...f, numGroups: Number(e.target.value) }))}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Capacity per group</label>
                  <input
                    type="number" min={1}
                    value={form.groupCapacity}
                    onChange={e => setForm(f => ({ ...f, groupCapacity: Number(e.target.value) }))}
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Preview */}
              <div>
                <div style={{ ...labelStyle, marginBottom: 10 }}>Auto-generated groups preview</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {previewLetters.map(l => (
                    <div key={l} style={{
                      display: "flex", flexDirection: "column", alignItems: "center",
                      padding: "10px 16px", borderRadius: 10,
                      background: "#faf5ff", border: "1.5px solid #ddd6fe",
                    }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: 8,
                        background: "linear-gradient(135deg,#7c3aed,#8b5cf6)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontSize: 13, fontWeight: 800,
                        fontFamily: "'JetBrains Mono',monospace",
                        marginBottom: 6,
                      }}>{l}</div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#1e1b4b" }}>Grp {l}</div>
                      <div style={{ fontSize: 9, color: "#7c3aed", fontFamily: "'JetBrains Mono',monospace", marginTop: 2 }}>
                        cap: {form.groupCapacity}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 8 }}>
                  Total capacity: <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: "#7c3aed" }}>
                    {form.numGroups * form.groupCapacity}
                  </span> students
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <div>
              <div style={{ ...labelStyle, marginBottom: 10 }}>Select courses for all groups in this cohort</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {COURSE_POOL.map(c => {
                  const checked = form.selectedCourseCodes.has(c.code);
                  const theme = disciplineTheme(c.code);
                  return (
                    <label key={c.code} style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 14px", borderRadius: 10, cursor: "pointer",
                      background: checked ? theme.bg : "#fafafa",
                      border: `1.5px solid ${checked ? theme.color + "44" : "#ede9fe"}`,
                      transition: "background .15s, border-color .15s",
                    }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCourse(c.code)}
                        style={{ accentColor: theme.color, width: 15, height: 15, flexShrink: 0 }}
                      />
                      <CourseCodePill code={c.code} />
                      <span style={{ fontSize: 12.5, color: "#374151", fontWeight: 500, flex: 1 }}>{c.title}</span>
                    </label>
                  );
                })}
              </div>
              {form.selectedCourseCodes.size === 0 && (
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 10 }}>
                  ⚠ No courses selected. You can add courses later from the cohort detail view.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div style={{
          padding: "14px 24px 18px", borderTop: "1px solid #f0eeff",
          display: "flex", gap: 10, flexShrink: 0,
        }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} style={{
              flex: 1, padding: "10px 0", borderRadius: 10,
              border: "1.5px solid #ede9fe", background: "#faf5ff",
              color: "#64748b", fontFamily: "'Sora',sans-serif",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>
              ← Back
            </button>
          )}
          <button onClick={() => { if (step < STEPS.length - 1) setStep(s => s + 1); else handleSubmit(); }} style={{
            flex: 2, padding: "10px 0", borderRadius: 10, border: "none",
            background: "linear-gradient(135deg,#7c3aed,#8b5cf6)",
            color: "#fff", fontFamily: "'Sora',sans-serif",
            fontSize: 13, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 4px 14px rgba(124,58,237,0.28)", letterSpacing: ".2px",
          }}>
            {step < STEPS.length - 1 ? "Next →" : "Create Cohort →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StudyGroupsPage() {
  const [cohorts,     setCohorts]    = useState<UICohort[]>(INITIAL_COHORTS);
  const [modalOpen,   setModalOpen]  = useState(false);
  const [detailOpen,  setDetailOpen] = useState<UICohort | null>(null);

  const nextId = cohorts.length > 0 ? Math.max(...cohorts.map(c => c.id)) + 1 : 1;

  function handleCreate(cohort: UICohort) {
    setCohorts(prev => [cohort, ...prev]);
    setModalOpen(false);
  }

  function handleAddCourse(cohortId: number, course: UICourse) {
    setCohorts(prev => prev.map(c =>
      c.id === cohortId ? { ...c, courses: [...c.courses, course] } : c
    ));
    // Also update the detailOpen cohort in-place so the modal refreshes
    setDetailOpen(prev => prev && prev.id === cohortId
      ? { ...prev, courses: [...prev.courses, course] }
      : prev
    );
  }

  const totalGroups   = cohorts.reduce((s, c) => s + c.groups.length, 0);
  const totalCapacity = cohorts.reduce((s, c) => s + c.groups.reduce((g, gr) => g + gr.capacity, 0), 0);
  const disciplines   = new Set(cohorts.map(c => c.discipline.id)).size;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, fontFamily: "'Sora',sans-serif" }}>

      {/* ── Page header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1e1b4b", letterSpacing: "-.4px", margin: 0 }}>
            Study Groups
          </h1>
          <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
            {cohorts.length} cohort{cohorts.length !== 1 ? "s" : ""} · Manage cohort assignments and class sections
          </p>
        </div>

        <button
          id="btn-new-cohort"
          onClick={() => setModalOpen(true)}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "10px 18px", borderRadius: 11, border: "none",
            background: "linear-gradient(135deg,#7c3aed,#8b5cf6)",
            color: "#fff", fontFamily: "'Sora',sans-serif",
            fontSize: 13, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 4px 14px rgba(124,58,237,0.28)",
            letterSpacing: ".1px", transition: "box-shadow .2s ease, transform .2s ease",
            flexShrink: 0,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 8px 24px rgba(124,58,237,0.4)";
            (e.currentTarget as HTMLButtonElement).style.transform  = "translateY(-1px)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 14px rgba(124,58,237,0.28)";
            (e.currentTarget as HTMLButtonElement).style.transform  = "";
          }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
          New Cohort
        </button>
      </div>

      {/* ── Summary stats strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {[
          { label: "Total Cohorts",      value: cohorts.length,      accent: "#7c3aed", bg: "#faf5ff" },
          { label: "Total Groups",       value: totalGroups,          accent: "#0ea5e9", bg: "#f0f9ff" },
          { label: "Total Capacity",     value: `${totalCapacity}`,   accent: "#10b981", bg: "#f0fdf4" },
        ].map(stat => (
          <div key={stat.label} style={{
            background: "#fff", borderRadius: 12, border: "1px solid #ede9fe",
            padding: "14px 18px", display: "flex", alignItems: "center", gap: 14,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: stat.bg, display: "flex", alignItems: "center",
              justifyContent: "center", flexShrink: 0,
            }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: stat.accent }} />
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", letterSpacing: ".6px", textTransform: "uppercase", marginBottom: 3 }}>
                {stat.label}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#1e1b4b", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "-1px", lineHeight: 1 }}>
                {stat.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Cohort card grid */}
      {cohorts.length === 0 ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
          <div style={{
            textAlign: "center", padding: 40, background: "#fff",
            borderRadius: 20, border: "1px solid #ede9fe",
            boxShadow: "0 24px 64px rgba(124,58,237,0.08)",
          }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📚</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1e1b4b" }}>No cohorts yet</div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 6 }}>
              Click "+ New Cohort" to create your first cohort.
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 22,
        }}>
          {cohorts.map(cohort => (
            <CohortCard key={cohort.id} cohort={cohort} onOpen={() => setDetailOpen(cohort)} />
          ))}
        </div>
      )}

      {/* ── Detail modal */}
      {detailOpen && (
        <CohortDetailModal
          cohort={detailOpen}
          onClose={() => setDetailOpen(null)}
          onAddCourse={handleAddCourse}
        />
      )}

      {/* ── New cohort modal */}
      {modalOpen && (
        <NewCohortModal
          onClose={() => setModalOpen(false)}
          onSubmit={handleCreate}
          nextId={nextId}
        />
      )}
    </div>
  );
}
