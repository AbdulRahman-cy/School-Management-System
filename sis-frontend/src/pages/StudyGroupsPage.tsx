import React, { useState, useEffect } from "react";
import type { ProgramType } from "../types";
import { getCourseColorTheme } from "../courseColors";
import { useCohorts, useCreateCohort } from "../api";
import type { Cohort as APICohort, CohortBulkCreatePayload } from "../api";


// ─── Domain types ──────────────────────────────────────────────────────────────

interface UIDiscipline {
  id: number;
  name: string;
  code: string;
  program_type: ProgramType;
}

interface UITerm {
  id: number;
  name: string;
}

interface UIStudyGroupSlot {
  letter: string;
  capacity: number;
}

interface UICourse {
  id: number;        // real DB PK — needed for the API payload
  code: string;
  title: string;
}


/** Key: `"${courseCode}_${groupLetter}"` → teacher id (0 = unassigned) */
type CoordinatorMap = Record<string, number>;

interface UICohort {
  id: number;
  discipline: UIDiscipline;
  term: UITerm;
  year_level: number;
  groups: UIStudyGroupSlot[];
  courses: UICourse[];
  coordinators: CoordinatorMap;
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

// UICourse now carries a real DB id; keep codes matching those seeded in the DB.
// The id values here are illustrative — the actual values come from the API.
const COURSE_POOL: UICourse[] = [
  { id: 1,  code: "CSE 101",  title: "Intro to Computer Science"  },
  { id: 2,  code: "CSE 201",  title: "Data Structures"            },
  { id: 3,  code: "CSE 301",  title: "Algorithms"                 },
  { id: 4,  code: "MATH 101", title: "Calculus I"                 },
  { id: 5,  code: "MATH 201", title: "Calculus II"                },
  { id: 6,  code: "EMP 101",  title: "Engineering Mathematics"    },
  { id: 7,  code: "BME 201",  title: "Bioinstrumentation"         },
  { id: 8,  code: "EEC 101",  title: "Circuit Analysis"           },
  { id: 9,  code: "MEC 101",  title: "Statics & Dynamics"         },
  { id: 10, code: "PHY 101",  title: "Physics I"                  },
  { id: 11, code: "HUM 101",  title: "Technical Writing"          },
  { id: 12, code: "DB 201",   title: "Database Systems"           },
];


const MOCK_TEACHERS = [
  { id: 1, name: "Dr. Ahmed Al-Rashid"  },
  { id: 2, name: "Dr. Sarah Mansour"    },
  { id: 3, name: "Dr. Omar Khalil"      },
  { id: 4, name: "Prof. Layla Hassan"   },
  { id: 5, name: "Dr. Youssef Nour"     },
  { id: 6, name: "Dr. Mona El-Sayed"    },
  { id: 7, name: "Prof. Tariq Ibrahim"  },
  { id: 8, name: "Dr. Rana Farouk"      },
];

// ─── Mock cohort data ─────────────────────────────────────────────────────────

const INITIAL_COHORTS: UICohort[] = [
  {
    id: 1, discipline: DISCIPLINES[0], term: TERMS[0], year_level: 1,
    groups: [{ letter: "A", capacity: 50 }, { letter: "B", capacity: 50 }, { letter: "C", capacity: 50 }],
    courses: [
      { code: "CSE 101", title: "Intro to Computer Science" },
      { code: "MATH 101", title: "Calculus I" },
      { code: "EMP 101", title: "Engineering Mathematics" },
      { code: "PHY 101", title: "Physics I" },
    ],
    coordinators: {
      "CSE 101_A": 1, "CSE 101_B": 2, "CSE 101_C": 3,
      "MATH 101_A": 4, "MATH 101_B": 4, "MATH 101_C": 5,
      "EMP 101_A": 6, "EMP 101_B": 6, "EMP 101_C": 7,
    },
  },
  {
    id: 2, discipline: DISCIPLINES[0], term: TERMS[0], year_level: 2,
    groups: [{ letter: "A", capacity: 45 }, { letter: "B", capacity: 45 }],
    courses: [
      { code: "CSE 201", title: "Data Structures" },
      { code: "MATH 201", title: "Calculus II" },
      { code: "DB 201", title: "Database Systems" },
    ],
    coordinators: { "CSE 201_A": 1, "CSE 201_B": 3, "MATH 201_A": 4, "MATH 201_B": 5 },
  },
  {
    id: 3, discipline: DISCIPLINES[1], term: TERMS[0], year_level: 1,
    groups: [{ letter: "A", capacity: 40 }, { letter: "B", capacity: 40 }],
    courses: [
      { code: "BME 201", title: "Bioinstrumentation" },
      { code: "EMP 101", title: "Engineering Mathematics" },
      { code: "PHY 101", title: "Physics I" },
    ],
    coordinators: { "BME 201_A": 2, "BME 201_B": 8, "EMP 101_A": 6, "EMP 101_B": 6 },
  },
  {
    id: 4, discipline: DISCIPLINES[2], term: TERMS[1], year_level: 2,
    groups: [{ letter: "A", capacity: 50 }, { letter: "B", capacity: 50 }, { letter: "C", capacity: 50 }],
    courses: [{ code: "EEC 101", title: "Circuit Analysis" }, { code: "MATH 201", title: "Calculus II" }],
    coordinators: { "EEC 101_A": 7, "EEC 101_B": 7, "EEC 101_C": 3 },
  },
  {
    id: 5, discipline: DISCIPLINES[3], term: TERMS[1], year_level: 3,
    groups: [{ letter: "A", capacity: 35 }],
    courses: [{ code: "MEC 101", title: "Statics & Dynamics" }, { code: "MATH 201", title: "Calculus II" }],
    coordinators: { "MEC 101_A": 5 },
  },
  {
    id: 6, discipline: DISCIPLINES[4], term: TERMS[2], year_level: 1,
    groups: [{ letter: "A", capacity: 50 }, { letter: "B", capacity: 50 }],
    courses: [{ code: "MATH 101", title: "Calculus I" }, { code: "HUM 101", title: "Technical Writing" }],
    coordinators: { "MATH 101_A": 4, "MATH 101_B": 5, "HUM 101_A": 8, "HUM 101_B": 8 },
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

function disciplineTheme(code: string) { return getCourseColorTheme(code); }

/** Convert group number (1-based) to letter (A, B, …). */
function numToLetter(n: number): string {
  return String.fromCharCode(64 + n); // 1→A, 2→B, …
}

/**
 * Adapt an API Cohort to the local UICohort used by the card/modal components.
 * Groups are ordered by number; coordinator map is built from course_classes.
 */
function adaptCohort(c: APICohort): UICohort {
  const sorted = [...c.groups].sort((a, b) => a.number - b.number);
  const groups: UIStudyGroupSlot[] = sorted.map(g => ({
    letter: numToLetter(g.number),
    capacity: g.capacity,
  }));

  // Collect unique courses from the classes list
  const courseMap = new Map<string, UICourse>();
  for (const cc of c.course_classes) {
    if (!courseMap.has(cc.course.code)) {
      courseMap.set(cc.course.code, { id: cc.course.id, code: cc.course.code, title: cc.course.title });
    }
  }

  // Build coordinator map: "courseCode_groupLetter" → coordinatorId (0 if null)
  const coordinators: CoordinatorMap = {};
  for (const cc of c.course_classes) {
    const letter = numToLetter(cc.group_number);
    const key = `${cc.course.code}_${letter}`;
    coordinators[key] = cc.coordinator?.id ?? 0;
  }

  return {
    // UICohort.id is a number — use a stable numeric hash of the composite string
    id: c.discipline.id * 10000 + c.term.id * 10 + c.year_level,
    discipline: {
      id: c.discipline.id,
      name: c.discipline.name,
      code: c.discipline.code,
      program_type: c.discipline.program_type,
    },
    term: { id: c.term.id, name: c.term.name },
    year_level: c.year_level,
    groups,
    courses: Array.from(courseMap.values()),
    coordinators,
  };
}

function nextGroupLetter(existing: UIStudyGroupSlot[]): string | null {
  const used = new Set(existing.map(g => g.letter));
  for (const ch of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") { if (!used.has(ch)) return ch; }
  return null;
}


// ─── Shared style tokens ──────────────────────────────────────────────────────

const INPUT_STYLE: React.CSSProperties = {
  width: "100%", padding: "8px 11px", borderRadius: 8,
  border: "1.5px solid #ede9fe", background: "#faf5ff",
  fontSize: 12.5, color: "#1e1b4b", fontFamily: "'Sora',sans-serif",
  outline: "none", boxSizing: "border-box",
};

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: "#64748b",
  letterSpacing: ".4px", textTransform: "uppercase",
  marginBottom: 4, display: "block",
};

// ─── CourseCodePill ───────────────────────────────────────────────────────────

function CourseCodePill({ code }: { code: string }) {
  const { bg, color } = getCourseColorTheme(code);
  return (
    <span style={{
      fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700,
      padding: "2px 8px", borderRadius: 5, background: bg, color,
      display: "inline-block", flexShrink: 0, border: `1px solid ${color}22`,
    }}>{code}</span>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, type, onDone }: { message: string; type: "success" | "error" | "warn"; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2600); return () => clearTimeout(t); }, [onDone]);
  const c = { success: { bg: "#d1fae5", border: "#6ee7b7", color: "#065f46" }, error: { bg: "#fee2e2", border: "#fca5a5", color: "#b91c1c" }, warn: { bg: "#fef3c7", border: "#fde68a", color: "#92400e" } }[type];
  return (
    <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 999, padding: "11px 18px", borderRadius: 11, background: c.bg, border: `1.5px solid ${c.border}`, color: c.color, fontSize: 13, fontWeight: 600, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", animation: "fadeUp .2s ease both", display: "flex", alignItems: "center", gap: 8, fontFamily: "'Sora',sans-serif" }}>
      <span>{type === "success" ? "✓" : type === "error" ? "✕" : "⚠"}</span>{message}
    </div>
  );
}

// ─── ConfirmDialog ────────────────────────────────────────────────────────────

function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(15,10,30,0.45)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", maxWidth: 380, width: "100%", boxShadow: "0 24px 64px rgba(100,50,255,0.16)", border: "1px solid #fee2e2", animation: "fadeUp .2s ease both" }}>
        <div style={{ fontSize: 22, marginBottom: 12 }}>🗑</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1e1b4b", marginBottom: 6 }}>{message}</div>
        <div style={{ fontSize: 11.5, color: "#94a3b8", marginBottom: 20 }}>This action cannot be undone.</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "9px 0", borderRadius: 9, border: "1.5px solid #ede9fe", background: "#faf5ff", color: "#64748b", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "'Sora',sans-serif" }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: "9px 0", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#ef4444,#dc2626)", color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Sora',sans-serif", boxShadow: "0 4px 14px rgba(239,68,68,0.28)" }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ─── IconBtn (reusable micro-button) ─────────────────────────────────────────

