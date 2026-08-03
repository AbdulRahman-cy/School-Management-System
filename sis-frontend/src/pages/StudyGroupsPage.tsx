import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { ProgramType } from "../types";
import { getCourseColorTheme } from "../courseColors";
import {
  useCohorts, useCreateCohort,
  useDisciplines, useTerms, useTeachers, useBlueprintCourses,
  useDeleteCohort, useUpdateCourseClass, useDeleteCourseClass,
  useUpdateStudyGroup, useDeleteStudyGroup, useCreateCourseClass,
  useAddStudyGroup,
} from "../api";
import type {
  Cohort as APICohort, CohortBulkCreatePayload,
  DisciplineOption, TermOption, CourseOption, TeacherOption,
} from "../api";


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
  is_active: boolean;
}

interface UIStudyGroupSlot {
  id: number;      // real StudyGroup PK — needed for PATCH/DELETE
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

/**
 * Key: `"${courseCode}_${groupLetter}"` → CourseClass DB id
 * Used to issue PATCH /academics/classes/{id}/ for coordinator updates.
 */
type CourseClassIdMap = Record<string, number>;

export interface UICohort {
  id: number;
  /** Composite key: "{discipline.id}_{term.id}_{year_level}" — needed for DELETE /cohorts/{composite_id}/ */
  compositeId: string;
  discipline: UIDiscipline;
  term: UITerm;
  year_level: number;
  groups: UIStudyGroupSlot[];
  courses: UICourse[];
  coordinators: CoordinatorMap;
  /** Maps "courseCode_groupLetter" → CourseClass DB PK, used for PATCH mutations */
  courseClassIds: CourseClassIdMap;
}


// ─── Static look-up tables ────────────────────────────────────────────────────
// NOTE: All previous DISCIPLINES / TERMS / COURSE_POOL / MOCK_TEACHERS / INITIAL_COHORTS
// constants have been removed. Live data is fetched from the Django backend via
// the TanStack Query hooks below.  The UIDiscipline / UITerm / UICourse interfaces
// are still used as the in-component UI model.


// ─── Helpers ──────────────────────────────────────────────────────────────────

function yearOrdinal(n: number): string {
  const map: Record<number, string> = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th" };
  return map[n] ?? `${n}th`;
}

/** Look up a teacher's display name from the live API list. */
function teacherName(id: number, teachers: TeacherOption[]): string {
  return teachers.find(t => t.id === id)?.user_name ?? `Teacher #${id}`;
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
    id: g.id,
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
  // Build courseClassIds map: "courseCode_groupLetter" → CourseClass PK
  const courseClassIds: CourseClassIdMap = {};
  for (const cc of c.course_classes) {
    const letter = numToLetter(cc.group_number);
    const key = `${cc.course.code}_${letter}`;
    coordinators[key] = cc.coordinator?.id ?? 0;
    courseClassIds[key] = cc.id;
  }

  return {
    // UICohort.id is a number — use a stable numeric hash of the composite string
    id: c.discipline.id * 10000 + c.term.id * 10 + c.year_level,
    compositeId: c.id,   // "disciplineId_termId_yearLevel" string from the serializer
    discipline: {
      id: c.discipline.id,
      name: c.discipline.name,
      code: c.discipline.code,
      program_type: c.discipline.program_type,
    },
    term: { id: c.term.id, name: c.term.name, is_active: c.term.is_active },
    year_level: c.year_level,
    groups,
    courses: Array.from(courseMap.values()),
    coordinators,
    courseClassIds,
  };
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

// ─── CustomSelect (Portal-based custom dropdown component) ────────────────────

export interface CustomSelectOption<T extends string | number> {
  value: T;
  label: string;
}

export function CustomSelect<T extends string | number>({
  value,
  onChange,
  options,
  placeholder = "Select...",
  disabled = false,
  style,
}: {
  value: T | null | undefined;
  onChange: (val: T) => void;
  options: CustomSelectOption<T>[];
  placeholder?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 140 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const safeValue = value ?? null;
  const selectedOpt = options.find(o => o.value === safeValue);

  const updateCoords = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 6,
        left: rect.left,
        width: rect.width,
      });
    }
  };

  const toggleOpen = () => {
    if (disabled) return;
    if (!open) {
      updateCoords();
    }
    setOpen(prev => !prev);
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        menuRef.current && !menuRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    function handleScrollOrResize() {
      if (open) {
        updateCoords();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [open]);

  return (
    <div style={{ inlineSize: "100%", ...style }}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={toggleOpen}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: "8px 14px",
          borderRadius: 12,
          border: open ? "1.5px solid #7c3aed" : "1.5px solid #e2e8f0",
          background: disabled ? "#f8fafc" : "#fff",
          color: selectedOpt && selectedOpt.value !== "" && selectedOpt.value !== 0 ? "#1e1b4b" : "#64748b",
          fontSize: 12.5,
          fontWeight: 600,
          fontFamily: "'Sora',sans-serif",
          cursor: disabled ? "not-allowed" : "pointer",
          outline: "none",
          boxShadow: open ? "0 0 0 3px rgba(124,58,237,0.14)" : "0 1px 3px rgba(0,0,0,0.03)",
          transition: "all .15s ease",
        }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selectedOpt ? selectedOpt.label : placeholder}
        </span>
        <span style={{ fontSize: 10, color: "#64748b", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .2s ease", flexShrink: 0 }}>▼</span>
      </button>

      {open && !disabled && createPortal(
        <div
          ref={menuRef}
          style={{
            position: "fixed",
            top: coords.top,
            left: coords.left,
            width: Math.max(coords.width, 160),
            zIndex: 999999,
            background: "#fff",
            borderRadius: 14,
            border: "1.5px solid #ede9fe",
            boxShadow: "0 20px 48px rgba(15,23,42,0.16)",
            maxHeight: 220,
            overflowY: "auto",
            padding: 5,
            animation: "fadeUp .15s ease both",
          }}>
          {options.map((opt) => {
            const isSelected = opt.value === safeValue;
            return (
              <div
                key={String(opt.value)}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(opt.value);
                  setOpen(false);
                }}
                style={{
                  padding: "8px 12px",
                  borderRadius: 9,
                  fontSize: 12,
                  fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? "#7c3aed" : "#334155",
                  background: isSelected ? "#f5f3ff" : "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "background .15s ease, color .15s ease",
                }}
                onMouseEnter={e => {
                  if (!isSelected) e.currentTarget.style.background = "#faf5ff";
                }}
                onMouseLeave={e => {
                  if (!isSelected) e.currentTarget.style.background = "transparent";
                }}>
                <span>{opt.label}</span>
                {isSelected && <span style={{ color: "#7c3aed", fontWeight: 800 }}>✓</span>}
              </div>
            );
          })}
        </div>,
        document.body
      )}
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

export function getDisciplineColors(code: string) {
  switch (code.toUpperCase()) {
    case "CCE":
      return {
        bg: "#fff1f2",
        gradient: "linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)",
        border: "#fecdd3",
        text: "#e11d48",
        watermark: "#fb7185",
        badge: "#ffe4e6",
        badgeText: "#9f1239",
        dot: "#e11d48",
      };
    case "CSE":
      return {
        bg: "#f0f9ff",
        gradient: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
        border: "#bae6fd",
        text: "#0284c7",
        watermark: "#38bdf8",
        badge: "#e0f2fe",
        badgeText: "#0369a1",
        dot: "#0284c7",
      };
    case "MEC":
      return {
        bg: "#f0fdf4",
        gradient: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
        border: "#bbf7d0",
        text: "#166534",
        watermark: "#4ade80",
        badge: "#dcfce7",
        badgeText: "#14532d",
        dot: "#10b981",
      };
    case "BME":
      return {
        bg: "#faf5ff",
        gradient: "linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)",
        border: "#e9d5ff",
        text: "#7c3aed",
        watermark: "#c084fc",
        badge: "#ede9fe",
        badgeText: "#6d28d9",
        dot: "#8b5cf6",
      };
    case "EMP":
    case "CHE":
      return {
        bg: "#fffbeb",
        gradient: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
        border: "#fde68a",
        text: "#b45309",
        watermark: "#fcd34d",
        badge: "#fef3c7",
        badgeText: "#92400e",
        dot: "#f59e0b",
      };
    default:
      return {
        bg: "#f8fafc",
        gradient: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
        border: "#e2e8f0",
        text: "#475569",
        watermark: "#cbd5e1",
        badge: "#f1f5f9",
        badgeText: "#334155",
        dot: "#64748b",
      };
  }
}

// ─── CohortCard ───────────────────────────────────────────────────────────────

function CohortCard({ cohort, onOpen }: { cohort: UICohort; onOpen: () => void }) {
  const [hovered, setHovered] = useState(false);
  const colors = getDisciplineColors(cohort.discipline.code);
  const totalCap = cohort.groups.reduce((s, g) => s + g.capacity, 0);
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onClick={onOpen}
      style={{ display: "flex", flexDirection: "column", background: `linear-gradient(180deg, ${colors.bg} 0%, #ffffff 65%)`, borderRadius: 24, border: `1.5px solid ${hovered ? colors.text + "66" : colors.border}`, overflow: "hidden", boxShadow: hovered ? `0 24px 56px ${colors.text}25` : `0 8px 24px ${colors.text}10`, transition: "box-shadow .22s ease, border-color .22s ease, transform .22s ease", transform: hovered ? "translateY(-5px)" : "translateY(0)", cursor: "pointer" }}>
      <div style={{ minHeight: 120, background: colors.gradient, display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "15px 16px", flexShrink: 0, position: "relative" }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: ".7px", padding: "4px 11px", borderRadius: 99, background: colors.badge, color: colors.badgeText, border: `1px solid ${colors.border}`, fontFamily: "'Sora',sans-serif", textTransform: "uppercase", flexShrink: 0 }}>{cohort.discipline.program_type}</span>
          {!cohort.term.is_active && (
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".5px", padding: "3px 8px", borderRadius: 99, background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", fontFamily: "'Sora',sans-serif", textTransform: "uppercase" }}>Archived</span>
          )}
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".2px", padding: "4px 11px", borderRadius: 99, background: "rgba(255,255,255,0.92)", color: "#1e1b4b", border: `1px solid ${colors.border}`, fontFamily: "'Sora',sans-serif", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 }}>{cohort.discipline.name}</span>
        <div style={{ position: "absolute", bottom: 10, left: 16, fontSize: 34, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", color: colors.watermark, opacity: 0.3, letterSpacing: "-1px", userSelect: "none" }}>{cohort.discipline.code}</div>
      </div>
      <div style={{ padding: "18px 20px", flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={{ fontSize: 19, fontWeight: 800, color: "#1e1b4b", letterSpacing: "-.4px", margin: 0, fontFamily: "'Sora',sans-serif" }}>Year {cohort.year_level} &mdash; {cohort.term.name}</h3>
        <div style={{ display: "flex", alignItems: "stretch", gap: 0, background: "rgba(255,255,255,0.85)", borderRadius: 14, border: `1px solid ${colors.border}`, overflow: "hidden", marginTop: 2 }}>
          <div style={{ flex: 1, padding: "12px 16px" }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: ".8px", color: colors.text, textTransform: "uppercase", marginBottom: 4, opacity: 0.85 }}>No. of groups</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#1e1b4b", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "-1px", lineHeight: 1 }}>{cohort.groups.length}</div>
          </div>
          <div style={{ width: 1, background: colors.border, flexShrink: 0 }} />
          <div style={{ flex: 1, padding: "12px 16px" }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: ".8px", color: colors.text, textTransform: "uppercase", marginBottom: 4, opacity: 0.85 }}>Total capacity</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#1e1b4b", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "-1px", lineHeight: 1 }}>{totalCap}<span style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", marginLeft: 4, fontFamily: "'Sora',sans-serif" }}>students</span></div>
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 4 }}>
          {cohort.courses.slice(0, 4).map(c => <CourseCodePill key={c.code} code={c.code} />)}
          {cohort.courses.length > 4 && <span style={{ fontSize: 9.5, fontWeight: 600, padding: "2px 8px", borderRadius: 5, background: "#f3f4f6", color: "#6b7280" }}>+{cohort.courses.length - 4} more</span>}
        </div>
      </div>
      <div style={{ padding: "12px 20px 20px" }}>
        <button onClick={e => { e.stopPropagation(); onOpen(); }} style={{ width: "100%", padding: "12px 0", borderRadius: 12, border: "none", background: hovered ? `linear-gradient(135deg, ${colors.text}, ${colors.dot})` : `linear-gradient(135deg, ${colors.dot}, ${colors.text})`, color: "#fff", fontFamily: "'Sora',sans-serif", fontSize: 13.5, fontWeight: 700, cursor: "pointer", letterSpacing: ".2px", transition: "background .2s ease", boxShadow: hovered ? `0 8px 24px ${colors.text}50` : `0 2px 8px ${colors.text}30` }}>View Cohort Details →</button>
      </div>
    </div>
  );
}

