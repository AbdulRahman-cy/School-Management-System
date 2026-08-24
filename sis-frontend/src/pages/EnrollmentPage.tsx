import { useState } from "react";
import { useAvailableGroups, useGroupCapacity, useEnroll, isGraduated } from "../api";
import type { AvailableStudyGroup, AvailableCourseClass, SessionDetail } from "../api";
import { getCourseColorTheme } from "../courseColors";

// ─── CourseCodePill (local copy to avoid cross-file import) ──────────────────

function CourseCodePill({ code }: { code: string }) {
  const { bg, color } = getCourseColorTheme(code);
  return (
    <span style={{
      fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, fontWeight: 700,
      padding: "2px 7px", borderRadius: 5, background: bg, color,
      display: "inline-block", flexShrink: 0, whiteSpace: "nowrap",
    }}>
      {code}
    </span>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ w = "100%", h = 16, r = 8 }: { w?: string | number; h?: number; r?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: "linear-gradient(90deg,#f3f0ff 25%,#e9e4ff 50%,#f3f0ff 75%)",
      backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite linear", flexShrink: 0,
    }} />
  );
}

function StudyGroupCardSkeleton() {
  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #ede9fe", overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", background: "#faf5ff", borderBottom: "1px solid #ede9fe", display: "flex", justifyContent: "space-between" }}>
        <Skeleton w={90} h={16} /><Skeleton w={80} h={20} r={99} />
      </div>
      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
        {[0, 1].map(i => (
          <div key={i} style={{ background: "#faf5ff", border: "1px solid #ede9fe", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            <Skeleton w="60%" h={14} />
            <Skeleton w="100%" h={30} />
            <Skeleton w="100%" h={30} />
          </div>
        ))}
        <Skeleton h={38} r={10} />
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ icon, heading, subtext }: { icon: string; heading: string; subtext?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 320 }}>
      <div style={{ textAlign: "center", padding: 40, background: "#fff", borderRadius: 20, border: "1px solid #ede9fe" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>{icon}</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#1e1b4b" }}>{heading}</div>
        {subtext && <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 6, maxWidth: 320 }}>{subtext}</div>}
      </div>
    </div>
  );
}

// ─── Banner (generic, unexpected errors only) ──────────────────────────────────

function Banner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      padding: "12px 16px", borderRadius: 12, background: "#fee2e2", border: "1px solid #fca5a5",
      color: "#b91c1c", fontSize: 12.5, fontWeight: 600,
    }}>
      <span>⚠ {message}</span>
      <button onClick={onDismiss} style={{ border: "none", background: "transparent", color: "#b91c1c", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>✕</button>
    </div>
  );
}

// ─── Session row ──────────────────────────────────────────────────────────────

function SessionRow({ label, session, isLast }: { label: string; session: SessionDetail | null; isLast: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderBottom: isLast ? "none" : "1px solid #f0eeff" }}>
      <span style={{ fontSize: 9.5, fontWeight: 700, color: "#94a3b8", letterSpacing: ".4px", textTransform: "uppercase", flexShrink: 0, width: 54 }}>{label}</span>
      {session ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 7, fontSize: 11, color: "#374151", minWidth: 0 }}>
          <span style={{ fontWeight: 600 }}>{session.day}</span>
          <span style={{ color: "#c4b5fd" }}>·</span>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "#64748b", whiteSpace: "nowrap" }}>{session.period}</span>
          <span style={{ color: "#c4b5fd" }}>·</span>
          <span style={{ fontWeight: 700, color: "#7c3aed", whiteSpace: "nowrap" }}>{session.room_code}</span>
        </div>
      ) : (
        <span style={{ fontSize: 11, color: "#cbd5e1", fontStyle: "italic" }}>Not yet scheduled</span>
      )}
    </div>
  );
}

// ─── Course class card ─────────────────────────────────────────────────────────