function IconBtn({ title, onClick, danger = false, children }: { title: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  const [hov, setHov] = useState(false);
  return (
    <button title={title} onClick={e => { e.stopPropagation(); onClick(); }} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ width: 26, height: 26, borderRadius: 7, border: "none", cursor: "pointer", background: hov ? (danger ? "#fee2e2" : "#ede9fe") : "transparent", color: hov ? (danger ? "#ef4444" : "#7c3aed") : "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, transition: "background .15s, color .15s", flexShrink: 0 }}>
      {children}
    </button>
  );
}

// ─── CohortCard ───────────────────────────────────────────────────────────────

function CohortCard({ cohort, onOpen }: { cohort: UICohort; onOpen: () => void }) {
  const [hovered, setHovered] = useState(false);
  const theme = disciplineTheme(cohort.discipline.code);
  const progBadge = PROGRAM_BADGE[cohort.discipline.program_type];
  const totalCap = cohort.groups.reduce((s, g) => s + g.capacity, 0);
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onClick={onOpen}
      style={{ display: "flex", flexDirection: "column", background: "#fff", borderRadius: 18, border: `1.5px solid ${hovered ? theme.color + "55" : theme.bg}`, overflow: "hidden", boxShadow: hovered ? `0 20px 52px ${theme.color}22` : `0 4px 18px ${theme.color}0d`, transition: "box-shadow .22s ease, border-color .22s ease, transform .22s ease", transform: hovered ? "translateY(-5px)" : "translateY(0)", cursor: "pointer" }}>
      <div style={{ minHeight: 120, background: `linear-gradient(135deg, ${theme.bg} 0%, ${theme.color}18 100%)`, display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "13px 14px", flexShrink: 0, position: "relative" }}>
        <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: ".7px", padding: "3px 10px", borderRadius: 99, background: progBadge.bg, color: progBadge.color, border: `1px solid ${progBadge.border}`, fontFamily: "'Sora',sans-serif", textTransform: "uppercase", flexShrink: 0 }}>{cohort.discipline.program_type}</span>
        <span style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: ".2px", padding: "3px 10px", borderRadius: 99, background: "rgba(255,255,255,0.9)", color: "#1e1b4b", border: "1px solid #ede9fe", fontFamily: "'Sora',sans-serif", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 }}>{cohort.discipline.name}</span>
        <div style={{ position: "absolute", bottom: 10, left: 16, fontSize: 30, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", color: theme.color, opacity: 0.13, letterSpacing: "-1px", userSelect: "none" }}>{cohort.discipline.code}</div>
      </div>
      <div style={{ padding: "16px 18px", flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: "#1e1b4b", letterSpacing: "-.35px", margin: 0, fontFamily: "'Sora',sans-serif" }}>Year {cohort.year_level} &mdash; {cohort.term.name}</h3>
        <div style={{ display: "flex", alignItems: "stretch", gap: 0, background: theme.bg, borderRadius: 10, border: `1px solid ${theme.color}22`, overflow: "hidden", marginTop: 4 }}>
          <div style={{ flex: 1, padding: "10px 14px" }}>
            <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: ".7px", color: theme.color, textTransform: "uppercase", marginBottom: 3, opacity: 0.8 }}>No. of groups</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#1e1b4b", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "-1px", lineHeight: 1 }}>{cohort.groups.length}</div>
          </div>
          <div style={{ width: 1, background: `${theme.color}22`, flexShrink: 0 }} />
          <div style={{ flex: 1, padding: "10px 14px" }}>
            <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: ".7px", color: theme.color, textTransform: "uppercase", marginBottom: 3, opacity: 0.8 }}>Total capacity</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#1e1b4b", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "-1px", lineHeight: 1 }}>{totalCap}<span style={{ fontSize: 11, fontWeight: 500, color: "#94a3b8", marginLeft: 4, fontFamily: "'Sora',sans-serif" }}>students</span></div>
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 4 }}>
          {cohort.courses.slice(0, 4).map(c => <CourseCodePill key={c.code} code={c.code} />)}
          {cohort.courses.length > 4 && <span style={{ fontSize: 9.5, fontWeight: 600, padding: "2px 8px", borderRadius: 5, background: "#f3f4f6", color: "#6b7280" }}>+{cohort.courses.length - 4} more</span>}
        </div>
      </div>
      <div style={{ padding: "12px 18px 18px" }}>
        <button onClick={e => { e.stopPropagation(); onOpen(); }} style={{ width: "100%", padding: "11px 0", borderRadius: 10, border: "none", background: hovered ? `linear-gradient(135deg, ${theme.color}, ${theme.dot})` : `linear-gradient(135deg, ${theme.dot}, ${theme.color})`, color: "#fff", fontFamily: "'Sora',sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer", letterSpacing: ".2px", transition: "background .2s ease", boxShadow: hovered ? `0 8px 24px ${theme.color}50` : `0 2px 8px ${theme.color}30` }}>View Cohort Details →</button>
      </div>
    </div>
  );
}

