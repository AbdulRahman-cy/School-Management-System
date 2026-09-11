import { useState, useMemo, useEffect, useCallback, memo } from "react";
import { useAvailableGroups, useLiveCapacities, useEnroll, useUnenroll, isGraduated } from "../api";
import type { AvailableStudyGroup, AvailableCourseClass, SessionDetail, LiveCapacityEntry, LiveCapacitiesResponse } from "../api";
import { getCourseColorTheme } from "../courseColors";

// ─── CourseCodePill ─────────────────────────────────────────────────────────

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

// ─── Toast Notification System ───────────────────────────────────────────────

export interface ToastMessage {
  id: number;
  message: string;
  type: "error" | "success";
}

function ToastContainer({ toasts, onDismiss }: { toasts: ToastMessage[]; onDismiss: (id: number) => void }) {
  return (
    <div style={{
      position: "fixed", top: 24, right: 24, zIndex: 9999,
      display: "flex", flexDirection: "column", gap: 10, maxWidth: 420, width: "100%", pointerEvents: "none",
    }}>
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const isError = toast.type === "error";

  return (
    <div style={{
      pointerEvents: "auto",
      display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12,
      padding: "14px 18px", borderRadius: 12,
      background: isError ? "#fff1f2" : "#f0fdf4",
      border: `1.5px solid ${isError ? "#fecdd3" : "#bbf7d0"}`,
      color: isError ? "#9f1239" : "#166534",
      boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
      fontSize: 12.5, fontWeight: 600, lineHeight: 1.4,
      animation: "slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span style={{ fontSize: 15, flexShrink: 0 }}>{isError ? "⚠️" : "✓"}</span>
        <span>{toast.message}</span>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        style={{
          border: "none", background: "transparent",
          color: isError ? "#9f1239" : "#166534",
          cursor: "pointer", fontSize: 14, fontWeight: 700, padding: 0, marginLeft: 4, flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  );
}

// ─── Enroll & Unenroll error parsing ─────────────────────────────────────────

function parseEnrollError(err: unknown): string {
  const status = (err as { response?: { status?: number } })?.response?.status;
  const data = (err as { response?: { data?: unknown } })?.response?.data;

  if (status === 409) {
    if (data && typeof data === "object" && "detail" in data && typeof (data as { detail?: string }).detail === "string") {
      return (data as { detail: string }).detail;
    }
    return "Schedule conflict or class/group is already full.";
  }

  if (status === 400 && data) {
    if (typeof data === "string") return data;
    if (typeof data === "object") {
      if ("detail" in data && typeof (data as { detail?: string }).detail === "string") {
        return (data as { detail: string }).detail;
      }
      const messages: string[] = [];
      for (const key of Object.keys(data)) {
        const val = (data as Record<string, unknown>)[key];
        if (Array.isArray(val)) {
          messages.push(...val.map(String));
        } else if (typeof val === "string") {
          messages.push(val);
        }
      }
      if (messages.length > 0) return messages.join(" ");
    }
    return "Operation validation failed.";
  }

  if (data && typeof data === "object" && "detail" in data && typeof (data as { detail?: string }).detail === "string") {
    return (data as { detail: string }).detail;
  }

  return "Something went wrong. Please try again.";
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

// ─── Live-capacity change detection ──────────────────────────────────────────
// useLiveCapacities polls every 5s and returns a freshly-parsed response object
// each time, so its reference changes even when every seat count inside it is
// identical to what we already had. React.memo's default shallow comparison
// checks prop *identity*, so passing that object straight down would re-render
// every card on every poll tick regardless of whether that card's own numbers
// moved. These comparators check the values that actually matter instead, so a
// card only re-renders when ITS OWN capacity changed.

function liveCapacityEqual(a: LiveCapacityEntry | undefined, b: LiveCapacityEntry | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.capacity === b.capacity && a.remaining === b.remaining;
}

function groupLiveDataEqual(
  group: AvailableStudyGroup,
  prev: LiveCapacitiesResponse | undefined,
  next: LiveCapacitiesResponse | undefined,
): boolean {
  if (prev === next) return true;
  return group.course_classes.every(cc => liveCapacityEqual(prev?.[String(cc.id)], next?.[String(cc.id)]));
}

// ─── Course class card ─────────────────────────────────────────────────────────

function CourseClassCardImpl({
  cc,
  liveCapacity,
  isScheduled,
  onShowToast,
}: {
  cc: AvailableCourseClass;
  liveCapacity: LiveCapacityEntry | undefined;
  isScheduled: boolean;
  onShowToast: (msg: string, type: "error" | "success") => void;
}) {
  const isFull = isScheduled && liveCapacity !== undefined && liveCapacity.remaining === 0;

  const { mutate: runClassEnroll, isPending: isEnrolling } = useEnroll();
  const { mutate: runClassUnenroll, isPending: isUnenrolling } = useUnenroll();

  function handleClassEnroll() {
    runClassEnroll(
      { course_class_id: cc.id },
      {
        onSuccess: () => {
          onShowToast(`Successfully enrolled in ${cc.course_code}!`, "success");
        },
        onError: (err: unknown) => {
          const errorMessage = parseEnrollError(err);
          onShowToast(errorMessage, "error");
        },
      }
    );
  }

  function handleClassUnenroll() {
    runClassUnenroll(
      { course_class_id: cc.id },
      {
        onSuccess: () => {
          onShowToast(`Successfully dropped ${cc.course_code}.`, "success");
        },
        onError: (err: unknown) => {
          const errorMessage = parseEnrollError(err);
          onShowToast(errorMessage, "error");
        },
      }
    );
  }

  return (
    <div style={{ background: "#faf5ff", border: "1px solid #ede9fe", borderRadius: 12, padding: "13px 15px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, minWidth: 0, marginBottom: cc.coordinator_name ? 3 : 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <CourseCodePill code={cc.course_code} />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: "#1e1b4b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cc.course_title}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {isScheduled && (
            liveCapacity
              ? <CapacityBadge remaining={liveCapacity.remaining} capacity={liveCapacity.capacity} isFull={isFull} />
              : <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: "#f1f5f9", color: "#94a3b8", border: "1px solid #e2e8f0" }}>—</span>
          )}
          {cc.is_enrolled ? (
            <>
              <span style={{
                fontSize: 10.5, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
                background: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0", whiteSpace: "nowrap",
              }}>
                ✔ Enrolled
              </span>
              <button
                onClick={handleClassUnenroll}
                disabled={isUnenrolling}
                title={`Drop ${cc.course_code}`}
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  padding: "3px 10px",
                  borderRadius: 99,
                  border: "1px solid #fca5a5",
                  background: isUnenrolling ? "#fef2f2" : "#fef2f2",
                  color: isUnenrolling ? "#991b1b" : "#b91c1c",
                  cursor: isUnenrolling ? "not-allowed" : "pointer",
                  transition: "all 0.15s ease",
                  whiteSpace: "nowrap",
                  fontFamily: "'Sora',sans-serif",
                }}
              >
                {isUnenrolling ? "Dropping…" : "Drop Class"}
              </button>
            </>
          ) : isScheduled ? (
            <button
              onClick={handleClassEnroll}
              disabled={isEnrolling || isFull}
              title={isFull ? "Class is full" : `Enroll in ${cc.course_code}`}
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: 99,
                border: "1px solid #7c3aed",
                background: isEnrolling ? "#ede9fe" : isFull ? "#f1f5f9" : "#7c3aed",
                color: isEnrolling ? "#6d28d9" : isFull ? "#94a3b8" : "#fff",
                cursor: isEnrolling || isFull ? "not-allowed" : "pointer",
                transition: "all 0.15s ease",
                whiteSpace: "nowrap",
                fontFamily: "'Sora',sans-serif",
              }}
            >
              {isEnrolling ? "Enrolling…" : "+ Add Class"}
            </button>
          ) : null}
        </div>
      </div>
      {cc.coordinator_name && (
        <div style={{ fontSize: 10.5, color: "#94a3b8", marginBottom: 8 }}>{cc.coordinator_name}</div>
      )}
      <div>
        <SessionRow label="Lecture"  session={cc.lecture}   isLast={false} />
        <SessionRow label="Tutorial" session={cc.tutorial}  isLast={false} />
        <SessionRow label="Lab"      session={cc.lab}       isLast={true}  />
      </div>
    </div>
  );
}

