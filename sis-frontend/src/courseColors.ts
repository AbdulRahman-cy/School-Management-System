// ─── Course code colour system ────────────────────────────────────────────────
// Maps department prefixes (letters before the first space or digit)
// to a { bg, color } theme used for course code pills across the portal.

export interface CourseColorTheme {
  bg:     string;   // pill background
  color:  string;   // pill text / border
  dot:    string;   // accent dot colour (used in timetable)
}

const PREFIX_MAP: Record<string, CourseColorTheme> = {
  // ── Engineering & Science ────────────────────────────────────────────────
  BME: { bg: "#ede9fe", color: "#6d28d9", dot: "#7c3aed" },   // Biomedical  — purple
  MEC: { bg: "#d1fae5", color: "#065f46", dot: "#10b981" },   // Mechanical  — green
  EEC: { bg: "#dbeafe", color: "#1e40af", dot: "#3b82f6" },   // Elec/Comms  — blue
  CSE: { bg: "#e0f2fe", color: "#0369a1", dot: "#0ea5e9" },   // Computer Sc — sky
  EMP: { bg: "#fce7f3", color: "#9d174d", dot: "#ec4899" },   // Engineering Math/Phys — pink
  CHE: { bg: "#fef3c7", color: "#92400e", dot: "#f59e0b" },   // Chemistry   — amber
  PHY: { bg: "#fef9c3", color: "#854d0e", dot: "#eab308" },   // Physics     — yellow
  MIE: { bg: "#dcfce7", color: "#14532d", dot: "#22c55e" },   // Manufacturing — emerald
  CIE: { bg: "#e0f2fe", color: "#075985", dot: "#0284c7" },   // Civil       — light blue
  ARE: { bg: "#f0fdfa", color: "#134e4a", dot: "#0d9488" },   // Architecture — teal
  ECE: { bg: "#ede9fe", color: "#5b21b6", dot: "#8b5cf6" },   // Electronics — violet
  NET: { bg: "#dbeafe", color: "#1d4ed8", dot: "#2563eb" },   // Networks    — indigo
  DB:  { bg: "#f0fdf4", color: "#166534", dot: "#16a34a" },   // Databases   — green
  CS:  { bg: "#e0f2fe", color: "#0369a1", dot: "#0ea5e9" },   // CS generic  — sky

  // ── Humanities & Social Sciences ─────────────────────────────────────────
  HUM: { bg: "#fdf4ff", color: "#86198f", dot: "#d946ef" },   // Humanities  — fuchsia
  TRN: { bg: "#fff7ed", color: "#9a3412", dot: "#ea580c" },   // Training    — orange
  BUS: { bg: "#fff1f2", color: "#9f1239", dot: "#e11d48" },   // Business    — rose
  SOC: { bg: "#fef2f2", color: "#7f1d1d", dot: "#dc2626" },   // Social Sci  — red
  LAW: { bg: "#f0fdf4", color: "#14532d", dot: "#15803d" },   // Law         — dark green
  ART: { bg: "#fdf4ff", color: "#7e22ce", dot: "#9333ea" },   // Arts        — purple

  // ── Math ─────────────────────────────────────────────────────────────────
  MATH: { bg: "#f0f9ff", color: "#075985", dot: "#0284c7" },  // Mathematics — sky
  STA:  { bg: "#f0fdfa", color: "#115e59", dot: "#0f766e" },  // Statistics  — teal
};

// Fallback for unmapped prefixes
const FALLBACK: CourseColorTheme = {
  bg: "#f3f4f6", color: "#374151", dot: "#6b7280",
};

/**
 * Given a course code like "BME 326", "HUM xE5", "MATH 301",
 * extracts the alphabetic prefix and returns a colour theme.
 */
export function getCourseColorTheme(courseCode: string): CourseColorTheme {
  // Extract all leading letters (stops at space, digit, or end)
  const match = courseCode.trim().match(/^([A-Za-z]+)/);
  if (!match) return FALLBACK;
  const prefix = match[1].toUpperCase();
  // Try exact match first, then shorten until found
  if (PREFIX_MAP[prefix]) return PREFIX_MAP[prefix];
  for (let len = prefix.length - 1; len >= 2; len--) {
    const shortened = prefix.slice(0, len);
    if (PREFIX_MAP[shortened]) return PREFIX_MAP[shortened];
  }
  return FALLBACK;
}