// ─── CohortDetailModal ────────────────────────────────────────────────────────

function CohortDetailModal({ cohort, onClose, onUpdate, onDelete, onToast }: {
  cohort: UICohort;
  onClose: () => void;
  onUpdate: (updated: UICohort) => void;
  onDelete: (id: number) => void;
  onToast: (msg: string, type: "success" | "error" | "warn") => void;
}) {
  const theme = disciplineTheme(cohort.discipline.code);
  const progBadge = PROGRAM_BADGE[cohort.discipline.program_type];

  // Edit cohort title
  const [editingTitle, setEditingTitle] = useState(false);
  const [editYear, setEditYear] = useState(cohort.year_level);
  const [editTermId, setEditTermId] = useState(cohort.term.id);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Study groups
  const [editCapLetter, setEditCapLetter] = useState<string | null>(null);
  const [editCapValue, setEditCapValue] = useState(0);
  const [confirmDelGrp, setConfirmDelGrp] = useState<string | null>(null);

  // Course classes
  const [addingCourse, setAddingCourse] = useState(false);
  const [newCourseCode, setNewCourseCode] = useState("");
  const [newCourseCoords, setNewCourseCoords] = useState<CoordinatorMap>({});
  const [editingCourse, setEditingCourse] = useState<string | null>(null);
  const [editCoords, setEditCoords] = useState<CoordinatorMap>({});
  const [confirmDelCourse, setConfirmDelCourse] = useState<string | null>(null);

  const assignedCodes = new Set(cohort.courses.map(c => c.code));
  const available = COURSE_POOL.filter(c => !assignedCodes.has(c.code));

  function push(partial: Partial<UICohort>) { onUpdate({ ...cohort, ...partial }); }

  // Title
  function saveTitle() {
    const term = TERMS.find(t => t.id === editTermId) ?? cohort.term;
    push({ year_level: editYear, term });
    setEditingTitle(false);
    onToast("Cohort details updated", "success");
  }

  // Groups
  function saveCapacity() {
    if (!editCapLetter) return;
    push({ groups: cohort.groups.map(g => g.letter === editCapLetter ? { ...g, capacity: editCapValue } : g) });
    setEditCapLetter(null);
    onToast(`Grp ${editCapLetter} capacity updated`, "success");
  }
  function addGroup() {
    const letter = nextGroupLetter(cohort.groups);
    if (!letter) { onToast("Maximum 26 groups reached", "warn"); return; }
    push({ groups: [...cohort.groups, { letter, capacity: 50 }] });
    onToast(`Group ${letter} added`, "success");
  }
  function deleteGroup(letter: string) {
    const groups = cohort.groups.filter(g => g.letter !== letter);
    const coordinators = { ...cohort.coordinators };
    cohort.courses.forEach(c => { delete coordinators[`${c.code}_${letter}`]; });
    push({ groups, coordinators });
    setConfirmDelGrp(null);
    onToast(`Group ${letter} removed`, "success");
  }

  // Courses
  function commitAddCourse() {
    const course = COURSE_POOL.find(c => c.code === newCourseCode);
    if (!course) return;
    push({ courses: [...cohort.courses, course], coordinators: { ...cohort.coordinators, ...newCourseCoords } });
    setAddingCourse(false); setNewCourseCode(""); setNewCourseCoords({});
    onToast(`${course.code} added`, "success");
  }
  function startEditCourse(code: string) {
    const partial: CoordinatorMap = {};
    cohort.groups.forEach(g => { const k = `${code}_${g.letter}`; partial[k] = cohort.coordinators[k] ?? 0; });
    setEditCoords(partial);
    setEditingCourse(code);
  }
  function saveEditCourse() {
    push({ coordinators: { ...cohort.coordinators, ...editCoords } });
    setEditingCourse(null);
    onToast("Coordinators updated", "success");
  }
  function deleteCourse(code: string) {
    const courses = cohort.courses.filter(c => c.code !== code);
    const coordinators = { ...cohort.coordinators };
    cohort.groups.forEach(g => { delete coordinators[`${code}_${g.letter}`]; });
    push({ courses, coordinators });
    setConfirmDelCourse(null);
    onToast(`${code} removed`, "success");
  }

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(15,10,30,0.55)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div style={{ width: "100%", maxWidth: 660, background: "#fff", borderRadius: 20, boxShadow: "0 32px 80px rgba(100,50,255,0.18)", border: `1.5px solid ${theme.color}22`, overflow: "hidden", animation: "fadeUp .25s ease both", maxHeight: "92vh", display: "flex", flexDirection: "column" }}>

          {/* ── Header ── */}
          <div style={{ background: `linear-gradient(135deg, ${theme.bg} 0%, ${theme.color}18 100%)`, padding: "18px 22px 16px", borderBottom: `1px solid ${theme.color}22`, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: ".7px", padding: "3px 10px", borderRadius: 99, background: progBadge.bg, color: progBadge.color, border: `1px solid ${progBadge.border}`, textTransform: "uppercase" }}>{cohort.discipline.program_type}</span>
                  <span style={{ fontSize: 9.5, fontWeight: 600, padding: "3px 10px", borderRadius: 99, background: "rgba(255,255,255,0.9)", color: "#1e1b4b", border: "1px solid #ede9fe" }}>{cohort.discipline.name}</span>
                </div>
                {editingTitle ? (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <select value={editYear} onChange={e => setEditYear(Number(e.target.value))} style={{ ...INPUT_STYLE, width: 110, padding: "5px 8px" }}>
                      {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
                    </select>
                    <select value={editTermId} onChange={e => setEditTermId(Number(e.target.value))} style={{ ...INPUT_STYLE, width: 140, padding: "5px 8px" }}>
                      {TERMS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <button onClick={saveTitle} style={{ padding: "5px 14px", borderRadius: 8, border: "none", background: theme.color, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Sora',sans-serif" }}>Save</button>
                    <button onClick={() => setEditingTitle(false)} style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid #ede9fe", background: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#64748b", fontFamily: "'Sora',sans-serif" }}>Cancel</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1e1b4b", letterSpacing: "-.4px", margin: 0 }}>Year {cohort.year_level} — {cohort.term.name}</h2>
                    <IconBtn title="Edit cohort details" onClick={() => { setEditYear(cohort.year_level); setEditTermId(cohort.term.id); setEditingTitle(true); }}>✎</IconBtn>
                  </div>
                )}
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>{cohort.groups.length} groups · {cohort.groups.reduce((s, g) => s + g.capacity, 0)} total capacity</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexShrink: 0 }}>
                <button onClick={() => setConfirmDelete(true)}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, border: "1.5px solid #fca5a5", background: "#fff5f5", color: "#ef4444", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Sora',sans-serif", transition: "background .15s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#fee2e2")}
                  onMouseLeave={e => (e.currentTarget.style.background = "#fff5f5")}>
                  🗑 Delete
                </button>
                <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 9, border: `1px solid ${theme.color}33`, background: "rgba(255,255,255,0.8)", cursor: "pointer", color: "#64748b", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              </div>
            </div>
          </div>

          {/* ── Scrollable body ── */}
          <div style={{ overflowY: "auto", flex: 1, padding: "20px 22px 22px", display: "flex", flexDirection: "column", gap: 22 }}>

            {/* Study Groups section */}
            <section>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: "#94a3b8", letterSpacing: ".8px", textTransform: "uppercase" }}>Study Groups</div>
                <button onClick={addGroup} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 11px", borderRadius: 7, border: "none", background: `linear-gradient(135deg, ${theme.dot}, ${theme.color})`, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Sora',sans-serif", boxShadow: `0 2px 8px ${theme.color}30` }}>
                  <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> Add Group
                </button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {cohort.groups.map(g => (
                  <div key={g.letter} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 16px 10px", borderRadius: 12, background: theme.bg, border: `1.5px solid ${theme.color}33`, minWidth: 88, position: "relative" }}>
                    <button onClick={() => setConfirmDelGrp(g.letter)} title="Remove group"
                      style={{ position: "absolute", top: 4, right: 4, width: 18, height: 18, borderRadius: 5, border: "none", background: "transparent", cursor: "pointer", color: "#94a3b8", fontSize: 10, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", transition: "background .15s, color .15s" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "#fee2e2"; e.currentTarget.style.color = "#ef4444"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94a3b8"; }}>✕</button>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${theme.dot}, ${theme.color})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", boxShadow: `0 4px 12px ${theme.color}40`, marginBottom: 6 }}>{g.letter}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#1e1b4b" }}>Grp {g.letter}</div>
                    {editCapLetter === g.letter ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                        <input type="number" min={1} value={editCapValue} onChange={e => setEditCapValue(Number(e.target.value))} autoFocus
                          style={{ width: 52, padding: "3px 6px", borderRadius: 6, border: "1.5px solid #7c3aed", background: "#faf5ff", fontSize: 11, color: "#1e1b4b", outline: "none", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }} />
                        <button onClick={saveCapacity} style={{ padding: "3px 7px", borderRadius: 6, border: "none", background: "#7c3aed", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>✓</button>
                        <button onClick={() => setEditCapLetter(null)} style={{ padding: "3px 7px", borderRadius: 6, border: "1px solid #ede9fe", background: "#fff", fontSize: 10, fontWeight: 600, cursor: "pointer", color: "#64748b" }}>✕</button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditCapLetter(g.letter); setEditCapValue(g.capacity); }} title="Edit capacity"
                        style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", marginTop: 3, borderRadius: 5, fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: theme.color, fontWeight: 600, transition: "background .15s" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.05)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                        cap: {g.capacity} ✎
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Course Classes section */}
            <section>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: "#94a3b8", letterSpacing: ".8px", textTransform: "uppercase" }}>Course Classes</div>
                {!addingCourse && (
                  <button onClick={() => { setAddingCourse(true); setNewCourseCode(""); setNewCourseCoords({}); }}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 11px", borderRadius: 7, border: "none", background: `linear-gradient(135deg, ${theme.dot}, ${theme.color})`, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Sora',sans-serif", boxShadow: `0 2px 8px ${theme.color}30` }}>
                    <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> Add Course Class
                  </button>
                )}
              </div>

              {/* Add course panel */}
              {addingCourse && (
                <div style={{ marginBottom: 14, padding: "14px 16px", borderRadius: 12, background: theme.bg, border: `1px solid ${theme.color}22`, display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={LABEL_STYLE}>Select Course</label>
                    <select value={newCourseCode} onChange={e => { setNewCourseCode(e.target.value); setNewCourseCoords({}); }} style={INPUT_STYLE}>
                      <option value="">— Choose a course —</option>
                      {available.map(c => <option key={c.code} value={c.code}>{c.code} · {c.title}</option>)}
                    </select>
                  </div>
                  {newCourseCode && (
                    <div>
                      <label style={LABEL_STYLE}>Assign Coordinators</label>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {cohort.groups.map(g => {
                          const k = `${newCourseCode}_${g.letter}`;
                          const ct = disciplineTheme(newCourseCode);
                          return (
                            <div key={g.letter} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: 8, background: "#fff", border: "1px solid #ede9fe" }}>
                              <div style={{ width: 26, height: 26, borderRadius: 6, flexShrink: 0, background: `linear-gradient(135deg, ${ct.dot}, ${ct.color})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace" }}>{g.letter}</div>
                              <span style={{ fontSize: 11.5, fontWeight: 600, color: "#374151", minWidth: 48 }}>Grp {g.letter}</span>
                              <select value={newCourseCoords[k] ?? 0} onChange={e => setNewCourseCoords(m => ({ ...m, [k]: Number(e.target.value) }))} style={{ ...INPUT_STYLE, flex: 1, padding: "6px 9px", fontSize: 12 }}>
                                <option value={0}>— Unassigned —</option>
                                {MOCK_TEACHERS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button disabled={!newCourseCode} onClick={commitAddCourse}
                      style={{ flex: 2, padding: "8px 0", borderRadius: 9, border: "none", background: newCourseCode ? `linear-gradient(135deg,${theme.dot},${theme.color})` : "#e5e7eb", color: newCourseCode ? "#fff" : "#9ca3af", fontSize: 12.5, fontWeight: 700, cursor: newCourseCode ? "pointer" : "not-allowed", fontFamily: "'Sora',sans-serif" }}>Assign Course →</button>
                    <button onClick={() => setAddingCourse(false)}
                      style={{ flex: 1, padding: "8px 0", borderRadius: 9, border: "1px solid #ede9fe", background: "#fff", color: "#64748b", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "'Sora',sans-serif" }}>Cancel</button>
                  </div>
                </div>
              )}

              {/* Course list */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {cohort.courses.map(c => {
                  const isEditing = editingCourse === c.code;
                  const ct = disciplineTheme(c.code);
                  return (
                    <div key={c.code} style={{ borderRadius: 11, background: "#faf5ff", border: `1px solid ${isEditing ? ct.color + "44" : "#ede9fe"}`, overflow: "hidden", transition: "border-color .15s" }}>
                      {/* Row header */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px" }}>
                        <CourseCodePill code={c.code} />
                        <span style={{ fontSize: 12.5, color: "#374151", fontWeight: 500, flex: 1 }}>{c.title}</span>
                        {isEditing ? (
                          <>
                            <button onClick={saveEditCourse} style={{ padding: "4px 11px", borderRadius: 7, border: "none", background: "#7c3aed", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Sora',sans-serif" }}>Save</button>
                            <button onClick={() => setEditingCourse(null)} style={{ padding: "4px 10px", borderRadius: 7, border: "1px solid #ede9fe", background: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", color: "#64748b", fontFamily: "'Sora',sans-serif" }}>Cancel</button>
                          </>
                        ) : (
                          <IconBtn title="Edit coordinators" onClick={() => startEditCourse(c.code)}>✎</IconBtn>
                        )}
                        <IconBtn title="Remove course class" danger onClick={() => setConfirmDelCourse(c.code)}>🗑</IconBtn>
                      </div>
                      {/* Coordinator area */}
                      <div style={{ padding: "0 14px 12px", display: "flex", flexDirection: "column", gap: 5 }}>
                        {isEditing ? (
                          cohort.groups.map(g => {
                            const k = `${c.code}_${g.letter}`;
                            const val = editCoords[k] ?? 0;
                            return (
                              <div key={g.letter} style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 10px", borderRadius: 8, background: "#fff", border: `1px solid ${ct.color}22` }}>
                                <div style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0, background: `linear-gradient(135deg, ${ct.dot}, ${ct.color})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace" }}>{g.letter}</div>
                                <span style={{ fontSize: 11, fontWeight: 600, color: "#374151", minWidth: 46 }}>Grp {g.letter}</span>
                                <select value={val} onChange={e => setEditCoords(m => ({ ...m, [k]: Number(e.target.value) }))}
                                  style={{ flex: 1, padding: "5px 8px", borderRadius: 7, border: `1.5px solid ${val ? ct.color + "55" : "#ede9fe"}`, background: val ? ct.bg : "#fff", fontSize: 12, color: val ? ct.color : "#94a3b8", fontFamily: "'Sora',sans-serif", fontWeight: val ? 600 : 400, outline: "none", cursor: "pointer" }}>
                                  <option value={0}>— Unassigned —</option>
                                  {MOCK_TEACHERS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                              </div>
                            );
                          })
                        ) : (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {cohort.groups.map(g => {
                              const tid = cohort.coordinators[`${c.code}_${g.letter}`] ?? 0;
                              const isUnassigned = !tid;
                              return (
                                <span key={g.letter} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 99, background: isUnassigned ? "#f3f4f6" : ct.bg, border: `1px solid ${isUnassigned ? "#e5e7eb" : ct.color + "33"}`, fontSize: 10.5, fontWeight: 600, color: isUnassigned ? "#9ca3af" : ct.color, fontFamily: "'Sora',sans-serif" }}>
                                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 9.5 }}>Grp {g.letter}</span>
                                  <span style={{ opacity: 0.4 }}>·</span>
                                  {tid ? teacherName(tid) : "Unassigned"}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {cohort.courses.length === 0 && <div style={{ fontSize: 12, color: "#94a3b8", padding: "12px 0", textAlign: "center" }}>No courses assigned yet.</div>}
              </div>
            </section>
          </div>
        </div>
      </div>

      {confirmDelGrp && <ConfirmDialog message={`Remove Group ${confirmDelGrp} from this cohort?`} onConfirm={() => deleteGroup(confirmDelGrp)} onCancel={() => setConfirmDelGrp(null)} />}
      {confirmDelCourse && <ConfirmDialog message={`Remove ${confirmDelCourse} from this cohort?`} onConfirm={() => deleteCourse(confirmDelCourse)} onCancel={() => setConfirmDelCourse(null)} />}
      {confirmDelete && <ConfirmDialog message={`Delete the entire cohort "Year ${cohort.year_level} — ${cohort.term.name}"?`} onConfirm={() => { onDelete(cohort.id); onClose(); }} onCancel={() => setConfirmDelete(false)} />}
    </>
  );
}

// ─── NewCohortModal (4-step wizard) ──────────────────────────────────────────

interface NewCohortForm {
  disciplineId: number;
  termId: number;
  year_level: number;
  numGroups: number;
  groupCapacity: number;
  selectedCourseCodes: Set<string>;
  coordinatorAssignments: CoordinatorMap;
}

function NewCohortModal({
  onClose, onSubmit, nextId, submitCohort, isPending,
}: {
  onClose: () => void;
  onSubmit: (c: UICohort) => void;
  nextId: number;
  submitCohort: (payload: CohortBulkCreatePayload, opts: { onSuccess: () => void; onError: (e: unknown) => void }) => void;
  isPending: boolean;
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<NewCohortForm>({
    disciplineId: DISCIPLINES[0].id, termId: TERMS[0].id, year_level: 1,
    numGroups: 3, groupCapacity: 50, selectedCourseCodes: new Set(), coordinatorAssignments: {},
  });
  const [apiError, setApiError] = useState<string | null>(null);

  const STEPS = ["Cohort Metadata", "Study Groups", "Course Assignment", "Class Coordinators"];

  function toggleCourse(code: string) {
    setForm(f => { const next = new Set(f.selectedCourseCodes); if (next.has(code)) next.delete(code); else next.add(code); return { ...f, selectedCourseCodes: next }; });
  }
  function setCoordinator(courseCode: string, groupLetter: string, teacherId: number) {
    const key = `${courseCode}_${groupLetter}`;
    setForm(f => ({ ...f, coordinatorAssignments: { ...f.coordinatorAssignments, [key]: teacherId } }));
  }
  function handleSubmit() {
    const discipline = DISCIPLINES.find(d => d.id === form.disciplineId)!;
    const term = TERMS.find(t => t.id === form.termId)!;
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".slice(0, form.numGroups).split("");
    const selectedCourses = COURSE_POOL.filter(c => form.selectedCourseCodes.has(c.code));

    // Build the API payload — keys use courseId_groupNumber format
    const groups = letters.map((_, i) => ({ number: i + 1, capacity: form.groupCapacity }));
    const coordinatorsPayload: Record<string, number> = {};
    for (const course of selectedCourses) {
      letters.forEach((letter, i) => {
        const uiKey = `${course.code}_${letter}`;
        const teacherId = form.coordinatorAssignments[uiKey] ?? 0;
        if (teacherId) {
          coordinatorsPayload[`${course.id}_${i + 1}`] = teacherId;
        }
      });
    }

    const payload: CohortBulkCreatePayload = {
      discipline_id: form.disciplineId,
      term_id: form.termId,
      year_level: form.year_level,
      groups,
      courses: selectedCourses.map(c => c.id),
      coordinators: coordinatorsPayload,
    };

    setApiError(null);
    submitCohort(payload, {
      onSuccess: () => onClose(),
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
          ?? "Failed to create cohort. Please try again.";
        setApiError(msg);
      },
    });
  }


  const previewLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".slice(0, Math.max(0, Math.min(form.numGroups, 26))).split("");

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(15,10,30,0.55)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: "100%", maxWidth: 600, background: "#fff", borderRadius: 20, boxShadow: "0 32px 80px rgba(100,50,255,0.18)", border: "1px solid rgba(124,58,237,0.12)", overflow: "hidden", animation: "fadeUp .25s ease both", maxHeight: "92vh", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f0eeff", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1e1b4b", margin: 0 }}>New Cohort</h2>
              <p style={{ fontSize: 11.5, color: "#94a3b8", margin: "4px 0 0" }}>Step {step + 1} of {STEPS.length} — {STEPS[step]}</p>
            </div>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid #ede9fe", background: "#faf5ff", cursor: "pointer", color: "#94a3b8", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✕</button>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
            {STEPS.map((_, i) => <div key={i} style={{ flex: 1, height: 4, borderRadius: 99, background: i <= step ? "#7c3aed" : "#e9e4ff", transition: "background .3s ease" }} />)}
          </div>
        </div>

        {/* Step content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "22px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {step === 0 && (
            <>
              <div><label style={LABEL_STYLE}>Discipline</label><select value={form.disciplineId} onChange={e => setForm(f => ({ ...f, disciplineId: Number(e.target.value) }))} style={INPUT_STYLE}>{DISCIPLINES.map(d => <option key={d.id} value={d.id}>{d.name} ({d.code}) — {d.program_type}</option>)}</select></div>
              <div><label style={LABEL_STYLE}>Academic Term</label><select value={form.termId} onChange={e => setForm(f => ({ ...f, termId: Number(e.target.value) }))} style={INPUT_STYLE}>{TERMS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
              <div><label style={LABEL_STYLE}>Year Level</label><select value={form.year_level} onChange={e => setForm(f => ({ ...f, year_level: Number(e.target.value) }))} style={INPUT_STYLE}>{[1, 2, 3, 4].map(y => <option key={y} value={y}>{yearOrdinal(y)} Year (Year {y})</option>)}</select></div>
            </>
          )}
          {step === 1 && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div><label style={LABEL_STYLE}>Number of groups</label><input type="number" min={1} max={26} value={form.numGroups} onChange={e => setForm(f => ({ ...f, numGroups: Number(e.target.value) }))} style={INPUT_STYLE} /></div>
                <div><label style={LABEL_STYLE}>Capacity per group</label><input type="number" min={1} value={form.groupCapacity} onChange={e => setForm(f => ({ ...f, groupCapacity: Number(e.target.value) }))} style={INPUT_STYLE} /></div>
              </div>
              <div>
                <div style={{ ...LABEL_STYLE, marginBottom: 10 }}>Auto-generated groups preview</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {previewLetters.map(l => (
                    <div key={l} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 16px", borderRadius: 10, background: "#faf5ff", border: "1.5px solid #ddd6fe" }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg,#7c3aed,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", marginBottom: 6 }}>{l}</div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#1e1b4b" }}>Grp {l}</div>
                      <div style={{ fontSize: 9, color: "#7c3aed", fontFamily: "'JetBrains Mono',monospace", marginTop: 2 }}>cap: {form.groupCapacity}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 8 }}>Total capacity: <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: "#7c3aed" }}>{form.numGroups * form.groupCapacity}</span> students</div>
              </div>
            </>
          )}
          {step === 2 && (
            <div>
              <div style={{ ...LABEL_STYLE, marginBottom: 10 }}>Select courses for all groups in this cohort</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {COURSE_POOL.map(c => {
                  const checked = form.selectedCourseCodes.has(c.code);
                  const ct = disciplineTheme(c.code);
                  return (
                    <label key={c.code} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, cursor: "pointer", background: checked ? ct.bg : "#fafafa", border: `1.5px solid ${checked ? ct.color + "44" : "#ede9fe"}`, transition: "background .15s, border-color .15s" }}>
                      <input type="checkbox" checked={checked} onChange={() => toggleCourse(c.code)} style={{ accentColor: ct.color, width: 15, height: 15, flexShrink: 0 }} />
                      <CourseCodePill code={c.code} />
                      <span style={{ fontSize: 12.5, color: "#374151", fontWeight: 500, flex: 1 }}>{c.title}</span>
                    </label>
                  );
                })}
              </div>
              {form.selectedCourseCodes.size === 0 && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 10 }}>⚠ No courses selected. You can add them later from the cohort detail view.</div>}
            </div>
          )}
          {step === 3 && (() => {
            const selectedCourses = COURSE_POOL.filter(c => form.selectedCourseCodes.has(c.code));
            if (selectedCourses.length === 0 || previewLetters.length === 0) {
              return (
                <div style={{ textAlign: "center", padding: "32px 16px", background: "#faf5ff", borderRadius: 12, border: "1px solid #ede9fe" }}>
                  <div style={{ fontSize: 22, marginBottom: 8 }}>⚠️</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>{selectedCourses.length === 0 ? "No courses selected in Step 3." : "No groups defined in Step 2."}</div>
                  <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 4 }}>Go back and complete the previous steps first.</div>
                </div>
              );
            }
            const total = selectedCourses.length * previewLetters.length;
            const assigned = Object.values(form.coordinatorAssignments).filter(v => v > 0).length;
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.6 }}>Assign a coordinator to each course class. Each row represents one <strong style={{ color: "#1e1b4b" }}>Course × Study Group</strong> section.</div>
                {selectedCourses.map(course => {
                  const ct = disciplineTheme(course.code);
                  return (
                    <div key={course.code}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, paddingBottom: 8, borderBottom: `1.5px solid ${ct.color}22` }}>
                        <CourseCodePill code={course.code} />
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: "#1e1b4b" }}>{course.title}</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                        {previewLetters.map(letter => {
                          const k = `${course.code}_${letter}`;
                          const val = form.coordinatorAssignments[k] ?? 0;
                          return (
                            <div key={letter} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 12px", borderRadius: 9, background: "#faf5ff", border: "1px solid #ede9fe" }}>
                              <div style={{ width: 30, height: 30, borderRadius: 7, flexShrink: 0, background: `linear-gradient(135deg, ${ct.dot}, ${ct.color})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", boxShadow: `0 2px 8px ${ct.color}30` }}>{letter}</div>
                              <span style={{ fontSize: 11.5, fontWeight: 600, color: "#374151", minWidth: 50 }}>Grp {letter}</span>
                              <select value={val} onChange={e => setCoordinator(course.code, letter, Number(e.target.value))}
                                style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: `1.5px solid ${val ? ct.color + "55" : "#ede9fe"}`, background: val ? ct.bg : "#fff", fontSize: 12.5, color: val ? ct.color : "#94a3b8", fontFamily: "'Sora',sans-serif", fontWeight: val ? 600 : 400, outline: "none", cursor: "pointer" }}>
                                <option value={0}>— Unassigned —</option>
                                {MOCK_TEACHERS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", borderRadius: 9, background: assigned === total ? "#d1fae5" : "#fef3c7", border: `1px solid ${assigned === total ? "#6ee7b7" : "#fde68a"}`, fontSize: 11.5, fontWeight: 600, color: assigned === total ? "#065f46" : "#92400e" }}>
                  <span style={{ fontSize: 14 }}>{assigned === total ? "✓" : "⚠"}</span>
                  {assigned} of {total} section{total !== 1 ? "s" : ""} assigned
                  {assigned < total && <span style={{ fontWeight: 400, color: "#b45309", marginLeft: 4 }}>— unassigned sections will be saved without a coordinator</span>}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 24px 18px", borderTop: "1px solid #f0eeff", display: "flex", flexDirection: "column", gap: 10, flexShrink: 0 }}>
          {apiError && (
            <div style={{ padding: "8px 12px", borderRadius: 8, background: "#fee2e2", border: "1px solid #fca5a5", color: "#b91c1c", fontSize: 11.5, fontWeight: 600, fontFamily: "'Sora',sans-serif" }}>
              ✕ {apiError}
            </div>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            {step > 0 && <button onClick={() => setStep(s => s - 1)} disabled={isPending} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1.5px solid #ede9fe", background: "#faf5ff", color: "#64748b", fontFamily: "'Sora',sans-serif", fontSize: 13, fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer", opacity: isPending ? 0.6 : 1 }}>← Back</button>}
            <button
              onClick={() => { if (step < STEPS.length - 1) setStep(s => s + 1); else handleSubmit(); }}
              disabled={isPending}
              style={{ flex: 2, padding: "10px 0", borderRadius: 10, border: "none", background: isPending ? "#a78bfa" : "linear-gradient(135deg,#7c3aed,#8b5cf6)", color: "#fff", fontFamily: "'Sora',sans-serif", fontSize: 13, fontWeight: 700, cursor: isPending ? "not-allowed" : "pointer", boxShadow: "0 4px 14px rgba(124,58,237,0.28)", letterSpacing: ".2px", transition: "background .2s" }}>
              {step < STEPS.length - 1 ? "Next →" : (isPending ? "Creating…" : "Create Cohort →")}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StudyGroupsPage() {
  // ── Live data ──────────────────────────────────────────────────────────────
  const { data: apiCohorts, isLoading, isError } = useCohorts();
  const { mutate: submitCohort, isPending } = useCreateCohort();

  // Adapt API cohorts to UI model; fall back to empty array while loading
  const cohorts: UICohort[] = (apiCohorts ?? []).map(adaptCohort);

  // Local-only state for the detail modal and toast
  const [modalOpen,  setModalOpen]  = useState(false);
  const [detailOpen, setDetailOpen] = useState<UICohort | null>(null);
  const [toast,      setToast]      = useState<{ msg: string; type: "success" | "error" | "warn" } | null>(null);

  function showToast(msg: string, type: "success" | "error" | "warn" = "success") { setToast({ msg, type }); }

  /**
   * Detail-modal CRUD still operates on local optimistic copies.
   * On save the modal re-reads from the API cohort list via the adaptCohort bridge.
   */
  const [localOverrides, setLocalOverrides] = useState<Record<number, UICohort>>({});
  const mergedCohorts = cohorts.map(c => localOverrides[c.id] ?? c);

  function handleUpdate(updated: UICohort) {
    setLocalOverrides(prev => ({ ...prev, [updated.id]: updated }));
    setDetailOpen(updated);
  }

  function handleDeleteCohort(id: number) {
    setLocalOverrides(prev => { const next = { ...prev }; delete next[id]; return next; });
    setDetailOpen(null);
    showToast("Cohort deleted", "error");
  }

  const totalGroups   = mergedCohorts.reduce((s, c) => s + c.groups.length, 0);
  const totalCapacity = mergedCohorts.reduce((s, c) => s + c.groups.reduce((g, gr) => g + gr.capacity, 0), 0);
  const nextId = mergedCohorts.length > 0 ? Math.max(...mergedCohorts.map(c => c.id)) + 1 : 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, fontFamily: "'Sora',sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1e1b4b", letterSpacing: "-.4px", margin: 0 }}>Study Groups</h1>
          <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
            {isLoading ? "Loading cohorts…" : `${mergedCohorts.length} cohort${mergedCohorts.length !== 1 ? "s" : ""} · Manage cohort assignments and class sections`}
          </p>
        </div>
        <button id="btn-new-cohort" onClick={() => setModalOpen(true)}
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", borderRadius: 11, border: "none", background: "linear-gradient(135deg,#7c3aed,#8b5cf6)", color: "#fff", fontFamily: "'Sora',sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(124,58,237,0.28)", letterSpacing: ".1px", transition: "box-shadow .2s ease, transform .2s ease", flexShrink: 0 }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 8px 24px rgba(124,58,237,0.4)"; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 14px rgba(124,58,237,0.28)"; (e.currentTarget as HTMLButtonElement).style.transform = ""; }}>
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> New Cohort
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {[
          { label: "Total Cohorts",  value: mergedCohorts.length, accent: "#7c3aed", bg: "#faf5ff" },
          { label: "Total Groups",   value: totalGroups,    accent: "#0ea5e9", bg: "#f0f9ff" },
          { label: "Total Capacity", value: totalCapacity,  accent: "#10b981", bg: "#f0fdf4" },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", borderRadius: 12, border: "1px solid #ede9fe", padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: s.accent }} />
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", letterSpacing: ".6px", textTransform: "uppercase", marginBottom: 3 }}>{s.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#1e1b4b", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "-1px", lineHeight: 1 }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Loading skeleton grid */}
      {isLoading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 22 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ background: "#fff", borderRadius: 18, border: "1.5px solid #f0eeff", overflow: "hidden", height: 280 }}>
              <div style={{ height: 120, background: "linear-gradient(135deg,#f0eeff,#e9e4ff)", animation: "pulse 1.6s ease-in-out infinite" }} />
              <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ height: 20, width: "60%", borderRadius: 6, background: "#f0eeff", animation: "pulse 1.6s ease-in-out infinite" }} />
                <div style={{ height: 52, borderRadius: 10, background: "#f8f4ff", animation: "pulse 1.6s ease-in-out infinite" }} />
                <div style={{ display: "flex", gap: 6 }}>
                  {[1, 2, 3].map(j => <div key={j} style={{ height: 20, width: 52, borderRadius: 5, background: "#f0eeff", animation: "pulse 1.6s ease-in-out infinite" }} />)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {isError && !isLoading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 }}>
          <div style={{ textAlign: "center", padding: "32px 40px", background: "#fff", borderRadius: 20, border: "1px solid #fee2e2", boxShadow: "0 24px 64px rgba(239,68,68,0.08)" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>⚠️</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#b91c1c" }}>Failed to load cohorts</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>Check your network connection and try again.</div>
          </div>
        </div>
      )}

      {/* Cohort grid */}
      {!isLoading && !isError && (
        mergedCohorts.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
            <div style={{ textAlign: "center", padding: 40, background: "#fff", borderRadius: 20, border: "1px solid #ede9fe", boxShadow: "0 24px 64px rgba(124,58,237,0.08)" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📚</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1e1b4b" }}>No cohorts yet</div>
              <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 6 }}>Click "+ New Cohort" to create your first cohort.</div>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 22 }}>
            {mergedCohorts.map(cohort => <CohortCard key={cohort.id} cohort={cohort} onOpen={() => setDetailOpen(cohort)} />)}
          </div>
        )
      )}

      {detailOpen && <CohortDetailModal cohort={detailOpen} onClose={() => setDetailOpen(null)} onUpdate={handleUpdate} onDelete={handleDeleteCohort} onToast={showToast} />}
      {modalOpen && (
        <NewCohortModal
          onClose={() => setModalOpen(false)}
          onSubmit={() => setModalOpen(false)}
          nextId={nextId}
          submitCohort={(payload, opts) => submitCohort(payload, opts)}
          isPending={isPending}
        />
      )}
      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
