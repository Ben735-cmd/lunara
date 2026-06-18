"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"

type Course = {
  id: string
  title: string
  code: string
}

type SidebarProps = {
  logout: () => void
  onSelectCourse: (courseId: string) => void
  selectedCourseId: string | null
  activeNav: string
  setActiveNav: (nav: string) => void
}

const navIcons: Record<string, string> = {
  Dashboard: "⊞",
  Assignments: "✓",
  Notes: "📝",
  Calendar: "📅",
  Solver: "🧮",
}

export default function Sidebar({ logout, onSelectCourse, selectedCourseId, activeNav, setActiveNav }: SidebarProps) {
  const [courses, setCourses] = useState<Course[]>([])
  const [coursesOpen, setCoursesOpen] = useState(false)

  async function fetchCourses() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from("courses")
      .select("id, title, code")
      .eq("user_id", user.id)
    setCourses(data || [])
  }

  useEffect(() => {
    fetchCourses()
    const channel = supabase
      .channel("courses-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "courses" }, () => {
        fetchCourses()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const navItems = ["Assignments", "Notes", "Calendar", "Solver"]

  return (
    <aside style={{
      width: "260px",
      background: "linear-gradient(180deg, #0D0D1A 0%, #0F0F20 100%)",
      borderRight: "1px solid rgba(255,255,255,0.06)",
      padding: "28px 16px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      minHeight: "100vh",
    }}>
      <div>
        {/* Logo */}
        <div style={{ marginBottom: "40px", padding: "0 8px" }}>
          <div style={{
            width: "44px", height: "44px",
            borderRadius: "14px",
            background: "linear-gradient(135deg, #8B5CF6, #3B82F6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "20px", fontWeight: 800, color: "white",
            boxShadow: "0 4px 20px rgba(139,92,246,0.4)",
          }}>L</div>
          <h1 style={{ color: "white", fontSize: "1.25rem", fontWeight: 700, marginTop: "14px" }}>Lunara</h1>
          <p style={{ color: "#475569", fontSize: "0.75rem", marginTop: "2px" }}>University Workspace</p>
        </div>

        {/* Nav */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "4px" }}>

          {/* Dashboard */}
          <button
            onClick={() => { setActiveNav("Dashboard"); onSelectCourse("") }}
            style={{
              width: "100%",
              background: activeNav === "Dashboard" && !selectedCourseId ? "rgba(139,92,246,0.15)" : "transparent",
              border: activeNav === "Dashboard" && !selectedCourseId ? "1px solid rgba(139,92,246,0.3)" : "1px solid transparent",
              borderRadius: "14px",
              padding: "12px 14px",
              textAlign: "left",
              color: activeNav === "Dashboard" && !selectedCourseId ? "#A78BFA" : "#64748B",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              transition: "all 0.2s",
            }}
          >
            <span>⊞</span> Dashboard
          </button>

          {/* Courses dropdown */}
          <div>
            <button
              onClick={() => { setCoursesOpen(!coursesOpen); setActiveNav("Courses") }}
              style={{
                width: "100%",
                background: activeNav === "Courses" ? "rgba(139,92,246,0.15)" : "transparent",
                border: activeNav === "Courses" ? "1px solid rgba(139,92,246,0.3)" : "1px solid transparent",
                borderRadius: "14px",
                padding: "12px 14px",
                textAlign: "left",
                color: activeNav === "Courses" ? "#A78BFA" : "#64748B",
                fontSize: "0.875rem",
                fontWeight: 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                transition: "all 0.2s",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span>📚</span> Courses
              </span>
              <span style={{
                fontSize: "0.7rem",
                transform: coursesOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
                display: "inline-block",
              }}>▾</span>
            </button>

            {coursesOpen && (
              <div style={{ marginLeft: "12px", marginTop: "4px", display: "flex", flexDirection: "column", gap: "2px" }}>
                {courses.length === 0 ? (
                  <p style={{ color: "#334155", fontSize: "0.75rem", padding: "8px 14px" }}>No courses yet</p>
                ) : (
                  courses.map((course) => (
                    <button
                      key={course.id}
                      onClick={() => { onSelectCourse(course.id); setActiveNav("Courses") }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "10px 14px",
                        borderRadius: "12px",
                        background: selectedCourseId === course.id ? "rgba(139,92,246,0.12)" : "transparent",
                        border: selectedCourseId === course.id ? "1px solid rgba(139,92,246,0.25)" : "1px solid transparent",
                        color: selectedCourseId === course.id ? "#C4B5FD" : "#64748B",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      <p style={{ fontSize: "0.8rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{course.title}</p>
                      <p style={{ fontSize: "0.7rem", color: "#334155", marginTop: "2px" }}>{course.code}</p>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Other Nav Items */}
          {navItems.map((item) => (
            <button
              key={item}
              onClick={() => { setActiveNav(item); onSelectCourse("") }}
              style={{
                width: "100%",
                background: activeNav === item ? "rgba(139,92,246,0.15)" : "transparent",
                border: activeNav === item ? "1px solid rgba(139,92,246,0.3)" : "1px solid transparent",
                borderRadius: "14px",
                padding: "12px 14px",
                textAlign: "left",
                color: activeNav === item ? "#A78BFA" : "#64748B",
                fontSize: "0.875rem",
                fontWeight: 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                transition: "all 0.2s",
              }}
            >
              <span>{navIcons[item]}</span> {item}
            </button>
          ))}
        </nav>
      </div>

      <button
        onClick={logout}
        style={{
          width: "100%",
          background: "rgba(239,68,68,0.1)",
          border: "1px solid rgba(239,68,68,0.2)",
          borderRadius: "14px",
          padding: "12px",
          color: "#F87171",
          fontWeight: 600,
          fontSize: "0.875rem",
          cursor: "pointer",
          transition: "all 0.2s",
          marginTop: "24px",
        }}
      >
        Logout
      </button>
    </aside>
  )
}