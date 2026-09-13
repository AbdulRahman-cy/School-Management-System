/**
 * Shared visual primitives for the Admin and Teacher dashboards. Both render
 * the same stat-card / table language over different (globally- vs
 * teacher-scoped) data, so the presentational atoms live here once.
 */
import type { ReactNode } from "react";
import { getCourseColorTheme } from "../courseColors";

// ─── Course code pill ───────────────────────────────────────────────────────

export function CourseCodePill({ code }: { code: string }) {
  const { bg, color } = getCourseColorTheme(code);
  return (
    <span style={{
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 11, fontWeight: 700,
      padding: "3px 8px", borderRadius: 6,
      background: bg, color,
      display: "inline-block", flexShrink: 0,
    }}>
      {code}
    </span>
  );
}

// ─── Radial progress ring ───────────────────────────────────────────────────

export function RadialProgress({ value, color, size = 50 }: { value: number; color: string; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(value / 100, 1) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f3f0ff" strokeWidth={5} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={5} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ transition: "stroke-dasharray 1s ease" }} />
    </svg>
  );
}

// ─── Loading skeleton (relies on the @keyframes shimmer injected by Dashboard) ─

export function Skeleton({ w = "100%", h = 14, r = 6 }: { w?: string | number; h?: number; r?: number }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: "linear-gradient(90deg,#f3f0ff 25%,#e9e4ff 50%,#f3f0ff 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite linear" }} />;
}

export function StatCardSkeleton() {
  return (
    <div style={{ background: "#fff", borderRadius: 14, padding: "16px 18px", border: "1px solid #ede9fe" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
          <Skeleton w="60%" h={10} /><Skeleton w="40%" h={28} /><Skeleton w="70%" h={10} />
        </div>
        <Skeleton w={50} h={50} r={99} />
      </div>
      <Skeleton h={3} r={99} />
    </div>
  );
}

// ─── Seating progress bar ───────────────────────────────────────────────────

export function SeatingBar({ enrolled, capacity }: { enrolled: number; capacity: number }) {
  const pct = capacity > 0 ? Math.min(100, Math.round((enrolled / capacity) * 100)) : 0;
  const color = pct >= 100 ? "#ef4444" : pct >= 80 ? "#f59e0b" : "#10b981";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 130 }}>
      <div style={{ flex: 1, height: 3, borderRadius: 99, background: "#f3f0ff", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99, transition: "width .8s ease" }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b", whiteSpace: "nowrap", fontFamily: "'JetBrains Mono',monospace" }}>
        {enrolled}/{capacity}
      </span>
    </div>
  );
}

// ─── Year level badge ───────────────────────────────────────────────────────

const YEAR_LEVEL_COLORS: Record<number, { bg: string; text: string }> = {
  1: { bg: "#dbeafe", text: "#1d4ed8" },
  2: { bg: "#d1fae5", text: "#065f46" },
  3: { bg: "#ede9fe", text: "#6d28d9" },
  4: { bg: "#fef3c7", text: "#92400e" },
};

export function YearBadge({ year }: { year: number }) {
  const c = YEAR_LEVEL_COLORS[year] ?? { bg: "#f1f5f9", text: "#475569" };
  return (
    <span style={{
      display: "inline-block", fontSize: 11, fontWeight: 700,
      padding: "3px 9px", borderRadius: 6,
      background: c.bg, color: c.text,
      fontFamily: "'JetBrains Mono',monospace",
    }}>
      Y{year}
    </span>
  );
}

// ─── Stat card (label + big value + ring + progress track) ─────────────────

export interface StatCardProps {
  label: string;
  value: ReactNode;
  sublabel: string;
  ringColor: string;
  trackColor: string;
  progressPct: number;
}

export function StatCard({ label, value, sublabel, ringColor, trackColor, progressPct }: StatCardProps) {
  return (
    <div style={{ background: "#fff", borderRadius: 14, padding: "16px 18px", border: "1px solid #ede9fe" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", letterSpacing: ".4px", marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#1e1b4b", letterSpacing: "-1px", fontFamily: "'JetBrains Mono',monospace" }}>{value}</div>
          <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 2 }}>{sublabel}</div>
        </div>
        <RadialProgress value={progressPct} color={ringColor} />
      </div>
      <div style={{ height: 3, background: trackColor, borderRadius: 99 }}>
        <div style={{ width: `${progressPct}%`, height: "100%", background: ringColor, borderRadius: 99, transition: "width 1.2s ease" }} />
      </div>
    </div>
  );
}
