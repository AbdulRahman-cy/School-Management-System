import React from "react";
import { useAuth } from "../context/AuthContext";
import { useTeachers } from "../api";
import { getCourseColorTheme } from "../courseColors";
import type { TeacherActiveCourseClass } from "../types";

// ─── Course Code Pill ─────────────────────────────────────────────────────────

function CourseCodePill({ code }: { code: string }) {
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

// ─── Teacher Dashboard Component ──────────────────────────────────────────────

export default function TeacherDashboard() {
  const { user } = useAuth();
  const { data: teachers = [] } = useTeachers();

  const currentTeacher = teachers.find(t => t.user?.email === user?.email || t.user_name.includes(user?.email ?? ""));
  const teacherName = user ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email.split("@")[0] : "Teacher";
  const departmentName = currentTeacher?.department_name || "Computer & Communication Engineering";

  // Mock fallback active classes
  const mockActiveClasses: TeacherActiveCourseClass[] = [
    { id: 1, course_code: "CSE 301", course_title: "Database Systems", group_number: 1, discipline_code: "CSE", term_name: "Fall 2026" },
    { id: 2, course_code: "EEC 204", course_title: "Signals & Systems", group_number: 2, discipline_code: "EEC", term_name: "Fall 2026" },
    { id: 3, course_code: "MEC 102", course_title: "Thermodynamics", group_number: 1, discipline_code: "MEC", term_name: "Fall 2026" },
    { id: 4, course_code: "BME 405", course_title: "Medical Imaging", group_number: 3, discipline_code: "BME", term_name: "Fall 2026" },
  ];

  const activeClasses = currentTeacher?.active_classes?.length ? currentTeacher.active_classes : mockActiveClasses;

  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: 24,
      fontFamily: "'Sora', sans-serif"
    }}>
      {/* ── Main Content Area (~70% Width) ─────────────────────────────────── */}
      <div style={{ flex: "1 1 66%", display: "flex", flexDirection: "column", gap: 22, minWidth: 320 }}>

        {/* ── Header Title (Aligned with Student Dashboard) ── */}
        <div style={{ marginBottom: 2 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1e1b4b", letterSpacing: "-.4px", margin: 0 }}>
            Good morning, {user?.first_name || teacherName} 👋
          </h1>
          <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 3, margin: "3px 0 0" }}>
            {departmentName} · Faculty Member
          </p>
        </div>

        {/* ── Overview Stat Cards (Top Row) ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 14 }}>
          {[
            { label: "Active Classes", count: activeClasses.length, bg: "#fff5f5", border: "#fecdd3", bar: "#ef4444", icon: "📕" },
            { label: "Total Students", count: 142, bg: "#f0fdf4", border: "#bbf7d0", bar: "#10b981", icon: "📗" },
            { label: "Pending Grades", count: 18, bg: "#f0f9ff", border: "#bae6fd", bar: "#0284c7", icon: "📘" },
            { label: "Community Support", count: 87, bg: "#faf5ff", border: "#e9d5ff", bar: "#8b5cf6", icon: "👥" },
          ].map((card, i) => (
            <div key={i} style={{
              background: card.bg, borderRadius: 16, border: `1.5px solid ${card.border}`,
              padding: "16px 18px", display: "flex", flexDirection: "column", justifyContent: "space-between",
              height: 116, position: "relative", overflow: "hidden", boxShadow: "0 4px 14px rgba(0,0,0,0.02)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 15 }}>{card.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>{card.label}</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#1e1b4b", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "-1px" }}>
                {card.count}
              </div>
              <div style={{ position: "absolute", bottom: 0, left: 18, width: 32, height: 4, borderRadius: "4px 4px 0 0", background: card.bar }} />
            </div>
          ))}
        </div>

        {/* ── Charts Section (Middle Row) ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {/* Actively Hours (Bar Chart Card) */}
          <div style={{
            background: "#fff", borderRadius: 16, padding: "18px 22px", border: "1px solid #ede9fe",
            boxShadow: "0 10px 30px rgba(124,58,237,0.04)", display: "flex", flexDirection: "column", gap: 14
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1e1b4b", margin: 0 }}>Actively Hours</h3>
              <select style={{ padding: "4px 10px", borderRadius: 8, border: "1px solid #ede9fe", fontSize: 11, color: "#64748b", outline: "none", background: "#faf5ff" }}>
                <option>Weekly</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: 18, alignItems: "flex-end", height: 130 }}>
              {/* Bar visualization */}
              <div style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "flex-end", height: "100%", paddingBottom: 6 }}>
                {[
                  { day: "S", h: 30 },
                  { day: "M", h: 70 },
                  { day: "T", h: 45 },
                  { day: "W", h: 90 },
                  { day: "T", h: 60 },
                  { day: "F", h: 75 },
                  { day: "S", h: 20 },
                ].map((item, idx) => (
                  <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%", justifyContent: "flex-end" }}>
                    <div style={{ width: 12, height: 95, background: "#f5f3ff", borderRadius: 99, display: "flex", alignItems: "flex-end", overflow: "hidden" }}>
                      <div style={{ width: "100%", height: `${item.h}%`, background: "linear-gradient(180deg, #7c3aed, #6d28d9)", borderRadius: 99 }} />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8" }}>{item.day}</span>
                  </div>
                ))}
              </div>

              {/* Side metrics */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingLeft: 14, borderLeft: "1px solid #f3f0ff" }}>
                <div>
                  <div style={{ fontSize: 9.5, color: "#94a3b8", fontWeight: 600 }}>Time spent</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginTop: 1 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: "#1e1b4b" }}>28</span>
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: "#10b981", background: "#dcfce7", padding: "1px 4px", borderRadius: 4 }}>85%</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 9.5, color: "#94a3b8", fontWeight: 600 }}>Lessons taken</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginTop: 1 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: "#1e1b4b" }}>60</span>
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: "#10b981", background: "#dcfce7", padding: "1px 4px", borderRadius: 4 }}>79%</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 9.5, color: "#94a3b8", fontWeight: 600 }}>Exam passed</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginTop: 1 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: "#1e1b4b" }}>10</span>
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: "#10b981", background: "#dcfce7", padding: "1px 4px", borderRadius: 4 }}>100%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Performance (Line Chart Card) */}
          <div style={{
            background: "#fff", borderRadius: 16, padding: "18px 22px", border: "1px solid #ede9fe",
            boxShadow: "0 10px 30px rgba(124,58,237,0.04)", display: "flex", flexDirection: "column", justifyContent: "space-between"
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1e1b4b", margin: 0 }}>Performance</h3>

            {/* Smooth SVG Line Chart graphic */}
            <div style={{ width: "100%", height: 75, margin: "8px 0" }}>
              <svg width="100%" height="100%" viewBox="0 0 200 60" preserveAspectRatio="none">
                <path d="M0,45 Q30,10 60,35 T120,20 T180,40 T200,25" fill="none" stroke="#7c3aed" strokeWidth="3" />
                <path d="M0,50 Q40,30 80,45 T140,30 T200,45" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="3 3" />
              </svg>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#94a3b8", fontWeight: 600 }}>
              <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, paddingTop: 10, borderTop: "1px solid #f3f0ff" }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: "#1e1b4b" }}>40%</span>
              <span style={{ fontSize: 11, color: "#64748b" }}>Your productivity is 40% higher compared to last month</span>
            </div>
          </div>
        </div>

        {/* ── My Active Classes (Bottom Table Card) ── */}
        <div style={{
          background: "#fff", borderRadius: 16, padding: "20px 22px", border: "1px solid #ede9fe",
          boxShadow: "0 10px 30px rgba(124,58,237,0.04)", display: "flex", flexDirection: "column", gap: 14
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1e1b4b", margin: 0 }}>My Active Classes</h3>
            <span style={{ fontSize: 12, color: "#7c3aed", fontWeight: 700, cursor: "pointer" }}>View All →</span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #f3f0ff", textAlign: "left" }}>
                  <th style={{ padding: "9px 12px", fontSize: 9.5, fontWeight: 800, color: "#94a3b8", letterSpacing: ".5px" }}>COURSE</th>
                  <th style={{ padding: "9px 12px", fontSize: 9.5, fontWeight: 800, color: "#94a3b8", letterSpacing: ".5px" }}>GROUP & DISCIPLINE</th>
                  <th style={{ padding: "9px 12px", fontSize: 9.5, fontWeight: 800, color: "#94a3b8", letterSpacing: ".5px" }}>TERM</th>
                  <th style={{ padding: "9px 12px", fontSize: 9.5, fontWeight: 800, color: "#94a3b8", letterSpacing: ".5px" }}>UPDATE</th>
                </tr>
              </thead>
              <tbody>
                {activeClasses.map((cls: TeacherActiveCourseClass) => (
                  <tr key={cls.id} style={{ borderBottom: "1px solid #fafafa" }}>
                    <td style={{ padding: "11px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <CourseCodePill code={cls.course_code} />
                        <span style={{ fontWeight: 600, color: "#1e1b4b" }}>{cls.course_title}</span>
                      </div>
                    </td>
                    <td style={{ padding: "11px 12px", color: "#64748b", fontWeight: 500 }}>
                      Group {cls.group_number} · <strong style={{ color: "#475569" }}>{cls.discipline_code}</strong>
                    </td>
                    <td style={{ padding: "11px 12px", color: "#64748b", fontWeight: 500 }}>
                      {cls.term_name}
                    </td>
                    <td style={{ padding: "11px 12px" }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 99,
                        background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0"
                      }}>
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ── Right Sidebar (~30% Width) ─────────────────────────────────────── */}
      <div style={{ flex: "1 1 28%", display: "flex", flexDirection: "column", gap: 22, minWidth: 280 }}>

        {/* Profile Card */}
        <div style={{
          background: "#fff", borderRadius: 16, padding: "22px 20px", border: "1px solid #ede9fe",
          boxShadow: "0 10px 30px rgba(124,58,237,0.04)", display: "flex", flexDirection: "column", alignItems: "center",
          position: "relative"
        }}>
          <button style={{
            position: "absolute", top: 14, right: 14, border: "none", background: "#faf5ff",
            width: 30, height: 30, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            ✏️
          </button>

          <div style={{
            width: 68, height: 68, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#a78bfa)",
            display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 22, fontWeight: 800,
            boxShadow: "0 8px 20px rgba(124,58,237,0.22)", marginBottom: 12
          }}>
            {user?.first_name ? user.first_name[0] : "T"}
          </div>

          <h3 style={{ fontSize: 15, fontWeight: 800, color: "#1e1b4b", margin: 0 }}>
            {teacherName}
          </h3>
          <p style={{ fontSize: 11.5, color: "#94a3b8", margin: "3px 0 0", textAlign: "center" }}>
            {departmentName}
          </p>
        </div>

        {/* Mini Calendar */}
        <div style={{
          background: "#fff", borderRadius: 16, padding: "18px 20px", border: "1px solid #ede9fe",
          boxShadow: "0 10px 30px rgba(124,58,237,0.04)", display: "flex", flexDirection: "column", gap: 12
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, color: "#94a3b8", cursor: "pointer" }}>‹</span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "#1e1b4b" }}>February 2026</span>
            <span style={{ fontSize: 11, color: "#94a3b8", cursor: "pointer" }}>›</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {[
              { d: "17", day: "Fri", active: false },
              { d: "18", day: "Sat", active: false },
              { d: "19", day: "Sun", active: false },
              { d: "20", day: "Mon", active: true },
              { d: "21", day: "Tue", active: false },
              { d: "22", day: "Wed", active: false },
            ].map((item, idx) => (
              <div key={idx} style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                padding: "8px 6px", borderRadius: 12,
                background: item.active ? "linear-gradient(135deg,#7c3aed,#6d28d9)" : "transparent",
                color: item.active ? "#fff" : "#64748b",
                minWidth: 34
              }}>
                <span style={{ fontSize: 8.5, opacity: 0.85 }}>{item.day}</span>
                <span style={{ fontSize: 12.5, fontWeight: 800 }}>{item.d}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Events (Timeline) */}
        <div style={{
          background: "#fff", borderRadius: 16, padding: "18px 20px", border: "1px solid #ede9fe",
          boxShadow: "0 10px 30px rgba(124,58,237,0.04)", display: "flex", flexDirection: "column", gap: 12, flex: 1
        }}>
          <h3 style={{ fontSize: 14.5, fontWeight: 700, color: "#1e1b4b", margin: 0 }}>Upcoming Events</h3>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 2 }}>
            {[
              { time: "09:30 AM", title: "Team Meetup", bg: "#fff7ed", color: "#c2410c" },
              { time: "11:30 AM", title: "CSE 301 Lecture", bg: "#eff6ff", color: "#1e40af" },
              { time: "01:30 PM", title: "Department Research", bg: "#faf5ff", color: "#6d28d9" },
              { time: "03:15 PM", title: "Lab Section", bg: "#f0fdf4", color: "#166534" },
            ].map((ev, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 9.5, fontWeight: 700, color: "#94a3b8", width: 56 }}>{ev.time}</span>
                <div style={{
                  flex: 1, padding: "7px 11px", borderRadius: 10, background: ev.bg, color: ev.color,
                  fontSize: 11, fontWeight: 700
                }}>
                  • {ev.title}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
