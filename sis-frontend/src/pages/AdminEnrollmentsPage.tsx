import { useState } from "react";
import {
  useStudentProfile, useEnrollmentDetails,
  useAdminAvailableGroups, useAdminEnroll, useAdminUnenroll, isGraduated,
} from "../api";
import type { AvailableStudyGroup, AvailableCourseClass } from "../api";
import { ToastContainer } from "../components/Toast";
import type { ToastMessage } from "../components/Toast";
import { parseEnrollError } from "../utils/enrollErrors";
import { getCourseColorTheme } from "../courseColors";

// ─── Small local presentational pieces (mirrors EnrollmentPage.tsx's private ones) ──

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

function EmptyState({ icon, heading, subtext }: { icon: string; heading: string; subtext?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 }}>
      <div style={{ textAlign: "center", padding: 32, background: "#fff", borderRadius: 20, border: "1px solid #ede9fe" }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>{icon}</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#1e1b4b" }}>{heading}</div>
        {subtext && <div style={{ fontSize: 12.5, color: "#94a3b8", marginTop: 6, maxWidth: 300 }}>{subtext}</div>}
      </div>
    </div>
  );
}

// ─── Admin course class card (no live-capacity display — see plan notes) ────────

function AdminCourseClassCard({
  studentId,
  cc,
  isScheduled,
  onShowToast,
}: {
  studentId: number;
  cc: AvailableCourseClass;
  isScheduled: boolean;
  onShowToast: (msg: string, type: "error" | "success") => void;
}) {
  const { mutate: runEnroll, isPending: isEnrolling } = useAdminEnroll();
  const { mutate: runUnenroll, isPending: isUnenrolling } = useAdminUnenroll();

  function handleEnroll() {
    runEnroll(
      { student_id: studentId, course_class_id: cc.id },
      {
        onSuccess: () => onShowToast(`Enrolled student in ${cc.course_code}.`, "success"),
        onError: (err: unknown) => onShowToast(parseEnrollError(err), "error"),
      }
    );
  }

  function handleUnenroll() {
    runUnenroll(
      { student_id: studentId, course_class_id: cc.id },
      {
        onSuccess: () => onShowToast(`Dropped student from ${cc.course_code}.`, "success"),
        onError: (err: unknown) => onShowToast(parseEnrollError(err), "error"),
      }
    );
  }

  return (
    <div style={{ background: "#faf5ff", border: "1px solid #ede9fe", borderRadius: 12, padding: "13px 15px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <CourseCodePill code={cc.course_code} />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: "#1e1b4b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cc.course_title}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {cc.is_enrolled ? (
            <>
              <span style={{
                fontSize: 10.5, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
                background: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0", whiteSpace: "nowrap",
              }}>
                ✔ Enrolled
              </span>
              <button
                onClick={handleUnenroll}
                disabled={isUnenrolling}
                title={`Drop ${cc.course_code}`}
                style={{
                  fontSize: 10.5, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
                  border: "1px solid #fca5a5", background: "#fef2f2",
                  color: isUnenrolling ? "#991b1b" : "#b91c1c",
                  cursor: isUnenrolling ? "not-allowed" : "pointer",
                  fontFamily: "'Sora',sans-serif", whiteSpace: "nowrap",
                }}
              >
                {isUnenrolling ? "Dropping…" : "Drop Class"}
              </button>
            </>
          ) : isScheduled ? (
            <button
              onClick={handleEnroll}
              disabled={isEnrolling}
              title={`Enroll in ${cc.course_code}`}
              style={{
                fontSize: 10.5, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
                border: "1px solid #7c3aed",
                background: isEnrolling ? "#ede9fe" : "#7c3aed",
                color: isEnrolling ? "#6d28d9" : "#fff",
                cursor: isEnrolling ? "not-allowed" : "pointer",
                fontFamily: "'Sora',sans-serif", whiteSpace: "nowrap",
              }}
            >
              {isEnrolling ? "Enrolling…" : "+ Add Class"}
            </button>
          ) : null}
        </div>
      </div>
      {cc.coordinator_name && (
        <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 6 }}>{cc.coordinator_name}</div>
      )}
    </div>
  );
}

// ─── Admin study group card ─────────────────────────────────────────────────────

