// ─── Course title + enrolled badge ──────────────────────────────────────────
// The title sits on its own full-width line under the badge/action row, so the
// pills can never squeeze it down to an ellipsis. Long titles wrap to two lines;
// the full text is always available on hover.

export function CourseTitle({ title, coordinator }: { title: string; coordinator?: string | null }) {
  return (
    <div style={{ marginTop: 9 }}>
      <div title={title} style={{
        fontSize: 13, fontWeight: 700, color: "#1e1b4b", lineHeight: 1.35, letterSpacing: "-.1px",
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        overflowWrap: "anywhere",
      }}>
        {title}
      </div>
      {coordinator && (
        <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 2 }}>{coordinator}</div>
      )}
    </div>
  );
}

export function EnrolledBadge() {
  return (
    <span style={{
      fontSize: 10.5, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
      background: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0", whiteSpace: "nowrap",
    }}>
      ✔ Enrolled
    </span>
  );
}