function CourseClassCard({ cc }: { cc: AvailableCourseClass }) {
  return (
    <div style={{ background: "#faf5ff", border: "1px solid #ede9fe", borderRadius: 12, padding: "13px 15px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, marginBottom: cc.coordinator_name ? 3 : 8 }}>
        <CourseCodePill code={cc.course_code} />
        <span style={{ fontSize: 12.5, fontWeight: 700, color: "#1e1b4b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cc.course_title}</span>
      </div>
      {cc.coordinator_name && (
        <div style={{ fontSize: 10.5, color: "#94a3b8", marginBottom: 8 }}>{cc.coordinator_name}</div>
      )}
      <div>
        <SessionRow label="Lecture" session={cc.lecture} isLast={false} />
        <SessionRow label="Tutorial" session={cc.tutorial} isLast={false} />
        <SessionRow label="Lab" session={cc.lab} isLast={true} />
      </div>
    </div>
  );
}

// ─── Enroll error parsing ──────────────────────────────────────────────────────

type EnrollErrorKind = "conflict" | "validation" | "unexpected";

function parseEnrollError(err: unknown): { kind: EnrollErrorKind; message: string } {
  const status = (err as { response?: { status?: number } })?.response?.status;
  const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;

  if (status === 409) {
    return { kind: "conflict", message: (data?.detail as string) ?? "This group just filled up." };
  }
  if (status === 400) {
    if (typeof data?.detail === "string") {
      return { kind: "validation", message: data.detail };
    }
    if (data && typeof data === "object") {
      const firstKey = Object.keys(data)[0];
      const value = firstKey ? data[firstKey] : undefined;
      const message = Array.isArray(value) ? String(value[0]) : String(value ?? "Enrollment failed.");
      return { kind: "validation", message };
    }
    return { kind: "validation", message: "Enrollment failed." };
  }
  return { kind: "unexpected", message: (data?.detail as string) ?? "Something went wrong. Please try again." };
}

// ─── Capacity badge ─────────────────────────────────────────────────────────────

function CapacityBadge({ remaining, capacity, isFull }: { remaining: number; capacity: number; isFull: boolean }) {
  return (
    <span style={{
      fontSize: 10.5, fontWeight: 700, padding: "3px 11px", borderRadius: 99,
      background: isFull ? "#fee2e2" : "#ede9fe",
      color: isFull ? "#b91c1c" : "#6d28d9",
      border: `1px solid ${isFull ? "#fca5a5" : "#ddd6fe"}`,
      whiteSpace: "nowrap",
    }}>
      {isFull ? "Full" : `${remaining} / ${capacity} seats`}
    </span>
  );
}

// ─── Study group card ───────────────────────────────────────────────────────────

function StudyGroupCard({ group, onGenericError }: { group: AvailableStudyGroup; onGenericError: (msg: string) => void }) {
  const { data: capacityData } = useGroupCapacity(group.id, group.is_scheduled);
  const remaining = capacityData?.remaining ?? group.remaining;
  const capacity = capacityData?.capacity ?? group.capacity;
  const isFull = group.is_scheduled && remaining === 0 && !group.is_member;

  const { mutate: runEnroll, isPending } = useEnroll();
  const [cardError, setCardError] = useState<string | null>(null);

  function handleEnroll() {
    setCardError(null);
    runEnroll({ study_group_id: group.id }, {
      onSuccess: () => setCardError(null),
      onError: (err: unknown) => {
        const parsed = parseEnrollError(err);
        if (parsed.kind === "unexpected") {
          console.error("[useEnroll] error:", err);
          onGenericError(parsed.message);
        } else {
          setCardError(parsed.message);
        }
      },
    });
  }

  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #ede9fe", overflow: "hidden", boxShadow: "0 2px 12px rgba(124,58,237,.05)", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "14px 20px", background: "#faf5ff", borderBottom: "1px solid #ede9fe", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 14.5, fontWeight: 800, color: "#1e1b4b", letterSpacing: "-.2px" }}>Group {group.number}</span>
        {group.is_scheduled ? (
          <CapacityBadge remaining={remaining} capacity={capacity} isFull={isFull} />
        ) : (
          <span style={{
            fontSize: 10.5, fontWeight: 700, padding: "3px 11px", borderRadius: 99,
            background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0", whiteSpace: "nowrap",
          }}>Not yet scheduled</span>
        )}
      </div>

      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
        {group.course_classes.map(cc => <CourseClassCard key={cc.id} cc={cc} />)}
      </div>

      <div style={{ padding: "0 18px 18px" }}>
        {!group.is_scheduled ? (
          <button disabled title="This study group hasn't been scheduled yet" style={{
            width: "100%", padding: "10px 0", borderRadius: 10, border: "1.5px solid #e2e8f0",
            background: "#f8fafc", color: "#94a3b8", fontSize: 12.5, fontWeight: 700,
            fontFamily: "'Sora',sans-serif", cursor: "not-allowed",
          }}>Not yet scheduled</button>
        ) : group.is_member ? (
          <button disabled style={{
            width: "100%", padding: "10px 0", borderRadius: 10, border: "1.5px solid #a7f3d0",
            background: "#f0fdf4", color: "#065f46", fontSize: 12.5, fontWeight: 700,
            fontFamily: "'Sora',sans-serif", cursor: "default",
          }}>✓ Enrolled</button>
        ) : isFull ? (
          <button disabled style={{
            width: "100%", padding: "10px 0", borderRadius: 10, border: "1.5px solid #fca5a5",
            background: "#fef2f2", color: "#b91c1c", fontSize: 12.5, fontWeight: 700,
            fontFamily: "'Sora',sans-serif", cursor: "not-allowed",
          }}>Full</button>
        ) : (
          <button onClick={handleEnroll} disabled={isPending} style={{
            width: "100%", padding: "10px 0", borderRadius: 10, border: "none",
            background: isPending ? "#c4b5fd" : "linear-gradient(135deg,#7c3aed,#6d28d9)",
            color: "#fff", fontSize: 12.5, fontWeight: 700, fontFamily: "'Sora',sans-serif",
            cursor: isPending ? "not-allowed" : "pointer",
            boxShadow: isPending ? "none" : "0 4px 14px rgba(124,58,237,.3)",
          }}>{isPending ? "Enrolling…" : "Enroll"}</button>
        )}

        {cardError && (
          <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: "#fef3c7", border: "1px solid #fde68a", color: "#92400e", fontSize: 11.5, fontWeight: 600, lineHeight: 1.4 }}>
            ⚠ {cardError}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────────

export default function EnrollmentPage() {
  const { data, isLoading, error } = useAvailableGroups();
  const [genericError, setGenericError] = useState<string | null>(null);

  const status = (error as { response?: { status?: number } } | null)?.response?.status;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, fontFamily: "'Sora',sans-serif" }}>
      <div className="ani0">
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1e1b4b", letterSpacing: "-.4px" }}>Enrollment</h2>
        <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>
          {Array.isArray(data) ? `${data.length} study group${data.length !== 1 ? "s" : ""} available` : "Join a study group for the active term"}
        </p>
      </div>

      {genericError && (
        <Banner message={genericError} onDismiss={() => setGenericError(null)} />
      )}

      {isLoading && (
        <div className="ani1" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
          {[0, 1, 2].map(i => <StudyGroupCardSkeleton key={i} />)}
        </div>
      )}

      {!isLoading && status === 403 && (
        <EmptyState icon="🔒" heading="You don't have access to this page" subtext="This view is only available to student accounts." />
      )}

      {!isLoading && status !== undefined && status !== 403 && (
        <EmptyState icon="⚠️" heading="Failed to load enrollment options" subtext="Check your connection and try again." />
      )}

      {!isLoading && !error && data && isGraduated(data) && (
        <EmptyState icon="🎓" heading={data.detail} subtext="There are no further study groups to enroll in." />
      )}

      {!isLoading && !error && data && !isGraduated(data) && data.length === 0 && (
        <EmptyState icon="📭" heading="No study groups available" subtext="Nothing has been scheduled for your program this term yet." />
      )}

      {!isLoading && !error && data && !isGraduated(data) && data.length > 0 && (
        <div className="ani1" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
          {data.map(group => (
            <StudyGroupCard key={group.id} group={group} onGenericError={setGenericError} />
          ))}
        </div>
      )}
    </div>
  );
}