function AdminStudyGroupCard({
  studentId,
  group,
  onShowToast,
}: {
  studentId: number;
  group: AvailableStudyGroup;
  onShowToast: (msg: string, type: "error" | "success") => void;
}) {
  const { mutate: runGroupEnroll, isPending: isEnrolling } = useAdminEnroll();
  const { mutate: runGroupUnenroll, isPending: isUnenrolling } = useAdminUnenroll();

  function handleGroupEnroll() {
    runGroupEnroll(
      { student_id: studentId, study_group_id: group.id },
      {
        onSuccess: () => onShowToast(`Enrolled student in Group ${group.number}.`, "success"),
        onError: (err: unknown) => onShowToast(parseEnrollError(err), "error"),
      }
    );
  }

  function handleGroupUnenroll() {
    runGroupUnenroll(
      { student_id: studentId, study_group_id: group.id },
      {
        onSuccess: () => onShowToast(`Dropped student from Group ${group.number}.`, "success"),
        onError: (err: unknown) => onShowToast(parseEnrollError(err), "error"),
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
          <AdminCourseClassCard
            key={cc.id}
            studentId={studentId}
            cc={cc}
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
            }}
          >
            {isUnenrolling ? "Dropping…" : "Drop Entire Group"}
          </button>
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

// ─── Main component ─────────────────────────────────────────────────────────────

export default function AdminEnrollmentsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  function addToast(message: string, type: "error" | "success" = "error") {
    setToasts(prev => [...prev, { id: Date.now() + Math.random(), message, type }]);
  }

  function dismissToast(id: number) {
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  function runSearch() {
    const parsed = Number(searchInput.trim());
    if (!searchInput.trim() || !Number.isFinite(parsed) || parsed <= 0) {
      addToast("Enter a valid student ID.", "error");
      return;
    }
    setSelectedStudentId(parsed);
  }

  const { data: student, isLoading: studentLoading, error: studentError } = useStudentProfile(selectedStudentId);
  const { data: enrollments, isLoading: enrollmentsLoading } = useEnrollmentDetails(selectedStudentId, "active");
  const { data: groupsData, isLoading: groupsLoading, error: groupsError } = useAdminAvailableGroups(selectedStudentId);

  const studentNotFound = !studentLoading && !!studentError;
  const groupsErrorStatus = (groupsError as { response?: { status?: number } } | null)?.response?.status;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, fontFamily: "'Sora',sans-serif" }}>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1e1b4b", letterSpacing: "-.4px" }}>Enrollments</h2>
        <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>
          Search a student to view and manage their enrollment.
        </p>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") runSearch(); }}
          placeholder="Student ID…"
          style={{
            padding: "10px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0",
            fontSize: 13, fontFamily: "'Sora',sans-serif", width: 220,
          }}
        />
        <button
          onClick={runSearch}
          style={{
            padding: "10px 18px", borderRadius: 10, border: "none",
            background: "linear-gradient(135deg,#7c3aed,#6d28d9)", color: "#fff",
            fontSize: 12.5, fontWeight: 700, fontFamily: "'Sora',sans-serif", cursor: "pointer",
          }}
        >
          Search
        </button>
      </div>

      {selectedStudentId === null && (
        <EmptyState icon="🔍" heading="Search for a student" subtext="Enter a student ID above to view and manage their enrollment." />
      )}

      {selectedStudentId !== null && studentLoading && (
        <EmptyState icon="⏳" heading="Loading student…" />
      )}

      {selectedStudentId !== null && studentNotFound && (
        <EmptyState icon="🚫" heading="Student not found" subtext={`No student exists with ID ${selectedStudentId}.`} />
      )}

      {selectedStudentId !== null && student && (
        <>
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #ede9fe", padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, background: "#ede9fe", color: "#6d28d9",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, flexShrink: 0,
            }}>
              {student.user.first_name?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: "#1e1b4b" }}>{student.user.full_name}</div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>
                {student.user.email}
                {student.discipline && ` · ${student.discipline.name}`}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 340px) 1fr", gap: 20, alignItems: "start" }}>
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #ede9fe", padding: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1e1b4b", marginBottom: 12 }}>Current Enrollments</div>
              {enrollmentsLoading && <div style={{ fontSize: 12, color: "#94a3b8" }}>Loading…</div>}
              {!enrollmentsLoading && enrollments && enrollments.length === 0 && (
                <div style={{ fontSize: 12, color: "#94a3b8" }}>No active enrollments.</div>
              )}
              {!enrollmentsLoading && enrollments && enrollments.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {enrollments.map(enr => (
                    <AdminCurrentEnrollmentRow
                      key={enr.id}
                      studentId={selectedStudentId}
                      courseCode={enr.course_class.course.code}
                      courseTitle={enr.course_class.course.title}
                      courseClassId={enr.course_class.id}
                      onShowToast={addToast}
                    />
                  ))}
                </div>
              )}
            </div>

            <div>
              {groupsLoading && (
                <div style={{ fontSize: 12, color: "#94a3b8" }}>Loading available groups…</div>
              )}

              {!groupsLoading && groupsErrorStatus !== undefined && (
                <EmptyState icon="⚠️" heading="Failed to load available groups" subtext="Check your connection and try again." />
              )}

              {!groupsLoading && !groupsError && groupsData && isGraduated(groupsData) && (
                <EmptyState icon="🎓" heading={groupsData.detail} subtext="There are no further study groups to enroll in." />
              )}

              {!groupsLoading && !groupsError && groupsData && !isGraduated(groupsData) && groupsData.length === 0 && (
                <EmptyState icon="📭" heading="No study groups available" subtext="Nothing has been scheduled for this student's program this term." />
              )}

              {!groupsLoading && !groupsError && groupsData && !isGraduated(groupsData) && groupsData.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
                  {groupsData.map(group => (
                    <AdminStudyGroupCard key={group.id} studentId={selectedStudentId} group={group} onShowToast={addToast} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function AdminCurrentEnrollmentRow({
  studentId,
  courseCode,
  courseTitle,
  courseClassId,
  onShowToast,
}: {
  studentId: number;
  courseCode: string;
  courseTitle: string;
  courseClassId: number;
  onShowToast: (msg: string, type: "error" | "success") => void;
}) {
  const { mutate: runUnenroll, isPending } = useAdminUnenroll();

  function handleDrop() {
    runUnenroll(
      { student_id: studentId, course_class_id: courseClassId },
      {
        onSuccess: () => onShowToast(`Dropped student from ${courseCode}.`, "success"),
        onError: (err: unknown) => onShowToast(parseEnrollError(err), "error"),
      }
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 0", borderBottom: "1px solid #f0eeff" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <CourseCodePill code={courseCode} />
        <span style={{ fontSize: 12, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{courseTitle}</span>
      </div>
      <button
        onClick={handleDrop}
        disabled={isPending}
        style={{
          fontSize: 10.5, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
          border: "1px solid #fca5a5", background: "#fef2f2",
          color: isPending ? "#991b1b" : "#b91c1c",
          cursor: isPending ? "not-allowed" : "pointer",
          fontFamily: "'Sora',sans-serif", whiteSpace: "nowrap", flexShrink: 0,
        }}
      >
        {isPending ? "Dropping…" : "Drop"}
      </button>
    </div>
  );
}