// ─── CohortDetailModal ────────────────────────────────────────────────────────

function CohortDetailModal({ compositeId, termFilter, selectedDiscipline, onClose, onDelete, onToast }: {
  compositeId: string;
  termFilter: "active" | "all";
  selectedDiscipline: number | null;
  onClose: () => void;
  onDelete: (compositeId: string) => void;
  onToast: (msg: string, type: "success" | "error" | "warn") => void;
}) {
  // Derive live state directly from React Query cache
  const { data: apiCohorts = [] } = useCohorts(termFilter, selectedDiscipline);
  const cohorts = apiCohorts.map(adaptCohort);
  const cohort = cohorts.find(c => c.compositeId === compositeId);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const { mutate: runDeleteCohort,        isPending: isDeletingCohort  } = useDeleteCohort();
  const { mutate: runUpdateGroup,         isPending: isUpdatingGroup   } = useUpdateStudyGroup();
  const { mutate: runDeleteGroup,         isPending: isDeletingGroup   } = useDeleteStudyGroup();
  const { mutate: runAddGroup,            isPending: isAddingGroup     } = useAddStudyGroup();
  const { mutateAsync: runCreateClassAsync, isPending: isCreatingClass } = useCreateCourseClass();
  const { mutate: runUpdateClass,         isPending: isUpdatingClass   } = useUpdateCourseClass();
  const { mutate: runDeleteClass,         isPending: isDeletingClass   } = useDeleteCourseClass();

  const isAnyPending = isDeletingCohort || isUpdatingGroup || isDeletingGroup || isAddingGroup || isCreatingClass || isUpdatingClass || isDeletingClass;

  // Edit cohort title (local-only UI — no endpoint yet)
  const [editingTitle, setEditingTitle] = useState(false);
  const [editYear, setEditYear] = useState(cohort?.year_level ?? 1);
  const [editTermId, setEditTermId] = useState(cohort?.term?.id ?? 0);
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

  // Fetch blueprint courses restricted to cohort's discipline, year level, and term
  const { data: blueprintCourses = [], isLoading: isLoadingBlueprint } = useBlueprintCourses(
    cohort?.discipline?.id,
    cohort?.year_level,
    cohort?.term?.id
  );
  // Fetch teachers from the API
  const { data: teachers = [] } = useTeachers();
  // Fetch terms from the API for the edit-title dropdown
  const { data: terms = [], isLoading: isLoadingTerms } = useTerms();

  useEffect(() => {
    if (!cohort || !cohort.groups || cohort.groups.length === 0) {
      onClose();
    }
  }, [cohort, onClose]);

  if (!cohort || !cohort.groups || cohort.groups.length === 0) return null;

  const theme = disciplineTheme(cohort?.discipline?.code ?? "");
  const progBadge = PROGRAM_BADGE[cohort?.discipline?.program_type ?? "GSP"];

  const isArchived = cohort?.term?.is_active === false;

  const assignedCodes = new Set((cohort?.courses ?? []).map(c => c.code));
  const available = blueprintCourses.filter((c: CourseOption) => !assignedCodes.has(c.code));

  // Title (local optimistic — no backend endpoint for this yet)
  function saveTitle() {
    setEditingTitle(false);
    onToast("Cohort details updated (local preview only)", "warn");
  }

  // ── Group handlers ─────────────────────────────────────────────────────────

  function handleAddStudyGroup() {
    if (!cohort || !cohort.groups) return;
    const existingNumbers = (cohort.groups ?? []).map(g => g.letter.charCodeAt(0) - 64);
    const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;

    runAddGroup(
      {
        discipline_id: cohort.discipline.id,
        term_id: cohort.term.id,
        year_level: cohort.year_level,
        number: nextNumber,
        capacity: 50,
      },
      {
        onSuccess: () => {
          onToast(`Group ${numToLetter(nextNumber)} added`, "success");
        },
        onError: () => {
          onToast("Failed to add study group", "error");
        },
      }
    );
  }

  function saveCapacity() {
    if (!editCapLetter) return;
    const grp = cohort!.groups.find(g => g.letter === editCapLetter);
    if (!grp) return;
    runUpdateGroup(
      { id: grp.id, payload: { capacity: editCapValue } },
      {
        onSuccess: () => {
          setEditCapLetter(null);
          onToast(`Grp ${editCapLetter} capacity updated`, "success");
        },
        onError: () => onToast("Failed to update capacity", "error"),
      }
    );
  }

  function deleteGroup(letter: string) {
    const grp = cohort!.groups.find(g => g.letter === letter);
    if (!grp) return;
    runDeleteGroup(grp.id, {
      onSuccess: () => {
        setConfirmDelGrp(null);
        onToast(`Group ${letter} removed`, "success");
      },
      onError: () => onToast(`Failed to remove Group ${letter}`, "error"),
    });
  }

  // ── Course-class handlers ──────────────────────────────────────────────────

  function resetAddCourseForm() {
    setAddingCourse(false);
    setNewCourseCode("");
    setNewCourseCoords({});
  }

  function commitAddCourse() {
    const course = blueprintCourses.find((c: CourseOption) => c.code === newCourseCode);
    if (!course || cohort!.groups.length === 0) return;

    const promises = cohort!.groups.map(g => {
      const k = `${newCourseCode}_${g.letter}`;
      const teacherId = newCourseCoords[k] ?? 0;
      return runCreateClassAsync({
        course_id: course.id,
        group_id: g.id,
        coordinator_id: teacherId || null,
      });
    });

    Promise.all(promises)
      .then(() => {
        resetAddCourseForm();
        onToast(`${course.code} classes created successfully`, "success");
      })
      .catch(() => {
        onToast("Failed to create course class", "error");
      });
  }

  function startEditCourse(code: string) {
    const partial: CoordinatorMap = {};
    cohort!.groups.forEach(g => { const k = `${code}_${g.letter}`; partial[k] = cohort!.coordinators[k] ?? 0; });
    setEditCoords(partial);
    setEditingCourse(code);
  }

  function saveEditCourse(code: string) {
    // Fire a PATCH for each (course, group) whose coordinator changed
    const promises: Array<Promise<void>> = [];
    cohort!.groups.forEach(g => {
      const key = `${code}_${g.letter}`;
      const newTeacherId = editCoords[key] ?? 0;
      const classId = cohort!.courseClassIds[key];
      if (!classId) return;
      // Only PATCH if value changed
      if (newTeacherId !== (cohort!.coordinators[key] ?? 0)) {
        promises.push(
          new Promise<void>((resolve, reject) =>
            runUpdateClass(
              { id: classId, payload: { coordinator_id: newTeacherId || null } },
              { onSuccess: () => resolve(), onError: reject }
            )
          )
        );
      }
    });
    Promise.all(promises).then(() => {
      setEditingCourse(null);
      onToast("Coordinators updated", "success");
    }).catch(() => onToast("Some coordinator updates failed", "error"));
  }

  function deleteCourse(code: string) {
    // Delete all CourseClass rows for this course across every group
    const classIds = cohort!.groups
      .map(g => cohort!.courseClassIds[`${code}_${g.letter}`])
      .filter((id): id is number => !!id);

    if (classIds.length === 0) {
      setConfirmDelCourse(null);
      onToast(`No class records found for ${code}`, "warn");
      return;
    }

    let remaining = classIds.length;
    let hadError = false;

    classIds.forEach(id => {
      runDeleteClass(id, {
        onSuccess: () => {
          remaining--;
          if (remaining === 0 && !hadError) {
            setConfirmDelCourse(null);
            onToast(`${code} removed`, "success");
          }
        },
        onError: () => {
          hadError = true;
          remaining--;
          if (remaining === 0) onToast(`Failed to remove some ${code} classes`, "error");
        },
      });
    });
  }

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(15,10,30,0.55)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        onClick={e => { if (e.target === e.currentTarget && !isAnyPending) onClose(); }}>
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
                    <CustomSelect
                      value={editYear}
                      onChange={setEditYear}
                      options={[1, 2, 3, 4].map(y => ({ value: y, label: `Year ${y}` }))}
                      style={{ width: 110 }}
                    />
                    <CustomSelect
                      value={editTermId}
                      onChange={setEditTermId}
                      options={isLoadingTerms ? [] : terms.map((t: TermOption) => ({ value: t.id, label: t.name }))}
                      style={{ width: 140 }}
                    />
                    <button onClick={saveTitle} style={{ padding: "5px 14px", borderRadius: 8, border: "none", background: theme.color, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Sora',sans-serif" }}>Save</button>
                    <button onClick={() => setEditingTitle(false)} style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid #ede9fe", background: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#64748b", fontFamily: "'Sora',sans-serif" }}>Cancel</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1e1b4b", letterSpacing: "-.4px", margin: 0 }}>Year {cohort.year_level} — {cohort.term.name}</h2>
                    {!isArchived && <IconBtn title="Edit cohort details" onClick={() => { setEditYear(cohort.year_level); setEditTermId(cohort.term.id); setEditingTitle(true); }}>✎</IconBtn>}
                  </div>
                )}
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>{cohort.groups.length} groups · {cohort.groups.reduce((s, g) => s + g.capacity, 0)} total capacity</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexShrink: 0 }}>
                <button onClick={() => !isArchived && setConfirmDelete(true)} disabled={isDeletingCohort || isArchived}
                  title={isArchived ? "Archived cohort cannot be deleted" : undefined}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, border: `1.5px solid ${isArchived ? "#e2e8f0" : "#fca5a5"}`, background: isArchived ? "#f8fafc" : isDeletingCohort ? "#fee2e2" : "#fff5f5", color: isArchived ? "#94a3b8" : "#ef4444", fontSize: 11.5, fontWeight: 700, cursor: (isDeletingCohort || isArchived) ? "not-allowed" : "pointer", fontFamily: "'Sora',sans-serif", opacity: (isDeletingCohort || isArchived) ? 0.6 : 1, transition: "background .15s" }}
                  onMouseEnter={e => { if (!isDeletingCohort && !isArchived) (e.currentTarget as HTMLButtonElement).style.background = "#fee2e2"; }}
                  onMouseLeave={e => { if (!isDeletingCohort && !isArchived) (e.currentTarget as HTMLButtonElement).style.background = "#fff5f5"; }}>
                  {isDeletingCohort ? "Deleting…" : "🗑 Delete"}
                </button>
                <button onClick={onClose} disabled={isAnyPending} style={{ width: 32, height: 32, borderRadius: 9, border: `1px solid ${theme.color}33`, background: "rgba(255,255,255,0.8)", cursor: isAnyPending ? "not-allowed" : "pointer", color: "#64748b", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              </div>
            </div>
          </div>

          {/* ── Scrollable body ── */}
          <div style={{ overflowY: "auto", flex: 1, padding: "20px 22px 22px", display: "flex", flexDirection: "column", gap: 22 }}>

            {/* Archived warning banner */}
            {isArchived && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 12, background: "#fffbeb", border: "1px solid #fde68a", color: "#b45309", fontSize: 12.5, fontWeight: 600, lineHeight: 1.4 }}>
                <span style={{ fontSize: 16 }}>⚠️</span>
                <span>This cohort belongs to a past academic term. It is archived and cannot be modified.</span>
              </div>
            )}

            {/* Study Groups section */}
            <section>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: "#94a3b8", letterSpacing: ".8px", textTransform: "uppercase" }}>Study Groups</div>
                {!isArchived && (
                  <button onClick={handleAddStudyGroup} disabled={isAddingGroup}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 11px", borderRadius: 7, border: "none", background: `linear-gradient(135deg, ${theme.dot}, ${theme.color})`, color: "#fff", fontSize: 11, fontWeight: 700, cursor: isAddingGroup ? "not-allowed" : "pointer", fontFamily: "'Sora',sans-serif", boxShadow: `0 2px 8px ${theme.color}30`, opacity: isAddingGroup ? 0.7 : 1 }}>
                    <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> {isAddingGroup ? "Adding…" : "Add Study Group"}
                  </button>
                )}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {cohort.groups.map(g => (
                  <div key={g.letter} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 16px 10px", borderRadius: 12, background: theme.bg, border: `1.5px solid ${theme.color}33`, minWidth: 88, position: "relative", opacity: (isDeletingGroup || isUpdatingGroup) ? 0.7 : 1, transition: "opacity .2s" }}>
                    {!isArchived && (
                      <button onClick={() => setConfirmDelGrp(g.letter)} disabled={isDeletingGroup || isUpdatingGroup} title="Remove group"
                        style={{ position: "absolute", top: 4, right: 4, width: 18, height: 18, borderRadius: 5, border: "none", background: "transparent", cursor: (isDeletingGroup || isUpdatingGroup) ? "not-allowed" : "pointer", color: "#94a3b8", fontSize: 10, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", transition: "background .15s, color .15s" }}
                        onMouseEnter={e => { if (!isDeletingGroup) { e.currentTarget.style.background = "#fee2e2"; e.currentTarget.style.color = "#ef4444"; } }}
                        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94a3b8"; }}>✕</button>
                    )}
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${theme.dot}, ${theme.color})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", boxShadow: `0 4px 12px ${theme.color}40`, marginBottom: 6 }}>{g.letter}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#1e1b4b" }}>Grp {g.letter}</div>
                    {editCapLetter === g.letter && !isArchived ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                        <input type="number" min={1} value={editCapValue} onChange={e => setEditCapValue(Number(e.target.value))} autoFocus
                          style={{ width: 52, padding: "3px 6px", borderRadius: 6, border: "1.5px solid #7c3aed", background: "#faf5ff", fontSize: 11, color: "#1e1b4b", outline: "none", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }} />
                        <button onClick={saveCapacity} disabled={isUpdatingGroup} style={{ padding: "3px 7px", borderRadius: 6, border: "none", background: "#7c3aed", color: "#fff", fontSize: 10, fontWeight: 700, cursor: isUpdatingGroup ? "not-allowed" : "pointer", opacity: isUpdatingGroup ? 0.6 : 1 }}>✓</button>
                        <button onClick={() => setEditCapLetter(null)} style={{ padding: "3px 7px", borderRadius: 6, border: "1px solid #ede9fe", background: "#fff", fontSize: 10, fontWeight: 600, cursor: "pointer", color: "#64748b" }}>✕</button>
                      </div>
                    ) : (
                      <button onClick={() => { if (!isArchived) { setEditCapLetter(g.letter); setEditCapValue(g.capacity); } }} title={isArchived ? undefined : "Edit capacity"}
                        style={{ background: "none", border: "none", cursor: isArchived ? "default" : "pointer", padding: "2px 4px", marginTop: 3, borderRadius: 5, fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: theme.color, fontWeight: 600, transition: "background .15s" }}
                        onMouseEnter={e => { if (!isArchived) (e.currentTarget.style.background = "rgba(0,0,0,0.05)"); }}
                        onMouseLeave={e => { if (!isArchived) (e.currentTarget.style.background = "none"); }}>
                        cap: {g.capacity} {!isArchived && "✎"}
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
                {!addingCourse && !isArchived && (
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
                    <CustomSelect
                      value={newCourseCode}
                      onChange={code => { setNewCourseCode(code); setNewCourseCoords({}); }}
                      options={
                        available.length === 0
                          ? [{ value: "", label: "No more courses available" }]
                          : [
                              { value: "", label: "— Choose a course —" },
                              ...available.map((c: CourseOption) => ({ value: c.code, label: `${c.code} · ${c.title}` }))
                            ]
                      }
                      placeholder={available.length === 0 ? "No more courses available" : "— Choose a course —"}
                      disabled={available.length === 0 || isLoadingBlueprint}
                    />
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
                              <CustomSelect
                                value={newCourseCoords[k] ?? 0}
                                onChange={val => setNewCourseCoords(m => ({ ...m, [k]: val }))}
                                options={[
                                  { value: 0, label: "— Unassigned —" },
                                  ...teachers.map((t: TeacherOption) => ({ value: t.id, label: t.user_name }))
                                ]}
                                style={{ flex: 1 }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button disabled={!newCourseCode || isCreatingClass} onClick={commitAddCourse}
                      style={{ flex: 2, padding: "8px 0", borderRadius: 9, border: "none", background: newCourseCode && !isCreatingClass ? `linear-gradient(135deg,${theme.dot},${theme.color})` : "#e5e7eb", color: newCourseCode && !isCreatingClass ? "#fff" : "#9ca3af", fontSize: 12.5, fontWeight: 700, cursor: newCourseCode && !isCreatingClass ? "pointer" : "not-allowed", fontFamily: "'Sora',sans-serif" }}>
                      {isCreatingClass ? "Assigning…" : "Assign Course →"}
                    </button>
                    <button onClick={resetAddCourseForm} disabled={isCreatingClass}
                      style={{ flex: 1, padding: "8px 0", borderRadius: 9, border: "1px solid #ede9fe", background: "#fff", color: "#64748b", fontSize: 12.5, fontWeight: 600, cursor: isCreatingClass ? "not-allowed" : "pointer", fontFamily: "'Sora',sans-serif" }}>Cancel</button>
                  </div>
                </div>
              )}

              {/* Course list */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {cohort.courses.map(c => {
                  const isEditing = editingCourse === c.code;
                  const ct = disciplineTheme(c.code);
                  return (
                    <div key={c.code} style={{ borderRadius: 11, background: "#faf5ff", border: `1px solid ${isEditing ? ct.color + "44" : "#ede9fe"}`, overflow: "hidden", transition: "border-color .15s", opacity: (isDeletingClass || isUpdatingClass) ? 0.7 : 1 }}>
                      {/* Row header */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px" }}>
                        <CourseCodePill code={c.code} />
                        <span style={{ fontSize: 12.5, color: "#374151", fontWeight: 500, flex: 1 }}>{c.title}</span>
                        {isEditing ? (
                          <>
                            <button onClick={() => saveEditCourse(c.code)} disabled={isUpdatingClass} style={{ padding: "4px 11px", borderRadius: 7, border: "none", background: isUpdatingClass ? "#a78bfa" : "#7c3aed", color: "#fff", fontSize: 11, fontWeight: 700, cursor: isUpdatingClass ? "not-allowed" : "pointer", fontFamily: "'Sora',sans-serif" }}>{isUpdatingClass ? "Saving…" : "Save"}</button>
                            <button onClick={() => setEditingCourse(null)} disabled={isUpdatingClass} style={{ padding: "4px 10px", borderRadius: 7, border: "1px solid #ede9fe", background: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", color: "#64748b", fontFamily: "'Sora',sans-serif" }}>Cancel</button>
                          </>
                        ) : (
                          <>
                            {!isArchived && <IconBtn title="Edit coordinators" onClick={() => startEditCourse(c.code)}>✎</IconBtn>}
                            {!isArchived && <IconBtn title="Remove course class" danger onClick={() => setConfirmDelCourse(c.code)}>🗑</IconBtn>}
                          </>
                        )}
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
                                <CustomSelect
                                  value={val}
                                  onChange={v => setEditCoords(m => ({ ...m, [k]: v }))}
                                  options={[
                                    { value: 0, label: "— Unassigned —" },
                                    ...teachers.map((t: TeacherOption) => ({ value: t.id, label: t.user_name }))
                                  ]}
                                  style={{ flex: 1 }}
                                />
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
                                  {tid ? teacherName(tid, teachers) : "Unassigned"}
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
      {confirmDelete && <ConfirmDialog
        message={`Delete the entire cohort "Year ${cohort.year_level} — ${cohort.term.name}"?`}
        onConfirm={() => runDeleteCohort(cohort.compositeId, {
          onSuccess: () => { onDelete(cohort.compositeId); onClose(); },
          onError: (err: unknown) => {
            const status = (err as { response?: { status?: number } })?.response?.status;
            if (status === 404) {
              // Already gone — treat as success, close the modal
              onDelete(cohort.compositeId); onClose();
            } else {
              onToast("Failed to delete cohort", "error");
            }
          },
        })}
        onCancel={() => setConfirmDelete(false)}
      />}
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
  onClose, submitCohort, isPending,
}: {
  onClose: () => void;
  submitCohort: (payload: CohortBulkCreatePayload, opts: { onSuccess: () => void; onError: (e: unknown) => void }) => void;
  isPending: boolean;
}) {
  // ─── Reference data ─────────────────────────────────────────────────────
  const { data: disciplines = [], isLoading: isLoadingDisciplines } = useDisciplines();
  const { data: terms = [], isLoading: isLoadingTerms } = useTerms();
  const { data: wTeachers = [], isLoading: isLoadingTeachers } = useTeachers();

  const activeTerm = terms.find((t: TermOption) => t.is_active);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<NewCohortForm>({
    disciplineId: 0, termId: 0, year_level: 1,
    numGroups: 3, groupCapacity: 50, selectedCourseCodes: new Set(), coordinatorAssignments: {},
  });

  // Targeted Blueprint courses query for Step 3
  const { data: blueprintCourses = [], isLoading: isLoadingBlueprintCourses } = useBlueprintCourses(
    form.disciplineId, form.year_level, form.termId
  );

  // Once disciplines load, seed the default disciplineId if not already set
  useEffect(() => {
    if (disciplines.length > 0 && form.disciplineId === 0) {
      setForm(f => ({ ...f, disciplineId: disciplines[0].id }));
    }
  }, [disciplines]);

  // Bind active term ID silently
  useEffect(() => {
    if (activeTerm && form.termId !== activeTerm.id) {
      setForm(f => ({ ...f, termId: activeTerm.id }));
    }
  }, [activeTerm]);

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
    const discipline = disciplines.find((d: DisciplineOption) => d.id === form.disciplineId);
    const term = terms.find((t: TermOption) => t.id === form.termId) ?? activeTerm;
    if (!discipline || !term) return;
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".slice(0, form.numGroups).split("");
    const selectedCourses = blueprintCourses.filter((c: CourseOption) => form.selectedCourseCodes.has(c.code));

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
      term_id: term.id,
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
              <div>
                <label style={LABEL_STYLE}>Discipline</label>
                <CustomSelect
                  value={form.disciplineId}
                  onChange={id => setForm(f => ({ ...f, disciplineId: id }))}
                  options={disciplines.map((d: DisciplineOption) => ({ value: d.id, label: `${d.name} (${d.code}) — ${d.program_type}` }))}
                  disabled={isLoadingDisciplines}
                  placeholder="Select Discipline"
                />
              </div>
              <div>
                <label style={LABEL_STYLE}>Academic Term</label>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 13px", borderRadius: 10, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", fontSize: 13, fontWeight: 600, fontFamily: "'Sora',sans-serif" }}>
                  <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 99, background: "#16a34a", color: "#fff", textTransform: "uppercase", letterSpacing: ".5px" }}>Active</span>
                  <span>{isLoadingTerms ? "Loading active term…" : activeTerm ? activeTerm.name : "No active term"}</span>
                </div>
              </div>
              <div>
                <label style={LABEL_STYLE}>Year Level</label>
                <CustomSelect
                  value={form.year_level}
                  onChange={y => setForm(f => ({ ...f, year_level: y }))}
                  options={[1, 2, 3, 4].map(y => ({ value: y, label: `${yearOrdinal(y)} Year (Year ${y})` }))}
                />
              </div>
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
              {isLoadingBlueprintCourses ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[1, 2, 3].map(i => (
                    <div key={i} style={{ height: 42, borderRadius: 10, background: "#f3f4f6", animation: "pulse 1.6s ease-in-out infinite" }} />
                  ))}
                </div>
              ) : blueprintCourses.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 16px", background: "#faf5ff", borderRadius: 12, border: "1px solid #ede9fe" }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>📚</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>No courses found for this blueprint</div>
                  <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 4 }}>Try changing the discipline or year level in Step 1.</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {blueprintCourses.map((c: CourseOption) => {
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
              )}
              {blueprintCourses.length > 0 && form.selectedCourseCodes.size === 0 && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 10 }}>⚠ No courses selected. You can add them later from the cohort detail view.</div>}
            </div>
          )}
          {step === 3 && (() => {
            const selectedCourses = blueprintCourses.filter((c: CourseOption) => form.selectedCourseCodes.has(c.code));
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
                                {isLoadingTeachers
                                  ? <option disabled>Loading teachers…</option>
                                  : wTeachers.map((t: TeacherOption) => <option key={t.id} value={t.id}>{t.user_name}</option>)
                                }
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
  const [termFilter, setTermFilter] = useState<"active" | "all">("active");
  const [selectedDiscipline, setSelectedDiscipline] = useState<number | null>(null);
  const { data: apiCohorts, isLoading, isError } = useCohorts(termFilter, selectedDiscipline);
  const { data: disciplines = [] } = useDisciplines();
  const { mutate: submitCohort, isPending } = useCreateCohort();

  // Adapt API cohorts to UI model; fall back to empty array while loading
  const cohorts: UICohort[] = (apiCohorts ?? []).map(adaptCohort);

  // Local-only state for modal composite ID and toast
  const [modalOpen,         setModalOpen]         = useState(false);
  const [detailCompositeId, setDetailCompositeId] = useState<string | null>(null);
  const [toast,             setToast]             = useState<{ msg: string; type: "success" | "error" | "warn" } | null>(null);

  function showToast(msg: string, type: "success" | "error" | "warn" = "success") { setToast({ msg, type }); }

  function handleDeleteCohort(_compositeId: string) {
    // Cache invalidation handled by useDeleteCohort's onSuccess
    setDetailCompositeId(null);
    showToast("Cohort deleted", "success");
  }

  const totalGroups   = cohorts.reduce((s, c) => s + c.groups.length, 0);
  const totalCapacity = cohorts.reduce((s, c) => s + c.groups.reduce((g, gr) => g + gr.capacity, 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, fontFamily: "'Sora',sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1e1b4b", letterSpacing: "-.5px", margin: 0 }}>Study Groups</h1>
          <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
            {isLoading ? "Loading cohorts…" : `${cohorts.length} cohort${cohorts.length !== 1 ? "s" : ""} · Manage cohort assignments and class sections`}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0, flexWrap: "wrap" }}>
          {/* Discipline filter dropdown */}
          <CustomSelect
            value={selectedDiscipline ?? 0}
            onChange={val => setSelectedDiscipline(val === 0 ? null : val)}
            options={[
              { value: 0, label: "All Disciplines" },
              ...disciplines.map((d: DisciplineOption) => ({
                value: d.id,
                label: `${d.code} · ${d.name}`,
              }))
            ]}
            style={{ width: 190 }}
          />

          {/* Active / All term filter toggle */}
          <div style={{ display: "flex", background: "#f1f5f9", padding: 3, borderRadius: 12, border: "1px solid #e2e8f0" }}>
            <button
              onClick={() => setTermFilter("active")}
              style={{
                padding: "6px 14px", borderRadius: 9, border: "none",
                background: termFilter === "active" ? "#fff" : "transparent",
                color: termFilter === "active" ? "#7c3aed" : "#64748b",
                fontWeight: termFilter === "active" ? 700 : 500, fontSize: 12,
                cursor: "pointer", boxShadow: termFilter === "active" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                transition: "all .15s ease", fontFamily: "'Sora',sans-serif",
              }}>
              Active Term
            </button>
            <button
              onClick={() => setTermFilter("all")}
              style={{
                padding: "6px 14px", borderRadius: 9, border: "none",
                background: termFilter === "all" ? "#fff" : "transparent",
                color: termFilter === "all" ? "#7c3aed" : "#64748b",
                fontWeight: termFilter === "all" ? 700 : 500, fontSize: 12,
                cursor: "pointer", boxShadow: termFilter === "all" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                transition: "all .15s ease", fontFamily: "'Sora',sans-serif",
              }}>
              All Terms
            </button>
          </div>

          <button id="btn-new-cohort" onClick={() => setModalOpen(true)}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", borderRadius: 11, border: "none", background: "linear-gradient(135deg,#7c3aed,#8b5cf6)", color: "#fff", fontFamily: "'Sora',sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(124,58,237,0.28)", letterSpacing: ".1px", transition: "box-shadow .2s ease, transform .2s ease", flexShrink: 0 }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 8px 24px rgba(124,58,237,0.4)"; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 14px rgba(124,58,237,0.28)"; (e.currentTarget as HTMLButtonElement).style.transform = ""; }}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> New Cohort
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {[
          { label: "Total Cohorts",  value: cohorts.length, accent: "#7c3aed", bg: "#faf5ff" },
          { label: "Total Groups",   value: totalGroups,    accent: "#0ea5e9", bg: "#f0f9ff" },
          { label: "Total Capacity", value: totalCapacity,  accent: "#10b981", bg: "#f0fdf4" },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", borderRadius: 18, border: "1.5px solid #ede9fe", padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, boxShadow: "0 10px 30px rgba(124,58,237,0.04)" }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <div style={{ width: 14, height: 14, borderRadius: "50%", background: s.accent }} />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", letterSpacing: ".8px", textTransform: "uppercase", marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#1e1b4b", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "-1px", lineHeight: 1 }}>{s.value}</div>
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
        cohorts.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
            <div style={{ textAlign: "center", padding: 40, background: "#fff", borderRadius: 20, border: "1px solid #ede9fe", boxShadow: "0 24px 64px rgba(124,58,237,0.08)" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📚</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1e1b4b" }}>No cohorts yet</div>
              <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 6 }}>Click "+ New Cohort" to create your first cohort.</div>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 22 }}>
            {cohorts.map(cohort => <CohortCard key={cohort.id} cohort={cohort} onOpen={() => setDetailCompositeId(cohort.compositeId)} />)}
          </div>
        )
      )}

      {detailCompositeId && (
        <CohortDetailModal
          compositeId={detailCompositeId}
          termFilter={termFilter}
          selectedDiscipline={selectedDiscipline}
          onClose={() => setDetailCompositeId(null)}
          onDelete={handleDeleteCohort}
          onToast={showToast}
        />
      )}
      {modalOpen && (
        <NewCohortModal
          onClose={() => setModalOpen(false)}
          submitCohort={(payload, opts) => submitCohort(payload, opts)}
          isPending={isPending}
        />
      )}
      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