const CourseClassCard = memo(
  CourseClassCardImpl,
  (prev, next) =>
    prev.cc === next.cc &&
    prev.isScheduled === next.isScheduled &&
    prev.onShowToast === next.onShowToast &&
    liveCapacityEqual(prev.liveCapacity, next.liveCapacity),
);

// ─── Study group card ───────────────────────────────────────────────────────────

function StudyGroupCardImpl({
  group,
  liveData,
  onShowToast,
}: {
  group: AvailableStudyGroup;
  liveData: LiveCapacitiesResponse | undefined;
  onShowToast: (msg: string, type: "error" | "success") => void;
}) {
  const isFull =
    group.is_scheduled &&
    !group.is_member &&
    group.course_classes.length > 0 &&
    group.course_classes.every(cc => {
      const live = liveData?.[String(cc.id)];
      return live !== undefined && live.remaining === 0;
    });

  const { mutate: runGroupEnroll, isPending: isEnrolling } = useEnroll();
  const { mutate: runGroupUnenroll, isPending: isUnenrolling } = useUnenroll();

  function handleGroupEnroll() {
    runGroupEnroll(
      { study_group_id: group.id },
      {
        onSuccess: () => {
          onShowToast(`Successfully enrolled in Group ${group.number}!`, "success");
        },
        onError: (err: unknown) => {
          const errorMessage = parseEnrollError(err);
          onShowToast(errorMessage, "error");
        },
      }
    );
  }

  function handleGroupUnenroll() {
    runGroupUnenroll(
      { study_group_id: group.id },
      {
        onSuccess: () => {
          onShowToast(`Successfully dropped Group ${group.number}!`, "success");
        },
        onError: (err: unknown) => {
          const errorMessage = parseEnrollError(err);
          onShowToast(errorMessage, "error");
        },
      }
    );
  }

  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #ede9fe", overflow: "hidden", boxShadow: "0 2px 12px rgba(124,58,237,.05)", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "14px 20px", background: "#faf5ff", borderBottom: "1px solid #ede9fe", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 14.5, fontWeight: 800, color: "#1e1b4b", letterSpacing: "-.2px" }}>Group {group.number}</span>
        {!group.is_scheduled && (
          <span style={{
            fontSize: 10.5, fontWeight: 700, padding: "3px 11px", borderRadius: 99,
            background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0", whiteSpace: "nowrap",
          }}>Not yet scheduled</span>
        )}
      </div>

      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
        {group.course_classes.map(cc => (
          <CourseClassCard
            key={cc.id}
            cc={cc}
            liveCapacity={liveData?.[String(cc.id)]}
            isScheduled={group.is_scheduled}
            onShowToast={onShowToast}
          />
        ))}
      </div>

      <div style={{ padding: "0 18px 18px" }}>
        {!group.is_scheduled ? (
          <button disabled title="This study group hasn't been scheduled yet" style={{
            width: "100%", padding: "10px 0", borderRadius: 10, border: "1.5px solid #e2e8f0",
            background: "#f8fafc", color: "#94a3b8", fontSize: 12.5, fontWeight: 700,
            fontFamily: "'Sora',sans-serif", cursor: "not-allowed",
          }}>Not yet scheduled</button>
        ) : group.is_member ? (
          <button
            onClick={handleGroupUnenroll}
            disabled={isUnenrolling}
            style={{
              width: "100%", padding: "10px 0", borderRadius: 10, border: "1.5px solid #fca5a5",
              background: "#fef2f2", color: "#b91c1c", fontSize: 12.5, fontWeight: 700,
              fontFamily: "'Sora',sans-serif", cursor: isUnenrolling ? "not-allowed" : "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {isUnenrolling ? "Dropping…" : "Drop Entire Group"}
          </button>
        ) : isFull ? (
          <button disabled style={{
            width: "100%", padding: "10px 0", borderRadius: 10, border: "1.5px solid #fca5a5",
            background: "#fef2f2", color: "#b91c1c", fontSize: 12.5, fontWeight: 700,
            fontFamily: "'Sora',sans-serif", cursor: "not-allowed",
          }}>Full</button>
        ) : (
          <button onClick={handleGroupEnroll} disabled={isEnrolling} style={{
            width: "100%", padding: "10px 0", borderRadius: 10, border: "none",
            background: isEnrolling ? "#c4b5fd" : "linear-gradient(135deg,#7c3aed,#6d28d9)",
            color: "#fff", fontSize: 12.5, fontWeight: 700, fontFamily: "'Sora',sans-serif",
            cursor: isEnrolling ? "not-allowed" : "pointer",
            boxShadow: isEnrolling ? "none" : "0 4px 14px rgba(124,58,237,.3)",
          }}>{isEnrolling ? "Enrolling…" : "Enroll in Group"}</button>
        )}
      </div>
    </div>
  );
}

const StudyGroupCard = memo(
  StudyGroupCardImpl,
  (prev, next) =>
    prev.group === next.group &&
    prev.onShowToast === next.onShowToast &&
    groupLiveDataEqual(next.group, prev.liveData, next.liveData),
);

// ─── Main component ─────────────────────────────────────────────────────────────

export default function EnrollmentPage() {
  const { data, isLoading, error } = useAvailableGroups();
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Stable identity: passed down through StudyGroupCard into every CourseClassCard,
  // both wrapped in React.memo. Without useCallback, addToast would be a new function
  // on every EnrollmentPage render (e.g. whenever a toast is added or dismissed),
  // which would fail those components' prop-equality checks and re-render the whole
  // grid on every toast — exactly the cascade the memo boundaries exist to stop.
  const addToast = useCallback((message: string, type: "error" | "success" = "error") => {
    setToasts(prev => [...prev, { id: Date.now() + Math.random(), message, type }]);
  }, []);

  function dismissToast(id: number) {
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  // Extract ALL classIds across every visible study group into a single flat array
  const allClassIds = useMemo(() => {
    if (!data || isGraduated(data)) return [];
    return data.flatMap(group => group.course_classes.map(cc => cc.id));
  }, [data]);

  // Single bulk live capacity poll for all course classes on the page
  const { data: liveData } = useLiveCapacities(allClassIds);

  const status = (error as { response?: { status?: number } } | null)?.response?.status;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, fontFamily: "'Sora',sans-serif" }}>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <div className="ani0">
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1e1b4b", letterSpacing: "-.4px" }}>Enrollment</h2>
        <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>
          {Array.isArray(data) ? `${data.length} study group${data.length !== 1 ? "s" : ""} available` : "Join a study group or course class for the active term"}
        </p>
      </div>

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
            <StudyGroupCard key={group.id} group={group} liveData={liveData} onShowToast={addToast} />
          ))}
        </div>
      )}
    </div>
  );
}
